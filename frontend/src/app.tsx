import { useCallback, useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import './app.css'
import { loadStudyById } from '@/data/load-study'
import { UploadLanding } from '@/features/upload/upload-landing'
import { HistorySidebar } from '@/features/history/history-sidebar'
import { useHistoryBrowser } from '@/features/history/use-history-browser'
import { JobWorkspace } from '@/features/job/job-workspace'
import { useSegmentManager } from '@/features/job/use-segment-manager'
import { AuthPage } from '@/features/auth/auth-page'
import { extractDicomFiles } from '@/lib/dicom/extract-dicoms'
import type { DicomFile } from '@/lib/dicom/extract-dicoms'
import { secondaryActionClass } from '@/lib/styles'
import type { FindingSummary, HistoryItem, SegmentItem, StudyData, UploadJob } from '@/types/workspace'
import { useViewerStore } from '@/lib/storage/viewer-store'
import { useAuthStore } from '@/lib/storage/auth-store'
import { useJobsStore } from '@/lib/storage/jobs-store'

const acceptedExtensions = ['.dcm', '.zip']
const chunkSize = 5 * 1024 * 1024 // 5MB

const App = () => {
  const navigate = useNavigate()
  const studyMatch = useMatch('/studies/:studyId')
  const activeStudyId = studyMatch?.params?.studyId

  const [files, setFiles] = useState<File[]>([])
  const [job, setJob] = useState<UploadJob | null>(null)
  const [segments, setSegments] = useState<SegmentItem[]>([])
  const [findings, setFindings] = useState<FindingSummary[]>([])
  const [anonymize, setAnonymize] = useState(true)
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting'>('connected')
  const [viewerSlice, setViewerSlice] = useState(120)
  const [isUploading, setIsUploading] = useState(false)
  const [studyLoading, setStudyLoading] = useState(false)
  const [studyError, setStudyError] = useState<string | null>(null)
  const [dicomFiles, setDicomFiles] = useState<DicomFile[]>([])
  const [dicomError, setDicomError] = useState<string | null>(null)
  const viewerFullscreen = useViewerStore((state) => state.fullscreen)
  const setViewerFullscreen = useViewerStore((state) => state.setFullscreen)
  const resetViewerFullscreen = useViewerStore((state) => state.reset)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const authUsername = useAuthStore((state) => state.username)
  const logout = useAuthStore((state) => state.logout)
  const authToken = useAuthStore((state) => state.token)
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const jobs = useJobsStore((state) => state.items)
  const jobsLoading = useJobsStore((state) => state.loading)
  const jobsError = useJobsStore((state) => state.error)
  const jobsFetched = useJobsStore((state) => state.hasFetched)
  const fetchJobs = useJobsStore((state) => state.fetchJobs)
  const addJob = useJobsStore((state) => state.addJob)
  const updateJob = useJobsStore((state) => state.updateJob)
  const removeJob = useJobsStore((state) => state.removeJob)

  const {
    historySearch,
    setHistorySearch,
    selectedPathology,
    setSelectedPathology,
    pathologyOptions,
    filteredHistory,
  } = useHistoryBrowser(jobs)

  const { selectedSegments, toggleSegment, sortedSegments, sortField, sortAsc, handleSort } =
    useSegmentManager(segments)

  const applySidebarDefault = useCallback(() => {
    if (typeof window === 'undefined') {
      resetViewerFullscreen()
      return
    }
    const shouldCollapseSidebar = window.matchMedia('(max-width: 1023px)').matches
    setViewerFullscreen(shouldCollapseSidebar)
  }, [resetViewerFullscreen, setViewerFullscreen])

  const hydrateDicomResources = useCallback(
    async (resources: StudyData['dicomResources'] | undefined, options?: { token?: string }) => {
      if (!resources || resources.length === 0) {
        setDicomFiles([])
        setDicomError(null)
        return
      }

      if (typeof window === 'undefined') {
        return
      }

      try {
        const authHeader = options?.token ?? authToken ?? undefined
        const headers: HeadersInit | undefined = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined

        const files = await Promise.all(
          resources.map(async (resource, index) => {
            const url = resource.url
            if (!url) {
              return null
            }

            const response = await fetch(url, {
              headers,
            })

            if (!response.ok) {
              throw new Error(`Request failed with status ${response.status}`)
            }

            const blob = await response.blob()
            const filename = resource.name ?? `dicom-${index + 1}.dcm`
            const file = new File([blob], filename, { type: blob.type || 'application/dicom' })
            return { name: filename, file }
          }),
        )

        const sanitized = files.filter((item): item is DicomFile => item !== null)
        setDicomFiles(sanitized)
        setDicomError(null)
      } catch (error) {
        console.error('Не удалось загрузить DICOM данные', error)
        setDicomFiles([])
        setDicomError('Не удалось загрузить DICOM данные')
      }
    },
    [authToken],
  )

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current)
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    if (!job) {
      applySidebarDefault()
    }
  }, [isAuthenticated, job, applySidebarDefault])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    if (jobsFetched || jobsLoading) {
      return
    }
    if (jobs.length === 0 && !jobsError) {
      void fetchJobs(authToken ?? undefined)
    }
  }, [authToken, fetchJobs, isAuthenticated, jobs.length, jobsLoading, jobsError, jobsFetched])

  useEffect(() => {
    if (!isAuthenticated) {
      resetViewerFullscreen()
      return
    }
    applySidebarDefault()
  }, [isAuthenticated, applySidebarDefault, resetViewerFullscreen])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    if (!activeStudyId) {
      setStudyLoading(false)
      setStudyError(null)
      return
    }

    let cancelled = false
    setStudyLoading(true)
    setStudyError(null)

    void loadStudyById(activeStudyId, authToken ?? undefined)
      .then((data) => {
        if (cancelled) return
        setSegments(data.segments)
        setFindings(data.findings)
        setViewerSlice(data.preferredSlice ?? 120)
        setFiles([])
        setDicomFiles([])
        setDicomError(null)
        void hydrateDicomResources(data.dicomResources, { token: authToken ?? undefined })
        setJob({
          id: activeStudyId,
          status: 'succeeded',
          progress: 100,
          etaSeconds: 0,
          startedAt: Date.now(),
          totalFiles: 0,
          totalBytes: 0,
        })
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Не удалось загрузить исследование', error)
        setStudyError('Не удалось загрузить исследование')
        setSegments([])
        setFindings([])
        setJob(null)
      })
      .finally(() => {
        if (!cancelled) {
          setStudyLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeStudyId, authToken, hydrateDicomResources, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    if (activeStudyId || !job || job.status !== 'succeeded' || segments.length > 0) {
      return
    }

    let cancelled = false
    setStudyLoading(true)
    setStudyError(null)

    void loadStudyById('__uploaded', authToken ?? undefined)
      .then((data) => {
        if (cancelled) return
        setSegments(data.segments)
        setFindings(data.findings)
        setViewerSlice(data.preferredSlice ?? 120)
        setDicomFiles([])
        setDicomError(null)
        void hydrateDicomResources(data.dicomResources, { token: authToken ?? undefined })
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Не удалось подготовить результаты загрузки', error)
        setStudyError('Не удалось подготовить результаты загрузки')
      })
      .finally(() => {
        if (!cancelled) {
          setStudyLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeStudyId, authToken, hydrateDicomResources, isAuthenticated, job, segments.length])

  const resetWorkspace = useCallback(() => {
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current)
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    setJob(null)
    setFiles([])
    setIsUploading(false)
    setHistorySearch('')
    setSelectedPathology(undefined)
    setViewerSlice(120)
    setSegments([])
    setFindings([])
    setStudyError(null)
    setStudyLoading(false)
    setDicomFiles([])
    setDicomError(null)
    applySidebarDefault()
    navigate('/')
  }, [navigate, applySidebarDefault, setHistorySearch, setSelectedPathology])

  const handleLogout = useCallback(() => {
    resetWorkspace()
    logout()
  }, [logout, resetWorkspace])

  const simulateStatusStream = useCallback((jobId: string) => {
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current)
    }
    statusTimerRef.current = setInterval(() => {
      setJob((prev) => {
        if (!prev || prev.id !== jobId) return prev
        if (prev.status !== 'running') return prev
        const nextProgress = Math.min(prev.progress + Math.random() * 8, 100)
        const eta = Math.max(Math.round(((100 - nextProgress) / 100) * 120), 0)
        if (nextProgress >= 100) {
          clearInterval(statusTimerRef.current!)
          return { ...prev, progress: 100, status: 'succeeded', etaSeconds: 0 }
        }
        return { ...prev, progress: nextProgress, etaSeconds: eta }
      })
    }, 1500)
  }, [])

  const scheduleReconnection = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    setConnectionState('reconnecting')
    reconnectTimerRef.current = setTimeout(() => {
      setConnectionState('connected')
    }, 1800)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    if (!job || job.status === 'idle') return
    if (job.status === 'running') {
      simulateStatusStream(job.id)
    }
  }, [isAuthenticated, job, simulateStatusStream])

  const startJob = useCallback(
    (pickedFiles: File[]): UploadJob | null => {
      const total = pickedFiles.reduce((sum, file) => sum + file.size, 0)
      const newJob: UploadJob = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `job-${Math.random().toString(16).slice(2, 10)}`,
        status: 'queued',
        progress: 0,
        startedAt: Date.now(),
        etaSeconds: undefined,
        totalFiles: pickedFiles.length,
        totalBytes: total,
      }
      setStudyError(null)
      setSegments([])
      setFindings([])
      setViewerSlice(120)
      setDicomFiles([])
      setDicomError(null)
      navigate('/')
      setFiles(pickedFiles)
      setJob(newJob)

      setTimeout(() => {
        setJob((prev) => (prev ? { ...prev, status: 'running', etaSeconds: 120 } : prev))
        simulateStatusStream(newJob.id)
      }, 800)
      return newJob
    },
    [navigate, simulateStatusStream],
  )

  const handleFilesAccepted = useCallback(
    async (incomingFiles: File[]) => {
      if (incomingFiles.length === 0) return
      const validFiles = incomingFiles.filter((file) =>
        acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)),
      )
      if (validFiles.length === 0) {
        return
      }
      setIsUploading(true)

      const jobInstance = startJob(validFiles)
      if (!jobInstance) {
        setIsUploading(false)
        return
      }

      const today = new Date()
      const optimisticItem: HistoryItem = {
        id: jobInstance.id,
        title: 'job-new',
        patient: '—',
        studyDate: today.toISOString().slice(0, 10),
        summary: 'Задание отправлено и ожидает подтверждения',
        involvement: 0,
        tags: [],
        badges: [],
        pathologies: [],
      }

      addJob(optimisticItem)

      const uploadTask = (async () => {
        try {
          const formData = new FormData()
          formData.append('file', validFiles[0])

          const headers: Record<string, string> = {}
          if (authToken) {
            headers.Authorization = `Bearer ${authToken}`
          }

          const response = await fetch('/api/jobs', {
            method: 'POST',
            body: formData,
            headers,
          })

          if (!response.ok) {
            throw new Error(`Не удалось создать задание (${response.status})`)
          }

          const payload = await response.json().catch(() => ({}))
          let receivedId: string | undefined
          if (payload && typeof payload === 'object') {
            const maybeId = (payload as Record<string, unknown>).id
            if (typeof maybeId === 'string' && maybeId.trim().length > 0) {
              receivedId = maybeId
            } else if (typeof maybeId === 'number') {
              receivedId = String(maybeId)
            }
          }

          if (receivedId) {
            updateJob(jobInstance.id, {
              id: receivedId,
              title: `job-${receivedId}`,
              studyDate: today.toISOString().slice(0, 10),
            })
            setJob((prev) => (prev ? { ...prev, id: receivedId } : prev))
            simulateStatusStream(receivedId)
          } else {
            updateJob(jobInstance.id, { title: 'job-created' })
          }
        } catch (error) {
          console.error('Не удалось отправить файлы на сервер', error)
          removeJob(jobInstance.id)
          setJob((prev) =>
            prev && prev.id === jobInstance.id
              ? { ...prev, status: 'failed', progress: 0, etaSeconds: undefined }
              : prev,
          )
          setDicomFiles([])
          setDicomError('Не удалось отправить файлы на сервер')
          throw error
        }
      })()

      const dicomPromise = extractDicomFiles(validFiles)

      const total = validFiles.reduce((sum, file) => sum + file.size, 0)
      let uploaded = 0
      for (const file of validFiles) {
        for (let offset = 0; offset < file.size; offset += chunkSize) {
          const chunk = file.slice(offset, offset + chunkSize)
          await new Promise((resolve) => setTimeout(resolve, 30))
          uploaded += chunk.size
          const percent = Math.round((uploaded / total) * 100)
          setJob((prev) => (prev ? { ...prev, progress: percent } : prev))
        }
      }
      setJob((prev) => (prev ? { ...prev, progress: Math.max(prev.progress, 95) } : prev))

      let uploadFailed = false
      try {
        await uploadTask
      } catch {
        uploadFailed = true
      }

      setIsUploading(false)

      if (uploadFailed) {
        await dicomPromise.catch(() => undefined)
        return
      }

      try {
        const extractedDicoms = await dicomPromise
        setDicomFiles(extractedDicoms)
        if (extractedDicoms.length === 0) {
          setDicomError('Не удалось найти DICOM файлы в загруженных данных')
        } else {
          setDicomError(null)
          setViewerSlice(1)
        }
      } catch (error) {
        console.error('Не удалось распаковать DICOM файлы', error)
        setDicomFiles([])
        setDicomError('Не удалось распаковать DICOM файлы')
      }
    },
    [addJob, authToken, removeJob, simulateStatusStream, startJob, updateJob],
  )

  const handleCancelJob = () => {
    if (!job) return
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current)
    }
    setJob({ ...job, status: 'failed', progress: job.progress })
  }

  const handleRetry = () => {
    if (!files.length) return
    void handleFilesAccepted(files)
  }

  const handleCopyTable = async () => {
    if (sortedSegments.length === 0) {
      return
    }

    const rows = sortedSegments
      .map((item) => `${item.label}\t${item.volumeMl} мл\t${item.percentage}%`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(`Метка\tОбъём\tПроцент\n${rows}`)
    } catch (error) {
      console.error('Не удалось скопировать таблицу', error)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    if (!job || job.status !== 'running') return
    const jitter = setInterval(() => {
      if (Math.random() < 0.08) {
        scheduleReconnection()
      }
    }, 7000)
    return () => clearInterval(jitter)
  }, [isAuthenticated, job, scheduleReconnection])

  if (!isAuthenticated) {
    return <AuthPage />
  }

  return (
    <div
      className={`flex h-screen min-h-[720px] font-sans text-slate-900`}
    >
      <HistorySidebar
        filteredItems={filteredHistory}
        pathologyOptions={pathologyOptions}
        historySearch={historySearch}
        onHistorySearchChange={setHistorySearch}
        selectedPathology={selectedPathology}
        onSelectPathology={setSelectedPathology}
        activeStudyId={activeStudyId}
        onResetWorkspace={resetWorkspace}
        onToggleCollapse={() => setViewerFullscreen(!viewerFullscreen)}
        collapsed={viewerFullscreen}
        username={authUsername}
        onLogout={handleLogout}
        isLoading={jobsLoading}
        error={jobsError}
      />

      <main
        className={`flex h-full flex-1 flex-col bg-white`}
      >
        {studyLoading && (
          <section className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center text-slate-600">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-400" aria-hidden="true" />
            <p className="text-base font-medium">Загружаем исследование…</p>
            <p className="max-w-sm text-sm text-slate-500">
              Подготовка данных и восстановление 3D сегментации могут занять несколько секунд.
            </p>
          </section>
        )}

        {!studyLoading && !job && !studyError && (
          <UploadLanding
            onFilesAccepted={handleFilesAccepted}
            anonymize={anonymize}
            onToggleAnonymize={setAnonymize}
          />
        )}

        {!studyLoading && studyError && !job && (
          <section className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
            <p className="text-lg font-semibold text-rose-500">{studyError}</p>
            <p className="max-w-sm text-sm text-slate-500">
              Попробуйте выбрать исследование ещё раз или загрузите собственные файлы.
            </p>
            <Button type="button" variant="outline" className={secondaryActionClass} onClick={resetWorkspace}>
              Вернуться к загрузке
            </Button>
          </section>
        )}

        {!studyLoading && job && (
          <JobWorkspace
            job={job}
            files={files}
            anonymize={anonymize}
            onCancelJob={handleCancelJob}
            onRetry={handleRetry}
            connectionState={connectionState}
            onCopySegments={handleCopyTable}
            isUploading={isUploading}
            selectedSegments={selectedSegments}
            toggleSegment={toggleSegment}
            sortedSegments={sortedSegments}
            viewerSlice={viewerSlice}
            onViewerSliceChange={setViewerSlice}
            findings={findings}
            handleSort={handleSort}
            sortField={sortField}
            sortAsc={sortAsc}
            dicomFiles={dicomFiles}
            dicomError={dicomError}
            viewerFullscreen={viewerFullscreen}
          />
      )}
      </main>
    </div>
  )
}

export default App

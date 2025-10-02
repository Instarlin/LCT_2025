import { useCallback, useEffect, useRef, useState } from 'react'
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

type ConnectionState = 'connected' | 'reconnecting'

type WorkspaceController = ReturnType<typeof useWorkspaceController>

const acceptedExtensions = ['.dcm', '.zip']

type UploadFileParams = {
  file: File
  token?: string | null
  onProgress?: (payload: { loaded: number; total?: number; percent: number }) => void
  assignRequest?: (xhr: XMLHttpRequest) => void
}

type UploadJobResult = {
  jobId?: string
  rawResponse: unknown
}

const uploadJobFile = ({ file, token, onProgress, assignRequest }: UploadFileParams): Promise<UploadJobResult> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    assignRequest?.(xhr)

    xhr.open('POST', '/api/jobs')
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }
    xhr.responseType = 'json'

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return
      const { loaded, total } = event
      const percent = event.lengthComputable && total ? Math.min(100, Math.round((loaded / total) * 100)) : 0
      onProgress({ loaded, total: event.lengthComputable ? total : undefined, percent })
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = xhr.response ?? (() => {
          try {
            return JSON.parse(xhr.responseText)
          } catch (
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            _error
          ) {
            return null
          }
        })()
        const jobIdValue =
          (response && typeof response === 'object' && 'id' in response && response.id) ??
          (response && typeof response === 'object' && 'uuid' in response && response.uuid)
        resolve({ jobId: jobIdValue ? String(jobIdValue) : undefined, rawResponse: response })
        return
      }
      reject(new Error(`Не удалось создать задание (${xhr.status})`))
    }

    xhr.onerror = () => {
      reject(new Error('Не удалось отправить файлы на сервер'))
    }

    xhr.onabort = () => {
      reject(new DOMException('Загрузка отменена пользователем', 'AbortError'))
    }

    const formData = new FormData()
    formData.append('file', file)
    xhr.send(formData)
  })

const App = () => {
  const controller = useWorkspaceController()

  if (!controller.isAuthenticated) {
    return <AuthPage />
  }

  return <WorkspaceView controller={controller} />
}

const WorkspaceView = ({
  controller,
}: {
  controller: WorkspaceController
}) => {
  const {
    history,
    sidebar,
    auth,
    jobs,
    study,
    upload,
    viewer,
    dicom,
    handlers,
  } = controller

  const { filteredHistory, pathologyOptions, historySearch, setHistorySearch, selectedPathology, setSelectedPathology } =
    history
  const { viewerFullscreen, toggleSidebarCollapse } = sidebar
  const { username } = auth
  const { isLoading: jobsLoading, error: jobsError, activeStudyId } = jobs
  const {
    studyLoading,
    studyError,
  } = study
  const {
    job,
    files,
    anonymize,
    setAnonymize,
    connectionState,
    isUploading,
  } = upload
  const {
    selectedSegments,
    toggleSegment,
    sortedSegments,
    viewerSlice,
    setViewerSlice,
    findings,
    handleSort,
    sortField,
    sortAsc,
  } = viewer
  const { dicomFiles, dicomError } = dicom
  const {
    onResetWorkspace,
    onFilesAccepted,
    onCancelJob,
    onRetry,
    onCopyTable,
    onSelectStudy,
    onLogout,
  } = handlers

  return (
    <div className="flex h-screen min-h-[720px] font-sans text-slate-900">
      <HistorySidebar
        filteredItems={filteredHistory}
        pathologyOptions={pathologyOptions}
        historySearch={historySearch}
        onHistorySearchChange={setHistorySearch}
        selectedPathology={selectedPathology}
        onSelectPathology={setSelectedPathology}
        onSelectStudy={onSelectStudy}
        activeStudyId={activeStudyId}
        onResetWorkspace={onResetWorkspace}
        onToggleCollapse={toggleSidebarCollapse}
        collapsed={viewerFullscreen}
        username={username}
        onLogout={onLogout}
        isLoading={jobsLoading}
        error={jobsError}
      />

      <main className="flex h-full flex-1 flex-col bg-white">
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
          <UploadLanding onFilesAccepted={onFilesAccepted} anonymize={anonymize} onToggleAnonymize={setAnonymize} />
        )}

        {!studyLoading && studyError && !job && (
          <section className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
            <p className="text-lg font-semibold text-rose-500">{studyError}</p>
            <p className="max-w-sm text-sm text-slate-500">
              Попробуйте выбрать исследование ещё раз или загрузите собственные файлы.
            </p>
            <Button type="button" variant="outline" className={secondaryActionClass} onClick={onResetWorkspace}>
              Вернуться к загрузке
            </Button>
          </section>
        )}

        {!studyLoading && job && (
          <JobWorkspace
            job={job}
            files={files}
            anonymize={anonymize}
            onCancelJob={onCancelJob}
            onRetry={onRetry}
            connectionState={connectionState}
            onCopySegments={onCopyTable}
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

function useWorkspaceController() {
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [job, setJob] = useState<UploadJob | null>(null)
  const [segments, setSegments] = useState<SegmentItem[]>([])
  const [findings, setFindings] = useState<FindingSummary[]>([])
  const [anonymize, setAnonymize] = useState(true)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected')
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

  const { selectedSegments, toggleSegment, sortedSegments, sortField, sortAsc, handleSort } = useSegmentManager(segments)

  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uploadRequestRef = useRef<XMLHttpRequest | null>(null)

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

        const filesResult = await Promise.all(
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

        const sanitized = filesResult.filter((item): item is DicomFile => item !== null)
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
        if (cancelled || !data) return
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
        if (cancelled || !data) return
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
    if (uploadRequestRef.current) {
      uploadRequestRef.current.abort()
      uploadRequestRef.current = null
    }
    setActiveStudyId(null)
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
  }, [applySidebarDefault, setHistorySearch, setSelectedPathology])

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
          if (statusTimerRef.current) {
            clearInterval(statusTimerRef.current)
          }
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
    if (!job || job.status !== 'running') return
    if (isUploading) return
    if (job.progress >= 100) return
    if (statusTimerRef.current) return
    simulateStatusStream(job.id)
  }, [isAuthenticated, job, simulateStatusStream, isUploading])

  const startJob = useCallback(
    (pickedFiles: File[]): UploadJob | null => {
      const total = pickedFiles.reduce((sum, file) => sum + file.size, 0)
      const newJob: UploadJob = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `job-${Math.random().toString(16).slice(2, 10)}`,
        status: 'running',
        progress: 0,
        startedAt: Date.now(),
        etaSeconds: undefined,
        totalFiles: pickedFiles.length,
        totalBytes: total,
      }
      setActiveStudyId(null)
      setStudyError(null)
      setSegments([])
      setFindings([])
      setViewerSlice(120)
      setDicomFiles([])
      setDicomError(null)
      setFiles(pickedFiles)
      setJob(newJob)
      return newJob
    },
    [],
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

      const dicomPromise = extractDicomFiles(validFiles)

      let uploadFailed = false
      let resolvedJobId: string | undefined

      try {
        const result = await uploadJobFile({
          file: validFiles[0],
          token: authToken ?? null,
          assignRequest: (xhr) => {
            uploadRequestRef.current = xhr
          },
          onProgress: ({ percent, total }) => {
            setJob((prev) =>
              prev
                ? {
                    ...prev,
                    progress: percent,
                    totalBytes: total ?? prev.totalBytes,
                  }
                : prev,
            )
          },
        })
        resolvedJobId = result.jobId
        setJob((prev) => (prev ? { ...prev, progress: 100 } : prev))
      } catch (error) {
        uploadFailed = true
        const isAbort = error instanceof DOMException && error.name === 'AbortError'
        if (!isAbort) {
          console.error('Не удалось отправить файлы на сервер', error)
        }
        removeJob(jobInstance.id)
        setJob((prev) =>
          prev && prev.id === jobInstance.id
            ? { ...prev, status: 'failed', etaSeconds: undefined }
            : prev,
        )
        setDicomFiles([])
        setDicomError(isAbort ? null : 'Не удалось отправить файлы на сервер')
      } finally {
        setIsUploading(false)
        uploadRequestRef.current = null
      }

      if (uploadFailed) {
        await dicomPromise.catch(() => undefined)
        return
      }

      if (resolvedJobId) {
        updateJob(jobInstance.id, {
          id: resolvedJobId,
          title: `job-${resolvedJobId}`,
          studyDate: today.toISOString().slice(0, 10),
        })
        setJob((prev) => (prev ? { ...prev, id: resolvedJobId } : prev))
      } else {
        updateJob(jobInstance.id, { title: 'job-created' })
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
    [addJob, authToken, removeJob, startJob, updateJob],
  )

  const handleCancelJob = useCallback(() => {
    if (!job) return
    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current)
    }
    if (uploadRequestRef.current) {
      uploadRequestRef.current.abort()
      uploadRequestRef.current = null
    }
    setIsUploading(false)
    setJob({ ...job, status: 'failed', progress: job.progress })
  }, [job])

  const handleRetry = useCallback(() => {
    if (!files.length) return
    void handleFilesAccepted(files)
  }, [files, handleFilesAccepted])

  const handleCopyTable = useCallback(async () => {
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
  }, [sortedSegments])

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

  const handleSelectStudy = useCallback(
    (id: string) => {
      setActiveStudyId(id)
      setJob(null)
      setFiles([])
      setIsUploading(false)
      setStudyError(null)
      setDicomFiles([])
      setDicomError(null)
    },
    [],
  )

  return {
    isAuthenticated,
    history: {
      filteredHistory,
      pathologyOptions,
      historySearch,
      setHistorySearch,
      selectedPathology,
      setSelectedPathology,
    },
    sidebar: {
      viewerFullscreen,
      toggleSidebarCollapse: () => setViewerFullscreen(!useViewerStore.getState().fullscreen),
    },
    auth: {
      username: authUsername,
    },
    jobs: {
      isLoading: jobsLoading,
      error: jobsError,
      activeStudyId: activeStudyId ?? undefined,
    },
    study: {
      studyLoading,
      studyError,
    },
    upload: {
      job,
      files,
      anonymize,
      setAnonymize,
      connectionState,
      isUploading,
    },
    viewer: {
      segments,
      selectedSegments,
      toggleSegment,
      sortedSegments,
      viewerSlice,
      setViewerSlice,
      findings,
      handleSort,
      sortField,
      sortAsc,
    },
    dicom: {
      dicomFiles,
      dicomError,
    },
    handlers: {
      onResetWorkspace: resetWorkspace,
      onFilesAccepted: handleFilesAccepted,
      onCancelJob: handleCancelJob,
      onRetry: handleRetry,
      onCopyTable: handleCopyTable,
      onSelectStudy: handleSelectStudy,
      onLogout: handleLogout,
    },
  }
}

export default App

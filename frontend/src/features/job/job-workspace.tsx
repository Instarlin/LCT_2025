import { useId, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import type { FindingSummary, UploadJob, JobResultsPayload, JobResultsRow } from '@/types/workspace'
import type { DicomFile } from '@/lib/dicom/extract-dicoms'
import { DicomViewer } from './dicom-viewer'
import { secondaryActionClass } from '@/lib/styles'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

const statusTone: Record<UploadJob['status'], string> = {
  idle: 'bg-slate-100 text-slate-600',
  queued: 'bg-amber-100 text-amber-700',
  running: 'bg-sky-100 text-sky-700',
  succeeded: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
}

const statusLabel: Record<UploadJob['status'], string> = {
  idle: 'Ожидание',
  queued: 'В очереди',
  running: 'Анализ',
  succeeded: 'Завершено',
  failed: 'Ошибка',
}

type JobWorkspaceProps = {
  job: UploadJob
  files: File[]
  anonymize: boolean
  onCancelJob: () => void
  onRetry: () => void
  connectionState: 'connected' | 'reconnecting'
  showConnection: boolean
  isUploading: boolean
  viewerSlice: number
  onViewerSliceChange: (value: number) => void
  findings: FindingSummary[]
  dicomFiles: DicomFile[]
  dicomError: string | null
  viewerFullscreen: boolean
  jobResults: JobResultsPayload | null
  onExportXlsx: () => void
}

export const JobWorkspace = ({
  job,
  files,
  anonymize,
  onCancelJob,
  onRetry,
  connectionState,
  isUploading,
  viewerSlice,
  onViewerSliceChange,
  dicomFiles,
  dicomError,
  viewerFullscreen,
  showConnection,
  jobResults,
  onExportXlsx,
}: JobWorkspaceProps) => (
  <section className="flex flex-1 flex-col bg-transparent overflow-y-auto">
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-800">Job #{job.id.slice(0, 8)}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            {job.etaSeconds !== undefined && job.status === 'running' && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                ETA ≈ {Math.max(job.etaSeconds, 0)} c
              </span>
            )}
            {showConnection && <ConnectionPill state={connectionState} />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelJob}
            disabled={job.status !== 'running'}
            className={secondaryActionClass}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={job.status === 'running' || !files.length}
            className={secondaryActionClass}
          >
            Retry
          </Button>
        </div>
      </div>
      <Progress value={job.progress} className="h-2 flex-1 rounded-full bg-sky-100" />
      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        <span>Файлы: {job.totalFiles}</span>
        <span>Объём: {formatBytes(job.totalBytes)}</span>
        <span>Анонимизация: {anonymize ? 'Да' : 'Нет'}</span>
        <span>Загрузка: {isUploading ? 'chunked' : 'готово'}</span>
      </div>
    </div>

    <div className="flex flex-2 max-w-lvw flex-col gap-6 border-t border-slate-200 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
      <section className="flex flex-1 flex-col gap-6 xl:flex-row xl:items-start">
        <ViewerPanel
          dicomFiles={dicomFiles}
          dicomError={dicomError}
          viewerSlice={viewerSlice}
          onViewerSliceChange={onViewerSliceChange}
          fullscreen={viewerFullscreen}
        />
        <SegmentSelection
          selectedSegments={new Set()}
          toggleSegment={() => {}}
        />
        <aside className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm xl:w-fit xl:self-start xl:flex-none">
          <FindingsSummary />
        </aside>
      </section>

      <section className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Метрики по меткам</h2>
          <div className="flex gap-2">
            {/* <Button type="button" variant="outline" size="sm" className={secondaryActionClass}>
              Copy
            </Button> */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={secondaryActionClass}
              onClick={onExportXlsx}
              disabled={!jobResults}
            >
              Полный XLSX файл
            </Button>
          </div>
        </div>
        <MetricsTable
          resultRows={jobResults?.rows ?? []}
        />
      </section>
    </div>
  </section>
)

type StatusBadgeProps = { status: UploadJob['status'] }

const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone[status]}`}
  >
    {statusLabel[status]}
  </span>
)

type ConnectionPillProps = { state: 'connected' | 'reconnecting' }

const ConnectionPill = ({ state }: ConnectionPillProps) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
      state === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}
  >
    {state === 'connected' ? 'SSE/WebSocket подключен' : 'Переподключение…'}
  </span>
)

type ViewerPanelProps = {
  dicomFiles: DicomFile[]
  dicomError: string | null
  viewerSlice: number
  onViewerSliceChange: (value: number) => void
  fullscreen: boolean
}

const ViewerPanel = ({
  dicomFiles,
  dicomError,
  viewerSlice,
  onViewerSliceChange,
  fullscreen,
}: ViewerPanelProps) => {
  const hasDicom = dicomFiles.length > 0
  const maxSlice = hasDicom ? dicomFiles.length : 300
  const safeViewerSlice = Math.min(Math.max(viewerSlice, 1), maxSlice)
  const handleSliceChange = (event: ChangeEvent<HTMLInputElement>) => {
    onViewerSliceChange(Number(event.target.value))
  }
  const sliderId = useId()

  return (
    <div
      className={cn(
        'flex w-full max-w-full flex-col gap-4 xl:self-stretch xl:flex-1 xl:basis-0 xl:min-w-0',
        fullscreen && 'flex-1',
        fullscreen
          ? 'max-h-[calc(100vh-100px)] max-w-[calc(100vh-100px)]'
          : 'max-h-[calc(100vh-120px)] max-w-[calc(100vh-120px)]'
      )}
    >
      <div
        className={
          'relative aspect-square w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-black'
        }
        role="img"
        aria-label={hasDicom ? 'DICOM viewer' : '2D Axial viewer placeholder'}
      >
        <div className="absolute right-2 top-2 z-10 border border-slate-200 bg-white p-0.5 text-xs font-semibold text-slate-600">
          {safeViewerSlice} / {maxSlice}
        </div>
        {hasDicom ? (
          <DicomViewer
            files={dicomFiles}
            activeImageIndex={safeViewerSlice - 1}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-4 text-sm text-slate-500">
            <span>
              Добавьте ZIP с исследованием, чтобы просматривать DICOM прямо здесь
            </span>
          </div>
        )}
      </div>
      <div className={'flex w-full max-w-full items-center gap-3'}>
        <label htmlFor={sliderId} className="text-sm font-medium text-slate-600 whitespace-nowrap">
          Slice
        </label>
        <input
          id={sliderId}
          type="range"
          min={1}
          max={Math.max(maxSlice, 1)}
          value={safeViewerSlice}
          onChange={handleSliceChange}
          className="h-2 flex-1 rounded-full accent-sky-500"
        />
      </div>
      {dicomError && (
        <p className="text-sm text-rose-600">{dicomError}</p>
      )}
    </div>
  )
}

type SegmentSelectionProps = {
  selectedSegments: Set<string>
  toggleSegment: (segmentId: string) => void
}

const SegmentSelection = ({ selectedSegments, toggleSegment }: SegmentSelectionProps) => (
  <div className="flex w-full flex-col gap-4 xl:w-fit xl:self-start xl:flex-none">
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-semibold text-slate-800">Отображение слоёв</h2>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {selectedSegments.size} активных меток
      </span>
    </div>
    {selectedSegments.size > 0 ? (
      <div className="flex flex-col gap-2">
        {Array.from(selectedSegments).map((segment) => {
          const checkboxId = `overlay-${segment}`
          return (
            <label
              key={segment}
              htmlFor={checkboxId}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-xs transition-colors hover:border-slate-300"
            >
              <Checkbox
                id={checkboxId}
                checked={selectedSegments.has(segment)}
                onCheckedChange={() => toggleSegment(segment)}
                className="size-4"
                CheckIconSize="size-3"
              />
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment }} />
                <span className="font-medium text-slate-700">{segment}</span>
              </span>
            </label>
          )
        })}
      </div>
    ) : (
      <p className="text-sm text-slate-500">Сегменты появятся после завершения обработки.</p>
    )}
  </div>
)

const FindingsSummary = () => (
  <div className="flex flex-col gap-4">
    <h2 className="text-lg font-semibold text-slate-800">Краткая сводка</h2>
      <p className="mt-4 text-sm text-slate-500">Сводка станет доступна после анализа исследования.</p>
  </div>
)

type MetricsTableProps = {
  resultRows: JobResultsRow[]
}

const MetricsTable = ({ resultRows }: MetricsTableProps) => {
  const hasResults = resultRows.length > 0

  const renderBoolean = (value: boolean | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'boolean') {
      return value ? 'Да' : 'Нет'
    }
    const normalized = value.toString().trim().toLowerCase()
    if (['true', '1', 'yes', 'да'].includes(normalized)) return 'Да'
    if (['false', '0', 'no', 'нет'].includes(normalized)) return 'Нет'
    return value
  }

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—'
    }
    return value.toFixed(3)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
      <div className="overflow-x-auto">
        <table className={`min-w-full ${hasResults ? 'text-xs sm:text-sm' : 'text-sm'} text-slate-600`}>
          <thead className="bg-slate-50 text-left font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Pathology</th>
              <th className="px-4 py-3">Prob. Pathology</th>
              <th className="px-4 py-3">Prob. Anomaly</th>
              <th className="px-4 py-3">Processing Time</th>
              
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resultRows.map((row, index) => (
              <tr key={`${row.study_uid ?? index}-${index}`}>
                <td className="px-4 py-3">{row.most_dangerous_pathology_type ?? '—'}</td>
                <td className="px-4 py-3">{formatNumber(row.probability_of_pathology)}</td>
                <td className="px-4 py-3">{formatNumber(row.probability_of_anomaly)}</td>
                <td className="px-4 py-3">{row.time_of_processing ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!hasResults && (
        <p className="px-4 pb-4 text-sm text-slate-500">
          Таблица обновится после получения метрик для выбранного исследования.
        </p>
      )}
    </div>
  )
}

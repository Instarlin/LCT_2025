export type JobStatus = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed'

export interface UploadJob {
  id: string
  status: JobStatus
  progress: number
  etaSeconds?: number
  startedAt: number
  totalFiles: number
  totalBytes: number
}

export interface HistoryItem {
  id: string
  title?: string
  patient: string
  studyDate: string
  summary: string
  involvement: number
  tags: string[]
  badges: string[]
  pathologies: Array<{ label: string; probability: number }>
}

export interface FindingSummary {
  label: string
  value: string
  hint?: string
}

export interface JobResultsRow {
  study_uid?: string | null
  series_uid?: string | null
  probability_of_pathology?: number | null
  pathology?: boolean | string | null
  time_of_processing?: string | null
  most_dangerous_pathology_type?: string | null
  hazard_probability?: number | null
  probability_of_anomaly?: number | null
}

export interface JobResultsPayload {
  parsed_at?: string | null
  summary?: Record<string, unknown> | null
  rows?: JobResultsRow[]
}

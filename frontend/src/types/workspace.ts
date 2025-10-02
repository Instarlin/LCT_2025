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

export interface SegmentItem {
  id: string
  label: string
  color: string
  volumeMl: number
  percentage: number
}

export interface FindingSummary {
  label: string
  value: string
  hint?: string
}

export interface StudyData {
  segments: SegmentItem[]
  findings: FindingSummary[]
  preferredSlice?: number
  initialNote?: string
  dicomResources?: Array<{ name?: string; url: string }>
}

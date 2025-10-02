import { create } from 'zustand'
import type { HistoryItem } from '@/types/workspace'

type JobsState = {
  items: HistoryItem[]
  loading: boolean
  error: string | null
  hasFetched: boolean
  fetchJobs: (token?: string | null, force?: boolean) => Promise<void>
  setJobs: (items: HistoryItem[]) => void
  addJob: (item: HistoryItem) => void
  updateJob: (id: string, update: Partial<HistoryItem>) => void
  removeJob: (id: string) => void
  reset: () => void
}

const parseString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }
  return undefined
}

const coalesce = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return undefined
}

const normalizePathologies = (value: unknown): HistoryItem['pathologies'] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const source = item as Record<string, unknown>
      const label =
        parseString(source.label) ??
        parseString(source.name) ??
        parseString(source.title)
      const probabilityRaw =
        'probability' in source
          ? source.probability
          : 'score' in source
            ? source.score
            : 'confidence' in source
              ? source.confidence
              : undefined
      const probabilityCandidate =
        typeof probabilityRaw === 'number'
          ? probabilityRaw
          : typeof probabilityRaw === 'string'
            ? Number.parseFloat(probabilityRaw)
            : null
      if (!label || probabilityCandidate === null || Number.isNaN(probabilityCandidate)) {
        return null
      }
      return { label, probability: probabilityCandidate }
    })
    .filter((item): item is { label: string; probability: number } => item !== null)
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => parseString(item))
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
}

const normalizeHistoryItem = (raw: unknown): HistoryItem | null => {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const candidate = raw as Record<string, unknown>
  const nestedStudy =
    typeof candidate.study === 'object' && candidate.study !== null
      ? (candidate.study as Record<string, unknown>)
      : null

  const id = parseString(
    coalesce(
      candidate.id,
      candidate.job_id,
      nestedStudy?.id,
      nestedStudy?.job_id,
      nestedStudy?.study_id,
    ),
  )

  const patient = parseString(
    coalesce(
      candidate.patient,
      candidate.patient_id,
      candidate.patient_name,
      nestedStudy?.patient,
      nestedStudy?.patient_id,
      nestedStudy?.patient_name,
    ),
  )

  const studyDate = parseString(
    coalesce(
      candidate.studyDate,
      candidate.study_date,
      candidate.performed_at,
      candidate.created_at,
      nestedStudy?.studyDate,
      nestedStudy?.study_date,
      nestedStudy?.performed_at,
      nestedStudy?.created_at,
    ),
  )

  const summary =
    parseString(
      coalesce(
        candidate.summary,
        candidate.description,
        candidate.details,
        nestedStudy?.summary,
        nestedStudy?.description,
        nestedStudy?.details,
      ),
    ) ?? ''

  if (!id || !studyDate) {
    return null
  }

  const title = parseString(
    coalesce(
      candidate.title,
      candidate.name,
      candidate.display_name,
      nestedStudy?.title,
      nestedStudy?.name,
      nestedStudy?.display_name,
    ),
  )

  const involvementRaw = coalesce(
    candidate.involvement,
    candidate.involvement_percent,
    nestedStudy?.involvement,
    nestedStudy?.involvement_percent,
  )
  const involvement =
    typeof involvementRaw === 'number'
      ? involvementRaw
      : typeof involvementRaw === 'string'
        ? Number.parseFloat(involvementRaw)
        : 0

  const tags = normalizeStringArray(
    coalesce(candidate.tags, candidate.labels, nestedStudy?.tags, nestedStudy?.labels),
  )
  const badges = normalizeStringArray(
    coalesce(candidate.badges, candidate.flags, nestedStudy?.badges, nestedStudy?.flags),
  )
  const pathologies = normalizePathologies(
    coalesce(
      candidate.pathologies,
      candidate.diagnoses,
      candidate.findings,
      nestedStudy?.pathologies,
      nestedStudy?.diagnoses,
      nestedStudy?.findings,
    ),
  )

  return {
    id,
    title,
    patient: patient ?? '—',
    studyDate,
    summary,
    involvement: Number.isFinite(involvement) ? involvement : 0,
    tags,
    badges,
    pathologies,
  }
}

export const useJobsStore = create<JobsState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  hasFetched: false,
  async fetchJobs(token?: string | null, force = false) {
    const { hasFetched, loading } = get()
    if (!force && (hasFetched || loading)) {
      return
    }
    set({ loading: true, error: null })
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch('/api/jobs', {
        method: 'GET',
        headers,
      })
      if (!response.ok) {
        const message = `Не удалось загрузить список исследований (${response.status})`
        set({ error: message, loading: false, hasFetched: false })
        return
      }

      const data = await response.json()
      const items = Array.isArray(data)
        ? data
        : Array.isArray((data as { results?: unknown }).results)
          ? (data as { results: unknown[] }).results
          : []
      const normalized = items
        .map((item) => normalizeHistoryItem(item))
        .filter((item): item is HistoryItem => item !== null)

      set({ items: normalized, loading: false, error: null, hasFetched: true })
    } catch (error) {
      console.error('Не удалось загрузить список исследований', error)
      set({ error: 'Не удалось загрузить список исследований', loading: false, hasFetched: false })
    }
  },
  setJobs(items) {
    set({ items, hasFetched: true, loading: false, error: null })
  },
  addJob(item) {
    set((state) => ({
      items: [item, ...state.items],
      hasFetched: true,
    }))
  },
  updateJob(id, update) {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...update } : item)),
    }))
  },
  removeJob(id) {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
  },
  reset() {
    set({ items: [], loading: false, error: null, hasFetched: false })
  },
}))

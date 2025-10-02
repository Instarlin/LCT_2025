import type { FindingSummary, SegmentItem, StudyData } from '@/types/workspace'

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value)
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric
    }
  }
  return undefined
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

const normalizeSegments = (value: unknown): SegmentItem[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<SegmentItem[]>((acc, item, index) => {
    if (typeof item !== 'object' || item === null) {
      return acc
    }

    const source = item as Record<string, unknown>
    const id =
      parseString(source.id) ??
      parseString(source.segment_id) ??
      `segment-${index + 1}`
    const label =
      parseString(source.label) ??
      parseString(source.name) ??
      `Segment ${index + 1}`
    const color = parseString(source.color) ?? '#0ea5e9'
    const volumeMl = parseNumber(source.volumeMl ?? source.volume_ml ?? source.volume) ?? 0
    const percentage = parseNumber(source.percentage ?? source.percent ?? source.share) ?? 0

    acc.push({ id, label, color, volumeMl, percentage })
    return acc
  }, [])
}

const normalizeFindings = (value: unknown): FindingSummary[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.reduce<FindingSummary[]>((acc, item) => {
    if (typeof item !== 'object' || item === null) {
      return acc
    }
    const source = item as Record<string, unknown>
    const label = parseString(source.label) ?? parseString(source.name)
    const summaryValue = parseString(source.value) ?? parseString(source.description)
    const hint = parseString(source.hint ?? source.note ?? source.comment)
    if (!label || !summaryValue) {
      return acc
    }
    const finding: FindingSummary = hint ? { label, value: summaryValue, hint } : { label, value: summaryValue }
    acc.push(finding)
    return acc
  }, [])
}

const normalizeDicomResources = (
  value: unknown,
): StudyData['dicomResources'] => {
  if (!value) {
    return undefined
  }

  const ensureUrl = (maybeUrl: unknown): string | undefined => {
    const str = parseString(maybeUrl)
    if (!str) return undefined
    try {
      // Allow relative URLs as well
      return new URL(str, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').href
    } catch {
      return str.startsWith('/') ? str : undefined
    }
  }

  const candidates = Array.isArray(value) ? value : [value]
  const results: Array<{ name?: string; url: string }> = []

  candidates.forEach((entry, index) => {
    if (typeof entry === 'string') {
      const url = ensureUrl(entry)
      if (url) {
        results.push({ url, name: `dicom-${index + 1}.dcm` })
      }
      return
    }
    if (typeof entry === 'object' && entry !== null) {
      const source = entry as Record<string, unknown>
      const url =
        ensureUrl(source.url) ??
        ensureUrl(source.href) ??
        ensureUrl(source.download_url) ??
        ensureUrl(source.presigned_url) ??
        ensureUrl(source.link)
      if (!url) {
        return
      }
      const name = parseString(source.name ?? source.filename ?? source.title)
      results.push({ url, name })
    }
  })

  return results.length > 0 ? results : undefined
}

const normalizeStudyFromPayload = (payload: unknown): StudyData | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const candidate = payload as Record<string, unknown>
  const studySource =
    typeof candidate.study === 'object' && candidate.study !== null
      ? (candidate.study as Record<string, unknown>)
      : candidate

  const segments = normalizeSegments(
    studySource.segments ??
      studySource.segmentations ??
      studySource.results ??
      studySource.segment_results,
  )
  const findings = normalizeFindings(
    studySource.findings ?? studySource.summary ?? studySource.findings_summary,
  )
  const preferredSlice =
    parseNumber(
      studySource.preferredSlice ??
        studySource.preferred_slice ??
        studySource.slice ??
        studySource.preferredPlane,
    ) ?? undefined
  const initialNote =
    parseString(
      studySource.initialNote ??
        studySource.initial_note ??
        studySource.note ??
        studySource.comment,
    ) ?? undefined

  const dicomResources =
    normalizeDicomResources(
      studySource.dicomResources ??
        studySource.dicom_files ??
        studySource.dicoms ??
        studySource.files ??
        studySource.outputs ??
        candidate.dicomResources ??
        candidate.outputs,
    )

  return {
    segments,
    findings,
    preferredSlice,
    initialNote,
    dicomResources,
  }
}

const fetchStudyFromApi = async (studyId: string, token?: string): Promise<StudyData | null> => {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`/api/jobs/${encodeURIComponent(studyId)}`, {
      method: 'GET',
      headers,
    })

    console.log(response)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`Не удалось загрузить исследование (${response.status})`)
    }

    const data = await response.json().catch(() => null)
    console.log(data)
    const normalized = normalizeStudyFromPayload(data)
    if (normalized) {
      return normalized
    }

    return null
  } catch (error) {
    console.error('Не удалось получить исследование из API', error)
    throw error
  }
}

export const loadStudyById = async (studyId: string, token?: string): Promise<StudyData | null> => {
  if (studyId !== '__uploaded') {
    try {
      const remote = await fetchStudyFromApi(studyId, token)
      if (remote) {
        return remote
      }
    } catch (error) {
    }
  }

  return null
}

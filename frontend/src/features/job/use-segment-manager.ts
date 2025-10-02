import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SegmentItem } from '@/types/workspace'

type SortField = 'label' | 'volumeMl' | 'percentage'

export const useSegmentManager = (segments: SegmentItem[]) => {
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(() => new Set())
  const [sortField, setSortField] = useState<SortField>('label')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    setSelectedSegments(new Set(segments.map((item) => item.id)))
  }, [segments])

  const sortedSegments = useMemo(() => {
    const list = [...segments]
    list.sort((a, b) => {
      const direction = sortAsc ? 1 : -1
      if (sortField === 'label') {
        return a.label.localeCompare(b.label) * direction
      }
      return (a[sortField] - b[sortField]) * direction
    })
    return list
  }, [segments, sortAsc, sortField])

  const toggleSegment = useCallback((segmentId: string) => {
    setSelectedSegments((prev) => {
      const next = new Set(prev)
      if (next.has(segmentId)) {
        next.delete(segmentId)
      } else {
        next.add(segmentId)
      }
      return next
    })
  }, [])

  const handleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortAsc((prevAsc) => !prevAsc)
        return prevField
      }
      setSortAsc(true)
      return field
    })
  }, [])

  return {
    selectedSegments,
    toggleSegment,
    sortedSegments,
    sortField,
    sortAsc,
    handleSort,
  }
}

import { useEffect, useMemo, useState } from 'react'
import type { HistoryItem } from '@/types/workspace'

export const useHistoryBrowser = (items: HistoryItem[]) => {
  const [historySearch, setHistorySearch] = useState('')
  const [selectedPathology, setSelectedPathology] = useState<string | undefined>(undefined)

  const pathologyOptions = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.pathologies.map((p) => p.label)))),
    [items],
  )

  const filteredHistory = useMemo(() => {
    const lowerSearch = historySearch.trim().toLowerCase()

    return items.filter((item) => {
      const matchesSearch =
        !lowerSearch ||
        [item.patient, item.summary, item.title ?? '', item.studyDate]
          .map((field) => (typeof field === 'string' ? field.toLowerCase() : ''))
          .some((value) => value.includes(lowerSearch))

      const matchesPathology =
        !selectedPathology ||
        item.pathologies.some((pathology) => pathology.label === selectedPathology)

      return matchesSearch && matchesPathology
    })
  }, [historySearch, items, selectedPathology])

  useEffect(() => {
    if (!selectedPathology) {
      return
    }
    if (!pathologyOptions.includes(selectedPathology)) {
      setSelectedPathology(undefined)
    }
  }, [pathologyOptions, selectedPathology, setSelectedPathology])

  return {
    historySearch,
    setHistorySearch,
    selectedPathology,
    setSelectedPathology,
    pathologyOptions,
    filteredHistory,
  }
}

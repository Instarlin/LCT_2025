import type { StudyData } from '@/types/workspace'

const study: StudyData = {
  preferredSlice: 128,
  initialNote: 'Контрольная точка после курса терапии. Следить за динамикой в верхних долях.',
  segments: [
    { id: 'seg-1', label: 'Левое лёгкое — GGO', color: '#7C8CFF', volumeMl: 120, percentage: 14 },
    { id: 'seg-2', label: 'Правое лёгкое — Consolidation', color: '#FF8F6B', volumeMl: 95, percentage: 11 },
    { id: 'seg-3', label: 'Фиброз', color: '#60E7C1', volumeMl: 40, percentage: 4 },
    { id: 'seg-4', label: 'Сосудистые изменения', color: '#EBD66F', volumeMl: 22, percentage: 2 },
  ],
  findings: [
    { label: 'Общий объём поражения', value: '235 мл (28%)' },
    { label: 'Основные зоны', value: 'Верхние доли > нижние', hint: 'Приоритет — правое лёгкое' },
    { label: 'Сегменты риска', value: 'Периферические 5-й и 6-й сегменты' },
  ],
}

export default study

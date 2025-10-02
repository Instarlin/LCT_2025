import type { StudyData } from '@/types/workspace'

const study: StudyData = {
  preferredSlice: 110,
  findings: [
    { label: 'Общий объём поражения', value: '210 мл (24%)' },
    { label: 'Основные зоны', value: 'Очаги в верхней и средней долях' },
    { label: 'Сегменты риска', value: 'Правое лёгкое, 4-й и 6-й сегменты', hint: 'Планировать повторное исследование через 2 месяца' },
  ],
  segments: [
    { id: 'upload-1', label: 'GGO — правая верхняя доля', color: '#7C8CFF', volumeMl: 105, percentage: 12 },
    { id: 'upload-2', label: 'Консолидация — левая средняя доля', color: '#FF8F6B', volumeMl: 72, percentage: 8 },
    { id: 'upload-3', label: 'Периваскулярные изменения', color: '#60E7C1', volumeMl: 33, percentage: 4 },
  ],
}

export default study

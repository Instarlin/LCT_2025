import type { StudyData } from '@/types/workspace'

const study: StudyData = {
  preferredSlice: 96,
  segments: [
    { id: 'seg-1', label: 'Нижняя доля — Consolidation', color: '#FF8F6B', volumeMl: 70, percentage: 8 },
    { id: 'seg-5', label: 'Линейные уплотнения', color: '#9FA8FF', volumeMl: 35, percentage: 4 },
    { id: 'seg-6', label: 'Ателектаз', color: '#F7C948', volumeMl: 18, percentage: 2 },
  ],
  findings: [
    { label: 'Общий объём поражения', value: '123 мл (14%)' },
    { label: 'Основные зоны', value: 'Нижняя доля справа' },
    { label: 'Сегменты риска', value: '8-й сегмент, базальные отделы', hint: 'Проверить динамику через 6 недель' },
  ],
}

export default study

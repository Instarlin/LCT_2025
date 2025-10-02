import type { StudyData } from '@/types/workspace'

const study: StudyData = {
  preferredSlice: 144,
  initialNote: 'Разметка фиброзных изменений. Рекомендована консультация пульмонолога.',
  segments: [
    { id: 'seg-7', label: 'Диффузный фиброз', color: '#60E7C1', volumeMl: 160, percentage: 19 },
    { id: 'seg-8', label: 'Сотовое лёгкое', color: '#EBD66F', volumeMl: 80, percentage: 9 },
    { id: 'seg-9', label: 'Субплевральные изменения', color: '#F2A9DE', volumeMl: 55, percentage: 6 },
  ],
  findings: [
    { label: 'Общий объём поражения', value: '295 мл (34%)' },
    { label: 'Основные зоны', value: 'Преимущественно периферические области' },
    { label: 'Сегменты риска', value: 'Верхние и средние отделы, особенно справа', hint: 'Оценить прогрессию каждые 2 месяца' },
  ],
}

export default study

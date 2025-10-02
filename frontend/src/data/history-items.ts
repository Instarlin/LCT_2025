import type { HistoryItem } from '@/types/workspace'

export const historyItems: HistoryItem[] = [
  {
    id: 'hx-001',
    title: 'Post-COVID pneumonia follow-up',
    patient: 'ID-45802',
    studyDate: '2025-02-18',
    summary: 'Множественные очаги в верхней доле',
    involvement: 18,
    tags: ['Pneumonia', 'Upper lobe'],
    badges: ['GGO', 'Fissure crossing'],
    pathologies: [
      { label: 'Organizing pneumonia', probability: 0.74 },
      { label: 'ARDS', probability: 0.42 },
    ],
  },
  {
    id: 'hx-002',
    title: 'Baseline screening',
    patient: 'ID-44783',
    studyDate: '2025-02-10',
    summary: 'Изолированное поражение нижней доли',
    involvement: 7,
    tags: ['Lower lobe'],
    badges: ['Consolidation'],
    pathologies: [
      { label: 'Lobar pneumonia', probability: 0.63 },
      { label: 'Pulmonary abscess', probability: 0.28 },
    ],
  },
  {
    id: 'hx-003',
    title: 'Chronic fibrosis staging',
    patient: 'ID-43111',
    studyDate: '2025-01-30',
    summary: 'Диффузные изменения',
    involvement: 32,
    tags: ['Diffuse', 'Fibrosis'],
    badges: ['Reticulation'],
    pathologies: [
      { label: 'Idiopathic pulmonary fibrosis', probability: 0.82 },
      { label: 'Sarcoidosis', probability: 0.37 },
    ],
  },
]

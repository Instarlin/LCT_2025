export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`
}

export const formatShortDate = (iso: string) => {
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
  return formatter.format(new Date(iso))
}

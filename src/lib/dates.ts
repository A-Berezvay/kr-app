const ensureDate = (value: Date | string | number) => {
  if (value instanceof Date) return value
  return new Date(value)
}

export const startOfDay = (value: Date | string | number) => {
  const date = ensureDate(value)
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

export const endOfDay = (value: Date | string | number) => {
  const date = ensureDate(value)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

export const startOfToday = () => startOfDay(new Date())

export const endOfToday = () => endOfDay(new Date())

export const startOfWeek = (value: Date | string | number = new Date()) => {
  const date = startOfDay(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setDate(date.getDate() + diff)
  return start
}

export const endOfWeek = (value: Date | string | number = new Date()) => {
  const start = startOfWeek(value)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export const isSameDay = (a: Date | string | number, b: Date | string | number) => {
  const dateA = ensureDate(a)
  const dateB = ensureDate(b)
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

export const formatDayLabel = (value: Date | string | number, base: Date = new Date()) => {
  const date = ensureDate(value)
  if (isSameDay(date, base)) return 'Today'

  const tomorrow = new Date(base)
  tomorrow.setDate(base.getDate() + 1)
  if (isSameDay(date, tomorrow)) return 'Tomorrow'

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateWithWeekday = (value: Date | string | number) => {
  const date = ensureDate(value)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export const formatTime = (value: Date | string | number) => {
  const date = ensureDate(value)
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const addMinutes = (value: Date | string | number, minutes: number) => {
  const date = ensureDate(value)
  const result = new Date(date)
  result.setMinutes(date.getMinutes() + minutes)
  return result
}

export const addDays = (value: Date | string | number, days: number) => {
  const date = ensureDate(value)
  const result = new Date(date)
  result.setDate(date.getDate() + days)
  return result
}

export const getRollingWeekRange = (value: Date | string | number = new Date()) => {
  const start = startOfDay(value)
  const end = endOfDay(addDays(start, 6))
  return { start, end }
}

export const startOfMonth = (value: Date | string | number = new Date()) => {
  const date = ensureDate(value)
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  return start
}

export const endOfMonth = (value: Date | string | number = new Date()) => {
  const start = startOfMonth(value)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  end.setMilliseconds(-1)
  return end
}

export const formatMonthLabel = (value: Date | string | number) => {
  const date = ensureDate(value)
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export const formatDuration = (minutes: number) => {
  if (!minutes) return '0 mins'
  if (minutes < 60) return `${minutes} mins`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (!mins) return `${hours} hr${hours > 1 ? 's' : ''}`
  return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`
}

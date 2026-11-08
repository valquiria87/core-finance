const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatBRL(value: number) {
  return brl.format(value).replace(/\u00a0/g, ' ')
}

export function formatBRLOrMissing(value: number | null | undefined) {
  return value == null ? 'Não informado' : formatBRL(value)
}

export function formatPercent(value: number) {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: 'UTC',
})

const shortFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})

export function formatDayHeading(iso: string, todayIso: string) {
  if (iso === todayIso) return 'Hoje'

  const yesterday = new Date(`${todayIso}T00:00:00Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)

  if (iso === yesterday.toISOString().slice(0, 10)) return 'Ontem'

  const label = dayFormatter.format(new Date(`${iso}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatShortDate(iso: string) {
  return shortFormatter.format(new Date(`${iso}T00:00:00Z`))
}

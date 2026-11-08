import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight } from 'lucide-react'
import { CountUp } from '@/components/finance/count-up'
import { Surface } from '@/components/finance/surface'
import { latestTransactionDate, monthKey, periodFlows, previousMonthKey, variation } from '@/lib/finance'
import { formatPercent } from '@/lib/format'
import type { SandboxSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-text-muted">Sem base de comparação</span>
  const up = value >= 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
        up ? 'text-inflow' : 'text-outflow',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{up ? 'Aumento de' : 'Queda de'}</span>
      {formatPercent(Math.abs(value))}
      <span className="font-medium text-text-muted">vs. mês anterior</span>
    </span>
  )
}

export function FlowCards({ data }: { data: SandboxSnapshot }) {
  const key = monthKey(latestTransactionDate(data.transactions, data.asOf))
  const now = periodFlows(data.transactions, key)
  const prev = periodFlows(data.transactions, previousMonthKey(key))
  const periodLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}-01T00:00:00Z`))

  const cards = [
    {
      label: 'Entradas',
      value: now.inflow,
      change: variation(now.inflow, prev.inflow),
      icon: ArrowDownLeft,
      tone: 'text-inflow bg-inflow/12',
      valueTone: 'text-inflow',
    },
    {
      label: 'Saídas',
      value: now.outflow,
      change: variation(now.outflow, prev.outflow),
      icon: ArrowUpRight,
      tone: 'text-outflow bg-outflow/12',
      valueTone: 'text-outflow',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      {cards.map((c, i) => (
        <Surface key={c.label} delay={120 + i * 60} interactive className="p-4 md:p-5" aria-label={c.label}>
          <div className="flex items-center gap-2">
            <span className={cn('flex size-8 items-center justify-center rounded-full', c.tone)}>
              <c.icon className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-text-muted">{c.label}</p>
          </div>
          <p className={cn('mt-3 text-lg font-bold tracking-tight tabular-nums sm:text-2xl', c.valueTone)}>
            <CountUp value={c.value} />
          </p>
          <p className="mt-0.5 mb-2 text-xs text-text-muted">{periodLabel}</p>
          <Change value={c.change} />
        </Surface>
      ))}
    </div>
  )
}

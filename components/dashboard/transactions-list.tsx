'use client'

import { ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/finance/badge'
import { CategoryIcon } from '@/components/finance/category-icon'
import { EmptyState } from '@/components/finance/empty-state'
import { SectionTitle, Surface } from '@/components/finance/surface'
import { groupByDay, isInflow, isOutflow } from '@/lib/finance'
import { formatDayHeading, formatUSD } from '@/lib/format'
import type { SandboxSnapshot } from '@/lib/types'
import { cn } from '@/lib/utils'

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'out', label: 'Saídas' },
  { id: 'in', label: 'Entradas' },
] as const

type Filter = (typeof FILTERS)[number]['id']

export function TransactionsList({ data }: { data: SandboxSnapshot }) {
  const [filter, setFilter] = useState<Filter>('all')
  const accountName = (id: string) => {
    const a = data.accounts.find((x) => x.id === id)
    return a ? `${a.name} ••${a.mask}` : 'Conta'
  }
  const filtered = data.transactions.filter((t) =>
    filter === 'all' ? true : filter === 'out' ? isOutflow(t) : isInflow(t),
  )
  const groups = groupByDay(filtered).slice(0, 10)

  return (
    <Surface delay={260} id="transacoes" className="scroll-mt-24" aria-labelledby="transacoes-title">
      <SectionTitle
        id="transacoes-title"
        title="Transações"
        subtitle="Positivo = saída · negativo = entrada (regra Plaid)"
        action={
          <div role="group" aria-label="Filtrar transações" className="flex rounded-full border bg-surface-elev p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filter === f.id ? 'bg-surface text-foreground shadow-sm' : 'text-text-muted hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {groups.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Nada por aqui" description="Nenhuma transação encontrada com esse filtro. Tente outro filtro." />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.date} aria-label={formatDayHeading(g.date, data.asOf)}>
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                {formatDayHeading(g.date, data.asOf)}
              </h3>
              <ul className="divide-y">
                {g.items.map((t) => {
                  const out = t.amount > 0
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <CategoryIcon id={t.category} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{t.merchant}</p>
                          {t.pending && <Badge tone="warning">Pendente</Badge>}
                        </div>
                        <p className="truncate text-xs text-text-muted">{accountName(t.accountId)}</p>
                      </div>
                      <p
                        className={cn(
                          'shrink-0 text-right text-sm font-semibold tabular-nums',
                          out ? 'text-outflow' : 'text-inflow',
                        )}
                      >
                        <span className="sr-only">{out ? 'Saída de ' : 'Entrada de '}</span>
                        <span aria-hidden="true">{out ? '− ' : '+ '}</span>
                        {formatUSD(Math.abs(t.amount))}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Surface>
  )
}

'use client'

import { ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/finance/badge'
import { CategoryIcon } from '@/components/finance/category-icon'
import { EmptyState } from '@/components/finance/empty-state'
import { SectionTitle, Surface } from '@/components/finance/surface'
import { groupByDay, isInflow, isOutflow } from '@/lib/finance'
import { formatBRL, formatDayHeading } from '@/lib/format'
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
  const [visibleDays, setVisibleDays] = useState(10)

  const accountName = (id: string) => {
    const account = data.accounts.find((item) => item.id === id)
    return account ? `${account.name} ••${account.mask}` : 'Conta'
  }

  const filtered = data.transactions.filter((transaction) =>
    filter === 'all'
      ? true
      : filter === 'out'
        ? isOutflow(transaction)
        : isInflow(transaction),
  )

  const allGroups = groupByDay(filtered)
  const groups = allGroups.slice(0, visibleDays)

  return (
    <Surface
      delay={260}
      id="transacoes"
      className="scroll-mt-24"
      aria-labelledby="transacoes-title"
    >
      <SectionTitle
        id="transacoes-title"
        title="Transações"
        subtitle={`${filtered.length} transações · ${allGroups.length} dias com movimentações · BRL`}
        action={
          <div
            role="group"
            aria-label="Filtrar transações"
            className="flex rounded-full border bg-surface-elev p-1"
          >
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => {
                  setFilter(item.id)
                  setVisibleDays(10)
                }}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filter === item.id
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-text-muted hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Nada por aqui"
          description="Nenhuma transação encontrada com esse filtro. Tente outro filtro."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section
              key={group.date}
              aria-label={formatDayHeading(group.date, data.asOf)}
            >
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
                {formatDayHeading(group.date, data.asOf)}
              </h3>

              <ul className="divide-y">
                {group.items.map((transaction) => {
                  const out = isOutflow(transaction)

                  return (
                    <li
                      key={transaction.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <CategoryIcon id={transaction.category} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {transaction.merchant}
                          </p>

                          {transaction.pending && (
                            <Badge tone="warning">Pendente</Badge>
                          )}
                        </div>

                        <p className="truncate text-xs text-text-muted">
                          {accountName(transaction.accountId)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            out ? 'text-outflow' : 'text-inflow',
                          )}
                        >
                          <span className="sr-only">
                            {out ? 'Saída de ' : 'Entrada de '}
                          </span>

                          <span aria-hidden="true">
                            {out ? '− ' : '+ '}
                          </span>

                          {formatBRL(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {groups.length < allGroups.length && (
            <button
              type="button"
              onClick={() => setVisibleDays((current) => current + 10)}
              className="w-full rounded-xl border px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-elev hover:text-foreground"
            >
              Mostrar mais 10 dias ({allGroups.length - groups.length} restantes)
            </button>
          )}
        </div>
      )}
    </Surface>
  )
}
import { PieChart } from 'lucide-react'
import { CategoryIcon } from '@/components/finance/category-icon'
import { Donut } from '@/components/finance/donut'
import { EmptyState } from '@/components/finance/empty-state'
import { SectionTitle, Surface } from '@/components/finance/surface'
import {
  latestTransactionDate,
  monthKey,
  spendingByCategoryAndCurrency,
} from '@/lib/finance'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { SandboxSnapshot } from '@/lib/types'

export function CategorySpending({ data }: { data: SandboxSnapshot }) {
  const key = monthKey(latestTransactionDate(data.transactions, data.asOf))
  const slices = spendingByCategoryAndCurrency(data.transactions, key)
  const currencyKeys = [...new Set(slices.map((item) => item.currency ?? ''))]

  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}-01T00:00:00Z`))

  return (
    <Surface delay={200} aria-labelledby="categorias-title">
      <SectionTitle
        id="categorias-title"
        title="Gastos por categoria"
        subtitle={`${monthLabel} · despesas de consumo`}
      />

      {slices.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Nenhum gasto ainda"
          description="Quando houver saídas neste mês, elas aparecem aqui por categoria."
        />
      ) : (
        <div className="space-y-6">
          {currencyKeys.map((currencyKey) => {
            const currencySlices = slices.filter((item) => (item.currency ?? '') === currencyKey)
            const currency = currencySlices[0]?.currency ?? null
            const total = currencySlices.reduce((sum, item) => sum + item.value, 0)
            return <div key={currencyKey || 'unknown'} className="grid items-center gap-6 border-t pt-5 first:border-0 first:pt-0 sm:grid-cols-[auto_1fr]">
          <Donut
            slices={currencySlices}
            size={196}
            label="Gráfico de rosca das despesas de consumo por categoria"
          >
            <span className="text-xs font-medium text-text-muted">
              Consumo total
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatCurrency(total, currency)}
            </span>
          </Donut>

          <div className="min-w-0">
            <ul className="space-y-2.5">
              {currencySlices.map((slice) => (
                <li
                  key={slice.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <CategoryIcon id={slice.id} size="sm" />

                  <span
                    className={
                      slice.nonConsumption
                        ? 'flex-1 truncate text-text-muted'
                        : 'flex-1 truncate'
                    }
                  >
                    {slice.label}
                    {slice.nonConsumption && (
                      <span aria-label="não é consumo">*</span>
                    )}
                  </span>

                  <span className="text-xs text-text-muted tabular-nums">
                    {formatPercent(slice.percent)}
                  </span>

                  <span className="w-24 text-right font-semibold tabular-nums">
                    {formatCurrency(slice.value, slice.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t pt-3 text-xs text-text-muted">
              Transferências e pagamentos de dívida são excluídos do consumo.
            </p>
          </div>
            </div>
          })}
        </div>
      )}
    </Surface>
  )
}

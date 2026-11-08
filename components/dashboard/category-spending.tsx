import { PieChart } from 'lucide-react'
import { CategoryIcon } from '@/components/finance/category-icon'
import { Donut } from '@/components/finance/donut'
import { EmptyState } from '@/components/finance/empty-state'
import { SectionTitle, Surface } from '@/components/finance/surface'
import {
  consumptionTotal,
  latestTransactionDate,
  monthKey,
  spendingByCategory,
} from '@/lib/finance'
import { formatBRL, formatPercent } from '@/lib/format'
import type { SandboxSnapshot } from '@/lib/types'

export function CategorySpending({ data }: { data: SandboxSnapshot }) {
  const key = monthKey(latestTransactionDate(data.transactions, data.asOf))
  const slices = spendingByCategory(data.transactions, key)
  const total = slices.reduce((sum, item) => sum + item.value, 0)
  const consumption = consumptionTotal(data.transactions, key)

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
        subtitle={`${monthLabel} · todas as saídas`}
      />

      {slices.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Nenhum gasto ainda"
          description="Quando houver saídas neste mês, elas aparecem aqui por categoria."
        />
      ) : (
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <Donut
            slices={slices}
            size={196}
            label="Gráfico de rosca dos gastos por categoria"
          >
            <span className="text-xs font-medium text-text-muted">
              Total de saídas
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatBRL(total)}
            </span>
          </Donut>

          <div className="min-w-0">
            <ul className="space-y-2.5">
              {slices.map((slice) => (
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
                    {formatBRL(slice.value)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
              <span className="text-text-muted">
                * Transferências e pagamento de dívida: não é consumo.
              </span>

              <span className="font-semibold tabular-nums">
                Consumo real:{' '}
                <span className="text-outflow">
                  {formatBRL(consumption)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </Surface>
  )
}
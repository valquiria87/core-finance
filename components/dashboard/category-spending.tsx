import { PieChart } from 'lucide-react'
import { CategoryIcon } from '@/components/finance/category-icon'
import { Donut } from '@/components/finance/donut'
import { EmptyState } from '@/components/finance/empty-state'
import { SectionTitle, Surface } from '@/components/finance/surface'
import { consumptionTotal, monthKey, spendingByCategory } from '@/lib/finance'
import { formatPercent, formatUSD } from '@/lib/format'
import type { SandboxSnapshot } from '@/lib/types'

export function CategorySpending({ data }: { data: SandboxSnapshot }) {
  const key = monthKey(data.asOf)
  const slices = spendingByCategory(data.transactions, key)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const consumption = consumptionTotal(data.transactions, key)

  return (
    <Surface delay={200} aria-labelledby="categorias-title">
      <SectionTitle id="categorias-title" title="Gastos por categoria" subtitle="Maio · todas as saídas" />
      {slices.length === 0 ? (
        <EmptyState icon={PieChart} title="Nenhum gasto ainda" description="Quando houver saídas neste mês, elas aparecem aqui por categoria." />
      ) : (
        <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <Donut slices={slices} size={196} label="Gráfico de rosca dos gastos por categoria">
            <span className="text-xs font-medium text-text-muted">Total de saídas</span>
            <span className="text-lg font-bold tabular-nums">{formatUSD(total)}</span>
          </Donut>
          <div className="min-w-0">
            <ul className="space-y-2.5">
              {slices.map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <CategoryIcon id={s.id} size="sm" />
                  <span className={s.nonConsumption ? 'flex-1 truncate text-text-muted' : 'flex-1 truncate'}>
                    {s.label}
                    {s.nonConsumption && <span aria-label="não é consumo">*</span>}
                  </span>
                  <span className="text-xs text-text-muted tabular-nums">{formatPercent(s.percent)}</span>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatUSD(s.value)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
              <span className="text-text-muted">* Transferências e pagamento de dívida: não é consumo.</span>
              <span className="font-semibold tabular-nums">
                Consumo real: <span className="text-outflow">{formatUSD(consumption)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </Surface>
  )
}

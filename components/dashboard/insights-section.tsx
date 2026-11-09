'use client'

import {
  AlertTriangle,
  CalendarDays,
  Repeat,
  TrendingUp,
} from 'lucide-react'
import { Surface } from '@/components/finance/surface'
import { useInsights } from '@/hooks/use-insights'
import { formatBRL } from '@/lib/format'

export function InsightsSection() {
  const { data, error, isLoading } = useInsights()

  if (isLoading) {
    return (
      <Surface className="p-5">
        <p className="text-sm text-text-muted">
          Carregando inteligência financeira...
        </p>
      </Surface>
    )
  }

  if (error || !data) {
    return (
      <Surface className="p-5">
        <p className="text-sm text-text-muted">
          Não foi possível carregar os indicadores financeiros.
        </p>
      </Surface>
    )
  }

  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(
    new Date(`${data.monthEnd.currentMonth}-01T00:00:00Z`),
  )
  const dataThroughLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${data.dataThrough}T12:00:00`))

  return (
    <section className="space-y-4" aria-labelledby="insights-title">
      <div>
        <h2 id="insights-title" className="text-lg font-bold tracking-tight">
          Inteligência financeira
        </h2>
        <p className="text-sm text-text-muted">
          Período analisado: {monthLabel} · movimentações até {dataThroughLabel}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <TrendingUp className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">
              {data.monthEnd.isClosedMonth ? 'Total do mês' : 'Previsão mensal'}
            </span>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums">
            {formatBRL(
              data.monthEnd.isClosedMonth
                ? data.monthEnd.spentSoFar
                : data.monthEnd.predictedMonthEnd,
            )}
          </p>

          <p className="mt-1 text-xs text-text-muted">
            {data.monthEnd.isClosedMonth
              ? `Total registrado em ${monthLabel}`
              : `Estimativa para ${monthLabel}`}
          </p>
        </Surface>

        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <CalendarDays className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Média diária</span>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums">
            {formatBRL(data.monthEnd.avgDailySpend)}
          </p>

          <p className="mt-1 text-xs text-text-muted">
            Consumo registrado até {dataThroughLabel}: {formatBRL(data.monthEnd.spentSoFar)}
          </p>
        </Surface>

        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <Repeat className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Despesas recorrentes</span>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums">
            {data.subscriptions.length}
          </p>

          {data.subscriptions.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-text-muted">
              {data.subscriptions.slice(0, 6).map((item) => (
                <li key={item.merchant}>
                  {item.merchant} · {formatBRL(item.averageAmount)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-text-muted">
              Nenhuma recorrência identificada
            </p>
          )}
        </Surface>

        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Gastos atípicos</span>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums">
            {data.anomalies.length}
          </p>

          {data.anomalies.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-text-muted">
              {data.anomalies.slice(0, 3).map((item) => (
                <li key={item.id}>
                  {item.merchant} · {formatBRL(item.amount)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-text-muted">
              Nenhum gasto atípico identificado
            </p>
          )}
        </Surface>
      </div>

      <p className="text-xs text-text-muted">
        {data.monthEnd.isClosedMonth
          ? `Mês encerrado. Total de consumo registrado até ${dataThroughLabel}.`
          : `Previsão baseada na média diária até ${dataThroughLabel}, projetada para o fim de ${monthLabel}. Os resultados são estimativas e não garantem despesas futuras.`}
      </p>
    </section>
  )
}
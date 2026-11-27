'use client'

import {
  AlertTriangle,
  CalendarDays,
  Repeat,
  TrendingUp,
} from 'lucide-react'
import { Surface } from '@/components/finance/surface'
import { useInsights } from '@/hooks/use-insights'
import { formatCurrency } from '@/lib/format'

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
  }).format(new Date(`${data.monthEnd[0]?.currentMonth ?? data.dataThrough.slice(0, 7)}-01T00:00:00Z`))
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
          Período analisado: {monthLabel} · movimentações confirmadas até {dataThroughLabel}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <TrendingUp className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Previsão mensal</span>
          </div>
          {data.monthEnd.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xl font-bold tabular-nums">
              {data.monthEnd.map((item) => (
                <li key={item.currency ?? 'unknown'}>
                  {formatCurrency(item.predictedMonthEnd, item.currency)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-text-muted">Sem despesas confirmadas neste mês.</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Estimativa para {monthLabel}, separada por moeda
          </p>
        </Surface>

        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <CalendarDays className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Média diária</span>
          </div>
          {data.monthEnd.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm tabular-nums">
              {data.monthEnd.map((item) => (
                <li key={item.currency ?? 'unknown'}>
                  <span className="font-semibold">{formatCurrency(item.avgDailySpend, item.currency)}/dia</span>
                  <span className="block text-xs text-text-muted">
                    Confirmado: {formatCurrency(item.spentSoFar, item.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-text-muted">Sem despesas confirmadas neste mês.</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Até {dataThroughLabel}
          </p>
        </Surface>

        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <Repeat className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Assinaturas</span>
          </div>
          <p className="mt-3 text-xl font-bold">{data.subscriptions.length}</p>
          {data.subscriptions.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-text-muted">
              {data.subscriptions.slice(0, 5).map((item) => (
                <li key={`${item.currency ?? 'unknown'}-${item.merchant}`}>
                  {item.merchant} · {formatCurrency(item.averageAmount, item.currency)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-text-muted">Nenhuma recorrência identificada</p>
          )}
        </Surface>

        <Surface className="p-4 md:p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <span className="text-sm font-medium">Gastos atípicos</span>
          </div>
          <p className="mt-3 text-xl font-bold">{data.anomalies.length}</p>
          {data.anomalies.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-text-muted">
              {data.anomalies.slice(0, 5).map((item) => (
                <li key={item.id}>
                  {item.merchant} · {formatCurrency(item.amount, item.currency)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-text-muted">Nenhum gasto atípico identificado</p>
          )}
        </Surface>
      </div>

      <p className="text-xs text-text-muted">
        Previsões, recorrências e anomalias são estimativas heurísticas calculadas somente com movimentações confirmadas e agrupadas por moeda; não representam garantias nem despesas futuras observadas.
      </p>
    </section>
  )
}

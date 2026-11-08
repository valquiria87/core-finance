import { Activity } from 'lucide-react'
import { EmptyState } from '@/components/finance/empty-state'
import { SectionTitle, Surface } from '@/components/finance/surface'
import { formatBRL } from '@/lib/format'
import { cumulativeCashFlow, isInflow, isOutflow, latestTransactionDate, monthKey } from '@/lib/finance'
import type { SandboxSnapshot } from '@/lib/types'

export function FlowTrend({ data }: { data: SandboxSnapshot }) {
  const key = monthKey(latestTransactionDate(data.transactions, data.asOf))
  const [year, month] = key.split('-').map(Number)
  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))

  const weeks = [
    { label: '01–07', from: 1, to: 7 },
    { label: '08–14', from: 8, to: 14 },
    { label: '15–21', from: 15, to: 21 },
    { label: '22–31', from: 22, to: 31 },
  ].map((week) => {
    const transactions = data.transactions.filter((transaction) => {
      if (!transaction.date.startsWith(key)) return false
      const day = Number(transaction.date.slice(8, 10))
      return day >= week.from && day <= week.to
    })

    return {
      ...week,
      inflow: transactions.filter(isInflow).reduce((sum, transaction) => sum - transaction.amount, 0),
      outflow: transactions
        .filter((transaction) => isOutflow(transaction) && transaction.category !== 'transfer')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }
  })

  const maxValue = Math.max(1, ...weeks.flatMap((week) => [week.inflow, week.outflow]))
  const hasData = weeks.some((week) => week.inflow > 0 || week.outflow > 0)
  const movement = cumulativeCashFlow(data.transactions)
  const minMovement = Math.min(0, ...movement.map((point) => point.cumulative))
  const maxMovement = Math.max(0, ...movement.map((point) => point.cumulative))
  const movementRange = Math.max(1, maxMovement - minMovement)
  const chartPoints = movement.map((point, index) => {
    const x = movement.length <= 1 ? 300 : 12 + (index / (movement.length - 1)) * 576
    const y = 12 + ((maxMovement - point.cumulative) / movementRange) * 116
    return `${x},${y}`
  }).join(' ')
  const firstMovementDate = movement[0]?.date
  const lastMovementDate = movement[movement.length - 1]?.date
  const formatShortDate = (date: string) => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))

  return (
    <Surface delay={180} aria-labelledby="flow-trend-title">
      <SectionTitle
        id="flow-trend-title"
        title="Evolução de entradas e saídas"
        subtitle={`Movimentações por semana · ${monthLabel}`}
      />

      {!hasData ? (
        <EmptyState
          icon={Activity}
          title="Sem movimentações neste período"
          description="O gráfico será preenchido quando houver entradas ou saídas registradas."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-xs text-text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-inflow" />
              Entradas
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-outflow" />
              Saídas
            </span>
          </div>

          <div className="space-y-4">
            {weeks.map((week) => (
              <div key={week.label} className="space-y-2">
                <p className="text-xs font-semibold text-text-muted">Dias {week.label}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-[11px] text-text-muted">Entradas</span>
                    <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-elev">
                      <div
                        className="h-full rounded-full bg-inflow"
                        style={{ width: `${(week.inflow / maxValue) * 100}%` }}
                        role="img"
                        aria-label={`Entradas: ${formatBRL(week.inflow)}`}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">
                      {formatBRL(week.inflow)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-[11px] text-text-muted">Saídas</span>
                    <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-elev">
                      <div
                        className="h-full rounded-full bg-outflow"
                        style={{ width: `${(week.outflow / maxValue) * 100}%` }}
                        role="img"
                        aria-label={`Saídas: ${formatBRL(week.outflow)}`}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums">
                      {formatBRL(week.outflow)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="border-t pt-3 text-xs text-text-muted">
            Valores calculados a partir das transações disponíveis. Transferências internas não entram nas saídas.
          </p>
        </div>
      )}

      {movement.length >= 2 && (
        <div className="mt-6 border-t pt-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Movimentação líquida acumulada</h3>
              <p className="mt-1 text-xs text-text-muted">
                Entradas menos saídas desde a primeira transação disponível, incluindo transferências e pagamentos registrados
              </p>
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatBRL(movement[movement.length - 1].cumulative)}
            </p>
          </div>
          <svg
            viewBox="0 0 600 140"
            className="h-36 w-full overflow-visible"
            role="img"
            aria-label={`Movimentação líquida acumulada: ${formatBRL(movement[movement.length - 1].cumulative)} entre ${formatShortDate(firstMovementDate!)} e ${formatShortDate(lastMovementDate!)}. Não representa saldo bancário.`}
          >
            <line
              x1="12"
              x2="588"
              y1={12 + (maxMovement / movementRange) * 116}
              y2={12 + (maxMovement / movementRange) * 116}
              className="stroke-border"
              strokeDasharray="4 4"
            />
            <polyline
              points={chartPoints}
              fill="none"
              className="stroke-coral"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {movement.length > 0 && (
              <circle
                cx={movement.length <= 1 ? 300 : 588}
                cy={12 + ((maxMovement - movement[movement.length - 1].cumulative) / movementRange) * 116}
                r="4"
                className="fill-coral"
              />
            )}
          </svg>
          <div className="flex justify-between text-[11px] text-text-muted">
            <span>{formatShortDate(firstMovementDate!)}</span>
            <span>{formatShortDate(lastMovementDate!)}</span>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Indicador calculado pelas transações disponíveis; não é histórico de saldo, não considera saldos iniciais nem movimentações ausentes.
          </p>
        </div>
      )}
    </Surface>
  )
}

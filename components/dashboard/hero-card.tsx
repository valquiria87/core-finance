import { ArrowUpRight, CreditCard, Landmark } from 'lucide-react'
import { CountUp } from '@/components/finance/count-up'
import { Sparkline } from '@/components/finance/sparkline'
import { accountTotals, variation } from '@/lib/finance'
import { formatPercent } from '@/lib/format'
import type { SandboxSnapshot } from '@/lib/types'

export function HeroCard({ data }: { data: SandboxSnapshot }) {
  const { cash, debt } = accountTotals(data.accounts)
  const credit = data.accounts.filter((a) => a.type === 'credit')
  const history = data.balanceHistory
  const change = variation(history[history.length - 1], history[0])

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <section
        aria-labelledby="hero-cash"
        className="animate-fade-up relative overflow-hidden rounded-3xl border p-6 md:p-8"
        style={{
          background:
            'radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, var(--coral) 16%, var(--surface)) 0%, var(--surface) 45%, color-mix(in oklab, var(--inflow) 8%, var(--surface)) 100%)',
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-text-muted">
          <Landmark className="size-4" aria-hidden="true" />
          <h2 id="hero-cash">Dinheiro em contas</h2>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl md:text-5xl">
              <CountUp value={cash} />
            </p>
            {change != null && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-inflow/10 px-2.5 py-1 text-xs font-semibold text-inflow tabular-nums">
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                {formatPercent(change)} nos últimos 12 dias
              </p>
            )}
          </div>
          <Sparkline data={history} width={160} height={56} label="Evolução do saldo em contas nos últimos 12 dias, em alta" />
        </div>
        <p className="mt-6 text-xs text-text-muted">
          Soma de conta corrente e poupança. Faturas de cartão ficam separadas ao lado.
        </p>
      </section>

      <section
        aria-labelledby="hero-debt"
        className="animate-fade-up flex flex-col rounded-3xl border border-coral/30 bg-coral/[0.07] p-6 md:p-8"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-coral">
          <CreditCard className="size-4" aria-hidden="true" />
          <h2 id="hero-debt">Dívidas</h2>
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight text-coral tabular-nums md:text-4xl">
          <CountUp value={debt} />
        </p>
        <p className="mt-1 text-xs font-medium text-text-muted">Fatura em aberto / valor devido</p>
        <ul className="mt-auto space-y-2 pt-6">
          {credit.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-text-muted">
                {a.name} ••{a.mask}
              </span>
              <span className="font-semibold tabular-nums">
                {a.current == null ? (
                  <span className="text-text-muted">Não informado</span>
                ) : (
                  <CountUp value={a.current} />
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

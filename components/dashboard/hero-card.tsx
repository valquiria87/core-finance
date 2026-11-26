import { ArrowUpRight, ChartLine, CreditCard, Landmark } from 'lucide-react'
import { CountUp } from '@/components/finance/count-up'
import { Sparkline } from '@/components/finance/sparkline'
import { accountTotalsByCurrency, variation } from '@/lib/finance'
import { formatCurrency } from '@/lib/format'
import { formatPercent } from '@/lib/format'
import type { SandboxSnapshot } from '@/lib/types'

export function HeroCard({ data }: { data: SandboxSnapshot }) {
  const { cash, debt, investments } = accountTotalsByCurrency(data.accounts)
  const debtAccounts = data.accounts.filter((a) => a.type === 'credit' || a.type === 'loan')
  const investmentAccounts = data.accounts.filter((a) => a.type === 'investment')
  const history = data.balanceHistory

  const hasHistory = history.length >= 2
  const change = hasHistory
    ? variation(history[history.length - 1], history[0])
    : null

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr] [&>*]:min-w-0">
      <section
        aria-labelledby="hero-cash"
        className="animate-fade-up relative w-full min-w-0 max-w-full overflow-hidden rounded-3xl border p-4 sm:p-6 md:col-span-2 md:p-8 xl:col-span-1"
        style={{
          background:
            'radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, var(--coral) 16%, var(--surface)) 0%, var(--surface) 45%, color-mix(in oklab, var(--inflow) 8%, var(--surface)) 100%)',
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-text-muted">
          <Landmark className="size-4" aria-hidden="true" />
          <h2 id="hero-cash">Dinheiro em contas</h2>
        </div>

        <div className="mt-4 flex min-w-0 flex-col items-start gap-3">
          <div className="min-w-0">
            <p className="w-full whitespace-nowrap text-[clamp(1.35rem,3vw,2.75rem)] font-extrabold tracking-tight tabular-nums">
              {cash.length === 1 ? <CountUp value={cash[0].amount} currency={cash[0].currency} /> : cash.length ? <span className="space-y-1">{cash.map((item) => <span key={item.currency ?? 'unknown'} className="block whitespace-nowrap text-xl sm:text-2xl">{formatCurrency(item.amount, item.currency)}</span>)}</span> : '—'}
            </p>

            {change != null && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-inflow/10 px-2.5 py-1 text-xs font-semibold text-inflow tabular-nums">
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                {formatPercent(change)} nos últimos 12 dias
              </p>
            )}
          </div>

          {hasHistory ? (
            <Sparkline
              data={history}
              width={160}
              height={56}
              label="Evolução do saldo em contas"
            />
          ) : (
            <div className="w-full min-w-0 max-w-none text-left text-xs text-text-muted">
              <p>Histórico de saldo não fornecido pela instituição.</p>
              <a
                href="#flow-trend-title"
                className="mt-2 inline-block font-semibold text-coral underline-offset-4 hover:underline"
              >
                Ver movimentação acumulada
              </a>
            </div>
          )}
        </div>

        <p className="mt-4 break-words text-xs text-text-muted">
          Soma apenas de contas de depósito (corrente e poupança). Dívidas e investimentos ficam separados.
        </p>
      </section>

      <section
        aria-labelledby="hero-debt"
        className="animate-fade-up flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-3xl border border-coral/30 bg-coral/[0.07] p-4 sm:p-6 md:p-8"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-coral">
          <CreditCard className="size-4" aria-hidden="true" />
          <h2 id="hero-debt">Dívidas</h2>
        </div>

        <p className="mt-4 whitespace-nowrap text-2xl font-bold tracking-tight text-coral tabular-nums sm:text-3xl xl:text-3xl 2xl:text-4xl">
          {debt.length === 1 ? <CountUp value={debt[0].amount} currency={debt[0].currency} /> : debt.length ? <span className="space-y-1">{debt.map((item) => <span key={item.currency ?? 'unknown'} className="block whitespace-nowrap text-xl sm:text-2xl">{formatCurrency(item.amount, item.currency)}</span>)}</span> : '—'}
        </p>

        <p className="mt-1 text-xs font-medium text-text-muted">
          Faturas de cartão e saldos de empréstimos
        </p>

        <ul className="mt-auto space-y-2 pt-6">
          {debtAccounts.map((account) => (
            <li
              key={account.id}
              className="flex min-w-0 items-start justify-between gap-2 text-xs sm:text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-text-muted">
                {account.type === 'loan' ? 'Empréstimo · ' : 'Cartão · '}{account.name} ••{account.mask}
              </span>

              <span className="max-w-[45%] shrink-0 break-words text-right font-semibold tabular-nums">
                {account.current == null ? (
                  <span className="text-text-muted">Não informado</span>
                ) : (
                  <CountUp value={account.current} currency={account.currency} />
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="hero-investments"
        className="animate-fade-up flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-3xl border border-inflow/30 bg-inflow/[0.06] p-4 sm:p-6 md:p-8"
        style={{ animationDelay: '160ms' }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-text-muted">
          <ChartLine className="size-4" aria-hidden="true" />
          <h2 id="hero-investments">Investimentos</h2>
        </div>

        <p className="mt-4 whitespace-nowrap text-2xl font-bold tracking-tight tabular-nums sm:text-3xl xl:text-3xl 2xl:text-4xl">
          {investments.length === 1 ? <CountUp value={investments[0].amount} currency={investments[0].currency} /> : investments.length ? <span className="space-y-1">{investments.map((item) => <span key={item.currency ?? 'unknown'} className="block whitespace-nowrap text-xl sm:text-2xl">{formatCurrency(item.amount, item.currency)}</span>)}</span> : '—'}
        </p>

        <p className="mt-1 text-xs font-medium text-text-muted">
          Patrimônio investido, apresentado separadamente do dinheiro disponível.
        </p>

        <ul className="mt-auto space-y-2 pt-6">
          {investmentAccounts.map((account) => (
            <li key={account.id} className="flex min-w-0 items-start justify-between gap-2 text-xs sm:text-sm">
              <span className="min-w-0 flex-1 truncate text-text-muted">{account.name}</span>
              <span className="max-w-[45%] shrink-0 break-words text-right font-semibold tabular-nums">
                {account.current == null ? 'Não informado' : <CountUp value={account.current} currency={account.currency} />}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

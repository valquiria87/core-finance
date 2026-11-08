import { Nfc } from 'lucide-react'
import { SectionTitle } from '@/components/finance/surface'
import { formatBRL, formatPercent } from '@/lib/format'
import type { Account } from '@/lib/types'
import { cn } from '@/lib/utils'

function Missing() {
  return <span className="font-medium text-text-muted">Não informado</span>
}

function DepositCard({ account, delay }: { account: Account; delay: number }) {
  const isSavings = account.type === 'savings'

  return (
    <article
      className="animate-fade-up group relative flex min-h-48 min-w-0 flex-col justify-between overflow-hidden rounded-3xl p-5 text-white shadow-[0_12px_32px_-16px_rgb(0_0_0/0.6)] transition-transform duration-200 hover:-translate-y-1"
      style={{
        animationDelay: `${delay}ms`,
        background: isSavings
          ? 'linear-gradient(135deg, #0f4c4a 0%, #0b2e33 55%, #0a1f26 100%)'
          : 'linear-gradient(135deg, #17384a 0%, #0f2733 50%, #ff6b55 220%)',
      }}
      aria-label={`${account.name}, final ${account.mask}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/[0.06]"
      />

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/70">
            {isSavings ? 'Poupança' : 'Conta corrente'}
          </p>
          <p className="truncate font-semibold" title={account.name}>{account.name}</p>
        </div>

        <Nfc className="size-5 text-white/70" aria-hidden="true" />
      </div>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 to-amber-500/80"
        />

        <p className="font-mono text-sm tracking-[0.2em] text-white/85">
          <span aria-hidden="true">•••• •••• •••• </span>
          <span className="sr-only">Final </span>
          {account.mask}
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/70">Saldo atual</p>
          <p className="break-words text-xl font-bold leading-tight tabular-nums">
            {account.current == null
              ? 'Não informado'
              : formatBRL(account.current)}
          </p>
        </div>

        <div className="min-w-0 text-right">
          <p className="text-xs text-white/70">Disponível</p>
          <p
            className={cn(
              'text-sm font-semibold tabular-nums',
              account.available == null && 'text-white/60',
            )}
          >
            {account.available == null
              ? 'Não informado'
              : formatBRL(account.available)}
          </p>
        </div>
      </div>
    </article>
  )
}

function CreditCardTile({ account, delay }: { account: Account; delay: number }) {
  const usage =
    account.limit != null &&
    account.limit > 0 &&
    account.current != null
      ? (account.current / account.limit) * 100
      : null

  return (
    <article
      className="animate-fade-up flex min-h-48 min-w-0 flex-col rounded-3xl border bg-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-coral/40"
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${account.name}, final ${account.mask}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-muted">
            Cartão de crédito
          </p>
          <p className="truncate font-semibold">{account.name}</p>
        </div>

        <span className="shrink-0 font-mono text-xs tracking-widest text-text-muted">
          ••{account.mask}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-text-muted">
          Fatura em aberto / valor devido
        </p>

        <p className="break-words text-xl font-bold leading-tight text-coral tabular-nums sm:text-2xl">
          {account.current == null
            ? <Missing />
            : formatBRL(account.current)}
        </p>
      </div>

      <div className="mt-auto pt-5">
        {usage != null ? (
          <>
            <div
              role="progressbar"
              aria-label="Uso do limite"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usage)}
              className="h-2 overflow-hidden rounded-full bg-surface-elev"
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-700',
                  usage > 80 ? 'bg-coral' : 'bg-amber-400',
                )}
                style={{ width: `${Math.min(100, Math.max(0, usage))}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between gap-2 text-xs text-text-muted tabular-nums">
              <span>{formatPercent(usage)} do limite usado</span>

              <span className="text-right">
                Limite {formatBRL(account.limit!)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-text-muted">Limite</span>
            <Missing />
          </div>
        )}
      </div>
    </article>
  )
}

export function AccountsSection({ accounts }: { accounts: Account[] }) {
  return (
    <section
      aria-labelledby="contas-title"
      id="contas"
      className="scroll-mt-24"
    >
      <SectionTitle
        id="contas-title"
        title="Contas"
        subtitle={`${accounts.length} contas conectadas · Pluggy Sandbox · valores em reais`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((account, index) =>
          account.type === 'credit' ? (
            <CreditCardTile
              key={account.id}
              account={account}
              delay={index * 60}
            />
          ) : (
            <DepositCard
              key={account.id}
              account={account}
              delay={index * 60}
            />
          ),
        )}
      </div>
    </section>
  )
}
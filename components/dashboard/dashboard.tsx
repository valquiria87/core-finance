'use client'

import { CloudOff } from 'lucide-react'
import { EmptyState } from '@/components/finance/empty-state'
import { useSandbox } from '@/hooks/use-sandbox'
import { AccountsSection } from './accounts-section'
import { CategorySpending } from './category-spending'
import { DashboardSkeleton } from './dashboard-skeleton'
import { FlowCards } from './flow-cards'
import { HeroCard } from './hero-card'
import { TransactionsList } from './transactions-list'

export function Dashboard() {
  const { data, error, isLoading, mutate } = useSandbox()

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) {
    return (
      <EmptyState
        icon={CloudOff}
        title="Não consegui carregar seus dados"
        description="A sandbox não respondeu. Verifique sua conexão e tente de novo em alguns segundos."
        action={
          <button
            type="button"
            onClick={() => mutate()}
            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-ink hover:opacity-90"
          >
            Tentar novamente
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div id="inicio" className="scroll-mt-24">
        <HeroCard data={data} />
      </div>
      <AccountsSection accounts={data.accounts} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4 md:space-y-6">
          <FlowCards data={data} />
          <CategorySpending data={data} />
        </div>
        <TransactionsList data={data} />
      </div>
    </div>
  )
}

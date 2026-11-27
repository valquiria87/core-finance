'use client'

import useSWR from 'swr'
import type { CategoryId } from '@/lib/types'

export interface InsightsData {
  mode: 'sandbox' | 'live'
  asOf: string
  dataThrough: string
  subscriptions: {
    currency: string | null
    merchant: string
    occurrences: number
    averageAmount: number
    std: number
  }[]
  anomalies: {
    currency: string | null
    id: string
    merchant: string
    category: CategoryId
    amount: number
    zscore: number
  }[]
  monthEnd: {
    currency: string | null
    currentMonth: string
    spentSoFar: number
    avgDailySpend: number
    remainingDays: number
    predictedMonthEnd: number
  }[]
}

const fetcher = async (url: string): Promise<InsightsData> => {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Falha ao carregar os indicadores financeiros')
  }

  return res.json()
}

export function useInsights() {
  return useSWR<InsightsData>('/api/insights', fetcher, {
    revalidateOnFocus: false,
  })
}

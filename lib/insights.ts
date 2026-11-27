import type { Transaction } from './types'

export interface CurrencyInsight {
  currency: string | null
}

export interface SubscriptionInsight extends CurrencyInsight {
  merchant: string
  occurrences: number
  averageAmount: number
  std: number
}

export interface AnomalyInsight extends CurrencyInsight {
  id: string
  merchant: string
  category: Transaction['category']
  amount: number
  zscore: number
}

export interface MonthEndInsight extends CurrencyInsight {
  currentMonth: string
  spentSoFar: number
  avgDailySpend: number
  remainingDays: number
  predictedMonthEnd: number
}

function isEligibleExpense(t: Transaction) {
  return (
    !t.pending &&
    t.amount > 0 &&
    t.category !== 'transfer' &&
    t.category !== 'debt'
  )
}

function currencyKey(currency?: string | null) {
  return currency ?? ''
}

export function detectSubscriptions(
  transactions: Transaction[],
  minOccurrences = 3,
): SubscriptionInsight[] {
  const byMerchant = new Map<string, Transaction[]>()

  for (const t of transactions) {
    if (!isEligibleExpense(t)) continue

    const key = `${currencyKey(t.currency)}::${t.merchant}`
    const items = byMerchant.get(key) ?? []
    items.push(t)
    byMerchant.set(key, items)
  }

  const subscriptions: SubscriptionInsight[] = []

  for (const items of byMerchant.values()) {
    if (items.length < minOccurrences) continue

    const amounts = items.map((item) => item.amount)
    const average =
      amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const variance =
      amounts.reduce((sum, amount) => sum + (amount - average) ** 2, 0) /
      amounts.length
    const std = Math.sqrt(variance)

    if (average > 0 && std / average < 0.1) {
      subscriptions.push({
        merchant: items[0].merchant,
        currency: items[0].currency ?? null,
        occurrences: items.length,
        averageAmount: Number(average.toFixed(2)),
        std: Number(std.toFixed(2)),
      })
    }
  }

  return subscriptions.sort(
    (a, b) =>
      (a.currency ?? '').localeCompare(b.currency ?? '') ||
      b.averageAmount - a.averageAmount,
  )
}

export function detectAnomalies(transactions: Transaction[]): AnomalyInsight[] {
  const byCategory = new Map<string, number[]>()

  for (const t of transactions) {
    if (!isEligibleExpense(t)) continue

    const key = `${currencyKey(t.currency)}::${t.category}`
    const amounts = byCategory.get(key) ?? []
    amounts.push(t.amount)
    byCategory.set(key, amounts)
  }

  const stats = new Map<string, { average: number; std: number }>()
  for (const [key, amounts] of byCategory) {
    const average =
      amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const variance =
      amounts.reduce((sum, amount) => sum + (amount - average) ** 2, 0) /
      amounts.length
    stats.set(key, { average, std: Math.sqrt(variance) })
  }

  return transactions
    .filter(isEligibleExpense)
    .flatMap((t) => {
      const key = `${currencyKey(t.currency)}::${t.category}`
      const stat = stats.get(key)
      if (!stat || stat.std === 0) return []

      const difference = t.amount - stat.average
      if (Math.abs(difference) <= 2 * stat.std) return []

      return [{
        id: t.id,
        merchant: t.merchant,
        category: t.category,
        currency: t.currency ?? null,
        amount: t.amount,
        zscore: Number((difference / stat.std).toFixed(2)),
      }]
    })
}

export function predictMonthEnd(
  transactions: Transaction[],
  today = new Date(),
): MonthEndInsight[] {
  const currentMonth = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
  ].join('-')

  const monthTransactions = transactions.filter(
    (t) => t.date.startsWith(currentMonth) && isEligibleExpense(t),
  )
  const byCurrency = new Map<string, Transaction[]>()

  for (const transaction of monthTransactions) {
    const key = currencyKey(transaction.currency)
    const items = byCurrency.get(key) ?? []
    items.push(transaction)
    byCurrency.set(key, items)
  }

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate()
  const dayOfMonth = today.getDate()
  const remainingDays = Math.max(0, daysInMonth - dayOfMonth)

  return [...byCurrency.entries()].map(([currency, items]) => {
    const spent = items.reduce((sum, transaction) => sum + transaction.amount, 0)
    const averageDaily = dayOfMonth > 0 ? spent / dayOfMonth : 0

    return {
      currency: currency || null,
      currentMonth,
      spentSoFar: Number(spent.toFixed(2)),
      avgDailySpend: Number(averageDaily.toFixed(2)),
      remainingDays,
      predictedMonthEnd: Number(
        (spent + averageDaily * remainingDays).toFixed(2),
      ),
    }
  }).sort((a, b) => (a.currency ?? '').localeCompare(b.currency ?? ''))
}


import type { Transaction } from './types'

function isEligibleExpense(t: Transaction) {
  return (
    t.amount > 0 &&
    t.category !== 'transfer' &&
    t.category !== 'debt'
  )
}

export function detectSubscriptions(
  transactions: Transaction[],
  minOccurrences = 3,
) {
  const byMerchant = new Map<string, Transaction[]>()

  for (const t of transactions) {
    if (!isEligibleExpense(t)) continue

    const items = byMerchant.get(t.merchant) ?? []
    items.push(t)
    byMerchant.set(t.merchant, items)
  }

  const subscriptions = []

  for (const [merchant, items] of byMerchant) {
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
        merchant,
        occurrences: items.length,
        averageAmount: Number(average.toFixed(2)),
        std: Number(std.toFixed(2)),
      })
    }
  }

  return subscriptions.sort(
    (a, b) => b.averageAmount - a.averageAmount,
  )
}

export function detectAnomalies(transactions: Transaction[]) {
  const byCategory = new Map<string, number[]>()

  for (const t of transactions) {
    if (!isEligibleExpense(t)) continue

    const amounts = byCategory.get(t.category) ?? []
    amounts.push(t.amount)
    byCategory.set(t.category, amounts)
  }

  const stats = new Map<string, { average: number; std: number }>()

  for (const [category, amounts] of byCategory) {
    const average =
      amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length

    const variance =
      amounts.reduce((sum, amount) => sum + (amount - average) ** 2, 0) /
      amounts.length

    stats.set(category, { average, std: Math.sqrt(variance) })
  }

  return transactions
    .filter(isEligibleExpense)
    .flatMap((t) => {
      const stat = stats.get(t.category)

      if (!stat || stat.std === 0) return []

      const difference = t.amount - stat.average

      if (Math.abs(difference) <= 2 * stat.std) return []

      return [{
        id: t.id,
        merchant: t.merchant,
        category: t.category,
        amount: t.amount,
        zscore: Number((difference / stat.std).toFixed(2)),
      }]
    })
}

export function predictMonthEnd(
  transactions: Transaction[],
  today = new Date(),
) {
  const currentMonth = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
  ].join('-')

  const monthTransactions = transactions.filter(
    (t) => t.date.startsWith(currentMonth) && isEligibleExpense(t),
  )

  const spent = monthTransactions.reduce((sum, t) => sum + t.amount, 0)

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate()

  const dayOfMonth = today.getDate()
  const remainingDays = Math.max(0, daysInMonth - dayOfMonth)
  const averageDaily = dayOfMonth > 0 ? spent / dayOfMonth : 0

  return {
    currentMonth,
    spentSoFar: Number(spent.toFixed(2)),
    avgDailySpend: Number(averageDaily.toFixed(2)),
    remainingDays,
    predictedMonthEnd: Number(
      (spent + averageDaily * remainingDays).toFixed(2),
    ),
  }
}

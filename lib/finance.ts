import { CATEGORIES } from './categories'
import type { Account, CategoryId, Transaction } from './types'

export const isOutflow = (t: Transaction) => t.amount > 0
export const isInflow = (t: Transaction) => t.amount < 0

export function monthKey(iso: string) {
  return iso.slice(0, 7)
}

/** Usa o mês da movimentação mais recente, evitando painéis vazios quando a sandbox está defasada. */
export function latestTransactionDate(txs: Transaction[], fallbackDate: string) {
  const latest = txs.filter((transaction) => !transaction.pending).reduce(
    (date, transaction) =>
      !date || transaction.date > date ? transaction.date : date,
    '',
  )
  return latest || fallbackDate
}

export function previousMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 1))
  return d.toISOString().slice(0, 7)
}

export function inMonth(txs: Transaction[], key: string) {
  return txs.filter((t) => monthKey(t.date) === key)
}

export function accountTotals(accounts: Account[]) {
  const deposits = accounts.filter((a) => a.type === 'checking' || a.type === 'savings')
  const debts = accounts.filter((a) => a.type === 'credit' || a.type === 'loan')
  const investments = accounts.filter((a) => a.type === 'investment')
  return {
    cash: deposits.reduce((s, a) => s + (a.current ?? 0), 0),
    debt: debts.reduce((s, a) => s + (a.current ?? 0), 0),
    investments: investments.reduce((s, a) => s + (a.current ?? 0), 0),
  }
}

export function totalsByCurrency(items: { currency?: string | null; amount: number }[]) {
  const totals = new Map<string, number>()
  for (const item of items) {
    const currency = item.currency ?? ''
    totals.set(currency, (totals.get(currency) ?? 0) + item.amount)
  }
  return [...totals].map(([currency, amount]) => ({
    currency: currency || null,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
  }))
}

export function accountTotalsByCurrency(accounts: Account[]) {
  return {
    cash: totalsByCurrency(accounts.filter((a) => (a.type === 'checking' || a.type === 'savings') && a.current != null).map((a) => ({ currency: a.currency, amount: a.current! }))),
    debt: totalsByCurrency(accounts.filter((a) => (a.type === 'credit' || a.type === 'loan') && a.current != null).map((a) => ({ currency: a.currency, amount: a.current! }))),
    investments: totalsByCurrency(accounts.filter((a) => a.type === 'investment' && a.current != null).map((a) => ({ currency: a.currency, amount: a.current! }))),
  }
}

export function periodFlowsByCurrency(txs: Transaction[], key: string) {
  const list = inMonth(txs, key).filter((t) => !t.pending && !CATEGORIES[t.category].nonConsumption)
  const inflow = totalsByCurrency(list.filter(isInflow).map((t) => ({ currency: t.currency, amount: -t.amount })))
  const outflow = totalsByCurrency(list.filter(isOutflow).map((t) => ({ currency: t.currency, amount: t.amount })))
  return { inflow, outflow }
}

/** Entradas e saídas externas do mês; transferências e pagamentos de dívida são excluídos para evitar dupla contagem. */
export function periodFlows(txs: Transaction[], key: string) {
  const list = inMonth(txs, key).filter((t) => !t.pending && !CATEGORIES[t.category].nonConsumption)
  const inflow = list.filter(isInflow).reduce((s, t) => s - t.amount, 0)
  const outflow = list.filter(isOutflow).reduce((s, t) => s + t.amount, 0)
  return { inflow, outflow }
}

export function variation(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/** Movimentação líquida acumulada desde a primeira data disponível; não representa saldo bancário. */
export function cumulativeCashFlow(txs: Transaction[]) {
  const daily = new Map<string, number>()
  for (const transaction of txs) {
    if (transaction.pending || CATEGORIES[transaction.category].nonConsumption) continue
    daily.set(
      transaction.date,
      (daily.get(transaction.date) ?? 0) - transaction.amount,
    )
  }

  let cumulative = 0
  return [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, net]) => {
      cumulative += net
      return { date, net, cumulative }
    })
}

export interface CategorySlice {
  id: CategoryId
  label: string
  color: string
  value: number
  percent: number
  nonConsumption: boolean
  currency?: string | null
}

export function spendingByCategoryAndCurrency(txs: Transaction[], key: string): CategorySlice[] {
  const totals = new Map<string, { id: CategoryId; currency: string | null; value: number }>()
  for (const t of inMonth(txs, key)) {
    if (t.pending || !isOutflow(t) || CATEGORIES[t.category].nonConsumption) continue
    const currency = t.currency ?? null
    const mapKey = `${currency ?? ''}:${t.category}`
    const current = totals.get(mapKey)
    totals.set(mapKey, { id: t.category, currency, value: (current?.value ?? 0) + t.amount })
  }
  const currencyTotals = new Map<string, number>()
  for (const item of totals.values()) currencyTotals.set(item.currency ?? '', (currencyTotals.get(item.currency ?? '') ?? 0) + item.value)
  return [...totals.values()].map(({ id, currency, value }) => ({
    id, currency, value, label: CATEGORIES[id].label, color: CATEGORIES[id].color,
    percent: value / (currencyTotals.get(currency ?? '') || 1) * 100,
    nonConsumption: Boolean(CATEGORIES[id].nonConsumption),
  })).sort((a, b) => (a.currency ?? '').localeCompare(b.currency ?? '') || Number(a.nonConsumption) - Number(b.nonConsumption) || b.value - a.value)
}

export function consumptionByCurrency(txs: Transaction[], key: string) {
  return totalsByCurrency(inMonth(txs, key).filter((t) => !t.pending && isOutflow(t) && !CATEGORIES[t.category].nonConsumption).map((t) => ({ currency: t.currency, amount: t.amount })))
}

export function spendingByCategory(txs: Transaction[], key: string): CategorySlice[] {
  const totals = new Map<CategoryId, number>()
  for (const t of inMonth(txs, key)) {
    if (t.pending || !isOutflow(t)) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
  }
  const sum = [...totals.values()].reduce((s, v) => s + v, 0)
  return [...totals.entries()]
    .map(([id, value]) => ({
      id,
      label: CATEGORIES[id].label,
      color: CATEGORIES[id].color,
      value,
      percent: sum ? (value / sum) * 100 : 0,
      nonConsumption: Boolean(CATEGORIES[id].nonConsumption),
    }))
    .sort((a, b) => Number(a.nonConsumption) - Number(b.nonConsumption) || b.value - a.value)
}

export function consumptionTotal(txs: Transaction[], key: string) {
  return inMonth(txs, key)
    .filter((t) => !t.pending && isOutflow(t) && !CATEGORIES[t.category].nonConsumption)
    .reduce((s, t) => s + t.amount, 0)
}

export function spendingByWeek(txs: Transaction[], key: string) {
  const weeks = [
    { label: 'Semana 1 (01–07)', from: 1, to: 7 },
    { label: 'Semana 2 (08–14)', from: 8, to: 14 },
    { label: 'Semana 3 (15–21)', from: 15, to: 21 },
    { label: 'Semana 4 (22–31)', from: 22, to: 31 },
  ]
  const list = inMonth(txs, key).filter((t) => isOutflow(t) && !CATEGORIES[t.category].nonConsumption)
  return weeks
    .map((w) => {
      const items = list.filter((t) => {
        const day = Number(t.date.slice(8, 10))
        return day >= w.from && day <= w.to
      })
      return { label: w.label, count: items.length, value: items.reduce((s, t) => s + t.amount, 0) }
    })
    .filter((w) => w.count > 0)
}

export function spendingByAccount(txs: Transaction[], accounts: Account[], key: string) {
  const list = inMonth(txs, key).filter((t) => isOutflow(t) && !CATEGORIES[t.category].nonConsumption)
  return accounts
    .map((a) => {
      const items = list.filter((t) => t.accountId === a.id)
      return { account: a, count: items.length, value: items.reduce((s, t) => s + t.amount, 0) }
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.value - a.value)
}

export function groupByDay(txs: Transaction[]) {
  const groups = new Map<string, Transaction[]>()
  for (const t of [...txs].sort((a, b) => b.date.localeCompare(a.date))) {
    const list = groups.get(t.date) ?? []
    list.push(t)
    groups.set(t.date, list)
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }))
}

export interface TransactionFilters {
  from?: string
  to?: string
  category?: CategoryId
  merchant?: string
  includePending?: boolean
}

/** Filtra transações por período, categoria e estabelecimento. */
export function filterTransactions(
  txs: Transaction[],
  filters: TransactionFilters = {},
): Transaction[] {
  const merchantQuery = filters.merchant
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  return txs.filter((t) => {
    if (filters.from && t.date < filters.from) return false
    if (filters.to && t.date > filters.to) return false
    if (filters.category && t.category !== filters.category) return false
    if (!filters.includePending && t.pending) return false

    if (merchantQuery) {
      const merchant = t.merchant
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

      if (!merchant.includes(merchantQuery)) return false
    }

    return true
  })
}

/** Soma despesas de consumo, excluindo transferências e pagamentos de dívida. */
export function filteredConsumptionTotal(
  txs: Transaction[],
  filters: TransactionFilters = {},
): number {
  return filterTransactions(txs, filters)
    .filter(
      (t) =>
        isOutflow(t) &&
        !CATEGORIES[t.category].nonConsumption,
    )
    .reduce((total, t) => total + t.amount, 0)
}

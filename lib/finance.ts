import { CATEGORIES } from './categories'
import type { Account, CategoryId, Transaction } from './types'

export const isOutflow = (t: Transaction) => t.amount > 0
export const isInflow = (t: Transaction) => t.amount < 0

export function monthKey(iso: string) {
  return iso.slice(0, 7)
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
  const deposit = accounts.filter((a) => a.type !== 'credit')
  const credit = accounts.filter((a) => a.type === 'credit')
  return {
    cash: deposit.reduce((s, a) => s + (a.current ?? 0), 0),
    debt: credit.reduce((s, a) => s + (a.current ?? 0), 0),
  }
}

/** Entradas e saídas do mês. Transferências internas não contam como saída. */
export function periodFlows(txs: Transaction[], key: string) {
  const list = inMonth(txs, key)
  const inflow = list.filter(isInflow).reduce((s, t) => s - t.amount, 0)
  const outflow = list
    .filter((t) => isOutflow(t) && t.category !== 'transfer')
    .reduce((s, t) => s + t.amount, 0)
  return { inflow, outflow }
}

export function variation(current: number, previous: number) {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

export interface CategorySlice {
  id: CategoryId
  label: string
  color: string
  value: number
  percent: number
  nonConsumption: boolean
}

export function spendingByCategory(txs: Transaction[], key: string): CategorySlice[] {
  const totals = new Map<CategoryId, number>()
  for (const t of inMonth(txs, key)) {
    if (!isOutflow(t)) continue
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
    .filter((t) => isOutflow(t) && !CATEGORIES[t.category].nonConsumption)
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

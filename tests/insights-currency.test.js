const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  })
  module._compile(output, filename)
}

const {
  detectSubscriptions,
  detectAnomalies,
  predictMonthEnd,
} = require('../lib/insights.ts')

const tx = (id, amount, currency, pending = false, category = 'food') => ({
  id,
  date: '2026-11-10',
  merchant: id.startsWith('netflix') ? 'Netflix' : id,
  accountId: 'checking',
  currency,
  category,
  amount,
  pending,
})

test('subscriptions are confirmed-only and grouped independently by currency', () => {
  const transactions = [
    tx('netflix-usd-1', 15, 'USD'),
    tx('netflix-usd-2', 15, 'USD'),
    tx('netflix-usd-3', 15, 'USD'),
    tx('netflix-usd-pending', 15, 'USD', true),
    tx('netflix-eur-1', 20, 'EUR'),
    tx('netflix-eur-2', 20, 'EUR'),
    tx('netflix-eur-3', 20, 'EUR'),
  ]

  assert.deepEqual(
    detectSubscriptions(transactions).map(({ currency, occurrences, averageAmount }) => ({
      currency, occurrences, averageAmount,
    })),
    [
      { currency: 'EUR', occurrences: 3, averageAmount: 20 },
      { currency: 'USD', occurrences: 3, averageAmount: 15 },
    ],
  )
})

test('anomalies compare expenses only within the same currency and ignore pending', () => {
  const transactions = [
    ...Array.from({ length: 10 }, (_, i) => tx(`usd-food-${i}`, 10, 'USD')),
    tx('usd-outlier', 1000, 'USD'),
    ...Array.from({ length: 10 }, (_, i) => tx(`eur-food-${i}`, 20, 'EUR')),
    tx('usd-pending-outlier', 5000, 'USD', true),
  ]

  const anomalies = detectAnomalies(transactions)
  assert.deepEqual(anomalies.map(({ id, currency }) => ({ id, currency })), [
    { id: 'usd-outlier', currency: 'USD' },
  ])
})

test('month-end projections exclude pending and remain separated by currency', () => {
  const transactions = [
    tx('usd-1', 10, 'USD'),
    tx('usd-2', 20, 'USD'),
    tx('usd-pending', 900, 'USD', true),
    tx('eur-1', 30, 'EUR'),
  ]

  const projections = predictMonthEnd(transactions, new Date('2026-11-15T12:00:00'))
  assert.deepEqual(
    projections.map(({ currency, spentSoFar, avgDailySpend, predictedMonthEnd }) => ({
      currency, spentSoFar, avgDailySpend, predictedMonthEnd,
    })),
    [
      { currency: 'EUR', spentSoFar: 30, avgDailySpend: 2, predictedMonthEnd: 60 },
      { currency: 'USD', spentSoFar: 30, avgDailySpend: 2, predictedMonthEnd: 60 },
    ],
  )
})

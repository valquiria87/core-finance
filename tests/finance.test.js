const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')

// Permite testar diretamente os módulos TypeScript usados pelo dashboard.
require.extensions['.ts'] = (module, filename) => {
  const source = require('node:fs').readFileSync(filename, 'utf8')
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  })
  module._compile(output, filename)
}

const {
  periodFlows,
  spendingByCategory,
  consumptionTotal,
  spendingByWeek,
} = require('../lib/finance.ts')

const transactions = [
  { id: 'salary', date: '2026-10-05', amount: -8500, category: 'income', merchant: 'Salário', accountId: 'checking', pending: false },
  { id: 'condo', date: '2026-10-05', amount: 800, category: 'housing', merchant: 'Condomínio', accountId: 'checking', pending: false },
  { id: 'electric', date: '2026-10-15', amount: 185, category: 'housing', merchant: 'Energia', accountId: 'checking', pending: false },
  { id: 'phone', date: '2026-10-20', amount: 120, category: 'housing', merchant: 'Telefone', accountId: 'checking', pending: false },
  { id: 'transfer', date: '2026-10-28', amount: 100, category: 'transfer', merchant: 'Boleto', accountId: 'checking', pending: false },
  { id: 'health', date: '2026-10-21', amount: 67.70, category: 'health', merchant: 'Farmácia', accountId: 'checking', pending: false },
  { id: 'leisure', date: '2026-10-22', amount: 100, category: 'leisure', merchant: 'Cinema', accountId: 'credit', pending: false },
]

test('periodFlows separates income and excludes internal transfers from outflows', () => {
  assert.deepEqual(periodFlows(transactions, '2026-10'), {
    inflow: 8500,
    outflow: 1272.7,
  })
})

test('consumptionTotal excludes transfers and debt payments', () => {
  const withDebt = [
    ...transactions,
    { id: 'debt', date: '2026-10-25', amount: 200, category: 'debt', merchant: 'Fatura', accountId: 'credit', pending: false },
  ]
  assert.equal(consumptionTotal(withDebt, '2026-10'), 1272.7)
})

test('category chart preserves transfers in the breakdown but marks them non-consumption', () => {
  const slices = spendingByCategory(transactions, '2026-10')
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const transfer = slices.find((slice) => slice.id === 'transfer')

  assert.equal(Number(total.toFixed(2)), 1372.7)
  assert.equal(transfer.nonConsumption, true)
  assert.equal(Number(slices.filter((slice) => !slice.nonConsumption).reduce((sum, slice) => sum + slice.value, 0).toFixed(2)), 1272.7)
})

test('weekly outflows sum to monthly outflows while keeping transfers excluded', () => {
  const weeks = spendingByWeek(transactions, '2026-10')
  assert.equal(Number(weeks.reduce((sum, week) => sum + week.value, 0).toFixed(2)), 1272.7)
})

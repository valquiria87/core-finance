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
  accountTotalsByCurrency,
  periodFlowsByCurrency,
  spendingByCategoryAndCurrency,
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

test('monthly flows exclude both sides of card bill payments and internal transfers', () => {
  const withPayments = [
    ...transactions,
    { id: 'card-payment-out', date: '2026-10-26', amount: 300, category: 'debt', merchant: 'Credit Card Payment', accountId: 'checking', pending: false, currency: 'USD' },
    { id: 'card-payment-in', date: '2026-10-26', amount: -300, category: 'debt', merchant: 'Credit Card Payment', accountId: 'credit', pending: false, currency: 'USD' },
    { id: 'transfer-in', date: '2026-10-27', amount: -50, category: 'transfer', merchant: 'Internal transfer', accountId: 'checking', pending: false, currency: 'USD' },
  ]

  assert.deepEqual(periodFlows(withPayments, '2026-10'), {
    inflow: 8500,
    outflow: 1272.7,
  })

  const currencyFlows = periodFlowsByCurrency(withPayments, '2026-10')
  assert.deepEqual(currencyFlows.inflow, [{ currency: null, amount: 8500 }])
  assert.deepEqual(currencyFlows.outflow, [{ currency: null, amount: 1272.7 }])
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

test('dashboard totals and categories stay separated by currency', () => {
  const multiCurrency = [
    { id: 'usd', date: '2026-10-01', amount: 10, category: 'food', currency: 'USD' },
    { id: 'eur', date: '2026-10-02', amount: 20, category: 'food', currency: 'EUR' },
  ]
  const totals = accountTotalsByCurrency([
    { type: 'checking', current: 100, currency: 'USD' },
    { type: 'checking', current: 200, currency: 'EUR' },
    { type: 'credit', current: 30, currency: 'EUR' },
  ])
  const flows = periodFlowsByCurrency(multiCurrency, '2026-10')
  const categories = spendingByCategoryAndCurrency(multiCurrency, '2026-10')

  assert.deepEqual(totals.cash, [{ currency: 'USD', amount: 100 }, { currency: 'EUR', amount: 200 }])
  assert.deepEqual(totals.debt, [{ currency: 'EUR', amount: 30 }])
  assert.deepEqual(flows.outflow, [{ currency: 'USD', amount: 10 }, { currency: 'EUR', amount: 20 }])
  assert.deepEqual(categories.map(({ currency, value }) => ({ currency, value })), [
    { currency: 'EUR', value: 20 }, { currency: 'USD', value: 10 },
  ])
})

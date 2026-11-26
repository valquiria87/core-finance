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

const { answer } = require('../lib/core-engine.ts')

test('chat identifies the current month as empty before showing the last month with data', () => {
  const blocks = answer('Quanto gastei este mês?', {
    asOf: '2026-11-08',
    transactions,
    accounts: [],
    balanceHistory: [],
  })

  assert.match(blocks[0].text, /Em novembro ainda não há movimentações/)
  assert.match(blocks[0].text, /último mês com dados é outubro/)
  assert.match(blocks[1].text, /Em outubro você gastou/)
  assert.match(blocks[1].text, /1\.272,70/)
  assert.match(blocks[1].text, /8\.500,00/)
  assert.match(blocks[1].text, /Moradia/)
})
test('chat category table matches dashboard category values and percentages', () => {
  const snapshot = {
    asOf: '2026-11-08',
    transactions,
    accounts: [],
    balanceHistory: [],
  }
  const blocks = answer('gastos por categoria', snapshot)
  const table = blocks.find((block) => block.type === 'table')
  const slices = spendingByCategory(transactions, '2026-10')

  assert.ok(table)
  assert.equal(table.rows.length, slices.length)

  for (const [index, slice] of slices.entries()) {
    const row = table.rows[index]
    const amount = Number(row.valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
    const percent = Number(row.pct.replace('%', '').replace(',', '.'))

    assert.equal(amount, Number(slice.value.toFixed(2)))
    assert.ok(Math.abs(percent - slice.percent) <= 0.11)
  }

  const housing = table.rows.find((row) => row.cat === 'Moradia')
  assert.ok(housing)
  assert.equal(Number(housing.valor.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')), 1105)
})
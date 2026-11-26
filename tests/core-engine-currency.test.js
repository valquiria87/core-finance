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

const { answer } = require('../lib/core-engine.ts')

const snapshot = {
  mode: 'sandbox',
  asOf: '2026-11-25',
  balanceHistory: [],
  accounts: [
    { id: 'usd', name: 'Conta USD', institution: 'Plaid Sandbox', type: 'checking', mask: '1111', currency: 'USD', current: 100, available: 90, limit: null },
    { id: 'brl', name: 'Conta BRL', institution: 'Plaid Sandbox', type: 'checking', mask: '2222', currency: 'BRL', current: 200, available: 180, limit: null },
  ],
  transactions: [
    { id: 'usd-spend', date: '2026-11-10', merchant: 'Mercado USD', accountId: 'usd', category: 'food', amount: 10, currency: 'USD', pending: false },
    { id: 'brl-spend', date: '2026-11-11', merchant: 'Mercado BRL', accountId: 'brl', category: 'food', amount: 20, currency: 'BRL', pending: false },
    { id: 'usd-income', date: '2026-11-12', merchant: 'Salário', accountId: 'usd', category: 'income', amount: -50, currency: 'USD', pending: false },
  ],
}

test('Core chat formats account and transaction values in the Plaid currency', () => {
  const balances = answer('saldo', snapshot)
  const recent = answer('transações recentes', snapshot)
  const balanceText = balances[0].text
  const recentValues = recent[1].rows.map((row) => row.valor)

  assert.match(balanceText, /US\$ 100,00/)
  assert.match(balanceText, /R\$ 200,00/)
  assert.ok(recentValues.some((value) => value.includes('US$')))
  assert.ok(recentValues.some((value) => value.includes('R$')))
  assert.doesNotMatch(balanceText, /R\$ 300,00/)
})

test('Core chat separates deposit balances, loan and card debt, and investments', () => {
  const classifiedSnapshot = {
    ...snapshot,
    accounts: [
      ...snapshot.accounts,
      { id: 'loan', name: 'Empréstimo estudantil', institution: 'Plaid Sandbox', type: 'loan', mask: '3333', currency: 'USD', current: 500, available: null, limit: null },
      { id: 'investment', name: 'Conta de investimentos', institution: 'Plaid Sandbox', type: 'investment', mask: '4444', currency: 'USD', current: 750, available: null, limit: null },
      { id: 'credit', name: 'Cartão', institution: 'Plaid Sandbox', type: 'credit', mask: '5555', currency: 'USD', current: 50, available: null, limit: 1000 },
    ],
  }

  const balances = answer('saldo', classifiedSnapshot)
  assert.match(balances[0].text, /US\$ 100,00; R\$ 200,00 em contas de depósito/)
  assert.match(balances[0].text, /US\$ 550,00 em dívidas/)
  assert.match(balances[0].text, /US\$ 750,00 em investimentos/)
  assert.match(balances[1].rows.find((row) => row.tipo === 'Empréstimo').valor, /devido/)
  assert.equal(balances[1].rows.find((row) => row.tipo === 'Investimento').extra, '—')
})

test('Core chat keeps mixed-currency spending and category totals separate', () => {
  const spending = answer('quanto gastei com mercado?', snapshot)
  const categories = answer('gastos por categoria', snapshot)

  assert.match(spending[0].text, /US\$ 10,00/)
  assert.match(spending[0].text, /R\$ 20,00/)
  assert.doesNotMatch(spending[0].text, /R\$ 30,00|US\$ 30,00/)
  const categoryValues = categories[1].rows.map((row) => row.valor)
  assert.ok(categoryValues.some((value) => value.includes('US$ 10,00')))
  assert.ok(categoryValues.some((value) => value.includes('R$ 20,00')))
})

test('broad monthly analysis returns three quantified spending patterns and a grounded savings prompt', () => {
  const analysis = answer(
    'Analise minhas movimentações de novembro e identifique meus principais gastos, entradas e oportunidades de economia.',
    snapshot,
  )

  assert.equal(analysis.length, 4)
  assert.ok(analysis[0].text.includes('US$ 50,00 de entradas'))
  assert.match(analysis[0].text, /oportunidades de economia/)
  assert.match(analysis[0].text, /não uma economia garantida/)
  assert.deepEqual(analysis.slice(1).map((block) => block.title), [
    'Padrão 1 · Gastos por categoria (novembro)',
    'Padrão 2 · Gastos por período (novembro)',
    'Padrão 3 · Gastos por conta (novembro)',
  ])
  assert.ok(analysis[1].columns.some((column) => column.key === 'qtd'))
  assert.ok(analysis[1].rows.every((row) => Number(row.qtd) > 0))
})

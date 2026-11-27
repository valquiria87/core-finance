const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const dateFromDaysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  })
  module._compile(output, filename)
}

const account = {
  account_id: 'account-1',
  name: 'Checking',
  official_name: null,
  type: 'depository',
  subtype: 'checking',
  mask: '1234',
  balances: { current: 250, available: 200, limit: null, iso_currency_code: 'USD' },
}

const outflow = {
  transaction_id: 'tx-out',
  account_id: 'account-1',
  amount: 25,
  date: dateFromDaysAgo(2),
  iso_currency_code: 'USD',
  pending: false,
  name: 'Grocery Store',
  merchant_name: 'Grocery Store',
  personal_finance_category: { primary: 'FOOD_AND_DRINK' },
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function withPlaidEnvironment(values, callback) {
  const names = ['PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_ENV', 'PLAID_ACCESS_TOKEN']
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  for (const name of names) delete process.env[name]
  Object.assign(process.env, values)

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      for (const name of names) {
        if (previous[name] === undefined) delete process.env[name]
        else process.env[name] = previous[name]
      }
    })
}

test('Plaid adapter maps currency, primary categories, pending state, and Plaid sign convention', () => {
  const { createPlaidSnapshot } = require('../lib/plaid-adapter.ts')
  const income = { ...outflow, transaction_id: 'tx-in', amount: -125, iso_currency_code: 'EUR', name: 'Payroll', personal_finance_category: { primary: 'INCOME' } }
  const primaryWins = { ...outflow, transaction_id: 'tx-primary', name: 'salary transfer rent', personal_finance_category: { primary: 'FOOD_AND_DRINK' } }
  const fallback = { ...outflow, transaction_id: 'tx-fallback', name: 'Credit card payment', personal_finance_category: null }
  const unknown = { ...outflow, transaction_id: 'tx-unknown', name: 'Unmapped provider transaction', personal_finance_category: { primary: 'GENERAL_SERVICES' } }
  const snapshot = createPlaidSnapshot([account], [outflow, income, primaryWins, fallback, unknown])

  assert.equal(snapshot.mode, 'sandbox')
  assert.deepEqual(snapshot.accounts[0], {
    id: 'account-1', name: 'Checking', institution: 'Plaid Sandbox',
    type: 'checking', mask: '1234', current: 250, available: 200, limit: null, currency: 'USD',
  })
  assert.equal(snapshot.transactions[0].amount, 25)
  assert.equal(snapshot.transactions[0].currency, 'USD')
  assert.equal(snapshot.transactions[0].category, 'food')
  assert.equal(snapshot.transactions[1].amount, -125)
  assert.equal(snapshot.transactions[1].currency, 'EUR')
  assert.equal(snapshot.transactions[1].category, 'income')
  assert.equal(snapshot.transactions[0].pending, false)
  assert.equal(snapshot.transactions[2].category, 'food')
  assert.equal(snapshot.transactions[3].category, 'debt')
  assert.equal(snapshot.transactions[4].category, 'other')

  const { formatCurrency } = require('../lib/format.ts')
  assert.match(formatCurrency(25, 'USD'), /US\$/)
  assert.match(formatCurrency(25, null), /moeda não informada/)
})

test('Plaid adapter classifies deposit, credit, loan, investment, and other account types without mixing balances', () => {
  const { createPlaidSnapshot } = require('../lib/plaid-adapter.ts')
  const { accountTotalsByCurrency } = require('../lib/finance.ts')
  const rawAccount = (id, name, type, subtype, current) => ({
    ...account,
    account_id: id,
    name,
    type,
    subtype,
    balances: {
      current,
      available: type === 'depository' ? current : null,
      limit: type === 'credit' ? 1000 : null,
      iso_currency_code: 'USD',
    },
  })
  const rawAccounts = [
    rawAccount('checking', 'Plaid Checking', 'depository', 'checking', 110),
    rawAccount('savings', 'Plaid Saving', 'depository', 'savings', 210),
    rawAccount('cd', 'Plaid CD', 'depository', 'cd', 1000),
    rawAccount('money-market', 'Plaid Money Market', 'depository', 'money market', 43200),
    rawAccount('hsa', 'Plaid HSA', 'depository', 'hsa', 6009),
    rawAccount('cash-management', 'Plaid Cash Management', 'depository', 'cash management', 12060),
    rawAccount('credit-card', 'Plaid Credit Card', 'credit', 'credit card', -410),
    rawAccount('ira', 'Plaid IRA', 'investment', 'ira', 320.76),
    rawAccount('401k', 'Plaid 401k', 'investment', '401k', 23631.98),
    rawAccount('student-loan', 'Plaid Student Loan', 'loan', 'student', -65262),
    rawAccount('mortgage', 'Plaid Mortgage', 'loan', 'mortgage', -56302.06),
    rawAccount('auto-loan', 'Plaid Auto Loan', 'loan', 'auto', -23211.33),

  ]
  const snapshot = createPlaidSnapshot(rawAccounts, [])
  const totals = accountTotalsByCurrency(snapshot.accounts)

  assert.deepEqual(snapshot.accounts.map((item) => item.type), [
    'checking', 'savings', 'other', 'other', 'other', 'other',
    'credit', 'investment', 'investment', 'loan', 'loan', 'loan',
  ])
  assert.deepEqual(totals.cash, [{ currency: 'USD', amount: 320 }])
  assert.equal(snapshot.accounts.find((item) => item.id === 'cd').available, null)
  assert.equal(snapshot.accounts.find((item) => item.id === 'money-market').available, null)
  assert.equal(snapshot.accounts.find((item) => item.id === 'hsa').available, null)
  assert.equal(snapshot.accounts.find((item) => item.id === 'cash-management').available, null)
  assert.deepEqual(totals.debt, [{ currency: 'USD', amount: 145185.39 }])
  assert.deepEqual(totals.investments, [{ currency: 'USD', amount: 23952.74 }])
  assert.equal(snapshot.accounts.find((item) => item.id === 'student-loan').current, 65262)
  assert.equal(snapshot.accounts.find((item) => item.id === 'credit-card').current, 410)
})

test('Plaid adapter rejects malformed provider data', () => {
  const { createPlaidSnapshot } = require('../lib/plaid-adapter.ts')
  assert.throws(() => createPlaidSnapshot([{ account_id: 'missing-fields' }], []), /invalid account or transaction data/)
  assert.throws(() => createPlaidSnapshot([], [{ transaction_id: 'missing-fields' }]), /invalid account or transaction data/)
})

test('Plaid client requires all server credentials and enforces Sandbox', () => withPlaidEnvironment({}, async () => {
  const { createPlaidClient } = require('../lib/plaid.ts')
  assert.throws(() => createPlaidClient(), /configuration is incomplete/)

  Object.assign(process.env, {
    PLAID_CLIENT_ID: 'client-test', PLAID_SECRET: 'secret-test',
    PLAID_ENV: 'production', PLAID_ACCESS_TOKEN: 'access-test',
  })
  assert.throws(() => createPlaidClient(), /must be sandbox/)
}))

test('official Plaid SDK client calls Sandbox accounts/get with server credentials', () => withPlaidEnvironment({
  PLAID_CLIENT_ID: 'client-test', PLAID_SECRET: 'secret-test',
  PLAID_ENV: 'sandbox', PLAID_ACCESS_TOKEN: 'access-test',
}, async () => {
  const previousFetch = global.fetch
  let request
  global.fetch = async (input, init = {}) => {
    request = { url: new URL(String(input)), init }
    return jsonResponse({ accounts: [account], item: { institution_id: null }, request_id: 'request-test' })
  }

  try {
    const { createPlaidClient } = require('../lib/plaid.ts')
    const response = await createPlaidClient().accounts.get({ access_token: process.env.PLAID_ACCESS_TOKEN })
    assert.equal(response.accounts[0].account_id, 'account-1')
    assert.equal(request.url.hostname, 'sandbox.plaid.com')
    assert.equal(request.url.pathname, '/accounts/get')
    assert.equal(new Headers(request.init.headers).get('plaid-client-id'), 'client-test')
    assert.equal(new Headers(request.init.headers).get('plaid-secret'), 'secret-test')
    assert.equal(JSON.parse(request.init.body).access_token, 'access-test')
  } finally {
    global.fetch = previousFetch
  }
}))

test('official Plaid SDK client rejects provider failures', () => withPlaidEnvironment({
  PLAID_CLIENT_ID: 'client-test', PLAID_SECRET: 'secret-test',
  PLAID_ENV: 'sandbox', PLAID_ACCESS_TOKEN: 'access-test',
}, async () => {
  const previousFetch = global.fetch
  global.fetch = async () => jsonResponse({ error_type: 'INVALID_REQUEST', error_code: 'INVALID_ACCESS_TOKEN' }, 401)

  try {
    const { createPlaidClient } = require('../lib/plaid.ts')
    await assert.rejects(
      createPlaidClient().accounts.get({ access_token: process.env.PLAID_ACCESS_TOKEN }),
    )
  } finally {
    global.fetch = previousFetch
  }
}))

test('Plaid snapshot follows all transactions/sync cursor pages', async () => withPlaidEnvironment({
  PLAID_CLIENT_ID: 'client-test', PLAID_SECRET: 'secret-test',
  PLAID_ENV: 'sandbox', PLAID_ACCESS_TOKEN: 'access-test',
}, async () => {
  const { fetchPlaidSnapshot } = require('../lib/plaid.ts')
  const calls = []
  const client = {
    accounts: { get: async (request) => {
      assert.equal(request.access_token, 'access-test')
      return { accounts: [account] }
    } },
    transactions: { sync: async (request) => {
      calls.push(request)
      if (calls.length === 1) {
        return { added: [outflow, { ...outflow, transaction_id: 'tx-boundary', date: dateFromDaysAgo(90) }, { ...outflow, transaction_id: 'tx-old', date: dateFromDaysAgo(91) }, { ...outflow, transaction_id: 'tx-future', date: dateFromDaysAgo(-1) }], modified: [], removed: [], has_more: true, next_cursor: 'cursor-2' }
      }
      return { added: [], modified: [{ ...outflow, transaction_id: 'tx-two' }], removed: [], has_more: false, next_cursor: 'cursor-final' }
    } },
  }

  const snapshot = await fetchPlaidSnapshot(client, 'access-test')
  assert.equal(calls.length, 2)
  assert.equal(calls[0].count, 500)
  assert.equal(calls[0].cursor, undefined)
  assert.equal(calls[1].cursor, 'cursor-2')
  assert.deepEqual(snapshot.transactions.map((tx) => tx.id), ['tx-out', 'tx-boundary', 'tx-two'])
  assert.ok(snapshot.transactions.every((tx) => tx.date >= dateFromDaysAgo(90)))
}))

test('Plaid snapshot rejects malformed pages and repeated cursors', async () => {
  const { fetchPlaidSnapshot } = require('../lib/plaid.ts')
  const client = (sync) => ({
    accounts: { get: async () => ({ accounts: [account] }) },
    transactions: { sync },
  })

  await assert.rejects(
    fetchPlaidSnapshot(client(async () => ({ added: [], modified: [], removed: [], has_more: true, next_cursor: '' })), 'access'),
    /invalid transaction pagination cursor/,
  )
  await assert.rejects(
    fetchPlaidSnapshot(client(async () => ({ added: [], modified: [], removed: [], has_more: false })), 'access'),
    /invalid transactions response/,
  )
})

test('Plaid API handlers share the snapshot, disable caching, and hide provider errors', async () => {
  const { createCorePost, createSandboxGet } = require('../lib/plaid-route-handlers.ts')
  const snapshot = {
    mode: 'sandbox', asOf: '2026-11-20', accounts: [{
      id: 'account-1', name: 'Checking', institution: 'Plaid Sandbox', type: 'checking',
      mask: '1234', current: 250, available: 200, limit: null,
    }], transactions: [], balanceHistory: [],
  }
  let calls = 0
  const loadSnapshot = async () => { calls += 1; return snapshot }
  const sandboxResponse = await createSandboxGet(loadSnapshot)()
  const coreResponse = await createCorePost(loadSnapshot)(new Request('http://local/api/core', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'saldo' }),
  }))

  assert.equal(sandboxResponse.headers.get('Cache-Control'), 'no-store')
  assert.equal(coreResponse.headers.get('Cache-Control'), 'no-store')
  assert.equal((await sandboxResponse.json()).accounts[0].id, 'account-1')
  assert.ok((await coreResponse.json()).blocks.length > 0)
  assert.equal(calls, 2)

  const failure = new Error('secret access-test internal detail')
  const failedSandbox = await createSandboxGet(async () => { throw failure })()
  const failedCore = await createCorePost(async () => { throw failure })(new Request('http://local/api/core', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'saldo' }),
  }))
  assert.equal(failedSandbox.status, 503)
  assert.equal(failedCore.status, 503)
  assert.equal(failedSandbox.headers.get('Cache-Control'), 'no-store')
  assert.equal(failedCore.headers.get('Cache-Control'), 'no-store')
  assert.doesNotMatch(await failedSandbox.text(), /access-test|internal detail/)
  assert.doesNotMatch(await failedCore.text(), /access-test|internal detail/)
})

test('Plaid API handlers return no-store for invalid input and missing configuration', async () => withPlaidEnvironment({}, async () => {
  const { createCorePost, createSandboxGet } = require('../lib/plaid-route-handlers.ts')
  const invalid = await createCorePost(async () => { throw new Error('must not be called') })(new Request('http://local/api/core', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  }))
  const unconfigured = await createSandboxGet()()
  const unconfiguredCore = await createCorePost()(new Request('http://local/api/core', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'saldo' }),
  }))

  assert.equal(invalid.status, 400)
  assert.equal(invalid.headers.get('Cache-Control'), 'no-store')
  assert.equal(unconfigured.status, 503)
  assert.equal(unconfiguredCore.status, 503)
  assert.equal(unconfigured.headers.get('Cache-Control'), 'no-store')
  assert.equal(unconfiguredCore.headers.get('Cache-Control'), 'no-store')
}))

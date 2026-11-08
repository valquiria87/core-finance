const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  })
  module._compile(output, filename)
}

function loadFreshPluggyClient() {
  const path = require.resolve('../lib/pluggy.ts')
  delete require.cache[path]
  return require('../lib/pluggy.ts')
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('Pluggy accounts contract authenticates and requests accounts by Item ID', async () => {
  const previousFetch = global.fetch
  const previousEnv = {
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    itemId: process.env.PLUGGY_ITEM_ID,
  }
  process.env.PLUGGY_CLIENT_ID = 'client-test'
  process.env.PLUGGY_CLIENT_SECRET = 'secret-test'
  process.env.PLUGGY_ITEM_ID = 'item-test'

  const calls = []
  global.fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    calls.push({ url, init })

    if (url.pathname === '/auth') {
      assert.equal(init.method, 'POST')
      assert.deepEqual(JSON.parse(init.body), {
        clientId: 'client-test',
        clientSecret: 'secret-test',
      })
      return jsonResponse({ apiKey: 'api-key-test' })
    }

    assert.equal(url.pathname, '/accounts')
    assert.equal(url.searchParams.get('itemId'), 'item-test')
    assert.equal(new Headers(init.headers).get('X-API-KEY'), 'api-key-test')
    return jsonResponse({ results: [{ id: 'account-1' }] })
  }

  try {
    const { getPluggyAccounts } = loadFreshPluggyClient()
    const accounts = await getPluggyAccounts()
    assert.deepEqual(accounts, [{ id: 'account-1' }])
    assert.equal(calls.length, 2)
  } finally {
    global.fetch = previousFetch
    if (previousEnv.clientId === undefined) delete process.env.PLUGGY_CLIENT_ID
    else process.env.PLUGGY_CLIENT_ID = previousEnv.clientId
    if (previousEnv.clientSecret === undefined) delete process.env.PLUGGY_CLIENT_SECRET
    else process.env.PLUGGY_CLIENT_SECRET = previousEnv.clientSecret
    if (previousEnv.itemId === undefined) delete process.env.PLUGGY_ITEM_ID
    else process.env.PLUGGY_ITEM_ID = previousEnv.itemId
  }
})

test('Pluggy accounts contract rejects a response without results array', async () => {
  const previousFetch = global.fetch
  const previousEnv = {
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    itemId: process.env.PLUGGY_ITEM_ID,
  }
  process.env.PLUGGY_CLIENT_ID = 'client-test'
  process.env.PLUGGY_CLIENT_SECRET = 'secret-test'
  process.env.PLUGGY_ITEM_ID = 'item-test'

  global.fetch = async (input) => {
    const url = new URL(String(input))
    return url.pathname === '/auth'
      ? jsonResponse({ apiKey: 'api-key-test' })
      : jsonResponse({ results: {} })
  }

  try {
    const { getPluggyAccounts } = loadFreshPluggyClient()
    await assert.rejects(
      getPluggyAccounts(),
      /Formato inesperado na resposta de contas Pluggy/,
    )
  } finally {
    global.fetch = previousFetch
    if (previousEnv.clientId === undefined) delete process.env.PLUGGY_CLIENT_ID
    else process.env.PLUGGY_CLIENT_ID = previousEnv.clientId
    if (previousEnv.clientSecret === undefined) delete process.env.PLUGGY_CLIENT_SECRET
    else process.env.PLUGGY_CLIENT_SECRET = previousEnv.clientSecret
    if (previousEnv.itemId === undefined) delete process.env.PLUGGY_ITEM_ID
    else process.env.PLUGGY_ITEM_ID = previousEnv.itemId
  }
})

test('Pluggy transactions contract follows pagination and combines results', async () => {
  const previousFetch = global.fetch
  const previousEnv = {
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    itemId: process.env.PLUGGY_ITEM_ID,
  }
  process.env.PLUGGY_CLIENT_ID = 'client-test'
  process.env.PLUGGY_CLIENT_SECRET = 'secret-test'
  process.env.PLUGGY_ITEM_ID = 'item-test'

  const transactionUrls = []
  global.fetch = async (input, init = {}) => {
    const url = new URL(String(input))

    if (url.pathname === '/auth') {
      return jsonResponse({ apiKey: 'api-key-test' })
    }

    assert.equal(url.pathname, '/v2/transactions')
    assert.equal(new Headers(init.headers).get('X-API-KEY'), 'api-key-test')
    transactionUrls.push(url)

    if (transactionUrls.length === 1) {
      assert.equal(url.searchParams.get('accountId'), 'account-1')
      return jsonResponse({
        results: [{ id: 'tx-1' }],
        next: '?accountId=account-1&page=2',
      })
    }

    return jsonResponse({
      results: [{ id: 'tx-2' }],
      next: null,
    })
  }

  try {
    const { getPluggyTransactions } = loadFreshPluggyClient()
    const transactions = await getPluggyTransactions('account-1')
    assert.deepEqual(transactions, [{ id: 'tx-1' }, { id: 'tx-2' }])
    assert.equal(transactionUrls.length, 2)
    assert.equal(transactionUrls[1].searchParams.get('page'), '2')
  } finally {
    global.fetch = previousFetch
    if (previousEnv.clientId === undefined) delete process.env.PLUGGY_CLIENT_ID
    else process.env.PLUGGY_CLIENT_ID = previousEnv.clientId
    if (previousEnv.clientSecret === undefined) delete process.env.PLUGGY_CLIENT_SECRET
    else process.env.PLUGGY_CLIENT_SECRET = previousEnv.clientSecret
    if (previousEnv.itemId === undefined) delete process.env.PLUGGY_ITEM_ID
    else process.env.PLUGGY_ITEM_ID = previousEnv.itemId
  }
})

test('Pluggy transaction contract rejects an invalid pagination cursor', async () => {
  const previousFetch = global.fetch
  const previousEnv = {
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  }
  process.env.PLUGGY_CLIENT_ID = 'client-test'
  process.env.PLUGGY_CLIENT_SECRET = 'secret-test'

  global.fetch = async (input) => {
    const url = new URL(String(input))
    return url.pathname === '/auth'
      ? jsonResponse({ apiKey: 'api-key-test' })
      : jsonResponse({ results: [], next: 'https://attacker.invalid/page' })
  }

  try {
    const { getPluggyTransactions } = loadFreshPluggyClient()
    await assert.rejects(
      getPluggyTransactions('account-1'),
      /Cursor de paginação Pluggy inválido/,
    )
  } finally {
    global.fetch = previousFetch
    if (previousEnv.clientId === undefined) delete process.env.PLUGGY_CLIENT_ID
    else process.env.PLUGGY_CLIENT_ID = previousEnv.clientId
    if (previousEnv.clientSecret === undefined) delete process.env.PLUGGY_CLIENT_SECRET
    else process.env.PLUGGY_CLIENT_SECRET = previousEnv.clientSecret
  }
})

test('Pluggy adapter maps provider account and transaction fields to the app model', () => {
  const { createPluggySnapshot } = require('../lib/pluggy-adapter.ts')
  const snapshot = createPluggySnapshot(
    [
      {
        id: 'checking-1',
        name: 'Conta principal',
        type: 'BANK',
        subtype: 'CHECKING_ACCOUNT',
        number: '00001234',
        balance: 1250.5,
        availableBalance: 1100.5,
      },
      {
        id: 'credit-1',
        name: 'Cartão principal',
        type: 'CREDIT',
        number: '99998888',
        balance: -320.75,
        creditData: { creditLimit: 5000 },
      },
    ],
    [[
      {
        id: 'tx-1',
        date: '2026-10-15T12:00:00Z',
        accountId: 'checking-1',
        category: 'FOOD',
        description: 'Supermarket',
        merchant: { businessName: 'Mercado Central' },
        status: 'POSTED',
        amount: 42.5,
      },
    ]],
  )

  assert.equal(snapshot.mode, 'sandbox')
  assert.equal(snapshot.accounts.length, 2)
  assert.deepEqual(snapshot.accounts[0], {
    id: 'checking-1',
    name: 'Conta principal',
    institution: 'Pluggy Sandbox',
    type: 'checking',
    mask: '1234',
    current: 1250.5,
    available: 1100.5,
    limit: null,
  })
  assert.equal(snapshot.accounts[1].type, 'credit')
  assert.equal(snapshot.accounts[1].current, 320.75)
  assert.equal(snapshot.accounts[1].limit, 5000)
  assert.equal(snapshot.transactions.length, 1)
  assert.equal(snapshot.transactions[0].id, 'tx-1')
  assert.equal(snapshot.transactions[0].date, '2026-10-15')
  assert.equal(snapshot.transactions[0].merchant, 'Mercado Central')
  assert.equal(snapshot.transactions[0].category, 'food')
  assert.equal(snapshot.transactions[0].pending, false)
  assert.deepEqual(snapshot.balanceHistory, [])
})

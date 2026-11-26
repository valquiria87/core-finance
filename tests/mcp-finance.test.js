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

const snapshot = {
  mode: 'sandbox',
  asOf: '2026-11-25',
  accounts: [{
    id: 'account-1',
    name: 'Checking',
    institution: 'Plaid Sandbox',
    type: 'checking',
    mask: '1234',
    current: 250,
    available: 200,
    limit: null,
    currency: 'USD',
  }],
  transactions: [{
    id: 'tx-1',
    date: '2026-11-24',
    merchant: 'Grocery Store',
    accountId: 'account-1',
    currency: 'USD',
    category: 'food',
    amount: 25,
    pending: false,
  }],
  balanceHistory: [],
}

test('finance snapshot is retrieved through an MCP client/server tool call', async () => {
  const { getFinanceSnapshotViaMcp } = require('../lib/mcp-finance.ts')
  let loaderCalls = 0

  const result = await getFinanceSnapshotViaMcp(async () => {
    loaderCalls += 1
    return snapshot
  })

  assert.equal(loaderCalls, 1)
  assert.deepEqual(result, snapshot)
})

test('MCP finance tool rejects malformed snapshot results', async () => {
  const { getFinanceSnapshotViaMcp } = require('../lib/mcp-finance.ts')

  await assert.rejects(
    getFinanceSnapshotViaMcp(async () => ({
      mode: 'sandbox',
      asOf: '2026-11-25',
      accounts: 'invalid',
      transactions: [],
      balanceHistory: [],
    })),
    /invalid snapshot/,
  )
})

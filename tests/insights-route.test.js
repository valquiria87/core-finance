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

test('/api/insights builds indicators from Plaid snapshot without Pluggy or Supabase configuration', async () => {
  const envNames = ['PLUGGY_ITEM_ID', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'PLAID_CLIENT_ID', 'PLAID_SECRET', 'PLAID_ENV', 'PLAID_ACCESS_TOKEN']
  const previous = Object.fromEntries(envNames.map((name) => [name, process.env[name]]))
  const previousFetch = global.fetch
  envNames.forEach((name) => delete process.env[name])
  Object.assign(process.env, {
    PLAID_CLIENT_ID: 'test-client',
    PLAID_SECRET: 'test-secret',
    PLAID_ENV: 'sandbox',
    PLAID_ACCESS_TOKEN: 'test-access-token',
  })
  global.fetch = async (input) => {
    const path = new URL(String(input)).pathname
    if (path === '/accounts/get') {
      return new Response(JSON.stringify({ accounts: [] }), { status: 200 })
    }
    if (path === '/transactions/sync') {
      return new Response(JSON.stringify({ added: [], modified: [], removed: [], has_more: false, next_cursor: 'cursor-final' }), { status: 200 })
    }
    return new Response('{}', { status: 404 })
  }

  try {
    const { createInsightsGet } = require('../lib/insights-route-handlers.ts')
    const response = await createInsightsGet()()
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
    assert.equal(body.mode, 'sandbox')
    assert.match(body.asOf, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(body.dataThrough, body.asOf)
    assert.deepEqual(body.subscriptions, [])
    assert.deepEqual(body.anomalies, [])
    assert.equal(typeof body.monthEnd.predictedMonthEnd, 'number')
  } finally {
    global.fetch = previousFetch
    for (const name of envNames) {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    }
  }
})

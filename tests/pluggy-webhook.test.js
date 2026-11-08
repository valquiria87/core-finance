const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  })
  module._compile(output, filename)
}

const routePath = path.resolve(__dirname, '../app/api/webhooks/pluggy/route.ts')
const originalEnv = {
  secret: process.env.PLUGGY_WEBHOOK_SECRET,
  clientId: process.env.PLUGGY_CLIENT_ID,
  itemId: process.env.PLUGGY_ITEM_ID,
}

function setWebhookEnv(overrides = {}) {
  process.env.PLUGGY_WEBHOOK_SECRET = 'webhook-secret-test'
  process.env.PLUGGY_CLIENT_ID = 'client-test'
  process.env.PLUGGY_ITEM_ID = 'item-test'
  Object.assign(process.env, overrides)
}

function restoreEnv() {
  const entries = [
    ['PLUGGY_WEBHOOK_SECRET', originalEnv.secret],
    ['PLUGGY_CLIENT_ID', originalEnv.clientId],
    ['PLUGGY_ITEM_ID', originalEnv.itemId],
  ]
  for (const [key, value] of entries) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function createSupabaseMock() {
  const events = new Map()
  const snapshots = []
  let failEventInsert = false
  let failEventUpdate = false

  const client = {
    from(table) {
      if (table === 'webhook_events') {
        return {
          insert: async (row) => {
            if (failEventInsert) return { error: { code: 'XX001', message: 'insert failed' } }
            if (events.has(row.event_id)) {
              return { error: { code: '23505', message: 'duplicate event' } }
            }
            events.set(row.event_id, { ...row })
            return { error: null }
          },
          select: () => ({
            eq: (column, value) => ({
              maybeSingle: async () => {
                const found = [...events.values()].find((entry) => entry[column] === value)
                if (!found) return { data: null, error: null }
                return {
                  data: {
                    status: found.status,
                    attempts: found.attempts,
                    updated_at: found.updated_at,
                  },
                  error: null,
                }
              },
            }),
          }),
          update: (values) => {
            const filters = []
            const builder = {
              eq(column, value) {
                filters.push([column, value])
                return builder
              },
              select() {
                return builder
              },
              async maybeSingle() {
                if (failEventUpdate) return { data: null, error: { message: 'update failed' } }
                const entry = [...events.values()].find((item) =>
                  filters.every(([column, value]) => item[column] === value),
                )
                if (!entry) return { data: null, error: null }
                Object.assign(entry, values)
                return { data: { event_id: entry.event_id }, error: null }
              },
              then(resolve, reject) {
                if (failEventUpdate) return Promise.resolve({ error: { message: 'update failed' } }).then(resolve, reject)
                const entry = [...events.values()].find((item) =>
                  filters.every(([column, value]) => item[column] === value),
                )
                if (entry) Object.assign(entry, values)
                return Promise.resolve({ error: null }).then(resolve, reject)
              },
            }
            return builder
          },
        }
      }

      throw new Error('Unexpected Supabase table: ' + table)
    },
  }

  return {
    client,
    events,
    snapshots,
    setFailEventInsert(value) { failEventInsert = value },
    setFailEventUpdate(value) { failEventUpdate = value },
    seedEvent(event) { events.set(event.event_id, { ...event }) },
  }
}

function loadRoute(mocks) {
  delete require.cache[routePath]
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === '@/lib/supabase-admin') {
      return { getSupabaseAdmin: () => mocks.supabase.client }
    }
    if (request === '@/lib/pluggy') {
      return {
        getPluggyAccounts: mocks.getPluggyAccounts,
        getPluggyTransactions: mocks.getPluggyTransactions,
      }
    }
    if (request === '@/lib/pluggy-adapter') {
      return { createPluggySnapshot: mocks.createPluggySnapshot }
    }
    if (request === '@/lib/save-finance-snapshot') {
      return { saveFinanceSnapshot: mocks.saveFinanceSnapshot }
    }
    if (request === '@/lib/webhook-alert-email') {
      return { sendWebhookFailureAlert: async () => ({ sent: false, reason: 'test_mock' }) }
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  try {
    return require(routePath)
  } finally {
    Module._load = originalLoad
  }
}

function createHarness(options = {}) {
  const supabase = createSupabaseMock()
  const calls = { accounts: 0, transactions: [], snapshots: [] }
  const mocks = {
    supabase,
    getPluggyAccounts: async () => {
      calls.accounts += 1
      if (options.onAccounts) await options.onAccounts()
      if (options.accountsError) throw new Error('Pluggy accounts unavailable')
      return [{ id: 'account-1' }, { id: 'account-2' }]
    },
    getPluggyTransactions: async (accountId) => {
      calls.transactions.push(accountId)
      if (options.transactionsError) throw new Error('Pluggy transactions unavailable')
      return [{ id: 'tx-' + accountId }]
    },
    createPluggySnapshot: (accounts, transactions) => ({
      mode: 'sandbox',
      asOf: '2026-11-08',
      accounts,
      transactions: transactions.flat(),
      balanceHistory: [],
    }),
    saveFinanceSnapshot: async (itemId, snapshot) => {
      if (options.saveError) throw new Error('Supabase snapshot write failed')
      calls.snapshots.push({ itemId, snapshot })
      return { id: 'snapshot-1' }
    },
  }
  const route = loadRoute(mocks)

  async function post(payload, headers = {}) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    return route.POST(new Request('http://localhost/api/webhooks/pluggy', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-pluggy-webhook-secret': 'webhook-secret-test',
        ...headers,
      },
      body,
    }))
  }

  return { ...mocks, calls, post }
}

const validEvent = {
  event: 'transactions/updated',
  eventId: 'event-001',
  clientId: 'client-test',
  itemId: 'item-test',
}

test('Pluggy webhook returns 503 when required environment is missing', async () => {
  setWebhookEnv()
  delete process.env.PLUGGY_WEBHOOK_SECRET
  const harness = createHarness()
  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'webhook not configured' })
    assert.equal(harness.calls.accounts, 0)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook rejects a missing or incorrect shared secret', async () => {
  setWebhookEnv()
  const harness = createHarness()
  try {
    const missing = await harness.post(validEvent, { 'x-pluggy-webhook-secret': '' })
    const incorrect = await harness.post(validEvent, { 'x-pluggy-webhook-secret': 'wrong-secret' })
    assert.equal(missing.status, 401)
    assert.equal(incorrect.status, 401)
    assert.equal(harness.calls.accounts, 0)
    assert.equal(harness.supabase.events.size, 0)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook rejects invalid JSON and invalid payloads', async () => {
  setWebhookEnv()
  const harness = createHarness()
  try {
    const invalidJson = await harness.post('{not-json')
    const invalidPayload = await harness.post({ event: '', eventId: '', clientId: 'client-test' })
    assert.equal(invalidJson.status, 400)
    assert.deepEqual(await invalidJson.json(), { error: 'invalid JSON' })
    assert.equal(invalidPayload.status, 400)
    assert.deepEqual(await invalidPayload.json(), { error: 'invalid payload' })
    assert.equal(harness.supabase.events.size, 0)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook enforces body size and client identity', async () => {
  setWebhookEnv()
  const harness = createHarness()
  try {
    const oversized = await harness.post(' '.repeat(64 * 1024 + 1))
    const wrongClient = await harness.post({ ...validEvent, clientId: 'other-client' })
    assert.equal(oversized.status, 413)
    assert.deepEqual(await oversized.json(), { error: 'payload too large' })
    assert.equal(wrongClient.status, 401)
    assert.deepEqual(await wrongClient.json(), { error: 'client mismatch' })
    assert.equal(harness.supabase.events.size, 0)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook acknowledges but ignores events for a different Item ID', async () => {
  setWebhookEnv()
  const harness = createHarness()
  try {
    const response = await harness.post({ ...validEvent, itemId: 'another-item' })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { received: true, ignored: true })
    assert.equal(harness.supabase.events.size, 0)
    assert.equal(harness.calls.accounts, 0)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook syncs accounts and transactions, saves snapshot and completes event', async () => {
  setWebhookEnv()
  const harness = createHarness()
  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { received: true, synced: true })
    assert.equal(harness.calls.accounts, 1)
    assert.deepEqual(harness.calls.transactions, ['account-1', 'account-2'])
    assert.equal(harness.calls.snapshots.length, 1)
    assert.equal(harness.calls.snapshots[0].itemId, 'item-test')
    assert.equal(harness.calls.snapshots[0].snapshot.transactions.length, 2)
    const event = harness.supabase.events.get(validEvent.eventId)
    assert.equal(event.status, 'completed')
    assert.equal(event.attempts, 1)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook does not process an already completed event twice', async () => {
  setWebhookEnv()
  const harness = createHarness()
  try {
    const first = await harness.post(validEvent)
    const second = await harness.post(validEvent)
    assert.equal(first.status, 200)
    assert.deepEqual(await second.json(), { received: true, duplicate: true })
    assert.equal(harness.calls.accounts, 1)
    assert.equal(harness.calls.snapshots.length, 1)
    assert.equal(harness.supabase.events.get(validEvent.eventId).attempts, 1)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook records sync failures and returns 500', async () => {
  setWebhookEnv()
  const harness = createHarness({ transactionsError: true })
  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { error: 'sync failed' })
    const event = harness.supabase.events.get(validEvent.eventId)
    assert.equal(event.status, 'failed')
    assert.equal(event.error_code, 'SYNC_FAILED')
    assert.match(event.error_message, /Pluggy transactions unavailable/)
    assert.equal(harness.calls.snapshots.length, 0)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook records snapshot persistence failures', async () => {
  setWebhookEnv()
  const harness = createHarness({ saveError: true })
  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 500)
    const event = harness.supabase.events.get(validEvent.eventId)
    assert.equal(event.status, 'failed')
    assert.equal(event.error_code, 'SYNC_FAILED')
    assert.match(event.error_message, /Supabase snapshot write failed/)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook reclaims a stale processing event with compare-and-set', async () => {
  setWebhookEnv()
  const harness = createHarness()
  harness.supabase.seedEvent({
    event_id: validEvent.eventId,
    event_type: validEvent.event,
    item_id: validEvent.itemId,
    status: 'processing',
    attempts: 2,
    updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  })

  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { received: true, synced: true })
    const event = harness.supabase.events.get(validEvent.eventId)
    assert.equal(event.status, 'completed')
    assert.equal(event.attempts, 3)
    assert.equal(harness.calls.accounts, 1)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook retries a failed event and clears its previous error', async () => {
  setWebhookEnv()
  const harness = createHarness()
  harness.supabase.seedEvent({
    event_id: validEvent.eventId,
    event_type: validEvent.event,
    item_id: validEvent.itemId,
    status: 'failed',
    attempts: 1,
    updated_at: new Date().toISOString(),
    error_code: 'SYNC_FAILED',
    error_message: 'previous failure',
  })

  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 200)
    const event = harness.supabase.events.get(validEvent.eventId)
    assert.equal(event.status, 'completed')
    assert.equal(event.attempts, 2)
    assert.equal(event.error_code, null)
    assert.equal(event.error_message, null)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook does not steal an event with an active processing lease', async () => {
  setWebhookEnv()
  const harness = createHarness()
  harness.supabase.seedEvent({
    event_id: validEvent.eventId,
    event_type: validEvent.event,
    item_id: validEvent.itemId,
    status: 'processing',
    attempts: 1,
    updated_at: new Date().toISOString(),
  })

  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { received: true, duplicate: true })
    assert.equal(harness.calls.accounts, 0)
    assert.equal(harness.calls.snapshots.length, 0)
  } finally {
    restoreEnv()
  }
})

test('Pluggy webhook does not let an expired worker overwrite a newer claim', async () => {
  setWebhookEnv()
  let harness
  harness = createHarness({
    accountsError: true,
    onAccounts: async () => {
      const event = harness.supabase.events.get(validEvent.eventId)
      event.updated_at = new Date(Date.now() + 1000).toISOString()
    },
  })
  harness.supabase.seedEvent({
    event_id: validEvent.eventId,
    event_type: validEvent.event,
    item_id: validEvent.itemId,
    status: 'processing',
    attempts: 2,
    updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  })

  try {
    const response = await harness.post(validEvent)
    assert.equal(response.status, 500)
    const event = harness.supabase.events.get(validEvent.eventId)
    assert.equal(event.status, 'processing')
    assert.notEqual(event.error_code, 'SYNC_FAILED')
    assert.equal(harness.calls.snapshots.length, 0)
  } finally {
    restoreEnv()
  }
})

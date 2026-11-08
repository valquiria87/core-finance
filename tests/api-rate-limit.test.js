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
  createRateLimitBucketKey,
  getRateLimitSecret,
  normalizeClientIp,
  resolveClientIdentity,
} = require('../lib/api-rate-limit-utils.ts')

const TEST_SECRET = 'test-only-hmac-secret-with-at-least-32-bytes'

test('missing or short HMAC secret fails explicitly', () => {
  assert.throws(
    () => getRateLimitSecret(undefined),
    (error) => error.code === 'API_RATE_LIMIT_HMAC_SECRET_MISSING',
  )
  assert.throws(
    () => getRateLimitSecret('too-short'),
    (error) => error.code === 'API_RATE_LIMIT_HMAC_SECRET_TOO_SHORT',
  )
  assert.equal(getRateLimitSecret(TEST_SECRET), TEST_SECRET)
})

test('HMAC bucket changes with its own secret and does not contain the IP', () => {
  const ip = '203.0.113.42'
  const first = createRateLimitBucketKey('core-chat', ip, TEST_SECRET)
  const rotated = createRateLimitBucketKey(
    'core-chat',
    ip,
    'a-different-test-secret-with-at-least-32-bytes',
  )

  assert.notEqual(first, rotated)
  assert.notEqual(first, createRateLimitBucketKey('insights', ip, TEST_SECRET))
  assert.match(first, /^core-chat:[a-f0-9]{64}$/)
  assert.equal(first.includes(ip), false)

  const previousSupabaseSecret = process.env.SUPABASE_SECRET_KEY
  try {
    process.env.SUPABASE_SECRET_KEY = 'supabase-admin-secret-one'
    const withFirstSupabaseSecret = createRateLimitBucketKey(
      'core-chat', ip, TEST_SECRET,
    )
    process.env.SUPABASE_SECRET_KEY = 'supabase-admin-secret-two'
    const withSecondSupabaseSecret = createRateLimitBucketKey(
      'core-chat', ip, TEST_SECRET,
    )
    assert.equal(withFirstSupabaseSecret, withSecondSupabaseSecret)
  } finally {
    if (previousSupabaseSecret === undefined) {
      delete process.env.SUPABASE_SECRET_KEY
    } else {
      process.env.SUPABASE_SECRET_KEY = previousSupabaseSecret
    }
  }
})

test('x-real-ip has priority over the first x-forwarded-for value on Vercel', () => {
  const request = new Request('https://example.test/api/core', {
    headers: {
      'x-real-ip': '198.51.100.7',
      'x-forwarded-for': '203.0.113.9, 203.0.113.10',
    },
  })

  assert.deepEqual(resolveClientIdentity(request, true), {
    value: '198.51.100.7',
    missingIp: false,
    untrustedRuntime: false,
  })
})

test('the first x-forwarded-for address is used when x-real-ip is absent', () => {
  const request = new Request('https://example.test/api/core', {
    headers: { 'x-forwarded-for': '203.0.113.9, 203.0.113.10' },
  })

  assert.equal(resolveClientIdentity(request, true).value, '203.0.113.9')
})

test('IPv6 addresses are grouped by their /64 prefix', () => {
  assert.equal(
    normalizeClientIp('2001:db8:abcd:12::1'),
    '2001:db8:abcd:12::/64',
  )
  assert.equal(
    normalizeClientIp('2001:db8:abcd:12:ffff:eeee:dddd:cccc'),
    '2001:db8:abcd:12::/64',
  )
})

test('missing Vercel IP is reported as a separate, identifiable bucket', () => {
  const request = new Request('https://example.test/api/core')
  const identity = resolveClientIdentity(request, true)

  assert.equal(identity.value, 'vercel:missing-ip')
  assert.equal(identity.missingIp, true)
  assert.equal(identity.untrustedRuntime, false)
})

test('outside Vercel, forwarded headers are ignored', () => {
  const request = new Request('https://example.test/api/core', {
    headers: {
      'x-real-ip': '198.51.100.7',
      'x-forwarded-for': '203.0.113.9',
    },
  })
  const identity = resolveClientIdentity(request, false, () => 'local-test-id')

  assert.equal(identity.value, 'local:local-test-id')
  assert.equal(identity.untrustedRuntime, true)
  assert.equal(identity.missingIp, false)
})

test('route and IP are combined before hashing', () => {
  const firstRoute = createRateLimitBucketKey('sandbox-snapshot', '203.0.113.42', TEST_SECRET)
  const secondRoute = createRateLimitBucketKey('finance-insights', '203.0.113.42', TEST_SECRET)

  assert.notEqual(firstRoute, secondRoute)
  assert.equal(firstRoute.includes('203.0.113.42'), false)
})

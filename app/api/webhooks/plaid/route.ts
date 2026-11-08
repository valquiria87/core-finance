
import { createHash, createPublicKey, timingSafeEqual, verify } from 'node:crypto'
import { z } from 'zod'

export const runtime = 'nodejs'

const PLAID_BASE_URL =
  process.env.PLAID_BASE_URL || 'https://sandbox.plaid.com'

const WebhookSchema = z.object({
  webhook_type: z.string().optional(),
  webhook_code: z.string().optional(),
  webhook_id: z.string().optional(),
  request_id: z.string().optional(),
}).passthrough()

const receivedEvents = new Map<string, string>()

function log(level: string, message: string, meta = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  }))
}

function base64UrlDecode(value: string) {
  return Buffer.from(
    value.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  )
}

async function fetchVerificationKey(keyId: string) {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET

  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured')
  }

  const response = await fetch(
    new URL('/webhook_verification_key/get', PLAID_BASE_URL),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        key_id: keyId,
      }),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    throw new Error(`Plaid key fetch failed: ${response.status}`)
  }

  const parsed = await response.json()

  if (!parsed?.key) {
    throw new Error('Invalid Plaid key response')
  }

  return parsed.key
}

async function verifyPlaidWebhook(jwt: string, rawBody: Buffer) {
  const parts = jwt.split('.')

  if (parts.length !== 3) return false

  let header: any
  let payload: any

  try {
    header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'))
    payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'))
  } catch {
    return false
  }

  if (header.alg !== 'ES256' || !header.kid) return false

  const now = Math.floor(Date.now() / 1000)

  if (typeof payload.iat !== 'number') return false
  if (payload.iat > now + 60) return false
  if (now - payload.iat > 300) return false
  if (typeof payload.request_body_sha256 !== 'string') return false

  const bodyHash = createHash('sha256').update(rawBody).digest()
  const expected = Buffer.from(payload.request_body_sha256, 'hex')

  if (
    expected.length !== bodyHash.length ||
    !timingSafeEqual(expected, bodyHash)
  ) {
    return false
  }

  let key: any

  try {
    key = await fetchVerificationKey(header.kid)
  } catch (error) {
    log('error', 'Plaid verification key fetch failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }

  if (key.alg && key.alg !== 'ES256') return false
  if (key.expired) return false

  try {
    const publicKey = createPublicKey({ key, format: 'jwk' })
    const signature = base64UrlDecode(parts[2])
    const data = Buffer.from(`${parts[0]}.${parts[1]}`)

    return verify(
      'sha256',
      data,
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      signature,
    )
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const jwt = request.headers.get('Plaid-Verification')

  if (!jwt) {
    log('warn', 'Plaid webhook missing verification')
    return Response.json({ error: 'missing verification' }, { status: 401 })
  }

  const rawBody = Buffer.from(await request.arrayBuffer())

  let verified = false

  try {
    verified = await verifyPlaidWebhook(jwt, rawBody)
  } catch (error) {
    log('error', 'Plaid webhook verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  if (!verified) {
    return Response.json({ error: 'invalid verification' }, { status: 401 })
  }

  let body: unknown

  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = WebhookSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { error: 'invalid payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const event = parsed.data
  const eventId =
    event.webhook_id ||
    event.request_id ||
    `${event.webhook_type || 'unknown'}-${event.webhook_code || 'unknown'}-${Date.now()}`

  if (receivedEvents.has(eventId)) {
    log('info', 'duplicate Plaid webhook', { eventId })

    return Response.json({ received: true, duplicate: true })
  }

  receivedEvents.set(eventId, new Date().toISOString())

  log('info', 'Plaid webhook received', {
    eventId,
    type: event.webhook_type,
    code: event.webhook_code,
  })

  return Response.json({ received: true })
}

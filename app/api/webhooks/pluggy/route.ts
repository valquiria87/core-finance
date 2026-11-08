import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getPluggyAccounts, getPluggyTransactions } from '@/lib/pluggy'
import { createPluggySnapshot } from '@/lib/pluggy-adapter'
import { saveFinanceSnapshot } from '@/lib/save-finance-snapshot'
import { sendWebhookFailureAlert } from '@/lib/webhook-alert-email'

export const runtime = 'nodejs'

const PROCESSING_LEASE_MS = 5 * 60 * 1000

const PluggyWebhookSchema = z.object({
  event: z.string().min(1),
  eventId: z.string().min(1),
  clientId: z.string().min(1),
  itemId: z.string().optional(),
  transactionIds: z.array(z.string()).optional(),
  triggeredBy: z.string().optional(),
}).passthrough()

function secretMatches(received: string | null, expected: string) {
  if (!received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function updateOwnedEvent(
  eventId: string,
  claimTimestamp: string,
  values: Record<string, unknown>,
) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('webhook_events')
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)
    .eq('status', 'processing')
    .eq('updated_at', claimTimestamp)
    .select('event_id')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function claimRetry(
  eventId: string,
  existing: { status: string; attempts: number; updated_at: string },
  claimedAt: string,
) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('webhook_events')
    .update({
      status: 'processing',
      attempts: existing.attempts + 1,
      error_code: null,
      error_message: null,
      updated_at: claimedAt,
    })
    .eq('event_id', eventId)
    .eq('status', existing.status)
    .eq('updated_at', existing.updated_at)
    .select('event_id')
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function POST(request: Request) {
  const expectedSecret = process.env.PLUGGY_WEBHOOK_SECRET
  const expectedClientId = process.env.PLUGGY_CLIENT_ID
  const configuredItemId = process.env.PLUGGY_ITEM_ID

  if (!expectedSecret || !expectedClientId || !configuredItemId) {
    return Response.json({ error: 'webhook not configured' }, { status: 503 })
  }

  if (!secretMatches(request.headers.get('x-pluggy-webhook-secret'), expectedSecret)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > 64 * 1024) {
    return Response.json({ error: 'payload too large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const parsed = PluggyWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'invalid payload' }, { status: 400 })
  }

  const event = parsed.data

  if (event.clientId !== expectedClientId) {
    return Response.json({ error: 'client mismatch' }, { status: 401 })
  }

  if (event.itemId && event.itemId !== configuredItemId) {
    return Response.json({ received: true, ignored: true })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const claimTimestamp = new Date().toISOString()

  const { error: insertError } = await supabaseAdmin
    .from('webhook_events')
    .insert({
      event_id: event.eventId,
      event_type: event.event,
      item_id: event.itemId ?? configuredItemId,
      status: 'processing',
      attempts: 1,
      updated_at: claimTimestamp,
    })

  if (insertError) {
    if (insertError.code !== '23505') {
      console.error('[Pluggy webhook] Event registration failed:', insertError)
      return Response.json({ error: 'event registration failed' }, { status: 500 })
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('webhook_events')
      .select('status, attempts, updated_at')
      .eq('event_id', event.eventId)
      .maybeSingle()

    if (lookupError || !existing) {
      return Response.json({ error: 'event lookup failed' }, { status: 500 })
    }

    if (existing.status === 'completed' || existing.status === 'ignored') {
      return Response.json({ received: true, duplicate: true })
    }

    if (existing.status === 'processing') {
      const lastUpdate = Date.parse(existing.updated_at)
      const age = Date.now() - lastUpdate

      if (!Number.isFinite(lastUpdate) || age < PROCESSING_LEASE_MS) {
        return Response.json({ received: true, duplicate: true })
      }
    } else if (existing.status !== 'failed') {
      return Response.json({ received: true, duplicate: true })
    }

    let claimed: boolean
    try {
      claimed = await claimRetry(event.eventId, existing, claimTimestamp)
    } catch (retryError) {
      console.error('[Pluggy webhook] Event retry claim failed:', retryError)
      return Response.json({ error: 'event retry failed' }, { status: 500 })
    }

    if (!claimed) {
      return Response.json({ received: true, duplicate: true })
    }
  }

  try {
    console.info('[Pluggy webhook] Refreshing item', {
      event: event.event,
      eventId: event.eventId,
      itemId: configuredItemId,
    })

    const accounts = await getPluggyAccounts()
    const transactionsByAccount = await Promise.all(
      accounts.map((account: any) => getPluggyTransactions(account.id)),
    )

    const snapshot = createPluggySnapshot(accounts, transactionsByAccount)

    await saveFinanceSnapshot(configuredItemId, snapshot)

    const completed = await updateOwnedEvent(event.eventId, claimTimestamp, {
      status: 'completed',
      processed_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    })

    if (!completed) {
      console.warn('[Pluggy webhook] Processing lease lost before completion:', event.eventId)
    }

    return Response.json({ received: true, synced: true })
  } catch (error) {
    console.error('[Pluggy webhook] Sync failed:', error)

    try {
      const markedFailed = await updateOwnedEvent(event.eventId, claimTimestamp, {
        status: 'failed',
        error_code: 'SYNC_FAILED',
        error_message: error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Unknown synchronization error',
      })

      if (!markedFailed) {
        console.warn('[Pluggy webhook] Processing lease lost before failure update:', event.eventId)
      }
    } catch (updateError) {
      console.error('[Pluggy webhook] Failed to update event status:', updateError)
    }

    try {
      await sendWebhookFailureAlert({
        eventId: event.eventId,
        eventType: event.event,
        errorMessage: error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Unknown synchronization error',
      })
    } catch (alertError) {
      console.error('[Pluggy webhook] Failure email could not be sent:', alertError)
    }

    return Response.json({ error: 'sync failed' }, { status: 500 })
  }
}

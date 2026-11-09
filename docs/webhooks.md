# Webhooks

## Pluggy Sandbox integration

The deployed Next.js application receives Pluggy notifications at:

`POST /api/webhooks/pluggy`

The route is implemented in `app/api/webhooks/pluggy/route.ts`. It is part of the Next.js application deployed on Vercel; the separate Express prototype under `backend/` is not used by this route.

### Request validation

Before accessing Supabase or the Pluggy API, the route:

1. Requires `PLUGGY_WEBHOOK_SECRET`, `PLUGGY_CLIENT_ID`, and `PLUGGY_ITEM_ID`.
2. Compares the `x-pluggy-webhook-secret` header against the configured secret using a timing-safe comparison.
3. Rejects request bodies larger than 64 KiB (measured in UTF-8 bytes).
4. Parses JSON and validates required event fields with Zod.
5. Verifies that the notification `clientId` matches the configured Pluggy client.
6. Acknowledges and ignores notifications for a different Item ID.

The shared secret header authenticates possession of the configured secret. It is **not** a cryptographic HMAC signature over the raw request body. Do not describe this integration as signed-body verification.

### Event idempotency and processing lease

Webhook event IDs are stored in the Supabase `webhook_events` table.

- A new event is inserted with status `processing` and attempt count 1. The database unique constraint on the event ID prevents duplicate initial claims.
- Events already marked `completed` or `ignored` are acknowledged as duplicates.
- An event in `processing` with an update timestamp less than five minutes old is treated as actively owned and is not processed again.
- A stale `processing` event or a `failed` event can be retried.
- Retry acquisition is a compare-and-set update: it only succeeds if the stored status and `updated_at` still match the values read. If another request has already claimed the event, the update affects no row and the request exits as a duplicate.
- Completion and failure updates are also conditional on the event still being `processing` with the exact claim timestamp. An older invocation therefore cannot overwrite the status written by a newer claim.

The claim timestamp acts as a lightweight lease token without adding a new database column. The five-minute lease is a recovery mechanism, not a durable queue or a guarantee that processing will never overlap if an invocation runs longer than the lease.

### Synchronization flow

After claiming an event, the route:

1. Retrieves the configured Pluggy Item's accounts.
2. Retrieves transactions for each account.
3. Converts provider responses into the internal `SandboxSnapshot` model.
4. Saves the snapshot in Supabase using `saveFinanceSnapshot`.
5. Marks the event `completed`.

If synchronization or snapshot persistence fails, the route records status `failed`, error code `SYNC_FAILED`, and a bounded error message. The webhook provider receives HTTP 500 so that its delivery retry policy can be applied.

### Configuration

Configure these variables only in the server environment:

```env
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
PLUGGY_ITEM_ID=
PLUGGY_WEBHOOK_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
ALERT_EMAIL_TO=
```

The custom header configured in the Pluggy webhook registration must be named `x-pluggy-webhook-secret` and carry the same secret as `PLUGGY_WEBHOOK_SECRET`.

Never commit real values or expose them through `NEXT_PUBLIC_*` variables.

## Registering the Pluggy webhook

Use scripts/register-pluggy-webhook.mjs to create the webhook if it does not exist or update the existing matching webhook. The script registers the all event for the production endpoint only.

Required environment variables:

- PLUGGY_CLIENT_ID
- PLUGGY_CLIENT_SECRET
- PLUGGY_WEBHOOK_SECRET
- PLUGGY_WEBHOOK_URL — must be exactly https://core-finance-nine.vercel.app/api/webhooks/pluggy; Preview URLs are rejected.

Optional:

- VERCEL_AUTOMATION_BYPASS_SECRET — when set, the script adds x-vercel-protection-bypass to the custom headers sent to Pluggy. When absent, that header is omitted.

Copy .env.example to .env.local, set the values locally, then run from the repository root:

    node --env-file=.env.local scripts/register-pluggy-webhook.mjs

The script authenticates with Pluggy, searches for a matching URL and event: all, then uses PATCH to update it or POST to create it. Never commit .env.local or share its values. The bypass secret is optional and should only be configured when the production deployment's protection requires it.
## Automated coverage

Run:

```bash
node --test tests/pluggy-webhook.test.js
```

The test suite covers missing configuration, missing/incorrect secret, malformed JSON, invalid payload, request-size limit, client and Item ID checks, successful synchronization, completed-event deduplication, failed-event retry, stale processing recovery, active-lease protection, and protection against an expired invocation overwriting a newer claim.

The tests use mocked Supabase and Pluggy dependencies. They do not constitute a live end-to-end test against the Pluggy provider or the hosted Supabase project.

## Remaining hardening

- Exact re-deliveries with the same `eventId` are deduplicated persistently. This is the replay protection supported by the current Pluggy event contract; it does not authenticate the body contents. The provider documentation does not currently describe a signed timestamp/nonce or HMAC mechanism. Revisit this only if Pluggy documents a stronger signing scheme.
- Consider a durable queue and lease renewal for processing that may exceed five minutes.
- Add monitoring for events that remain in `processing` or repeatedly enter `failed`.
- Keep provider credentials and database administrative keys server-side.
- Do not send notifications by SMS, WhatsApp, or push: those delivery channels are not implemented in this repository.


## Database access controls

The migration `supabase/migrations/20261108053306_revoke_public_execute_rls_auto_enable.sql` revokes `EXECUTE` on the internal `public.rls_auto_enable()` `SECURITY DEFINER` event-trigger function from `PUBLIC`, `anon`, and `authenticated`. The `ensure_rls` event trigger remains enabled. The database check confirmed that the function remains executable by its owner only and that the trigger is still active.

`finance_snapshots` and `webhook_events` have RLS enabled, no client policies, and service-role-only table grants. The `webhook_event_health` view uses `security_invoker=true` and has a service-role-only SELECT grant. These no-policy RLS findings are intentional deny-by-default controls for the current server-only data path.

## Public API rate limiting

The public demo endpoints use a centralized fixed-window limiter backed by Supabase. The database migration `supabase/migrations/20261108053441_create_api_rate_limits.sql` creates `public.api_rate_limits` and the atomic `public.consume_api_rate_limit()` function. RLS is enabled, client roles have no table access or function execution, and only `service_role` can consume a bucket.

- `POST /api/core`: 20 requests per client IP per 60 seconds.
- `GET /api/sandbox`: 60 requests per client IP per 60 seconds.
- `GET /api/insights`: 60 requests per client IP per 60 seconds.

The application reads Vercel's `x-real-ip` request header and stores only an HMAC-SHA256 digest of the address, keyed with the server-side Supabase secret. Raw IP addresses are not persisted in the rate-limit table. Excess requests receive HTTP 429 and a `Retry-After` header. If the limiter database call fails, the endpoints fail closed with HTTP 503 rather than silently disabling the limit.

This is application-level rate limiting, not a substitute for Vercel Firewall/WAF rules or abuse monitoring. The limits are starting values for the fictional-data portfolio demo and should be tuned from traffic observations.

## Operational health view in Supabase

The migration `supabase/migrations/20261108035607_create_webhook_health_view.sql` creates `public.webhook_event_health`, a one-row aggregate view for operational checks.

Open the Supabase project, go to **Table Editor**, and select `webhook_event_health`. The view reports:

- Total, completed, failed, and processing events.
- Processing events whose lease is older than five minutes.
- Total attempts and the highest attempt count for one event.
- Timestamps for the latest event, latest completion, latest failure, and oldest processing event.
- `health_status`: `ok`, `attention`, or `no_events`.

The view exposes aggregate metrics only; it does not include event IDs, raw payloads, or error messages. Its grants revoke access from `PUBLIC`, `anon`, and `authenticated`, and allow `service_role` to read it. The view uses `security_invoker = true` so underlying table permissions and RLS remain in effect.

The five-minute stale threshold matches the webhook processing lease. A failed event or stale processing event changes the health status to `attention`. The view is read-only and does not retry, modify, or delete events.

To inspect the current aggregate in SQL Editor:

```sql
select * from public.webhook_event_health;
```

This is a database health summary, not an alerting service: scheduled notifications and external monitoring are not configured.

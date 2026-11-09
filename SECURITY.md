# Security Policy

## Supported scope

Core Finance is a portfolio project that currently uses fictional Pluggy Sandbox data. It is not intended for production banking workloads or real customer financial data.

## Implemented webhook controls

The deployed Next.js application uses the Pluggy webhook only. Plaid is limited to the MCP/Sandbox learning lab and the separate Express prototype in backend/; there is no Plaid webhook route in the Next.js application. The Express prototype retains its ES256 signature-verification example and is not the deployed webhook runtime.

The Pluggy webhook at `POST /api/webhooks/pluggy` currently implements:

- A configured shared secret in the `x-pluggy-webhook-secret` header, compared with a timing-safe equality check.
- Validation of the expected Pluggy `clientId`.
- Zod schema validation for the event payload.
- A 64 KiB request-body limit.
- Event ID deduplication backed by the database unique constraint.
- A five-minute processing lease for stale-event recovery.
- Conditional compare-and-set updates using the event status and claim timestamp, preventing an older worker from overwriting a newer claim.
- Failure tracking in Supabase and optional Gmail SMTP notification when synchronization fails.

The shared secret header is **not** a cryptographic HMAC signature of the raw request body.

## Known gaps and risks

- Pluggy's documented webhook verification uses configured custom headers and `clientId`; its current documentation does not describe HMAC signatures or a signed timestamp/nonce.
- Exact event replays are blocked by persistent `eventId` deduplication and the database unique constraint. This does not provide cryptographic body integrity or prevent a forged payload with a new event ID if the shared secret is compromised.
- `/api/core` is limited to 20 requests per IP per 60-second window; `/api/sandbox` and `/api/insights` are limited to 60 requests per IP per 60-second window. Limits are enforced atomically in Supabase across serverless instances. The public routes still expose fictional Sandbox data only; do not expose real financial data through them.
- The snapshot, webhook-event, and API rate-limit tables are RLS-enabled, have no client policies, and grant data access only to `service_role`; the operational health view uses `security_invoker=true` and is also service-role-only.
- User-scoped `accounts`, `transactions`, and `pluggy_items` tables have RLS enabled and owner-scoped SELECT policies, but currently have no table privileges granted to `anon`, `authenticated`, or `service_role`; they are not part of the active snapshot read/write path.
- The internal `public.rls_auto_enable()` event-trigger function is `SECURITY DEFINER`. EXECUTE has been revoked from `PUBLIC`, `anon`, and `authenticated`; the `ensure_rls` event trigger remains enabled and its owner retains execution.
- Administrative server access uses a privileged secret; it must never be exposed to the browser.
- Webhook processing is synchronous and has no durable queue.
- The health view is an aggregate operational signal, not an intrusion-detection or replay-prevention system.
- Sandbox data is fictional and does not establish production readiness.

## Secrets

Never commit `.env.local`, `.env.preview.local`, provider credentials, Supabase secrets, Gmail App Passwords, access tokens, or secrets embedded in screenshots.

Required server-side secrets may include:

- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `PLUGGY_ITEM_ID`
- `PLUGGY_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `ALERT_EMAIL_TO`

Rotate any credential that may have been exposed.

## Reporting a vulnerability

Please do not disclose vulnerabilities in public issues. To activate the private channel, open the repository **Settings > Code security and analysis > Private vulnerability reporting > Enable**. This local documentation change does not change the GitHub repository setting; activation must be confirmed in GitHub. Once enabled, use that channel to report a suspected security issue. Include the affected route/component, reproduction steps, and potential impact; do not include live credentials or personal financial data.

This repository is a learning/portfolio project. There is no guaranteed security response SLA.

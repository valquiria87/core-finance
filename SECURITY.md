# Security Policy

## Supported scope

Core Finance is a portfolio project that currently uses fictional Pluggy Sandbox data. It is not intended for production banking workloads or real customer financial data.

## Implemented webhook controls

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

- No HMAC request-body signature verification.
- No dedicated replay-protection mechanism (for example, a verified timestamp/nonce window).
- `/api/core` and `/api/sandbox` are publicly reachable application routes and currently have no rate limiting. Do not expose real financial data through them.
- Some error paths may expose diagnostic details to clients. Normalize public API errors and keep provider/database internals in server logs only.
- Reconfirm Row Level Security (RLS), grants, and policies for every Supabase table and view. Administrative server access uses a privileged secret; it must never be exposed to the browser.
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

require('dotenv').config();
const express = require('express');
const { z } = require('zod');
const path = require('path');
const { detectSubscriptions, detectAnomalies, predictMonthEnd, loadTransactions } = require('./insights');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const DATA_PATH = path.join(__dirname, '..', 'data', 'transactions_labeled.json');

// Structured logger
function log(level, message, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }));
}

// Retry helper
async function withRetry(fn, retries = 3, delayMs = 200) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      log('warn', 'retry', { attempt: i + 1, error: err.message });
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

const receivedEvents = new Map();

const WebhookSchema = z.object({
  webhook_type: z.string().optional(),
  webhook_code: z.string().optional(),
  webhook_id: z.string().optional(),
  request_id: z.string().optional(),
}).passthrough();

function isDuplicate(eventId) {
  return receivedEvents.has(eventId);
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'core-finance-webhook' });
});

app.post('/webhooks/plaid', (req, res) => {
  const parsed = WebhookSchema.safeParse(req.body || {});
  if (!parsed.success) {
    log('error', 'invalid webhook payload', { issues: parsed.error.issues });
    return res.status(400).json({ error: 'invalid payload', details: parsed.error.issues });
  }
  const body = parsed.data;
  const eventId = body.webhook_id || body.request_id || `${body.webhook_type || 'unknown'}-${body.webhook_code || 'unknown'}-${Date.now()}`;

  if (isDuplicate(eventId)) {
    log('info', 'duplicate webhook', { eventId });
    return res.status(200).json({ received: true, duplicate: true });
  }

  receivedEvents.set(eventId, { receivedAt: new Date().toISOString(), body });
  log('info', 'webhook received', { eventId, type: body.webhook_type, code: body.webhook_code });

  res.status(200).json({ received: true });

  // Async processing placeholder (Etapa 2).
});

app.get('/webhooks/events', (req, res) => {
  res.json({ count: receivedEvents.size, events: [...receivedEvents.entries()] });
});

app.get('/insights', async (req, res) => {
  try {
    const txs = await withRetry(() => Promise.resolve(loadTransactions(DATA_PATH)));
    res.json({
      subscriptions: detectSubscriptions(txs),
      anomalies: detectAnomalies(txs),
      monthEnd: predictMonthEnd(txs),
    });
  } catch (err) {
    log('error', 'insights failed', { error: err.message });
    res.status(500).json({ error: 'insights failed' });
  }
});

// Observability page
app.use('/observability', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  log('info', 'server started', { port: PORT });
});

require('dotenv').config();
const express = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const path = require('path');

const PLAID_BASE_URL = process.env.PLAID_BASE_URL || 'https://sandbox.plaid.com';
const { detectSubscriptions, detectAnomalies, predictMonthEnd, loadTransactions } = require('./insights');

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

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

function isDuplicate(eventId) {
  return receivedEvents.has(eventId);
}

const WebhookSchema = z.object({
  webhook_type: z.string().optional(),
  webhook_code: z.string().optional(),
  webhook_id: z.string().optional(),
  request_id: z.string().optional(),
}).passthrough();

function base64UrlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function fetchVerificationKey(keyId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      key_id: keyId,
    });
    const url = new URL('/webhook_verification_key/get', PLAID_BASE_URL);
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('key fetch failed: ' + res.statusCode));
        }
        try {
          const parsed = JSON.parse(body);
          if (!parsed || !parsed.key) return reject(new Error('invalid key response'));
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function verifyPlaidWebhook(jwt, rawBody) {
  const parts = jwt.split('.');
  if (parts.length !== 3) return false;
  let header, payload;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
  } catch (e) { return false; }
  if (header.alg !== 'ES256' || !header.kid) return false;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat !== 'number') return false;
  if (payload.iat > now + 60) return false;
  if (now - payload.iat > 300) return false;
  if (typeof payload.request_body_sha256 !== 'string') return false;
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const expected = Buffer.from(payload.request_body_sha256, 'hex');
  const actual = Buffer.from(bodyHash, 'hex');
  if (expected.length !== actual.length) return false;
  if (!crypto.timingSafeEqual(expected, actual)) { console.error('HASH_MISMATCH'); return false; }
  let keyResp;
  try { keyResp = await fetchVerificationKey(header.kid); } catch (e) { console.error('KEYFETCH_FAIL', e.message); return false; }
  if (!keyResp || !keyResp.key) { console.error('NO_KEY'); return false; }
  if (keyResp.key.alg && keyResp.key.alg !== 'ES256') return false;
  if (keyResp.key.expired) return false;
  let publicKey;
  try { publicKey = crypto.createPublicKey({ key: keyResp.key, format: 'jwk' }); } catch (e) { return false; }
  const signature = base64UrlDecode(parts[2]);
  const data = Buffer.from(parts[0] + '.' + parts[1]);
  try {
    return crypto.verify('sha256', data, { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  } catch (e) { return false; }
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'core-finance-webhook' });
});

app.post('/webhooks/plaid', async (req, res) => {
  const jwt = req.get('Plaid-Verification');
  if (!jwt) {
    log('warn', 'webhook missing verification');
    return res.status(401).json({ error: 'missing verification' });
  }
  let verified = false;
  try {
    verified = await verifyPlaidWebhook(jwt, req.rawBody || Buffer.from(''));
  } catch (err) {
    log('error', 'webhook verification failed', { error: err.message });
    verified = false;
  }
  if (!verified) {
    return res.status(401).json({ error: 'invalid verification' });
  }
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

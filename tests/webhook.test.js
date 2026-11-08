const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function startServer(port, envExtra) {
  const proc = spawn('node', ['server.js'], {
    cwd: __dirname + '/../backend',
    env: { ...process.env, PORT: String(port), PLAID_CLIENT_ID: 'test', PLAID_SECRET: 'test', ...envExtra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return proc;
}

async function waitForPort(port, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port, path: '/health', method: 'GET' }, (res) => { res.resume(); resolve(); });
        req.on('error', reject);
        req.end();
      });
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('server not ready');
}

async function postWebhook(port, body, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/webhooks/plaid', method: 'POST', headers: { 'Content-Type': 'application/json', ...(headers || {}) } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function makeKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  return { publicKey, privateKey, jwk };
}

function signToken(privateKey, header, payload) {
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const data = Buffer.from(h + '.' + p);
  const sig = crypto.sign('sha256', data, { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return h + '.' + p + '.' + b64url(sig);
}


test('webhook rejects missing verification', async () => {
  const port = 3101;
  const proc = startServer(port, {});
  try {
    await waitForPort(port);
    const body = { webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' };
    const res = await postWebhook(port, body, {});
    assert.strictEqual(res.status, 401);
  } finally {
    proc.kill();
  }
});

test('webhook accepts valid signature', async () => {
  const port = 3102;
  const keyPort = 3103;
  const { privateKey, jwk } = makeKeys();
  const kid = 'test-key';
  const keyServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ key: { ...jwk, kid, alg: 'ES256' } }));
    });
  }).listen(keyPort);
  const body = { webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' };
  const raw = Buffer.from(JSON.stringify(body));
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const token = signToken(privateKey, { alg: 'ES256', kid, typ: 'JWT' }, { iat: now, request_body_sha256: bodyHash });
  const proc = startServer(port, { PLAID_BASE_URL: 'http://127.0.0.1:' + keyPort });
  try {
    await waitForPort(port);
    const res = await postWebhook(port, body, { 'Plaid-Verification': token });
    assert.strictEqual(res.status, 200);
  } finally {
    proc.kill();
    keyServer.close();
  }
});

test('webhook rejects invalid signature', async () => {
  const port = 3104;
  const keyPort = 3105;
  const { jwk } = makeKeys();
  const other = makeKeys();
  const kid = 'test-key';
  const keyServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ key: { ...jwk, kid, alg: 'ES256' } }));
    });
  }).listen(keyPort);
  const body = { webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' };
  const raw = Buffer.from(JSON.stringify(body));
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const token = signToken(other.privateKey, { alg: 'ES256', kid, typ: 'JWT' }, { iat: now, request_body_sha256: bodyHash });
  const proc = startServer(port, { PLAID_BASE_URL: 'http://127.0.0.1:' + keyPort });
  try {
    await waitForPort(port);
    const res = await postWebhook(port, body, { 'Plaid-Verification': token });
    assert.strictEqual(res.status, 401);
  } finally {
    proc.kill();
    keyServer.close();
  }
});

test('webhook rejects tampered body', async () => {
  const port = 3106;
  const keyPort = 3107;
  const { privateKey, jwk } = makeKeys();
  const kid = 'test-key';
  const keyServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ key: { ...jwk, kid, alg: 'ES256' } }));
    });
  }).listen(keyPort);
  const body = { webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' };
  const tampered = { webhook_type: 'TRANSACTIONS', webhook_code: 'HACKED' };
  const raw = Buffer.from(JSON.stringify(body));
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const token = signToken(privateKey, { alg: 'ES256', kid, typ: 'JWT' }, { iat: now, request_body_sha256: bodyHash });
  const proc = startServer(port, { PLAID_BASE_URL: 'http://127.0.0.1:' + keyPort });
  try {
    await waitForPort(port);
    const res = await postWebhook(port, tampered, { 'Plaid-Verification': token });
    assert.strictEqual(res.status, 401);
  } finally {
    proc.kill();
    keyServer.close();
  }
});

test('webhook rejects expired token', async () => {
  const port = 3108;
  const keyPort = 3109;
  const { privateKey, jwk } = makeKeys();
  const kid = 'test-key';
  const keyServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ key: { ...jwk, kid, alg: 'ES256' } }));
    });
  }).listen(keyPort);
  const body = { webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' };
  const raw = Buffer.from(JSON.stringify(body));
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const token = signToken(privateKey, { alg: 'ES256', kid, typ: 'JWT' }, { iat: now - 400, request_body_sha256: bodyHash });
  const proc = startServer(port, { PLAID_BASE_URL: 'http://127.0.0.1:' + keyPort });
  try {
    await waitForPort(port);
    const res = await postWebhook(port, body, { 'Plaid-Verification': token });
    assert.strictEqual(res.status, 401);
  } finally {
    proc.kill();
    keyServer.close();
  }
});

test('webhook rejects future timestamp', async () => {
  const port = 3110;
  const keyPort = 3111;
  const { privateKey, jwk } = makeKeys();
  const kid = 'test-key';
  const keyServer = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ key: { ...jwk, kid, alg: 'ES256' } }));
    });
  }).listen(keyPort);
  const body = { webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' };
  const raw = Buffer.from(JSON.stringify(body));
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const token = signToken(privateKey, { alg: 'ES256', kid, typ: 'JWT' }, { iat: now + 1000, request_body_sha256: bodyHash });
  const proc = startServer(port, { PLAID_BASE_URL: 'http://127.0.0.1:' + keyPort });
  try {
    await waitForPort(port);
    const res = await postWebhook(port, body, { 'Plaid-Verification': token });
    assert.strictEqual(res.status, 401);
  } finally {
    proc.kill();
    keyServer.close();
  }
});

test('webhook rejects key fetch failure', async () => {
  const port = 3112;
  const keyPort = 3113;
  const { privateKey } = makeKeys();
  const kid = 'test-key';
  const keyServer = http.createServer((req, res) => {
    res.statusCode = 500;
    res.end('error');
  }).listen(keyPort);
  const body = { webhook_type: 'TRANSACTIONS', webhook_code: 'DEFAULT_UPDATE' };
  const raw = Buffer.from(JSON.stringify(body));
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const token = signToken(privateKey, { alg: 'ES256', kid, typ: 'JWT' }, { iat: now, request_body_sha256: bodyHash });
  const proc = startServer(port, { PLAID_BASE_URL: 'http://127.0.0.1:' + keyPort });
  try {
    await waitForPort(port);
    const res = await postWebhook(port, body, { 'Plaid-Verification': token });
    assert.strictEqual(res.status, 401);
  } finally {
    proc.kill();
    keyServer.close();
  }
});

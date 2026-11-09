const webhookUrl = process.env.PLUGGY_WEBHOOK_URL?.trim();

if (!webhookUrl) {
  throw new Error(
    'PLUGGY_WEBHOOK_URL é obrigatória. Defina a URL HTTPS de produção do webhook antes de executar este script.',
  );
}

let parsedWebhookUrl;
try {
  parsedWebhookUrl = new URL(webhookUrl);
} catch {
  throw new Error('PLUGGY_WEBHOOK_URL precisa ser uma URL absoluta válida.');
}

if (
  parsedWebhookUrl.protocol !== 'https:' ||
  parsedWebhookUrl.pathname !== '/api/webhooks/pluggy' ||
  parsedWebhookUrl.port !== '' ||
  parsedWebhookUrl.search !== '' ||
  parsedWebhookUrl.hash !== '' ||
  parsedWebhookUrl.hostname !== 'core-finance-nine.vercel.app'
) {
  throw new Error(
    'PLUGGY_WEBHOOK_URL deve apontar para https://core-finance-nine.vercel.app/api/webhooks/pluggy (domínio de produção), nunca para um Preview.',
  );
}

const { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, PLUGGY_WEBHOOK_SECRET } =
  process.env;

if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET || !PLUGGY_WEBHOOK_SECRET) {
  throw new Error(
    'Configure PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET e PLUGGY_WEBHOOK_SECRET no ambiente.',
  );
}

const auth = await fetch('https://api.pluggy.ai/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: PLUGGY_CLIENT_ID,
    clientSecret: PLUGGY_CLIENT_SECRET,
  }),
});

if (!auth.ok) {
  throw new Error(`Falha na autenticação Pluggy: HTTP ${auth.status}`);
}

const { apiKey } = await auth.json();
const apiHeaders = {
  'Content-Type': 'application/json',
  'X-API-KEY': apiKey,
};

const webhookHeaders = {
  'x-pluggy-webhook-secret': PLUGGY_WEBHOOK_SECRET,
};

if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  webhookHeaders['x-vercel-protection-bypass'] =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

const list = await fetch('https://api.pluggy.ai/webhooks', {
  headers: apiHeaders,
});

if (!list.ok) {
  throw new Error(`Falha ao consultar webhooks Pluggy: HTTP ${list.status}`);
}

const data = await list.json();
const hooks = Array.isArray(data.results) ? data.results : [];
const existing = hooks.find(
  (item) => item.url === webhookUrl && item.event === 'all',
);

const payload = {
  url: webhookUrl,
  event: 'all',
  headers: webhookHeaders,
  enabled: true,
};

const endpoint = existing
  ? `https://api.pluggy.ai/webhooks/${existing.id}`
  : 'https://api.pluggy.ai/webhooks';

const response = await fetch(endpoint, {
  method: existing ? 'PATCH' : 'POST',
  headers: apiHeaders,
  body: JSON.stringify(payload),
});

const result = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(
    `Falha ao ${existing ? 'atualizar' : 'criar'} webhook Pluggy: HTTP ${response.status} ${result.message || ''}`.trim(),
  );
}

console.log(existing ? 'Webhook Pluggy atualizado.' : 'Webhook Pluggy criado.');
console.log('URL:', webhookUrl);
console.log('Evento:', result.event || 'all');
console.log('ID:', result.id);
console.log('Cabeçalhos configurados:', Object.keys(webhookHeaders).join(', '));

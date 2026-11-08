const auth = await fetch("https://api.pluggy.ai/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET
  })
});

if (!auth.ok) throw new Error(`Autenticação: ${auth.status}`);

const { apiKey } = await auth.json();
const apiHeaders = {
  "Content-Type": "application/json",
  "X-API-KEY": apiKey
};

const url = "https://core-finance-jnfc7iel5-nexora-finance2.vercel.app/api/webhooks/pluggy";

const list = await fetch("https://api.pluggy.ai/webhooks", {
  headers: apiHeaders
});

if (!list.ok) throw new Error(`Consulta: ${list.status}`);

const data = await list.json();
const hook = data.results.find(w => w.url === url && w.event === "all");

if (!hook) throw new Error("Webhook existente não encontrado.");

const update = await fetch(`https://api.pluggy.ai/webhooks/${hook.id}`, {
  method: "PATCH",
  headers: apiHeaders,
  body: JSON.stringify({
    headers: {
      "x-pluggy-webhook-secret": process.env.PLUGGY_WEBHOOK_SECRET,
      "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    },
    enabled: true
  })
});

const result = await update.json().catch(() => ({}));

if (!update.ok) {
  throw new Error(`Atualização: ${update.status} ${result.message || ""}`);
}

console.log("Webhook atualizado.");
console.log("Evento:", result.event);
console.log("ID:", result.id);
console.log("Cabeçalhos configurados:", Object.keys(result.headers || {}).join(", "));
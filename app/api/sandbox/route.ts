import { getSandboxSnapshot } from '@/lib/mock-data'

/**
 * Etapa 1: devolve dados fictícios no formato da sandbox Plaid.
 * Etapa 2: buscar no backend/ (com PLAID_CLIENT_ID/PLAID_SECRET apenas no servidor)
 * e invalidar o cache quando o webhook de novas transações chegar (ver docs/webhooks.md).
 */
export async function GET() {
  await new Promise((r) => setTimeout(r, 600))
  return Response.json(getSandboxSnapshot())
}

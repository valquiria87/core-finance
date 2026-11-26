import { answer } from './core-engine'
import { getFinanceSnapshotViaMcp } from './mcp-finance'
import { getPlaidSnapshot } from './plaid'
import type { SandboxSnapshot } from './types'

type SnapshotLoader = () => Promise<SandboxSnapshot>

export function createCorePost(loadSnapshot: SnapshotLoader = getFinanceSnapshotViaMcp) {
  return async function POST(req: Request) {
    const body = (await req.json().catch(() => null)) as { message?: unknown } | null
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 500) : ''

    if (!message) {
      return Response.json(
        { blocks: [{ type: 'text', text: 'Não recebi sua pergunta. Escreva uma pergunta sobre saldo ou transações.' }] },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    try {
      return Response.json(
        { blocks: answer(message, await loadSnapshot()) },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    } catch {
      console.error('Core Plaid snapshot request failed')
      return Response.json(
        { blocks: [{ type: 'text', text: 'Não foi possível consultar os dados financeiros do Plaid Sandbox.' }] },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }
}

export function createSandboxGet(loadSnapshot: SnapshotLoader = getPlaidSnapshot) {
  return async function GET() {
    try {
      return Response.json(await loadSnapshot(), { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      console.error('Plaid sandbox snapshot request failed')
      return Response.json(
        { error: 'Não foi possível carregar os dados do Plaid Sandbox.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }
}

import { answer } from '@/lib/core-engine'
import { getSavedFinanceSnapshot } from '@/lib/get-finance-snapshot'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    message?: unknown
  } | null

  const message =
    typeof body?.message === 'string'
      ? body.message.trim().slice(0, 500)
      : ''

  if (!message) {
    return Response.json(
      {
        blocks: [
          {
            type: 'text',
            text: 'Não recebi sua pergunta. Escreva algo como “qual é meu saldo?”.',
          },
        ],
      },
      { status: 400 },
    )
  }

  try {
    const snapshot = await getSavedFinanceSnapshot()

    return Response.json(
      { blocks: answer(message, snapshot) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Core saved snapshot failed:', error)

    return Response.json(
      {
        blocks: [
          {
            type: 'text',
            text: 'Não foi possível consultar os dados financeiros sincronizados. Tente novamente após a próxima sincronização.',
          },
        ],
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

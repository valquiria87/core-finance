import { answer } from '@/lib/core-engine'
import { getSandboxSnapshot } from '@/lib/mock-data'

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { message?: unknown } | null
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 500) : ''

  if (!message) {
    return Response.json(
      { blocks: [{ type: 'text', text: 'Não recebi sua pergunta. Escreva algo como “qual é meu saldo?”.' }] },
      { status: 400 },
    )
  }

  await new Promise((r) => setTimeout(r, 450))
  return Response.json({ blocks: answer(message, getSandboxSnapshot()) })
}

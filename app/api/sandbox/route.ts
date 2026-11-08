import { enforceApiRateLimit } from '@/lib/api-rate-limit'
import { getSavedFinanceSnapshot } from '@/lib/get-finance-snapshot'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const rateLimitResponse = await enforceApiRateLimit(request, 'sandbox-snapshot', 60)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const snapshot = await getSavedFinanceSnapshot()

    return Response.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Saved finance snapshot failed:', error)

    return Response.json(
      {
        error: 'Não foi possível carregar os dados financeiros. Tente novamente após a próxima sincronização.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

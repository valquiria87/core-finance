import { getSavedFinanceSnapshot } from '@/lib/get-finance-snapshot'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const snapshot = await getSavedFinanceSnapshot()

    return Response.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Saved finance snapshot failed:', error)

    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Falha ao carregar dados financeiros salvos',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

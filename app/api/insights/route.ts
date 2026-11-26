import { enforceApiRateLimit } from '@/lib/api-rate-limit'
import { getSavedFinanceSnapshot } from '@/lib/get-finance-snapshot'
import { latestTransactionDate } from '@/lib/finance'
import {
  detectAnomalies,
  detectSubscriptions,
  predictMonthEnd,
} from '@/lib/insights'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const rateLimitResponse = await enforceApiRateLimit(request, 'finance-insights', 60)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const snapshot = await getSavedFinanceSnapshot()
    const transactions = snapshot.transactions
    const referenceDate = latestTransactionDate(transactions, snapshot.asOf)
    const referenceMonth = referenceDate.slice(0, 7)
    const currentDate = new Date()
    const currentMonth = [
      currentDate.getFullYear(),
      String(currentDate.getMonth() + 1).padStart(2, '0'),
    ].join('-')
    const isClosedMonth = referenceMonth < currentMonth

    return Response.json(
      {
        mode: snapshot.mode,
        asOf: snapshot.asOf,
        dataThrough: referenceDate,
        subscriptions: detectSubscriptions(transactions),
        anomalies: detectAnomalies(transactions),
        monthEnd: {
          ...predictMonthEnd(
            transactions,
            new Date(`${referenceDate}T12:00:00`),
          ),
          isClosedMonth,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Saved finance insights failed:', error)

    return Response.json(
      {
        error: 'Não foi possível calcular os indicadores financeiros. Tente novamente mais tarde.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

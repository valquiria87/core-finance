import { getSavedFinanceSnapshot } from '@/lib/get-finance-snapshot'
import { latestTransactionDate } from '@/lib/finance'
import {
  detectAnomalies,
  detectSubscriptions,
  predictMonthEnd,
} from '@/lib/insights'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const snapshot = await getSavedFinanceSnapshot()
    const transactions = snapshot.transactions
    const referenceDate = latestTransactionDate(transactions, snapshot.asOf)

    return Response.json(
      {
        mode: snapshot.mode,
        asOf: snapshot.asOf,
        dataThrough: referenceDate,
        subscriptions: detectSubscriptions(transactions),
        anomalies: detectAnomalies(transactions),
        monthEnd: predictMonthEnd(
          transactions,
          new Date(`${referenceDate}T12:00:00`),
        ),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Saved finance insights failed:', error)

    return Response.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Falha ao calcular indicadores financeiros',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

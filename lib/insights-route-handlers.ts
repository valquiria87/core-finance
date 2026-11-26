import { getPlaidSnapshot } from './plaid'
import { latestTransactionDate } from './finance'
import {
  detectAnomalies,
  detectSubscriptions,
  predictMonthEnd,
} from './insights'
import type { SandboxSnapshot } from './types'

type SnapshotLoader = () => Promise<SandboxSnapshot>

export function createInsightsGet(loadSnapshot: SnapshotLoader = getPlaidSnapshot) {
  return async function GET() {
    try {
      const snapshot = await loadSnapshot()
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
    } catch {
      console.error('Plaid finance insights request failed')

      return Response.json(
        { error: 'Falha ao calcular indicadores financeiros' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }
}

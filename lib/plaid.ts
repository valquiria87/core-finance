import { PlaidClient, PlaidEnvironment } from 'plaid'
import { createPlaidSnapshot } from './plaid-adapter'
import type { SandboxSnapshot } from './types'

export type PlaidDataClient = Pick<PlaidClient, 'accounts' | 'transactions'>

function getPlaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET
  const accessToken = process.env.PLAID_ACCESS_TOKEN
  const environment = process.env.PLAID_ENV

  if (!clientId || !secret || !accessToken || !environment) {
    throw new Error('Plaid server configuration is incomplete')
  }

  if (environment !== 'sandbox') {
    throw new Error('Plaid environment must be sandbox')
  }

  return { clientId, secret, accessToken }
}

export function createPlaidClient(): PlaidDataClient {
  const { clientId, secret } = getPlaidConfig()

  return new PlaidClient({
    clientId,
    secret,
    environment: PlaidEnvironment.Sandbox,
    maxRetries: 2,
  })
}

export async function fetchPlaidSnapshot(
  client: PlaidDataClient,
  accessToken: string,
): Promise<SandboxSnapshot> {
  const accountsResponse = await client.accounts.get({
    access_token: accessToken,
  })

  if (!accountsResponse || !Array.isArray(accountsResponse.accounts)) {
    throw new Error('Plaid returned an invalid accounts response')
  }

  const transactions: unknown[] = []
  const cursors = new Set<string>()
  let cursor: string | undefined

  while (true) {
    const page = await client.transactions.sync({
      access_token: accessToken,
      ...(cursor ? { cursor } : {}),
      count: 500,
    })

    if (
      !page ||
      !Array.isArray(page.added) ||
      !Array.isArray(page.modified) ||
      !Array.isArray(page.removed) ||
      typeof page.has_more !== 'boolean' ||
      typeof page.next_cursor !== 'string'
    ) {
      throw new Error('Plaid returned an invalid transactions response')
    }

    transactions.push(...page.added, ...page.modified)

    if (!page.has_more) break

    if (!page.next_cursor || cursors.has(page.next_cursor)) {
      throw new Error('Plaid returned an invalid transaction pagination cursor')
    }

    cursors.add(page.next_cursor)
    cursor = page.next_cursor
  }

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffDate = cutoff.toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  const recentTransactions = transactions.filter((transaction) => {
    if (!transaction || typeof transaction !== 'object') return true
    const date = (transaction as { date?: unknown }).date
    if (typeof date !== 'string') return true
    const transactionDate = date.slice(0, 10)
    return transactionDate >= cutoffDate && transactionDate <= today
  })

  return createPlaidSnapshot(accountsResponse.accounts, recentTransactions)
}

export async function getPlaidSnapshot(): Promise<SandboxSnapshot> {
  const { accessToken } = getPlaidConfig()
  return fetchPlaidSnapshot(createPlaidClient(), accessToken)
}

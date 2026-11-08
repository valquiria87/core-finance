
const PLUGGY_API = 'https://api.pluggy.ai'
const API_KEY_TTL = 110 * 60 * 1000

let cachedApiKey: string | null = null
let apiKeyExpiresAt = 0

export async function getPluggyApiKey(): Promise<string> {
  if (cachedApiKey && Date.now() < apiKeyExpiresAt) {
    return cachedApiKey
  }

  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais Pluggy não configuradas')
  }

  const response = await fetch(`${PLUGGY_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Falha na autenticação Pluggy: ${response.status}`)
  }

  const data = await response.json()

  if (!data.apiKey || typeof data.apiKey !== 'string') {
    throw new Error('Pluggy não retornou uma API Key válida')
  }

  const apiKey = data.apiKey
  cachedApiKey = apiKey
  apiKeyExpiresAt = Date.now() + API_KEY_TTL

  return apiKey
}

export async function getPluggyAccounts() {
  const itemId = process.env.PLUGGY_ITEM_ID

  if (!itemId) {
    throw new Error('PLUGGY_ITEM_ID não configurado')
  }

  const apiKey = await getPluggyApiKey()

  const url = new URL(`${PLUGGY_API}/accounts`)
  url.searchParams.set('itemId', itemId)

  const response = await fetch(url, {
    headers: { 'X-API-KEY': apiKey },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Falha ao buscar contas Pluggy: ${response.status}`)
  }

  const data = await response.json()

  if (!Array.isArray(data.results)) {
    throw new Error('Formato inesperado na resposta de contas Pluggy')
  }

  return data.results
}

export async function getPluggyTransactions(accountId: string) {
  if (!accountId) {
    throw new Error('Account ID não informado')
  }

  const apiKey = await getPluggyApiKey()

  let url = new URL(`${PLUGGY_API}/v2/transactions`)
  url.searchParams.set('accountId', accountId)

  const transactions: unknown[] = []

  while (true) {
    const response = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(
        `Falha ao buscar transações Pluggy: ${response.status}`,
      )
    }

    const data = await response.json()

    if (!Array.isArray(data.results)) {
      throw new Error('Formato inesperado na resposta de transações Pluggy')
    }

    transactions.push(...data.results)

    if (data.next === null) {
      break
    }

    if (typeof data.next !== 'string' || !data.next.startsWith('?')) {
      throw new Error('Cursor de paginação Pluggy inválido')
    }

    url = new URL(data.next, `${PLUGGY_API}/v2/transactions`)
  }

  return transactions
}

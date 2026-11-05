export type AccountType = 'checking' | 'savings' | 'credit'

export interface Account {
  id: string
  name: string
  institution: string
  type: AccountType
  mask: string
  /** Conta corrente/poupança: saldo atual. Cartão: fatura em aberto / valor devido. */
  current: number | null
  /** Saldo disponível (apenas contas de depósito). */
  available: number | null
  /** Limite total (apenas cartões). */
  limit: number | null
}

export type CategoryId =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'leisure'
  | 'housing'
  | 'health'
  | 'income'
  | 'transfer'
  | 'debt'

export interface Transaction {
  id: string
  date: string
  merchant: string
  accountId: string
  category: CategoryId
  /** Regra Plaid: valor positivo = saída de dinheiro (débito); negativo = entrada. */
  amount: number
  pending: boolean
}

export interface SandboxSnapshot {
  mode: 'sandbox' | 'live'
  asOf: string
  accounts: Account[]
  transactions: Transaction[]
  balanceHistory: number[]
}

export type ChatBlock =
  | { type: 'text'; text: string }
  | {
      type: 'table'
      title: string
      columns: { key: string; label: string; align?: 'left' | 'right' }[]
      rows: Record<string, string>[]
      tone?: Record<string, 'inflow' | 'outflow' | 'muted'>[]
      footnote?: string
    }

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  blocks: ChatBlock[]
}

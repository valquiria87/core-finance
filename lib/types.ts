export type AccountType = 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'other'

export interface Account {
  id: string
  name: string
  institution: string
  currency?: string | null
  type: AccountType
  mask: string
  /** Saldo atual, valor devido de cartão/empréstimo ou valor de investimento, conforme o tipo. */
  current: number | null
  /** Saldo disponível (apenas contas de depósito). */
  available: number | null
  /** Limite total (apenas cartões de crédito). */
  limit: number | null
}

export type CategoryId =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'other'
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
  currency?: string | null
  category: CategoryId
  /** Regra interna: valor positivo = saída de dinheiro; negativo = entrada. */
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

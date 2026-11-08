import type {
  Account,
  CategoryId,
  SandboxSnapshot,
  Transaction,
} from './types'

function mapCategory(category = '', description = ''): CategoryId {
  const value = `${category} ${description}`.toLowerCase()

  if (/salary|salário|income|payroll|refund|reembolso|cashback/.test(value)) {
    return 'income'
  }

  if (/transfer|transferência|bank slip/.test(value)) {
    return 'transfer'
  }

  if (/credit card payment|pagamento de fatura|empréstimo|loan|financing|financiamento/.test(value)) {
    return 'debt'
  }

  if (/housing|electricity|rent|aluguel|condomínio|water|electric|telecommunication|internet|telephone|moradia/.test(value)) {
    return 'housing'
  }

  if (/food|restaurant|grocery|supermarket|alimentação|restaurante/.test(value)) {
    return 'food'
  }

  if (/transport|fuel|gas station|uber|taxi|transporte|combustível/.test(value)) {
    return 'transport'
  }

  if (/gym|fitness|health|pharmacy|medical|saúde|academia|farmácia/.test(value)) {
    return 'health'
  }

  if (/streaming|music|video|entertainment|cinema|lazer/.test(value)) {
    return 'leisure'
  }

  return 'shopping'
}

export function createPluggySnapshot(
  rawAccounts: any[],
  rawTransactions: any[][],
): SandboxSnapshot {
  const accounts: Account[] = rawAccounts.map((account) => {
    const isCredit = account.type === 'CREDIT'
    const digits = String(account.number ?? '').replace(/\D/g, '')

    return {
      id: account.id,
      name: account.name ?? 'Conta',
      institution: 'Pluggy Sandbox',
      type: isCredit
        ? 'credit'
        : account.subtype === 'SAVINGS_ACCOUNT'
          ? 'savings'
          : 'checking',
      mask: digits.slice(-4) || '----',
      current: isCredit
        ? Math.abs(account.balance ?? 0)
        : account.balance ?? null,
      available: isCredit
        ? null
        : account.availableBalance ?? null,
      limit: isCredit
        ? account.creditData?.creditLimit ?? null
        : null,
    }
  })

  const transactions: Transaction[] = rawTransactions.flat().map((tx) => {
    const account = accounts.find((a) => a.id === tx.accountId)
    const isCredit = account?.type === 'credit'
    const rawAmount = Number(tx.amount ?? 0)

    return {
      id: tx.id,
      date: String(tx.date).slice(0, 10),
      merchant: tx.merchant?.businessName || tx.description || 'Transação',
      accountId: tx.accountId,
      category: mapCategory(tx.category, tx.description),
      amount: isCredit
        ? -rawAmount
        : -rawAmount,
      pending: tx.status !== 'POSTED',
    }
  })

  return {
    mode: 'sandbox',
    asOf: new Date().toISOString().slice(0, 10),
    accounts,
    transactions,
    balanceHistory: [],
  }
}
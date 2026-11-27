import { z } from 'zod'
import type {
  Account,
  CategoryId,
  SandboxSnapshot,
  Transaction,
} from './types'

const BalanceSchema = z.object({
  current: z.number().nullable().optional(),
  available: z.number().nullable().optional(),
  limit: z.number().nullable().optional(),
  iso_currency_code: z.string().nullable().optional(),
}).passthrough()

const PlaidAccountSchema = z.object({
  account_id: z.string().min(1),
  name: z.string().min(1),
  official_name: z.string().nullable().optional(),
  type: z.string().min(1),
  subtype: z.string().nullable().optional(),
  mask: z.string().nullable().optional(),
  balances: BalanceSchema,
}).passthrough()

const PlaidTransactionSchema = z.object({
  transaction_id: z.string().min(1),
  account_id: z.string().min(1),
  amount: z.number().finite(),
  iso_currency_code: z.string().nullable().optional(),
  date: z.string().min(1),
  pending: z.boolean(),
  name: z.string().optional(),
  merchant_name: z.string().nullable().optional(),
  personal_finance_category: z.object({
    primary: z.string().optional(),
  }).nullable().optional(),
}).passthrough()

export function mapCategory(primary: string | undefined, name: string): CategoryId {
  const code = (primary ?? '').toUpperCase()
  if (code === 'INCOME' || code.startsWith('INCOME_')) return 'income'
  if (code.startsWith('TRANSFER_')) return 'transfer'
  if (code === 'LOAN_PAYMENTS') return 'debt'
  if (code === 'RENT_AND_UTILITIES' || code.startsWith('RENT_AND_UTILITIES_')) return 'housing'
  if (code === 'FOOD_AND_DRINK' || code.startsWith('FOOD_AND_DRINK_')) return 'food'
  if (code === 'TRANSPORTATION' || code.startsWith('TRANSPORTATION_')) return 'transport'
  if (code === 'MEDICAL' || code.startsWith('MEDICAL_')) return 'health'
  if (code === 'ENTERTAINMENT' || code.startsWith('ENTERTAINMENT_') || code.startsWith('PERSONAL_CARE_')) return 'leisure'
  if (code === 'GENERAL_MERCHANDISE' || code.startsWith('GENERAL_MERCHANDISE_')) return 'shopping'

  const fallback = name.toLowerCase()
  if (/\b(payroll|salary|refund|cashback|income)\b/.test(fallback)) return 'income'
  if (/\b(transfer|deposit|withdrawal)\b/.test(fallback)) return 'transfer'
  if (/\b(loan payment|credit card payment|debt payment)\b/.test(fallback)) return 'debt'
  if (/\b(rent|utilities|housing)\b/.test(fallback)) return 'housing'
  if (/\b(food|drink|restaurant|grocery)\b/.test(fallback)) return 'food'
  if (/\b(transport|travel|gas|fuel)\b/.test(fallback)) return 'transport'
  if (/\b(medical|health|pharmacy)\b/.test(fallback)) return 'health'
  if (/\b(entertainment|recreation|music|streaming)\b/.test(fallback)) return 'leisure'
  return 'other'
}

export function createPlaidSnapshot(
  rawAccounts: unknown,
  rawTransactions: unknown,
): SandboxSnapshot {
  const accountResults = z.array(PlaidAccountSchema).safeParse(rawAccounts)
  const transactionResults = z.array(PlaidTransactionSchema).safeParse(rawTransactions)

  if (!accountResults.success || !transactionResults.success) {
    throw new Error('Plaid returned invalid account or transaction data')
  }

  const accounts: Account[] = accountResults.data.map((account) => {
    const providerType = account.type.toLowerCase()
    const subtype = account.subtype?.toLowerCase().trim() ?? ''
    // Only checking and savings are treated as immediately available deposits.
    // CDs, money-market, HSA, cash-management and unknown depository subtypes
    // remain visible as "other" and are excluded from available-cash totals.
    const type: Account['type'] =
      providerType === 'credit' ? 'credit'
        : providerType === 'loan' ? 'loan'
          : providerType === 'investment' ? 'investment'
            : providerType === 'depository' && subtype === 'checking' ? 'checking'
              : providerType === 'depository' && subtype === 'savings' ? 'savings'
                : 'other'
    const current = account.balances.current ?? null
    const isDebt = type === 'credit' || type === 'loan'

    return {
      id: account.account_id,
      name: account.official_name || account.name,
      institution: 'Plaid Sandbox',
      currency: account.balances.iso_currency_code ?? null,
      type,
      mask: account.mask || '----',
      current: isDebt && current !== null ? Math.abs(current) : current,
      available: type === 'checking' || type === 'savings'
        ? account.balances.available ?? null
        : null,
      limit: type === 'credit' ? account.balances.limit ?? null : null,
    }
  })

  const transactions: Transaction[] = transactionResults.data.map((tx) => ({
    id: tx.transaction_id,
    date: tx.date.slice(0, 10),
    merchant: tx.merchant_name || tx.name || 'Transação',
    accountId: tx.account_id,
    currency: tx.iso_currency_code ?? null,
    category: mapCategory(tx.personal_finance_category?.primary, tx.name || ''),
    // Plaid já usa positivo para saída e negativo para entrada.
    amount: tx.amount,
    pending: tx.pending,
  }))

  return {
    mode: 'sandbox',
    asOf: new Date().toISOString().slice(0, 10),
    accounts,
    transactions,
    balanceHistory: [],
  }
}

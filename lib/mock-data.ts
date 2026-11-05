import type { Account, SandboxSnapshot, Transaction } from './types'

/**
 * DADOS FICTÍCIOS — espelham o formato da sandbox Plaid (accounts/get, transactions/get).
 * Nenhuma credencial é usada aqui. Na Etapa 2, substitua por chamadas ao backend
 * (backend/) que guarda PLAID_CLIENT_ID e PLAID_SECRET apenas no servidor.
 */

export const SANDBOX_AS_OF = '2026-05-11'

export const accounts: Account[] = [
  {
    id: 'acc_checking',
    name: 'Plaid Checking',
    institution: 'First Platypus Bank',
    type: 'checking',
    mask: '0000',
    current: 4218.37,
    available: 4096.12,
    limit: null,
  },
  {
    id: 'acc_savings',
    name: 'Plaid Saving',
    institution: 'First Platypus Bank',
    type: 'savings',
    mask: '1111',
    current: 12400,
    available: null,
    limit: null,
  },
  {
    id: 'acc_credit',
    name: 'Plaid Credit Card',
    institution: 'First Platypus Bank',
    type: 'credit',
    mask: '3333',
    current: 1284.5,
    available: null,
    limit: 2000,
  },
  {
    id: 'acc_business',
    name: 'Plaid Business Card',
    institution: 'Tattersall Federal Credit Union',
    type: 'credit',
    mask: '9999',
    current: 312.9,
    available: null,
    limit: null,
  },
]

export const transactions: Transaction[] = [
  { id: 't01', date: '2026-05-11', merchant: 'Starbucks', accountId: 'acc_credit', category: 'food', amount: 6.45, pending: true },
  { id: 't02', date: '2026-05-11', merchant: 'Uber', accountId: 'acc_credit', category: 'transport', amount: 18.2, pending: true },
  { id: 't03', date: '2026-05-10', merchant: 'Whole Foods Market', accountId: 'acc_checking', category: 'food', amount: 142.87, pending: false },
  { id: 't04', date: '2026-05-10', merchant: 'Netflix', accountId: 'acc_credit', category: 'leisure', amount: 15.49, pending: false },
  { id: 't05', date: '2026-05-09', merchant: 'Pagamento fatura Plaid Credit', accountId: 'acc_checking', category: 'debt', amount: 500, pending: false },
  { id: 't06', date: '2026-05-08', merchant: 'Amazon', accountId: 'acc_business', category: 'shopping', amount: 89.99, pending: false },
  { id: 't07', date: '2026-05-08', merchant: 'Shell', accountId: 'acc_credit', category: 'transport', amount: 54.3, pending: false },
  { id: 't08', date: '2026-05-07', merchant: 'CVS Pharmacy', accountId: 'acc_checking', category: 'health', amount: 32.15, pending: false },
  { id: 't09', date: '2026-05-06', merchant: 'Transferência para poupança', accountId: 'acc_checking', category: 'transfer', amount: 400, pending: false },
  { id: 't10', date: '2026-05-05', merchant: 'Salário · Acme Corp', accountId: 'acc_checking', category: 'income', amount: -3850, pending: false },
  { id: 't11', date: '2026-05-05', merchant: 'McDonald\u2019s', accountId: 'acc_credit', category: 'food', amount: 12.0, pending: false },
  { id: 't12', date: '2026-05-04', merchant: 'Target', accountId: 'acc_credit', category: 'shopping', amount: 76.4, pending: false },
  { id: 't13', date: '2026-05-03', merchant: 'Cinemark', accountId: 'acc_credit', category: 'leisure', amount: 28.0, pending: false },
  { id: 't14', date: '2026-05-02', merchant: 'Reembolso · Amazon', accountId: 'acc_business', category: 'income', amount: -24.99, pending: false },
  { id: 't15', date: '2026-05-01', merchant: 'Aluguel · Sunset Apartments', accountId: 'acc_checking', category: 'housing', amount: 1450, pending: false },
  { id: 't16', date: '2026-05-01', merchant: 'Rendimento poupança', accountId: 'acc_savings', category: 'income', amount: -18.6, pending: false },
  // Abril (base de comparação do período anterior)
  { id: 't17', date: '2026-04-28', merchant: 'Whole Foods Market', accountId: 'acc_checking', category: 'food', amount: 168.3, pending: false },
  { id: 't18', date: '2026-04-22', merchant: 'Best Buy', accountId: 'acc_credit', category: 'shopping', amount: 349.99, pending: false },
  { id: 't19', date: '2026-04-15', merchant: 'Delta Air Lines', accountId: 'acc_credit', category: 'leisure', amount: 412.0, pending: false },
  { id: 't20', date: '2026-04-05', merchant: 'Salário · Acme Corp', accountId: 'acc_checking', category: 'income', amount: -3850, pending: false },
  { id: 't21', date: '2026-04-01', merchant: 'Aluguel · Sunset Apartments', accountId: 'acc_checking', category: 'housing', amount: 1450, pending: false },
  { id: 't22', date: '2026-04-01', merchant: 'Rendimento poupança', accountId: 'acc_savings', category: 'income', amount: -17.9, pending: false },
]

/** Saldo somado das contas de depósito nos últimos 12 dias (para o sparkline). */
export const balanceHistory = [
  13980, 15430, 15411, 15440, 15360, 19210, 18810, 18778, 18634, 18134, 16191, 16618.37,
]

export function getSandboxSnapshot(): SandboxSnapshot {
  return {
    mode: 'sandbox',
    asOf: SANDBOX_AS_OF,
    accounts,
    transactions,
    balanceHistory,
  }
}

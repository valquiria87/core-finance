import { readFile, writeFile } from 'node:fs/promises';

const localEnv = await readFile('.env.plaid.local', 'utf8').catch(() => '');
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2].replace(/^['\"]|['\"]$/g, '');
  }
}

const baseUrl = 'https://sandbox.plaid.com';
const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;
const accessToken = process.env.PLAID_ACCESS_TOKEN;

if (!clientId || !secret || !accessToken) {
  console.error('Defina PLAID_CLIENT_ID, PLAID_SECRET e PLAID_ACCESS_TOKEN no ambiente local. Nenhum valor será exibido.');
  process.exit(1);
}

const endDate = process.env.PLAID_END_DATE || new Date().toISOString().slice(0, 10);
const defaultStart = new Date(`${endDate}T00:00:00.000Z`);
defaultStart.setUTCDate(defaultStart.getUTCDate() - 90);
const startDate = process.env.PLAID_START_DATE || defaultStart.toISOString().slice(0, 10);
const pageSize = 500;

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label} inválida. Use YYYY-MM-DD.`);
  }
}

assertDate(startDate, 'PLAID_START_DATE');
assertDate(endDate, 'PLAID_END_DATE');
if (startDate > endDate) throw new Error('A data inicial não pode ser posterior à data final.');

async function plaidPost(endpoint, payload) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      access_token: accessToken,
      ...payload,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body.error_code || body.error_type || `HTTP_${response.status}`;
    throw new Error(`Plaid ${endpoint}: ${code} — ${body.error_message || 'falha na consulta'}`);
  }
  return body;
}

function categoryOf(transaction) {
  return transaction.personal_finance_category?.primary
    || transaction.category?.[0]
    || 'OUTROS';
}

function isTransfer(transaction) {
  const category = `${transaction.personal_finance_category?.primary || ''} ${transaction.personal_finance_category?.detailed || ''} ${(transaction.category || []).join(' ')}`;
  return /TRANSFER|LOAN_PAYMENT|BANK_FEES/i.test(category);
}

function money(value) {
  return Number((value || 0).toFixed(2));
}

function groupExpenses(transactions, keyFn) {
  const groups = new Map();
  for (const transaction of transactions) {
    if (!(transaction.amount > 0) || isTransfer(transaction)) continue;
    const key = keyFn(transaction) || 'OUTROS';
    const current = groups.get(key) || { label: key, count: 0, total: 0 };
    current.count += 1;
    current.total += transaction.amount;
    groups.set(key, current);
  }
  return [...groups.values()]
    .map(item => ({ ...item, total: money(item.total) }))
    .sort((a, b) => b.total - a.total);
}

const accountsResponse = await plaidPost('/accounts/get', {});
const accounts = (accountsResponse.accounts || []).map(account => ({
  name: account.name,
  official_name: account.official_name || null,
  type: account.type,
  subtype: account.subtype || null,
  currency: account.balances?.iso_currency_code || account.balances?.unofficial_currency_code || null,
  current_balance: account.balances?.current ?? null,
  available_balance: account.balances?.available ?? null,
}));

let offset = 0;
let totalTransactions = null;
let pages = 0;
const transactions = [];

do {
  const page = await plaidPost('/transactions/get', {
    start_date: startDate,
    end_date: endDate,
    options: { count: pageSize, offset },
  });
  totalTransactions = page.total_transactions ?? transactions.length + (page.transactions || []).length;
  const batch = page.transactions || [];
  transactions.push(...batch);
  pages += 1;
  if (batch.length === 0) break;
  offset += batch.length;
} while (offset < totalTransactions);

const accountNames = new Map((accountsResponse.accounts || []).map(account => [account.account_id, account.name]));

const recent = [...transactions]
  .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  .slice(0, 5)
  .map(transaction => ({
    date: transaction.date,
    name: transaction.merchant_name || transaction.name,
    amount: money(transaction.amount),
    currency: transaction.iso_currency_code || transaction.unofficial_currency_code || null,
    category: categoryOf(transaction),
    account_name: accountNames.get(transaction.account_id) || null,
  }));
const expenseTransactions = transactions.filter(transaction => transaction.amount > 0 && !isTransfer(transaction));
const categoryPatterns = groupExpenses(expenseTransactions, categoryOf).slice(0, 3);
const monthlyPatterns = groupExpenses(expenseTransactions, transaction => String(transaction.date || '').slice(0, 7));
const accountPatterns = groupExpenses(expenseTransactions, transaction => accountNames.get(transaction.account_id) || 'CONTA NÃO IDENTIFICADA');

const report = {
  generated_at: new Date().toISOString(),
  environment: 'Plaid Sandbox',
  endpoints: ['POST /accounts/get', 'POST /transactions/get'],
  period: { start_date: startDate, end_date: endDate, days_requested: 90 },
  accounts: { count: accounts.length, items: accounts },
  transactions: {
    total_transactions_reported_by_plaid: totalTransactions,
    transactions_retrieved: transactions.length,
    pages_requested: pages,
    page_size: pageSize,
    recent_five: recent,
  },
  spending_patterns: {
    top_categories: categoryPatterns,
    by_period: monthlyPatterns,
    by_account: accountPatterns,
    note: 'Saídas calculadas com amount positivo; transferências e pagamentos de empréstimo foram excluídos dos padrões de consumo.',
  },
  security: {
    credentials_included: false,
    access_token_included: false,
    account_ids_included: false,
  },
};

const outputPath = process.argv[2] || 'evidencias/plaid-p07-report.json';
await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  status: 'success',
  output: outputPath,
  endpoints: report.endpoints,
  period: report.period,
  account_count: report.accounts.count,
  total_transactions_reported_by_plaid: totalTransactions,
  transactions_retrieved: transactions.length,
  pages_requested: pages,
  recent_five: recent,
  spending_patterns: report.spending_patterns,
  secrets_or_tokens_written: false,
}, null, 2));

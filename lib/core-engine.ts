
import { categoryLabel } from './categories'
import {
  accountTotalsByCurrency,
  consumptionByCurrency,
  filterTransactions,
  groupByDay,
  monthKey,
  periodFlowsByCurrency,
  spendingByAccount,
  spendingByCategoryAndCurrency,
  spendingByWeek,
} from './finance'
import {
  formatPercent,
  formatShortDate,
  formatCurrency,
} from './format'
import type { AccountType, CategoryId, ChatBlock, SandboxSnapshot } from './types'

/**
 * Motor de respostas do Core.
 * Respostas locais baseadas nos dados disponíveis na sandbox.
 */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const has = (text: string, ...words: string[]) =>
  words.some((word) => text.includes(word))

function totalsByCurrency(items: { currency?: string | null; amount: number }[]) {
  const totals = new Map<string, number>()
  for (const item of items) {
    const currency = item.currency ?? ''
    totals.set(currency, (totals.get(currency) ?? 0) + item.amount)
  }
  return [...totals].map(([currency, amount]) => ({ currency: currency || null, amount }))
}

function formatTotals(totals: { currency: string | null; amount: number }[]) {
  return totals.length
    ? totals.map(({ currency, amount }) => formatCurrency(amount, currency)).join('; ')
    : formatCurrency(0, null)
}

function formatCurrencyOrMissing(value: number | null, currency?: string | null) {
  return value == null ? 'Não informado' : formatCurrency(value, currency)
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

const monthName = (key: string) =>
  MONTHS[Number(key.slice(5, 7)) - 1] ?? 'período selecionado'

function requestedMonth(question: string, fallback: string): string {
  const q = normalize(question)

  const match = q.match(
    /\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?\b/,
  )

  if (!match) return fallback

  const monthIndex = MONTHS.findIndex(
    (month) => normalize(month) === match[1],
  )

  if (monthIndex < 0) return fallback

  const year = match[2]
    ? Number(match[2])
    : Number(fallback.slice(0, 4))

  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function requestedCategory(question: string): CategoryId | undefined {
  const q = normalize(question)

  const terms: Partial<Record<CategoryId, string[]>> = {
    food: [
      'alimentacao',
      'comida',
      'mercado',
      'supermercado',
      'delivery',
      'restaurante',
    ],
    transport: [
      'transporte',
      'combustivel',
      'gasolina',
      'uber',
      'taxi',
    ],
    shopping: ['compras', 'shopping', 'loja'],
    leisure: ['lazer', 'cinema', 'viagem', 'entretenimento'],
    health: ['saude', 'farmacia', 'medico'],
    housing: ['moradia', 'aluguel', 'casa'],
  }

  return (Object.entries(terms) as [CategoryId, string[]][]).find(
    ([, words]) => words.some((word) => q.includes(word)),
  )?.[0]
}

function requestedMerchant(question: string): string | undefined {
  const q = normalize(question)

  if (q.includes('delivery')) return 'delivery'
  if (q.includes('uber')) return 'uber'
  if (q.includes('netflix')) return 'netflix'
  if (q.includes('starbucks')) return 'starbucks'
  if (q.includes('amazon')) return 'amazon'

  return undefined
}

function filteredSpendAnswer(
  question: string,
  data: SandboxSnapshot,
  key: string,
): ChatBlock[] {
  const category = requestedCategory(question)
  const merchant = requestedMerchant(question)

  const [year, month] = key.split('-').map(Number)
  const from = `${key}-01`
  const to = new Date(Date.UTC(year, month, 0))
    .toISOString()
    .slice(0, 10)

  const filters = {
    from,
    to,
    category,
    merchant,
  }

  const filtered = filterTransactions(data.transactions, filters)

  const matches = filtered.filter(
    (transaction) =>
      transaction.amount > 0 &&
      transaction.category !== 'transfer' &&
      transaction.category !== 'debt',
  )

  const totals = totalsByCurrency(matches.map((transaction) => ({
    currency: transaction.currency,
    amount: transaction.amount,
  })))

  if (matches.length === 0) {
    return [
      {
        type: 'text',
        text: `Não encontrei transações confirmadas${
          merchant ? ` para "${merchant}"` : ''
        }${
          category ? ` na categoria ${categoryLabel(category)}` : ''
        } em ${monthName(key)} de ${year}. Os dados disponíveis não permitem confirmar esse gasto.`,
      },
    ]
  }

  const label = merchant
    ? merchant
    : category
      ? categoryLabel(category)
      : 'consumo'

  return [
    {
      type: 'text',
        text: `Em ${monthName(key)} de ${year}, encontrei ${matches.length} transação(ões) correspondente(s) a ${label}. Total confirmado: ${formatTotals(totals)}.`,
    },
    {
      type: 'table',
      title: 'Transações encontradas',
      columns: [
        { key: 'data', label: 'Data' },
        { key: 'estabelecimento', label: 'Estabelecimento' },
        { key: 'valor', label: 'Valor', align: 'right' },
      ],
      rows: matches.map((transaction) => ({
        data: formatShortDate(transaction.date),
        estabelecimento: transaction.merchant,
        valor: formatCurrency(transaction.amount, transaction.currency),
      })),
      tone: matches.map(() => ({ valor: 'outflow' })),
    },
  ]
}

const typeLabel: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit: 'Cartão de crédito',
  loan: 'Empréstimo',
  investment: 'Investimento',
  other: 'Outra conta',
}

function balances(data: SandboxSnapshot): ChatBlock[] {
  const { cash, debt, investments } = accountTotalsByCurrency(data.accounts)

  return [
    {
      type: 'text',
      text: `Você tem ${formatTotals(cash)} em contas de depósito. Separadamente, há ${formatTotals(debt)} em dívidas (cartões e empréstimos) e ${formatTotals(investments)} em investimentos. Dívidas não são dinheiro disponível; investimentos são apresentados à parte.`,
    },
    {
      type: 'table',
      title: 'Saldo por conta',
      columns: [
        { key: 'conta', label: 'Conta' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'valor', label: 'Saldo / Fatura em aberto', align: 'right' },
        { key: 'extra', label: 'Disponível / Limite', align: 'right' },
      ],
      rows: data.accounts.map((account) => ({
        conta: `${account.name} ••${account.mask}`,
        tipo: typeLabel[account.type],
        valor:
          account.type === 'credit' || account.type === 'loan'
            ? `${formatCurrencyOrMissing(account.current, account.currency)} devido`
            : formatCurrencyOrMissing(account.current, account.currency),
        extra:
          account.type === 'credit'
            ? `Limite: ${formatCurrencyOrMissing(account.limit, account.currency)}`
            : account.type === 'checking' || account.type === 'savings'
              ? formatCurrencyOrMissing(account.available, account.currency)
              : '—',
      })),
      tone: data.accounts.map((account) => ({
        valor: account.type === 'credit' || account.type === 'loan'
          ? 'outflow'
          : account.type === 'investment' || account.type === 'other'
            ? 'muted'
            : 'inflow',
      })),
      footnote:
        'Cartões e empréstimos mostram valores devidos; investimentos e outras contas não entram no dinheiro disponível.',
    },
  ]
}

function recentTransactions(data: SandboxSnapshot): ChatBlock[] {
  const recent = groupByDay(data.transactions)
    .flatMap((group) => group.items)
    .slice(0, 8)

  const name = (id: string) =>
    data.accounts.find((account) => account.id === id)?.name ?? 'Conta'

  return [
    {
      type: 'text',
      text: 'Aqui estão suas 8 transações mais recentes. Saídas em coral, entradas em verde.',
    },
    {
      type: 'table',
      title: 'Transações recentes',
      columns: [
        { key: 'data', label: 'Data' },
        { key: 'estab', label: 'Estabelecimento' },
        { key: 'conta', label: 'Conta' },
        { key: 'valor', label: 'Valor', align: 'right' },
      ],
      rows: recent.map((transaction) => ({
        data: formatShortDate(transaction.date),
        estab: transaction.pending
          ? `${transaction.merchant} (pendente)`
          : transaction.merchant,
        conta: name(transaction.accountId),
        valor:
          transaction.amount > 0
            ? `− ${formatCurrency(transaction.amount, transaction.currency)}`
            : `+ ${formatCurrency(-transaction.amount, transaction.currency)}`,
      })),
      tone: recent.map((transaction) => ({
        valor: transaction.amount > 0 ? 'outflow' : 'inflow',
      })),
    },
  ]
}

function categoryTable(
  data: SandboxSnapshot,
  key: string,
): ChatBlock {
  const slices = spendingByCategoryAndCurrency(data.transactions, key)
  const counts = new Map<string, number>()

  for (const transaction of data.transactions) {
    if (
      transaction.pending ||
      !transaction.date.startsWith(key) ||
      transaction.amount <= 0 ||
      transaction.category === 'transfer' ||
      transaction.category === 'debt'
    ) continue
    const countKey = `${transaction.currency ?? ''}:${transaction.category}`
    counts.set(countKey, (counts.get(countKey) ?? 0) + 1)
  }

  return {
    type: 'table',
    title: `Padrão 1 · Gastos por categoria (${monthName(key)})`,
    columns: [
      { key: 'cat', label: 'Categoria' },
      { key: 'qtd', label: 'Transações', align: 'right' },
      { key: 'valor', label: 'Total', align: 'right' },
      { key: 'pct', label: '%', align: 'right' },
    ],
    rows: slices.map((slice) => ({
      cat: categoryLabel(slice.id),
      qtd: String(counts.get(`${slice.currency ?? ''}:${slice.id}`) ?? 0),
      valor: formatCurrency(slice.value, slice.currency),
      pct: formatPercent(slice.percent),
    })),
    tone: slices.map(
      (slice): Record<string, 'inflow' | 'outflow' | 'muted'> =>
        slice.nonConsumption
          ? { cat: 'muted', valor: 'muted' }
          : { valor: 'outflow' },
    ),
    footnote: '* Transferências e pagamento de dívida não são consumo.',
  }
}

function periodTable(
  data: SandboxSnapshot,
  key: string,
): ChatBlock {
  const currencies = [...new Set(data.transactions
    .filter((transaction) => transaction.date.startsWith(key))
    .map((transaction) => transaction.currency ?? null))]
  const weeks = currencies.flatMap((currency) =>
    spendingByWeek(
      data.transactions.filter((transaction) => (transaction.currency ?? null) === currency),
      key,
    ).map((week) => ({ ...week, currency })),
  )

  return {
    type: 'table',
    title: `Padrão 2 · Gastos por período (${monthName(key)})`,
    columns: [
      { key: 'periodo', label: 'Período' },
      { key: 'qtd', label: 'Transações', align: 'right' },
      { key: 'valor', label: 'Consumo', align: 'right' },
    ],
    rows: weeks.map((week) => ({
      periodo: week.label,
      qtd: String(week.count),
      valor: formatCurrency(week.value, week.currency),
    })),
    tone: weeks.map(() => ({ valor: 'outflow' })),
  }
}

function accountTable(
  data: SandboxSnapshot,
  key: string,
): ChatBlock {
  const currencies = [...new Set(data.transactions
    .filter((transaction) => transaction.date.startsWith(key))
    .map((transaction) => transaction.currency ?? null))]
  const rows = currencies.flatMap((currency) => spendingByAccount(
    data.transactions.filter((transaction) => (transaction.currency ?? null) === currency),
    data.accounts,
    key,
  ).map((row) => ({ ...row, currency })))

  return {
    type: 'table',
    title: `Padrão 3 · Gastos por conta (${monthName(key)})`,
    columns: [
      { key: 'conta', label: 'Conta' },
      { key: 'qtd', label: 'Transações', align: 'right' },
      { key: 'valor', label: 'Consumo', align: 'right' },
    ],
    rows: rows.map((row) => ({
      conta: `${row.account.name} ••${row.account.mask}`,
      qtd: String(row.count),
      valor: formatCurrency(row.value, row.currency),
    })),
    tone: rows.map(() => ({ valor: 'outflow' })),
  }
}

function monthSpend(
  data: SandboxSnapshot,
  key: string,
): ChatBlock[] {
  const consumption = consumptionByCurrency(data.transactions, key)
  const { inflow } = periodFlowsByCurrency(data.transactions, key)
  const slices = spendingByCategoryAndCurrency(data.transactions, key)
  const currencies = [...new Set([
    ...consumption.map((item) => item.currency),
    ...inflow.map((item) => item.currency),
    ...slices.filter((slice) => !slice.nonConsumption).map((slice) => slice.currency ?? null),
  ])]
  const summary = (currencies.length ? currencies : [null]).map((currency) => {
    const spent = consumption.find((item) => item.currency === currency)?.amount ?? 0
    const income = inflow.find((item) => item.currency === currency)?.amount ?? 0
    const top = slices.find((slice) => !slice.nonConsumption && slice.currency === currency)
    const currencyLabel = currency ?? 'Moeda não informada'
    return `${currencyLabel}: ${formatCurrency(spent, currency)} em consumo, contra ${formatCurrency(income, currency)} de entradas. Maior categoria: ${top?.label ?? '—'} (${top ? formatCurrency(top.value, currency) : '—'})`
  }).join('; ')

  return [
    {
      type: 'text',
      text: `Em ${monthName(key)}, ${summary}. Transferências e pagamentos de fatura ficaram de fora, porque não são consumo. Para buscar oportunidades de economia, comece revisando os lançamentos da maior categoria de consumo; isso indica onde investigar, não uma economia garantida.`,
    },
    periodTable(data, key),
  ]
}

const CONCEPTS: { match: string[]; text: string }[] = [
  {
    match: ['item'],
    text: 'Na Pluggy, um Item é a conexão entre você e uma instituição financeira. Quando você autoriza o acesso a um banco, nasce um Item — e é por ele que contas, saldos e transações chegam até aqui. Se o Item expirar, basta reconectar.',
  },
  {
    match: ['connector', 'conector'],
    text: 'Um connector é o “adaptador” de cada instituição na Pluggy (ex.: um banco específico). Você escolhe o connector, faz login/consentimento, e isso gera um Item.',
  },
  {
    match: ['consentimento', 'consent'],
    text: 'Consentimento é a sua autorização, com prazo e finalidade definidos, para compartilhar dados financeiros entre instituições. Você pode revogar quando quiser pelo app do seu banco.',
  },
  {
    match: ['open finance'],
    text: 'Open Finance é o sistema regulado pelo Banco Central que permite compartilhar seus dados financeiros entre instituições, sempre com o seu consentimento. É isso que permite ver várias contas em um só lugar.',
  },
  {
  match: ['mcp'],
  text: 'MCP (Model Context Protocol) é um padrão de comunicação entre aplicações de IA e ferramentas externas. Neste projeto, o MCP da Pluggy é usado para consultar a documentação de Open Finance. Já as contas, os saldos e as transações fictícias exibidos pelo dashboard e pelo assistente financeiro vêm da Plaid Sandbox. A integração com a Pluggy Sandbox é independente e não alimenta a tela atual.',
},
]

export function answer(
  question: string,
  data: SandboxSnapshot,
): ChatBlock[] {
  const q = normalize(question)
  const latestTransactionDate = data.transactions.reduce(
    (latest, transaction) =>
      transaction.date > latest ? transaction.date : latest,
    '',
  )
  const fallbackMonth = latestTransactionDate
    ? monthKey(latestTransactionDate)
    : monthKey(data.asOf)
  const key = requestedMonth(question, fallbackMonth)

  for (const concept of CONCEPTS) {
    if (
      has(q, 'o que e', 'oque e', 'explique', 'significa', 'pluggy') &&
      has(q, ...concept.match)
    ) {
      return [{ type: 'text', text: concept.text }]
    }
  }

  if (has(q, 'padro', 'padrao', 'resumo')) {
    return [
      {
        type: 'text',
        text: 'Aqui estão seus 3 padrões de gasto deste mês: por categoria, por período e por conta.',
      },
      categoryTable(data, key),
      periodTable(data, key),
      accountTable(data, key),
    ]
  }

  if (has(q, 'categoria')) {
    return [
      {
        type: 'text',
        text: `Este é o retrato dos seus gastos de ${monthName(key)} por categoria.`,
      },
      categoryTable(data, key),
    ]
  }

  if (has(q, 'por conta', 'cada conta', 'qual conta')) {
    return [
      {
        type: 'text',
        text: 'Veja quanto saiu de cada conta neste mês.',
      },
      accountTable(data, key),
    ]
  }

  if (has(q, 'semana', 'periodo')) {
    return [
      {
        type: 'text',
        text: 'Veja como seu consumo se distribuiu ao longo do mês.',
      },
      periodTable(data, key),
    ]
  }

  const isSpendingQuestion = has(
    q,
    'gastei',
    'gasto',
    'gastos',
    'despesa',
    'analise',
    'movimentacoes',
    'principais',
    'oportunidade',
    'economia',
    'entradas',
    'entrada',
  )

  const category = requestedCategory(question)
  const merchant = requestedMerchant(question)

  if (
   isSpendingQuestion &&
(category !== undefined || merchant !== undefined)

  ) {
    return filteredSpendAnswer(question, data, key)
  }

  if (isSpendingQuestion) {
    const requestsFullAnalysis = has(
      q,
      'analise',
      'movimentacoes',
      'principais',
      'oportunidade',
      'economia',
      'entradas',
      'entrada',
      'resumo',
    )

    if (requestsFullAnalysis) {
      return [
        monthSpend(data, key)[0],
        categoryTable(data, key),
        periodTable(data, key),
        accountTable(data, key),
      ]
    }

    return monthSpend(data, key)
  }

  if (has(q, 'saldo', 'quanto tenho', 'dinheiro', 'conta')) {
    return balances(data)
  }

  if (has(q, 'transac', 'extrato', 'compras recentes', 'ultimas')) {
    return recentTransactions(data)
  }

  if (has(q, 'divida', 'fatura', 'cartao', 'devo')) {
    const { debt } = accountTotalsByCurrency(data.accounts)

    return [
      {
        type: 'text',
        text: `Suas faturas em aberto somam ${formatTotals(debt)}. Isso é valor devido — não entra como dinheiro disponível.`,
      },
      balances(data)[1],
    ]
  }

  if (/\b(oi|ola|bom dia|boa tarde|boa noite)\b/.test(q)) {
    return [
      {
        type: 'text',
        text: 'Oi! Sou o Core. Posso mostrar seu saldo, suas transações e seus padrões de gasto. Por onde quer começar?',
      },
    ]
  }

  return [
    {
      type: 'text',
      text: 'Ainda não sei responder isso com os dados de teste. Tente perguntar sobre saldo, gastos do mês, gastos por categoria ou “o que é um Item na Pluggy?”.',
    },
  ]
}

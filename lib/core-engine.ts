
import { categoryLabel } from './categories'
import {
  accountTotals,
  consumptionTotal,
  filterTransactions,
  filteredConsumptionTotal,
  groupByDay,
  monthKey,
  periodFlows,
  spendingByAccount,
  spendingByCategory,
  spendingByWeek,
} from './finance'
import {
  formatPercent,
  formatShortDate,
  formatBRL,
  formatBRLOrMissing,
} from './format'
import type { CategoryId, ChatBlock, SandboxSnapshot } from './types'

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

  const total = filteredConsumptionTotal(data.transactions, filters)

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
      text: `Em ${monthName(key)} de ${year}, encontrei ${matches.length} transação(ões) correspondente(s) a ${label}. Total confirmado: ${formatBRL(total)}.`,
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
        valor: formatBRL(transaction.amount),
      })),
      tone: matches.map(() => ({ valor: 'outflow' })),
    },
  ]
}

const typeLabel = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit: 'Cartão de crédito',
}

function balances(data: SandboxSnapshot): ChatBlock[] {
  const { cash, debt } = accountTotals(data.accounts)

  return [
    {
      type: 'text',
      text: `Você tem ${formatBRL(cash)} em contas. Separadamente, há ${formatBRL(debt)} em faturas de cartão em aberto — isso é valor devido, não dinheiro disponível.`,
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
          account.type === 'credit'
            ? `${formatBRLOrMissing(account.current)} devido`
            : formatBRLOrMissing(account.current),
        extra:
          account.type === 'credit'
            ? `Limite: ${formatBRLOrMissing(account.limit)}`
            : formatBRLOrMissing(account.available),
      })),
      tone: data.accounts.map((account) => ({
        valor: account.type === 'credit' ? 'outflow' : 'inflow',
      })),
      footnote:
        'Cartões mostram fatura em aberto / valor devido, nunca saldo disponível.',
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
            ? `− ${formatBRL(transaction.amount)}`
            : `+ ${formatBRL(-transaction.amount)}`,
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
  const slices = spendingByCategory(data.transactions, key)

  return {
    type: 'table',
    title: `Padrão 1 · Gastos por categoria (${monthName(key)})`,
    columns: [
      { key: 'cat', label: 'Categoria' },
      { key: 'valor', label: 'Valor', align: 'right' },
      { key: 'pct', label: '%', align: 'right' },
    ],
    rows: slices.map((slice) => ({
      cat: categoryLabel(slice.id),
      valor: formatBRL(slice.value),
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
  const weeks = spendingByWeek(data.transactions, key)

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
      valor: formatBRL(week.value),
    })),
    tone: weeks.map(() => ({ valor: 'outflow' })),
  }
}

function accountTable(
  data: SandboxSnapshot,
  key: string,
): ChatBlock {
  const rows = spendingByAccount(
    data.transactions,
    data.accounts,
    key,
  )

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
      valor: formatBRL(row.value),
    })),
    tone: rows.map(() => ({ valor: 'outflow' })),
  }
}

function monthSpend(
  data: SandboxSnapshot,
  key: string,
): ChatBlock[] {
  const consumption = consumptionTotal(data.transactions, key)
  const { inflow } = periodFlows(data.transactions, key)
  const top = spendingByCategory(data.transactions, key).find(
    (slice) => !slice.nonConsumption,
  )

  return [
    {
      type: 'text',
      text: `Em ${monthName(key)} você gastou ${formatBRL(consumption)} em consumo, contra ${formatBRL(inflow)} de entradas. A maior categoria foi ${top?.label ?? '—'} (${top ? formatBRL(top.value) : '—'}). Transferências e pagamentos de fatura ficaram de fora, porque não são consumo.`,
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
  text: 'MCP (Model Context Protocol) é um padrão de comunicação entre aplicações de IA e ferramentas externas. Neste projeto, o MCP da Pluggy permite consultar a documentação de Open Finance, enquanto a integração com a Pluggy Sandbox fornece as contas, os saldos e as transações fictícias utilizadas pelo dashboard e pelo assistente financeiro.',
},
]

function answerForMonth(
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
    return monthSpend(data, key)
  }

  if (has(q, 'saldo', 'quanto tenho', 'dinheiro', 'conta')) {
    return balances(data)
  }

  if (has(q, 'transac', 'extrato', 'compras recentes', 'ultimas')) {
    return recentTransactions(data)
  }

  if (has(q, 'divida', 'fatura', 'cartao', 'devo')) {
    const { debt } = accountTotals(data.accounts)

    return [
      {
        type: 'text',
        text: `Suas faturas em aberto somam ${formatBRL(debt)}. Isso é valor devido — não entra como dinheiro disponível.`,
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
/** Se a pergunta pede o mês corrente sem movimentações, explicita o último mês disponível. */
export function answer(question: string, data: SandboxSnapshot): ChatBlock[] {
  const q = normalize(question)
  const asksCurrentMonth = has(
    q,
    'este mes',
    'neste mes',
    'mes atual',
    'no mes atual',
    'this month',
  )

  if (!asksCurrentMonth) return answerForMonth(question, data)

  const currentMonth = monthKey(data.asOf)
  const hasCurrentMonthTransactions = data.transactions.some(
    (transaction) => monthKey(transaction.date) === currentMonth,
  )

  if (hasCurrentMonthTransactions) return answerForMonth(question, data)

  const latestDate = data.transactions.reduce(
    (latest, transaction) =>
      transaction.date > latest ? transaction.date : latest,
    '',
  )

  if (!latestDate) {
    return [{
      type: 'text',
      text: 'Em ' + monthName(currentMonth) + ' ainda não há movimentações nem meses anteriores com dados disponíveis.',
    }]
  }

  const lastMonth = monthKey(latestDate)
  if (lastMonth === currentMonth) return answerForMonth(question, data)

  return [
    {
      type: 'text',
      text: 'Em ' + monthName(currentMonth) + ' ainda não há movimentações. O último mês com dados é ' + monthName(lastMonth) + ':',
    },
    ...answerForMonth(question, data),
  ]
}

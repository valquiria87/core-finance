import { categoryLabel } from './categories'
import {
  accountTotals,
  consumptionTotal,
  groupByDay,
  monthKey,
  periodFlows,
  spendingByAccount,
  spendingByCategory,
  spendingByWeek,
} from './finance'
import { formatPercent, formatShortDate, formatUSD, formatUSDOrMissing } from './format'
import type { ChatBlock, SandboxSnapshot } from './types'

/**
 * Motor de respostas do Core (Etapa 1 — regras locais sobre dados da sandbox).
 *
 * Caminho: pergunta -> intenção (tool) -> endpoint -> resposta.
 *  - saldo         -> tool "get_balances"      -> Plaid /accounts/balance/get
 *  - transações    -> tool "get_transactions"  -> Plaid /transactions/get
 *  - padrões       -> tool "spending_patterns" -> derivado de /transactions/get
 *  - conceitos     -> tool "pluggy_docs"       -> Pluggy MCP (https://mcp.pluggy.ai/mcp)
 *
 * Etapa 2: troque este módulo por uma chamada ao backend/ (Node/Express) que
 * orquestra o modelo + servidores MCP com chaves apenas no servidor.
 */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w))

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const monthName = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1]

const typeLabel = { checking: 'Conta corrente', savings: 'Poupança', credit: 'Cartão de crédito' }

function balances(data: SandboxSnapshot): ChatBlock[] {
  const { cash, debt } = accountTotals(data.accounts)
  return [
    {
      type: 'text',
      text: `Você tem ${formatUSD(cash)} em contas. Separadamente, há ${formatUSD(debt)} em faturas de cartão em aberto — isso é valor devido, não dinheiro disponível.`,
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
      rows: data.accounts.map((a) => ({
        conta: `${a.name} ••${a.mask}`,
        tipo: typeLabel[a.type],
        valor: a.type === 'credit' ? `${formatUSDOrMissing(a.current)} devido` : formatUSDOrMissing(a.current),
        extra:
          a.type === 'credit'
            ? `Limite: ${formatUSDOrMissing(a.limit)}`
            : formatUSDOrMissing(a.available),
      })),
      tone: data.accounts.map((a) => ({ valor: a.type === 'credit' ? 'outflow' : 'inflow' })),
      footnote: 'Cartões mostram fatura em aberto / valor devido, nunca saldo disponível.',
    },
  ]
}

function recentTransactions(data: SandboxSnapshot): ChatBlock[] {
  const recent = groupByDay(data.transactions).flatMap((g) => g.items).slice(0, 8)
  const name = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? 'Conta'
  return [
    { type: 'text', text: 'Aqui estão suas 8 transações mais recentes. Saídas em coral, entradas em verde.' },
    {
      type: 'table',
      title: 'Transações recentes',
      columns: [
        { key: 'data', label: 'Data' },
        { key: 'estab', label: 'Estabelecimento' },
        { key: 'conta', label: 'Conta' },
        { key: 'valor', label: 'Valor', align: 'right' },
      ],
      rows: recent.map((t) => ({
        data: formatShortDate(t.date),
        estab: t.pending ? `${t.merchant} (pendente)` : t.merchant,
        conta: name(t.accountId),
        valor: t.amount > 0 ? `− ${formatUSD(t.amount)}` : `+ ${formatUSD(-t.amount)}`,
      })),
      tone: recent.map((t) => ({ valor: t.amount > 0 ? 'outflow' : 'inflow' })),
    },
  ]
}

function categoryTable(data: SandboxSnapshot, key: string): ChatBlock {
  const slices = spendingByCategory(data.transactions, key)
  return {
    type: 'table',
    title: `Padrão 1 · Gastos por categoria (${monthName(key)})`,
    columns: [
      { key: 'cat', label: 'Categoria' },
      { key: 'valor', label: 'Valor', align: 'right' },
      { key: 'pct', label: '%', align: 'right' },
    ],
    rows: slices.map((s) => ({
      cat: categoryLabel(s.id),
      valor: formatUSD(s.value),
      pct: formatPercent(s.percent),
    })),
    tone: slices.map((s): Record<string, 'inflow' | 'outflow' | 'muted'> =>
      s.nonConsumption ? { cat: 'muted', valor: 'muted' } : { valor: 'outflow' },
    ),
    footnote: '* Transferências e pagamento de dívida não são consumo.',
  }
}

function periodTable(data: SandboxSnapshot, key: string): ChatBlock {
  const weeks = spendingByWeek(data.transactions, key)
  return {
    type: 'table',
    title: `Padrão 2 · Gastos por período (${monthName(key)})`,
    columns: [
      { key: 'periodo', label: 'Período' },
      { key: 'qtd', label: 'Transações', align: 'right' },
      { key: 'valor', label: 'Consumo', align: 'right' },
    ],
    rows: weeks.map((w) => ({ periodo: w.label, qtd: String(w.count), valor: formatUSD(w.value) })),
    tone: weeks.map(() => ({ valor: 'outflow' })),
  }
}

function accountTable(data: SandboxSnapshot, key: string): ChatBlock {
  const rows = spendingByAccount(data.transactions, data.accounts, key)
  return {
    type: 'table',
    title: `Padrão 3 · Gastos por conta (${monthName(key)})`,
    columns: [
      { key: 'conta', label: 'Conta' },
      { key: 'qtd', label: 'Transações', align: 'right' },
      { key: 'valor', label: 'Consumo', align: 'right' },
    ],
    rows: rows.map((r) => ({
      conta: `${r.account.name} ••${r.account.mask}`,
      qtd: String(r.count),
      valor: formatUSD(r.value),
    })),
    tone: rows.map(() => ({ valor: 'outflow' })),
  }
}

function monthSpend(data: SandboxSnapshot, key: string): ChatBlock[] {
  const consumption = consumptionTotal(data.transactions, key)
  const { inflow } = periodFlows(data.transactions, key)
  const top = spendingByCategory(data.transactions, key).find((s) => !s.nonConsumption)
  return [
    {
      type: 'text',
      text: `Em ${monthName(key)} você gastou ${formatUSD(consumption)} em consumo, contra ${formatUSD(inflow)} de entradas. A maior categoria foi ${top?.label ?? '—'} (${top ? formatUSD(top.value) : '—'}). Transferências e pagamentos de fatura ficaram de fora, porque não são consumo.`,
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
    text: 'Consentimento é a sua autorização, com prazo e finalidade definidos, para compartilhar dados no Open Finance. Você pode revogar quando quiser pelo app do seu banco.',
  },
  {
    match: ['open finance'],
    text: 'Open Finance é o sistema regulado pelo Banco Central que permite compartilhar seus dados financeiros entre instituições, sempre com o seu consentimento. É isso que permite ver várias contas em um só lugar.',
  },
  {
    match: ['mcp'],
    text: 'MCP (Model Context Protocol) é uma “tomada padrão” entre a IA e fontes externas. Aqui, a Pluggy explica conceitos de Open Finance e a Plaid fornece contas e transações de teste.',
  },
]

export function answer(question: string, data: SandboxSnapshot): ChatBlock[] {
  const q = normalize(question)
  const key = monthKey(data.asOf)

  for (const concept of CONCEPTS) {
    if (has(q, 'o que e', 'oque e', 'explique', 'significa', 'pluggy') && has(q, ...concept.match)) {
      return [{ type: 'text', text: concept.text }]
    }
  }
  if (has(q, 'padro', 'padrao', 'resumo')) {
    return [
      { type: 'text', text: 'Aqui estão seus 3 padrões de gasto deste mês: por categoria, por período e por conta.' },
      categoryTable(data, key),
      periodTable(data, key),
      accountTable(data, key),
    ]
  }
  if (has(q, 'categoria')) {
    return [
      { type: 'text', text: `Este é o retrato dos seus gastos de ${monthName(key)} por categoria.` },
      categoryTable(data, key),
    ]
  }
  if (has(q, 'por conta', 'cada conta', 'qual conta')) {
    return [{ type: 'text', text: 'Veja quanto saiu de cada conta neste mês.' }, accountTable(data, key)]
  }
  if (has(q, 'semana', 'periodo')) {
    return [{ type: 'text', text: 'Veja como seu consumo se distribuiu ao longo do mês.' }, periodTable(data, key)]
  }
  if (has(q, 'gastei', 'gasto', 'gastos', 'despesa')) return monthSpend(data, key)
  if (has(q, 'saldo', 'quanto tenho', 'dinheiro', 'conta')) return balances(data)
  if (has(q, 'transac', 'extrato', 'compras recentes', 'ultimas')) return recentTransactions(data)
  if (has(q, 'divida', 'fatura', 'cartao', 'devo')) {
    const { debt } = accountTotals(data.accounts)
    return [
      { type: 'text', text: `Suas faturas em aberto somam ${formatUSD(debt)}. Isso é valor devido — não entra como dinheiro disponível.` },
      balances(data)[1],
    ]
  }
  if (/\b(oi|ola|bom dia|boa tarde|boa noite)\b/.test(q)) {
    return [{ type: 'text', text: 'Oi! Sou o Core. Posso mostrar seu saldo, suas transações e seus padrões de gasto. Por onde quer começar?' }]
  }

  return [
    {
      type: 'text',
      text: 'Ainda não sei responder isso com os dados de teste. Tente perguntar sobre saldo, gastos do mês, gastos por categoria ou “o que é um Item na Pluggy?”.',
    },
  ]
}

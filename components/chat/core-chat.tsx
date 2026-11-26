'use client'

import { ArrowUp, History, MessageCircle, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Monogram } from '@/components/layout/monogram'
import { Badge } from '@/components/finance/badge'
import type { ChatBlock, ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Message, TypingIndicator } from './message'

const STORAGE_KEY = 'core-finance-chat-history-v1'
const MAX_CONVERSATIONS = 20

type Conversation = {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}

const SUGGESTIONS = [
  'Qual é meu saldo?',
  'Quanto gastei este mês?',
  'Mostre meus gastos por categoria',
  'Meus 3 padrões de gasto',
  'Transações recentes',
  'O que é um Item na Pluggy?',
]

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  blocks: [
    {
      type: 'text',
      text: 'Olá! Sou o Core. Pergunte sobre seus saldos, transações ou padrões de gasto — tudo com dados de teste.',
    },
  ],
}

function createConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'Nova conversa',
    updatedAt: Date.now(),
    messages: [WELCOME],
  }
}

function getConversationTitle(messages: ChatMessage[]) {
  const firstQuestion = messages.find((message) => message.role === 'user')
  const text = firstQuestion?.blocks.find((block) => block.type === 'text')
  return text?.type === 'text' ? text.text.slice(0, 42) : 'Nova conversa'
}

export function CoreChat({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [historyReady, setHistoryReady] = useState(false)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const messages = activeConversation?.messages ?? [WELCOME]

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? (JSON.parse(stored) as Conversation[]) : []
      const valid = Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              typeof item?.id === 'string' &&
              typeof item?.updatedAt === 'number' &&
              Array.isArray(item?.messages) &&
              item.messages.length > 0,
          )
        : []
      const initial = valid.length > 0 ? valid : [createConversation()]
      setConversations(initial.slice(0, MAX_CONVERSATIONS))
      setActiveId(initial[0].id)
    } catch {
      const initial = createConversation()
      setConversations([initial])
      setActiveId(initial.id)
    } finally {
      setHistoryReady(true)
    }
  }, [])

  useEffect(() => {
    if (!historyReady) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)))
    } catch {
      // O chat continua funcionando mesmo se o navegador bloquear o armazenamento local.
    }
  }, [conversations, historyReady])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  function updateConversation(id: string, nextMessages: ChatMessage[]) {
    setConversations((current) =>
      current
        .map((conversation) => ({
          ...conversation,
          messages: conversation.id === id ? nextMessages : conversation.messages,
          title: conversation.id === id ? getConversationTitle(nextMessages) : conversation.title,
          updatedAt: conversation.id === id ? Date.now() : conversation.updatedAt,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_CONVERSATIONS),
    )
  }

  function startNewConversation() {
    if (pending) return
    const conversation = createConversation()
    setConversations((current) => [conversation, ...current].slice(0, MAX_CONVERSATIONS))
    setActiveId(conversation.id)
    setInput('')
  }

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending || !activeId || !activeConversation) return
    const conversationId = activeId
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      blocks: [{ type: 'text', text: message }],
    }
    updateConversation(conversationId, [...activeConversation.messages, userMessage])
    setInput('')
    setPending(true)
    let blocks: ChatBlock[]
    try {
      const res = await fetch('/api/core', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error('Falha na consulta')
      blocks = ((await res.json()) as { blocks: ChatBlock[] }).blocks
    } catch {
      blocks = [
        { type: 'text', text: 'Não consegui falar com a sandbox agora. Verifique sua conexão e tente enviar de novo em instantes.' },
      ]
    }
    const latest = conversations.find((conversation) => conversation.id === conversationId)
    const latestMessages = latest?.messages ?? [...activeConversation.messages, userMessage]
    updateConversation(conversationId, [
      ...latestMessages,
      { id: crypto.randomUUID(), role: 'assistant', blocks },
    ])
    setPending(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Abrir chat do Core"
        aria-expanded={open}
        className={cn(
          'fixed right-4 bottom-24 z-40 flex items-center gap-2 rounded-full bg-coral px-4 py-3.5 font-semibold text-ink shadow-[0_12px_32px_-8px_color-mix(in_oklab,var(--coral)_70%,transparent)] transition-[transform,opacity] duration-200 hover:scale-105 md:right-8 md:bottom-8',
          open && 'pointer-events-none scale-90 opacity-0',
        )}
      >
        <MessageCircle className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">Falar com o Core</span>
      </button>

      <div
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className={cn(
          'fixed inset-0 z-40 hidden bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:block',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="core-chat-title"
        inert={!open}
        className={cn(
          'fixed inset-0 z-50 flex flex-col bg-surface transition-transform duration-300 ease-out md:inset-y-3 md:right-3 md:left-auto md:w-[440px] md:rounded-3xl md:border md:shadow-2xl',
          open ? 'translate-x-0' : 'translate-x-[calc(100%+1.5rem)]',
        )}
      >
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <Monogram />
          <div className="min-w-0 flex-1">
            <h2 id="core-chat-title" className="font-semibold">Core</h2>
            <p className="truncate text-xs text-text-muted">Assistente de Open Finance</p>
          </div>
          <Badge tone="warning">Dados fictícios</Badge>
          <button
            type="button"
            onClick={startNewConversation}
            disabled={pending || !historyReady}
            aria-label="Nova conversa"
            title="Nova conversa"
            className="rounded-full p-2 text-text-muted hover:bg-surface-elev hover:text-foreground disabled:opacity-40"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
          <details className="relative">
            <summary
              aria-label="Abrir histórico de conversas"
              title="Histórico"
              className="list-none cursor-pointer rounded-full p-2 text-text-muted hover:bg-surface-elev hover:text-foreground [&::-webkit-details-marker]:hidden"
            >
              <History className="size-5" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-11 z-10 max-h-64 w-64 overflow-y-auto rounded-xl border bg-surface p-2 shadow-xl">
              <p className="px-2 py-1 text-xs font-semibold text-text-muted">Conversas recentes</p>
              {conversations.length === 0 && (
                <p className="px-2 py-3 text-sm text-text-muted">Nenhuma conversa salva.</p>
              )}
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={(event) => {
                    setActiveId(conversation.id)
                    event.currentTarget.closest('details')?.removeAttribute('open')
                  }}
                  className={cn(
                    'block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-elev',
                    conversation.id === activeId && 'bg-surface-elev font-semibold',
                  )}
                >
                  <span className="block truncate">{conversation.title}</span>
                  <span className="block text-xs text-text-muted">
                    {new Date(conversation.updatedAt).toLocaleString('pt-BR')}
                  </span>
                </button>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar chat"
            className="rounded-full p-2 text-text-muted hover:bg-surface-elev hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <ul ref={listRef} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5">
          {messages.map((message) => <Message key={message.id} message={message} />)}
          {pending && <TypingIndicator />}
        </ul>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            send(input)
          }}
          className="border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2 rounded-2xl border bg-surface-elev p-1.5 focus-within:border-coral/60">
            <label htmlFor="core-input" className="sr-only">Pergunte ao Core</label>
            <textarea
              id="core-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={500}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return
                if (event.nativeEvent.isComposing || event.keyCode === 229) return
                event.preventDefault()
                send(input)
              }}
              placeholder="Pergunte sobre saldo, gastos…"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending || !activeId}
              aria-label="Enviar pergunta"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral text-ink transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="list" aria-label="Sugestões de perguntas">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                role="listitem"
                onClick={() => send(suggestion)}
                disabled={pending || !activeId}
                className="shrink-0 rounded-full border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-coral/50 hover:text-foreground disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </form>
      </aside>
    </>
  )
}

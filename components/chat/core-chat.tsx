

import { ArrowUp, MessageCircle, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Monogram } from '@/components/layout/monogram'
import { Badge } from '@/components/finance/badge'
import type { ChatBlock, ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Message, TypingIndicator } from './message'

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

export function CoreChat({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  async function send(text: string) {
    const message = text.trim()
    if (!message || pending) return
    setInput('')
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', blocks: [{ type: 'text', text: message }] }])
    setPending(true)
    let blocks: ChatBlock[]
    try {
      // Consulta o endpoint Next.js, que busca os dados da Pluggy Sandbox.
      const res = await fetch('/api/core', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      blocks = ((await res.json()) as { blocks: ChatBlock[] }).blocks
    } catch {
      blocks = [
        { type: 'text', text: 'Não consegui falar com a sandbox agora. Verifique sua conexão e tente enviar de novo em instantes.' },
      ]
    }
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', blocks }])
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
          'fixed right-4 bottom-24 z-40 flex items-center gap-2 rounded-full bg-coral px-4 py-3.5 font-semibold text-ink shadow-[0_12px_32px_-8px_color-mix(in_oklab,var(--coral)_70%,transparent)] transition-[transform,opacity] duration-200 hover:scale-105 lg:right-8 lg:bottom-8',
          open && 'pointer-events-none scale-90 opacity-0',
        )}
      >
        <MessageCircle className="size-5" aria-hidden="true" />
        <span className="hidden md:inline">Falar com o Core</span>
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
            <h2 id="core-chat-title" className="font-semibold">
              Core
            </h2>
            <p className="truncate text-xs text-text-muted">Assistente de Open Finance</p>
          </div>
          <Badge tone="warning">Dados fictícios</Badge>
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
          {messages.map((m) => (
            <Message key={m.id} message={m} />
          ))}
          {pending && <TypingIndicator />}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2 rounded-2xl border bg-surface-elev p-1.5 focus-within:border-coral/60">
            <label htmlFor="core-input" className="sr-only">
              Pergunte ao Core
            </label>
            <textarea
              id="core-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) return
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                e.preventDefault()
                send(input)
              }}
              placeholder="Pergunte sobre saldo, gastos…"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending}
              aria-label="Enviar pergunta"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral text-ink transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="relative mt-3 -mx-4 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-7 after:bg-gradient-to-l after:from-surface after:to-transparent">
            <div role="list" aria-label="Sugestões de perguntas" className="scrollbar-hidden flex gap-2 overflow-x-auto px-4 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                role="listitem"
                onClick={() => send(s)}
                disabled={pending}
                className="shrink-0 rounded-full border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-coral/50 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
            </div>
          </div>
        </form>
      </aside>
    </>
  )
}

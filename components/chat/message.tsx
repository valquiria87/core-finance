import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DataTable } from './data-table'
import { Monogram } from '@/components/layout/monogram'

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <li className={cn('animate-fade-up flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <Monogram size="sm" />}
      <div className={cn('flex max-w-[88%] min-w-0 flex-col gap-2', isUser && 'items-end')}>
        <span className="sr-only">{isUser ? 'Você disse:' : 'Core respondeu:'}</span>
        {message.blocks.map((b, i) =>
          b.type === 'text' ? (
            <p
              key={i}
              className={cn(
                'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed text-pretty',
                isUser
                  ? 'rounded-br-md bg-coral text-ink'
                  : 'rounded-bl-md border bg-surface-elev text-foreground',
              )}
            >
              {b.text}
            </p>
          ) : (
            <DataTable key={i} block={b} />
          ),
        )}
      </div>
    </li>
  )
}

export function TypingIndicator() {
  return (
    <li className="flex gap-2" aria-live="polite">
      <Monogram size="sm" />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border bg-surface-elev px-4 py-3">
        <span className="sr-only">Core está digitando…</span>
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            aria-hidden="true"
            className="size-1.5 animate-bounce rounded-full bg-text-muted"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
    </li>
  )
}

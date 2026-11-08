import { FlaskConical } from 'lucide-react'

export function SandboxBanner() {
  return (
    <div
      role="note"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-coral/25 bg-[color-mix(in_oklab,var(--coral)_14%,var(--bg))] px-4 py-2 text-center text-xs font-semibold text-coral backdrop-blur"
    >
      <FlaskConical className="size-3.5 shrink-0" aria-hidden="true" />
      <span>Demonstração · Dados fictícios</span>
      <span className="hidden font-medium text-text-muted sm:inline">
        — Pluggy Sandbox, sem conexão com contas bancárias reais.
      </span>
    </div>
  )
}
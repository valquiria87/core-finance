'use client'

import { House, MessageCircle, PanelLeftClose, PanelLeftOpen, ReceiptText, WalletCards, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Monogram } from './monogram'

export type NavId = 'inicio' | 'contas' | 'transacoes' | 'core'

const ITEMS: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Início', icon: House },
  { id: 'contas', label: 'Contas', icon: WalletCards },
  { id: 'transacoes', label: 'Transações', icon: ReceiptText },
  { id: 'core', label: 'Core', icon: MessageCircle },
]

interface NavProps {
  active: NavId
  onSelect: (id: NavId) => void
}

export function Sidebar({ active, onSelect, collapsed, onToggle }: NavProps & { collapsed: boolean; onToggle: () => void }) {
  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'sticky top-9 hidden h-[calc(100dvh-2.25rem)] shrink-0 flex-col border-r bg-surface/60 p-3 transition-[width] duration-300 md:flex',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      <div className="flex items-center gap-3 px-1.5 py-2">
        <Monogram />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold tracking-tight">Core Finance</p>
            <p className="truncate text-[11px] text-text-muted">Seu núcleo de Open Finance</p>
          </div>
        )}
      </div>
      <ul className="mt-6 flex flex-col gap-1">
        {ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-coral/12 text-coral' : 'text-text-muted hover:bg-surface-elev hover:text-foreground',
                  collapsed && 'justify-center',
                )}
              >
                <item.icon className="size-5 shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        aria-expanded={!collapsed}
        className={cn(
          'mt-auto flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-text-muted hover:bg-surface-elev hover:text-foreground',
          collapsed && 'justify-center',
        )}
      >
        {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
        {!collapsed && <span>Recolher</span>}
      </button>
    </nav>
  )
}

export function BottomNav({ active, onSelect }: NavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const isActive = active === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-coral' : 'text-text-muted',
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

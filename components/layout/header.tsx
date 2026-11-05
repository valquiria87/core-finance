'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/finance/badge'
import { useSandbox } from '@/hooks/use-sandbox'
import { Monogram } from './monogram'

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const { data } = useSandbox()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = !mounted || resolvedTheme === 'dark'
  const live = data?.mode === 'live'

  return (
    <header className="flex items-center gap-3 py-4 md:py-6">
      <Monogram />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">Core Finance</h1>
        <p className="truncate text-xs text-text-muted md:text-sm">
          O núcleo inteligente para suas conexões de Open Finance
        </p>
      </div>
      <Badge tone={live ? 'inflow' : 'coral'} className="hidden sm:inline-flex">
        <span aria-hidden="true" className={live ? 'size-1.5 rounded-full bg-inflow' : 'size-1.5 animate-pulse rounded-full bg-coral'} />
        {live ? 'Integração ativa' : 'Demonstração · Dados fictícios'}
      </Badge>
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        className="flex size-10 items-center justify-center rounded-full border bg-surface text-text-muted transition-colors hover:text-foreground"
      >
        {isDark ? <Sun className="size-[18px]" aria-hidden="true" /> : <Moon className="size-[18px]" aria-hidden="true" />}
      </button>
    </header>
  )
}

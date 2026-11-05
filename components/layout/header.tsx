'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/finance/badge'
import { useSandbox } from '@/hooks/use-sandbox'
import { Monogram } from './monogram'

function greeting(hour: number) {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const { data } = useSandbox()
  const [hello, setHello] = useState('Olá')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setHello(greeting(new Date().getHours()))
    setMounted(true)
  }, [])

  const isDark = !mounted || resolvedTheme === 'dark'
  const live = data?.mode === 'live'

  return (
    <header className="flex items-center gap-3 py-4 md:py-6">
      <span className="md:hidden">
        <Monogram />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted">Core Finance</p>
        <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{hello}, Valquíria</h1>
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

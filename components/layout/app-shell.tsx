'use client'

import { useCallback, useState } from 'react'
import { CoreChat } from '@/components/chat/core-chat'
import { Header } from './header'
import { BottomNav, Sidebar, type NavId } from './navigation'
import { SandboxBanner } from './sandbox-banner'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<NavId>('inicio')
  const [collapsed, setCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const handleChatOpen = useCallback((open: boolean) => {
    setChatOpen(open)
    if (!open) setActive((a) => (a === 'core' ? 'inicio' : a))
  }, [])

  function select(id: NavId) {
    setActive(id)
    if (id === 'core') {
      setChatOpen(true)
      return
    }
    const target = document.getElementById(id)
    if (id === 'inicio') window.scrollTo({ top: 0, behavior: 'smooth' })
    else target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-dvh overflow-x-clip">
      <SandboxBanner />
      <div className="flex">
        <Sidebar active={active} onSelect={select} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div className="min-w-0 flex-1">
          <main className="mx-auto w-full max-w-6xl px-4 pb-32 md:px-8 md:pb-16">
            <Header />
            {children}
          </main>
        </div>
      </div>
      <BottomNav active={active} onSelect={select} />
      <CoreChat open={chatOpen} onOpenChange={handleChatOpen} />
    </div>
  )
}

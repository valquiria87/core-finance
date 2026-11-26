'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/format'

export function CountUp({ value, currency, duration = 900 }: { value: number; currency?: string | null; duration?: number }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(value * eased)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <>
      <span aria-hidden="true">{formatCurrency(display, currency)}</span>
      <span className="sr-only">{formatCurrency(value, currency)}</span>
    </>
  )
}

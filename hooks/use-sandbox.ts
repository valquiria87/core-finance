'use client'

import useSWR from 'swr'
import type { SandboxSnapshot } from '@/lib/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Falha ao carregar dados da sandbox')
  return (await res.json()) as SandboxSnapshot
}

export function useSandbox() {
  return useSWR('/api/sandbox', fetcher, { revalidateOnFocus: false })
}

import { getSupabaseAdmin } from './supabase-admin'
import type { SandboxSnapshot } from './types'

export async function getSavedFinanceSnapshot(): Promise<SandboxSnapshot> {
  const itemId = process.env.PLUGGY_ITEM_ID

  if (!itemId) {
    throw new Error('PLUGGY_ITEM_ID não configurado')
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('finance_snapshots')
    .select('snapshot')
    .eq('pluggy_item_id', itemId)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao consultar snapshot: ${error.message}`)
  }

  if (!data?.snapshot) {
    throw new Error('Ainda não existe snapshot sincronizado para este item Pluggy')
  }

  return data.snapshot as SandboxSnapshot
}

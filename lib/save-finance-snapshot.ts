import { getSupabaseAdmin } from './supabase-admin'
import type { SandboxSnapshot } from './types'

export async function saveFinanceSnapshot(
  itemId: string,
  snapshot: SandboxSnapshot,
) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('finance_snapshots')
    .upsert(
      {
        pluggy_item_id: itemId,
        snapshot,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pluggy_item_id' },
    )
    .select('id')
    .single()

  if (error) {
    throw new Error(`Falha ao salvar snapshot: ${error.message}`)
  }

  return data
}

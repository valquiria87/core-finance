import type { CategoryId } from './types'

export interface CategoryMeta {
  label: string
  color: string
  /** Transferências e pagamentos de dívida não são consumo. */
  nonConsumption?: boolean
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  housing: { label: 'Moradia', color: '#ff6b55' },
  food: { label: 'Alimentação', color: '#fbbf24' },
  shopping: { label: 'Compras', color: '#38bdf8' },
  transport: { label: 'Transporte', color: '#2dd4bf' },
  leisure: { label: 'Lazer', color: '#fb7185' },
  health: { label: 'Saúde', color: '#a3e635' },
  income: { label: 'Receita', color: '#4ade80' },
  transfer: { label: 'Transferência', color: '#7b97a4', nonConsumption: true },
  debt: { label: 'Pagamento de dívida', color: '#506a76', nonConsumption: true },
}

export function categoryLabel(id: CategoryId) {
  const meta = CATEGORIES[id]
  return meta.nonConsumption ? `${meta.label}*` : meta.label
}

import {
  ArrowLeftRight,
  Car,
  CreditCard,
  Film,
  HeartPulse,
  House,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import type { CategoryId } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICONS: Record<CategoryId, LucideIcon> = {
  food: UtensilsCrossed,
  transport: Car,
  shopping: ShoppingBag,
  leisure: Film,
  housing: House,
  health: HeartPulse,
  income: Wallet,
  transfer: ArrowLeftRight,
  debt: CreditCard,
}

export function CategoryIcon({ id, size = 'md' }: { id: CategoryId; size?: 'sm' | 'md' }) {
  const Icon = ICONS[id]
  const color = CATEGORIES[id].color
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-10' : 'size-7',
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
    >
      <Icon className={size === 'md' ? 'size-[18px]' : 'size-3.5'} />
    </span>
  )
}

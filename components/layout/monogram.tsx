import { cn } from '@/lib/utils'

export function Monogram({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]',
        size === 'md' ? 'size-10 text-lg' : 'size-7 text-xs',
      )}
      style={{ background: 'linear-gradient(135deg, #ff8a6b 0%, #e04a33 55%, #0f4c4a 130%)' }}
    >
      C
    </span>
  )
}

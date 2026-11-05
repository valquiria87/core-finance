import { cn } from '@/lib/utils'

const tones = {
  neutral: 'border-border bg-surface-elev text-text-muted',
  coral: 'border-coral/30 bg-coral/10 text-coral',
  inflow: 'border-inflow/30 bg-inflow/10 text-inflow',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.ComponentProps<'span'> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

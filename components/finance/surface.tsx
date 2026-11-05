import { cn } from '@/lib/utils'

export function Surface({
  className,
  delay = 0,
  interactive = false,
  style,
  ...props
}: React.ComponentProps<'section'> & { delay?: number; interactive?: boolean }) {
  return (
    <section
      className={cn(
        'animate-fade-up rounded-3xl border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.25)] md:p-6',
        interactive && 'transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-coral/40',
        className,
      )}
      style={{ animationDelay: `${delay}ms`, ...style }}
      {...props}
    />
  )
}

export function SectionTitle({
  title,
  subtitle,
  action,
  id,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  id?: string
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-lg font-semibold tracking-tight text-balance">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

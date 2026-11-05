import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-0 -m-3 rounded-full bg-coral/10 blur-xl" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border bg-surface-elev text-coral">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      </div>
      <p className="font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-text-muted text-pretty">{description}</p>
      {action}
    </div>
  )
}

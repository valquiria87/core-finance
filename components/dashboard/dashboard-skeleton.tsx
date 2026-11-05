export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando dados da sandbox" className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="skeleton h-56 rounded-3xl" />
        <div className="skeleton h-56 rounded-3xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-48 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-72 rounded-3xl" />
        <div className="space-y-3 rounded-3xl border bg-surface p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-2.5 w-1/3" />
              </div>
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

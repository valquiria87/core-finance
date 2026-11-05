export interface DonutSlice {
  id: string
  value: number
  color: string
  label: string
}

export function Donut({
  slices,
  size = 200,
  thickness = 22,
  children,
  label,
}: {
  slices: DonutSlice[]
  size?: number
  thickness?: number
  children?: React.ReactNode
  label: string
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const gap = slices.length > 1 ? 3 : 0
  let offset = 0

  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-elev)" strokeWidth={thickness} />
        {slices.map((s) => {
          const len = (s.value / total) * c
          const dash = Math.max(0, len - gap)
          const el = (
            <circle
              key={s.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className="transition-[stroke-dasharray] duration-700"
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

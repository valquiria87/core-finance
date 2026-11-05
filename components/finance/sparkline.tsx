import { useId } from 'react'

export function Sparkline({
  data,
  width = 140,
  height = 48,
  label,
}: {
  data: number[]
  width?: number
  height?: number
  label: string
}) {
  const id = useId()
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 4
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return [x, y] as const
  })
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const [lx, ly] = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--inflow)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--inflow)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="var(--inflow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="var(--inflow)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  )
}

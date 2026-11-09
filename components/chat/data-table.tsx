import type { ChatBlock } from '@/lib/types'
import { cn } from '@/lib/utils'

type TableBlock = Extract<ChatBlock, { type: 'table' }>

const toneClass = { inflow: 'text-inflow', outflow: 'text-outflow', muted: 'text-text-muted' }

export function DataTable({ block }: { block: TableBlock }) {
  return (
    <figure className="w-full overflow-hidden rounded-2xl border bg-surface-elev">
      <figcaption className="border-b px-3 py-2 text-xs font-semibold">{block.title}</figcaption>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={block.title}>
        <table className="w-full min-w-0 table-auto text-xs">
          <thead>
            <tr className="text-text-muted">
              {block.columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn('px-2 py-2 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {block.rows.map((row, i) => (
              <tr key={i}>
                {block.columns.map((c) => {
                  const tone = block.tone?.[i]?.[c.key]
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        'px-2 py-2 tabular-nums',
                        c.align === 'right' ? 'whitespace-nowrap text-right font-semibold' : 'min-w-0 whitespace-normal break-words text-left',
                        tone && toneClass[tone],
                      )}
                    >
                      {row[c.key]}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.footnote && <p className="border-t px-3 py-2 text-[11px] text-text-muted">{block.footnote}</p>}
    </figure>
  )
}

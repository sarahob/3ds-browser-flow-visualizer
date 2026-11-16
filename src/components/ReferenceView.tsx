import type { Ref } from 'react'
import type { RefPage } from '../data/reference'

export function ReferenceView({ page, headingRef }: { page: RefPage; headingRef?: Ref<HTMLHeadingElement> }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
        {page.title}
      </h1>
      <p className="mt-1 text-xs text-muted">{page.sources.join(' · ')}</p>
      <p className="mt-4 text-[15px] leading-relaxed">{page.lead}</p>
      <div className="mt-6 space-y-8">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="mb-3 text-lg font-semibold">{s.heading}</h2>
            {s.table && (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      {s.table.head.map((h, i) => (
                        <th key={i} className="px-3 py-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r, i) => {
                      const hl = s.table?.highlight?.includes(i)
                      return (
                        <tr
                          key={i}
                          data-highlight={hl || undefined}
                          className={`border-t border-slate-100 align-top dark:border-slate-800 ${hl ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''}`}
                        >
                          {r.map((c, j) => (
                            <td
                              key={j}
                              className={`px-3 py-2 align-top ${j === 0 ? 'font-medium [overflow-wrap:break-word]' : '[overflow-wrap:anywhere]'} ${hl && j === 0 ? 'border-l-4 border-l-indigo-500' : ''}`}
                            >
                              {hl && j === 0 && <span className="sr-only">Highlighted: </span>}
                              {c}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {s.bullets && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed marker:text-slate-400">
                {s.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
            {s.code && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-[12.5px] leading-relaxed text-slate-100 dark:bg-slate-900/80">
                {s.code}
              </pre>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

import { partyById, phases } from '../data/meta'
import { resolve, type PathId, type Step } from '../data/types'

export const STEP_LIST_ID = 'step-list'

/** The path's steps, grouped by phase, numbered 1…N. */
export function StepList({
  pathSteps,
  order,
  path,
  onSelect,
}: {
  pathSteps: Step[]
  order: Map<string, number>
  path: PathId
  onSelect: (id: string) => void
}) {
  const first = pathSteps[0]
  return (
    <section
      id={STEP_LIST_ID}
      aria-label="Steps"
      className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <h2 tabIndex={-1} className="text-xs font-semibold uppercase tracking-wide text-muted focus:outline-none">{pathSteps.length} steps in this path</h2>
        {first && (
          <button
            onClick={() => onSelect(first.id)}
            className="ml-auto rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Start →
          </button>
        )}
      </div>
      <ol className="flex-1 overflow-y-auto px-3 py-2">
        {pathSteps.map((s, i) => {
          const head = i === 0 || pathSteps[i - 1]?.phase !== s.phase ? phases[s.phase].name : undefined
          return (
            <li key={s.id}>
              {head && <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{head}</div>}
              <button
                data-step={s.id}
                data-order={order.get(s.id)}
                onClick={() => onSelect(s.id)}
                className="flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <span className="w-8 shrink-0 text-right text-xs font-semibold text-muted">{order.get(s.id)}</span>
                <span className="min-w-0">
                  <span className="block text-sm">{s.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {resolve(s.label, path)}
                    {` · spec ${s.num}`}
                    {s.to ? '' : ` · inside ${partyById[s.from].name}`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="border-t border-slate-200 px-4 py-2 text-xs text-muted dark:border-slate-800">
        Click a step here or on the diagram · ← → walk the path · 1–6 switch path
      </p>
    </section>
  )
}

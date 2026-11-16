import type { Ref } from 'react'
import { partyById, pathById, paths } from '../data/meta'
import { reqText } from '../data/reqs'
import type { Step } from '../data/types'
import { Link } from './Link'

/** Step → spec requirement traceability, for checking the tool against the PDF. */
export function SpecCheckView({
  steps,
  stepHref,
  onOpen,
  headingRef,
}: {
  steps: Step[]
  /** Link to a step in the flow. */
  stepHref: (s: Step) => string
  /** Runs when a step link navigates in the app, with the link's URL. */
  onOpen: (to: string) => void
  headingRef?: Ref<HTMLHeadingElement>
}) {
  const cited = steps.filter((s) => s.reqs?.length)
  const total = new Set(cited.flatMap((s) => s.reqs!)).size
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
        Spec check
      </h1>
      <p className="mt-1 text-xs text-muted">
        EMV 3DS Protocol and Core Functions v2.3.1.1 · section 3.3 (browser flow), 3.5 (SPC), 4.3 (processing screens), 5.8 (3DS Method and challenge iframe)
      </p>
      <p className="mt-4 text-[15px] leading-relaxed">
        Every step in the diagram, with the spec requirements it is built from. {total} requirements across {cited.length} steps, each
        summarised in one line. Steps without a numbered rule (the cardholder's own actions, the SPC browser steps 10b–10c, and the
        passkey steps from the FIDO white paper) have none in the core spec.
      </p>
      <ol className="mt-6 space-y-5">
        {steps.map((s) => (
          <li key={s.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold dark:bg-slate-800">EMV spec step {s.num}</span>
              <Link to={stepHref(s)} onNavigate={onOpen} className="text-left font-semibold hover:text-indigo-700 hover:underline dark:hover:text-indigo-300">
                {s.title}
              </Link>
              <span className="text-xs text-muted">
                {partyById[s.from].name}
                {s.to && ` → ${partyById[s.to].name}`}
              </span>
              <span className="ml-auto text-xs text-muted">
                {s.paths.length === paths.length ? 'all paths' : s.paths.map((p) => pathById[p].short).join(', ')}
              </span>
            </div>
            {s.reqs?.length ? (
              <ul className="mt-3 space-y-1.5">
                {s.reqs.map((r) => (
                  <li key={r} className="flex gap-3 text-sm">
                    <span className="w-16 shrink-0 font-mono text-xs leading-5 text-muted">Req {r}</span>
                    <span className="leading-5">{reqText[r] ?? '—'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No numbered core-spec requirement.</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

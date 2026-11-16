import { useId, type Ref } from 'react'
import { partyById, phases } from '../data/meta'
import { reference } from '../data/reference'
import { Link } from './Link'
import { resolve, type PartyId, type PathId, type RefId, type Step } from '../data/types'

const partyName = (id: PartyId) => {
  const p = partyById[id]
  return `${p.name} (${p.role})`
}

interface Props {
  step: Step
  path: PathId
  /** 0-based position of the step in the path. */
  index: number
  /** Number of steps in the path. */
  total: number
  onClose: () => void
  onGo: (i: number) => void
  /** Link to a reference page, and what runs when it navigates in the app. */
  refHref: (r: RefId) => string
  onRef: (to: string) => void
  /** The step title; the app moves focus here when the list or diagram opens a step. */
  headingRef?: Ref<HTMLHeadingElement>
}

export function StepPanel({ step, path, index, total, onClose, onGo, refHref, onRef, headingRef }: Props) {
  const headingId = useId()
  const fields = step.fields && step.fields.rows.filter((f) => !f.paths || f.paths.includes(path))
  const note = step.pathNote?.[path]
  const sdkNote = resolve(step.sdkNote, path)
  const redirectNote = resolve(step.redirectNote, path)
  const who = step.to ? [step.from, step.to] : [step.from]
  return (
    <section
      aria-labelledby={headingId}
      className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <span data-testid="panel-step" className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
          Step {index + 1}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{phases[step.phase].name}</span>
        {step.newIn23 && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
            New in 2.3
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconBtn label="All steps (Esc)" onClick={onClose}>
            ☰
          </IconBtn>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div>
          <h2 ref={headingRef} id={headingId} tabIndex={-1} className="text-lg font-semibold leading-snug focus:outline-none">
            {step.title}
          </h2>
          <span
            data-testid="spec-pill"
            title="Step number in EMV 3DS v2.3.1.1 section 3.3 / 3.5"
            className="mt-2 inline-block rounded-full border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            EMV spec step {step.num}
          </span>
          <p className="mt-1 text-sm text-muted">
            {partyName(step.from)}
            {step.to && <> → {partyName(step.to)}</>}
          </p>
          <details className="mt-1 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted">Who {who.length > 1 ? 'are they' : 'is that'}?</summary>
            <dl className="mt-1 space-y-1">
              {who.map((id) => (
                <div key={id}>
                  <dt className="inline font-medium">{partyById[id].name}: </dt>
                  <dd className="inline">{partyById[id].blurb}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>

        <p className="text-[15px] leading-relaxed">{resolve(step.what, path)}</p>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-400/10">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Why it matters</h3>
          <p className="text-sm leading-relaxed">{resolve(step.why, path)}</p>
          {note && <p className="mt-2 text-sm leading-relaxed">{note}</p>}
        </div>

        {sdkNote && (
          <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 dark:border-violet-400/30 dark:bg-violet-400/10">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
              With the Adyen web SDK (on the merchant page)
            </h3>
            <p className="text-sm leading-relaxed">{sdkNote}</p>
          </div>
        )}

        {redirectNote && (
          <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 dark:border-sky-400/30 dark:bg-sky-400/10">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">With a redirect (PSP-hosted page)</h3>
            <p className="text-sm leading-relaxed">{redirectNote}</p>
          </div>
        )}

        {step.fields && fields && fields.length > 0 && (
          <div>
            <h3 data-testid="fields-label" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {step.fields.label}
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Value and note</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr
                      key={`${f.name}:${f.paths?.join() ?? ''}`}
                      className={`border-b border-slate-100 align-top last:border-0 dark:border-slate-800 ${
                        f.key ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : ''
                      }`}
                    >
                      <td className="w-[44%] px-3 py-2">
                        <code className="break-all font-mono text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">{f.name}</code>
                        {f.source && (
                          <span className="mt-1 block w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {f.source}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <code className="break-all font-mono text-[12px]">{resolve(f.value, path)}</code>
                        <div className="mt-0.5 text-xs text-muted">{resolve(f.note, path)}</div>
                        {f.becomes && <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">→ {f.becomes}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-muted">
              Names are EMV 3DS fields unless tagged. Highlighted rows are what makes this path different. Values are illustrative.
            </p>
          </div>
        )}

        {step.refs && step.refs.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Related rules</h3>
            <div className="flex flex-wrap gap-2">
              {step.refs.map((r) => (
                <Link
                  key={r}
                  to={refHref(r)}
                  onNavigate={onRef}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  {reference[r].title} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Pager index={index} total={total} onGo={onGo} />
    </section>
  )
}

/**
 * First / back / "i of N" / forward / last. The end buttons use aria-disabled rather than
 * disabled, so a focused button keeps focus when it reaches the end.
 */
function Pager({ index: i, total, onGo }: { index: number; total: number; onGo: (i: number) => void }) {
  const btn = (label: string, glyph: string, to: number, off: boolean) => (
    <button
      title={label}
      aria-label={label}
      aria-disabled={off || undefined}
      onClick={() => {
        if (!off) onGo(to)
      }}
      className="grid h-9 min-w-9 place-items-center rounded-md border border-slate-200 px-2 text-base leading-none text-slate-700 hover:bg-slate-100 aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {glyph}
    </button>
  )
  return (
    <nav aria-label="Step pages" className="flex items-center gap-1.5 border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
      {btn('First step', '«', 0, i <= 0)}
      {btn('Previous step (←)', '‹', i - 1, i <= 0)}
      <span className="flex-1 text-center text-sm tabular-nums text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">{i + 1}</span> of {total}
      </span>
      {btn('Next step (→)', '›', i + 1, i >= total - 1)}
      {btn('Last step', '»', total - 1, i >= total - 1)}
    </nav>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md text-lg leading-none text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  )
}

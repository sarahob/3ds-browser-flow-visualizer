import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from './components/Link'
import { MoreInfoMenu } from './components/MoreInfoMenu'
import { ReferenceView } from './components/ReferenceView'
import { Segmented } from './components/Segmented'
import { SequenceView } from './components/SequenceView'
import { SpecCheckView } from './components/SpecCheckView'
import { StepList, STEP_LIST_ID } from './components/StepList'
import { StepPanel } from './components/StepPanel'
import { chipOf, chips, pathById, variantsOf } from './data/meta'
import { pathOrder, stepsInPath } from './data/order'
import { reference } from './data/reference'
import { steps } from './data/steps'
import type { PathId } from './data/types'
import { BASE, cameFromHistory, DEFAULT_PATH, flowHref, hrefOf, navigate, savedScroll, useRoute } from './lib/route'

const THEME_KEY = '3ds-viz-theme'
const LOGO = `${BASE}favicon.svg`

/**
 * Where focus goes once the app reaches the location `at`, because the element that had it goes
 * away. A request for a navigation that didn't happen is dropped at the next location change.
 */
type FocusTarget = { at: string } & ({ kind: 'heading' } | { kind: 'list' } | { kind: 'row'; id: string })

/** Single-key shortcuts only act when focus is on the page itself or inside the flow area, never in a form control. */
function shortcutsAllowed(e: KeyboardEvent) {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return false
  const t = e.target
  if (!(t instanceof Element)) return true
  if (t === document.body || t === document.documentElement) return true
  return !!t.closest('[data-hotkeys]') && !t.closest('input, textarea, select, [contenteditable]')
}

export default function App() {
  const { route, key: location } = useRoute()
  const flow = route.view === 'flow' ? route : undefined

  // the path last shown in the flow; Spec check keeps it when a step is on it
  const [lastPath, setLastPath] = useState<PathId>(flow?.path ?? DEFAULT_PATH)
  if (flow && flow.path !== lastPath) setLastPath(flow.path)

  // show the normalised URL (unknown values dropped, step on its path)
  useEffect(() => {
    if (route.view === 'notfound') return
    const href = hrefOf(route)
    if (href !== window.location.pathname + window.location.search) navigate(href, { replace: true })
  }, [route])

  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // focus: move it somewhere sensible when the element that had it goes away
  const pendingFocusRef = useRef<FocusTarget | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const f = pendingFocusRef.current
    pendingFocusRef.current = null
    if (cameFromHistory()) {
      // Back/Forward: restore the page's scroll position, then put focus on what the page is about
      const scroller = document.querySelector<HTMLElement>('[data-scroll-restore]')
      if (scroller) scroller.scrollTop = savedScroll() ?? 0
      const target = headingRef.current ?? document.querySelector<HTMLElement>('main[data-hotkeys]')
      target?.focus({ preventScroll: true })
      return
    }
    if (!f || f.at !== location) return
    if (f.kind === 'row') document.querySelector<HTMLElement>(`#${STEP_LIST_ID} [data-step="${f.id}"]`)?.focus()
    else if (f.kind === 'list') document.querySelector<HTMLElement>(`#${STEP_LIST_ID} h2`)?.focus()
    else headingRef.current?.focus({ preventScroll: true })
  }, [location])
  const focusHeadingAt = (at: string) => {
    pendingFocusRef.current = { kind: 'heading', at }
  }

  /** Path chip: keeps the current variant when it is already the chosen chip; a new path starts at its step list. */
  const choosePath = (chip: PathId) => {
    const p = flow && chipOf(flow.path) === chip ? flow.path : chip
    const to = flowHref(p)
    // a hotkey from inside the flow unmounts the panel or list that had focus: go to the new list
    const a = document.activeElement
    if (a && a !== document.body && a.closest('main[data-hotkeys]') && !a.matches('main')) pendingFocusRef.current = { kind: 'list', at: to }
    navigate(to)
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!flow || !shortcutsAllowed(e)) return
    const pathSteps = stepsInPath(steps, flow.path)
    const index = pathSteps.findIndex((s) => s.id === flow.step)
    const last = pathSteps.length - 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      const next = index === -1 ? (dir === 1 ? 0 : last) : Math.min(last, Math.max(0, index + dir))
      const id = pathSteps[next]?.id
      if (!id) return
      const to = flowHref(flow.path, id)
      // from the list, the panel replaces the focused row; otherwise focus stays where it is
      if (index === -1) focusHeadingAt(to)
      navigate(to, { replace: true })
    } else if (e.key === 'Escape') {
      const to = flowHref(flow.path)
      if (flow.step) pendingFocusRef.current = { kind: 'row', id: flow.step, at: to }
      navigate(to, { replace: true })
    } else {
      const c = chips.find((x) => x.hotkey === e.key)
      if (c) choosePath(c.id)
    }
  })
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <img src={LOGO} alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
          <div>
            <h1 className="text-base font-semibold leading-tight">
              <Link to={flowHref(lastPath)} className="hover:underline">
                3DS Browser Flow Visualizer
              </Link>
            </h1>
            <p className="hidden text-xs text-muted xl:block">EMV 3DS v2.3.1.1 browser flow</p>
          </div>
        </div>
        <Segmented
          legend="Authentication path"
          name="path"
          options={chips.map((c) => ({ value: c.id, label: c.label }))}
          value={flow && chipOf(flow.path)}
          onChange={choosePath}
        />
        <div className="ml-auto flex items-center gap-2">
          <MoreInfoMenu current={route.view} onNavigate={focusHeadingAt} />
          <button
            onClick={() => {
              const next = !dark
              setDark(next)
              try {
                localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
              } catch {
                /* storage unavailable */
              }
            }}
            title={dark ? 'Switch to the light theme' : 'Switch to the dark theme'}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      {route.view === 'flow' ? (
        <Flow path={route.path} selected={route.step} headingRef={headingRef} pendingFocusRef={pendingFocusRef} />
      ) : (
        <main data-scroll-restore className="flex-1 overflow-y-auto">
          {route.view === 'notfound' ? (
            <div className="mx-auto max-w-4xl px-6 py-8">
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold focus:outline-none">
                Page not found
              </h1>
              <p className="mt-4 text-[15px]">
                There is no page at this address.{' '}
                <Link to={flowHref(DEFAULT_PATH)} className="text-indigo-700 underline dark:text-indigo-300">
                  Go to the flow
                </Link>
                .
              </p>
            </div>
          ) : route.view === 'spec' ? (
            <SpecCheckView
              steps={steps}
              headingRef={headingRef}
              stepHref={(s) => flowHref(s.paths.includes(lastPath) ? lastPath : (s.paths[0] ?? lastPath), s.id)}
              onOpen={focusHeadingAt}
            />
          ) : (
            <ReferenceView page={reference[route.view]} headingRef={headingRef} />
          )}
        </main>
      )}
    </div>
  )
}

/** The flow screen: variant switch and path summary, then the step list or panel beside the sequence diagram. */
function Flow({
  path,
  selected,
  headingRef,
  pendingFocusRef,
}: {
  path: PathId
  selected?: string
  headingRef: React.RefObject<HTMLHeadingElement | null>
  /** Where App should move focus after the next navigation. */
  pendingFocusRef: React.RefObject<FocusTarget | null>
}) {
  const pathSteps = useMemo(() => stepsInPath(steps, path), [path])
  const order = useMemo(() => pathOrder(steps, path), [path])
  const index = selected === undefined ? -1 : pathSteps.findIndex((s) => s.id === selected)
  const current = pathSteps[index]
  const pathInfo = pathById[path]
  const chip = chips.find((c) => c.id === chipOf(path))!
  const variants = variantsOf(chip.id)

  /** Open a step from the list or the diagram: focus moves to the step title. */
  const openStep = (id: string) => {
    const to = flowHref(path, id)
    pendingFocusRef.current = { kind: 'heading', at: to }
    navigate(to, { replace: true })
  }
  /** Back to the step list: focus returns to the row of the step that was open. */
  const closeStep = () => {
    const to = flowHref(path)
    if (current) pendingFocusRef.current = { kind: 'row', id: current.id, at: to }
    navigate(to, { replace: true })
  }

  const diagramLabel = `${chip.label}${pathInfo.parent ? ` (${pathInfo.variantLabel})` : ''}: sequence of ${pathSteps.length} steps${
    current ? `, step ${index + 1} selected: ${current.title}` : ''
  }`

  return (
    <main data-hotkeys tabIndex={-1} className="flex min-h-0 flex-1 flex-col focus:outline-none">
      {/* one live region for the whole flow, mounted before any step opens, so the first change is read */}
      <p aria-live="polite" className="sr-only">
        {current ? `Step ${index + 1} of ${pathSteps.length}: ${current.title}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-5 py-2.5 dark:border-slate-800">
        {variants.length > 0 && (
          <Segmented
            legend="Who runs it"
            name="variant"
            size="sm"
            options={variants.map((v) => ({ value: v.id, label: v.variantLabel ?? v.short }))}
            value={path}
            onChange={(v) => navigate(flowHref(v))}
          />
        )}
        <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            EMV 3DS {pathInfo.version}
          </span>
          {pathInfo.summary} <span className="font-medium text-slate-900 dark:text-white">{pathInfo.outcome}</span>
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-[min(480px,42vw)] shrink-0">
          {current ? (
            <StepPanel
              step={current}
              path={path}
              index={index}
              total={pathSteps.length}
              headingRef={headingRef}
              onClose={closeStep}
              onGo={(i) => {
                const id = pathSteps[i]?.id
                if (id) navigate(flowHref(path, id), { replace: true })
              }}
              refHref={(r) => hrefOf({ view: r })}
              onRef={(at) => {
                pendingFocusRef.current = { kind: 'heading', at }
              }}
            />
          ) : (
            <StepList key={path} pathSteps={pathSteps} order={order} path={path} onSelect={openStep} />
          )}
        </div>
        <SequenceView path={path} pathSteps={pathSteps} order={order} selectedId={current?.id} onSelect={openStep} label={diagramLabel} />
      </div>
    </main>
  )
}

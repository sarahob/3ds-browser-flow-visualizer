import { useMemo, useSyncExternalStore } from 'react'
import { paths } from '../data/meta'
import { steps } from '../data/steps'
import type { PathId } from '../data/types'
import { moreInfo, type PageId } from './views'

/**
 * A small hand-rolled router. The app has one dynamic screen (the flow at `/`, state in the
 * query) and six static pages, so a route table plus the History API is all it needs.
 */
export type Route =
  | { view: 'flow'; path: PathId; /** Always a step on `path`, or undefined. */ step?: string }
  | { view: PageId }
  | { view: 'notfound' }

export const DEFAULT_PATH: PathId = 'frictionless'

/**
 * The URL path the app is served from, with a trailing slash: Vite's `base`, '/' by default.
 * Build with `vite build --base=/sub/` to host it in a folder.
 */
export const BASE = import.meta.env.BASE_URL

/**
 * Read a route from a location, normalised: an unknown path chip falls back to the default, an
 * unknown step is dropped, and a step that is not on the asked path switches to the first path
 * that has it (the same rule as opening a step from Spec check). Unknown query parameters are ignored.
 */
export function readRoute(pathname: string, search: string): Route {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '')
  const slug = rest.replace(/\/+$/, '')
  if (slug === '' || slug === 'index.html') {
    const q = new URLSearchParams(search)
    const asked = paths.find((p) => p.id === q.get('path'))?.id ?? DEFAULT_PATH
    const s = steps.find((x) => x.id === q.get('step'))
    const path = s && !s.paths.includes(asked) ? (s.paths[0] ?? asked) : asked
    return { view: 'flow', path, step: s?.id }
  }
  const page = moreInfo.find((p) => p.slug === slug)
  return page ? { view: page.id } : { view: 'notfound' }
}

/** The URL of a route (path and query, under the app's base). */
export function hrefOf(r: Route): string {
  if (r.view === 'notfound') return BASE
  if (r.view !== 'flow') return BASE + moreInfo.find((p) => p.id === r.view)!.slug
  const q = new URLSearchParams()
  q.set('path', r.path)
  if (r.step) q.set('step', r.step)
  return `${BASE}?${q}`
}

export const flowHref = (path: PathId, step?: string) => hrefOf({ view: 'flow', path, step })

// ── location store

const listeners = new Set<() => void>()
const emit = () => {
  for (const l of listeners) l()
}

/** True when the current location came from Back/Forward rather than navigate(). */
let popped = false
export const cameFromHistory = () => popped

/** Scroll position of the page's scroller (`[data-scroll-restore]`), kept per history entry. */
const scroller = () => document.querySelector<HTMLElement>('[data-scroll-restore]')
export const savedScroll = (): number | undefined => (window.history.state as { scroll?: number } | null)?.scroll

window.addEventListener('popstate', () => {
  popped = true
  emit()
})

/**
 * Go to a URL in the app. Pages and path changes push a history entry so Back works (the scroll
 * position of the page being left is saved in its entry); step changes inside the flow replace
 * the entry, so walking the pager doesn't flood history (the hash is kept).
 * Returns false when the URL didn't change.
 */
export function navigate(to: string, { replace = false } = {}): boolean {
  const here = window.location.pathname + window.location.search
  if (to === here) return false
  popped = false
  if (replace) window.history.replaceState(window.history.state, '', to + window.location.hash)
  else {
    window.history.replaceState({ ...(window.history.state ?? {}), scroll: scroller()?.scrollTop ?? 0 }, '')
    window.history.pushState(null, '', to)
  }
  emit()
  return true
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

const snapshot = () => window.location.pathname + window.location.search

/** The current route; re-renders on navigate() and Back/Forward. `key` changes with every location. */
export function useRoute(): { route: Route; key: string } {
  const key = useSyncExternalStore(subscribe, snapshot, snapshot)
  const route = useMemo(() => {
    const q = key.indexOf('?')
    return q === -1 ? readRoute(key, '') : readRoute(key.slice(0, q), key.slice(q))
  }, [key])
  return { route, key }
}

import { useEffect, useId, useRef, useState } from 'react'
import { hrefOf, type Route } from '../lib/route'
import { moreInfo } from '../lib/views'
import { Link } from './Link'

/**
 * Disclosure navigation: a button that shows a list of links to the More info pages.
 * Escape closes it and returns focus to the button without reaching the app's shortcuts.
 * A click or focus outside closes it too.
 */
export function MoreInfoMenu({
  current,
  onNavigate,
}: {
  current: Route['view']
  /** Runs when a page link navigates in the app, with the link's URL. */
  onNavigate: (to: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const active = moreInfo.find((v) => v.id === current)
  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          buttonRef.current?.focus()
        }
      }}
      onBlur={(e) => {
        if (open && e.relatedTarget && !ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
          active
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`}
      >
        More info
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </button>
      <ul
        id={listId}
        aria-label="More info pages"
        hidden={!open}
        className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        {moreInfo.map((v) => (
          <li key={v.id}>
            <Link
              to={hrefOf({ view: v.id })}
              aria-current={v.id === current ? 'page' : undefined}
              onNavigate={(to) => {
                setOpen(false)
                onNavigate(to)
              }}
              className={`block px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                v.id === current ? 'font-semibold text-indigo-700 dark:text-indigo-300' : ''
              }`}
            >
              {v.title}
              <span className="block text-xs font-normal text-muted">{v.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

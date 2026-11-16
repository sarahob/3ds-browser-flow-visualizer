import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { parties } from '../data/meta'
import type { PathId, Step } from '../data/types'
import { computeLayout } from '../lib/layout'
import { useReducedMotion } from '../lib/useReducedMotion'
import { SequenceDiagram } from './SequenceDiagram'

/** Height of the sticky party header; the scroll-into-view maths depends on it. */
const HEADER_H = 56
const MIN_W = 820

interface Props {
  path: PathId
  pathSteps: Step[]
  order: Map<string, number>
  selectedId?: string
  onSelect: (id: string) => void
  /** Accessible name of the diagram. */
  label: string
}

/** The sequence diagram with its sticky party header, sized to its container and scrolled to the selected step. */
export function SequenceView({ path, pathSteps, order, selectedId, onSelect, label }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(MIN_W)
  const reduce = useReducedMotion()

  // measure before the first paint, then follow resizes
  useLayoutEffect(() => {
    const el = wrapRef.current!
    setWidth(Math.max(MIN_W, el.clientWidth))
    const ro = new ResizeObserver(([e]) => {
      if (e) setWidth(Math.max(MIN_W, Math.floor(e.contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => computeLayout(pathSteps, width, { rowH: 54 }), [pathSteps, width])

  // keep the selected step in view
  useEffect(() => {
    const row = layout.rows.find((r) => r.step.id === selectedId)
    const el = scrollRef.current
    if (!row || !el) return
    const top = row.y + HEADER_H
    if (top < el.scrollTop + 80 || top > el.scrollTop + el.clientHeight - 120)
      el.scrollTo({ top: top - el.clientHeight / 2, behavior: reduce ? 'auto' : 'smooth' })
  }, [selectedId, layout, reduce])

  return (
    <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto">
      <div ref={wrapRef} className="relative" style={{ minWidth: MIN_W }}>
        <div
          className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
          style={{ height: HEADER_H }}
        >
          {parties.map((p) => (
            <div
              key={p.id}
              title={p.blurb}
              className="absolute top-2 -translate-x-1/2 text-center"
              style={{ left: layout.x(p.id), width: layout.colW - 8 }}
            >
              <div className="text-sm font-semibold leading-tight">{p.name}</div>
              <div className="truncate text-[11px] text-muted">{p.role}</div>
            </div>
          ))}
        </div>
        <SequenceDiagram layout={layout} path={path} order={order} selectedId={selectedId} onSelect={onSelect} label={label} />
      </div>
    </div>
  )
}

import { parties } from '../data/meta'
import type { PartyId, PhaseId, Step } from '../data/types'

export interface Placed {
  step: Step
  y: number
}

export interface Layout {
  width: number
  height: number
  gutter: number
  rowH: number
  x: (p: PartyId) => number
  colW: number
  rows: Placed[]
  bands: { phase: PhaseId; y0: number; y1: number }[]
  iframes: { kind: 'method' | 'challenge'; y0: number; y1: number }[]
}

/** Geometry of the sequence diagram for the steps of one path (already filtered and in order). */
export function computeLayout(pathSteps: Step[], width: number, opts: { rowH: number }): Layout {
  const gutter = 72
  const right = 16
  const colW = (width - gutter - right) / parties.length
  const idx = new Map(parties.map((p, i) => [p.id, i]))
  const x = (p: PartyId) => gutter + (idx.get(p)! + 0.5) * colW

  const phaseGap = 14
  const top = 28
  let y = top
  let prev: PhaseId | undefined
  const rows: Placed[] = []
  for (const step of pathSteps) {
    if (prev && step.phase !== prev) y += phaseGap
    rows.push({ step, y: y + opts.rowH / 2 })
    y += opts.rowH
    prev = step.phase
  }
  const height = y + 24

  const bands: Layout['bands'] = []
  for (const r of rows) {
    const last = bands.at(-1)
    const y0 = r.y - opts.rowH / 2
    const y1 = r.y + opts.rowH / 2
    if (last && last.phase === r.step.phase) last.y1 = y1
    else bands.push({ phase: r.step.phase, y0, y1 })
  }

  // consecutive steps in the same iframe share one box; any other step closes it
  const iframes: Layout['iframes'] = []
  let open: Layout['iframes'][number] | undefined
  for (const r of rows) {
    const kind = r.step.iframe
    if (!kind) open = undefined
    else if (open && open.kind === kind) open.y1 = r.y + opts.rowH / 2 - 4
    else {
      open = { kind, y0: r.y - opts.rowH / 2 + 4, y1: r.y + opts.rowH / 2 - 4 }
      iframes.push(open)
    }
  }

  return { width, height, gutter, rowH: opts.rowH, x, colW, rows, bands, iframes }
}

import * as d3 from 'd3'
// Adds selection.transition(). `d3` is marked side-effect free, so the production build drops
// this patch unless it is imported directly; d3-transition is a declared dependency for that reason.
import 'd3-transition'
import { useEffect, useEffectEvent, useRef } from 'react'
import { parties, phases } from '../data/meta'
import { resolve, type PathId } from '../data/types'
import type { Layout, Placed } from '../lib/layout'
import { useReducedMotion } from '../lib/useReducedMotion'

export interface SequenceDiagramProps {
  layout: Layout
  path: PathId
  /** Step number (1…N) on this path, by step id. */
  order: Map<string, number>
  selectedId?: string
  onSelect: (id: string) => void
  /** Accessible name of the diagram. */
  label: string
}

/** Duration of the move/fade when the path changes. */
const T = 450
const fs = 13
const fsSmall = 11.5

/** Rough text width so badges and self-step boxes fit their words. */
const textW = (s: string, px: number, mono = false) => s.length * px * (mono ? 0.62 : 0.56)

/**
 * Two effects: the structure effect joins rows, bands and frames when the path or size changes
 * (animated only when the path changed); the selection effect only restyles the rows.
 */
export function SequenceDiagram({ layout, path, order, selectedId, onSelect, label }: SequenceDiagramProps) {
  const ref = useRef<SVGSVGElement>(null)
  const select = useEffectEvent((id: string) => onSelect(id))
  const reduce = useReducedMotion()
  const prevPath = useRef<PathId | undefined>(undefined)

  // ── structure
  useEffect(() => {
    const svg = d3.select(ref.current!)
    const { x, width, height, rowH } = layout
    // animate a path change; a resize or the first draw just jumps
    const t = reduce || prevPath.current === undefined || prevPath.current === path ? 0 : T
    prevPath.current = path
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height)

    // ── defs: arrowheads
    if (svg.select('defs').empty()) {
      const defs = svg.append('defs')
      for (const [id, cls] of [
        ['arrow', 'fill-slate-500 dark:fill-slate-400'],
        ['arrow-sel', 'fill-indigo-600 dark:fill-indigo-400'],
      ] as const) {
        defs
          .append('marker')
          .attr('id', id)
          .attr('viewBox', '0 0 10 10')
          .attr('refX', 9)
          .attr('refY', 5)
          .attr('markerWidth', 7)
          .attr('markerHeight', 7)
          .attr('orient', 'auto-start-reverse')
          .append('path')
          .attr('d', 'M0 0L10 5L0 10z')
          .attr('class', cls)
      }
    }

    const layer = (name: string) => {
      let g = svg.select<SVGGElement>(`g.${name}`)
      if (g.empty()) g = svg.append('g').attr('class', name)
      return g
    }
    const gBands = layer('bands')
    const gLife = layer('lifelines')
    const gFrames = layer('iframes')
    const gSteps = layer('steps')

    // ── phase bands
    gBands
      .selectAll<SVGGElement, Layout['bands'][number]>('g.band')
      .data(layout.bands, (d) => `${d.phase}-${d.y0}`)
      .join(
        (enter) => {
          const g = enter.append('g').attr('class', 'band').attr('opacity', t ? 0 : 1)
          g.append('rect')
          g.append('text')
          return g
        },
        (update) => update,
        (exit) => exit.transition().duration(t / 2).attr('opacity', 0).remove(),
      )
      .call((g) => {
        g.transition().duration(t).attr('opacity', 1)
        g.select('rect')
          .attr('class', (d) => phases[d.phase].band)
          .attr('x', 0)
          .attr('width', width)
          .attr('rx', 8)
          .transition()
          .duration(t)
          .attr('y', (d) => d.y0 - 4)
          .attr('height', (d) => d.y1 - d.y0 + 8)
        g.select('text')
          .attr('class', (d) => `${phases[d.phase].text} font-semibold uppercase tracking-wide`)
          .attr('font-size', 10.5)
          .attr('x', 8)
          .text((d) => phases[d.phase].name)
          .transition()
          .duration(t)
          .attr('y', (d) => d.y0 + 9)
      })

    // ── lifelines
    gLife
      .selectAll('line')
      .data(parties)
      .join('line')
      .attr('class', 'stroke-slate-300 dark:stroke-slate-700')
      .attr('stroke-dasharray', '3 5')
      .attr('x1', (p) => x(p.id))
      .attr('x2', (p) => x(p.id))
      .attr('y1', 0)
      .attr('y2', height)

    // ── iframe boxes, drawn on the Browser column. A path can have two boxes of one kind
    // (the challenge, then the final CRes), so the key includes the position.
    const fw = Math.min(layout.colW - 12, 132)
    gFrames
      .selectAll<SVGGElement, Layout['iframes'][number]>('g.frame')
      .data(layout.iframes, (d) => `${d.kind}-${d.y0}`)
      .join(
        (enter) => {
          const g = enter.append('g').attr('class', 'frame').attr('opacity', t ? 0 : 1)
          g.append('rect')
          g.append('text')
          return g
        },
        (u) => u,
        (exit) => exit.transition().duration(t / 2).attr('opacity', 0).remove(),
      )
      .call((g) => {
        g.transition().duration(t).attr('opacity', 1)
        g.select('rect')
          .attr('class', (d) =>
            d.kind === 'method'
              ? 'fill-amber-50 stroke-amber-500 dark:fill-amber-400/5 dark:stroke-amber-400'
              : 'fill-sky-50 stroke-sky-500 dark:fill-sky-400/5 dark:stroke-sky-400',
          )
          .attr('stroke-dasharray', '5 4')
          .attr('rx', 10)
          .attr('x', x('browser') - fw / 2)
          .attr('width', fw)
          .transition()
          .duration(t)
          .attr('y', (d) => d.y0)
          .attr('height', (d) => d.y1 - d.y0)
        g.select('text')
          .attr('class', (d) =>
            d.kind === 'method' ? 'fill-amber-800 dark:fill-amber-300' : 'fill-sky-800 dark:fill-sky-300',
          )
          .attr('font-size', 10.5)
          .attr('font-weight', 600)
          .attr('text-anchor', 'middle')
          .text((d) => (d.kind === 'method' ? 'hidden iframe' : 'challenge iframe'))
          .transition()
          .duration(t)
          .attr('transform', (d) => `translate(${x('browser') - fw / 2 - 6},${(d.y0 + d.y1) / 2}) rotate(-90)`)
      })

    // ── steps
    const steps = gSteps
      .selectAll<SVGGElement, Placed>('g.step')
      .data(layout.rows, (d) => d.step.id)
      .join(
        (enter) => {
          const g = enter
            .append('g')
            .attr('class', 'step cursor-pointer')
            .attr('opacity', t ? 0 : 1)
            .attr('transform', (d) => `translate(0,${d.y})`)
          g.append('rect').attr('class', 'hit fill-transparent hover:fill-indigo-500/5')
          g.append('rect').attr('class', 'pill')
          g.append('text').attr('class', 'num')
          g.append('line').attr('class', 'msg')
          g.append('rect').attr('class', 'self')
          g.append('text').attr('class', 'label')
          g.append('rect').attr('class', 'badge-bg')
          g.append('text').attr('class', 'badge')
          return g
        },
        (u) => u,
        (exit) => exit.classed('step', false).transition().duration(t / 2).attr('opacity', 0).remove(),
      )

    steps
      .on('click', (_e, d) => select(d.step.id))
      .transition()
      .duration(t)
      .attr('transform', (d) => `translate(0,${d.y})`)
      .attr('opacity', 1)

    steps.each(function (d) {
      const g = d3.select(this)
      const s = d.step
      const label = resolve(s.label, path) ?? ''
      const badge = resolve(s.badge, path)
      const x1 = x(s.from)
      const x2 = s.to ? x(s.to) : x1

      g.select('rect.hit').attr('x', 0).attr('width', width).attr('y', -rowH / 2).attr('height', rowH)

      const no = String(order.get(s.id))
      g.attr('data-step', s.id).attr('data-order', no)
      const pw = Math.max(28, textW(no, fsSmall) + 14)
      g.select('rect.pill').attr('x', 36 - pw / 2).attr('y', -11).attr('width', pw).attr('height', 22).attr('rx', 11)
      g.select('text.num')
        .attr('x', 36)
        .attr('y', fsSmall / 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', fsSmall)
        .attr('font-weight', 600)
        .text(no)

      if (s.to) {
        const dir = x2 > x1 ? 1 : -1
        g.select('line.msg')
          .attr('display', null)
          .attr('x1', x1 + dir * 4)
          .attr('x2', x2 - dir * 4)
          .attr('y1', 0)
          .attr('y2', 0)
        g.select('rect.self').attr('display', 'none')
        g.select('text.label').attr('x', (x1 + x2) / 2).attr('y', -7).attr('text-anchor', 'middle')
      } else {
        const w = textW(label, fs) + 28
        const cx = Math.max(w / 2 + 64, Math.min(x1, width - w / 2 - 6))
        g.select('line.msg').attr('display', 'none')
        g.select('rect.self')
          .attr('display', null)
          .attr('x', cx - w / 2)
          .attr('y', -15)
          .attr('width', w)
          .attr('height', 30)
          .attr('rx', 8)
        g.select('text.label').attr('x', cx).attr('y', fs / 3).attr('text-anchor', 'middle')
      }
      g.select('text.label')
        .attr('font-size', fs)
        .attr('paint-order', 'stroke')
        .attr('stroke-width', s.to ? 5 : 0)
        .attr('stroke-linejoin', 'round')
        .text(label)

      if (badge && s.to) {
        const bw = textW(badge, fsSmall, true) + 14
        const bx = (x1 + x2) / 2
        g.select('rect.badge-bg')
          .attr('display', null)
          .attr('x', bx - bw / 2)
          .attr('y', 5)
          .attr('width', bw)
          .attr('height', fsSmall + 8)
          .attr('rx', 5)
          .attr('class', 'badge-bg fill-amber-100 stroke-amber-300 dark:fill-amber-400/15 dark:stroke-amber-400/40')
        g.select('text.badge')
          .attr('display', null)
          .attr('x', bx)
          .attr('y', 5 + fsSmall + 1)
          .attr('text-anchor', 'middle')
          .attr('font-size', fsSmall)
          .attr('class', 'badge font-mono fill-amber-900 dark:fill-amber-200')
          .text(badge)
      } else {
        g.select('rect.badge-bg').attr('display', 'none')
        g.select('text.badge').attr('display', 'none')
      }
    })
  }, [layout, path, order, reduce])

  // ── selection: restyle every row; no joins, no transitions
  useEffect(() => {
    d3.select(ref.current!)
      .selectAll<SVGGElement, Placed>('g.step')
      .each(function (d) {
        const g = d3.select(this)
        const s = d.step
        const sel = s.id === selectedId
        g.attr('data-selected', sel ? 'true' : null)
        g.select('rect.pill').attr(
          'class',
          sel ? 'pill fill-indigo-600 dark:fill-indigo-500' : 'pill fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600',
        )
        g.select('text.num').attr('class', sel ? 'num fill-white' : 'num fill-slate-600 dark:fill-slate-300')
        g.select('line.msg')
          .attr('stroke-width', sel ? 2.5 : 1.5)
          .attr('class', sel ? 'msg stroke-indigo-600 dark:stroke-indigo-400' : 'msg stroke-slate-500 dark:stroke-slate-400')
          .attr('marker-end', `url(#${sel ? 'arrow-sel' : 'arrow'})`)
        g.select('rect.self')
          .attr('stroke-width', sel ? 2.5 : 1.25)
          .attr(
            'class',
            sel
              ? 'self fill-indigo-50 stroke-indigo-600 dark:fill-indigo-500/15 dark:stroke-indigo-400'
              : 'self fill-white stroke-slate-400 dark:fill-slate-900 dark:stroke-slate-500',
          )
        g.select('text.label')
          .attr('font-weight', sel ? 700 : 500)
          .attr(
            'class',
            `label ${s.to ? 'stroke-white dark:stroke-slate-950' : ''} ${
              sel ? 'fill-indigo-700 dark:fill-indigo-300' : 'fill-slate-800 dark:fill-slate-100'
            }`,
          )
      })
  }, [selectedId, layout, path, order, reduce])

  return <svg ref={ref} className="block select-none" role="img" aria-label={label} />
}

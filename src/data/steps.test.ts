import { describe, expect, it } from 'vitest'
import { steps } from './steps'
import { chipOf, chips, parties, pathById, paths, variantsOf } from './meta'
import { reqText } from './reqs'
import { reference, refOrder } from './reference'
import { pathOrder, stepsInPath } from './order'
import { resolve, type PathId, type PathValue } from './types'

const pathIds = paths.map((p) => p.id)
const partyIds = parties.map((p) => p.id)
/** Leading number of a spec step label ('10d–e' → 10, '16–17' → 16). Passkey steps ('P1') have none. */
const specNo = (num: string) => (/^\d+/.test(num) ? parseInt(num, 10) : undefined)
const byStep = steps.map((s) => [s.id, s] as const)

describe('step data', () => {
  it('has unique step ids', () => {
    const ids = steps.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(byStep)('%s: parties and paths are valid', (_id, s) => {
    expect(partyIds).toContain(s.from)
    if (s.to) expect(partyIds).toContain(s.to)
    expect(s.paths.length).toBeGreaterThan(0)
    for (const p of s.paths) expect(pathIds).toContain(p)
  })

  it.each(byStep)('%s: has an arrow label on every path it is on', (_id, s) => {
    for (const p of s.paths) expect(resolve(s.label, p), `${s.id} on ${p}`).toBeTruthy()
  })

  it.each(byStep.filter(([, s]) => s.fields))('%s: field table says which message it shows and has rows', (_id, s) => {
    expect(s.fields!.label).toBeTruthy()
    expect(s.fields!.rows.length).toBeGreaterThan(0)
  })

  it.each(byStep)('%s: per-path fields and notes only name paths the step is on', (_id, s) => {
    for (const f of s.fields?.rows ?? []) for (const p of f.paths ?? []) expect(s.paths, `${f.name}`).toContain(p)
    for (const p of Object.keys(s.pathNote ?? {})) expect(s.paths).toContain(p)
  })

  it.each(byStep)('%s: every visible field has a value, and field names are unique per path', (_id, s) => {
    for (const p of s.paths) {
      const rows = (s.fields?.rows ?? []).filter((f) => !f.paths || f.paths.includes(p))
      for (const f of rows) expect(resolve(f.value, p), `${f.name} on ${p}`).toBeDefined()
      const names = rows.map((f) => f.name)
      expect(new Set(names).size, `duplicate field on ${p}: ${names.join(', ')}`).toBe(names.length)
    }
  })

  it.each(byStep)('%s: every per-path text names exactly the paths it is shown on', (_id, s) => {
    const check = (what: string, v: PathValue | undefined, on: PathId[]) => {
      if (v === undefined || typeof v === 'string') return
      expect(Object.keys(v).sort(), `${s.id} ${what}`).toEqual([...on].sort())
    }
    for (const [k, v] of [['label', s.label], ['what', s.what], ['why', s.why], ['sdkNote', s.sdkNote], ['redirectNote', s.redirectNote]] as const)
      check(k, v, s.paths)
    for (const f of s.fields?.rows ?? []) check(`${f.name} note`, f.note, f.paths ?? s.paths)
  })

  it('every cited spec requirement has a summary', () => {
    const missing = steps.flatMap((s) => (s.reqs ?? []).filter((r) => !reqText[r]).map((r) => `${s.id}: Req ${r}`))
    expect(missing).toEqual([])
  })

  it('every related-rules link points at an existing More info page', () => {
    for (const s of steps) for (const r of s.refs ?? []) expect(reference[r], `${s.id} → ${r}`).toBeDefined()
  })

  it('the More info order lists every reference page once', () => {
    expect([...refOrder].sort()).toEqual(Object.keys(reference).sort())
  })
})

describe('paths and chips', () => {
  it('every variant belongs to a chip and has a switch label', () => {
    for (const p of paths.filter((x) => x.parent)) {
      expect(chips.map((c) => c.id), p.id).toContain(p.parent)
      expect(p.variantLabel).toBeTruthy()
      expect(chipOf(p.id)).toBe(p.parent)
    }
  })

  it('a chip with variants has a switch label of its own, listed first', () => {
    for (const c of chips) {
      const vs = variantsOf(c.id)
      if (!vs.length) continue
      expect(vs[0]!.id).toBe(c.id)
      expect(c.variantLabel, c.id).toBeTruthy()
    }
  })

  it('hotkeys are unique among chips', () => {
    const keys = chips.map((c) => c.hotkey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('looks up every path by id', () => {
    for (const p of paths) expect(pathById[p.id]).toBe(p)
  })
})

describe.each(pathIds)('path %s', (path) => {
  const inPath = stepsInPath(steps, path)

  it('has steps', () => {
    expect(inPath.length).toBeGreaterThan(3)
  })

  it('numbers its steps 1…N with no gaps', () => {
    const order = pathOrder(steps, path)
    expect(inPath.map((s) => order.get(s.id))).toEqual(inPath.map((_, i) => i + 1))
  })

  it('follows the spec step order (spec numbers never go backwards)', () => {
    const nums = inPath.map((s) => specNo(s.num)).filter((n): n is number => n !== undefined)
    for (let i = 1; i < nums.length; i++) expect(nums[i], `${inPath.map((s) => s.num).join(',')}`).toBeGreaterThanOrEqual(nums[i - 1]!)
  })

  it('starts with the card range cache and ends with authorisation', () => {
    expect(inPath[0]?.id).toBe('preq')
    expect(inPath.at(-1)?.id).toBe('auth')
  })
})

describe('expert review regressions', () => {
  it('keeps every highlight index inside its table', () => {
    for (const page of Object.values(reference)) {
      for (const s of page.sections) {
        for (const i of s.table?.highlight ?? []) expect(i).toBeLessThan(s.table!.rows.length)
      }
    }
  })

  it('puts challengeWindowSize on the challenge step, not the AReq-data step', () => {
    const names = (id: string) => steps.find((s) => s.id === id)?.fields?.rows.map((r) => r.name) ?? []
    expect(names('s5').some((n) => n.includes('challengeWindowSize'))).toBe(false)
    expect(names('c1').some((n) => n.includes('challengeWindowSize'))).toBe(true)
  })

  it('does not cite the decoupled-only Req 471 on the final CRes step', () => {
    expect(steps.find((s) => s.id === 'r4')?.reqs).not.toContain(471)
  })
})

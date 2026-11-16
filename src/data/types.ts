export type PartyId = 'cardholder' | 'browser' | 'merchant' | 'psp' | 'ds' | 'acs'

export type PathId =
  | 'frictionless'
  | 'fingerprint'
  | 'challenge'
  | 'fingerprint-challenge'
  | 'passkey'
  | 'passkey-acs'
  | 'spc'
  | 'spc-acs'

export type PhaseId =
  | 'prep'
  | 'start'
  | 'fingerprint'
  | 'passkey'
  | 'auth'
  | 'spc'
  | 'challenge'
  | 'results'
  | 'done'

export type RefId = 'iframe' | 'ux' | 'fido' | 'diff'

/**
 * A value that may differ per path. A plain string applies to every path. A per-path value must
 * name every path the step (or field) is on; an empty string means "nothing on this path" for
 * optional notes.
 */
export type PathValue = string | Partial<Record<PathId, string>>

export interface Field {
  name: string
  value: PathValue
  /** Per path when the note differs by path. */
  note: PathValue
  /** Only show the row on these paths. Omitted = all paths the step is on. */
  paths?: PathId[]
  /** Draw attention to this row: it is what makes the path different. */
  key?: boolean
  /** Where the name comes from when it is not an EMV 3DS field (e.g. 'Adyen API', 'HTML', 'WebAuthn'). */
  source?: string
  /** Where the value ends up, e.g. which AReq fields. */
  becomes?: string
}

export interface Step {
  id: string
  /** Number from spec v2.3.1.1 section 3.3 / 3.5, as people quote it. */
  num: string
  phase: PhaseId
  from: PartyId
  /** Omitted = an action inside one party (drawn as a box). */
  to?: PartyId
  /** Short text on the arrow. */
  label: PathValue
  /** Short field badge under the arrow, per path. */
  badge?: PathValue
  title: string
  /** What happens. Per path when the text differs by path. */
  what: PathValue
  /** Why it matters. Per path when the text differs by path. */
  why: PathValue
  paths: PathId[]
  /** The field table: what it shows (which message, and whose names) and its rows. */
  fields?: { label: string; rows: Field[] }
  reqs?: number[]
  /** What changes for this step when the PSP hosts the page (redirect integration). */
  redirectNote?: PathValue
  /** What a real PSP SDK does at this step (Adyen web SDK, open source). */
  sdkNote?: PathValue
  iframe?: 'method' | 'challenge'
  refs?: RefId[]
  newIn23?: boolean
  /** Extra per-path note shown in the panel. */
  pathNote?: Partial<Record<PathId, string>>
}

export function resolve(v: PathValue | undefined, path: PathId): string | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'string') return v
  return v[path]
}

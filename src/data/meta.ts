import type { PartyId, PathId, PhaseId } from './types'

export interface Party {
  id: PartyId
  name: string
  role: string
  blurb: string
}

export const parties: Party[] = [
  {
    id: 'cardholder',
    name: 'Cardholder',
    role: 'the person paying',
    blurb: 'Clicks pay, and only acts again if asked: passkey, SPC sheet or bank challenge.',
  },
  {
    id: 'browser',
    name: 'Browser',
    role: 'consumer device',
    blurb: 'Hosts the merchant page and the two iframes. It is the only channel between merchant and issuer UI.',
  },
  {
    id: 'merchant',
    name: 'Checkout page',
    role: '3DS Requestor site',
    blurb: 'The page the shopper pays on. The merchant is the 3DS Requestor; the PSP is the 3DS Integrator. With an SDK integration it is the merchant\'s page with the PSP SDK, which opens the iframes, shows the processing screen and collects browser data. With a redirect it is a PSP-hosted page.',
  },
  {
    id: 'psp',
    name: 'PSP',
    role: '3DS Server',
    blurb: 'Builds AReq, talks to the scheme, keeps the authoritative result (RReq) and sends the authorisation.',
  },
  {
    id: 'ds',
    name: 'Card scheme',
    role: 'Directory Server (DS)',
    blurb: 'Routes by BIN to the right issuer ACS, validates messages, may verify FIDO data.',
  },
  {
    id: 'acs',
    name: 'Issuer',
    role: 'Access Control Server (ACS)',
    blurb: 'Decides: approve, challenge, SPC or decline. Owns the challenge UI and the authentication value (CAVV).',
  },
]

export const partyById = Object.fromEntries(parties.map((p) => [p.id, p])) as Record<PartyId, Party>

interface PathBase {
  id: PathId
  short: string
  summary: string
  outcome: string
  /** Which spec version this path needs. */
  version: string
  /** Name in the "merchant / issuer in iframe" switch, for a chip that has variants and for each variant. */
  variantLabel?: string
}

/** A path with its own chip in the header. */
export interface ChipPath extends PathBase {
  label: string
  hotkey: string
  parent?: undefined
}

/** A variant shares its parent's chip and appears in the parent's variant switch. */
export interface VariantPath extends PathBase {
  parent: PathId
  variantLabel: string
}

export type Path = ChipPath | VariantPath

export const paths: Path[] = [
  {
    id: 'frictionless',
    label: 'Frictionless',
    short: 'Frictionless',
    hotkey: '1',
    version: '2.1+',
    summary: 'No 3DS Method for this card range, so no device fingerprint. The issuer approves on the authentication request (AReq) data alone.',
    outcome: 'ARes transStatus = Y. No cardholder interaction.',
  },
  {
    id: 'fingerprint',
    label: 'Fingerprint only',
    short: 'Fingerprint',
    hotkey: '2',
    version: '2.1+',
    summary: 'The issuer\'s hidden device check runs first (the "device fingerprint", 3DS Method: a hidden iframe sends device data to the issuer). The issuer approves without a challenge. Nothing to do with the shopper\'s finger.',
    outcome: 'threeDSCompInd = Y, ARes transStatus = Y.',
  },
  {
    id: 'challenge',
    label: 'Challenge only',
    short: 'Challenge',
    hotkey: '3',
    version: '2.1+',
    summary: 'No 3DS Method. The issuer wants proof, so the cardholder completes a challenge (OTP or app) in the iframe.',
    outcome: 'ARes C, then CReq/CRes through the browser and RReq/RRes server to server.',
  },
  {
    id: 'fingerprint-challenge',
    label: 'Fingerprint + Challenge',
    short: 'Fingerprint + Challenge',
    hotkey: '4',
    version: '2.1+',
    summary: 'The full browser flow of spec section 3.3: 3DS Method, AReq/ARes = C, challenge, results, final CRes.',
    outcome: 'Every step of the spec\'s browser flow (EMV spec steps 1 to 22).',
  },
  {
    id: 'passkey',
    label: 'Challenge is Passkey',
    short: 'Passkey',
    hotkey: '5',
    version: '2.2+ (merchant) · 2.3 (issuer)',
    summary:
      'Merchant variant: the merchant is the FIDO Relying Party. The cardholder unlocks a passkey before the AReq and the signed assertion rides in the AReq (EMVCo FIDO white paper v2.0). Needs a passkey enrolled earlier.',
    outcome: 'threeDSReqAuthMethod = 07 + FIDO data. Usually Y when the issuer can verify it; otherwise the issuer decides as usual.',
    variantLabel: 'Merchant passkey, data in AReq',
  },
  {
    id: 'passkey-acs',
    parent: 'passkey',
    variantLabel: 'Issuer WebAuthn in challenge iframe',
    short: 'Passkey (issuer)',
    version: '2.3+',
    summary:
      'Issuer variant: the ACS is the Relying Party. It answers C with authenticationMethod 13 (WebAuthn) and runs WebAuthn inside the challenge iframe, which is why the iframe needs allow="publickey-credentials-get *".',
    outcome: 'ARes C, a biometric prompt instead of an OTP, then the normal RReq/CRes ending.',
  },
  {
    id: 'spc',
    label: 'Challenge is SPC',
    short: 'SPC',
    hotkey: '6',
    version: '2.3+',
    summary:
      'Requestor-initiated (spec 3.5.1): the issuer returns status S with its FIDO credentials, the merchant calls the SPC API, the browser shows its own payment sheet, and a second AReq carries the assertion.',
    outcome: 'ARes #1 = S, ARes #2 = Y (or C to fall back to a normal challenge).',
    variantLabel: 'Merchant calls SPC (status S)',
  },
  {
    id: 'spc-acs',
    parent: 'spc',
    variantLabel: 'Issuer calls SPC in challenge iframe',
    short: 'SPC (issuer)',
    version: '2.3+',
    summary:
      'ACS-initiated (spec 3.5.2): a normal challenge flow where the ACS answers C with authenticationMethod 14 and calls the SPC API from inside the challenge iframe.',
    outcome: 'ARes C, SPC sheet inside the iframe, then the normal RReq/CRes ending.',
  },
]

export const pathById = Object.fromEntries(paths.map((p) => [p.id, p])) as Record<PathId, Path>

/** The chip a path belongs to (a variant maps to its parent's chip). */
export const chipOf = (id: PathId): PathId => pathById[id].parent ?? id

/** The six chips in the path bar. */
export const chips = paths.filter((p): p is ChipPath => !p.parent)

/** The variant switch for a chip: the chip's own path first, then its variants. Empty when the chip has none. */
export function variantsOf(chip: PathId): Path[] {
  const kids = paths.filter((p) => p.parent === chip)
  return kids.length ? [pathById[chip], ...kids] : []
}

export interface Phase {
  id: PhaseId
  name: string
  /** Tailwind classes for the band fill (light + dark). */
  band: string
  /** Tailwind classes for the label text. */
  text: string
}

export const phases: Record<PhaseId, Phase> = {
  prep: { id: 'prep', name: 'Before checkout', band: 'fill-slate-100 dark:fill-slate-900', text: 'fill-slate-600 dark:fill-slate-400' },
  start: { id: 'start', name: 'Start', band: 'fill-transparent', text: 'fill-slate-600 dark:fill-slate-400' },
  fingerprint: { id: 'fingerprint', name: 'Device fingerprint (3DS Method)', band: 'fill-amber-100/60 dark:fill-amber-400/10', text: 'fill-amber-700 dark:fill-amber-300' },
  passkey: { id: 'passkey', name: 'Passkey at merchant', band: 'fill-violet-100/70 dark:fill-violet-400/10', text: 'fill-violet-700 dark:fill-violet-300' },
  auth: { id: 'auth', name: 'Authentication request', band: 'fill-slate-100/70 dark:fill-slate-800/40', text: 'fill-slate-600 dark:fill-slate-300' },
  spc: { id: 'spc', name: 'Secure Payment Confirmation', band: 'fill-fuchsia-100/60 dark:fill-fuchsia-400/10', text: 'fill-fuchsia-700 dark:fill-fuchsia-300' },
  challenge: { id: 'challenge', name: 'Challenge (in iframe)', band: 'fill-sky-100/70 dark:fill-sky-400/10', text: 'fill-sky-700 dark:fill-sky-300' },
  results: { id: 'results', name: 'Results', band: 'fill-emerald-100/60 dark:fill-emerald-400/10', text: 'fill-emerald-700 dark:fill-emerald-300' },
  done: { id: 'done', name: 'Authorise', band: 'fill-transparent', text: 'fill-slate-600 dark:fill-slate-400' },
}

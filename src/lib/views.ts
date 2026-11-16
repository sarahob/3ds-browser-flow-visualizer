import { reference, refOrder } from '../data/reference'
import type { RefId } from '../data/types'

/** A More info page: Spec check or one of the reference pages. */
export type PageId = 'spec' | RefId

/** URL path of each reference page. */
const refSlugs: Record<RefId, string> = {
  iframe: 'iframes',
  ux: 'ux-rules',
  fido: 'fido-passkeys-spc',
  diff: 'versions',
}

/** The More info pages, in menu order (Spec check first), with the URL path each lives at. */
export const moreInfo: { id: PageId; slug: string; title: string; hint: string }[] = [
  { id: 'spec', slug: 'spec-check', title: 'Spec check', hint: 'Every step mapped to its v2.3.1.1 requirements' },
  ...refOrder.map((id) => ({ id, slug: refSlugs[id], title: reference[id].title, hint: reference[id].sources[0] ?? '' })),
]

import type { PathId, Step } from './types'

/** Steps of one path, in flow order. */
export const stepsInPath = (all: Step[], path: PathId): Step[] => all.filter((s) => s.paths.includes(path))

/**
 * Display numbers: 1…N in the order the steps happen on this path.
 * The spec step number (Step.num) is shown alongside as a reference, because the
 * spec numbers skip whatever a path does not use (no 3–4 without a fingerprint).
 */
export const pathOrder = (all: Step[], path: PathId): Map<string, number> =>
  new Map(stepsInPath(all, path).map((s, i) => [s.id, i + 1]))

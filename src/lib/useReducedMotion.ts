import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia?.(QUERY)
  mq?.addEventListener('change', onChange)
  return () => mq?.removeEventListener('change', onChange)
}

/** True when the user asked the OS for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(QUERY).matches ?? false, () => false)
}

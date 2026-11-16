import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from '../lib/route'

/**
 * A real link (it can open in a new tab) that navigates in the app on a plain click.
 * `onNavigate(to)` runs just before the in-app navigation.
 */
export function Link({
  to,
  onNavigate,
  ...rest
}: { to: string; onNavigate?: (to: string) => void } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <a
      {...rest}
      href={to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        rest.onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onNavigate?.(to)
        navigate(to)
      }}
    />
  )
}

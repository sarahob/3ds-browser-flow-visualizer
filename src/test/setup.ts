import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

// jsdom has no ResizeObserver; the app only needs it to size the sequence diagram
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver ??= RO

// jsdom has no element scrolling; the sequence view scrolls the selected step into view.
Element.prototype.scrollTo = function () {} as typeof Element.prototype.scrollTo

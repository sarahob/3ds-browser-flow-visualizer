import { describe, expect, it, vi } from 'vitest'

// The D3 diagram needs real SVG geometry that jsdom lacks; it is covered by the Playwright tests in e2e/.
// Here a stand-in renders one clickable mark per row so the React shell around it can be tested.
vi.mock('./components/SequenceDiagram', () => ({
  SequenceDiagram: ({ layout, order, onSelect, label }: import('./components/SequenceDiagram').SequenceDiagramProps) => (
    <svg data-testid="sequence" aria-label={label}>
      {layout.rows.map((r) => (
        <g key={r.step.id} data-testid={`diagram-${r.step.id}`} data-order={order.get(r.step.id)} onClick={() => onSelect(r.step.id)} />
      ))}
    </svg>
  ),
}))
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { steps } from './data/steps'
import { stepsInPath } from './data/order'

const go = (q: string) => window.history.replaceState(null, '', `/?${q}`)
const goTo = (url: string) => window.history.replaceState(null, '', url)
const listOrders = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('#step-list [data-order]')].map((e) => [Number(e.dataset.order), e.dataset.step])
const query = () => Object.fromEntries(new URLSearchParams(window.location.search))
const panelStep = () => screen.queryByTestId('panel-step')?.textContent

describe('App: flow', () => {
  it('shows the app name in the header', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: '3DS Browser Flow Visualizer' })).toBeInTheDocument()
  })

  it('lists the steps of the chosen path numbered 1…N, the same as the diagram', () => {
    go('path=frictionless')
    const { container } = render(<App />)
    const expected = stepsInPath(steps, 'frictionless').map((s, i) => [i + 1, s.id])
    expect(listOrders(container)).toEqual(expected)
    const diagram = [...container.querySelectorAll<HTMLElement>('[data-testid=sequence] [data-order]')].map((e) => Number(e.dataset.order))
    expect(diagram).toEqual(expected.map(([n]) => n))
  })

  it('switching path resets the panel to the new path’s step list', async () => {
    go('path=fingerprint-challenge&step=s6')
    const { container } = render(<App />)
    expect(screen.getByTestId('panel-step')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Frictionless' }))
    expect(screen.queryByTestId('panel-step')).not.toBeInTheDocument()
    expect(listOrders(container)).toHaveLength(stepsInPath(steps, 'frictionless').length)
  })

  it('Start opens step 1 with focus on its title, and the pager walks forward', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Start/ }))
    expect(panelStep()).toBe('Step 1')
    expect(screen.getByRole('heading', { level: 2, name: stepsInPath(steps, 'challenge')[0]!.title })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: /Next step/ }))
    expect(panelStep()).toBe('Step 2')
    expect(screen.getByRole('button', { name: /Next step/ })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Last step' }))
    expect(panelStep()).toBe(`Step ${stepsInPath(steps, 'challenge').length}`)
  })

  it('clicking a step on the diagram opens it', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.click(screen.getByTestId('diagram-s6'))
    expect(screen.getByTestId('spec-pill')).toHaveTextContent('EMV spec step 6')
    expect(screen.getByTestId('sequence')).toHaveAccessibleName(/^Challenge only: sequence of \d+ steps, step \d+ selected: /)
  })

  it('"All steps" goes back to the list and focuses the row of the step that was open', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /All steps/ }))
    expect(screen.queryByTestId('panel-step')).not.toBeInTheDocument()
    expect(document.querySelector('#step-list [data-step="s6"]')).toHaveFocus()
  })

  it('has no hotkey hints (kbd) on the path chips', () => {
    go('path=challenge')
    const { container } = render(<App />)
    expect(container.querySelectorAll('kbd')).toHaveLength(0)
  })
})

describe('App: URL state', () => {
  it('falls back to Frictionless for an unknown path', () => {
    go('path=nope')
    render(<App />)
    expect(screen.getByRole('radio', { name: 'Frictionless' })).toBeChecked()
    expect(query().path).toBe('frictionless')
  })

  it('opens the first flow, Frictionless, on first load', () => {
    go('')
    render(<App />)
    expect(screen.getByRole('radio', { name: 'Frictionless' })).toBeChecked()
  })

  it('shows the list for an unknown step and removes it from the URL', () => {
    go('path=challenge&step=nope')
    render(<App />)
    expect(screen.queryByTestId('panel-step')).not.toBeInTheDocument()
    expect(query()).toEqual({ path: 'challenge' })
  })

  it('a step from another path switches to a path that has it', () => {
    go('path=frictionless&step=s3')
    render(<App />)
    expect(screen.getByTestId('spec-pill')).toHaveTextContent('EMV spec step 3')
    const s3 = steps.find((s) => s.id === 's3')!
    expect(s3.paths).toContain(query().path)
    expect(screen.getByTestId('panel-step')).toHaveTextContent(/^Step \d+$/)
  })

  it.each([
    ['/spec-check', 'Spec check'],
    ['/iframes', 'iframes'],
    ['/ux-rules', 'UX rules'],
    ['/fido-passkeys-spc', 'FIDO, passkeys, SPC'],
    ['/versions', '2.2.0 vs 2.3.1.1'],
  ])('%s loads its page directly, with the path chips and no chip chosen', (url, title) => {
    goTo(url)
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Frictionless' })).not.toBeChecked()
    expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toHaveLength(0)
  })

  it('a trailing slash shows the same page and is removed from the URL', () => {
    goTo('/spec-check/')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Spec check' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/spec-check')
  })

  it('an address two segments deep shows Page not found', () => {
    goTo('/a/b')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('a page URL drops the flow query', () => {
    goTo('/iframes?path=challenge&step=s6')
    render(<App />)
    expect(window.location.pathname + window.location.search).toBe('/iframes')
  })

  it('an unknown address shows "Page not found" with a link to the flow', async () => {
    goTo('/nope')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Go to the flow' }))
    expect(screen.getByRole('button', { name: /Start/ })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('writes path and step changes back to the URL', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Start/ }))
    expect(query()).toEqual({ path: 'challenge', step: 'preq' })
    await userEvent.click(screen.getByRole('radio', { name: 'Frictionless' }))
    expect(query()).toEqual({ path: 'frictionless' })
  })

  it('Back returns to the previous path', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.click(screen.getByRole('radio', { name: 'Frictionless' }))
    expect(query().path).toBe('frictionless')
    act(() => window.history.back())
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Challenge only' })).toBeChecked())
  })

  it('a page has its own URL without the step, and Back returns to the flow with the step intact', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /More info/ }))
    await userEvent.click(screen.getByRole('link', { name: /^UX rules/ }))
    expect(window.location.pathname + window.location.search).toBe('/ux-rules')
    expect(screen.getByRole('heading', { level: 1, name: 'UX rules' })).toHaveFocus()
    act(() => window.history.back())
    await waitFor(() => expect(screen.getByTestId('panel-step')).toBeInTheDocument())
    expect(query()).toEqual({ path: 'challenge', step: 's6' })
    expect(window.location.pathname).toBe('/')
  })

  it('a path chip on a page goes to the flow for that path', async () => {
    goTo('/versions')
    render(<App />)
    await userEvent.click(screen.getByRole('radio', { name: 'Challenge only' }))
    expect(window.location.pathname).toBe('/')
    expect(query()).toEqual({ path: 'challenge' })
  })
})

describe('App: focus', () => {
  it('a click that does not change the step leaves no focus request behind', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    await userEvent.click(screen.getByTestId('diagram-s6'))
    const next = screen.getByRole('button', { name: /Next step/ })
    await userEvent.click(next)
    expect(panelStep()).toBe(`Step ${stepsInPath(steps, 'challenge').findIndex((s) => s.id === 's6') + 2}`)
    expect(next).toHaveFocus()
  })

  it('a number key pressed in the step panel moves focus to the new path’s step list', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    screen.getByRole('button', { name: /Next step/ }).focus()
    await userEvent.keyboard('1')
    expect(query()).toEqual({ path: 'frictionless' })
    expect(screen.getByRole('heading', { level: 2, name: /steps in this path/ })).toHaveFocus()
  })

  it('Back to a page focuses its heading and restores its scroll position', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /More info/ }))
    await userEvent.click(screen.getByRole('link', { name: /^Spec check/ }))
    const main = document.querySelector<HTMLElement>('main[data-scroll-restore]')!
    main.scrollTop = 1234
    const s3 = steps.find((s) => s.id === 's3')!
    await userEvent.click(screen.getByRole('link', { name: s3.title }))
    expect(screen.getByTestId('spec-pill')).toBeInTheDocument()
    act(() => window.history.back())
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Spec check' })).toHaveFocus())
    expect(document.querySelector<HTMLElement>('main[data-scroll-restore]')!.scrollTop).toBe(1234)
    act(() => window.history.forward())
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: s3.title })).toHaveFocus())
  })

  it('keeps one polite live region in the flow, present before a step opens', async () => {
    go('path=challenge')
    const { container } = render(<App />)
    const live = container.querySelector('main [aria-live="polite"]')!
    expect(live).toBeEmptyDOMElement()
    await userEvent.click(screen.getByRole('button', { name: /Start/ }))
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
    expect(live).toHaveTextContent(`Step 1 of ${stepsInPath(steps, 'challenge').length}: ${stepsInPath(steps, 'challenge')[0]!.title}`)
  })
})

describe('App: keyboard', () => {
  it('→ with nothing open opens step 1, ← opens the last step, and both clamp at the ends', async () => {
    go('path=challenge')
    const n = stepsInPath(steps, 'challenge').length
    const { unmount } = render(<App />)
    await userEvent.keyboard('{ArrowRight}')
    expect(panelStep()).toBe('Step 1')
    await userEvent.keyboard('{ArrowLeft}')
    expect(panelStep()).toBe('Step 1')
    await userEvent.keyboard('{ArrowRight}')
    expect(panelStep()).toBe('Step 2')
    unmount()
    go('path=challenge')
    render(<App />)
    await userEvent.keyboard('{ArrowLeft}')
    expect(panelStep()).toBe(`Step ${n}`)
    await userEvent.keyboard('{ArrowRight}')
    expect(panelStep()).toBe(`Step ${n}`)
  })

  it('↑ ↓ are left to the browser for scrolling', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    const before = panelStep()
    await userEvent.keyboard('{ArrowDown}{ArrowUp}')
    expect(panelStep()).toBe(before)
  })

  it('Esc returns to the step list', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('panel-step')).not.toBeInTheDocument()
  })

  it('number keys pick a path chip and keep the chosen variant', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.keyboard('5')
    expect(screen.getByRole('radio', { name: 'Challenge is Passkey' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Issuer WebAuthn in challenge iframe' }))
    expect(query().path).toBe('passkey-acs')
    ;(document.activeElement as HTMLElement).blur()
    await userEvent.keyboard('5')
    expect(query().path).toBe('passkey-acs')
    await userEvent.keyboard('1')
    expect(query().path).toBe('frictionless')
  })

  it('ignores keys with Ctrl or Meta held', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.keyboard('{Control>}1{/Control}{Meta>}{ArrowRight}{/Meta}')
    expect(query()).toEqual({ path: 'challenge' })
  })

  it('ignores keys on a More info page', async () => {
    goTo('/ux-rules')
    render(<App />)
    await userEvent.keyboard('1{ArrowRight}')
    expect(window.location.pathname + window.location.search).toBe('/ux-rules')
  })

  it('leaves arrow keys to a focused path radio: they change the path, not the step', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    screen.getByRole('radio', { name: 'Challenge only' }).focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(query().step).toBe('s6')
    fireEvent.keyDown(document.activeElement!, { key: '1' })
    expect(query().path).toBe('challenge')
  })
})

describe('App: More info', () => {
  it('lists Spec check first, marks the current page and opens each page', async () => {
    go('path=challenge')
    render(<App />)
    const toggle = screen.getByRole('button', { name: /More info/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const links = within(screen.getByRole('list', { name: 'More info pages' })).getAllByRole('link')
    expect(links[0]).toHaveTextContent('Spec check')
    expect(links.some((i) => i.textContent?.includes('Spec vs Adyen SDK'))).toBe(false)
    const sdk = links.find((i) => i.textContent?.includes('iframes'))!
    expect(sdk).toHaveAttribute('href', '/iframes')
    await userEvent.click(sdk)
    expect(screen.getByRole('heading', { level: 1, name: 'iframes' })).toHaveFocus()
    expect(screen.queryByRole('list', { name: 'More info pages' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /More info/ }))
    expect(within(screen.getByRole('list', { name: 'More info pages' })).getByRole('link', { name: /iframes/ })).toHaveAttribute('aria-current', 'page')
    // path chips stay in the header and bring you back to the flow
    await userEvent.click(screen.getByRole('radio', { name: 'Challenge only' }))
    expect(screen.queryByRole('heading', { level: 1, name: 'iframes' })).not.toBeInTheDocument()
  })

  it('Esc closes the menu, returns focus to its button and keeps the open step', async () => {
    go('path=challenge&step=s6')
    render(<App />)
    const toggle = screen.getByRole('button', { name: /More info/ })
    await userEvent.click(toggle)
    await userEvent.keyboard('{ArrowDown}')
    expect(query().step).toBe('s6')
    await userEvent.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
    expect(query().step).toBe('s6')
    expect(screen.getByTestId('panel-step')).toBeInTheDocument()
  })

  it('closes when focus leaves it', async () => {
    go('path=challenge')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /More info/ }))
    await userEvent.tab()
    await userEvent.tab()
    expect(document.activeElement?.closest('ul')).not.toBeNull()
    await userEvent.tab({ shift: true })
    await userEvent.tab({ shift: true })
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: /More info/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('Spec check opens a step from another path on a path that has it', async () => {
    go('path=frictionless')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /More info/ }))
    await userEvent.click(screen.getByRole('link', { name: /^Spec check/ }))
    const s3 = steps.find((s) => s.id === 's3')!
    expect(s3.paths).not.toContain('frictionless')
    const link = screen.getByRole('link', { name: s3.title })
    expect(link).toHaveAttribute('href', `/?path=${s3.paths[0]}&step=s3`)
    await userEvent.click(link)
    expect(screen.getByTestId('spec-pill')).toHaveTextContent(`EMV spec step ${s3.num}`)
    expect(screen.getByRole('heading', { level: 2, name: s3.title })).toHaveFocus()
    expect(query()).toEqual({ path: s3.paths[0], step: 's3' })
  })
})

describe('App: theme', () => {
  it('saves the theme only when the user picks one', async () => {
    const set = vi.spyOn(Storage.prototype, 'setItem')
    render(<App />)
    expect(set).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(set).toHaveBeenCalledWith('3ds-viz-theme', 'dark')
    expect(document.documentElement).toHaveClass('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement).not.toHaveClass('dark')
    set.mockRestore()
  })
})

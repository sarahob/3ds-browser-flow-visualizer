import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StepPanel } from './StepPanel'
import { steps } from '../data/steps'
import { stepsInPath } from '../data/order'

const path = 'fingerprint-challenge' as const
const inPath = stepsInPath(steps, path)
const byId = (id: string) => steps.find((s) => s.id === id)!

function setup(id: string) {
  const onGo = vi.fn()
  const onClose = vi.fn()
  const step = byId(id)
  const index = inPath.findIndex((s) => s.id === id)
  render(<StepPanel step={step} path={path} index={index} total={inPath.length} onClose={onClose} onGo={onGo} refHref={(r) => `/${r}`} onRef={vi.fn()} />)
  return { onGo, onClose, index, step }
}

describe('StepPanel', () => {
  it('shows the path position as the step number, and the spec step as a reference', () => {
    const { index, step } = setup('s6')
    expect(screen.getByTestId('panel-step')).toHaveTextContent(`Step ${index + 1}`)
    expect(screen.getByTestId('spec-pill')).toHaveTextContent(`EMV spec step ${step.num}`)
    expect(screen.getByRole('heading', { level: 2, name: step.title })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: step.title })).toBeInTheDocument()
  })

  it('labels the field table with its message, with column headers for screen readers', () => {
    setup('s6')
    expect(screen.getByTestId('fields-label')).toHaveTextContent('AReq (EMV spec)')
    expect(screen.getByRole('columnheader', { name: 'Field' })).toBeInTheDocument()
  })

  it('tags non-EMV fields with their source and says where they end up', () => {
    setup('s2')
    expect(screen.getByText('Adyen API')).toBeInTheDocument()
    expect(screen.getByText(/→ AReq browserScreenWidth/)).toBeInTheDocument()
  })

  it('pager: first and back are unavailable on the first step, next and last go forward', async () => {
    const { onGo } = setup(inPath[0]!.id)
    const first = screen.getByRole('button', { name: 'First step' })
    expect(first).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: /Previous step/ })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(first)
    expect(onGo).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /Next step/ }))
    expect(onGo).toHaveBeenCalledWith(1)
    await userEvent.click(screen.getByRole('button', { name: 'Last step' }))
    expect(onGo).toHaveBeenCalledWith(inPath.length - 1)
  })

  it('pager: next and last are unavailable on the last step, but keep focus', async () => {
    const { onGo } = setup(inPath.at(-1)!.id)
    const last = screen.getByRole('button', { name: 'Last step' })
    expect(screen.getByRole('button', { name: /Next step/ })).toHaveAttribute('aria-disabled', 'true')
    expect(last).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(last)
    expect(last).toHaveFocus()
    expect(onGo).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /Previous step/ }))
    expect(onGo).toHaveBeenCalledWith(inPath.length - 2)
    expect(screen.getByRole('navigation', { name: 'Step pages' })).toHaveTextContent(`${inPath.length} of ${inPath.length}`)
  })

  it('shows both the SDK note and the redirect note as headings when a step has them', () => {
    setup('s3')
    expect(screen.getByRole('heading', { level: 3, name: 'With the Adyen web SDK (on the merchant page)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'With a redirect (PSP-hosted page)' })).toBeInTheDocument()
  })

  it('shows no integration boxes on a step without notes', () => {
    setup('s7')
    expect(screen.queryByText(/With the Adyen web SDK/)).not.toBeInTheDocument()
    expect(screen.queryByText(/With a redirect/)).not.toBeInTheDocument()
  })

  it('says who the parties are without a tooltip', async () => {
    setup('s6')
    await userEvent.click(screen.getByText('Who are they?'))
    expect(screen.getByText(/Builds AReq, talks to the scheme/)).toBeVisible()
  })

  it('the list button goes back to the step list', async () => {
    const { onClose } = setup('s6')
    await userEvent.click(screen.getByRole('button', { name: /All steps/ }))
    expect(onClose).toHaveBeenCalled()
  })
})

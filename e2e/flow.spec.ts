import { expect, test, type Page } from '@playwright/test'

const PATHS = ['frictionless', 'fingerprint', 'challenge', 'fingerprint-challenge', 'passkey', 'passkey-acs', 'spc', 'spc-acs']
const MORE_INFO = ['Spec check', 'iframes', 'UX rules', 'FIDO, passkeys, SPC', '2.2.0 vs 2.3.1.1']

/** Fail the test on any page error or console error. */
function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}

const pairs = (els: Element[]) => els.map((e) => `${(e as HTMLElement).dataset.order}:${(e as HTMLElement).dataset.step}`)
const listNumbers = (page: Page) => page.locator('#step-list [data-order]').evaluateAll(pairs)
const diagramNumbers = (page: Page) => page.locator('svg g.step').evaluateAll(pairs)

/** Count requestAnimationFrame callbacks over a time window. */
async function rafCalls(page: Page, ms: number) {
  return page.evaluate(
    (ms) =>
      new Promise<number>((done) => {
        const orig = window.requestAnimationFrame
        let n = 0
        window.requestAnimationFrame = (cb) => {
          n++
          return orig(cb)
        }
        setTimeout(() => {
          window.requestAnimationFrame = orig
          done(n)
        }, ms)
      }),
    ms,
  )
}

for (const path of PATHS) {
  test.describe(`path ${path}`, () => {
    test('list is numbered 1…N and the sequence diagram shows the same numbers in the same order', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(`/?path=${path}`)
      const list = await listNumbers(page)
      expect(list.length).toBeGreaterThan(3)
      expect(list.map((x) => Number(x.split(':')[0]))).toEqual(list.map((_, i) => i + 1))
      await expect.poll(() => diagramNumbers(page)).toEqual(list)
      expect(errors).toEqual([])
    })

    test('pager walks every step and the diagram highlights the one shown', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(`/?path=${path}`)
      const list = await listNumbers(page)
      await page.getByRole('button', { name: /Start/ }).click()
      for (let i = 1; i <= list.length; i++) {
        const id = list[i - 1]!.split(':')[1]
        await expect(page.getByTestId('panel-step')).toHaveText(`Step ${i}`)
        await expect(page.getByRole('navigation', { name: 'Step pages' })).toContainText(`${i} of ${list.length}`)
        await expect(page).toHaveURL(new RegExp(`step=${id}(&|$)`))
        await expect(page.locator('svg g.step[data-selected]')).toHaveAttribute('data-step', id!)
        await expect(page.locator(`svg g.step[data-step="${id}"] rect.pill`)).toHaveClass(/fill-indigo-600/)
        if (i < list.length) await page.getByRole('button', { name: /Next step/ }).click()
      }
      await expect(page.getByRole('button', { name: /Next step/ })).toHaveAttribute('aria-disabled', 'true')
      await page.getByRole('button', { name: 'First step' }).click()
      await expect(page.getByTestId('panel-step')).toHaveText('Step 1')
      expect(errors).toEqual([])
    })
  })
}

test('switching path goes back to the new path’s step list', async ({ page }) => {
  await page.goto('/?path=fingerprint-challenge&step=s6')
  await expect(page.getByTestId('panel-step')).toBeVisible()
  await page.getByText('Frictionless', { exact: true }).click()
  await expect(page.getByTestId('panel-step')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Start/ })).toBeVisible()
})

test('every More info page opens from the menu, with the path chips still in the header', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/?path=challenge')
  for (const title of MORE_INFO) {
    await page.getByRole('button', { name: /More info/ }).click()
    const menu = page.getByRole('list', { name: 'More info pages' })
    await menu.getByRole('link', { name: new RegExp(`^${title.replace(/[.+()]/g, '\\$&')}`) }).click()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByText('Challenge only', { exact: true })).toBeVisible()
    await expect(page).not.toHaveURL(/[?&](step|path)=/)
  }
  await page.getByText('Frictionless', { exact: true }).click()
  await expect(page.getByRole('button', { name: /Start/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('Spec check is the first More info item; a page has its own URL, and Back returns to the flow with the step intact', async ({ page }) => {
  await page.goto('/?path=challenge&step=s6')
  await page.getByRole('button', { name: /More info/ }).click()
  const first = page.getByRole('list', { name: 'More info pages' }).getByRole('link').first()
  await expect(first).toContainText('Spec check')
  await first.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Spec check' })).toBeVisible()
  await expect(page).toHaveURL(/\/spec-check$/)
  await page.goBack()
  await expect(page.getByTestId('spec-pill')).toHaveText('EMV spec step 6')
  await expect(page).toHaveURL(/\/\?path=challenge&step=s6$/)
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1, name: 'Spec check' })).toBeVisible()
})

const ROUTES: [string, string][] = [
  ['/spec-check', 'Spec check'],
  ['/iframes', 'iframes'],
  ['/ux-rules', 'UX rules'],
  ['/fido-passkeys-spc', 'FIDO, passkeys, SPC'],
  ['/versions', '2.2.0 vs 2.3.1.1'],
]
for (const [url, title] of ROUTES) {
  test(`${url} loads directly and survives a reload`, async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // the logo still loads on a deep route
    await expect.poll(() => page.locator('header img').evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
}

test('a trailing slash loads the same page and drops the slash', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/spec-check/')
  await expect(page.getByRole('heading', { level: 1, name: 'Spec check' })).toBeVisible()
  await expect(page).toHaveURL(/\/spec-check$/)
  expect(errors).toEqual([])
})

test('an address two segments deep shows Page not found', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/a/b')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  expect(errors).toEqual([])
})

test('Back to Spec check restores its scroll position and focuses its heading', async ({ page }) => {
  await page.goto('/spec-check')
  const main = page.locator('main[data-scroll-restore]')
  const link = page.getByRole('link', { name: 'Issuer decides' }).first()
  await link.scrollIntoViewIfNeeded()
  const before = await main.evaluate((m) => m.scrollTop)
  expect(before).toBeGreaterThan(500)
  await link.click()
  await expect(page.getByTestId('spec-pill')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Spec check' })).toBeFocused()
  expect(await main.evaluate((m) => m.scrollTop)).toBe(before)
})

test('an unknown address shows "Page not found" with a link home', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await page.getByRole('link', { name: 'Go to the flow' }).click()
  await expect(page.getByRole('button', { name: /Start/ })).toBeVisible()
})

test('Spec check step links open in the flow and can open in a new tab', async ({ page }) => {
  await page.goto('/spec-check')
  const link = page.getByRole('link', { name: 'Cardholder clicks Pay' })
  await expect(link).toHaveAttribute('href', /\/\?path=[\w-]+&step=s1$/)
  await link.click()
  await expect(page.getByTestId('spec-pill')).toHaveText('EMV spec step 1')
})

test('the step panel shows the SDK and redirect notes together, with no top-level switch', async ({ page }) => {
  await page.goto('/?path=fingerprint-challenge&step=s3')
  await expect(page.getByText('With the Adyen web SDK (on the merchant page)')).toBeVisible()
  await expect(page.getByText('With a redirect (PSP-hosted page)')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Integration' })).toHaveCount(0)
})

test('the sequence diagram is the only view, and the spec step is a pill in the panel body', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /sequence of \d+ steps/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Map' })).toHaveCount(0)
  await page.goto('/?path=challenge&step=s6')
  await expect(page.getByTestId('spec-pill')).toHaveText('EMV spec step 6')
  await expect(page.getByTestId('panel-step')).toHaveText(/^Step \d+$/)
})

test('field tables say which message they show', async ({ page }) => {
  await page.goto('/?path=challenge&step=s6')
  await expect(page.getByTestId('fields-label')).toHaveText(/AReq \(EMV spec\)/i)
  await page.goto('/?path=challenge&step=s2')
  await expect(page.getByTestId('fields-label')).toHaveText(/Payment request \(Adyen \/payments\)/i)
})

test('the challenge iframe boxes stay put while stepping (no flicker from a duplicate key)', async ({ page }) => {
  await page.goto('/?path=fingerprint-challenge&step=s6')
  await expect(page.locator('svg g.frame')).toHaveCount(3)
  for (let i = 0; i < 4; i++) {
    await page.locator('main').press('ArrowRight')
    // every frame stays fully visible and no extra frame appears
    const ops = await page.locator('svg g.frame').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))
    expect(ops).toEqual(['1', '1', '1'])
  }
})

test('the diagram stops animating once it has drawn', async ({ page }) => {
  await page.goto('/?path=challenge')
  await page.getByText('Frictionless', { exact: true }).click()
  await page.waitForTimeout(800)
  expect(await rafCalls(page, 1000)).toBe(0)
})

test('with reduced motion, a path change does not animate', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/?path=challenge')
  await page.getByText('Frictionless', { exact: true }).click()
  expect(await rafCalls(page, 300)).toBeLessThanOrEqual(2)
  await ctx.close()
})

test('arrow keys on a focused path radio move the radio, not the step', async ({ page }) => {
  await page.goto('/?path=challenge&step=s6')
  await page.getByRole('radio', { name: 'Challenge only' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Fingerprint + Challenge' })).toBeChecked()
  await expect(page.getByRole('button', { name: /Start/ })).toBeVisible()
})

test('keyboard: Enter on a list row moves focus to the step title, Esc returns it to the row', async ({ page }) => {
  await page.goto('/?path=challenge')
  await page.locator('#step-list [data-step="s6"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 2 })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 2 })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('#step-list button[data-step]:focus')).toHaveCount(1)
})

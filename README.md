# 3DS Browser Flow Visualizer

An interactive walk-through of the EMV 3-D Secure **browser** flow, for presenting in workshops and as a quick reference instead of the PDF.

Pick a path (Frictionless, Fingerprint only, Challenge only, Fingerprint + Challenge, Challenge is Passkey, Challenge is SPC) and step through it on a sequence diagram. Each step says what happens, why it matters, the message fields involved, and how the Adyen web SDK or a redirect integration handles it.

Sources:
- EMV 3DS Protocol and Core Functions Specification **v2.3.1.1** (May 2023), with 2.2.0 for the version comparison.
- EMVCo FIDO white paper **v2.0** (passkeys) and the W3C Secure Payment Confirmation (SPC) spec.
- Adyen's 3D Secure docs and the open-source [adyen-web](https://github.com/Adyen/adyen-web) `ThreeDS2` component.

It runs entirely in the browser: no backend, no data leaves the page.

## Run it locally

You need **Node.js 20 or later** (with the npm that comes with it).

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds a static site into `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm test` | Lint (no warnings allowed), then data checks and React component tests (Vitest) |
| `npm run test:e2e` | Builds, then tests every path and page in a real browser (Playwright) |

If Playwright can't find a browser, run `npx playwright install chromium` once.

## Using it

- **Path chips** in the header choose the flow (keys 1–6). Passkey and SPC have a "merchant / issuer in iframe" switch.
- The **left panel** lists the path's steps. Click a step, or a row on the diagram, to open it. The pager (or ← →) moves through the steps; Esc goes back to the list.
- Steps are numbered **1…N within each path**. The EMV spec step number shows as a pill under the step title.
- **More info** has reference pages, each with its own link: Spec check (every step mapped to its spec requirements), iframes, UX rules, FIDO/passkeys/SPC, and 2.2.0 vs 2.3.1.1.
- The URL keeps your place, so you can share a link to a step, e.g. `/?path=spc&step=spc-d`.

## Project layout

```
src/
  data/         all content: steps.ts, meta.ts (parties, paths), reference.ts (More info pages),
                reqs.ts (one-line requirement summaries), order.ts (per-path numbering)
  components/   React UI: sequence diagram (D3), step list, step panel, pages
  lib/          routing, diagram layout, small hooks
e2e/            Playwright tests
```

Stack: Vite, React, TypeScript, Tailwind CSS, D3.

## Editing the content

Everything you read in the app lives in `src/data/`. A step's text, notes and field notes can be one string or a per-path object (`{ challenge: '…', fingerprint: '…' }`) naming every path the step appears on. Run `npm test` after editing; the data checks catch most mistakes (missing paths, unlabelled field tables, requirement numbers without a summary, numbering gaps).

## Hosting

`npm run build` produces a static site. The More info pages have their own addresses (`/spec-check`, `/iframes`, …), so the host must serve `index.html` for unknown paths (for example Netlify `_redirects`, or nginx `try_files $uri /index.html`). To host in a subfolder, build with `npx tsc -b && npx vite build --base=/sub/`.

import type { RefId } from './types'

export interface RefSection {
  heading: string
  bullets?: string[]
  /** highlight: indexes of rows to emphasise (e.g. a key 2.3 change). */
  table?: { head: string[]; rows: string[][]; highlight?: number[] }
  code?: string
}

export interface RefPage {
  id: RefId
  title: string
  /** Where the page comes from; the first entry is the short hint in the More info menu. Shown joined with ' · '. */
  sources: string[]
  lead: string
  sections: RefSection[]
}

export const reference: Record<RefId, RefPage> = {
  iframe: {
    id: 'iframe',
    title: 'iframes',
    sources: ['EMVCo 3DS Browser Flow Best Practices v1.0 (Sept 2021)', 'Core spec v2.3.1.1 Annex A.15, section 5.8'],
    lead: 'The checkout page (usually the PSP SDK) frames the issuer\'s content. The browser\'s same-origin policy keeps each side out of the other\'s data. Pop-ups get blocked and full redirects confuse shoppers, so iframes are the recommended pattern.',
    sections: [
      {
        heading: '3DS Method iframe (device fingerprint)',
        bullets: [
          'Hidden with style="visibility: hidden" (Req 261, new in 2.3: "for Browser compatibility"). Not display: none. Best Practices suggests a small size such as 10×10.',
          'POSTs a form field threeDSMethodData (Base64url JSON: threeDSServerTransID + threeDSMethodNotificationURL) to the ACS Method URL.',
          'Run it as soon as the card is known, in advance of the AReq.',
          'If the ACS hasn\'t notified within 5 seconds, send the AReq with threeDSCompInd = N (2.2.0 allowed 10 s).',
          'May reuse a run from the last 10 minutes for the same card, device and browser (threeDSMethodId, new in 2.3).',
        ],
        code: '<iframe name="3DSMethodFrame" height="10" width="10"\n  sandbox="allow-forms allow-same-origin allow-scripts"\n  allow="payment *; publickey-credentials-get *"\n  style="visibility: hidden; border: 0;"></iframe>\n<form method="POST" action="{threeDSMethodURL}" target="3DSMethodFrame">\n  <input type="hidden" name="threeDSMethodData" value="…" />\n</form>',
      },
      {
        heading: 'Challenge iframe',
        bullets: [
          'The checkout page (PSP SDK) controls placement (lightbox or inline) and size. The size must match challengeWindowSize sent in the CReq.',
          'Phones: 05 full screen. Tablets and small laptops: 03 or 04.',
          'browserScreenWidth/Height must be the real window.screen values in CSS px.',
          'Set <meta name="viewport" content="width=device-width, initial-scale=1"> on the checkout page.',
          'Don\'t restrict the challenge iframe with CSP: the ACS may redirect to other domains (e.g. a national eID scheme).',
          'Without JavaScript, provide a fallback (a submit button), and pick a sensible window size yourself.',
          'On the final CRes, close the iframe and refresh the parent state (Req 270).',
          'If the shopper refreshes, rebuild the iframe with the same size and attributes and post the CReq again (5.8.2, new in 2.3). The issuer restarts, continues or returns error 314/315 (Req 442).',
          'If the challenge times out (10 minutes, Req 226), close the iframe and refresh the page (Req 344).',
        ],
        code: '<iframe id="EMV3DSChallengeWindow" name="EMV3DSChallengeWindow"\n  width="390" height="400" style="border: 0;"\n  sandbox="allow-forms allow-same-origin allow-scripts allow-pointer-lock"\n  allow="payment *; publickey-credentials-get *"></iframe>\n<form method="POST" action="{acsURL}" target="EMV3DSChallengeWindow">\n  <input type="hidden" name="creq" value="…" />\n  <input type="hidden" name="threeDSSessionData" value="…" />\n</form>',
      },
      {
        heading: 'Challenge window sizes',
        table: {
          head: ['Value', 'Size (CSS px)', 'Use for'],
          rows: [
            ['01', '250 × 400', 'Small embedded widgets'],
            ['02', '390 × 400', 'Default desktop lightbox'],
            ['03', '500 × 600', 'Tablet, small laptop'],
            ['04', '600 × 400', 'Landscape tablet, small laptop'],
            ['05', 'Full screen', 'Phones'],
          ],
        },
      },
      {
        heading: 'Attributes for both iframes (Annex A.15, Tables A.23 and A.24, new in 2.3)',
        table: {
          head: ['Attribute', 'Rule'],
          rows: [
            ['sandbox: allow-forms, allow-scripts, allow-same-origin', 'Required'],
            ['sandbox: allow-pointer-lock', 'Required (not needed for the 3DS Method iframe)'],
            ['sandbox: allow-popups, allow-popups-to-escape-sandbox, allow-modals', 'Not allowed'],
            ['sandbox: allow-top-navigation (+ by-user-activation)', 'Not allowed'],
            ['sandbox: allow-downloads (+ without-user-activation), allow-orientation-lock, allow-presentation, allow-storage-access-by-user-activation', 'Not allowed'],
            ['allow="payment *; publickey-credentials-get *"', 'Enables WebAuthn, SPC and Payment Request inside the frame'],
            ['allowfullscreen, allowpaymentrequest', 'false'],
            ['srcdoc', 'May be used to start the redirect content'],
            ['Any attribute not in Table A.23 (e.g. frameborder, referrerpolicy)', 'Should not be present (footnote 19). name is still needed as the form target.'],
          ],
        },
      },
      {
        heading: 'Issuer / ACS side',
        bullets: [
          'Must allow its 3DS pages to be framed (Req 122). Keep X-Frame-Options elsewhere; remove it only on 3DS paths, e.g. after checking the POST is a valid CReq.',
          'Strict CSP: no inline JS, a reporting endpoint, Report-Only while rolling out.',
          'CORS: none needed between merchant and issuer. If used, per-route and a trust list of origins.',
          'Responsive HTML for every window size, with breakpoints. Never block scrolling.',
          'Prefer challenges that need typed input over one-click buttons (clickjacking).',
          'Any redirect stays inside the iframe and only serves authentication (Req 307).',
        ],
      },
    ],
  },
  ux: {
    id: 'ux',
    title: 'UX rules',
    sources: ['Core spec v2.3.1.1 chapter 4 (4.1, 4.3). To be extended with the EMVCo 3DS UX guidelines site.'],
    lead: 'The spec defines what the checkout page (PSP SDK) shows while messages fly, and how the issuer lays out the challenge. The goal is that every bank challenge looks familiar, whatever the merchant.',
    sections: [
      {
        heading: 'Processing screens',
        table: {
          head: ['Who', 'When', 'Shows', 'Minimum'],
          rows: [
            ['Checkout page (PSP SDK)', 'During AReq / ARes', 'Spinner or bar + card scheme (DS) logo, with or without a white box. No other text or design.', '2 seconds'],
            ['Issuer (ACS)', 'During CReq / CRes', 'Graphic only, in the Challenge zone. No text, no white box, no DS logo.', '1 second'],
          ],
        },
      },
      {
        heading: 'The four zones of a challenge',
        table: {
          head: ['Zone', 'Holds'],
          rows: [
            ['1 Header', 'Merchant-managed labels (e.g. Cancel). Max 10% of height. Not used in browser flows, the page is the header.'],
            ['2 Branding', 'Issuer logo and card scheme logo.'],
            ['3 Challenge / Processing', 'Title, instructions, input (OTP), buttons, or the spinner.'],
            ['4 Information', '"Why am I seeing this?" and "Need help?" as expandable accordions.'],
          ],
        },
      },
      {
        heading: 'Rules worth remembering',
        bullets: [
          'Portrait and landscape layouts are both defined (Req 380). Don\'t block scrolling in the iframe (Best Practices; the spec\'s scrolling rule, Req 418, is for apps).',
          'If the issuer sends a message for the cardholder in its answer (cardholderInfo), the checkout must show it (Req 356).',
          'The issuer must not send the cardholder to registration or marketing pages, and only load what helps authentication (Req 307).',
          'Activation During Shopping and cardholder T&Cs are not supported in the templates.',
          'Decoupled: the checkout page shows its processing screen, then the issuer\'s Cardholder Information Text inside the checkout page (for example "Approve in your banking app").',
          'The browser challenge appears as a lightbox (modal over checkout) or inline (in the page). The merchant or PSP decides.',
        ],
      },
    ],
  },
  fido: {
    id: 'fido',
    title: 'FIDO, passkeys, SPC',
    sources: ['EMVCo 3DS White Paper: Use of FIDO Data in 3DS Messages, v2.0 (Nov 2023)', 'Core spec v2.3.1.1 section 3.5, Table A.12'],
    lead: 'Two ways to use FIDO in 3DS. Passkey: the merchant (or the PSP on its behalf) authenticates the cardholder and hands the signed proof to the issuer in the AReq. SPC: the issuer owns the credential and the browser shows a payment sheet the merchant can trigger.',
    sections: [
      {
        heading: 'Passkey vs SPC',
        table: {
          head: ['', 'Passkey (merchant RP)', 'SPC'],
          rows: [
            ['Who owns the credential (RP)', 'Merchant', 'Issuer (or DS)'],
            ['When FIDO runs', 'Before the AReq', 'Between AReq #1 (S) and AReq #2'],
            ['Cardholder sees', 'OS passkey prompt', 'Browser payment sheet with amount, payee, card'],
            ['AReq rounds', '1', '2'],
            ['threeDSReqAuthMethod', '07 (white paper). 06 also means FIDO; 07 adds signed assurance data', '09 SPC'],
            ['Spec version', 'Works on 2.2+ (data as string on 2.2)', '2.3+ (status S is new)'],
          ],
        },
      },
      {
        heading: 'threeDSReqAuthData for a passkey assertion',
        code: '{\n  "rpId": "shop.example",\n  "assertionBlob": "<Base64url AuthenticatorAssertionResponse>",\n  "deviceBindingInfo": "<32 alphanumeric chars, optional>",\n  "version": "2.0",\n  "spcUsed": "false"\n}',
        bullets: [
          'threeDSReqAuthMethod = 07, threeDSReqAuthTimestamp = time of the assertion (UTC, YYYYMMDDHHMM).',
          'spcUsed tells the issuer whether to look for SPC data in clientDataJSON.',
          'The DS may verify first and set dsAuthInfVerifInd: 01 verified, 02 failed, 03 not performed.',
        ],
      },
      {
        heading: 'Signed challenge format (authentication)',
        bullets: [
          '1 byte: length of the random value',
          '+ random bytes',
          '+ timestamp YYYYMMDDHHMM',
          '+ currency code (3 digits) + exponent + amount in minor units',
          '+ "|" + merchant name (max 40 chars)',
          'Non-payment: currency, exponent and amount zero-filled.',
        ],
      },
      {
        heading: 'Enrolment (attestation)',
        bullets: [
          'After the cardholder passes an issuer challenge (ID&V), the merchant (or PSP SDK) creates the passkey with navigator.credentials.create().',
          'It sends the attestation in an AReq with FIDOMessageType "Register": as a non-payment request (messageCategory 02) when nothing is bought, or with a payment (01) when enrolment happens at checkout.',
          'Prior auth info points at the ACS trans ID of that challenge, so the issuer can bind the key to the card.',
          'Synced passkeys carry no AAGUID at registration. The merchant can add deviceBindingInfo instead.',
          'Issuers can check authenticators in the FIDO Metadata Service, but only when an AAGUID/AAID is present.',
        ],
      },
      {
        heading: 'SPC prerequisites (spec 3.5)',
        bullets: [
          'The ACS has an enrolled FIDO authenticator for this cardholder on this device.',
          'The PSP SDK and/or ACS detected that the browser supports SPC (and iframes carry allow="payment *; publickey-credentials-get *").',
          'The 3DS Requestor (merchant or PSP) must not change or store the SPC data (Req 450).',
          'ACS-initiated SPC also exists: the ACS runs SPC inside a normal challenge iframe (authentication method 14).',
        ],
      },
      {
        heading: 'In practice: Adyen (docs, Nov 2026)',
        bullets: [
          'Scheme passkeys: pilot, Mastercard network-token transactions only, UK and EEA. Enrolment is offered after a successful 3DS2 challenge; later purchases on the same device and card can use the passkey instead of a challenge.',
          'Google Secure Payment Authentication: limited availability, Android only, Visa and Mastercard cards tokenized in Google Wallet, UK and Poland. The shopper is redirected to a Google page to verify with biometrics. If it fails, Adyen falls back to 3DS2.',
          'Both need the redirect 3DS2 integration (not native, not a redirect inside an iframe). Adyen\'s engine picks the method, so the merchant cannot force it. Both are for customer-initiated payments only, and both need Adyen for authentication and authorisation.',
          'Both say a successful authentication can shift liability to the issuer, based on the ECI.',
          'Not stated in the docs: who is the FIDO Relying Party, or whether the result travels as FIDO data in the AReq (white paper), SPC, or delegated authentication.',
        ],
      },
    ],
  },
  diff: {
    id: 'diff',
    title: '2.2.0 vs 2.3.1.1',
    sources: ['Core spec v2.2.0 (Dec 2018) and v2.3.1.1 (May 2023). The 22-step browser flow is the same in both (SPC adds Steps 10a–10i in 2.3).'],
    lead: 'Same flow, more options. The big additions for browser flows are SPC, exact iframe attributes and a faster 3DS Method.',
    sections: [
      {
        heading: 'What changed',
        table: {
          head: ['Area', '2.2.0', '2.3.1.1'],
          rows: [
            ['SPC', '—', 'Section 3.5, transStatus S, Steps 10a–10i, webAuthnCredList, spcTransData'],
            ['iframe attributes', 'Not specified', 'Annex A.15: sandbox list + allow="payment *; publickey-credentials-get *"'],
            ['3DS Method timeout', '10 s', '5 s'],
            ['3DS Method reuse', 'Run every time', 'Reuse within 10 min (threeDSMethodId)'],
            ['Version negotiation', 'Start / end protocol version', 'Version lists; use the highest common'],
            ['Requestor auth methods (threeDSReqAuthMethod)', '01–08 (07 = FIDO, assurance data signed; 08 = SRC)', 'Adds 09 SPC and 10 eID. 07 reworded: "FIDO Assertion or Attestation data signed"'],
            ['FIDO verification by DS', '—', 'dsAuthInfVerifInd'],
            ['Decoupled', 'Only when requested', 'Also as a fallback mid-challenge'],
            ['Repeated CReq / page refresh', 'Not covered', 'Requestor re-posts the CReq on refresh (5.8.2 note); ACS restarts, continues or errors (Req 442); new error codes 314 and 315'],
            ['authenticationMethod', 'RReq only, one 2-char value, not passed to the 3DS Server', 'Also in the ARes for C or D, as a list; new values 12 decoupled, 13 WebAuthn, 14 SPC, 15 behavioural biometrics, 16 eID'],
            ['3DS Method iframe', 'Any hidden iframe', 'Hidden with style="visibility: hidden" and Table A.23/A.24 attributes (Req 261)'],
            ['ACS info indicator (acsInfoInd)', '01–04', 'Adds 05 device binding, 06 WebAuthn, 07 SPC, 08–11 exemptions; given per protocol version'],
            ['Browser challenge timeout (10 min)', 'ACS sends RReq N and also posts a CRes N to the notification URL (Req 343); the iframe closes on that CRes', 'ACS sends only the RReq N, reason 14, within 60 s (Req 227). No CRes: the 3DS Server tells the requestor, which closes the iframe (Req 344)'],
            ['SPC timers', '—', 'ACS waits 10 min for the second AReq, else RReq N reason 14 (Req 452, 453); 3DS Server waits 9 min for the SPC result, else sends the second AReq with spcIncompInd 03 (Req 454, 455)'],
            ['Naming', 'whitelisting*', 'trustList*'],
            ['New messages', '—', 'OReq / ORes'],
            ['New data', '—', 'Seller info, multi-transaction, device binding, recurring detail, card security code status, payment token info, broadcast info'],
          ],
        },
      },
    ],
  },
}

/** Order of the reference pages in the More info menu (after Spec check). */
/** Order of the reference pages in the More info menu. Spec vs Adyen SDK is hidden: see app/hidden/. */
export const refOrder: RefId[] = ['iframe', 'ux', 'fido', 'diff']

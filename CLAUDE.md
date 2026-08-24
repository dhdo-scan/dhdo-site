# DHDO Marketing Site — working agreement

Static, hand-authored HTML. Repo `dhdo-scan/dhdo-site` → `www.dhdoscan.com`.
**Pushing to `main` publishes to the public site.** No staging, no review gate.

DHDO = *Digital Home Documentation & Organization* in anything a customer reads.
(The legal/internal name uses "Operations" — never put that on a public page.)

---

## 0. Before your first edit

- **Every statistic needs a real, linked, verifiable source.** No exceptions. If you cannot
  find the primary source, the stat does not go on the page. Several claims have already been
  pulled for failing this bar — an unsourced number on an insurance-adjacent page is a
  credibility and compliance problem, not a copy problem.
- **Hedge insurance language.** We document; we do not adjust, appraise, value, or promise
  a claim outcome. "May help support your position," never "guarantees your payout."
  DHDO is not an insurance producer, adjuster, or inspector — say so where it matters.
- **No legal assertions** about Louisiana succession, filings, or coverage without an
  attorney's sign-off. Describe what the scan *is*; let the attorney's role stay the attorney's.
- **Never invent a testimonial.** Client-quote blocks stay as visible placeholders until a
  real, approved quote exists. Same for case studies and named clients.

---

## 1. Design system — do not reinvent it

Canonical design is the **live dhdoscan.com** system. Every page shares one inlined `<style>`
block; keep them consistent.

- Fonts: **Cormorant Garamond** (headings) + **Outfit** (body).
- Colors: purple `#2E1A47`, purple-deep `#1A0E2E`, gold `#C9A24E`, cream `#F8F4EE`,
  cream-dark `#EDE7DD`, gold border `rgba(201,162,78,0.2)`.
- Reusable classes: `.page-hero`, `.inner`, `.eyebrow`, `.about-grid`/`.acard`,
  `.why-grid`/`.why-card`, `.steps`/`.step`, `.stat-strip`, `.quote-block`, `.scan-grid`/`.scan-card`,
  `.faq-item`/`.faq-q`/`.faq-a`, `.cta-band`, `.media-band`, `.btn-gold`/`.btn-ghost`/`.btn-dark`.
- New content must mirror the exact markup of an existing sibling element. Copy a sibling,
  change the text — don't hand-roll new structure.
- **Alternate section backgrounds** (cream → white → dark → gold). Two adjacent sections of the
  same background reads as a mistake; Lauren has flagged it before.
- Do **not** reintroduce the older Fraunces + Inter "hp-files" design. It was replaced.

## 2. Page conventions

- Title tag 50–60 chars, format `[Primary keyword] in [Location] | DHDO`.
- Meta description 150–160 chars with the keyword in the first ~110.
- Schema per page: `Organization` + `Service` + `BreadcrumbList`, plus `FAQPage` where the
  page has an FAQ. **If you add or edit a visible FAQ item, mirror it into the FAQPage JSON-LD**
  or the structured data silently drifts out of sync.
- `Book a Scan` is the single front door — booking happens on a phone call. The old intake
  form is retired; don't add one back.
- Areas served: Lake Charles / Calcasieu Parish / Lafayette / South Louisiana.

## 3. Known traps

- **Mixed line endings.** Some files are CRLF, some are LF, and some are *both* (CRLF shell
  with LF body blocks spliced in). Any scripted multi-line find/replace must match
  EOL-agnostically (split on `/\r?\n/`, rejoin with `\r?\n`) or it silently matches nothing.
- **The GitHub web editor corrupts large files.** Above roughly 40 KB its editor can append
  instead of replace — it once tripled a live page. Edit locally and commit via git or the
  Contents API. Every page here is 60–80 KB.
- **`.faq-item.open .faq-a` has a `max-height` cap.** Long answers get silently clipped at
  narrow widths. If you add a long FAQ answer, check it on a phone.
- Images reference absolute `https://www.dhdoscan.com/` asset URLs; local `media/` files in a
  draft bundle must be uploaded before those pages go live. This also means a page opened from a
  local checkout renders those images broken — measure layout against the live assets, or a
  broken-image alt-text box will read as an element far wider than the real one.
- **Tightening the CSP in `vercel.json` can kill analytics silently.** GA4 delivers its hits to
  `google-analytics.com` by `fetch`/`sendBeacon`, which `connect-src` governs. GTM itself keeps
  loading (script-src allows `https:`), so the container looks perfectly healthy in Tag Assistant
  while every hit is dropped by the browser — nothing errors, data just stops. This already
  happened once: the CSP added 2026-07-06 ("Security audit F10") took GA4 down until 2026-08-24,
  seven weeks, and the reports were assumed to be a GTM problem the whole time. `connect-src` must
  keep `googletagmanager.com`, `*.google-analytics.com`, `*.analytics.google.com` and
  `stats.g.doubleclick.net`. After ANY CSP change, load a page and confirm a request to
  `/g/collect` returns 200/204 in the Network tab.
- Analytics lives in **GTM**, not in the page source. Container `GTM-K6CWMW3B` fires the GA4
  PageView tag for property `G-MTX10EKD70`. Do not add `gtag.js` to the pages — Lauren maintains
  tags in the container, and a second hardcoded tag would double-count every pageview.

## 4. Verifying

Open the page in a browser and check: the section you changed, background alternation, no
horizontal scroll at 375px wide, FAQ accordions open fully, and the JSON-LD still parses.

## 5. House rules (DHDO)

- **12-Hour Rule** — inquiries answered within 12 hours.
- **No Invisible Work** — log what you changed; save a summary to the Drive project folder.
- **$50 Spend Rule** — approval before unplanned spend over $50.
- Premium, white-glove positioning. Professional and modern — not the cheapest, the best.
- Phone: (337) 415-1951.

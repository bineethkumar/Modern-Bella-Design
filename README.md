# Modern Bella Design — cabinetry storefront

A single-page storefront built from the supplier specification book. Open `index.html`
in a browser — no build step, no server required.

## Company name

The first block in `app.js` is:

```js
const BRAND = {
  name: 'Modern Bella Design',            // wordmark: nav and tab title
  legalName: 'Modern Bella Design LLC',   // footer and anything contractual
  tagline: 'Kitchen and bath cabinetry',
  city: 'Beltsville, MD',
  serviceArea: [ /* 32 areas served */ ]
};
```

`name` is the wordmark and appears in the nav and the tab title. `legalName`
carries the LLC and appears in the footer. `serviceArea` builds the footer's
"serving …" sentence — add or remove a town there and the sentence rewrites
itself.

These strings are **also written statically into `index.html`** — the `<title>`,
`#brandName`, `#brandNameFoot` and `#brandArea` — so the right text is on screen
before `app.js` runs and is in the HTML for local search. Change both, or the
page shows the old text for a moment on load.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page structure for all three views plus the cart drawer and product sheet |
| `styles.css` | Design tokens at the top, then components |
| `app.js` | Brand config, installation rates, pricing, cart, filters |
| `data.js` | 202 cabinets, 28 organisers, 9 finishes, 14 modifications |
| `img/` | 123 images pulled from the specification book at native resolution |

## Image quality

Assets are extracted at or above the resolutions embedded in the source book
(photography is 200 ppi, cabinet renderings 200–266 ppi). Photo pages are
rasterised at 260 DPI and spec pages at 340 DPI, then downsampled with Lanczos —
supersampling keeps the dimension callouts and hairlines clean. Everything is
WebP at quality 88–93.

Sizes are matched to how each asset is actually displayed, so nothing downloads
larger than it renders:

| Asset | Export | Shown at |
|---|---|---|
| Kitchen photography | 1750 px, plus a 900 px variant via `srcset` | Hero full-bleed, room cards |
| Door swatches | 400 px | 17–74 px chips |
| Vanity photography | 1000 px | Room card |
| Cabinet renderings | 1000 px | ~200 px in grid, ~420 px in the detail sheet |
| Organiser photos | 880 px | ~200 px in grid |

If you swap in your own photography, keep the door swatches small — they are only
ever drawn at thumbnail size, and a full-resolution door costs 95 KB to display
74 px wide.

## How pricing works

Every cabinet carries two list prices, one per door series. Choosing a finish
sets `state.finish`, and every price on the page is read through `priceOf()`,
so the whole catalogue re-prices at once. Organiser hardware is the same price
in either series.

## Installation rates

Near the top of `app.js`:

```js
const INSTALL = {
  base: 95, wall: 85, tall: 145, vanity: 165, storage: 45, trim: 22,
  minimum: 650,
  haulPerCabinet: 55
};
const DELIVERY = { flat: 249, freeOver: 6000 };
```

These are placeholders at plausible market rates — replace them with your own.
The cart estimate counts each line by its type and applies the job minimum.

## Before this goes live

- The nine finish names, the warranty language and the construction copy come from
  the supplier's book. Rewrite anything you don't have the rights to reuse.
- Prices are list. Add your own margin, tax handling and lead times.
- Checkout is a button, not a payment flow. Wire it to whatever processor you use.
- The install estimate is deliberately labelled an estimate. Keep that framing —
  quoting a firm install price before a site measure is how installers lose money.

## Generated product previews

`img/products/` contains 63 generated cabinet previews: seven representative
configurations in each of the nine finishes. Images were made with the built-in
image generator and exported as 800-pixel WebP files. The exact prompt set is in
`img/products/prompts.json`.

`productShape()` in `app.js` maps 96 standard cabinet listings to these
previews. Cards, the product sheet, and cart follow the active finish. Specialty
configurations retain their supplier diagrams; hardware retains its original
photography. Generated previews illustrate the finish and cabinet family rather
than exact SKU proportions. The product sheet includes the original supplier
configuration and real finish sample. Missing preview files fall back to the
supplier image.


Product images always prioritize the selected finish. Listings without a matching
render show a labeled supplier finish sample. Configuration diagrams are collapsed
behind "View dimensions and configuration" and explicitly marked as references
whose pictured color does not represent the selection. Missing renders fall back
to the selected finish sample, including in the cart.

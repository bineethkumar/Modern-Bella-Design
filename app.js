/* ============================================================
   BRAND — change these three lines when the company name is set.
   The name flows into the nav, the footer, the cart and the tab title.
   ============================================================ */
const BRAND = {
  name: 'Modern Bella Design',            // wordmark: nav and tab title
  legalName: 'Modern Bella Design LLC',   // footer and anything contractual
  tagline: 'Kitchen and bath cabinetry',
  city: 'Beltsville, MD',
  // Full areas-served list. Edit here; the footer sentence builds itself.
  serviceArea: [
    'Columbia', 'Silver Spring', 'Bethesda', 'Bowie', 'North Bethesda',
    'College Park', 'Laurel', 'South Laurel', 'Fairland', 'Greenbelt',
    'Hyattsville', 'Langley Park', 'Beltsville', 'Maryland City', 'Calverton',
    'Takoma Park', 'Adelphi', 'Cloverly', 'White Oak', 'Colesville',
    'New Carrollton', 'Fort Meade', 'Burtonsville', 'North Kensington',
    'South Kensington', 'Four Corners', 'Goddard', 'Hillandale', 'West Laurel',
    'Berwyn Heights', 'Spencerville', 'Washington DC'
  ]
};

/* "a, b and c" — an Oxford-comma-free list for running prose. */
const proseList = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
const serviceAreaLine = () => `${BRAND.city} — serving ${proseList(BRAND.serviceArea)}.`;

/* ============================================================
   Installation rates.
   Per cabinet, by type. These are the numbers the live estimate
   is built from — edit here and the whole site follows.
   ============================================================ */
const INSTALL = {
  base: 95, wall: 85, tall: 145, vanity: 165, storage: 45, trim: 22,
  minimum: 650,
  haulPerCabinet: 55,
  measure: 0
};
const DELIVERY = { flat: 249, freeOver: 6000 };

/* ============================================================
   Services the company provides, beyond selling the cabinets.
   Order runs from the rooms this catalogue serves out to ground-up work.
   PLACEHOLDER COPY: the names are the registered service list, but the
   descriptions are written generically — review them before launch.
   ============================================================ */
const SERVICES = [
  ['Kitchen Remodeling', 'Layout, cabinetry, surfaces and finish work — from a straight cabinet swap through to moving walls and services.'],
  ['Bathroom Remodeling', 'Vanities, tile, fixtures and waterproofing, in powder rooms through to primary baths.'],
  ['Basement Remodeling', 'Finishing raw basement space: framing, egress, storage and the trades that go with them.'],
  ['Home Remodeling', 'Whole-house and multi-room renovation run as one project, on one schedule.'],
  ['Countertop Installation', 'Templating, fabrication and fitting for the tops that land on your cabinets.'],
  ['Stone Installation', 'Natural and engineered stone for counters, islands, vanities, backsplashes and surrounds.'],
  ['General Contracting', 'Running the trades, the sequence and the permits, so you deal with one contact instead of six.'],
  ['Custom Homes', 'Purpose-built houses taken from drawings through to finish carpentry.'],
  ['New Home Construction', 'Ground-up construction coordinated from site work to handover.']
];

/* ============================================================
   State
   ============================================================ */
const D = window.DATA;
const ALL = [...D.cabinets, ...D.organizers];
const BY_SKU = Object.fromEntries(ALL.map(p => [p.sku, p]));
const MOD_BY_SKU = Object.fromEntries(D.mods.map(m => [m.sku, m]));
const FINISH_BY_ID = Object.fromEntries(D.finishes.map(f => [f.id, f]));

/* Only cabinets wear a door finish. Organiser hardware and shop
   modifications are the same item whichever series you are buying. */
const CABINET_SKUS = new Set(D.cabinets.map(p => p.sku));
const isFinished = p => !!p && CABINET_SKUS.has(p.sku);

/* A cart line is a SKU *in a finish*, not a SKU. Two B24s in different
   door styles are two different things to build, ship and price, so the
   finish belongs in the key. No SKU or finish id contains "|".
   Finish-less lines (organisers, modifications) key on the SKU alone. */
const CART_SEP = '|';
const cartKey = (sku, finishId) => (finishId ? sku + CART_SEP + finishId : sku);
const parseKey = key => {
  const i = key.indexOf(CART_SEP);
  return i < 0
    ? { sku: key, finishId: null }
    : { sku: key.slice(0, i), finishId: key.slice(i + 1) };
};

const state = {
  finish: D.finishes[0],
  cart: new Map(),          // cartKey(sku, finishId) -> qty
  view: 'home',
  groups: new Set(),
  widths: new Set(),
  q: '',
  sort: 'cat',
  install: false,
  haul: false
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* One formatter, everywhere. Rounding per line and then summing the raw
   values made the visible lines disagree with the total, so nothing is
   rounded away: 220 of the 230 listings are whole dollars and print clean,
   and the handful carrying cents print them and add up. */
const money = n => {
  const v = Math.round(n * 100) / 100;
  return '$' + v.toLocaleString('en-US', {
    minimumFractionDigits: v % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
};

const doorImg = f => `img/door-${f.id}.webp`;
const kitchenImg = f => `img/kitchen-${f.id}.webp`;
const kitchenSmall = f => `img/kitchen-${f.id}@sm.webp`;
const kitchenSet = f => `${kitchenSmall(f)} 900w, ${kitchenImg(f)} 1750w`;

// Generated previews are representative; the supplier diagram remains the
// source of truth for each SKU's dimensions and configuration.
function productShape(p) {
  switch (p.cat) {
    case 'Base Cabinets': return p.sku === 'B09FD' ? null : (p.w < 24 ? 'base-single' : 'base-double');
    case 'Drawer Base':
    case 'Vanity Drawer Base': return 'drawer';
    case 'Wall Cabinet': return p.w < 24 ? 'wall-single' : 'wall-double';
    case 'Tall Pantry': return 'pantry';
    case 'Sink Base':
    case 'Vanity Sink Base': return 'vanity';
    default: return null;
  }
}

/* `finish` is passed in rather than read from state, so a cart line keeps
   the door style it was added in even after the shop moves on to another. */
function productImage(p, { detail = false, decorative = false, finish = state.finish } = {}) {
  if (!p.img) return '';
  const finished = isFinished(p);
  const shape = finished ? productShape(p) : null;
  const finishName = `${finish.series} ${finish.name}`;
  const sample = doorImg(finish);
  const src = shape ? `img/products/${finish.id}-${shape}.webp` : (finished ? sample : p.img);
  const alt = decorative ? '' : (finished
    ? (shape ? `${p.name} in ${finishName}, representative preview` : `${finishName} finish sample; full cabinet preview unavailable`)
    : `${p.name} ${p.sku}`);
  // A missing render must never silently show a different cabinet color.
  const fallback = shape ? ` onerror="this.onerror=null;this.src='${sample}';this.alt='${finishName} finish sample';this.closest('.product-image-view').classList.add('preview-unavailable')"` : '';
  const photo = `<img src="${src}" alt="${alt}" loading="lazy" decoding="async"${fallback}>`;
  if (!finished) return photo;
  const caption = `<span class="preview-caption">${finishName} &middot; ${shape ? 'illustrated preview' : 'finish sample'}</span>${shape ? `<span class="preview-fallback-caption">${finishName} &middot; finish sample</span>` : ''}`;
  if (detail) return `<div class="product-detail-images product-image-view">
    <figure>${photo}<figcaption>${caption}
      ${shape ? '<span class="preview-description">AI-generated illustration; see configuration for exact product details.</span>' : '<span class="preview-description">Full cabinet preview unavailable in this finish. This sample shows your selected color.</span>'}
    </figcaption></figure>
    <details class="product-configuration">
      <summary>View dimensions and configuration</summary>
      <p>Reference diagram only. Its pictured color does not represent your selected finish: ${finishName}.</p>
      <img src="${p.img}" alt="${p.name} ${p.sku} configuration reference, not selected finish" loading="lazy">
    </details>
  </div>`;
  if (decorative) return `<span class="product-image-view cart-product-image">${photo}</span>`;
  return `<span class="product-finish-preview product-image-view${shape ? ' product-generated-preview' : ''}">${photo}<span class="product-finish-label">${caption}</span></span>`;
}

/* price of a product in the active finish */
function priceOf(p, finish = state.finish) {
  if (MOD_BY_SKU[p.sku]) return p.price;
  return p.p[finish.tier];
}

function dimText(p) {
  if (!p.w) return p.note ? '' : 'One size';
  const bits = [`${p.w}″ w`];
  if (p.h) bits.push(`${trim(p.h)}″ h`);
  if (p.d) bits.push(`${trim(p.d)}″ d`);
  return bits.join(' · ');
}
const trim = n => (n % 1 === 0 ? n : n.toFixed(1).replace('.5', '½').replace('.0', ''));

/* ============================================================
   Boot
   ============================================================ */
function boot() {
  document.title = `${BRAND.name} — ${BRAND.tagline}`;
  $('#brandName').textContent = BRAND.name;              // wordmark
  $('#brandNameFoot').textContent = BRAND.legalName;     // legal name
  $('#brandArea').textContent = serviceAreaLine();

  buildDoorStrip();
  buildSeriesPair();
  buildRooms();
  buildSpec();
  buildFinishBar();
  buildFilters();
  buildServices();
  buildRates();
  buildMods();

  applyFinish(state.finish, true);
  renderGrid();
  renderCart();
  wire();
}

/* ============================================================
   Finish
   ============================================================ */
let heroFlip = false;

function applyFinish(f, first) {
  state.finish = f;

  // hero cross-fade between two stacked images
  const a = $('#heroImgA'), b = $('#heroImgB');
  const incoming = heroFlip ? a : b;
  const outgoing = heroFlip ? b : a;
  const dress = el => {
    el.sizes = '100vw';
    el.srcset = kitchenSet(f);
    el.src = kitchenImg(f);
    el.decoding = 'async';
    el.alt = `A kitchen finished in ${f.series} ${f.name}`;
  };
  if (first) {
    dress(a);
    dress(b);
    a.classList.add('on');
  } else {
    dress(incoming);
    incoming.classList.add('on');
    outgoing.classList.remove('on');
    heroFlip = !heroFlip;
  }

  $('#heroSeries').textContent = `${f.series} series`;
  $('#heroName').textContent = f.name;
  $('#heroBlurb').textContent = f.blurb;
  $('#heroMaterial').textContent = f.material;

  const base = D.cabinets.find(p => p.sku === 'B24');
  $('#heroPriceHint').textContent = base
    ? `A 24″ base runs ${money(priceOf(base, f))}`
    : '';

  $('#navFinishName').textContent = `${f.series} ${f.name}`;
  $('#navChip').style.backgroundImage = `url("${doorImg(f)}")`;
  $('#fbName').textContent = `${f.series} ${f.name}`;
  $('#fbSwatch').style.backgroundImage = `url("${doorImg(f)}")`;

  $$('.door, .fb-door, .series-doors button').forEach(el => {
    el.setAttribute('aria-checked', String(el.dataset.finish === f.id));
  });

  // rooms hero follows the finish
  const rk = $('#roomImgKitchen');
  if (rk) { rk.srcset = kitchenSet(f); rk.sizes = '(max-width:1040px) 100vw, 34vw'; rk.src = kitchenSmall(f); }

  if (!first) {
    // Only the shop re-prices. Cart lines are pinned to the finish they were
    // added in, so changing the door style must not touch them.
    renderGrid();
    if (!$('#sheet').hidden && state.sheetSku) openSheet(state.sheetSku);
  }
}

function buildDoorStrip() {
  $('#doorStrip').innerHTML = D.finishes.map(f => `
    <button class="door" role="radio" aria-checked="false" data-finish="${f.id}">
      <img src="${doorImg(f)}" alt="${f.series} ${f.name} door" width="400" height="707" loading="lazy" decoding="async">
      <span>${f.series}<br>${f.name}</span>
    </button>`).join('');
}

function buildFinishBar() {
  $('#fbDoors').innerHTML = D.finishes.map(f => `
    <button class="fb-door" role="radio" aria-checked="false" data-finish="${f.id}"
            title="${f.series} ${f.name}" aria-label="${f.series} ${f.name}">
      <img src="${doorImg(f)}" alt="" loading="lazy">
    </button>`).join('');
}

function buildSeriesPair() {
  const series = ['Emerald', 'Trillion'];
  const copy = {
    Emerald: 'A flat centre panel with a square outer edge. Seven finishes, three of them stained solid wood where the grain still shows through.',
    Trillion: 'The same box with a slimmer rail and a deeper inner bevel, which throws a shadow line and reads a little more traditional. Two finishes.'
  };
  $('#seriesPair').innerHTML = series.map(s => {
    const fs = D.finishes.filter(f => f.series === s);
    const sample = D.cabinets.find(p => p.sku === 'B24');
    const price = sample ? priceOf(sample, fs[0]) : 0;
    return `<div class="series-card">
      <h3>${s}</h3>
      <p>${copy[s]} A 24″ base cabinet starts at ${money(price)}.</p>
      <div class="series-doors">
        ${fs.map(f => `
          <button role="radio" aria-checked="false" data-finish="${f.id}">
            <img src="${doorImg(f)}" alt="${f.series} ${f.name}" loading="lazy">
            <small>${f.name}</small>
          </button>`).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   Home sections
   ============================================================ */
/* The room links and the room cards must agree. Both read this, so a
   change to a group's `room` moves the filter and the count together. */
const groupsForRoom = room => D.groups.filter(g => g.room === room || g.room === 'both').map(g => g.id);
const countInRoom = room => {
  const ids = new Set(groupsForRoom(room));
  return ALL.filter(p => ids.has(p.group)).length;
};

function buildRooms() {
  const count = g => ALL.filter(p => p.group === g).length;
  $('#rooms').innerHTML = `
    <button class="room" data-go="shop" data-room="kitchen">
      <img id="roomImgKitchen" src="${kitchenSmall(state.finish)}"
           srcset="${kitchenSet(state.finish)}" sizes="(max-width:1040px) 100vw, 34vw"
           alt="A finished kitchen" width="1070" height="1400" loading="lazy" decoding="async">
      <span class="room-cap"><h3>Kitchen</h3><p>${countInRoom('kitchen')} items — base, wall, pantry and oven,
        plus the organisers and trim that go with them</p></span>
    </button>
    <button class="room" data-go="shop" data-room="bath">
      <img src="img/vanity-31.webp" alt="A finished vanity" width="1000" height="1400"
           loading="lazy" decoding="async">
      <span class="room-cap"><h3>Bath</h3><p>${countInRoom('bath')} items — ${count('vanity')} vanity units
        from 12″ to 48″, plus the organisers and trim that go with them</p></span>
    </button>
    <button class="room" data-go="shop" data-group="storage">
      <img src="img/org/org-44-0.webp" alt="A cookware roll-out fitted inside a base cabinet"
           width="880" height="815" loading="lazy" decoding="async">
      <span class="room-cap"><h3>Inside storage</h3><p>${count('storage')} pull-outs, trays and organisers</p></span>
    </button>`;
  $('#installFig').innerHTML =
    `<img src="img/kitchen-emerald-natural@sm.webp"
          srcset="img/kitchen-emerald-natural@sm.webp 900w, img/kitchen-emerald-natural.webp 1750w"
          sizes="(max-width:1040px) 100vw, 46vw"
          alt="An installed kitchen" width="1070" height="1400" loading="lazy" decoding="async">`;
}

function buildSpec() {
  const items = [
    ['5⁄8″ plywood box', 'Grade-A plywood throughout, with an I-beam support across the top of every base for stability.'],
    ['Solid wood frame', 'Mortise-and-tenon joints. Doors and drawer faces are solid wood when stained, premium HDF when painted.'],
    ['Dovetail drawers', 'Finger-jointed solid wood boxes with dovetail corners, on concealed under-mount glides.'],
    ['Soft close, everywhere', 'DTC six-way adjustable hinges and full-extension soft-close glides on every door and drawer.'],
    ['Finished to match inside', 'The interior and both side panels arrive pre-finished in your door style, so exposed ends need no extra panel.'],
    ['Denser than solid wood', 'Painted parts use premium HDF at roughly 800 kg/m³ against solid wood’s 700, which is why painted doors stay smooth instead of hairline-cracking.']
  ];
  $('#specGrid').innerHTML = items.map(([h, p]) =>
    `<div class="spec-item"><h3>${h}</h3><p>${p}</p></div>`).join('');
}

function buildServices() {
  $('#services').innerHTML = SERVICES.map(([name, desc]) =>
    `<div class="svc-card"><h3>${name}</h3><p>${desc}</p></div>`).join('');
}

function buildRates() {
  const rows = [
    ['base', 'per base cabinet'], ['wall', 'per wall cabinet'], ['tall', 'per tall or pantry unit'],
    ['vanity', 'per vanity unit'], ['storage', 'per pull-out or organiser'], ['trim', 'per filler, panel or moulding run']
  ];
  $('#rates').innerHTML =
    rows.map(([k, l]) => `<div class="rate"><b>${money(INSTALL[k])}</b><p>${l}</p></div>`).join('') +
    `<div class="rate"><b>${money(INSTALL.minimum)}</b><p>job minimum, whatever the count</p></div>
     <div class="rate"><b>Free</b><p>in-home measure before anything is charged</p></div>`;
}

function buildMods() {
  $('#mods').innerHTML = D.mods.map(m => `
    <div class="mod">
      <h4>${m.name}</h4>
      <p>${m.desc}</p>
      <div class="mod-foot">
        <span class="mod-price">${money(m.price)}</span>
        <button class="btn btn-line" data-addmod="${m.sku}">Add</button>
      </div>
    </div>`).join('');
}

/* ============================================================
   Filters
   ============================================================ */
function buildFilters() {
  $('#groupFilters').innerHTML = D.groups.map(g => {
    const n = ALL.filter(p => p.group === g.id).length;
    return `<button class="rail-item" aria-pressed="false" data-group="${g.id}">
      <span>${g.label}</span><i>${n}</i></button>`;
  }).join('');

  const widths = [...new Set(ALL.map(p => p.w).filter(Boolean))].sort((a, b) => a - b);
  $('#widthFilters').innerHTML = widths.map(w =>
    `<button class="wchip" aria-pressed="false" data-width="${w}">${w}″</button>`).join('');
}

function filtered() {
  let out = ALL.slice();
  if (state.groups.size) out = out.filter(p => state.groups.has(p.group));
  if (state.widths.size) out = out.filter(p => state.widths.has(p.w));
  if (state.q) {
    const q = state.q.toLowerCase();
    out = out.filter(p =>
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.cat || '').toLowerCase().includes(q));
  }
  const s = state.sort;
  if (s === 'asc') out.sort((a, b) => priceOf(a) - priceOf(b));
  else if (s === 'desc') out.sort((a, b) => priceOf(b) - priceOf(a));
  else if (s === 'w') out.sort((a, b) => (a.w || 999) - (b.w || 999));
  else {
    const order = D.groups.map(g => g.id);
    out.sort((a, b) =>
      order.indexOf(a.group) - order.indexOf(b.group) ||
      (a.cat || '').localeCompare(b.cat || '') ||
      (a.w || 0) - (b.w || 0));
  }
  return out;
}

/* ============================================================
   Grid
   ============================================================ */
function cardHTML(p) {
  // The count shown is this SKU *in the finish on screen*. The same cabinet
  // ordered in another door style is a separate line and does not count here.
  const key = keyFor(p);
  const qty = state.cart.get(key) || 0;
  const inOther = isFinished(p) ? otherFinishQty(p.sku, state.finish.id) : 0;
  const price = priceOf(p);
  const label = isFinished(p) ? `${p.sku} in ${state.finish.series} ${state.finish.name}` : p.sku;
  const control = qty
    ? `<span class="stepper" data-key="${key}">
         <button data-step="-1" aria-label="Remove one ${label}">−</button>
         <span>${qty}</span>
         <button data-step="1" aria-label="Add one ${label}">+</button>
       </span>`
    : `<button class="card-add" data-add="${p.sku}" aria-label="Add ${label} to your order">+</button>`;
  return `<div class="card">
    <button class="card-fig" data-open="${p.sku}" aria-label="View ${p.sku}">
      ${productImage(p)}
    </button>
    <p class="card-sku">${p.sku}</p>
    <p class="card-name">${p.name}</p>
    <p class="card-dims">${dimText(p)}</p>
    <div class="card-foot">
      <span class="card-price">${money(price)}${p.pMax ? '<small>to ' + money(p.pMax) + '</small>' : ''}</span>
      ${control}
    </div>
    ${inOther ? `<p class="card-other">${inOther} already in your order in
      ${inOther === 1 ? 'another finish' : 'other finishes'}</p>` : ''}
  </div>`;
}

function renderGrid() {
  const list = filtered();
  $('#resultCount').textContent =
    `${list.length} ${list.length === 1 ? 'item' : 'items'}, priced in ${state.finish.series} ${state.finish.name}`;
  $('#empty').hidden = list.length > 0;

  if (state.sort !== 'cat') {
    $('#grid').innerHTML = list.map(cardHTML).join('');
    return;
  }
  const labelOf = g => (D.groups.find(x => x.id === g) || {}).label || g;
  let html = '', lastGroup = null;
  for (const p of list) {
    if (p.group !== lastGroup) {
      const n = list.filter(x => x.group === p.group).length;
      html += `<div class="cat-head"><h3>${labelOf(p.group)}</h3><span>${n}</span></div>`;
      lastGroup = p.group;
    }
    html += cardHTML(p);
  }
  $('#grid').innerHTML = html;
}

/* ============================================================
   Product sheet
   ============================================================ */
function openSheet(sku) {
  const p = BY_SKU[sku];
  if (!p) return;
  state.sheetSku = sku;
  const other = D.finishes.find(f => f.tier !== state.finish.tier);
  const isOrg = p.group === 'storage' && p.cat === 'Organizer';

  const fits = isOrg ? [] : D.organizers.filter(o =>
    (o.fits || []).some(code => code.replace(/FD|-\d/g, '') === sku.replace(/FD|-\d/g, ''))).slice(0, 6);

  $('#sheetBody').innerHTML = `
    <div class="sheet-grid">
      <div class="sheet-fig">${productImage(p, { detail: true })}</div>
      <div class="sheet-info">
        <p class="sheet-sku">${p.sku}</p>
        <h2 id="sheetTitle">${p.name}</h2>
        <p class="sheet-sub">${state.finish.series} ${state.finish.name} — ${state.finish.material}</p>

        <table class="dimtable">
          ${p.w ? `<tr><th>Width</th><td>${p.w}″</td></tr>` : ''}
          ${p.h ? `<tr><th>Height</th><td>${trim(p.h)}″</td></tr>` : ''}
          ${p.d ? `<tr><th>Depth</th><td>${trim(p.d)}″</td></tr>` : ''}
          <tr><th>Box</th><td>${isOrg ? 'Hardware, fits the listed cabinets' : '5⁄8″ grade-A plywood'}</td></tr>
          <tr><th>Hardware</th><td>Six-way hinges, soft close</td></tr>
          ${p.shelf ? '<tr><th>Shelf</th><td>One adjustable shelf included</td></tr>' : ''}
        </table>

        ${isOrg ? `
          <div class="pricebox">
            <div class="pricerow on"><span>Price</span>
              <span>${money(priceOf(p))}${p.pMax ? ' – ' + money(p.pMax) : ''}</span></div>
            <div class="pricerow off"><span>Same in either series</span><span></span></div>
          </div>`
        : `
          <div class="pricebox">
            <div class="pricerow on">
              <span>${state.finish.series} ${state.finish.name} <em>selected</em></span>
              <span>${money(priceOf(p))}</span></div>
            <div class="pricerow off">
              <span>${other.series} ${other.name}</span>
              <span>${money(priceOf(p, other))}</span></div>
          </div>`}

        ${p.note ? `<p class="sheet-note">${p.note}</p>` : ''}

        <div class="sheet-actions">
          <button class="btn btn-ink" data-add="${p.sku}" data-toast="1">Add to order</button>
          <span class="card-price">${money(priceOf(p))}</span>
        </div>

        ${fits.length ? `
          <div class="fits">
            <p>Fits inside this cabinet</p>
            <div class="fits-row">
              ${fits.map(o => `
                <button class="fits-card" data-open="${o.sku}">
                  <img src="${o.img}" alt="${o.name}" loading="lazy">
                  <b>${o.name}</b><i>${money(priceOf(o))}</i>
                </button>`).join('')}
            </div>
          </div>` : ''}
      </div>
    </div>`;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; }

/* ============================================================
   Cart
   ============================================================ */
/* The cart key for a product added right now, in the finish on screen. */
function keyFor(p) {
  return cartKey(p.sku, isFinished(p) ? state.finish.id : null);
}

/* How many of this SKU are in the order in finishes other than `finishId`. */
function otherFinishQty(sku, finishId) {
  let n = 0;
  for (const [key, qty] of state.cart) {
    const k = parseKey(key);
    if (k.sku === sku && k.finishId && k.finishId !== finishId) n += qty;
  }
  return n;
}

/* Adding always uses the finish on screen. */
function addToCart(sku, n = 1) {
  const p = BY_SKU[sku] || MOD_BY_SKU[sku];
  if (!p) return;
  adjustLine(keyFor(p), n);
}

/* Stepping an existing line must keep that line's own finish, which is why
   it takes a key and never re-derives one from state. */
function adjustLine(key, n) {
  const next = (state.cart.get(key) || 0) + n;
  if (next <= 0) state.cart.delete(key); else state.cart.set(key, next);
  renderGrid();
  renderCart();
}

function cartLines() {
  return [...state.cart].map(([key, qty]) => {
    const { sku, finishId } = parseKey(key);
    const p = BY_SKU[sku] || MOD_BY_SKU[sku];
    const finish = finishId ? FINISH_BY_ID[finishId] : null;
    // Priced in the finish the line was added in, not the one on screen.
    // Finish-less lines cost the same in either series, so they resolve
    // against a fixed series rather than drifting with the shop.
    const unit = priceOf(p, finish || D.finishes[0]);
    const lineLabel = finish ? `${sku} in ${finish.series} ${finish.name}` : sku;
    return { key, p, sku, qty, finish, lineLabel, unit, total: unit * qty, isMod: !!MOD_BY_SKU[sku] };
  });
}

function installEstimate(lines) {
  let n = 0, sum = 0;
  for (const l of lines) {
    if (l.isMod) continue;
    const rate = INSTALL[l.p.group] ?? INSTALL.trim;
    sum += rate * l.qty;
    n += l.qty;
  }
  const labour = Math.max(sum, n ? INSTALL.minimum : 0);
  const haul = state.haul ? n * INSTALL.haulPerCabinet : 0;
  return { units: n, labour, haul, total: labour + haul, atMinimum: n > 0 && sum < INSTALL.minimum };
}

function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((a, l) => a + l.qty, 0);
  $('#cartCount').textContent = count;

  if (!lines.length) {
    $('#cartBody').innerHTML = `<div class="cart-empty">
      <b>Nothing in your order yet</b>
      Pick a door style, then add cabinets. Prices follow the finish you chose.</div>`;
    $('#cartFoot').innerHTML =
      `<button class="btn btn-ink btn-wide" data-go="shop" data-close-cart>Browse the catalogue</button>`;
    return;
  }

  const goods = lines.reduce((a, l) => a + l.total, 0);
  const est = installEstimate(lines);
  const delivery = goods >= DELIVERY.freeOver ? 0 : DELIVERY.flat;
  const grand = goods + delivery + (state.install ? est.total : 0);

  $('#cartBody').innerHTML =
    lines.map(l => `
      <div class="line">
        <span class="line-fig">${productImage(l.p, { decorative: true, finish: l.finish || state.finish })}</span>
        <span>
          <p class="line-sku">${l.sku}</p>
          <p class="line-name">${l.p.name}</p>
          <p class="line-fin">${l.finish
            ? l.finish.series + ' ' + l.finish.name
            : (l.isMod ? 'Shop modification' : 'Hardware — same in either series')}</p>
          <span class="stepper" data-key="${l.key}" style="margin-top:8px">
            <button data-step="-1" aria-label="Remove one ${l.lineLabel}">−</button>
            <span>${l.qty}</span>
            <button data-step="1" aria-label="Add one ${l.lineLabel}">+</button>
          </span>
        </span>
        <span class="line-right">
          <span class="line-price">${money(l.total)}</span>
          <button class="line-x" data-remove="${l.key}" aria-label="Remove ${l.lineLabel}">Remove</button>
        </span>
      </div>`).join('') +

    `<div class="addon">
      <div class="addon-top">
        <div>
          <h4>Installation</h4>
          <p>We set, scribe and adjust everything. Estimated from what is in your order.</p>
        </div>
        <button class="switch" id="installToggle" role="switch"
                aria-checked="${state.install}" aria-label="Add installation"></button>
      </div>
      ${state.install ? (est.units === 0 ? `
        <div class="addon-detail">
          <div class="pricerow"><span>Add cabinets and the estimate appears here. Modifications on their own
            are done in the shop, before delivery.</span></div>
        </div>` : `
        <div class="addon-detail">
          <div class="pricerow"><span>Labour, ${est.units} unit${est.units === 1 ? '' : 's'}</span>
            <b>${money(est.labour)}</b></div>
          ${est.atMinimum ? '<div class="pricerow"><span>Job minimum applied</span><span></span></div>' : ''}
          ${state.haul ? `<div class="pricerow"><span>Remove and haul the old cabinets</span>
            <b>${money(est.haul)}</b></div>` : ''}
          <label class="addon-sub">
            <input type="checkbox" id="haulToggle" ${state.haul ? 'checked' : ''}>
            Take the old cabinets away (${money(INSTALL.haulPerCabinet)} per cabinet)
          </label>
        </div>`) : ''}
    </div>`;

  $('#cartFoot').innerHTML = `
    <div class="totals">
      <div class="trow"><span>Cabinets and hardware</span><b>${money(goods)}</b></div>
      ${state.install && est.units ? `<div class="trow"><span>Installation estimate</span><b>${money(est.total)}</b></div>` : ''}
      <div class="trow"><span>Delivery</span><b>${delivery ? money(delivery) : 'Included'}</b></div>
      <div class="trow grand"><span>Total</span><b>${money(grand)}</b></div>
    </div>
    <button class="btn btn-ink btn-wide">${state.install && est.units ? 'Book a measure and reserve' : 'Continue to checkout'}</button>
    <p class="fineprint">${state.install && est.units
      ? 'Installation is an estimate. A free measure comes first, and the figure only becomes a quote once someone has seen the room.'
      : `Delivery is free over ${money(DELIVERY.freeOver)}. Add installation above if you want us to hang them.`}</p>`;
}

function openCart() { $('#drawer').hidden = false; document.body.style.overflow = 'hidden'; }
function closeCart() { $('#drawer').hidden = true; document.body.style.overflow = ''; }

/* ============================================================
   Views
   ============================================================ */
function go(view, opts = {}) {
  state.view = view;
  ['home', 'shop', 'services'].forEach(v => { $('#view-' + v).hidden = v !== view; });

  if (view === 'shop') {
    if (opts.room) {
      state.groups = new Set(groupsForRoom(opts.room));
    } else if (opts.group) {
      state.groups = new Set([opts.group]);
    }
    syncFilterUI();
    renderGrid();
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function syncFilterUI() {
  $$('[data-group]').forEach(b => {
    if (b.classList.contains('rail-item')) b.setAttribute('aria-pressed', String(state.groups.has(b.dataset.group)));
  });
  $$('[data-width]').forEach(b => b.setAttribute('aria-pressed', String(state.widths.has(+b.dataset.width))));
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2000);
}

/* ============================================================
   Events
   ============================================================ */
function wire() {
  document.addEventListener('click', e => {
    const t = e.target;

    const finishBtn = t.closest('[data-finish]');
    if (finishBtn) {
      const f = D.finishes.find(x => x.id === finishBtn.dataset.finish);
      if (f) applyFinish(f);
      return;
    }

    const goBtn = t.closest('[data-go]');
    if (goBtn) {
      e.preventDefault();
      if (goBtn.closest('#drawer')) closeCart();
      go(goBtn.dataset.go, { room: goBtn.dataset.room, group: goBtn.dataset.group });
      return;
    }

    const open = t.closest('[data-open]');
    if (open) { openSheet(open.dataset.open); return; }

    const add = t.closest('[data-add]');
    if (add) {
      const sku = add.dataset.add;
      addToCart(sku, 1);
      if (add.dataset.toast) {
        const p = BY_SKU[sku];
        toast(isFinished(p) ? `${sku} added in ${state.finish.series} ${state.finish.name}` : `${sku} added`);
        closeSheet();
      }
      return;
    }

    const addmod = t.closest('[data-addmod]');
    if (addmod) {
      const m = MOD_BY_SKU[addmod.dataset.addmod];
      addToCart(m.sku, 1);
      toast(`${m.name} added`);
      return;
    }

    // Steppers carry the full cart key, so a line keeps its own finish.
    const step = t.closest('[data-step]');
    if (step) { adjustLine(step.closest('[data-key]').dataset.key, +step.dataset.step); return; }

    const rm = t.closest('[data-remove]');
    if (rm) { state.cart.delete(rm.dataset.remove); renderGrid(); renderCart(); return; }

    const gf = t.closest('.rail-item[data-group]');
    if (gf) {
      const g = gf.dataset.group;
      state.groups.has(g) ? state.groups.delete(g) : state.groups.add(g);
      syncFilterUI(); renderGrid(); return;
    }

    const wf = t.closest('[data-width]');
    if (wf) {
      const w = +wf.dataset.width;
      state.widths.has(w) ? state.widths.delete(w) : state.widths.add(w);
      syncFilterUI(); renderGrid(); return;
    }

    if (t.closest('#clearFilters')) {
      state.groups.clear(); state.widths.clear(); state.q = '';
      $('#searchInput').value = ''; syncFilterUI(); renderGrid(); return;
    }
    if (t.closest('[data-search]')) {
      state.q = t.dataset.search; $('#searchInput').value = state.q; renderGrid(); return;
    }
    if (t.closest('#railToggle')) { $('#rail').classList.toggle('open'); return; }

    if (t.closest('#cartBtn')) { openCart(); return; }
    if (t.closest('[data-close-cart]')) { closeCart(); return; }
    if (t.closest('[data-close-sheet]')) { closeSheet(); return; }
    if (t.closest('#navFinish')) {
      go('home');
      setTimeout(() => $('#doorStrip').scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
      return;
    }
    if (t.closest('#installToggle')) { state.install = !state.install; renderCart(); return; }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'haulToggle') { state.haul = e.target.checked; renderCart(); }
    if (e.target.id === 'sortSel') { state.sort = e.target.value; renderGrid(); }
  });

  let qT;
  $('#searchInput').addEventListener('input', e => {
    clearTimeout(qT);
    qT = setTimeout(() => { state.q = e.target.value.trim(); renderGrid(); }, 140);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('#sheet').hidden) closeSheet();
      else if (!$('#drawer').hidden) closeCart();
    }
  });
}

boot();

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { ScrollScrub } from "@/components/scroll-scrub/scroll-scrub";
import { ConsultForm } from "@/components/site/consult-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { cart, useFinish } from "@/lib/cart";
import { FINISHES, ITEMS, doorImg, finishLabel, kitchenImg, kitchenSmall, type GroupId } from "@/lib/catalog";
import { DELIVERY, INSTALL, INSTALL_MINIMUM, SERVICES } from "@/lib/store-config";
import { scrollScrubScenes, scrollScrubTheme } from "@/scroll-scrub-scenes";

export const Route = createFileRoute("/")({
  component: Index,
});

function HeroActions() {
  return (
    <div className="mb-hero-actions">
      <Link to="/shop" className="cta-gild">
        Shop the collection <ArrowRight size={16} />
      </Link>
      <a href="#consult" className="cta-hairline">Book a design consult</a>
    </div>
  );
}

// Module constant: the scrub controller rebuilds if this identity changes.
const SCENES = scrollScrubScenes.map((s) => ({ ...s, actions: <HeroActions /> }));

const countIn = (g: GroupId) => ITEMS.filter((i) => i.group === g).length;

const TILES: { group: GroupId; cls: string; name: string; blurb: string; img: string }[] = [
  { group: "base", cls: "mb-tile--a", name: "Base cabinets", blurb: "Sink, drawer, corner and lazy susan bases that carry the counter.", img: "/catalog/products/emerald-white-base-double.webp" },
  { group: "wall", cls: "mb-tile--b", name: "Wall cabinets", blurb: "Uppers from 9 to 36 inches wide, corners and appliance garages.", img: "/catalog/products/emerald-dove-wall-double.webp" },
  { group: "tall", cls: "mb-tile--c", name: "Tall & pantry", blurb: "Pantries and oven towers.", img: "/catalog/products/emerald-gray-pantry.webp" },
  { group: "vanity", cls: "mb-tile--d", name: "Vanity", blurb: "Sink bases and drawer stacks for the bath.", img: "/catalog/products/emerald-blue-vanity.webp" },
  { group: "storage", cls: "mb-tile--e", name: "Inside storage", blurb: "Roll-outs, wine and organisers.", img: "/catalog/products/emerald-natural-drawer.webp" },
  { group: "trim", cls: "mb-tile--f", name: "Trim & panels", blurb: "Moulding, fillers, panels and glass doors to finish the run.", img: "/catalog/products/emerald-pebble-wall-single.webp" },
  { group: "mods", cls: "mb-tile--g", name: "Modifications", blurb: "Depth cuts, glass prep and shop work, priced per piece.", img: "/catalog/products/emerald-stone-base-single.webp" },
];

const STEPS = [
  ["Measure", "Send us your room or book a visit. We measure, photograph and note every wall, window and outlet."],
  ["Design", "We lay out the cabinets, pick the finish with you and send a priced plan you can edit online."],
  ["Build", "Your order is built and finished to the plan. Track every stage from your order page."],
  ["Install", "Our own crew delivers, sets, levels and trims out the room, then takes the packaging away."],
];

function FinishStudio() {
  const active = useFinish();
  const [shown, setShown] = useState(active.id);
  const current = FINISHES.find((f) => f.id === shown) ?? active;

  return (
    <section className="mb-studio" id="finishes">
      <div className="mb-wrap mb-studio__grid">
        <div>
          <p className="mb-eyebrow">The finish studio</p>
          <h2 className="mb-h2">Nine doors. <em>One</em> is yours.</h2>
          <p className="mb-lede" style={{ marginTop: "1.2rem" }}>
            Two door profiles, Emerald and Trillion, in painted and stained finishes. Pick one and the whole store re-prices to match.
          </p>
          <div className="mb-swatches" role="group" aria-label="Door finishes">
            {FINISHES.map((f) => (
              <button
                key={f.id}
                type="button"
                className="mb-swatch"
                aria-pressed={f.id === current.id}
                onClick={() => {
                  setShown(f.id);
                  cart.setFinish(f.id);
                }}
              >
                <span className="mb-swatch__chip">
                  <img src={doorImg(f)} alt="" width={120} height={160} loading="lazy" />
                </span>
                <span className="mb-swatch__name">{f.series === "Trillion" ? `T. ${f.name}` : f.name}</span>
              </button>
            ))}
          </div>
          <p style={{ marginTop: "2rem" }}>
            <Link to="/shop" className="cta-ring">
              <span className="cta-ring__dot"><ArrowUpRight size={16} /></span>
              Shop in {finishLabel(current)}
            </Link>
          </p>
        </div>
        <div className="mb-studio__frame">
          {FINISHES.map((f) => (
            <img
              key={f.id}
              src={kitchenSmall(f)}
              srcSet={`${kitchenSmall(f)} 900w, ${kitchenImg(f)} 1750w`}
              sizes="(max-width: 900px) 100vw, 58vw"
              alt={f.id === current.id ? `A kitchen in ${finishLabel(f)}` : ""}
              data-on={f.id === current.id ? "true" : "false"}
              loading={f.id === current.id ? "eager" : "lazy"}
            />
          ))}
          <div className="mb-studio__tag">
            <strong className="mb-serif" style={{ fontSize: "1.35rem" }}>{finishLabel(current)}</strong>
            <p>{current.material}. {current.blurb}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Index() {
  return (
    <>
      <SiteHeader overlay />
      <main>
        <ScrollScrub className="mb-journey" scenes={SCENES} theme={scrollScrubTheme} />
        <div id="after-journey" />

        <FinishStudio />

        <section className="mb-collections" aria-labelledby="collections-title">
          <div className="mb-wrap">
            <div className="mb-collections__head">
              <div>
                <p className="mb-eyebrow">The collection</p>
                <h2 className="mb-h2" id="collections-title">Every box, panel and <em>pull</em>.</h2>
              </div>
              <Link to="/shop" className="cta-hairline">See all {ITEMS.length} pieces</Link>
            </div>
            <div className="mb-bento">
              {TILES.map((t) => (
                <Link key={t.group} to="/shop" search={{ group: t.group }} className={`mb-tile ${t.cls}`}>
                  <span className="mb-tile__count">{countIn(t.group)} pieces</span>
                  <div>
                    <div className="mb-tile__name">{t.name}</div>
                    <p className="mb-tile__blurb">{t.blurb}</p>
                  </div>
                  <img src={t.img} alt="" loading="lazy" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-process" id="process">
          <div className="mb-wrap">
            <p className="mb-eyebrow">How it works</p>
            <h2 className="mb-h2">From an empty wall to a <em>finished</em> room.</h2>
            <ol className="mb-steps">
              {STEPS.map(([title, text]) => (
                <li key={title} className="mb-step">
                  <h3 className="mb-h3">{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            <div className="mb-rates" aria-label="Installation rates">
              {(
                [
                  ["base", "per base cabinet"],
                  ["wall", "per wall cabinet"],
                  ["tall", "per tall cabinet"],
                  ["vanity", "per vanity"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="mb-rate">
                  <b className="mb-num">${INSTALL[k]}</b>
                  <span>{label} installed</span>
                </div>
              ))}
              <div className="mb-rate">
                <b className="mb-num">${INSTALL_MINIMUM}</b>
                <span>installation minimum</span>
              </div>
              <div className="mb-rate">
                <b className="mb-num">Free</b>
                <span>delivery over ${DELIVERY.freeOver.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-services" id="services">
          <div className="mb-wrap mb-services__grid">
            <div>
              <p className="mb-eyebrow">Beyond the box</p>
              <h2 className="mb-h2">One contact for the <em>whole</em> job.</h2>
              <p className="mb-lede" style={{ marginTop: "1.2rem" }}>
                We sell the cabinets, and we can run everything around them: tops, tile, trades and permits.
              </p>
            </div>
            <ul className="mb-index">
              {SERVICES.map(([name, text], i) => (
                <li key={name}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <h3>{name}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mb-consult" id="consult">
          <div className="mb-wrap mb-consult__grid">
            <div>
              <p className="mb-eyebrow">Design consultation</p>
              <h2 className="mb-h2" style={{ color: "var(--mb-cream)" }}>
                Bring us the room. <em>We will bring the plan.</em>
              </h2>
              <p className="mb-lede" style={{ marginTop: "1.2rem" }}>
                A designer reviews your space, recommends a layout and finish, and sends a priced cabinet list you can order from in one click.
              </p>
            </div>
            <ConsultForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

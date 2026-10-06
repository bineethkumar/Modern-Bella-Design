import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/site/product-card";
import { ProductSheet } from "@/components/site/product-sheet";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { cart, useFinish } from "@/lib/cart";
import { FINISHES, GROUPS, ITEMS, doorImg, finishLabel, type GroupId, type Item } from "@/lib/catalog";

type ShopSearch = { group?: GroupId; q?: string; sort?: "featured" | "price-asc" | "price-desc" | "width" };

const GROUP_IDS = new Set<string>(GROUPS.map((g) => g.id));
const SORTS = new Set(["featured", "price-asc", "price-desc", "width"]);

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    group: typeof s.group === "string" && GROUP_IDS.has(s.group) ? (s.group as GroupId) : undefined,
    q: typeof s.q === "string" && s.q ? s.q.slice(0, 60) : undefined,
    sort: typeof s.sort === "string" && SORTS.has(s.sort) ? (s.sort as ShopSearch["sort"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop cabinetry | Modern Bella Design" },
      { name: "description", content: "Base, wall, tall, vanity and storage cabinets in nine door finishes, priced online." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { group, q, sort = "featured" } = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const finish = useFinish();
  const [open, setOpen] = useState<Item | null>(null);
  const [query, setQuery] = useState(q ?? "");

  const items = useMemo(() => {
    const needle = (q ?? "").trim().toLowerCase();
    let list = ITEMS.filter((i) => (!group || i.group === group) && (!needle ||
      `${i.sku} ${i.name} ${i.cat} ${i.note ?? ""} ${i.desc ?? ""}`.toLowerCase().includes(needle)));
    const price = (i: Item) => i.prices[i.finished ? finish.tier : "emerald"];
    if (sort === "price-asc") list = [...list].sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => price(b) - price(a));
    if (sort === "width") list = [...list].sort((a, b) => (a.w ?? 999) - (b.w ?? 999));
    return list;
  }, [group, q, sort, finish.tier]);

  const activeGroup = GROUPS.find((g) => g.id === group);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mb-pagehead">
          <div className="mb-wrap">
            <p className="mb-eyebrow mb-rise">The collection</p>
            <h1 className="mb-display mb-rise-2">{activeGroup ? activeGroup.label : <>Shop the <em>collection</em></>}</h1>
            <p className="mb-lede mb-rise-3" style={{ marginTop: "1rem" }}>
              {activeGroup?.blurb ?? "Every cabinet is priced in the finish you choose. Change the door and the whole catalogue follows."}
            </p>
          </div>
        </section>

        <div className="mb-wrap mb-shop">
          <aside className="mb-filters" aria-label="Filters">
            <div>
              <h4>Category</h4>
              <ul className="mb-filter-list">
                <li>
                  <button type="button" aria-pressed={!group} onClick={() => navigate({ search: (s) => ({ ...s, group: undefined }) })}>
                    <span>Everything</span><span>{ITEMS.length}</span>
                  </button>
                </li>
                {GROUPS.map((g) => (
                  <li key={g.id}>
                    <button type="button" aria-pressed={group === g.id} onClick={() => navigate({ search: (s) => ({ ...s, group: g.id }) })}>
                      <span>{g.label}</span><span>{ITEMS.filter((i) => i.group === g.id).length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Door finish · {finishLabel(finish)}</h4>
              <div className="mb-finish-row" role="group" aria-label="Door finish">
                {FINISHES.map((f) => (
                  <button key={f.id} type="button" aria-pressed={f.id === finish.id} onClick={() => cart.setFinish(f.id)} title={finishLabel(f)}>
                    <img src={doorImg(f)} alt={finishLabel(f)} loading="lazy" />
                  </button>
                ))}
              </div>
              <p className="mb-note" style={{ marginTop: "0.8rem" }}>
                {finish.tier === "trillion" ? "Trillion profile: slimmer rail, deeper bevel." : "Emerald profile: our classic shaker."}
              </p>
            </div>
          </aside>

          <div>
            <div className="mb-shopbar">
              <form
                className="mb-search"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate({ search: (s) => ({ ...s, q: query.trim() || undefined }) });
                }}
                style={{ position: "relative" }}
              >
                <input
                  className="mb-input"
                  type="search"
                  placeholder="Search by SKU or name, e.g. B24 or pantry"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search the catalogue"
                  style={{ paddingRight: "2.6rem" }}
                />
                <Search size={16} style={{ position: "absolute", right: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--mb-stone)" }} />
              </form>
              <label className="mb-field" style={{ gridAutoFlow: "column", alignItems: "center", gap: "0.6rem" }}>
                <span>Sort</span>
                <select value={sort} onChange={(e) => navigate({ search: (s) => ({ ...s, sort: e.target.value as ShopSearch["sort"] }) })}>
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price, low to high</option>
                  <option value="price-desc">Price, high to low</option>
                  <option value="width">Width</option>
                </select>
              </label>
            </div>
            <p className="mb-note" style={{ margin: "0 0 1rem" }} aria-live="polite">{items.length} pieces</p>
            <div className="mb-grid">
              {items.length ? (
                items.map((item) => <ProductCard key={item.sku} item={item} finish={finish} onOpen={setOpen} />)
              ) : (
                <div className="mb-empty">Nothing matches that search. Try a SKU like W3030 or a word like drawer.</div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
      <ProductSheet item={open} finish={finish} onClose={() => setOpen(null)} />
    </>
  );
}

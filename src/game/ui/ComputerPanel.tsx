import { Check, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  DECOR,
  FIXTURE_CAPACITY,
  FLOORS,
  LEVEL_ACCESSORIES,
  LEVEL_DECOR,
  PRODUCTS,
  WALLPAPERS,
  type StyleOption,
} from "../sim/catalog";
import { ORDER_SIZES, fixtureStock, levelInfo } from "../sim/economy";
import { useGame } from "../store";
import { ProductIcon } from "./ProductIcon";
import { Sheet } from "./Sheet";

type Tab = "women" | "men" | "accessories" | "decor" | "style";
const TABS: { id: Tab; label: string; level: number }[] = [
  { id: "women", label: "Women", level: 1 },
  { id: "men", label: "Men", level: 1 },
  { id: "accessories", label: "Accessories", level: LEVEL_ACCESSORIES },
  { id: "decor", label: "Decor", level: LEVEL_DECOR },
  { id: "style", label: "Walls & Floors", level: 1 },
];

function LockedNote({ level }: { level: number }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted px-6 py-10 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" />
      <div className="font-display text-xl font-bold">Unlocks at level {level}</div>
      <p className="max-w-xs text-sm text-muted-foreground">Check out customers to earn XP and level up your boutique.</p>
    </div>
  );
}

function ProductGrid({ filter }: { filter: (p: (typeof PRODUCTS)[number]) => boolean }) {
  const stock = useGame((s) => s.stock);
  const cash = useGame((s) => s.cash);
  const order = useGame((s) => s.order);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PRODUCTS.filter(filter).map((p) => {
        const onFixture = fixtureStock(stock, p.fixture);
        const own = stock[p.id] ?? 0;
        const space = FIXTURE_CAPACITY - onFixture;
        return (
          <div key={p.id} className="flex gap-3 rounded-2xl border border-border bg-background p-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground/60">
              <ProductIcon shape={p.shape} color={p.color} className="h-12 w-12" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="truncate font-bold">{p.name}</div>
                <div className="shrink-0 text-xs font-bold text-muted-foreground">{own} in store</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Cost <b className="text-foreground">${p.cost}</b> · Sells for <b className="text-primary">${p.price}</b>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" title={`Display ${onFixture}/${FIXTURE_CAPACITY}`}>
                <div className="h-full rounded-full bg-accent-foreground/70" style={{ width: `${(onFixture / FIXTURE_CAPACITY) * 100}%` }} />
              </div>
              <div className="mt-2 flex gap-2">
                {ORDER_SIZES.map((q) => (
                  <button
                    key={q}
                    disabled={q > space || q * p.cost > cash}
                    onClick={() => order(p.id, q)}
                    className="btn-game btn-soft h-9 flex-1 px-2 text-xs"
                  >
                    +{q} · ${q * p.cost}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function swatchBg(o: StyleOption) {
  const [a, b = a] = o.colors;
  switch (o.pattern) {
    case "stripes":
    case "planks":
    case "herringbone":
      return `repeating-linear-gradient(90deg, ${a} 0 8px, ${b} 8px 16px)`;
    case "dots":
      return `radial-gradient(${b} 3px, ${a} 3.5px) 0 0/12px 12px`;
    case "checker":
    case "tiles":
      return `conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0) 0 0/20px 20px`;
    case "trellis":
      return `repeating-linear-gradient(45deg, ${a} 0 8px, ${b} 8px 10px)`;
    case "terrazzo":
      return `radial-gradient(${o.colors[1]} 2px, transparent 2.5px) 0 0/9px 9px, radial-gradient(${o.colors[2]} 2px, transparent 2.5px) 4px 5px/11px 11px, ${a}`;
    default:
      return a;
  }
}

function StyleGrid({ options }: { options: StyleOption[] }) {
  const owned = useGame((s) => s.ownedStyles);
  const wall = useGame((s) => s.wallpaper);
  const floor = useGame((s) => s.floor);
  const cash = useGame((s) => s.cash);
  const buy = useGame((s) => s.buyStyle);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((o) => {
        const inUse = (o.surface === "wall" ? wall : floor) === o.id;
        const has = owned.includes(o.id);
        return (
          <button
            key={o.id}
            disabled={inUse || (!has && cash < o.cost)}
            onClick={() => buy(o.id)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background text-left transition-transform active:scale-[0.98] disabled:cursor-default"
          >
            <div className="h-16 w-full" style={{ background: swatchBg(o) }} />
            <div className="p-2.5">
              <div className="text-sm font-bold">{o.name}</div>
              <div className="text-xs font-bold text-muted-foreground">
                {inUse ? (
                  <span className="inline-flex items-center gap-1 text-accent-foreground">
                    <Check className="h-3 w-3" /> In use
                  </span>
                ) : has ? (
                  "Owned · tap to apply"
                ) : (
                  <span className="text-primary">${o.cost}</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DecorGrid() {
  const owned = useGame((s) => s.decorOwned);
  const cash = useGame((s) => s.cash);
  const buy = useGame((s) => s.buyDecor);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DECOR.map((d) => {
        const has = owned.includes(d.id);
        return (
          <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.description}</div>
            </div>
            <button disabled={has || cash < d.cost} onClick={() => buy(d.id)} className="btn-game btn-primary h-10 shrink-0 px-4 text-sm">
              {has ? "Owned" : `$${d.cost}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ComputerPanel() {
  const close = useGame((s) => s.closePanel);
  const cash = useGame((s) => s.cash);
  const level = useGame((s) => levelInfo(s.xp).level);
  const [tab, setTab] = useState<Tab>("women");
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const locked = level < current.level;

  return (
    <Sheet
      title="Bloom Supply Co."
      subtitle={
        <span>
          Wholesale orders go straight onto your racks · Balance <b className="text-foreground">${cash.toLocaleString()}</b>
        </span>
      }
      onClose={close}
    >
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button key={t.id} data-selected={tab === t.id} onClick={() => setTab(t.id)} className="chip flex shrink-0 items-center gap-1">
            {level < t.level && <Lock className="h-3 w-3" />}
            {t.label}
          </button>
        ))}
      </div>
      {locked ? (
        <LockedNote level={current.level} />
      ) : tab === "women" ? (
        <ProductGrid filter={(p) => p.gender === "women" && p.unlockLevel === 1} />
      ) : tab === "men" ? (
        <ProductGrid filter={(p) => p.gender === "men" && p.unlockLevel === 1} />
      ) : tab === "accessories" ? (
        <ProductGrid filter={(p) => p.unlockLevel === LEVEL_ACCESSORIES} />
      ) : tab === "decor" ? (
        <DecorGrid />
      ) : (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Wallpaper</h3>
            <StyleGrid options={WALLPAPERS} />
          </section>
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Floor tiles</h3>
            <StyleGrid options={FLOORS} />
          </section>
        </div>
      )}
    </Sheet>
  );
}

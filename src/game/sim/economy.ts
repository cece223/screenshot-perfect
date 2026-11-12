import {
  DECOR,
  DEFAULT_FLOOR,
  DEFAULT_WALL,
  FIXTURE_CAPACITY,
  LEVEL_ACCESSORIES,
  LEVEL_DECOR,
  productById,
  productsForFixture,
  type FixtureId,
} from "./catalog";

export const STARTING_CASH = 700;
export const ORDER_SIZES = [5, 10] as const;

export type Stock = Record<string, number>;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 40 + (level - 1) * 20;
}

export function levelInfo(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rem = Math.max(0, xp);
  while (rem >= xpToNext(level)) {
    rem -= xpToNext(level);
    level++;
  }
  return { level, into: rem, needed: xpToNext(level) };
}

/** Total XP at which `level` is reached. */
export function totalXpForLevel(level: number): number {
  let t = 0;
  for (let l = 1; l < level; l++) t += xpToNext(l);
  return t;
}

export function checkoutReward(productIds: string[]): { cash: number; xp: number } {
  const cash = productIds.reduce((s, id) => s + (productById(id)?.price ?? 0), 0);
  const xp = productIds.length === 0 ? 0 : 15 + 3 * productIds.length;
  return { cash, xp };
}

export function fixtureStock(stock: Stock, fixture: FixtureId): number {
  return productsForFixture(fixture).reduce((s, p) => s + (stock[p.id] ?? 0), 0);
}

export type OrderResult = { ok: true; cash: number; stock: Stock } | { ok: false; reason: string };

export function placeOrder(
  state: { cash: number; level: number; stock: Stock },
  productId: string,
  qty: number,
): OrderResult {
  const p = productById(productId);
  if (!p) return { ok: false, reason: "Unknown product" };
  if (state.level < p.unlockLevel) return { ok: false, reason: `Unlocks at level ${p.unlockLevel}` };
  const space = FIXTURE_CAPACITY - fixtureStock(state.stock, p.fixture);
  if (space <= 0) return { ok: false, reason: "That display is full" };
  if (qty > space) return { ok: false, reason: `Only room for ${space} more` };
  const cost = p.cost * qty;
  if (cost > state.cash) return { ok: false, reason: "Not enough cash" };
  return {
    ok: true,
    cash: state.cash - cost,
    stock: { ...state.stock, [productId]: (state.stock[productId] ?? 0) + qty },
  };
}

/** Remove one random in-stock item from a fixture. */
export function takeFromFixture(
  stock: Stock,
  fixture: FixtureId,
  rand: () => number,
): { stock: Stock; productId: string } | null {
  const avail = productsForFixture(fixture).filter((p) => (stock[p.id] ?? 0) > 0);
  if (avail.length === 0) return null;
  const p = avail[Math.floor(rand() * avail.length) % avail.length];
  return { stock: { ...stock, [p.id]: stock[p.id] - 1 }, productId: p.id };
}

export function restoreItems(stock: Stock, ids: string[]): Stock {
  const next = { ...stock };
  for (const id of ids) next[id] = (next[id] ?? 0) + 1;
  return next;
}

export function unlockMessages(oldLevel: number, newLevel: number): string[] {
  const out: string[] = [];
  if (oldLevel < LEVEL_ACCESSORIES && newLevel >= LEVEL_ACCESSORIES)
    out.push("Accessories unlocked! Order necklaces, earrings, scarves, purses, watches and sunglasses for your display cases.");
  if (oldLevel < LEVEL_DECOR && newLevel >= LEVEL_DECOR)
    out.push("Store decor unlocked! Buy wall art, indoor plants, rugs and ambient lighting.");
  return out;
}

/** Decor and a fresh look make the store more inviting: more frequent customers. */
export function storeAppeal(decorOwned: string[], wall: string, floor: string): number {
  const decor = decorOwned.filter((d) => DECOR.some((x) => x.id === d)).length;
  return decor + (wall !== DEFAULT_WALL ? 1 : 0) + (floor !== DEFAULT_FLOOR ? 1 : 0);
}

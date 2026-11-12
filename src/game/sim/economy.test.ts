import { describe, expect, it } from "vitest";
import { FIXTURE_CAPACITY, LEVEL_ACCESSORIES, LEVEL_DECOR, PRODUCTS } from "./catalog";
import { STARTING_CASH, checkoutReward, levelInfo, placeOrder, totalXpForLevel, unlockMessages } from "./economy";

describe("economy rules", () => {
  it("the player starts with $700", () => {
    expect(STARTING_CASH).toBe(700);
  });

  it("starting inventory has the requested women's and men's basics", () => {
    const names = (g: string) => PRODUCTS.filter((p) => p.gender === g && p.unlockLevel === 1).map((p) => p.name);
    expect(names("women")).toEqual(["Basic T-Shirt", "Blouse", "Jeans", "Skirt"]);
    expect(names("men")).toEqual(["Basic T-Shirt", "Button-Down Shirt", "Jeans", "Shorts"]);
  });

  it("accessories unlock at level 5", () => {
    expect(LEVEL_ACCESSORIES).toBe(5);
    const acc = PRODUCTS.filter((p) => p.unlockLevel === 5).map((p) => p.name).sort();
    expect(acc).toEqual(["Earrings", "Necklace", "Purse", "Scarf", "Sunglasses", "Watch"]);
    const blocked = placeOrder({ cash: 1000, level: 4, stock: {} }, "w-necklace", 5);
    expect(blocked.ok).toBe(false);
    expect(placeOrder({ cash: 1000, level: 5, stock: {} }, "w-necklace", 5).ok).toBe(true);
  });

  it("decor unlocks at level 10 and both unlocks announce themselves", () => {
    expect(LEVEL_DECOR).toBe(10);
    expect(unlockMessages(4, 5)).toHaveLength(1);
    expect(unlockMessages(9, 10)).toHaveLength(1);
    expect(unlockMessages(5, 6)).toHaveLength(0);
  });

  it("ordering spends cash and refuses when broke or the display is full", () => {
    const ok = placeOrder({ cash: 700, level: 1, stock: {} }, "w-tee", 5);
    expect(ok).toEqual({ ok: true, cash: 660, stock: { "w-tee": 5 } });
    expect(placeOrder({ cash: 30, level: 1, stock: {} }, "w-tee", 5).ok).toBe(false);
    expect(placeOrder({ cash: 9999, level: 1, stock: { "w-tee": FIXTURE_CAPACITY } }, "w-blouse", 5).ok).toBe(false);
  });

  it("checking out pays the retail price and awards XP", () => {
    expect(checkoutReward(["w-jeans", "w-tee"])).toEqual({ cash: 60, xp: 21 });
    expect(checkoutReward([])).toEqual({ cash: 0, xp: 0 });
  });

  it("XP converts to levels", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(totalXpForLevel(5)).level).toBe(5);
    expect(levelInfo(totalXpForLevel(5) - 1).level).toBe(4);
  });
});

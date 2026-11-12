import { describe, expect, it } from "vitest";
import type { FixtureId } from "./catalog";
import { CustomerSim, MAX_QUEUE, type StockPort } from "./customers";
import { fixtureStock, restoreItems, takeFromFixture, type Stock } from "./economy";

function port(initial: Stock) {
  const box = { stock: { ...initial } };
  const p: StockPort = {
    available: (f: FixtureId) => fixtureStock(box.stock, f),
    take: (f, rand) => {
      const r = takeFromFixture(box.stock, f, rand);
      if (!r) return null;
      box.stock = r.stock;
      return r.productId;
    },
    restore: (ids) => (box.stock = restoreItems(box.stock, ids)),
  };
  return { box, p };
}

const DT = 1 / 30;

describe("customer AI", () => {
  it("shoppers pick stocked items, line up, and pay at checkout", () => {
    const sim = new CustomerSim(7);
    const { p } = port({ "w-tee": 20, "w-jeans": 20, "m-tee": 20, "m-jeans": 20 });
    let sales = 0;
    for (let t = 0; t < 240; t += DT) {
      sim.step(DT, { stock: p, level: 1, appeal: 0 });
      expect(sim.queue.length).toBeLessThanOrEqual(MAX_QUEUE);
      if (sim.checkout()) sales++;
    }
    expect(sales).toBeGreaterThan(3);
  });

  it("with empty racks nobody queues and everyone eventually leaves", () => {
    const sim = new CustomerSim(3);
    const { p } = port({});
    let left = 0;
    for (let t = 0; t < 120; t += DT) {
      sim.step(DT, { stock: p, level: 1, appeal: 0 });
      expect(sim.queue.length).toBe(0);
      left += sim.drainEvents().filter((e) => e.type === "leftEmpty").length;
    }
    expect(left).toBeGreaterThan(0);
  });

  it("an ignored queue gives up and returns items to the racks", () => {
    const sim = new CustomerSim(11);
    const { box, p } = port({ "w-tee": 10, "m-tee": 10, "w-jeans": 10, "m-jeans": 10 });
    for (let t = 0; t < 400; t += DT) sim.step(DT, { stock: p, level: 1, appeal: 0 });
    const held = sim.customers.reduce((s, c) => s + c.items.length, 0);
    const shelf = Object.values(box.stock).reduce((a, b) => a + b, 0);
    expect(shelf + held).toBe(40); // nothing lost without a sale
  });
});

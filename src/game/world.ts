import { FIXTURE_CAPACITY, FIXTURES, PRODUCTS, type FixtureId } from "./sim/catalog";
import { CustomerSim, type StockPort } from "./sim/customers";
import { fixtureStock, levelInfo, restoreItems, storeAppeal, takeFromFixture } from "./sim/economy";
import { FIXTURE_LAYOUT, INTERACTABLES, PLAYER_START, interactableAt, nearestRegister, obstaclesFor, registerSpot, type InteractId, type Vec2 } from "./sim/layout";
import { CASHIER_SECONDS, staffAssignments, stepCashiers } from "./sim/staff";
import { findPlayerPath } from "./sim/pathfind";
import type { Ray, TapTarget } from "./sim/taps";
import { useGame } from "./store";
import { sfx } from "./audio";

/** Per-frame game state that lives outside React. Created lazily on the client. */
export interface World {
  sim: CustomerSim;
  player: {
    x: number;
    z: number;
    heading: number;
    vx: number;
    vz: number;
    speed: number;
    /** Tap-to-walk waypoints; empty when the player is steering by hand. */
    route: Vec2[];
    /** What to do on arrival. */
    then: InteractId | null;
    stuck: number;
  };
  cam: { yaw: number; dist: number };
  sceneReady: boolean;
  /** Seconds each cashier has spent on the shopper in front of them. */
  cashierTimers: number[];
  /** Set by the scene: screen NDC → world ray from the current camera. */
  rayAt: ((ndcX: number, ndcY: number) => Ray) | null;
}

let world: World | null = null;

export function getWorld(): World {
  if (!world) {
    world = {
      sim: new CustomerSim(Math.floor(Math.random() * 1e9)),
      player: { x: PLAYER_START.x, z: PLAYER_START.z, heading: Math.PI, vx: 0, vz: 0, speed: 0, route: [], then: null, stuck: 0 },
      cam: { yaw: 0, dist: 8 },
      sceneReady: false,
      cashierTimers: [],
      rayAt: null,
    };
  }
  return world;
}

const stockPort: StockPort = {
  available: (f) => fixtureStock(useGame.getState().stock, f),
  take: (f, rand) => {
    const res = takeFromFixture(useGame.getState().stock, f, rand);
    if (!res) return null;
    useGame.setState({ stock: res.stock });
    return res.productId;
  },
  restore: (ids) => {
    if (ids.length) useGame.setState({ stock: restoreItems(useGame.getState().stock, ids) });
  },
};

/** Advance the shop simulation and mirror the bits the UI needs into the store. */
export function advanceSim(dt: number) {
  const w = getWorld();
  const g = useGame.getState();
  w.sim.step(dt, {
    stock: stockPort,
    level: levelInfo(g.xp).level,
    appeal: storeAppeal(g.decorOwned, g.wallpaper, g.floor),
    registers: g.registers,
  });
  // hired cashiers ring up their own lines
  const assign = staffAssignments(g.registers, g.staff.length);
  const done = stepCashiers(
    w.cashierTimers,
    dt,
    assign.map((k) => k >= 0),
    (reg) => !!w.sim.frontReady(reg),
  );
  for (const reg of done) {
    const res = w.sim.checkout(reg);
    if (res) useGame.getState().recordSale(res.items, g.staff[assign[reg]!]?.name);
  }
  let rosterChanged = false;
  for (const e of w.sim.drainEvents()) {
    if (e.type === "spawn") {
      rosterChanged = true;
      sfx.door();
    } else if (e.type === "despawn") rosterChanged = true;
    else if (e.type === "leftAngry") g.toast("A customer got tired of waiting and left", "warn");
    else if (e.type === "leftEmpty") g.toast("A customer left empty-handed. Restock!", "warn");
  }
  const queueLength = w.sim.queueTotal();
  let readyMask = 0;
  for (let r = 0; r < g.registers; r++) if (w.sim.frontReady(r)) readyMask |= 1 << r;
  const frontReady = readyMask !== 0;
  const patch: { customerIds?: number[]; queueLength?: number; frontReady?: boolean; readyMask?: number } = {};
  if (rosterChanged) patch.customerIds = w.sim.customers.map((c) => c.id);
  if (queueLength !== g.queueLength) patch.queueLength = queueLength;
  if (frontReady !== g.frontReady) patch.frontReady = frontReady;
  if (readyMask !== g.readyMask) patch.readyMask = readyMask;
  if (Object.keys(patch).length) useGame.setState(patch);
}

/** Cashier progress (0–1) at a register, for the scene. */
export function cashierProgress(reg: number): number {
  return Math.min(1, (getWorld().cashierTimers[reg] ?? 0) / CASHIER_SECONDS);
}

export function checkoutFront(reg = 0): boolean {
  const w = getWorld();
  const res = w.sim.checkout(reg);
  w.cashierTimers[reg] = 0;
  if (!res) return false;
  useGame.getState().recordSale(res.items);
  return true;
}

export function resetWorld() {
  const rayAt = world?.rayAt ?? null;
  world = null;
  const w = getWorld();
  w.rayAt = rayAt;
  w.player.heading = 0; // face the shop entrance so the portrait camera sees the store behind you
  useGame.setState({ customerIds: [], queueLength: 0, frontReady: false, readyMask: 0, prompt: null, promptReg: null });
}

// ---------------------------------------------------------------- interacting

export function interact(id: InteractId) {
  const g = useGame.getState();
  if (id === "register") {
    const reg = nearestRegister(getWorld().player, g.registers) ?? 0;
    if (!checkoutFront(reg)) {
      sfx.click();
      const line = getWorld().sim.queues[reg]?.length ?? 0;
      g.toast(line ? "Your customer is still walking to the counter" : g.registers > 1 ? `No one in line at register ${reg + 1}` : "No customers in line yet");
    }
  } else if (id === "computer") {
    sfx.click();
    g.openPanel("computer");
  } else if (id === "mirror") {
    sfx.click();
    g.openPanel("customize");
  }
}

// ---------------------------------------------------------------- tap to walk / use

export function cancelWalk() {
  const p = getWorld().player;
  p.route = [];
  p.then = null;
  p.stuck = 0;
}

export function walkTo(point: Vec2, then: InteractId | null = null): boolean {
  const p = getWorld().player;
  const route = findPlayerPath(p, point, obstaclesFor(useGame.getState().registers));
  p.route = route;
  p.then = route.length ? then : null;
  p.stuck = 0;
  return route.length > 0;
}

/** Called by the stepper when the route ends (or the player gets stuck on the way). */
export function arrive() {
  const p = getWorld().player;
  const then = p.then;
  cancelWalk();
  if (then && interactableAt(p, useGame.getState().registers) === then) interact(then);
}

function fixtureInfo(id: FixtureId): string {
  const g = useGame.getState();
  const f = FIXTURES[id];
  if (levelInfo(g.xp).level < f.unlockLevel) return `${f.label} · unlocks at level ${f.unlockLevel}`;
  const n = fixtureStock(g.stock, id);
  if (n === 0) return `${f.label} is empty. Order stock on the office computer`;
  return `${f.label} · ${n}/${FIXTURE_CAPACITY} in stock`;
}

function customerInfo(id: number): string | null {
  const w = getWorld();
  const c = w.sim.get(id);
  if (!c) return null;
  const n = c.items.length;
  const value = c.items.reduce((s, it) => s + (PRODUCTS.find((pr) => pr.id === it)?.price ?? 0), 0);
  const bag = n ? `${n} item${n > 1 ? "s" : ""} · $${value}` : "nothing yet";
  const at = useGame.getState().registers > 1 ? ` at register ${c.lane + 1}` : "";
  if (c.phase === "queued") return w.sim.frontReady(c.lane)?.id === id ? `Ready to pay${at} · ${bag}` : `Waiting in line${at} · ${bag}`;
  if (c.phase === "leaving") return c.mood === "happy" ? "Heading home happy" : c.mood === "angry" ? "Leaving upset: the line was too slow" : "Leaving: couldn't find anything";
  if (c.goal.kind === "browse") return `${c.phase === "browsing" ? "Browsing" : "Heading to"} ${FIXTURES[c.goal.fixture].label} · ${bag}`;
  if (c.goal.kind === "queue") return `Walking to the register · ${bag}`;
  return `Shopper · ${bag}`;
}

/** Tap / click on the 3D view. Returns what it did (for tests and the dev hook). */
export function handleTap(target: TapTarget): string {
  const g = useGame.getState();
  const p = getWorld().player;
  if (target.kind === "interact") {
    const regs = g.registers;
    if (target.id === "register") {
      const reg = target.reg ?? 0;
      if (nearestRegister(p, regs) === reg) {
        cancelWalk();
        interact("register");
        return `use:register:${reg}`;
      }
      walkTo(registerSpot(reg), "register");
      sfx.click();
      return `walk:register:${reg}`;
    }
    if (interactableAt(p, regs) === target.id) {
      cancelWalk();
      interact(target.id);
      return `use:${target.id}`;
    }
    const spot = INTERACTABLES.find((i) => i.id === target.id)!.at;
    walkTo(spot, target.id);
    sfx.click();
    return `walk:${target.id}`;
  }
  if (target.kind === "fixture") {
    g.toast(fixtureInfo(target.id), "info");
    const b = FIXTURE_LAYOUT[target.id].browse;
    const f = FIXTURE_LAYOUT[target.id];
    // stand a little further out than shoppers do
    walkTo({ x: b.x, z: b.z + Math.sign(b.z - f.z) * 0.35 });
    return `fixture:${target.id}`;
  }
  if (target.kind === "customer") {
    const w = getWorld();
    const c = w.sim.get(target.id);
    if (c && w.sim.frontReady(c.lane)?.id === target.id) return handleTap({ kind: "interact", id: "register", reg: c.lane });
    const info = customerInfo(target.id);
    if (info) g.toast(info, "info");
    return `customer:${target.id}`;
  }
  if (target.kind === "staff") {
    const assign = staffAssignments(g.registers, g.staff.length);
    const who = g.staff[assign[target.reg] ?? -1];
    if (who) {
      const busy = getWorld().sim.frontReady(target.reg);
      g.toast(`${who.name} · cashier at register ${target.reg + 1}${busy ? " · ringing someone up" : ""}`, "info");
    }
    return `staff:${target.reg}`;
  }
  walkTo(target.point);
  return "walk:floor";
}

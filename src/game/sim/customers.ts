import { FIXTURE_IDS, FIXTURES, type FixtureId, type Gender } from "./catalog";
import { DOOR_NODE, FIXTURE_LAYOUT, NODES, QUEUE_APPROACH, QUEUE_SPOTS, type Vec2 } from "./layout";
import { findPath } from "./nav";
import { mulberry32 } from "./rng";

export const WALK_SPEED = 1.35;
export const BROWSE_MIN = 2.5;
export const BROWSE_MAX = 5;
export const QUEUE_PATIENCE = 75;
export const MAX_QUEUE = QUEUE_SPOTS.length;
export const FIRST_SPAWN_DELAY = 2.5;
export const MAX_VISITS = 3;

export type Mood = "browsing" | "carrying" | "waiting" | "sad" | "angry" | "happy";
export type Goal = { kind: "browse"; fixture: FixtureId } | { kind: "queue" } | { kind: "exit" };

export interface Customer {
  id: number;
  gender: Gender;
  seed: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  path: Vec2[];
  phase: "walking" | "browsing" | "queued" | "leaving";
  goal: Goal;
  browseLeft: number;
  waitingForQueue: boolean;
  items: string[];
  visits: number;
  patience: number;
  mood: Mood;
  lastNode: string;
}

export interface StockPort {
  available(f: FixtureId): number;
  take(f: FixtureId, rand: () => number): string | null;
  restore(ids: string[]): void;
}

export interface StepContext {
  stock: StockPort;
  level: number;
  appeal: number;
}

export type SimEvent =
  | { type: "spawn"; id: number }
  | { type: "despawn"; id: number }
  | { type: "joinedQueue"; id: number }
  | { type: "leftAngry"; id: number }
  | { type: "leftEmpty"; id: number };

/** Seconds between customer arrivals; a more appealing store draws them faster. */
export function spawnInterval(appeal: number): number {
  return Math.max(3.5, 11 - appeal * 1.2);
}
export function maxCustomers(level: number): number {
  return Math.min(8, 3 + Math.floor(level / 2));
}

export class CustomerSim {
  customers: Customer[] = [];
  queue: number[] = [];
  events: SimEvent[] = [];
  spawnTimer = FIRST_SPAWN_DELAY;
  private nextId = 1;
  private rand: () => number;

  constructor(seed = 1) {
    this.rand = mulberry32(seed);
  }

  get(id: number) {
    return this.customers.find((c) => c.id === id);
  }

  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  step(dt: number, ctx: StepContext) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(ctx.appeal) * (0.7 + this.rand() * 0.6);
      if (this.customers.length < maxCustomers(ctx.level)) this.spawn(ctx);
    }
    for (const c of this.customers) this.update(c, dt, ctx);
    this.customers = this.customers.filter((c) => {
      if (c.phase === "leaving" && c.path.length === 0) {
        this.events.push({ type: "despawn", id: c.id });
        return false;
      }
      return true;
    });
  }

  /** The customer at the front of the line, once they have reached the register. */
  frontReady(): Customer | null {
    const c = this.queue.length ? this.get(this.queue[0]) : undefined;
    return c && c.phase === "queued" && c.path.length === 0 ? c : null;
  }

  checkout(): { id: number; items: string[] } | null {
    const c = this.frontReady();
    if (!c) return null;
    const items = c.items;
    c.items = [];
    this.goExit(c, "happy");
    return { id: c.id, items };
  }

  private spawn(ctx: StepContext) {
    const door = NODES[DOOR_NODE];
    const c: Customer = {
      id: this.nextId++,
      gender: this.rand() < 0.55 ? "women" : "men",
      seed: Math.floor(this.rand() * 1e9),
      x: door.x,
      z: door.z + 1,
      heading: Math.PI,
      speed: 0,
      path: [],
      phase: "walking",
      goal: { kind: "exit" },
      browseLeft: 0,
      waitingForQueue: false,
      items: [],
      visits: 0,
      patience: QUEUE_PATIENCE,
      mood: "browsing",
      lastNode: DOOR_NODE,
    };
    this.customers.push(c);
    this.events.push({ type: "spawn", id: c.id });
    this.goBrowse(c, ctx);
  }

  private chooseFixture(c: Customer, ctx: StepContext, exclude?: FixtureId): FixtureId {
    const opts = FIXTURE_IDS.filter((f) => ctx.level >= FIXTURES[f].unlockLevel && f !== exclude);
    const weights = opts.map(
      (f) => (FIXTURES[f].gender === c.gender ? 4 : 1) * (ctx.stock.available(f) > 0 ? 3 : 1),
    );
    let r = this.rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < opts.length; i++) {
      r -= weights[i];
      if (r <= 0) return opts[i];
    }
    return opts[opts.length - 1];
  }

  private goBrowse(c: Customer, ctx: StepContext) {
    const prev = c.goal.kind === "browse" ? c.goal.fixture : undefined;
    const f = this.chooseFixture(c, ctx, prev);
    const lay = FIXTURE_LAYOUT[f];
    const target = { x: lay.browse.x + (this.rand() - 0.5) * 1.6, z: lay.browse.z };
    c.path = [...findPath(c.lastNode, lay.approach), target];
    c.lastNode = lay.approach;
    c.goal = { kind: "browse", fixture: f };
    c.phase = "walking";
  }

  private goQueue(c: Customer) {
    const idx = this.queue.length;
    this.queue.push(c.id);
    c.path = [...findPath(c.lastNode, QUEUE_APPROACH), { ...QUEUE_SPOTS[idx] }];
    c.lastNode = QUEUE_APPROACH;
    c.goal = { kind: "queue" };
    c.phase = "walking";
    c.mood = "carrying";
    c.patience = QUEUE_PATIENCE;
    this.events.push({ type: "joinedQueue", id: c.id });
  }

  private goExit(c: Customer, mood: Mood) {
    this.removeFromQueue(c.id);
    const door = NODES[DOOR_NODE];
    c.path = [...findPath(c.lastNode, DOOR_NODE), { x: door.x, z: door.z + 1.2 }];
    c.goal = { kind: "exit" };
    c.phase = "leaving";
    c.mood = mood;
  }

  private removeFromQueue(id: number) {
    const i = this.queue.indexOf(id);
    if (i < 0) return;
    this.queue.splice(i, 1);
    this.queue.forEach((qid, idx) => {
      const q = this.get(qid);
      if (!q) return;
      const spot = { ...QUEUE_SPOTS[idx] };
      if (q.phase === "queued") {
        q.path = [spot];
      } else if (q.path.length) {
        q.path[q.path.length - 1] = spot;
      }
    });
  }

  private update(c: Customer, dt: number, ctx: StepContext) {
    if (c.path.length) {
      let budget = WALK_SPEED * dt;
      while (budget > 0 && c.path.length) {
        const t = c.path[0];
        const dx = t.x - c.x;
        const dz = t.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d > 1e-4) c.heading = Math.atan2(dx, dz);
        if (d <= budget) {
          c.x = t.x;
          c.z = t.z;
          budget -= d;
          c.path.shift();
        } else {
          c.x += (dx / d) * budget;
          c.z += (dz / d) * budget;
          budget = 0;
        }
      }
      c.speed = WALK_SPEED;
      if (!c.path.length) this.arrive(c);
      return;
    }
    c.speed = 0;
    if (c.phase === "browsing") {
      c.browseLeft -= dt;
      if (c.browseLeft <= 0) this.finishBrowse(c, ctx);
    } else if (c.phase === "queued") {
      c.patience -= dt;
      if (c.patience <= 0) {
        ctx.stock.restore(c.items);
        c.items = [];
        this.events.push({ type: "leftAngry", id: c.id });
        this.goExit(c, "angry");
      }
    }
  }

  private arrive(c: Customer) {
    c.speed = 0;
    if (c.goal.kind === "browse") {
      const lay = FIXTURE_LAYOUT[c.goal.fixture];
      c.phase = "browsing";
      c.browseLeft = BROWSE_MIN + this.rand() * (BROWSE_MAX - BROWSE_MIN);
      c.heading = Math.atan2(lay.x - c.x, lay.z - c.z);
      if (!c.items.length) c.mood = "browsing";
    } else if (c.goal.kind === "queue") {
      c.phase = "queued";
      c.heading = Math.PI; // face the counter
      c.mood = "waiting";
    }
  }

  private finishBrowse(c: Customer, ctx: StepContext) {
    if (c.goal.kind !== "browse") return;
    if (c.waitingForQueue) {
      if (this.queue.length < MAX_QUEUE) {
        c.waitingForQueue = false;
        this.goQueue(c);
      } else c.browseLeft = 2;
      return;
    }
    const want = this.rand() < 0.6 ? 1 : 2;
    let got = 0;
    for (let i = 0; i < want; i++) {
      const id = ctx.stock.take(c.goal.fixture, this.rand);
      if (!id) break;
      c.items.push(id);
      got++;
    }
    c.visits++;
    c.mood = c.items.length ? "carrying" : got === 0 ? "sad" : "browsing";
    const wantMore = c.visits < MAX_VISITS && this.rand() < (c.items.length ? 0.3 : 0.6);
    if (wantMore) return this.goBrowse(c, ctx);
    if (c.items.length) {
      if (this.queue.length < MAX_QUEUE) return this.goQueue(c);
      c.waitingForQueue = true;
      c.browseLeft = 2;
      return;
    }
    this.events.push({ type: "leftEmpty", id: c.id });
    this.goExit(c, "sad");
  }
}

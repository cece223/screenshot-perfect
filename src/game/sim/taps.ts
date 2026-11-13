import { FIXTURES, FIXTURE_IDS, type FixtureId } from "./catalog";
import { COUNTER_D, COUNTER_W, DESK, FIXTURE_LAYOUT, MIRROR, REGISTERS, cashierSpot, clampRegisters, type InteractId, type Vec2 } from "./layout";

/** What a tap / click in the 3D view landed on. Pure geometry: no three.js. */
export type TapTarget =
  | { kind: "interact"; id: InteractId; reg?: number }
  | { kind: "staff"; reg: number }
  | { kind: "fixture"; id: FixtureId }
  | { kind: "customer"; id: number }
  | { kind: "floor"; point: Vec2 };

export interface Ray {
  origin: { x: number; y: number; z: number };
  dir: { x: number; y: number; z: number };
}

interface Box3 {
  min: [number, number, number];
  max: [number, number, number];
}

/** Slab test; returns entry distance or null. */
export function rayBox(ray: Ray, b: Box3): number | null {
  const o = [ray.origin.x, ray.origin.y, ray.origin.z];
  const d = [ray.dir.x, ray.dir.y, ray.dir.z];
  let tmin = 0;
  let tmax = Infinity;
  for (let a = 0; a < 3; a++) {
    const oa = o[a]!;
    const da = d[a]!;
    if (Math.abs(da) < 1e-9) {
      if (oa < b.min[a]! || oa > b.max[a]!) return null;
      continue;
    }
    let t1 = (b.min[a]! - oa) / da;
    let t2 = (b.max[a]! - oa) / da;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

const flat = (x: number, z: number, w: number, d: number, h: number, pad = 0.08): Box3 => ({
  min: [x - w / 2 - pad, 0, z - d / 2 - pad],
  max: [x + w / 2 + pad, h, z + d / 2 + pad],
});

const STATIC: { target: TapTarget; box: Box3 }[] = [
  { target: { kind: "interact", id: "computer" }, box: flat(DESK.x, DESK.z, DESK.w, DESK.d, 1.45) },
  { target: { kind: "interact", id: "mirror" }, box: flat(MIRROR.x + 0.1, MIRROR.z, 0.45, 1.2, 2.1) },
  ...FIXTURE_IDS.map((id) => {
    const f = FIXTURE_LAYOUT[id];
    return { target: { kind: "fixture", id } as TapTarget, box: flat(f.x, f.z, f.w, f.d, FIXTURES[id].kind === "rack" ? 1.75 : 1.05) };
  }),
];

const COUNTER_BOXES = REGISTERS.map((r, reg) => ({
  target: { kind: "interact", id: "register", reg } as TapTarget,
  box: flat(r.x, r.z, COUNTER_W, COUNTER_D, 1.35),
}));

/**
 * Nearest thing under the ray. Shoppers (generously sized) win over the floor.
 * `registers` = counters the shop owns; `staffed` = registers with a cashier standing at them.
 */
export function pickTap(
  ray: Ray,
  customers: { id: number; x: number; z: number }[],
  registers = 1,
  staffed: number[] = [],
): TapTarget | null {
  let best: TapTarget | null = null;
  let bestT = Infinity;
  for (const reg of staffed) {
    const s = cashierSpot(reg);
    const t = rayBox(ray, flat(s.x, s.z, 0.6, 0.6, 1.9, 0.05));
    if (t !== null && t < bestT) {
      bestT = t;
      best = { kind: "staff", reg };
    }
  }
  for (const c of customers) {
    const t = rayBox(ray, flat(c.x, c.z, 0.7, 0.7, 1.9, 0.05));
    if (t !== null && t < bestT) {
      bestT = t;
      best = { kind: "customer", id: c.id };
    }
  }
  for (const s of [...STATIC, ...COUNTER_BOXES.slice(0, clampRegisters(registers))]) {
    const t = rayBox(ray, s.box);
    if (t !== null && t < bestT) {
      bestT = t;
      best = s.target;
    }
  }
  if (best) return best;
  if (ray.dir.y >= -1e-6) return null;
  const t = -ray.origin.y / ray.dir.y;
  return { kind: "floor", point: { x: ray.origin.x + ray.dir.x * t, z: ray.origin.z + ray.dir.z * t } };
}

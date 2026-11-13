import type { FixtureId } from "./catalog";

export interface Vec2 {
  x: number;
  z: number;
}
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Sales floor footprint in metres. Entrance is on the +z (front) wall. */
export const STORE = { minX: -10, maxX: 10, minZ: -8, maxZ: 8, wallHeight: 3.2 };
export const DOOR = { minX: -1.5, maxX: 1.5 };
export const PLAYER_RADIUS = 0.32;
export const PLAYER_START: Vec2 = { x: 2, z: 4.5 };

/** Office in the back-right corner, door in its front (z = OFFICE.maxZ) wall. */
export const OFFICE = { minX: 5, maxX: 10, minZ: -8, maxZ: -3, doorMinX: 6.3, doorMaxX: 7.7, wallHeight: 2.4 };

// Aisle waypoints: rows F/M/B, columns at fixed x. D is just outside the door.
const COLS = [-9, -6, -3, 0, 3];
const ROWS: Record<string, number> = { F: 6, M: 0.7, B: -3.3 };

export const NODES: Record<string, Vec2> = { D: { x: 0, z: 9.2 } };
for (const [r, z] of Object.entries(ROWS)) for (const x of COLS) NODES[`${r}${x}`] = { x, z };

export const EDGES: [string, string][] = [["D", "F0"]];
for (const r of Object.keys(ROWS))
  for (let i = 0; i < COLS.length - 1; i++) EDGES.push([`${r}${COLS[i]!}`, `${r}${COLS[i + 1]!}`]);
for (const x of [-9, -3, 3]) {
  EDGES.push([`F${x}`, `M${x}`]);
  EDGES.push([`M${x}`, `B${x}`]);
}
export const DOOR_NODE = "D";

export function nodePos(id: string): Vec2 {
  const n = NODES[id];
  if (!n) throw new Error(`Unknown nav node ${id}`);
  return { x: n.x, z: n.z };
}

export function queueSpot(i: number): Vec2 {
  return laneSpot(0, i);
}

export interface FixtureLayout {
  x: number;
  z: number;
  w: number;
  d: number;
  browse: Vec2;
  approach: string;
}

export const FIXTURE_LAYOUT: Record<FixtureId, FixtureLayout> = {
  wTops: { x: -6, z: -5, w: 2.6, d: 0.6, browse: { x: -6, z: -4.05 }, approach: "B-6" },
  wBottoms: { x: -6, z: -1.5, w: 2.6, d: 0.6, browse: { x: -6, z: -0.55 }, approach: "M-6" },
  mTops: { x: 0, z: -5, w: 2.6, d: 0.6, browse: { x: 0, z: -4.05 }, approach: "B0" },
  mBottoms: { x: 0, z: -1.5, w: 2.6, d: 0.6, browse: { x: 0, z: -0.55 }, approach: "M0" },
  wAcc: { x: -6, z: 2.5, w: 2.2, d: 0.8, browse: { x: -6, z: 3.55 }, approach: "F-6" },
  mAcc: { x: 0, z: 2.5, w: 2.2, d: 0.8, browse: { x: 0, z: 3.55 }, approach: "F0" },
};

/** Checkout counters along z = 2. The shop starts with the first; more can be bought. */
export const MAX_REGISTERS = 3;
export const COUNTER_W = 2.0;
export const COUNTER_D = 0.8;
export const REGISTERS: Vec2[] = [
  { x: 4.4, z: 2 },
  { x: 6.6, z: 2 },
  { x: 8.8, z: 2 },
];
/** First counter (kept for older callers). */
export const COUNTER = { x: REGISTERS[0]!.x, z: REGISTERS[0]!.z, w: COUNTER_W, d: COUNTER_D };
export const REGISTER: Vec2 = REGISTERS[0]!;
const QUEUE_Z = [3.15, 4.0, 4.85, 5.7, 6.55];
export const QUEUE_LENGTH = QUEUE_Z.length;
/** Line spots in front of register 0 (kept for older callers). */
export const QUEUE_SPOTS: Vec2[] = QUEUE_Z.map((z) => ({ x: REGISTERS[0]!.x, z }));

export function clampRegisters(n: number): number {
  return Math.max(1, Math.min(MAX_REGISTERS, Math.floor(n) || 1));
}
/** Where shopper `i` stands in the line for register `reg`. */
export function laneSpot(reg: number, i: number): Vec2 {
  const r = REGISTERS[Math.max(0, Math.min(reg, MAX_REGISTERS - 1))]!;
  return { x: r.x, z: QUEUE_Z[Math.max(0, Math.min(i, QUEUE_Z.length - 1))]! };
}
/** Where the player (or a cashier) stands to run register `reg`. */
export function registerSpot(reg: number): Vec2 {
  const r = REGISTERS[Math.max(0, Math.min(reg, MAX_REGISTERS - 1))]!;
  return { x: r.x, z: 1.0 };
}
/** Where a hired cashier stands: beside the till, behind the counter. */
export function cashierSpot(reg: number): Vec2 {
  const r = REGISTERS[Math.max(0, Math.min(reg, MAX_REGISTERS - 1))]!;
  return { x: r.x - 0.68, z: 1.15 };
}
export const QUEUE_APPROACH = "F3";

export const DESK = { x: 8.4, z: -7.25, w: 1.6, d: 0.8 };
export const MIRROR = { x: -9.92, z: 5.2 };

export type InteractId = "register" | "computer" | "mirror";
export const INTERACTABLES: { id: InteractId; at: Vec2; radius: number }[] = [
  { id: "register", at: { x: 4.4, z: 1.0 }, radius: 1.2 },
  { id: "computer", at: { x: 8.4, z: -6.3 }, radius: 1.4 },
  { id: "mirror", at: { x: -9.1, z: 5.2 }, radius: 1.5 },
];

const box = (x: number, z: number, w: number, d: number): AABB => ({
  minX: x - w / 2,
  maxX: x + w / 2,
  minZ: z - d / 2,
  maxZ: z + d / 2,
});

const BASE_OBSTACLES: AABB[] = [
  ...Object.values(FIXTURE_LAYOUT).map((f) => box(f.x, f.z, f.w, f.d)),
  // office walls
  { minX: OFFICE.minX - 0.1, maxX: OFFICE.minX + 0.1, minZ: OFFICE.minZ, maxZ: OFFICE.maxZ + 0.1 },
  { minX: OFFICE.minX, maxX: OFFICE.doorMinX, minZ: OFFICE.maxZ - 0.1, maxZ: OFFICE.maxZ + 0.1 },
  { minX: OFFICE.doorMaxX, maxX: OFFICE.maxX, minZ: OFFICE.maxZ - 0.1, maxZ: OFFICE.maxZ + 0.1 },
  box(DESK.x, DESK.z, DESK.w, DESK.d),
  box(5.9, -7.55, 1.0, 0.6), // office bookcase
  box(-9.55, 1.6, 0.8, 2.0), // sofa by the fitting area
];

const obstacleCache = new Map<number, AABB[]>();
/** Walls and furniture, including the counters the shop owns. Same array per count (path grid caches by identity). */
export function obstaclesFor(registers: number): AABB[] {
  const n = clampRegisters(registers);
  let o = obstacleCache.get(n);
  if (!o) {
    o = [...BASE_OBSTACLES, ...REGISTERS.slice(0, n).map((r) => box(r.x, r.z, COUNTER_W, COUNTER_D))];
    obstacleCache.set(n, o);
  }
  return o;
}
export const OBSTACLES: AABB[] = obstaclesFor(1);

export interface Interactable {
  id: InteractId;
  at: Vec2;
  radius: number;
  /** Register index for register spots. */
  reg?: number;
}
/** Interact spots for a shop with `registers` counters. */
export function interactablesFor(registers: number): Interactable[] {
  const n = clampRegisters(registers);
  return [
    ...REGISTERS.slice(0, n).map((_, reg) => ({ id: "register" as const, at: registerSpot(reg), radius: 1.2, reg })),
    ...INTERACTABLES.filter((i) => i.id !== "register"),
  ];
}

/** Nearest owned register within reach of `p`, or null. */
export function nearestRegister(p: Vec2, registers = 1): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const it of interactablesFor(registers)) {
    if (it.id !== "register") continue;
    const d = Math.hypot(p.x - it.at.x, p.z - it.at.z);
    if (d <= it.radius && d < bestD) {
      best = it.reg ?? 0;
      bestD = d;
    }
  }
  return best;
}

export function interactableAt(p: Vec2, registers = 1): InteractId | null {
  let best: InteractId | null = null;
  let bestD = Infinity;
  for (const it of interactablesFor(registers)) {
    const d = Math.hypot(p.x - it.at.x, p.z - it.at.z);
    if (d <= it.radius && d < bestD) {
      best = it.id;
      bestD = d;
    }
  }
  return best;
}

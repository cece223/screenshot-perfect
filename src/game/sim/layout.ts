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
  const s = QUEUE_SPOTS[Math.max(0, Math.min(i, QUEUE_SPOTS.length - 1))]!;
  return { x: s.x, z: s.z };
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

export const COUNTER = { x: 6, z: 2, w: 3, d: 0.8 };
export const REGISTER: Vec2 = { x: 6, z: 2 };
export const QUEUE_SPOTS: Vec2[] = [
  { x: 6, z: 3.15 },
  { x: 6, z: 4.0 },
  { x: 6, z: 4.85 },
  { x: 6, z: 5.7 },
  { x: 6, z: 6.55 },
];
export const QUEUE_APPROACH = "F3";

export const DESK = { x: 8.4, z: -7.25, w: 1.6, d: 0.8 };
export const MIRROR = { x: -9.92, z: 5.2 };

export type InteractId = "register" | "computer" | "mirror";
export const INTERACTABLES: { id: InteractId; at: Vec2; radius: number }[] = [
  { id: "register", at: { x: 6, z: 1.0 }, radius: 1.6 },
  { id: "computer", at: { x: 8.4, z: -6.3 }, radius: 1.4 },
  { id: "mirror", at: { x: -9.1, z: 5.2 }, radius: 1.5 },
];

const box = (x: number, z: number, w: number, d: number): AABB => ({
  minX: x - w / 2,
  maxX: x + w / 2,
  minZ: z - d / 2,
  maxZ: z + d / 2,
});

export const OBSTACLES: AABB[] = [
  ...Object.values(FIXTURE_LAYOUT).map((f) => box(f.x, f.z, f.w, f.d)),
  box(COUNTER.x, COUNTER.z, COUNTER.w, COUNTER.d),
  // office walls
  { minX: OFFICE.minX - 0.1, maxX: OFFICE.minX + 0.1, minZ: OFFICE.minZ, maxZ: OFFICE.maxZ + 0.1 },
  { minX: OFFICE.minX, maxX: OFFICE.doorMinX, minZ: OFFICE.maxZ - 0.1, maxZ: OFFICE.maxZ + 0.1 },
  { minX: OFFICE.doorMaxX, maxX: OFFICE.maxX, minZ: OFFICE.maxZ - 0.1, maxZ: OFFICE.maxZ + 0.1 },
  box(DESK.x, DESK.z, DESK.w, DESK.d),
  box(5.9, -7.55, 1.0, 0.6), // office bookcase
  box(-9.55, 1.6, 0.8, 2.0), // sofa by the fitting area
];

export function interactableAt(p: Vec2): InteractId | null {
  let best: InteractId | null = null;
  let bestD = Infinity;
  for (const it of INTERACTABLES) {
    const d = Math.hypot(p.x - it.at.x, p.z - it.at.z);
    if (d <= it.radius && d < bestD) {
      best = it.id;
      bestD = d;
    }
  }
  return best;
}

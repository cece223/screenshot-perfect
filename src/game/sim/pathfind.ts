import { OBSTACLES, PLAYER_RADIUS, STORE, type AABB, type Vec2 } from "./layout";

/** Grid A* for the player's tap-to-walk, with string-pulling so paths look natural. */
const CELL = 0.25;
const MARGIN = 0.06;

function blockedAt(x: number, z: number, r: number, obstacles: AABB[]): boolean {
  if (x < STORE.minX + r || x > STORE.maxX - r || z < STORE.minZ + r || z > STORE.maxZ - r) return true;
  for (const b of obstacles) {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
  }
  return false;
}

export function isWalkable(p: Vec2, r = PLAYER_RADIUS, obstacles: AABB[] = OBSTACLES): boolean {
  return !blockedAt(p.x, p.z, r, obstacles);
}

function clearLine(a: Vec2, b: Vec2, r: number, obstacles: AABB[]): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(d / 0.1));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (blockedAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r, obstacles)) return false;
  }
  return true;
}

const COLS = Math.round((STORE.maxX - STORE.minX) / CELL);
const ROWS = Math.round((STORE.maxZ - STORE.minZ) / CELL);
const cx = (i: number) => STORE.minX + (i + 0.5) * CELL;
const cz = (j: number) => STORE.minZ + (j + 0.5) * CELL;

let gridCache: { obstacles: AABB[]; blocked: Uint8Array } | null = null;
function grid(obstacles: AABB[], r: number): Uint8Array {
  if (gridCache && gridCache.obstacles === obstacles) return gridCache.blocked;
  const blocked = new Uint8Array(COLS * ROWS);
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) blocked[j * COLS + i] = blockedAt(cx(i), cz(j), r + MARGIN, obstacles) ? 1 : 0;
  gridCache = { obstacles, blocked };
  return blocked;
}

function cellOf(p: Vec2): [number, number] {
  return [
    Math.max(0, Math.min(COLS - 1, Math.floor((p.x - STORE.minX) / CELL))),
    Math.max(0, Math.min(ROWS - 1, Math.floor((p.z - STORE.minZ) / CELL))),
  ];
}

/** Nearest walkable point to `p` (searches outward ring by ring). */
export function nearestWalkable(p: Vec2, obstacles: AABB[] = OBSTACLES, r = PLAYER_RADIUS): Vec2 {
  if (!blockedAt(p.x, p.z, r + MARGIN, obstacles)) return { x: p.x, z: p.z };
  const blocked = grid(obstacles, r);
  const [i0, j0] = cellOf(p);
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (let ring = 1; ring < 40 && !best; ring++) {
    for (let j = j0 - ring; j <= j0 + ring; j++)
      for (let i = i0 - ring; i <= i0 + ring; i++) {
        if (i < 0 || j < 0 || i >= COLS || j >= ROWS || blocked[j * COLS + i]) continue;
        const d = (cx(i) - p.x) ** 2 + (cz(j) - p.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = { x: cx(i), z: cz(j) };
        }
      }
  }
  return best ?? { x: p.x, z: p.z };
}

/**
 * Waypoints from `from` to `to` (excluding `from`). `to` is moved to the nearest
 * walkable spot first. Returns [] when no route exists.
 */
export function findPlayerPath(from: Vec2, to: Vec2, obstacles: AABB[] = OBSTACLES, r = PLAYER_RADIUS): Vec2[] {
  const goal = nearestWalkable(to, obstacles, r);
  if (clearLine(from, goal, r, obstacles)) return [goal];
  const blocked = grid(obstacles, r);
  const start = cellOf(nearestWalkable(from, obstacles, r));
  const end = cellOf(goal);
  const idx = (i: number, j: number) => j * COLS + i;
  const s = idx(start[0], start[1]);
  const e = idx(end[0], end[1]);
  const g = new Float32Array(COLS * ROWS).fill(Infinity);
  const came = new Int32Array(COLS * ROWS).fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  const open: number[] = [s];
  const f = new Float32Array(COLS * ROWS).fill(Infinity);
  const h = (k: number) => Math.hypot((k % COLS) - end[0], Math.floor(k / COLS) - end[1]);
  g[s] = 0;
  f[s] = h(s);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]!]! < f[open[bi]!]!) bi = k;
    const cur = open[bi]!;
    open[bi] = open[open.length - 1]!;
    open.pop();
    if (cur === e) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % COLS;
    const cj = Math.floor(cur / COLS);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue;
        const n = idx(ni, nj);
        if (blocked[n] || closed[n]) continue;
        if (di && dj && (blocked[idx(ci + di, cj)] || blocked[idx(ci, cj + dj)])) continue; // no corner cutting
        const ng = g[cur]! + (di && dj ? Math.SQRT2 : 1);
        if (ng < g[n]!) {
          g[n] = ng;
          f[n] = ng + h(n);
          came[n] = cur;
          open.push(n);
        }
      }
  }
  if (came[e] === -1 && e !== s) return [];
  const cells: Vec2[] = [];
  for (let k = e; k !== -1 && k !== s; k = came[k]!) cells.push({ x: cx(k % COLS), z: cz(Math.floor(k / COLS)) });
  cells.reverse();
  cells[cells.length - 1] = goal;
  // string-pull: skip every waypoint we can see past
  const out: Vec2[] = [];
  let anchor = from;
  let k = 0;
  while (k < cells.length) {
    let far = k;
    for (let m = cells.length - 1; m > k; m--)
      if (clearLine(anchor, cells[m]!, r, obstacles)) {
        far = m;
        break;
      }
    out.push(cells[far]!);
    anchor = cells[far]!;
    k = far + 1;
  }
  return out;
}

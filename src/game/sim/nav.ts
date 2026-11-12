import { EDGES, NODES, type Vec2 } from "./layout";

const ADJ: Record<string, string[]> = {};
for (const [a, b] of EDGES) {
  (ADJ[a] ??= []).push(b);
  (ADJ[b] ??= []).push(a);
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

/** Shortest waypoint path between two aisle nodes, inclusive of both ends. */
export function findPath(from: string, to: string): Vec2[] {
  if (!NODES[from] || !NODES[to]) return [];
  const best: Record<string, number> = { [from]: 0 };
  const prev: Record<string, string> = {};
  const open = new Set([from]);
  const done = new Set<string>();
  while (open.size) {
    let cur = "";
    let curD = Infinity;
    for (const n of open)
      if (best[n] < curD) {
        cur = n;
        curD = best[n];
      }
    open.delete(cur);
    if (cur === to) break;
    done.add(cur);
    for (const nb of ADJ[cur] ?? []) {
      if (done.has(nb)) continue;
      const d = curD + dist(NODES[cur], NODES[nb]);
      if (d < (best[nb] ?? Infinity)) {
        best[nb] = d;
        prev[nb] = cur;
        open.add(nb);
      }
    }
  }
  if (best[to] === undefined) return [];
  const ids = [to];
  while (ids[0] !== from) ids.unshift(prev[ids[0]]);
  return ids.map((id) => ({ ...NODES[id] }));
}

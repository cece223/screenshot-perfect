import { OBSTACLES, STORE, type AABB, type Vec2 } from "./layout";

/** Push a circle out of every obstacle box and keep it inside the shop walls. */
export function resolveCollisions(p: Vec2, r: number, obstacles: AABB[] = OBSTACLES): Vec2 {
  let { x, z } = p;
  for (let iter = 0; iter < 2; iter++) {
    for (const b of obstacles) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        // centre inside the box: exit through the nearest side
        const opts = [
          { x: b.minX - r, z, d: x - b.minX },
          { x: b.maxX + r, z, d: b.maxX - x },
          { x, z: b.minZ - r, d: z - b.minZ },
          { x, z: b.maxZ + r, d: b.maxZ - z },
        ].sort((a, c) => a.d - c.d);
        x = opts[0]!.x;
        z = opts[0]!.z;
      }
    }
    x = Math.max(STORE.minX + r, Math.min(STORE.maxX - r, x));
    z = Math.max(STORE.minZ + r, Math.min(STORE.maxZ - r, z));
  }
  return { x, z };
}

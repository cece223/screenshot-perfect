import { describe, expect, it } from "vitest";
import { COUNTER, OBSTACLES, PLAYER_START } from "./layout";
import { findPlayerPath, isWalkable } from "./pathfind";
import { pickTap, type Ray } from "./taps";

const down = (x: number, z: number): Ray => ({ origin: { x, y: 10, z }, dir: { x: 0, y: -1, z: 0 } });

describe("tapping the 3D view", () => {
  it("tapping the counter targets the register, the rack targets the rack", () => {
    expect(pickTap(down(COUNTER.x, COUNTER.z), [])).toEqual({ kind: "interact", id: "register" });
    expect(pickTap(down(-6, -5), [])).toEqual({ kind: "fixture", id: "wTops" });
    expect(pickTap(down(8.4, -7.25), [])).toEqual({ kind: "interact", id: "computer" });
  });

  it("a shopper standing on the floor is picked before the floor", () => {
    expect(pickTap(down(-3, 5), [{ id: 7, x: -3, z: 5 }])).toEqual({ kind: "customer", id: 7 });
    expect(pickTap(down(-3, 5), [])).toEqual({ kind: "floor", point: { x: -3, z: 5 } });
  });

  it("walking to the office computer routes through the office door", () => {
    const path = findPlayerPath(PLAYER_START, { x: 8.4, z: -6.3 });
    expect(path.length).toBeGreaterThan(1);
    const last = path[path.length - 1]!;
    expect(Math.hypot(last.x - 8.4, last.z + 6.3)).toBeLessThan(0.3);
    // every leg stays clear of walls and fixtures
    let prev = PLAYER_START;
    for (const p of path) {
      for (let t = 0; t <= 1; t += 0.05) expect(isWalkable({ x: prev.x + (p.x - prev.x) * t, z: prev.z + (p.z - prev.z) * t }, 0.3, OBSTACLES)).toBe(true);
      prev = p;
    }
  });

  it("walking behind the counter to the register works", () => {
    const path = findPlayerPath({ x: -6, z: 6 }, { x: 6, z: 1 });
    expect(path.length).toBeGreaterThan(0);
  });
});

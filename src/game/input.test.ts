import { describe, expect, it } from "vitest";
import { cameraRelativeMove, keysToAxes, radialDeadzone, stickToAxes } from "./input";

describe("controls mapping", () => {
  it("W / Up moves forward, D / Right strafes right", () => {
    expect(keysToAxes(new Set(["KeyW"]))).toEqual({ fwd: 1, strafe: 0 });
    expect(keysToAxes(new Set(["ArrowRight"]))).toEqual({ fwd: 0, strafe: 1 });
  });

  it("forward goes away from the camera; right is screen-right", () => {
    const f = cameraRelativeMove(1, 0, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(-1);
    const r = cameraRelativeMove(0, 1, 0);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
    // camera rotated to look along +x: forward becomes +x
    const turned = cameraRelativeMove(1, 0, -Math.PI / 2);
    expect(turned.x).toBeCloseTo(1);
  });

  it("gamepad stick up is forward and resting drift is ignored", () => {
    expect(stickToAxes(0, -1).fwd).toBeCloseTo(1);
    expect(stickToAxes(1, 0).strafe).toBeCloseTo(1);
    expect(radialDeadzone(0.08, 0.05)).toEqual([0, 0]);
  });
});

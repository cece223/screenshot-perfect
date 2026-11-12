import { describe, expect, it } from "vitest";
import { DEFAULT_KEYS, DEFAULT_PAD, actionsForKey, rebindKey, rebindPad, resolveLayout } from "./bindings";
import { keysToAxes } from "./input";

describe("remapping controls", () => {
  it("a remapped key moves the player and the old key stops working", () => {
    const binds = rebindKey(DEFAULT_KEYS, "up", 0, "KeyI");
    expect(keysToAxes(new Set(["KeyI"]), binds).fwd).toBe(1);
    expect(keysToAxes(new Set(["KeyW"]), binds).fwd).toBe(0);
  });

  it("taking a key another action uses swaps the two", () => {
    const binds = rebindKey(DEFAULT_KEYS, "interact", 0, "KeyC"); // C was Open computer
    expect(actionsForKey(binds, "KeyC")).toEqual(["interact"]);
    expect(binds.computer[0]).toBe("KeyE");
  });

  it("Escape can't be rebound", () => {
    expect(rebindKey(DEFAULT_KEYS, "interact", 0, "Escape")).toBe(DEFAULT_KEYS);
  });

  it("controller buttons swap instead of leaving an action unbound", () => {
    const pad = rebindPad(DEFAULT_PAD, "interact", DEFAULT_PAD.back);
    expect(pad.interact).toBe(1);
    expect(pad.back).toBe(0);
    expect(rebindPad(DEFAULT_PAD, "interact", 12)).toBe(DEFAULT_PAD); // d-pad is for menus
  });

  it("chosen layout wins; automatic picks controller, then touch, then keyboard", () => {
    expect(resolveLayout("mouse", { coarse: true, gamepad: true })).toBe("mouse");
    expect(resolveLayout("auto", { coarse: true, gamepad: true })).toBe("gamepad");
    expect(resolveLayout("auto", { coarse: true, gamepad: false })).toBe("touch");
    expect(resolveLayout("auto", { coarse: false, gamepad: false })).toBe("keyboard");
  });
});

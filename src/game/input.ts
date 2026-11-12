/**
 * Every input source (keyboard, touch joystick, gamepad) writes here; the stepper
 * merges them once per frame. Axes: fwd +1 = away from camera, strafe +1 = screen right.
 */
export const input = {
  keys: new Set<string>(),
  joy: { fwd: 0, strafe: 0 },
  camYawDelta: 0,
  camZoomDelta: 0,
  interactQueued: false,
  gamepadIndex: null as number | null,
  prevPad: [] as boolean[],
  prevNav: { x: 0, y: 0 },
  navRepeat: 0,
};

export function keysToAxes(keys: Set<string>): { fwd: number; strafe: number } {
  const k = (...c: string[]) => (c.some((x) => keys.has(x)) ? 1 : 0);
  return {
    fwd: k("KeyW", "ArrowUp") - k("KeyS", "ArrowDown"),
    strafe: k("KeyD", "ArrowRight") - k("KeyA", "ArrowLeft"),
  };
}

/** Radial deadzone rescaled from its edge: resting sticks read ±0.05-0.15, never 0. */
export function radialDeadzone(x: number, y: number, dz = 0.15): [number, number] {
  const m = Math.hypot(x, y);
  if (m < dz) return [0, 0];
  const s = Math.min(1, (m - dz) / (1 - dz)) / m;
  return [x * s, y * s];
}

/** Standard-mapping left stick → movement axes (stick up = negative y = forward). */
export function stickToAxes(ax: number, ay: number): { fwd: number; strafe: number } {
  const [x, y] = radialDeadzone(ax, ay);
  return { fwd: -y, strafe: x };
}

/**
 * Rotate input by the camera yaw. The camera sits at player + (sin yaw, cos yaw) * dist,
 * so its flat forward is (-sin yaw, -cos yaw) and its right is (cos yaw, -sin yaw).
 */
export function cameraRelativeMove(fwd: number, strafe: number, yaw: number): { x: number; z: number } {
  let x = -Math.sin(yaw) * fwd + Math.cos(yaw) * strafe;
  let z = -Math.cos(yaw) * fwd - Math.sin(yaw) * strafe;
  const m = Math.hypot(x, z);
  if (m > 1) {
    x /= m;
    z /= m;
  }
  return { x, z };
}

export interface PadState {
  fwd: number;
  strafe: number;
  lookX: number;
  lookY: number;
  pressed: (i: number) => boolean;
  justPressed: (i: number) => boolean;
}

export function pollGamepad(): PadState | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  let pad: Gamepad | null = input.gamepadIndex !== null ? (pads[input.gamepadIndex] ?? null) : null;
  if (!pad) {
    pad = Array.from(pads).find((p): p is Gamepad => !!p) ?? null;
    if (!pad) return null;
    input.gamepadIndex = pad.index;
  }
  const buttons = pad.buttons.map((b) => b.pressed || b.value > 0.5);
  const prev = input.prevPad;
  input.prevPad = buttons;
  const move = stickToAxes(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
  const [lx, ly] = radialDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.2);
  return {
    ...move,
    lookX: lx,
    lookY: ly,
    pressed: (i) => !!buttons[i],
    justPressed: (i) => !!buttons[i] && !prev[i],
  };
}

export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

/** Move gamepad focus through the buttons of the top-most open menu. */
export function gamepadMenuNav(pad: PadState, dt: number, onBack: () => void) {
  const scopes = document.querySelectorAll<HTMLElement>("[data-gp-scope]");
  const scope = scopes[scopes.length - 1];
  if (!scope) return;
  const items = Array.from(scope.querySelectorAll<HTMLElement>("button:not([disabled])"));
  if (!items.length) return;
  let dir = 0;
  const y = pad.pressed(PAD.DOWN) ? 1 : pad.pressed(PAD.UP) ? -1 : Math.abs(pad.fwd) > 0.6 ? -Math.sign(pad.fwd) : 0;
  const x = pad.pressed(PAD.RIGHT) ? 1 : pad.pressed(PAD.LEFT) ? -1 : Math.abs(pad.strafe) > 0.6 ? Math.sign(pad.strafe) : 0;
  const v = y || x;
  if (v !== 0) {
    input.navRepeat -= dt;
    const fresh = input.prevNav.x !== x || input.prevNav.y !== y;
    if (fresh || input.navRepeat <= 0) {
      dir = v;
      input.navRepeat = fresh ? 0.4 : 0.12;
    }
  }
  input.prevNav = { x, y };
  const current = items.findIndex((el) => el === document.activeElement);
  if (dir !== 0) {
    const next = items[current < 0 ? 0 : (current + dir + items.length) % items.length];
    items.forEach((el) => el.removeAttribute("data-gp-focused"));
    if (next) {
      next.setAttribute("data-gp-focused", "true");
      next.focus();
      next.scrollIntoView({ block: "nearest" });
    }
  }
  if (pad.justPressed(PAD.A)) {
    const el = current >= 0 ? items[current] : null;
    if (el) el.click();
    else {
      items[0]?.setAttribute("data-gp-focused", "true");
      items[0]?.focus();
    }
  }
  if (pad.justPressed(PAD.B)) onBack();
}

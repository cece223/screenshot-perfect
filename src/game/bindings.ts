/** Pure control-binding helpers (no React / three). Keyboard uses KeyboardEvent.code. */

export type KeyAction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "interact"
  | "computer"
  | "customize"
  | "help"
  | "pause"
  | "camLeft"
  | "camRight"
  | "zoomIn"
  | "zoomOut";

/** Two slots per action (primary, alternate); null = unbound. */
export type KeyBinds = Record<KeyAction, (string | null)[]>;

export const KEY_ACTIONS: { id: KeyAction; label: string }[] = [
  { id: "up", label: "Move forward" },
  { id: "down", label: "Move back" },
  { id: "left", label: "Move left" },
  { id: "right", label: "Move right" },
  { id: "interact", label: "Interact / checkout" },
  { id: "computer", label: "Open computer" },
  { id: "customize", label: "Change your look" },
  { id: "help", label: "How to play" },
  { id: "pause", label: "Pause" },
  { id: "camLeft", label: "Rotate camera left" },
  { id: "camRight", label: "Rotate camera right" },
  { id: "zoomIn", label: "Zoom in" },
  { id: "zoomOut", label: "Zoom out" },
];

export const DEFAULT_KEYS: KeyBinds = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  interact: ["KeyE", "Space"],
  computer: ["KeyC", null],
  customize: ["KeyP", null],
  help: ["KeyH", null],
  pause: ["KeyM", null],
  camLeft: ["KeyQ", null],
  camRight: ["KeyR", null],
  zoomIn: ["Equal", null],
  zoomOut: ["Minus", null],
};

/** Escape always pauses / closes menus, so it can never be rebound. */
export const RESERVED_KEYS = ["Escape"];

export function isKeyDown(binds: KeyBinds, keys: Set<string>, action: KeyAction): boolean {
  return (binds[action] ?? []).some((c) => !!c && keys.has(c));
}

export function actionsForKey(binds: KeyBinds, code: string): KeyAction[] {
  return (Object.keys(binds) as KeyAction[]).filter((a) => binds[a].includes(code));
}

/** Bind `code` to action/slot. If another action already uses it, the two swap keys. */
export function rebindKey(binds: KeyBinds, action: KeyAction, slot: number, code: string): KeyBinds {
  if (RESERVED_KEYS.includes(code)) return binds;
  const next: KeyBinds = { ...binds };
  for (const a of Object.keys(next) as KeyAction[]) next[a] = [...(next[a] ?? [null, null])];
  const old = next[action][slot] ?? null;
  for (const a of Object.keys(next) as KeyAction[]) {
    next[a].forEach((c, i) => {
      if (c === code && !(a === action && i === slot)) next[a][i] = a === action ? null : old;
    });
  }
  next[action][slot] = code;
  return next;
}

export function clearKey(binds: KeyBinds, action: KeyAction, slot: number): KeyBinds {
  const next: KeyBinds = { ...binds, [action]: [...binds[action]] };
  next[action][slot] = null;
  return next;
}

const KEY_NAMES: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Space: "Space",
  Escape: "Esc",
  Enter: "Enter",
  Backspace: "Bksp",
  Tab: "Tab",
  ShiftLeft: "L Shift",
  ShiftRight: "R Shift",
  ControlLeft: "L Ctrl",
  ControlRight: "R Ctrl",
  AltLeft: "L Alt",
  AltRight: "R Alt",
  MetaLeft: "⌘",
  MetaRight: "⌘",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Backquote: "`",
  CapsLock: "Caps",
};

export function keyLabel(code: string | null | undefined): string {
  if (!code) return "—";
  if (KEY_NAMES[code]) return KEY_NAMES[code]!;
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}

// ---------------------------------------------------------------- controller

export type PadAction = "interact" | "back" | "computer" | "customize" | "pause" | "camLeft" | "camRight";
export type PadBinds = Record<PadAction, number>;

export const PAD_ACTIONS: { id: PadAction; label: string }[] = [
  { id: "interact", label: "Interact / confirm" },
  { id: "back", label: "Back / close menu" },
  { id: "computer", label: "Open computer" },
  { id: "customize", label: "Change your look" },
  { id: "pause", label: "Pause" },
  { id: "camLeft", label: "Rotate camera left" },
  { id: "camRight", label: "Rotate camera right" },
];

/** Standard Gamepad API mapping indices. */
export const DEFAULT_PAD: PadBinds = { interact: 0, back: 1, customize: 2, computer: 3, camLeft: 4, camRight: 5, pause: 9 };

/** D-pad (menu navigation) and the Home button can't be rebound. */
export const RESERVED_PAD = [12, 13, 14, 15, 16];

/** Bind a button to an action; if another action had it, they swap buttons. */
export function rebindPad(binds: PadBinds, action: PadAction, button: number): PadBinds {
  if (RESERVED_PAD.includes(button)) return binds;
  const next: PadBinds = { ...binds };
  const old = next[action];
  for (const a of Object.keys(next) as PadAction[]) if (a !== action && next[a] === button) next[a] = old;
  next[action] = button;
  return next;
}

const PAD_NAMES = ["A / ✕", "B / ○", "X / □", "Y / △", "LB / L1", "RB / R1", "LT / L2", "RT / R2", "Back / Share", "Start / Options", "L3", "R3", "D-pad ↑", "D-pad ↓", "D-pad ←", "D-pad →", "Home"];
const PAD_SHORT = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Back", "Start", "L3", "R3", "↑", "↓", "←", "→", "Home"];

export function padLabel(i: number): string {
  return PAD_NAMES[i] ?? `Button ${i}`;
}
export function padShort(i: number): string {
  return PAD_SHORT[i] ?? `B${i}`;
}

// ---------------------------------------------------------------- layout

export type ControlMode = "auto" | "touch" | "keyboard" | "mouse" | "gamepad";
export type Layout = Exclude<ControlMode, "auto">;

/** Which on-screen layout to show. Auto prefers a connected controller, then touch screens, then keyboard. */
export function resolveLayout(mode: ControlMode, env: { coarse: boolean; gamepad: boolean }): Layout {
  if (mode !== "auto") return mode;
  if (env.gamepad) return "gamepad";
  if (env.coarse) return "touch";
  return "keyboard";
}

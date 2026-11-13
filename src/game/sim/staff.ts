import { MAX_REGISTERS, clampRegisters } from "./layout";

/** Price of each register, by register number (the first one comes with the shop). */
export const REGISTER_PRICES = [0, 650, 1000] as const;
/** One-time price to hire a cashier. */
export const EMPLOYEE_COST = 400;
/** Seconds a cashier takes to ring up the shopper at the front of their line. */
export const CASHIER_SECONDS = 4;
export const STAFF_NAMES = ["Maya", "Jordan", "Priya", "Leo", "Sasha", "Nico"];

export interface Employee {
  id: number;
  name: string;
  seed: number;
}

/** Price of the next register, or null when the shop has the maximum. */
export function nextRegisterPrice(registers: number): number | null {
  const n = clampRegisters(registers);
  return n >= MAX_REGISTERS ? null : REGISTER_PRICES[n]!;
}

export type BuyResult = { ok: true; cash: number } | { ok: false; reason: string };

export function buyRegister(state: { cash: number; registers: number }): BuyResult & { registers?: number } {
  const price = nextRegisterPrice(state.registers);
  if (price === null) return { ok: false, reason: `You already have ${MAX_REGISTERS} registers` };
  if (state.cash < price) return { ok: false, reason: "Not enough cash" };
  return { ok: true, cash: state.cash - price, registers: clampRegisters(state.registers) + 1 };
}

/** Each cashier needs a register of their own. */
export function canHire(employees: number, registers: number): boolean {
  return employees < clampRegisters(registers);
}

export function hireEmployee(state: { cash: number; registers: number; staff: Employee[] }, seed: number): BuyResult & { staff?: Employee[] } {
  if (!canHire(state.staff.length, state.registers)) return { ok: false, reason: "Buy another register first: each cashier needs one" };
  if (state.cash < EMPLOYEE_COST) return { ok: false, reason: "Not enough cash" };
  const id = state.staff.reduce((m, e) => Math.max(m, e.id), 0) + 1;
  const used = new Set(state.staff.map((e) => e.name));
  const name = STAFF_NAMES.find((n) => !used.has(n)) ?? `Cashier ${id}`;
  return { ok: true, cash: state.cash - EMPLOYEE_COST, staff: [...state.staff, { id, name, seed }] };
}

/**
 * Which register each cashier runs. Cashiers take the far registers first, so the
 * first register stays free for the player while there are spare ones.
 * Returns an array indexed by register: employee index or -1.
 */
export function staffAssignments(registers: number, employees: number): number[] {
  const n = clampRegisters(registers);
  const out = Array.from({ length: n }, () => -1);
  for (let k = 0; k < Math.min(employees, n); k++) out[n - 1 - k] = k;
  return out;
}

/**
 * Advance cashier timers. A staffed register with a shopper ready counts up;
 * when it reaches CASHIER_SECONDS that register checks out. Returns registers to check out.
 */
export function stepCashiers(timers: number[], dt: number, staffed: boolean[], ready: (reg: number) => boolean): number[] {
  const done: number[] = [];
  for (let reg = 0; reg < staffed.length; reg++) {
    if (!staffed[reg] || !ready(reg)) {
      timers[reg] = 0;
      continue;
    }
    timers[reg] = (timers[reg] ?? 0) + dt;
    if (timers[reg]! >= CASHIER_SECONDS) {
      timers[reg] = 0;
      done.push(reg);
    }
  }
  return done;
}

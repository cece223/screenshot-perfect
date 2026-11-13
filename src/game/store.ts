import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DECOR, DEFAULT_FLOOR, DEFAULT_WALL, LEVEL_DECOR, styleById } from "./sim/catalog";
import { DEFAULT_APPEARANCE, type Appearance } from "./sim/appearance";
import {
  STARTING_CASH,
  checkoutReward,
  levelInfo,
  placeOrder,
  unlockMessages,
  type Stock,
} from "./sim/economy";
import type { InteractId } from "./sim/layout";
import { sfx, setMuted } from "./audio";
import { EMPLOYEE_COST, buyRegister as buyRegisterRule, hireEmployee as hireRule, type Employee } from "./sim/staff";

export type Panel = null | "computer" | "customize" | "help" | "pause" | "settings";
export interface Toast {
  id: number;
  text: string;
  kind: "money" | "info" | "warn";
}

interface Persisted {
  hasSave: boolean;
  cash: number;
  xp: number;
  stock: Stock;
  appearance: Appearance;
  decorOwned: string[];
  ownedStyles: string[];
  wallpaper: string;
  floor: string;
  served: number;
  revenue: number;
  muted: boolean;
  /** Checkout counters owned (1–3). */
  registers: number;
  /** Hired cashiers. */
  staff: Employee[];
  /** When the player last saved (manual save or returning to the main menu). */
  savedAt: number | null;
}

interface GameState extends Persisted {
  phase: "title" | "playing";
  panel: Panel;
  /** Menu to return to when the current one closes (e.g. Settings opened from Pause). */
  panelBack: Panel;
  firstCustomize: boolean;
  prompt: InteractId | null;
  queueLength: number;
  /** Any register has a shopper ready to pay. */
  frontReady: boolean;
  /** Bit n set: register n has a shopper ready to pay. */
  readyMask: number;
  /** Register the player is standing at, when the prompt is "register". */
  promptReg: number | null;
  customerIds: number[];
  toasts: Toast[];
  levelUp: { level: number; unlocks: string[] } | null;
  gamepad: boolean;

  newGame: () => void;
  continueGame: () => void;
  openPanel: (p: Panel) => void;
  closePanel: () => void;
  setAppearance: (a: Partial<Appearance>) => void;
  order: (productId: string, qty: number) => boolean;
  buyDecor: (id: string) => boolean;
  buyStyle: (id: string) => boolean;
  recordSale: (items: string[], by?: string) => void;
  buyRegister: () => boolean;
  hireEmployee: () => boolean;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissLevelUp: () => void;
  toggleMute: () => void;
  pause: () => void;
  saveGame: () => void;
  toMainMenu: () => void;
}

const fresh = (): Persisted => ({
  hasSave: false,
  cash: STARTING_CASH,
  xp: 0,
  stock: {},
  appearance: DEFAULT_APPEARANCE,
  decorOwned: [],
  ownedStyles: [DEFAULT_WALL, DEFAULT_FLOOR],
  wallpaper: DEFAULT_WALL,
  floor: DEFAULT_FLOOR,
  served: 0,
  revenue: 0,
  muted: false,
  registers: 1,
  staff: [],
  savedAt: null,
});

let toastId = 1;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...fresh(),
      phase: "title",
      panel: null,
      panelBack: null,
      firstCustomize: false,
      prompt: null,
      queueLength: 0,
      frontReady: false,
      readyMask: 0,
      promptReg: null,
      customerIds: [],
      toasts: [],
      levelUp: null,
      gamepad: false,

      newGame: () => set({ ...fresh(), muted: get().muted, appearance: get().appearance, phase: "playing", panel: "customize", panelBack: null, firstCustomize: true }),
      continueGame: () => set({ phase: "playing", panel: null, panelBack: null }),
      openPanel: (panel) => set({ panel, panelBack: get().panel === "pause" ? "pause" : null }),
      closePanel: () => {
        if (get().firstCustomize) set({ firstCustomize: false, hasSave: true });
        set({ panel: get().panelBack, panelBack: null });
      },
      setAppearance: (a) => set({ appearance: { ...get().appearance, ...a } }),

      order: (productId, qty) => {
        const s = get();
        const res = placeOrder({ cash: s.cash, level: levelInfo(s.xp).level, stock: s.stock }, productId, qty);
        if (!res.ok) {
          get().toast(res.reason, "warn");
          sfx.error();
          return false;
        }
        set({ cash: res.cash, stock: res.stock, hasSave: true });
        sfx.order();
        return true;
      },

      buyDecor: (id) => {
        const s = get();
        const item = DECOR.find((d) => d.id === id);
        if (!item || s.decorOwned.includes(id)) return false;
        if (levelInfo(s.xp).level < LEVEL_DECOR) return false;
        if (s.cash < item.cost) {
          get().toast("Not enough cash", "warn");
          sfx.error();
          return false;
        }
        set({ cash: s.cash - item.cost, decorOwned: [...s.decorOwned, id] });
        get().toast(`${item.name} added to your store`, "info");
        sfx.order();
        return true;
      },

      buyStyle: (id) => {
        const s = get();
        const opt = styleById(id);
        if (!opt) return false;
        const key = opt.surface === "wall" ? "wallpaper" : "floor";
        if (s.ownedStyles.includes(id)) {
          set({ [key]: id } as Partial<GameState>);
          sfx.click();
          return true;
        }
        if (s.cash < opt.cost) {
          get().toast("Not enough cash", "warn");
          sfx.error();
          return false;
        }
        set({ cash: s.cash - opt.cost, ownedStyles: [...s.ownedStyles, id], [key]: id } as Partial<GameState>);
        sfx.order();
        return true;
      },

      buyRegister: () => {
        const s = get();
        const res = buyRegisterRule(s);
        if (!res.ok || res.registers === undefined) {
          get().toast(res.ok ? "Can't add a register" : res.reason, "warn");
          sfx.error();
          return false;
        }
        set({ cash: res.cash, registers: res.registers, hasSave: true });
        get().toast(`Register ${res.registers} is open for business`, "info");
        sfx.order();
        return true;
      },

      hireEmployee: () => {
        const s = get();
        const res = hireRule(s, Math.floor(Math.random() * 1e9));
        if (!res.ok || !res.staff) {
          get().toast(res.ok ? "Can't hire right now" : res.reason, "warn");
          sfx.error();
          return false;
        }
        const hired = res.staff[res.staff.length - 1]!;
        set({ cash: res.cash, staff: res.staff, hasSave: true });
        get().toast(`${hired.name} joined your team for $${EMPLOYEE_COST}`, "info");
        sfx.order();
        return true;
      },

      recordSale: (items, by) => {
        const s = get();
        const { cash, xp } = checkoutReward(items);
        const before = levelInfo(s.xp).level;
        const after = levelInfo(s.xp + xp).level;
        set({ cash: s.cash + cash, xp: s.xp + xp, served: s.served + 1, revenue: s.revenue + cash, hasSave: true });
        get().toast(`${by ? `${by}: ` : ""}+$${cash} · +${xp} XP`, "money");
        sfx.register();
        if (after > before) {
          const unlocks = unlockMessages(before, after);
          setTimeout(() => sfx.levelUp(), 350);
          if (unlocks.length) set({ levelUp: { level: after, unlocks } });
          else get().toast(`Level up! You're now level ${after}`, "info");
        }
      },

      toast: (text, kind = "info") => {
        const id = toastId++;
        set({ toasts: [...get().toasts.slice(-3), { id, text, kind }] });
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2600);
      },
      dismissLevelUp: () => set({ levelUp: null }),
      toggleMute: () => {
        const m = !get().muted;
        setMuted(m);
        set({ muted: m });
      },
      pause: () => {
        const s = get();
        if (s.phase !== "playing" || s.panel || s.levelUp) return;
        set({ panel: "pause" });
      },
      saveGame: () => {
        set({ hasSave: true, savedAt: Date.now() });
        get().toast("Game saved", "info");
      },
      toMainMenu: () =>
        set({ hasSave: true, savedAt: Date.now(), phase: "title", panel: null, panelBack: null, prompt: null, firstCustomize: false }),
    }),
    {
      name: "bloom-boutique-save-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s): Persisted => ({
        hasSave: s.hasSave,
        cash: s.cash,
        xp: s.xp,
        stock: s.stock,
        appearance: s.appearance,
        decorOwned: s.decorOwned,
        ownedStyles: s.ownedStyles,
        wallpaper: s.wallpaper,
        floor: s.floor,
        served: s.served,
        revenue: s.revenue,
        muted: s.muted,
        registers: s.registers,
        staff: s.staff,
        savedAt: s.savedAt,
      }),
      onRehydrateStorage: () => (s) => {
        if (s) setMuted(s.muted);
      },
    },
  ),
);

export const selectLevel = (s: { xp: number }) => levelInfo(s.xp).level;

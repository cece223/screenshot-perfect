import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_KEYS,
  DEFAULT_PAD,
  clearKey,
  rebindKey,
  rebindPad,
  type ControlMode,
  type KeyAction,
  type KeyBinds,
  type PadAction,
  type PadBinds,
} from "./bindings";

/** Player settings: kept separately from the boutique save so "New boutique" keeps them. */
interface SettingsState {
  controlMode: ControlMode;
  tapToMove: boolean;
  keys: KeyBinds;
  pad: PadBinds;
  setMode: (m: ControlMode) => void;
  setTapToMove: (v: boolean) => void;
  bindKey: (a: KeyAction, slot: number, code: string) => void;
  unbindKey: (a: KeyAction, slot: number) => void;
  bindPad: (a: PadAction, button: number) => void;
  resetControls: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      controlMode: "auto",
      tapToMove: true,
      keys: DEFAULT_KEYS,
      pad: DEFAULT_PAD,
      setMode: (controlMode) => set({ controlMode }),
      setTapToMove: (tapToMove) => set({ tapToMove }),
      bindKey: (a, slot, code) => set({ keys: rebindKey(get().keys, a, slot, code) }),
      unbindKey: (a, slot) => set({ keys: clearKey(get().keys, a, slot) }),
      bindPad: (a, b) => set({ pad: rebindPad(get().pad, a, b) }),
      resetControls: () => set({ keys: DEFAULT_KEYS, pad: DEFAULT_PAD }),
    }),
    {
      name: "bloom-boutique-settings-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ controlMode: s.controlMode, tapToMove: s.tapToMove, keys: s.keys, pad: s.pad }),
      // fill in any actions added after a settings file was saved
      merge: (saved, cur) => {
        const p = (saved ?? {}) as Partial<SettingsState>;
        return { ...cur, ...p, keys: { ...DEFAULT_KEYS, ...p.keys }, pad: { ...DEFAULT_PAD, ...p.pad } };
      },
    },
  ),
);

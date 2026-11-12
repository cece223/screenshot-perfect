import { Gamepad2, Hand, Keyboard, Mouse, RotateCcw, Smartphone, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  KEY_ACTIONS,
  PAD_ACTIONS,
  RESERVED_PAD,
  keyLabel,
  padLabel,
  resolveLayout,
  type ControlMode,
  type KeyAction,
  type PadAction,
} from "../bindings";
import { input } from "../input";
import { useSettings } from "../settings";
import { useGame } from "../store";
import { Sheet } from "./Sheet";
import { useCoarsePointer } from "./useCoarsePointer";

type Tab = "layout" | "keyboard" | "controller";
type Listen = null | { kind: "key"; action: KeyAction; slot: number } | { kind: "pad"; action: PadAction };

const MODES: { id: ControlMode; label: string; desc: string; icon: ReactNode }[] = [
  { id: "auto", label: "Automatic", desc: "Picks the right layout for your device", icon: <Sparkles className="h-5 w-5" /> },
  { id: "touch", label: "Touch screen", desc: "Joystick and big buttons on screen", icon: <Smartphone className="h-5 w-5" /> },
  { id: "keyboard", label: "Keyboard", desc: "Move with keys, key hints on screen", icon: <Keyboard className="h-5 w-5" /> },
  { id: "mouse", label: "Mouse", desc: "Click to walk and use things", icon: <Mouse className="h-5 w-5" /> },
  { id: "gamepad", label: "Controller", desc: "Bluetooth or USB gamepad", icon: <Gamepad2 className="h-5 w-5" /> },
];
const LAYOUT_NAME = { touch: "Touch screen", keyboard: "Keyboard", mouse: "Mouse", gamepad: "Controller" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label, desc, icon }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string; icon: ReactNode }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow-soft transition-all ${on ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function Slot({ active, label, onClick, aria }: { active: boolean; label: string; onClick: () => void; aria: string }) {
  return (
    <button
      aria-label={aria}
      onClick={onClick}
      data-selected={active}
      className={`chip min-w-[4.5rem] text-center font-bold ${active ? "animate-pulse" : ""}`}
    >
      {active ? "Press…" : label}
    </button>
  );
}

export function SettingsPanel() {
  const close = useGame((s) => s.closePanel);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const gamepad = useGame((s) => s.gamepad);
  const st = useSettings();
  const coarse = useCoarsePointer();
  const [tab, setTab] = useState<Tab>("layout");
  const [listen, setListen] = useState<Listen>(null);
  const current = resolveLayout(st.controlMode, { coarse, gamepad });

  // waiting for a keyboard key
  useEffect(() => {
    if (listen?.kind !== "key") return;
    input.rebinding = "key";
    const h = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") return setListen(null);
      if (e.code === "Backspace" || e.code === "Delete") useSettings.getState().unbindKey(listen.action, listen.slot);
      else useSettings.getState().bindKey(listen.action, listen.slot, e.code);
      setListen(null);
    };
    window.addEventListener("keydown", h, { capture: true });
    return () => {
      window.removeEventListener("keydown", h, { capture: true });
      input.keys.clear();
      input.rebinding = null;
    };
  }, [listen]);

  // waiting for a controller button (the game loop reports the press)
  useEffect(() => {
    if (listen?.kind !== "pad") return;
    input.rebinding = "pad";
    input.capturedPad = null;
    let raf = 0;
    const loop = () => {
      const b = input.capturedPad;
      if (b !== null && !RESERVED_PAD.includes(b)) {
        useSettings.getState().bindPad(listen.action, b);
        setListen(null);
        return;
      }
      input.capturedPad = null;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const esc = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.stopImmediatePropagation();
      setListen(null);
    };
    window.addEventListener("keydown", esc, { capture: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", esc, { capture: true });
      input.rebinding = null;
      input.capturedPad = null;
    };
  }, [listen]);

  const pickMode = (m: ControlMode) => {
    st.setMode(m);
    if (m === "mouse" || m === "touch") st.setTapToMove(true);
  };

  return (
    <Sheet title="Settings" subtitle="Controls, layout and sound" onClose={() => !listen && close()}>
      <div className="mb-4 flex gap-1.5">
        {(
          [
            ["layout", "Layout"],
            ["keyboard", "Keyboard keys"],
            ["controller", "Controller"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            data-selected={tab === id}
            onClick={() => {
              setListen(null);
              setTab(id);
            }}
            className="chip"
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "layout" && (
        <div className="space-y-5">
          <Section title="Control layout">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODES.map((m) => {
                const on = st.controlMode === m.id;
                return (
                  <button
                    key={m.id}
                    aria-pressed={on}
                    onClick={() => pickMode(m.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                      on ? "border-foreground bg-foreground text-card" : "border-border bg-card"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${on ? "bg-card/15" : "bg-muted"}`}>{m.icon}</span>
                    <span className="min-w-0">
                      <span className="block font-bold">{m.label}</span>
                      <span className={`block text-xs ${on ? "text-card/75" : "text-muted-foreground"}`}>
                        {m.id === "auto" && on ? `Using: ${LAYOUT_NAME[current]}` : m.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Every control keeps working whichever layout you pick; this changes the buttons and hints on screen.</p>
          </Section>
          <Section title="Tapping">
            <Toggle
              on={st.tapToMove}
              onChange={st.setTapToMove}
              icon={<Hand className="h-5 w-5" />}
              label="Tap / click to walk and use"
              desc="Tap the floor to walk there. Tap the register, computer, mirror, racks or shoppers to use or check them."
            />
          </Section>
          <Section title="Sound">
            <Toggle
              on={!muted}
              onChange={toggleMute}
              icon={muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              label="Sound effects"
              desc="Register chimes, door bells and menu clicks"
            />
          </Section>
        </div>
      )}

      {tab === "keyboard" && (
        <Section title="Tap a key slot, then press the new key">
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {KEY_ACTIONS.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm font-semibold">{a.label}</span>
                <span className="flex gap-1.5">
                  {[0, 1].map((slot) => (
                    <Slot
                      key={slot}
                      aria={`${a.label} key ${slot + 1}`}
                      active={listen?.kind === "key" && listen.action === a.id && listen.slot === slot}
                      label={keyLabel(st.keys[a.id][slot])}
                      onClick={() => setListen({ kind: "key", action: a.id, slot })}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Esc always pauses and closes menus. While a slot says “Press…”, Backspace clears it and Esc cancels. Picking a key another action uses swaps them.
          </p>
        </Section>
      )}

      {tab === "controller" && (
        <Section title={gamepad ? "Tap a button slot, then press the new controller button" : "Connect a controller to change its buttons"}>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {PAD_ACTIONS.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm font-semibold">{a.label}</span>
                <Slot
                  aria={`${a.label} button`}
                  active={listen?.kind === "pad" && listen.action === a.id}
                  label={padLabel(st.pad[a.id])}
                  onClick={() => gamepad && setListen({ kind: "pad", action: a.id })}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Left stick moves, right stick turns and zooms the camera, D-pad moves through menus. Picking a button another action uses swaps them.
          </p>
        </Section>
      )}

      <div className="mt-5 flex gap-2">
        <button
          className="btn-game btn-ghost h-12 flex-1"
          onClick={() => {
            setListen(null);
            st.resetControls();
            useGame.getState().toast("Controls reset to default", "info");
          }}
        >
          <RotateCcw className="h-4 w-4" /> Reset controls
        </button>
        <button className="btn-game btn-primary h-12 flex-1" onClick={() => !listen && close()}>
          Done
        </button>
      </div>
    </Sheet>
  );
}

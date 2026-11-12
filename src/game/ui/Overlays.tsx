import { CircleHelp, Home, Play, Save, Settings, Sparkles } from "lucide-react";
import menuTall from "@/assets/menu-boutique-tall.jpg";
import menuWide from "@/assets/menu-boutique-wide.jpg";
import { keyLabel, padShort, type KeyAction, type PadAction } from "../bindings";
import { useSettings } from "../settings";
import { unlockAudio } from "../audio";
import { STARTING_CASH, levelInfo } from "../sim/economy";
import { useGame } from "../store";
import { resetWorld } from "../world";
import { Sheet } from "./Sheet";

/** "just now", "5 min ago", "2 h ago", or a date. */
export function savedLabel(at: number | null, now = Date.now()): string {
  if (!at) return "Not saved yet";
  const min = Math.floor((now - at) / 60000);
  if (min < 1) return "Saved just now";
  if (min < 60) return `Saved ${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Saved ${h} h ago`;
  return `Saved ${new Date(at).toLocaleDateString()}`;
}

/** A little tulip sprig flanking the menu title. */
function Tulip({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 40 80" aria-hidden className={`h-14 w-7 shrink-0 sm:h-20 sm:w-10 ${flip ? "-scale-x-100" : ""}`}>
      <path d="M20 78 C20 60 21 44 20 26" stroke="var(--menu-leaf)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M20 62 C10 58 5 48 6 38 C14 44 19 52 20 62Z" fill="var(--menu-leaf)" />
      <path d="M21 52 C30 48 34 40 33 31 C26 36 22 43 21 52Z" fill="var(--menu-leaf)" opacity="0.85" />
      <path d="M12 12 C12 22 15 28 20 28 C25 28 28 22 28 12 L24 17 L20 8 L16 17Z" fill="var(--menu-tulip)" stroke="var(--menu-title-edge)" strokeWidth="1" />
    </svg>
  );
}

export function TitleScreen() {
  const hasSave = useGame((s) => s.hasSave);
  const xp = useGame((s) => s.xp);
  const cash = useGame((s) => s.cash);
  const newGame = useGame((s) => s.newGame);
  const cont = useGame((s) => s.continueGame);
  const savedAt = useGame((s) => s.savedAt);
  const open = useGame((s) => s.openPanel);

  const startFresh = () => {
    resetWorld();
    newGame();
  };
  const go = (fn: () => void) => () => {
    unlockAudio();
    fn();
  };
  const btn = "menu-btn h-12 w-64 text-lg [@media(max-height:480px)]:h-10 [@media(max-height:480px)]:text-base";

  return (
    <div data-gp-scope className="absolute inset-0 z-30 overflow-hidden">
      <picture>
        <source media="(orientation: portrait)" srcSet={menuTall} />
        <img
          src={menuWide}
          alt="A cozy boutique with a gilded mirror, lavender armchair, jewelry case and clothing rack"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover object-left portrait:object-top"
        />
      </picture>
      <div className="menu-shade absolute inset-0" />

      <div className="relative flex h-full flex-col items-center overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] landscape:w-full landscape:max-w-[34rem] landscape:justify-center landscape:pt-6 landscape:sm:pl-[6vw] portrait:pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))]">
        <div className="flex animate-rise items-center gap-1 sm:gap-2">
          <Tulip />
          <h1 className="menu-title text-center text-[2.6rem] leading-[0.95] sm:text-6xl [@media(max-height:480px)]:text-4xl">
            Main Street
            <br />
            Boutique
          </h1>
          <Tulip flip />
        </div>

        <nav aria-label="Main menu" className="mt-8 flex animate-rise flex-col items-center gap-3 [@media(max-height:480px)]:mt-4 [@media(max-height:480px)]:gap-2">
          <button className={`${btn} menu-btn-main`} onClick={go(hasSave ? cont : startFresh)}>
            Open your boutique
          </button>
          <button
            className={btn}
            onClick={go(() => {
              if (hasSave && !window.confirm("Start over? Your current boutique will be replaced.")) return;
              startFresh();
            })}
          >
            New boutique
          </button>
          <button className={btn} onClick={go(() => open("customize"))}>
            Character
          </button>
          <button className={btn} onClick={go(() => open("settings"))}>
            Settings &amp; controls
          </button>
          <div className="menu-btn mt-1 h-auto rounded-full px-4 py-1 text-xs font-semibold">
            {hasSave ? `Lv ${levelInfo(xp).level} · $${cash.toLocaleString()} · ${savedLabel(savedAt)}` : `New shops start with $${STARTING_CASH}`}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function PauseMenu() {
  const close = useGame((s) => s.closePanel);
  const open = useGame((s) => s.openPanel);
  const save = useGame((s) => s.saveGame);
  const toMenu = useGame((s) => s.toMainMenu);
  const xp = useGame((s) => s.xp);
  const cash = useGame((s) => s.cash);
  const served = useGame((s) => s.served);
  const savedAt = useGame((s) => s.savedAt);
  return (
    <div data-gp-scope className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/35 p-5">
      <div role="dialog" aria-label="Paused" className="panel-sheet w-full max-w-sm animate-pop-in rounded-3xl p-6 text-center">
        <div className="text-xs font-extrabold uppercase tracking-[0.3em] text-primary">Game paused</div>
        <h2 className="font-display text-4xl font-bold">Taking a break</h2>
        <div className="mt-3 flex justify-center gap-2 text-sm font-bold">
          <span className="chip">Lv {levelInfo(xp).level}</span>
          <span className="chip">${cash.toLocaleString()}</span>
          <span className="chip">{served} served</span>
        </div>
        <div className="mt-2 text-xs font-semibold text-muted-foreground">{savedLabel(savedAt)}</div>
        <div className="mt-5 flex flex-col gap-2">
          <button className="btn-game btn-primary h-12" onClick={close}>
            <Play className="h-5 w-5" /> Resume
          </button>
          <button className="btn-game btn-ghost h-12" onClick={save}>
            <Save className="h-5 w-5" /> Save game
          </button>
          <button className="btn-game btn-ghost h-12" onClick={() => open("settings")}>
            <Settings className="h-5 w-5" /> Settings &amp; controls
          </button>
          <button className="btn-game btn-ghost h-12" onClick={() => open("help")}>
            <CircleHelp className="h-5 w-5" /> How to play
          </button>
          <button className="btn-game btn-ghost h-12" onClick={toMenu}>
            <Home className="h-5 w-5" /> Save &amp; main menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function LevelUpModal() {
  const lv = useGame((s) => s.levelUp);
  const dismiss = useGame((s) => s.dismissLevelUp);
  const open = useGame((s) => s.openPanel);
  if (!lv) return null;
  return (
    <div data-gp-scope className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/30 p-5">
      <div className="panel-sheet w-full max-w-sm animate-pop-in rounded-3xl p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold text-gold-foreground">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="mt-3 text-xs font-extrabold uppercase tracking-[0.25em] text-primary">Level {lv.level}</div>
        <h2 className="font-display text-3xl font-bold">New unlocks!</h2>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          {lv.unlocks.map((u) => (
            <p key={u}>{u}</p>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            className="btn-game btn-primary h-12"
            onClick={() => {
              dismiss();
              open("computer");
            }}
          >
            Shop now
          </button>
          <button className="btn-game btn-ghost h-11" onClick={dismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

function useControlsTable(): [string, string, string, string][] {
  const keys = useSettings((s) => s.keys);
  const pad = useSettings((s) => s.pad);
  const k = (...a: KeyAction[]) =>
    a
      .flatMap((x) => keys[x].filter(Boolean).map((c) => keyLabel(c)))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(" / ") || "—";
  const p = (...a: PadAction[]) => a.map((x) => padShort(pad[x])).join(" / ");
  return [
    ["Move", k("up", "left", "down", "right"), "Joystick · tap the floor", "Left stick"],
    ["Interact", k("interact"), "Hand button · tap it", p("interact")],
    ["Camera", `Drag mouse · ${k("camLeft", "camRight")}`, "Drag screen", `Right stick · ${p("camLeft", "camRight")}`],
    ["Zoom", `Wheel · ${k("zoomOut", "zoomIn")}`, "Pinch", "Right stick up/down"],
    ["Computer", k("computer"), "Computer button", p("computer")],
    ["Customize", k("customize"), "Shirt button", p("customize")],
    ["Pause / save", `Esc · ${k("pause")}`, "Pause button", p("pause")],
    ["Close menu", "Esc", "✕", p("back")],
  ];
}

export function HelpPanel() {
  const close = useGame((s) => s.closePanel);
  const served = useGame((s) => s.served);
  const revenue = useGame((s) => s.revenue);
  const CONTROLS = useControlsTable();
  return (
    <Sheet title="How to play" subtitle={`${served} customers served · $${revenue.toLocaleString()} total sales`} onClose={close}>
      <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-sm">
        <li>Walk into the <b>office</b> (back right) and use the computer to order stock.</li>
        <li>Shoppers browse your racks, grab items and line up at the <b>register</b>.</li>
        <li>Stand behind the counter and check them out for cash and XP.</li>
        <li>Level 5 unlocks accessories; level 10 unlocks store decor.</li>
        <li>Tap or click the floor to walk, and tap the register, computer, mirror, racks or shoppers to use or check them.</li>
      </ol>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-3">Action</th>
              <th className="py-1.5 pr-3">Keyboard</th>
              <th className="py-1.5 pr-3">Touch</th>
              <th className="py-1.5">Controller</th>
            </tr>
          </thead>
          <tbody>
            {CONTROLS.map((r) => (
              <tr key={r[0]} className="border-t border-border">
                {r.map((c, i) => (
                  <td key={i} className={`py-2 pr-3 ${i === 0 ? "font-bold" : "text-muted-foreground"}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex gap-2">
        <button className="btn-game btn-ghost h-12 flex-1" onClick={() => useGame.setState({ panel: "settings" })}>
          <Settings className="h-4 w-4" /> Change controls
        </button>
        <button className="btn-game btn-primary h-12 flex-1" onClick={close}>
          Back
        </button>
      </div>
    </Sheet>
  );
}

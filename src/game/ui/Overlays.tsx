import { CircleHelp, Home, Play, Save, Sparkles } from "lucide-react";
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

export function TitleScreen() {
  const hasSave = useGame((s) => s.hasSave);
  const xp = useGame((s) => s.xp);
  const cash = useGame((s) => s.cash);
  const newGame = useGame((s) => s.newGame);
  const cont = useGame((s) => s.continueGame);
  const savedAt = useGame((s) => s.savedAt);
  return (
    <div data-gp-scope className="title-wash absolute inset-0 z-30 flex flex-col items-center justify-end px-6 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] text-center md:justify-center md:pb-0">
      <div className="animate-rise">
        <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.3em] text-primary">A cozy store simulator</div>
        <h1 className="font-display text-5xl font-bold leading-none sm:text-7xl">
          Bloom <span className="italic text-primary">Boutique</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-base text-muted-foreground">
          Stock the racks, ring up shoppers and grow a little clothing shop into the prettiest store on the block.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {hasSave && (
            <button
              className="btn-game btn-primary h-14 w-64 text-lg"
              onClick={() => {
                unlockAudio();
                cont();
              }}
            >
              Continue · Lv {levelInfo(xp).level} · ${cash.toLocaleString()}
            </button>
          )}
          {hasSave && savedAt && <div className="-mt-1 text-xs font-semibold text-muted-foreground">{savedLabel(savedAt)}</div>}
          <button
            className={`btn-game h-14 w-64 text-lg ${hasSave ? "btn-ghost" : "btn-primary"}`}
            onClick={() => {
              unlockAudio();
              if (hasSave && !window.confirm("Start over? Your current boutique will be replaced.")) return;
              resetWorld();
              newGame();
            }}
          >
            {hasSave ? "New boutique" : `Open your boutique · $${STARTING_CASH}`}
          </button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Keyboard, touch and Bluetooth controllers supported</p>
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

const CONTROLS: [string, string, string, string][] = [
  ["Move", "WASD / Arrows", "Joystick", "Left stick"],
  ["Interact", "E / Space", "Hand button", "A / Cross"],
  ["Camera", "Drag mouse · Q / R", "Drag screen", "Right stick · LB / RB"],
  ["Zoom", "Wheel · - / =", "Pinch", "Right stick up/down"],
  ["Computer", "C", "Computer button", "Y / Triangle"],
  ["Customize", "P", "Shirt button", "X / Square"],
  ["Pause / save", "Esc", "Pause button", "Start / Options"],
  ["Close menu", "Esc", "✕", "B / Circle"],
];

export function HelpPanel() {
  const close = useGame((s) => s.closePanel);
  const served = useGame((s) => s.served);
  const revenue = useGame((s) => s.revenue);
  return (
    <Sheet title="How to play" subtitle={`${served} customers served · $${revenue.toLocaleString()} total sales`} onClose={close}>
      <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-sm">
        <li>Walk into the <b>office</b> (back right) and use the computer to order stock.</li>
        <li>Shoppers browse your racks, grab items and line up at the <b>register</b>.</li>
        <li>Stand behind the counter and check them out for cash and XP.</li>
        <li>Level 5 unlocks accessories; level 10 unlocks store decor.</li>
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
      <button className="btn-game btn-primary mt-5 h-12 w-full" onClick={close}>
        Back to the shop
      </button>
    </Sheet>
  );
}

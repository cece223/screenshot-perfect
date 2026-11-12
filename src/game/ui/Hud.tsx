import { CircleHelp, Gamepad2, Hand, Monitor, MousePointerClick, Pause, Settings, Shirt, Users, Volume2, VolumeX } from "lucide-react";
import { keyLabel, padShort, resolveLayout } from "../bindings";
import { input } from "../input";
import { useSettings } from "../settings";
import { levelInfo } from "../sim/economy";
import { useGame } from "../store";
import { Joystick } from "./Joystick";
import { unlockAudio } from "../audio";
import { useCoarsePointer } from "./useCoarsePointer";

const PROMPTS = {
  register: (ready: boolean, q: number) => (ready ? "Check out customer" : q ? "Customer on the way…" : "Register · no one in line"),
  computer: () => "Use office computer",
  mirror: () => "Change your look",
};

export function Hud() {
  const cash = useGame((s) => s.cash);
  const xp = useGame((s) => s.xp);
  const queue = useGame((s) => s.queueLength);
  const ready = useGame((s) => s.frontReady);
  const prompt = useGame((s) => s.prompt);
  const muted = useGame((s) => s.muted);
  const gamepad = useGame((s) => s.gamepad);
  const toasts = useGame((s) => s.toasts);
  const open = useGame((s) => s.openPanel);
  const toggleMute = useGame((s) => s.toggleMute);
  const pause = useGame((s) => s.pause);
  const mode = useSettings((s) => s.controlMode);
  const keys = useSettings((s) => s.keys);
  const padB = useSettings((s) => s.pad);
  const tapOn = useSettings((s) => s.tapToMove);
  const layout = resolveLayout(mode, { coarse: useCoarsePointer(), gamepad });
  const touch = layout === "touch";
  const firstKey = (a: "interact" | "computer") => keyLabel(keys[a][0] ?? keys[a][1]);
  const hint =
    layout === "gamepad" ? (
      <span className="key-cap">{padShort(padB.interact)}</span>
    ) : layout === "mouse" ? (
      <MousePointerClick className="h-5 w-5" />
    ) : (
      <span className="key-cap">{firstKey("interact")}</span>
    );
  const { level, into, needed } = levelInfo(xp);

  const label =
    prompt === "register" ? PROMPTS.register(ready, queue) : prompt ? PROMPTS[prompt]() : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      {/* top bar */}
      <div className="flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="hud-glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold font-display text-base font-bold text-gold-foreground">$</span>
            <span className="font-display text-xl font-bold tabular-nums">{cash.toLocaleString()}</span>
          </div>
          <div className="hud-glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
              {level}
            </span>
            <div className="w-20 sm:w-28">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Level {level}</div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(into / needed) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="hud-glass flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold">
            <Users className="h-4 w-4" />
            <span className="tabular-nums">{queue}</span>
            <span className="hidden text-muted-foreground sm:inline">in line</span>
            {ready && <span className="h-2 w-2 animate-pulse rounded-full bg-accent-foreground" />}
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1.5">
          {gamepad && (
            <span className="hud-glass hidden h-10 w-10 items-center justify-center rounded-full sm:flex" title="Controller connected">
              <Gamepad2 className="h-5 w-5" />
            </span>
          )}
          <IconBtn label="Customize character" onClick={() => open("customize")}>
            <Shirt className="h-5 w-5" />
          </IconBtn>
          <IconBtn label="Controls help" className="hidden sm:flex" onClick={() => open("help")}>
            <CircleHelp className="h-5 w-5" />
          </IconBtn>
          <IconBtn label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </IconBtn>
          <IconBtn label="Pause" onClick={pause}>
            <Pause className="h-5 w-5" />
          </IconBtn>
        </div>
      </div>

      {/* toasts */}
      <div className="flex flex-col items-center gap-1.5 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-pop-in rounded-full px-4 py-1.5 text-sm font-bold shadow-soft ${
              t.kind === "money" ? "bg-gold text-gold-foreground" : t.kind === "warn" ? "bg-secondary text-secondary-foreground" : "bg-card text-foreground"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* prompt (keyboard / controller) */}
      {label && !coarse && (
        <div className="mb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))] flex justify-center px-3">
          <button
            className="hud-glass pointer-events-auto flex animate-rise items-center gap-3 rounded-full px-4 py-2.5 font-bold"
            onClick={() => {
              unlockAudio();
              input.interactQueued = true;
            }}
          >
            <span className="key-cap">{gamepad ? "A" : "E"}</span>
            {label}
          </button>
        </div>
      )}

      {/* touch controls */}
      {coarse && (
        <div className="flex items-end justify-between gap-3 px-4 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))]">
          <div className="pointer-events-auto">
            <Joystick />
          </div>
          <div className="pointer-events-auto flex flex-col items-end gap-3">
            <button
              aria-label="Open computer"
              className="btn-game btn-ghost hud-glass h-14 px-4 text-sm"
              onClick={() => {
                unlockAudio();
                open("computer");
              }}
            >
              <Monitor className="h-5 w-5" /> Computer
            </button>
            <button
              aria-label={label ?? "Interact"}
              disabled={!label}
              className="btn-game btn-primary h-20 w-20 flex-col gap-0.5 text-[11px] leading-tight"
              onClick={() => {
                unlockAudio();
                input.interactQueued = true;
              }}
            >
              <Hand className="h-6 w-6" />
              {prompt === "register" ? "Checkout" : prompt === "computer" ? "Computer" : prompt === "mirror" ? "Style" : "Interact"}
            </button>
          </div>
        </div>
      )}
      {coarse && label && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(14rem,calc(env(safe-area-inset-bottom)+13.5rem))] flex justify-center">
          <span className="hud-glass animate-rise rounded-full px-4 py-1.5 text-sm font-bold">{label}</span>
        </div>
      )}
      {!coarse && (
        <div className="pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 hidden items-center gap-2 lg:flex">
          <button className="btn-game btn-ghost hud-glass h-10 px-4 text-sm" onClick={() => open("computer")}>
            <Monitor className="h-4 w-4" /> Computer <span className="key-cap">C</span>
          </button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  className = "flex",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => {
        unlockAudio();
        onClick();
      }}
      className={`hud-glass ${className} h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95`}
    >
      {children}
    </button>
  );
}

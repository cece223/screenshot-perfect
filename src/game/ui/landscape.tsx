import { RotateCw, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useGame } from "../store";

/** Touch-first device (phone or tablet). */
function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
}

/**
 * Ask the browser to keep the game sideways. Android Chrome only allows this in
 * full screen; iPhone Safari doesn't allow it at all, so the rotate screen covers that case.
 */
export function lockLandscape() {
  if (typeof window === "undefined" || !isTouchDevice()) return;
  const orient = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  const lock = () => orient?.lock?.("landscape").catch(() => {});
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && document.fullscreenEnabled && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: "hide" }).then(lock, () => {});
    } else lock();
  } catch {
    /* not supported here */
  }
}

/** Covers the game while a phone or tablet is held upright; the shop stays frozen underneath. */
export function RotatePrompt() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => {
      const blocked = mq.matches && isTouchDevice();
      setShow(blocked);
      if (useGame.getState().rotateBlocked !== blocked) useGame.setState({ rotateBlocked: blocked });
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      useGame.setState({ rotateBlocked: false });
    };
  }, []);
  if (!show) return null;
  return (
    <div role="alertdialog" aria-label="Turn your phone sideways" className="rotate-cover absolute inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="relative h-28 w-28">
        <Smartphone className="rotate-hint absolute inset-0 m-auto h-20 w-20" strokeWidth={1.5} />
        <RotateCw className="absolute -right-1 -top-1 h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="menu-title text-4xl leading-tight">Turn your phone sideways</h2>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">Main Street Boutique plays in landscape. Your shop is paused until you rotate.</p>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { input } from "../input";

const RADIUS = 52;

/** Virtual thumbstick. Tracks a single pointer id so a second finger can press buttons. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (e: React.PointerEvent) => {
    const r = base.current?.getBoundingClientRect();
    if (!r) return;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > RADIUS) {
      dx = (dx / m) * RADIUS;
      dy = (dy / m) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    input.joy.strafe = dx / RADIUS;
    input.joy.fwd = -dy / RADIUS;
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== pid.current) return;
    pid.current = null;
    setKnob({ x: 0, y: 0 });
    input.joy.fwd = 0;
    input.joy.strafe = 0;
  };

  return (
    <div
      ref={base}
      aria-label="Movement joystick"
      className="hud-glass relative h-32 w-32 touch-none rounded-full"
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => e.pointerId === pid.current && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="absolute inset-5 rounded-full border-2 border-dashed border-border" />
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-primary shadow-lift"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

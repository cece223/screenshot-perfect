import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { randomAppearance } from "../sim/appearance";
import { QUEUE_PATIENCE, type Mood } from "../sim/customers";
import { INTERACTABLES } from "../sim/layout";
import { mulberry32 } from "../sim/rng";
import { useGame } from "../store";
import { getWorld } from "../world";
import { Character, type MotionSample } from "./Character";

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function Player() {
  const ref = useRef<THREE.Group>(null);
  const look = useGame((s) => s.appearance);
  const sample = useRef<MotionSample>({ speed: 0, carrying: false });
  useFrame(() => {
    const p = getWorld().player;
    ref.current?.position.set(p.x, 0, p.z);
    if (ref.current) ref.current.rotation.y = p.heading;
    sample.current.speed = p.speed;
  });
  return (
    <group ref={ref}>
      <Character look={look} sample={() => sample.current} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

const MOOD_ICON: Record<Mood, string> = {
  browsing: "👀",
  carrying: "🛍️",
  waiting: "💳",
  sad: "😞",
  angry: "😠",
  happy: "😊",
};
const MOOD_TEXT: Partial<Record<Mood, string>> = { sad: "Out of stock", angry: "Too slow!", happy: "Thanks!" };

function CustomerView({ id }: { id: number }) {
  const ref = useRef<THREE.Group>(null);
  const bar = useRef<HTMLDivElement>(null);
  const sample = useRef<MotionSample>({ speed: 0, carrying: false });
  const [mood, setMood] = useState<Mood>("browsing");
  const init = getWorld().sim.get(id);
  const look = useMemo(() => randomAppearance(mulberry32(init?.seed ?? id), init?.gender ?? "women"), [id, init?.seed, init?.gender]);
  const heading = useRef(init?.heading ?? 0);

  useFrame((_, raw) => {
    const c = getWorld().sim.get(id);
    if (!c || !ref.current) return;
    const dt = Math.min(raw, 0.05);
    ref.current.position.set(c.x, 0, c.z);
    heading.current = lerpAngle(heading.current, c.heading, 1 - Math.exp(-10 * dt));
    ref.current.rotation.y = heading.current;
    sample.current.speed = c.speed;
    sample.current.carrying = c.items.length > 0;
    if (c.mood !== mood) setMood(c.mood);
    if (bar.current) bar.current.style.width = `${Math.max(0, (c.patience / QUEUE_PATIENCE) * 100)}%`;
  });

  return (
    <group ref={ref}>
      <Character look={look} sample={() => sample.current} />
      <Html position={[0, 2.25, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="hud-glass flex select-none items-center gap-1 rounded-full px-2 py-0.5 text-sm whitespace-nowrap">
          <span>{MOOD_ICON[mood]}</span>
          {MOOD_TEXT[mood] && <span className="text-[10px] font-bold text-foreground">{MOOD_TEXT[mood]}</span>}
          {mood === "waiting" && (
            <span className="h-1.5 w-8 overflow-hidden rounded-full bg-muted">
              <span ref={bar} className="block h-full rounded-full bg-accent-foreground" />
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

export function Customers() {
  const ids = useGame((s) => s.customerIds);
  return (
    <>
      {ids.map((id) => (
        <CustomerView key={id} id={id} />
      ))}
    </>
  );
}

/** Glowing floor rings mark the spots where you can interact. */
export function InteractRings() {
  const prompt = useGame((s) => s.prompt);
  const ready = useGame((s) => s.frontReady);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = 1 + Math.sin(clock.elapsedTime * 3 + i) * 0.06;
      m.scale.set(s, s, s);
    });
  });
  return (
    <>
      {INTERACTABLES.map((it, i) => {
        const active = prompt === it.id;
        const alert = it.id === "register" && ready;
        return (
          <mesh
            key={it.id}
            ref={(m) => {
              refs.current[i] = m;
            }}
            rotation-x={-Math.PI / 2}
            position={[it.at.x, 0.02, it.at.z]}
          >
            <ringGeometry args={[0.42, 0.52, 40]} />
            <meshBasicMaterial
              color={alert ? "#5fbf8a" : "#e0b545"}
              transparent
              opacity={active ? 0.95 : alert ? 0.8 : 0.45}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

/** Pulsing dot where a tap / click sent the player. */
export function TapMarker() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const route = getWorld().player.route;
    const last = route[route.length - 1];
    m.visible = !!last;
    if (!last) return;
    m.position.set(last.x, 0.03, last.z);
    const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.12;
    m.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.16, 0.28, 32]} />
      <meshBasicMaterial color="#c9604f" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

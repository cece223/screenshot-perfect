import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { randomAppearance } from "../sim/appearance";
import { QUEUE_PATIENCE, type Mood } from "../sim/customers";
import { cashierSpot, interactablesFor } from "../sim/layout";
import { staffAssignments, type Employee } from "../sim/staff";
import { mulberry32 } from "../sim/rng";
import { useGame } from "../store";
import { cashierProgress, getWorld } from "../world";
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
  const promptReg = useGame((s) => s.promptReg);
  const readyMask = useGame((s) => s.readyMask);
  const registers = useGame((s) => s.registers);
  const spots = useMemo(() => interactablesFor(registers), [registers]);
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
      {spots.map((it, i) => {
        const isReg = it.id === "register";
        const active = prompt === it.id && (!isReg || promptReg === it.reg);
        const alert = isReg && ((readyMask >> (it.reg ?? 0)) & 1) === 1;
        return (
          <mesh
            key={`${it.id}${it.reg ?? ""}`}
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

const STAFF_SHIRT = "#3f6b5c";

function CashierView({ who, reg }: { who: Employee; reg: number }) {
  const bar = useRef<HTMLSpanElement>(null);
  const sample = useRef<MotionSample>({ speed: 0, carrying: false });
  const look = useMemo(() => {
    const rand = mulberry32(who.seed);
    const base = randomAppearance(rand, rand() < 0.5 ? "women" : "men");
    return { ...base, top: "tee" as const, topColor: STAFF_SHIRT };
  }, [who.seed]);
  const at = cashierSpot(reg);
  useFrame(() => {
    if (bar.current) bar.current.style.width = `${cashierProgress(reg) * 100}%`;
  });
  return (
    <group position={[at.x, 0, at.z]}>
      <Character look={look} sample={() => sample.current} />
      <Html position={[0, 2.2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="hud-glass flex select-none items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-foreground">
          <span>🪪 {who.name}</span>
          <span className="h-1.5 w-8 overflow-hidden rounded-full bg-muted">
            <span ref={bar} className="block h-full w-0 rounded-full bg-primary" />
          </span>
        </div>
      </Html>
    </group>
  );
}

/** Hired cashiers standing at the registers they run. */
export function Cashiers() {
  const staff = useGame((s) => s.staff);
  const registers = useGame((s) => s.registers);
  const assign = staffAssignments(registers, staff.length);
  return (
    <>
      {assign.map((k, reg) => {
        const who = k >= 0 ? staff[k] : undefined;
        return who ? <CashierView key={`${who.id}-${reg}`} who={who} reg={reg} /> : null;
      })}
    </>
  );
}

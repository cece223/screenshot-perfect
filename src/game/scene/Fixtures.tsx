import { useMemo } from "react";
import * as THREE from "three";
import { FIXTURES, FIXTURE_CAPACITY, productById, productsForFixture, type FixtureId, type ItemShape } from "../sim/catalog";
import { levelInfo, type Stock } from "../sim/economy";
import { COUNTER, FIXTURE_LAYOUT, MIRROR, REGISTER } from "../sim/layout";
import { useGame } from "../store";
import { labelTexture } from "./textures";
import { Model } from "./Model";
import { MODELS } from "./models";

const BRASS = "#c9a25e";
const MAX_VISIBLE = 12;

/** Spread the fixture's stock over a fixed number of visible items. */
export function visibleItems(stock: Stock, fixture: FixtureId, max = MAX_VISIBLE): string[] {
  const all: string[] = [];
  for (const p of productsForFixture(fixture)) for (let i = 0; i < (stock[p.id] ?? 0); i++) all.push(p.id);
  if (all.length <= max) return all;
  return Array.from({ length: max }, (_, i) => all[Math.floor((i * all.length) / max)] ?? all[0]!);
}

function shade(hex: string, i: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, ((i * 37) % 7) / 100 - 0.03);
  return `#${c.getHexString()}`;
}

export function Sign({ text, position, w = 1.3, h = 0.32, bg = "#2f2a2a", fg = "#f6ecdc" }: { text: string; position: [number, number, number]; w?: number; h?: number; bg?: string; fg?: string }) {
  const tex = useMemo(() => labelTexture(text, { bg, fg, w: 1024, h: Math.round((1024 * h) / w) }), [text, bg, fg, w, h]);
  return (
    <group position={position}>
      {[0, Math.PI].map((r) => (
        <mesh key={r} rotation-y={r}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={tex} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Garment({ shape, color, x }: { shape: ItemShape; color: string; x: number }) {
  const dims: Record<string, [number, number, number]> = {
    tee: [0.05, 0.5, 0.42],
    blouse: [0.05, 0.56, 0.4],
    buttondown: [0.05, 0.6, 0.42],
    jeans: [0.05, 0.8, 0.34],
    skirt: [0.05, 0.46, 0.4],
    shorts: [0.05, 0.4, 0.36],
  };
  const [w, h, d] = dims[shape] ?? [0.05, 0.5, 0.4];
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.56, 0]}>
        <boxGeometry args={[0.01, 0.06, 0.3]} />
        <meshStandardMaterial color="#6b5440" />
      </mesh>
      <mesh position={[0, 1.53 - h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {shape === "buttondown" && (
        <mesh position={[0, 1.47, 0]}>
          <boxGeometry args={[w + 0.01, 0.06, 0.2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

export function Rack({ fixture }: { fixture: FixtureId }) {
  const lay = FIXTURE_LAYOUT[fixture];
  const stock = useGame((s) => s.stock);
  const items = useMemo(() => visibleItems(stock, fixture), [stock, fixture]);
  const half = lay.w / 2 - 0.05;
  const spacing = 0.18;
  const start = -((items.length - 1) * spacing) / 2;
  const info = FIXTURES[fixture];
  return (
    <group position={[lay.x, 0, lay.z]}>
      {[-half, half].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.81, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 1.62, 10]} />
            <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.08, 0.04, lay.d]} />
            <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.6, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, lay.w - 0.1, 10]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
      </mesh>
      {items.map((id, i) => {
        const p = productById(id);
        if (!p) return null;
        return <Garment key={i} shape={p.shape} color={shade(p.color, i)} x={start + i * spacing} />;
      })}
      <Sign text={info.label} position={[0, 1.86, 0]} w={1.5} h={0.3} bg={info.gender === "women" ? "#c9675a" : "#3f5b6e"} />
    </group>
  );
}

function CaseItem({ shape, color, position }: { shape: ItemShape; color: string; position: [number, number, number] }) {
  const metal = <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />;
  switch (shape) {
    case "necklace":
      return (
        <group position={position}>
          <mesh rotation-x={-Math.PI / 2}>
            <torusGeometry args={[0.07, 0.008, 6, 24]} />
            {metal}
          </mesh>
          <mesh position={[0, 0.01, 0.07]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial color="#d9806b" />
          </mesh>
        </group>
      );
    case "earrings":
      return (
        <group position={position}>
          {[-0.03, 0.03].map((x) => (
            <mesh key={x} position={[x, 0.015, 0]}>
              <sphereGeometry args={[0.018, 10, 8]} />
              {metal}
            </mesh>
          ))}
        </group>
      );
    case "scarf":
      return (
        <mesh position={[position[0], position[1] + 0.02, position[2]]} castShadow>
          <boxGeometry args={[0.18, 0.04, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      );
    case "purse":
      return (
        <group position={position}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.16, 0.11, 0.07]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <torusGeometry args={[0.05, 0.008, 6, 14, Math.PI]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case "watch":
      return (
        <group position={position}>
          <mesh rotation-x={-Math.PI / 2}>
            <torusGeometry args={[0.05, 0.012, 8, 20]} />
            <meshStandardMaterial color="#5a4030" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.02, 0.05]} rotation-x={-Math.PI / 2}>
            <cylinderGeometry args={[0.025, 0.025, 0.012, 16]} />
            {metal}
          </mesh>
        </group>
      );
    case "sunglasses":
      return (
        <group position={position}>
          {[-0.045, 0.045].map((x) => (
            <mesh key={x} position={[x, 0.025, 0]} rotation-x={-0.3}>
              <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
              <meshStandardMaterial color={color} metalness={0.4} roughness={0.15} />
            </mesh>
          ))}
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.03, 0.008, 0.008]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

export function DisplayCase({ fixture }: { fixture: FixtureId }) {
  const lay = FIXTURE_LAYOUT[fixture];
  const stock = useGame((s) => s.stock);
  const level = useGame((s) => levelInfo(s.xp).level);
  const info = FIXTURES[fixture];
  const locked = level < info.unlockLevel;
  const items = useMemo(() => visibleItems(stock, fixture, 10), [stock, fixture]);
  return (
    <group position={[lay.x, 0, lay.z]}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[lay.w, 0.8, lay.d]} />
        <meshStandardMaterial color="#f4ede2" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[lay.w + 0.02, 0.12, lay.d + 0.02]} />
        <meshStandardMaterial color="#a7754c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.81, 0]}>
        <boxGeometry args={[lay.w - 0.06, 0.02, lay.d - 0.06]} />
        <meshStandardMaterial color="#efe0d6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.99, 0]}>
        <boxGeometry args={[lay.w, 0.36, lay.d]} />
        <meshStandardMaterial color="#dff0f2" transparent opacity={0.22} roughness={0.05} metalness={0.1} depthWrite={false} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * lay.w) / 2, 0.99, (sz * lay.d) / 2]}>
            <boxGeometry args={[0.03, 0.37, 0.03]} />
            <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
          </mesh>
        )),
      )}
      {items.map((id, i) => {
        const p = productById(id);
        if (!p) return null;
        const col = i % 5;
        const row = Math.floor(i / 5);
        return <CaseItem key={i} shape={p.shape} color={p.color} position={[-0.8 + col * 0.4, 0.83, -0.15 + row * 0.3]} />;
      })}
      {locked ? (
        <Sign text={`Accessories · Level ${info.unlockLevel}`} position={[0, 1.42, 0]} w={1.7} h={0.3} bg="#8c8279" />
      ) : (
        <Sign text={info.label} position={[0, 1.42, 0]} w={1.9} h={0.3} bg={info.gender === "women" ? "#c9675a" : "#3f5b6e"} />
      )}
    </group>
  );
}

export function Counter() {
  return (
    <group position={[COUNTER.x, 0, COUNTER.z]}>
      <mesh position={[0, 0.475, 0]} castShadow receiveShadow>
        <boxGeometry args={[COUNTER.w, 0.95, COUNTER.d]} />
        <meshStandardMaterial color="#f6efe4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow>
        <boxGeometry args={[COUNTER.w + 0.1, 0.06, COUNTER.d + 0.1]} />
        <meshStandardMaterial color="#a7754c" roughness={0.45} />
      </mesh>
      {/* fluted front panel */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-1.35 + i * 0.225, 0.47, COUNTER.d / 2 + 0.01]}>
          <boxGeometry args={[0.1, 0.8, 0.02]} />
          <meshStandardMaterial color="#efc7bc" roughness={0.7} />
        </mesh>
      ))}
      <Sign text="Checkout" position={[0, 1.9, 0]} w={1.4} h={0.34} bg="#2f2a2a" />
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.9]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <Register />
      <Model url={MODELS.plantSmall} scale={2.6} position={[1.2, 1.01, 0]} />
      {/* bag stack */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-1.15, 1.03 + i * 0.03, 0.05]} rotation-y={i * 0.2}>
          <boxGeometry args={[0.36, 0.025, 0.26]} />
          <meshStandardMaterial color="#e9a294" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Register() {
  return (
    <group position={[REGISTER.x - COUNTER.x, 1.01, REGISTER.z - COUNTER.z]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.46, 0.1, 0.38]} />
        <meshStandardMaterial color="#3a3d42" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.14, -0.05]} castShadow>
        <boxGeometry args={[0.38, 0.08, 0.22]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.4} />
      </mesh>
      <group position={[0, 0.3, -0.08]} rotation-x={0.35}>
        <mesh>
          <boxGeometry args={[0.34, 0.22, 0.03]} />
          <meshStandardMaterial color="#2b2d31" />
        </mesh>
        <mesh position={[0, 0, -0.017]} rotation-y={Math.PI}>
          <planeGeometry args={[0.3, 0.18]} />
          <meshStandardMaterial color="#9fe0c4" emissive="#6fd0a8" emissiveIntensity={0.9} />
        </mesh>
      </group>
      <mesh position={[0, 0.02, 0.2]}>
        <boxGeometry args={[0.4, 0.06, 0.04]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Mirror() {
  return (
    <group position={[MIRROR.x, 0, MIRROR.z]}>
      <mesh position={[0.02, 1.2, 0]} castShadow>
        <boxGeometry args={[0.08, 2.1, 1.05]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.065, 1.2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.9, 1.95]} />
        <meshStandardMaterial color="#e8f0f2" metalness={1} roughness={0.06} />
      </mesh>
      <Sign text="Style Mirror" position={[0.08, 2.45, 0]} w={1.1} h={0.24} bg="#c9675a" />
    </group>
  );
}

export function FittingArea() {
  return (
    <group>
      <Model url={MODELS.sofa} scale={2} position={[-9.5, 0, 1.6]} rotation-y={Math.PI / 2} />
      <Model url={MODELS.coatRack} scale={2.4} position={[-9.4, 0, 6.9]} />
      <Model url={MODELS.bench} scale={2.2} position={[-3, 0, -7.5]} />
    </group>
  );
}

// re-export for convenience
export { FIXTURE_CAPACITY };

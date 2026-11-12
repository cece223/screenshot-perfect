import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Appearance } from "../sim/appearance";

export interface MotionSample {
  speed: number;
  carrying: boolean;
}

const EYE = "#2a1d18";
const CHEEK = "#f0978a";

function Mat({ color, rough = 0.75 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} />;
}

function Hair({ look }: { look: Appearance }) {
  const c = look.hairColor;
  const m = <meshStandardMaterial color={c} roughness={0.6} side={THREE.DoubleSide} />;
  const cap = (r: number, theta: number, tilt: number) => (
    <mesh rotation-x={tilt} castShadow>
      <sphereGeometry args={[r, 24, 14, 0, Math.PI * 2, 0, theta]} />
      {m}
    </mesh>
  );
  switch (look.hairStyle) {
    case "buzz":
      return cap(0.247, Math.PI * 0.48, -0.25);
    case "short":
      return (
        <group>
          {cap(0.262, Math.PI * 0.55, -0.32)}
          <mesh position={[0.05, 0.17, 0.15]} rotation={[0.5, 0, -0.3]} scale={[1.4, 0.5, 0.8]}>
            <sphereGeometry args={[0.09, 12, 8]} />
            {m}
          </mesh>
        </group>
      );
    case "bob":
      return (
        <group>
          {cap(0.266, Math.PI * 0.58, -0.25)}
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.268, 0.29, 0.3, 24, 1, true, Math.PI * 0.3, Math.PI * 1.4]} />
            {m}
          </mesh>
        </group>
      );
    case "long":
      return (
        <group>
          {cap(0.266, Math.PI * 0.58, -0.25)}
          <mesh position={[0, -0.22, -0.01]}>
            <cylinderGeometry args={[0.268, 0.3, 0.56, 24, 1, true, Math.PI * 0.32, Math.PI * 1.36]} />
            {m}
          </mesh>
        </group>
      );
    case "ponytail":
      return (
        <group>
          {cap(0.262, Math.PI * 0.56, -0.3)}
          <mesh position={[0, 0.0, -0.3]} rotation-x={0.35} castShadow>
            <capsuleGeometry args={[0.075, 0.28, 4, 10]} />
            {m}
          </mesh>
        </group>
      );
    case "bun":
      return (
        <group>
          {cap(0.262, Math.PI * 0.56, -0.3)}
          <mesh position={[0, 0.24, -0.1]} castShadow>
            <sphereGeometry args={[0.12, 16, 12]} />
            {m}
          </mesh>
        </group>
      );
    case "curly":
      return (
        <group>
          {cap(0.275, Math.PI * 0.56, -0.3)}
          {Array.from({ length: 11 }, (_, i) => {
            const a = 0.75 + (i / 10) * (Math.PI * 2 - 1.5);
            return (
              <mesh key={i} position={[Math.sin(a) * 0.24, 0.06 + (i % 2) * 0.08, Math.cos(a) * 0.24]}>
                <sphereGeometry args={[0.105, 10, 8]} />
                {m}
              </mesh>
            );
          })}
          <mesh position={[0, 0.24, -0.02]}>
            <sphereGeometry args={[0.15, 12, 10]} />
            {m}
          </mesh>
        </group>
      );
  }
}

function Leg({ look, side, legRef }: { look: Appearance; side: 1 | -1; legRef: React.RefObject<THREE.Group | null> }) {
  const shoe =
    look.shoes === "boots" ? (
      <mesh position={[0, -0.64, 0.02]} castShadow>
        <boxGeometry args={[0.17, 0.28, 0.24]} />
        <Mat color={look.shoeColor} rough={0.5} />
      </mesh>
    ) : look.shoes === "sandals" ? (
      <group position={[0, -0.76, 0.04]}>
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[0.15, 0.035, 0.27]} />
          <Mat color={look.shoeColor} />
        </mesh>
        <mesh position={[0, 0.02, 0.01]}>
          <boxGeometry args={[0.13, 0.06, 0.22]} />
          <Mat color={look.skin} />
        </mesh>
        <mesh position={[0, 0.05, 0.05]}>
          <boxGeometry args={[0.15, 0.02, 0.05]} />
          <Mat color={look.shoeColor} />
        </mesh>
      </group>
    ) : (
      <group position={[0, -0.74, 0.04]}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.11, 0.27]} />
          <Mat color={look.shoeColor} rough={0.6} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.165, 0.03, 0.275]} />
          <Mat color="#f7f3ec" />
        </mesh>
      </group>
    );
  return (
    <group ref={legRef} position={[side * 0.105, 0.8, 0]}>
      {look.bottom === "jeans" ? (
        <mesh position={[0, -0.36, 0]} castShadow>
          <capsuleGeometry args={[0.088, 0.56, 4, 10]} />
          <Mat color={look.bottomColor} />
        </mesh>
      ) : look.bottom === "shorts" ? (
        <>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.14, 4, 10]} />
            <Mat color={look.bottomColor} />
          </mesh>
          <mesh position={[0, -0.45, 0]}>
            <capsuleGeometry args={[0.072, 0.38, 4, 10]} />
            <Mat color={look.skin} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, -0.38, 0]}>
          <capsuleGeometry args={[0.072, 0.54, 4, 10]} />
          <Mat color={look.skin} />
        </mesh>
      )}
      {shoe}
    </group>
  );
}

function Arm({ look, side, armRef }: { look: Appearance; side: 1 | -1; armRef: React.RefObject<THREE.Group | null> }) {
  const upper = look.top === "tank" ? look.skin : look.topColor;
  const fore = look.top === "longsleeve" || look.top === "hoodie" ? look.topColor : look.skin;
  return (
    <group ref={armRef} position={[side * 0.29, 1.33, 0]} rotation-z={side * 0.08}>
      <mesh position={[0, -0.14, 0]} castShadow>
        <capsuleGeometry args={[look.top === "tank" ? 0.056 : 0.066, 0.2, 4, 10]} />
        <Mat color={upper} />
      </mesh>
      <mesh position={[0, -0.36, 0]}>
        <capsuleGeometry args={[0.058, 0.2, 4, 10]} />
        <Mat color={fore} />
      </mesh>
      <mesh position={[0, -0.52, 0]}>
        <sphereGeometry args={[0.066, 12, 10]} />
        <Mat color={look.skin} />
      </mesh>
    </group>
  );
}

/** Stylized procedural shopper. Each body part is its own mesh so every look option recolors cleanly. */
export function Character({ look, sample }: { look: Appearance; sample: () => MotionSample }) {
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const bag = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * 6);
  const t = useRef(0);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const m = sample();
    const k = Math.min(m.speed / 1.6, 1);
    t.current += dt;
    if (k > 0.05) phase.current += dt * (5 + m.speed * 2.6);
    const s = Math.sin(phase.current) * k;
    if (legL.current) legL.current.rotation.x = s * 0.7;
    if (legR.current) legR.current.rotation.x = -s * 0.7;
    if (armL.current) armL.current.rotation.x = -s * 0.6;
    if (armR.current) armR.current.rotation.x = m.carrying ? -0.25 + s * 0.15 : s * 0.6;
    if (body.current) body.current.position.y = Math.abs(Math.cos(phase.current)) * 0.045 * k + Math.sin(t.current * 2) * 0.006;
    if (bag.current) bag.current.visible = m.carrying;
  });

  const torsoR = look.top === "hoodie" ? 0.205 : 0.19;
  return (
    <group ref={body}>
      <Leg look={look} side={-1} legRef={legL} />
      <Leg look={look} side={1} legRef={legR} />
      {/* hips */}
      <mesh position={[0, 0.84, 0]} castShadow>
        <boxGeometry args={[0.38, 0.16, 0.24]} />
        <Mat color={look.bottomColor} />
      </mesh>
      {look.bottom === "skirt" && (
        <mesh position={[0, 0.66, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.33, 0.38, 20]} />
          <Mat color={look.bottomColor} />
        </mesh>
      )}
      {/* torso */}
      <mesh position={[0, 1.13, 0]} scale={[1.12, 1, 0.78]} castShadow>
        <capsuleGeometry args={[torsoR, 0.26, 6, 16]} />
        <Mat color={look.topColor} />
      </mesh>
      {look.top === "hoodie" && (
        <>
          <mesh position={[0, 1.38, -0.13]} scale={[1.25, 0.75, 0.75]}>
            <sphereGeometry args={[0.17, 14, 10]} />
            <Mat color={look.topColor} />
          </mesh>
          <mesh position={[0, 1.0, 0.15]}>
            <boxGeometry args={[0.24, 0.1, 0.02]} />
            <Mat color={look.topColor} rough={0.9} />
          </mesh>
        </>
      )}
      {look.top === "longsleeve" && (
        <mesh position={[0, 1.34, 0.12]} rotation-x={-0.4}>
          <torusGeometry args={[0.075, 0.018, 6, 16]} />
          <Mat color="#f7f3ec" />
        </mesh>
      )}
      <Arm look={look} side={-1} armRef={armL} />
      <Arm look={look} side={1} armRef={armR} />
      {/* shopping bag rides on the right arm */}
      <group>
        <group position={[0.29, 1.33, 0]}>
          <group ref={bag} position={[0.02, -0.72, 0.06]} visible={false}>
            <mesh castShadow>
              <boxGeometry args={[0.24, 0.28, 0.1]} />
              <Mat color="#e9a294" rough={0.9} />
            </mesh>
            <mesh position={[0, 0.17, 0]}>
              <torusGeometry args={[0.06, 0.01, 6, 14, Math.PI]} />
              <Mat color="#8a4b3c" />
            </mesh>
          </group>
        </group>
      </group>
      {/* neck + head */}
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.066, 0.07, 0.12, 12]} />
        <Mat color={look.skin} />
      </mesh>
      <group position={[0, 1.66, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.24, 24, 18]} />
          <Mat color={look.skin} rough={0.6} />
        </mesh>
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <mesh position={[sx * 0.085, 0.01, 0.215]}>
              <sphereGeometry args={[0.03, 10, 8]} />
              <meshStandardMaterial color={EYE} roughness={0.3} />
            </mesh>
            <mesh position={[sx * 0.14, -0.06, 0.18]}>
              <sphereGeometry args={[0.038, 10, 8]} />
              <meshStandardMaterial color={CHEEK} transparent opacity={0.45} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.08, 0.222]} rotation={[0.2, 0, Math.PI]}>
          <torusGeometry args={[0.035, 0.01, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#9c4a3c" />
        </mesh>
        <Hair look={look} />
      </group>
    </group>
  );
}

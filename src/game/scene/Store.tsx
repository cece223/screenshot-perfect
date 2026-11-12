import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { FLOORS, WALLPAPERS, type StyleOption } from "../sim/catalog";
import { DOOR, OFFICE, STORE } from "../sim/layout";
import { useGame } from "../store";
import { getWorld } from "../world";
import { surfaceTexture } from "./textures";
import { Sign } from "./Fixtures";

const TRIM = "#fbf6ee";
const EXTERIOR = "#efe4d4";

function useSurface(opt: StyleOption | undefined, w: number, h: number) {
  return useMemo(() => {
    if (!opt) return null;
    const t = surfaceTexture(opt).clone();
    t.needsUpdate = true;
    t.repeat.set(w / 2, h / 2);
    return t;
  }, [opt, w, h]);
}

function WallPanel({ w, h, position, rotation = 0, opt }: { w: number; h: number; position: [number, number, number]; rotation?: number; opt: StyleOption | undefined }) {
  const tex = useSurface(opt, w, h);
  return (
    <mesh position={position} rotation-y={rotation} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} roughness={0.85} />
    </mesh>
  );
}

export function StoreShell() {
  const wallId = useGame((s) => s.wallpaper);
  const floorId = useGame((s) => s.floor);
  const wall = WALLPAPERS.find((w) => w.id === wallId) ?? WALLPAPERS[0];
  const floor = FLOORS.find((f) => f.id === floorId) ?? FLOORS[0];
  const W = STORE.maxX - STORE.minX;
  const D = STORE.maxZ - STORE.minZ;
  const H = STORE.wallHeight;
  const floorTex = useSurface(floor, W, D);
  const awning = useMemo(() => {
    const t = surfaceTexture({ id: "awning", name: "", surface: "wall", cost: 0, pattern: "stripes", colors: ["#fbf1e4", "#d9806b"] }).clone();
    t.needsUpdate = true;
    t.repeat.set(6, 1);
    return t;
  }, []);

  return (
    <group>
      {/* street & sidewalk */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 14]} receiveShadow>
        <planeGeometry args={[80, 14]} />
        <meshStandardMaterial color="#d9d2c6" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#cbd9c0" roughness={1} />
      </mesh>
      {/* sales floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floorTex} roughness={0.55} />
      </mesh>

      {/* interior wall faces */}
      <WallPanel opt={wall} w={W} h={H} position={[0, H / 2, STORE.minZ + 0.01]} />
      <WallPanel opt={wall} w={D} h={H} position={[STORE.minX + 0.01, H / 2, 0]} rotation={Math.PI / 2} />
      <WallPanel opt={wall} w={D} h={H} position={[STORE.maxX - 0.01, H / 2, 0]} rotation={-Math.PI / 2} />
      {/* wall shells (exterior) */}
      <mesh position={[0, H / 2, STORE.minZ - 0.11]} castShadow>
        <boxGeometry args={[W + 0.4, H, 0.2]} />
        <meshStandardMaterial color={EXTERIOR} />
      </mesh>
      {[STORE.minX - 0.11, STORE.maxX + 0.11].map((x) => (
        <mesh key={x} position={[x, H / 2, 0]} castShadow>
          <boxGeometry args={[0.2, H, D + 0.2]} />
          <meshStandardMaterial color={EXTERIOR} />
        </mesh>
      ))}
      {/* baseboards + crown */}
      <mesh position={[0, 0.06, STORE.minZ + 0.03]}>
        <boxGeometry args={[W, 0.12, 0.04]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      {[STORE.minX + 0.03, STORE.maxX - 0.03].map((x) => (
        <mesh key={x} position={[x, 0.06, 0]}>
          <boxGeometry args={[0.04, 0.12, D]} />
          <meshStandardMaterial color={TRIM} />
        </mesh>
      ))}
      <mesh position={[0, H - 0.05, STORE.minZ + 0.05]}>
        <boxGeometry args={[W, 0.1, 0.1]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>

      <Storefront awning={awning} />
      <Sign text="Bloom Boutique" position={[-3, 2.55, STORE.minZ + 0.03]} w={3.6} h={0.6} bg="#2f2a2a" fg="#f0d27a" />
      <OfficeWalls />
    </group>
  );
}

function Storefront({ awning }: { awning: THREE.Texture }) {
  const z = STORE.maxZ;
  const H = STORE.wallHeight;
  const sills = [
    { x0: STORE.minX, x1: DOOR.minX },
    { x0: DOOR.maxX, x1: STORE.maxX },
  ];
  return (
    <group>
      {sills.map(({ x0, x1 }) => {
        const w = x1 - x0;
        const cx = (x0 + x1) / 2;
        const posts = Math.round(w / 2.2);
        return (
          <group key={x0}>
            <mesh position={[cx, 0.4, z]} castShadow receiveShadow>
              <boxGeometry args={[w, 0.8, 0.25]} />
              <meshStandardMaterial color="#d9806b" roughness={0.7} />
            </mesh>
            <mesh position={[cx, 1.85, z]}>
              <boxGeometry args={[w, 2.1, 0.04]} />
              <meshStandardMaterial color="#cfe6ea" transparent opacity={0.16} roughness={0.05} depthWrite={false} />
            </mesh>
            {Array.from({ length: posts + 1 }, (_, i) => (
              <mesh key={i} position={[x0 + (i * w) / posts, 1.85, z]}>
                <boxGeometry args={[0.07, 2.1, 0.08]} />
                <meshStandardMaterial color="#2f2a2a" />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* header beam */}
      <mesh position={[0, H - 0.15, z]} castShadow>
        <boxGeometry args={[STORE.maxX - STORE.minX + 0.4, 0.3, 0.3]} />
        <meshStandardMaterial color="#2f2a2a" />
      </mesh>
      {/* door frame */}
      {[DOOR.minX, DOOR.maxX].map((x) => (
        <mesh key={x} position={[x, 1.5, z]}>
          <boxGeometry args={[0.12, 3, 0.3]} />
          <meshStandardMaterial color="#2f2a2a" />
        </mesh>
      ))}
      {/* striped awning */}
      <mesh position={[0, H + 0.05, z + 0.75]} rotation-x={-1.15}>
        <planeGeometry args={[STORE.maxX - STORE.minX + 0.4, 1.7]} />
        <meshStandardMaterial map={awning} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      {/* doormat */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, z - 0.6]}>
        <planeGeometry args={[2.2, 0.9]} />
        <meshStandardMaterial color="#6b4f3a" roughness={1} />
      </mesh>
    </group>
  );
}

/** Office partition walls turn see-through while you're inside the office. */
function OfficeWalls() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e7ddd0", roughness: 0.8 }), []);
  useFrame((_, dt) => {
    const p = getWorld().player;
    const inside = p.x > OFFICE.minX && p.z < OFFICE.maxZ + 0.4;
    const target = inside ? 0.22 : 1;
    mat.opacity += (target - mat.opacity) * Math.min(1, dt * 6);
    const tr = mat.opacity < 0.99;
    if (tr !== mat.transparent) {
      mat.transparent = tr;
      mat.depthWrite = !tr;
      mat.needsUpdate = true;
    }
  });
  const H = OFFICE.wallHeight;
  const segs: { x: number; z: number; w: number; d: number; h?: number; y?: number }[] = [
    { x: OFFICE.minX, z: (OFFICE.minZ + OFFICE.maxZ) / 2, w: 0.16, d: OFFICE.maxZ - OFFICE.minZ },
    { x: (OFFICE.minX + OFFICE.doorMinX) / 2, z: OFFICE.maxZ, w: OFFICE.doorMinX - OFFICE.minX, d: 0.16 },
    { x: (OFFICE.doorMaxX + OFFICE.maxX) / 2, z: OFFICE.maxZ, w: OFFICE.maxX - OFFICE.doorMaxX, d: 0.16 },
    { x: (OFFICE.doorMinX + OFFICE.doorMaxX) / 2, z: OFFICE.maxZ, w: OFFICE.doorMaxX - OFFICE.doorMinX, d: 0.16, h: 0.35, y: H - 0.175 },
  ];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[(OFFICE.minX + OFFICE.maxX) / 2, 0.004, (OFFICE.minZ + OFFICE.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[OFFICE.maxX - OFFICE.minX, OFFICE.maxZ - OFFICE.minZ]} />
        <meshStandardMaterial color="#b8c6c2" roughness={1} />
      </mesh>
      {segs.map((s, i) => (
        <mesh key={i} position={[s.x, s.y ?? (s.h ?? H) / 2, s.z]} material={mat} castShadow>
          <boxGeometry args={[s.w, s.h ?? H, s.d]} />
        </mesh>
      ))}
      <Sign text="Office" position={[(OFFICE.doorMinX + OFFICE.doorMaxX) / 2, H + 0.22, OFFICE.maxZ]} w={1.1} h={0.28} bg="#3f5b6e" />
    </group>
  );
}

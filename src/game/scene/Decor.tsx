import { useMemo } from "react";
import { useGame } from "../store";
import { STORE } from "../sim/layout";
import { Model } from "./Model";
import { MODELS } from "./models";
import { artTexture } from "./textures";

function Frame({ position, rotation = 0, seed, w = 1, h = 1.2 }: { position: [number, number, number]; rotation?: number; seed: number; w?: number; h?: number }) {
  const tex = useMemo(() => artTexture(seed), [seed]);
  return (
    <group position={position} rotation-y={rotation}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.05]} />
        <meshStandardMaterial color="#c9a25e" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

const LAMPS: [number, number][] = [
  [-9.4, -3.3],
  [-9.4, 3.6],
  [4.3, -2.5],
  [9.4, 6.6],
];

export function Decor() {
  const owned = useGame((s) => s.decorOwned);
  const has = (id: string) => owned.includes(id);
  return (
    <group>
      {has("wallArt") && (
        <group>
          <Frame seed={11} position={[-8.2, 1.8, STORE.minZ + 0.04]} />
          <Frame seed={23} position={[2.3, 1.8, STORE.minZ + 0.04]} w={1.4} h={1} />
          <Frame seed={37} position={[STORE.minX + 0.04, 1.8, -2.4]} rotation={Math.PI / 2} />
          <Frame seed={41} position={[STORE.maxX - 0.04, 1.8, 0.2]} rotation={-Math.PI / 2} w={1.4} h={1} />
        </group>
      )}
      {has("plants") && (
        <group>
          {[
            [-9.3, -7.3],
            [4.3, -7.3],
            [-9.3, 7.4],
            [9.3, 7.4],
            [-2.3, 7.4],
            [2.3, 7.4],
          ].map(([x, z]) => (
            <Model key={`${x}${z}`} url={MODELS.plant} scale={2.6} position={[x!, 0, z!]} />
          ))}
        </group>
      )}
      {has("rugRound") && <Model url={MODELS.rugRound} scale={3} position={[-8, 0.012, 5.2]} />}
      {has("rugRunner") && <Model url={MODELS.rugRect} scale={2.4} position={[0, 0.012, 6.3]} />}
      {has("lighting") && (
        <group>
          {LAMPS.map(([x, z]) => (
            <group key={`${x}${z}`}>
              <Model url={MODELS.lamp} scale={2.2} position={[x, 0, z]} />
              <pointLight position={[x, 1.8, z]} color="#ffc98a" intensity={6} distance={7} decay={1.6} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

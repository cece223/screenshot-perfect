import { useMemo } from "react";
import { DESK } from "../sim/layout";
import { Model } from "./Model";
import { MODELS } from "./models";
import { labelTexture } from "./textures";

export function OfficeFurniture() {
  const screenTex = useMemo(() => labelTexture("Bloom Supply Co.", { bg: "#d9806b", fg: "#fbf1e4", w: 512, h: 320 }), []);
  const top = 0.84;
  return (
    <group>
      <Model url={MODELS.desk} scale={2.18} position={[DESK.x, 0, DESK.z]} />
      <group position={[DESK.x, top, DESK.z - 0.12]}>
        <Model url={MODELS.screen} scale={1.8} />
        <mesh position={[0, 0.3, 0.1]}>
          <planeGeometry args={[0.62, 0.36]} />
          <meshStandardMaterial map={screenTex} emissive="#ffffff" emissiveMap={screenTex} emissiveIntensity={0.55} />
        </mesh>
      </group>
      <Model url={MODELS.keyboard} scale={1.8} position={[DESK.x, top, DESK.z + 0.22]} />
      <Model url={MODELS.chair} scale={1.9} position={[DESK.x, 0, DESK.z + 0.95]} rotation-y={Math.PI} />
      <Model url={MODELS.bookcase} scale={2.5} position={[5.9, 0, -7.55]} />
      <Model url={MODELS.box} scale={2.4} position={[9.4, 0, -4.1]} rotation-y={0.3} />
      <Model url={MODELS.box} scale={2.4} position={[9.45, 0, -4.75]} rotation-y={-0.2} />
      <Model url={MODELS.box} scale={2.4} position={[9.4, 0.67, -4.4]} rotation-y={0.1} />
      <Model url={MODELS.plant} scale={2.4} position={[9.5, 0, -7.5]} />
    </group>
  );
}

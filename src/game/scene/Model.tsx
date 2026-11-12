import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

/**
 * Clone a cached GLB, swap unlit materials for lit ones (so the room lighting applies),
 * then normalize once: centred on XZ, feet at y = 0, uniform scale.
 */
export function useModel(url: string, scale: number) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const convert = (m: THREE.Material) => {
        const src = m as THREE.MeshStandardMaterial;
        return new THREE.MeshStandardMaterial({
          color: src.color ? src.color.clone() : new THREE.Color("#ffffff"),
          map: src.map ?? null,
          roughness: 0.75,
          metalness: 0.05,
        });
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    const box = new THREE.Box3().setFromObject(clone);
    const c = box.getCenter(new THREE.Vector3());
    clone.position.set(-c.x, -box.min.y, -c.z);
    const g = new THREE.Group();
    g.add(clone);
    g.scale.setScalar(scale);
    return g;
  }, [scene, scale]);
}

export function Model({ url, scale = 1, ...props }: { url: string; scale?: number } & ThreeElements["group"]) {
  const obj = useModel(url, scale);
  return (
    <group {...props}>
      <primitive object={obj} />
    </group>
  );
}

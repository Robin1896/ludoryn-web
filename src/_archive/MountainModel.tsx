"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";

// Custom mountain model (Draco compressed)
const MODEL_URL = "/models/mountain-custom.glb";

useGLTF.preload(MODEL_URL);

export default function MountainModel({
  scale = 1,
  position,
}: {
  scale?: number;
  position?: [number, number, number];
}) {
  const { scene } = useGLTF(MODEL_URL);

  // Zet flatShading aan voor low-poly look
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            (m as THREE.MeshStandardMaterial).flatShading = true;
            m.needsUpdate = true;
          });
        } else {
          (mesh.material as THREE.MeshStandardMaterial).flatShading = true;
          mesh.material.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  return (
    <primitive
      object={scene.clone()}
      scale={[scale, scale, scale]}
      position={position ?? [0, 0, 0]}
    />
  );
}

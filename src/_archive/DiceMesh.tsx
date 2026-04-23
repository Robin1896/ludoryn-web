"use client";

import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";

// Bounding box uit GLB: X[-160.79..-60.39], Y[0..100.13], Z[-60.23..40.17]
// Center: (-110.59, 50.07, -10.03) | Size: ~100 units
// Schalen naar DICE_SIZE (0.42 units)
const RAW_SIZE = 100.13;
export const DICE_SIZE = 0.42;
const MODEL_SCALE = DICE_SIZE / RAW_SIZE;
const MODEL_OFFSET: [number, number, number] = [110.59, -50.07, 10.03];

// Standaard dobbelsteen face-normalen:
//   +Y = 6  |  -Y = 1
//   +Z = 2  |  -Z = 5
//   +X = 3  |  -X = 4
export function readFaceUp(quat: THREE.Quaternion): number {
  const faces: [number, THREE.Vector3][] = [
    [6, new THREE.Vector3( 0,  1,  0)],
    [1, new THREE.Vector3( 0, -1,  0)],
    [2, new THREE.Vector3( 0,  0,  1)],
    [5, new THREE.Vector3( 0,  0, -1)],
    [3, new THREE.Vector3( 1,  0,  0)],
    [4, new THREE.Vector3(-1,  0,  0)],
  ];
  let best = 1, bestY = -Infinity;
  for (const [val, n] of faces) {
    const y = n.clone().applyQuaternion(quat).y;
    if (y > bestY) { bestY = y; best = val; }
  }
  return best;
}

interface DiceMeshProps {
  bodyColor?: string; // overschrijft de witte basiskleur van het model
}

export default function DiceMesh({ bodyColor }: DiceMeshProps = {}) {
  const { scene } = useGLTF("/models/dice.glb");

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          mat.transparent = false;
          mat.opacity = 1;
          mat.side = THREE.DoubleSide;
          mat.depthWrite = true;
          mat.needsUpdate = true;
        });
      }
    });
    return clone;
  }, [scene]);

  // Pas bodyColor toe op het hoofdmateriaal ('01___Default')
  useMemo(() => {
    if (!bodyColor) return;
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat.name === '01___Default') {
            (mat as THREE.MeshStandardMaterial).color.set(bodyColor);
            mat.needsUpdate = true;
          }
        });
      }
    });
  }, [cloned, bodyColor]);

  return (
    <group scale={MODEL_SCALE}>
      <group position={MODEL_OFFSET}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/dice.glb");

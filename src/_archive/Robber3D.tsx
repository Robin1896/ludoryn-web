"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Robber3D({ x, z }: { x: number; z: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = 0.45 + Math.sin(state.clock.elapsedTime * 2) * 0.04;
  });

  return (
    <group ref={groupRef} position={[x, 0.45, z]}>
      {/* Mantel / lichaam */}
      <mesh castShadow>
        <coneGeometry args={[0.18, 0.42, 8]} />
        <meshLambertMaterial color="#1a0a00" flatShading />
      </mesh>
      {/* Hoofd */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshLambertMaterial color="#2a1408" flatShading />
      </mesh>
      {/* Hoed */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <coneGeometry args={[0.14, 0.18, 8]} />
        <meshLambertMaterial color="#0a0402" flatShading />
      </mesh>
      {/* Ogen — oranje gloed */}
      <mesh position={[-0.045, 0.27, 0.09]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>
      <mesh position={[0.045, 0.27, 0.09]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>
    </group>
  );
}

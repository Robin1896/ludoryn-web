"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface NumberTokenProps {
  position: [number, number, number];
  number: number;
}

const isHot = (n: number) => n === 6 || n === 8;

const DOTS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

export default function NumberToken({ position, number }: NumberTokenProps) {
  const hot   = isHot(number);
  const dots  = DOTS[number] ?? 0;
  const color = hot ? "#cc2222" : "#1a1a1a";
  const [x, y, z] = position;
  const groupRef = useRef<THREE.Group>(null);

  // Draai alleen om Y-as naar de camera
  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    const dx = camera.position.x - x;
    const dz = camera.position.z - z;
    groupRef.current.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <group ref={groupRef} position={[x, y + 0.18, z]}>
      {/* Schijfje plat */}
      <mesh>
        <cylinderGeometry args={[0.32, 0.32, 0.06, 16]} />
        <meshLambertMaterial color="#f5ead0" />
      </mesh>

      {/* Getal */}
      <Text
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color={color}
        fontWeight={hot ? "bold" : "normal"}
        anchorX="center"
        anchorY="middle"
      >
        {String(number)}
      </Text>

      {/* Stippen */}
      {Array.from({ length: dots }).map((_, i) => {
        const offset = (i - (dots - 1) / 2) * 0.075;
        return (
          <mesh key={i} position={[offset, 0.05, 0.11]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.025, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

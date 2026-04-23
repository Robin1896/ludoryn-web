"use client";

import { PLAYER_COLORS } from "@/lib/game";

interface Settlement3DProps {
  x: number;
  z: number;
  player: number;
  type: "village" | "city";
}

export default function Settlement3D({ x, z, player, type }: Settlement3DProps) {
  const color = PLAYER_COLORS[player];

  if (type === "city") {
    return (
      <group position={[x, 0.15, z]}>
        {/* Breed fundament */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.23, 0.15, 6]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* Toren */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.28, 6]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {/* Plat dak */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.14, 0.12, 0.04, 6]} />
          <meshLambertMaterial color="#ffffff" flatShading />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0.15, z]}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.22, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.17, 0.22, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

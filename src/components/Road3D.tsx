"use client";

import type { Edge } from "@/lib/vertices";
import { PLAYER_COLORS } from "@/lib/game";

interface Road3DProps {
  edge: Edge;
  player: number;
}

export default function Road3D({ edge, player }: Road3DProps) {
  const color = PLAYER_COLORS[player];
  return (
    <mesh position={[edge.mx, 0.07, edge.mz]} rotation={[0, edge.angle, 0]}>
      <boxGeometry args={[edge.length * 0.75, 0.07, 0.13]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

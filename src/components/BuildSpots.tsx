"use client";

import { useState } from "react";
import type { BoardGraph, Edge } from "@/lib/vertices";

interface BuildSpotsProps {
  graph: BoardGraph;
  validSpots: string[];
  buildMode: "settlement" | "road" | "city";
  onPlace: (key: string) => void;
  playerColor: string;
}

function SettlementSpot({
  vkey,
  x,
  z,
  playerColor,
  onPlace,
}: {
  vkey: string;
  x: number;
  z: number;
  playerColor: string;
  onPlace: (key: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={[x, 0.25, z]}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onPlace(vkey); }}
    >
      {/* Grote onzichtbare hitbox */}
      <mesh>
        <sphereGeometry args={[0.38, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Zichtbare bol */}
      <mesh>
        <sphereGeometry args={[hovered ? 0.22 : 0.15, 8, 8]} />
        <meshLambertMaterial
          color={hovered ? playerColor : "#ffffff"}
          transparent
          opacity={hovered ? 0.95 : 0.6}
        />
      </mesh>
    </group>
  );
}

function RoadSpot({
  edge,
  playerColor,
  onPlace,
}: {
  edge: Edge;
  playerColor: string;
  onPlace: (key: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      position={[edge.mx, 0.07, edge.mz]}
      rotation={[0, edge.angle, 0]}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onPlace(edge.key); }}
    >
      <boxGeometry args={[edge.length * 0.75, 0.07, 0.13]} />
      <meshLambertMaterial
        color={hovered ? playerColor : "#ffffff"}
        transparent
        opacity={hovered ? 0.9 : 0.4}
      />
    </mesh>
  );
}

export default function BuildSpots({
  graph,
  validSpots,
  buildMode,
  onPlace,
  playerColor,
}: BuildSpotsProps) {
  const validSet = new Set(validSpots);

  if (buildMode === "settlement" || buildMode === "city") {
    return (
      <>
        {graph.vertices
          .filter((v) => validSet.has(v.key))
          .map((v) => (
            <SettlementSpot
              key={v.key}
              vkey={v.key}
              x={v.x}
              z={v.z}
              playerColor={playerColor}
              onPlace={onPlace}
            />
          ))}
      </>
    );
  }

  return (
    <>
      {graph.edges
        .filter((e) => validSet.has(e.key))
        .map((e) => (
          <RoadSpot
            key={e.key}
            edge={e}
            playerColor={playerColor}
            onPlace={onPlace}
          />
        ))}
    </>
  );
}

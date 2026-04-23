"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { Suspense, useState } from "react";
import TileModel from "@/components/TileModel";
import HexTile from "@/components/HexTile";

const TILE_COLORS: Record<string, string> = {
  mountains: "#888888",
  hills:     "#c0522a",
  forest:    "#2d6a2d",
  grain:     "#e8c84a",
  pasture:   "#7ec850",
  desert:    "#d4b483",
};

const SLIDER = {
  fontSize: 11,
  color: "rgba(255,255,255,0.5)",
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
};

export default function TileModelPreview({ tileType, seed = 1 }: { tileType: string; seed?: number }) {
  const [scale, setScale] = useState(0.9);
  const [yOffset, setYOffset] = useState(0.28);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas camera={{ position: [3.5, 2.8, 3.5], fov: 50 }} shadows gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[4, 6, 3]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#aabbcc" />

          <HexTile position={[0, 0, 0]} color={TILE_COLORS[tileType] ?? "#888888"} height={0.28} seed={seed} />
          <TileModel type={tileType} scale={scale} position={[0, yOffset, 0]} />

          <ContactShadows position={[0, 0, 0]} opacity={0.35} blur={1.5} far={1} />
          <Environment preset="park" />
          <OrbitControls enablePan={false} minDistance={1.5} maxDistance={6} autoRotate autoRotateSpeed={1.2} />
        </Suspense>
      </Canvas>

      <div style={{
        position: "absolute", bottom: 8, left: 8, right: 8,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        borderRadius: 8, padding: "8px 10px",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: 12,
        pointerEvents: "all",
      }}>
        <div style={SLIDER}>
          <span>Schaal: {scale.toFixed(2)}</span>
          <input type="range" min={0.1} max={2} step={0.05} value={scale}
            onChange={e => setScale(Number(e.target.value))} style={{ width: 90 }} />
        </div>
        <div style={SLIDER}>
          <span>Y-offset: {yOffset.toFixed(2)}</span>
          <input type="range" min={0} max={1} step={0.01} value={yOffset}
            onChange={e => setYOffset(Number(e.target.value))} style={{ width: 90 }} />
        </div>
      </div>
    </div>
  );
}

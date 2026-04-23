"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

export const TILE_MODEL_URLS: Record<string, string> = {
  mountains: "/models/mountain-custom.glb",
  hills:     "/models/hills-custom.glb",
  forest:    "/models/forest-custom.glb",
  grain:     "/models/grain-custom.glb",
  pasture:   "/models/wool-custom.glb",
  desert:    "/models/desert-custom.glb",
};

// Preload all models zodra de module laadt
Object.values(TILE_MODEL_URLS).forEach((url) => useGLTF.preload(url));

export default function TileModel({
  type,
  scale = 0.9,
  position,
  rotation,
}: {
  type: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(TILE_MODEL_URLS[type]);

  // Clone eenmalig per instantie — niet bij elke render
  const clone = useMemo(() => skeletonClone(scene), [scene]);

  return (
    <primitive
      object={clone}
      scale={scale}
      position={position ?? [0, 0, 0]}
      rotation={rotation ?? [0, 0, 0]}
    />
  );
}

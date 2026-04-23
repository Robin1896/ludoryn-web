"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Float } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildLowPolyHex(radius = 1, baseHeight = 0.45, seed = 0): THREE.BufferGeometry {
  const rng = seededRng(seed);
  const sides = 6;
  const halfH = baseHeight / 2;
  const bottomY = -halfH;
  const bumpScale = 0.22;
  const midRadius = radius * 0.52;

  // Buitenring, middenring en centrum
  const topY    = Array.from({ length: sides }, () => halfH + (rng() - 0.4) * bumpScale);
  const midY    = Array.from({ length: sides }, () => halfH + (rng() - 0.3) * bumpScale * 0.8);
  const centerY = halfH + rng() * bumpScale * 0.4;

  const angle = (i: number) => (i / sides) * Math.PI * 2 - Math.PI / 6;

  const positions: number[] = [];

  const addTri = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
  ) => positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);

  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;

    const ex0 = Math.cos(angle(i)) * radius,  ez0 = Math.sin(angle(i)) * radius;
    const ex1 = Math.cos(angle(j)) * radius,  ez1 = Math.sin(angle(j)) * radius;

    const mx0 = Math.cos(angle(i)) * midRadius, mz0 = Math.sin(angle(i)) * midRadius;
    const mx1 = Math.cos(angle(j)) * midRadius, mz1 = Math.sin(angle(j)) * midRadius;

    // Zijvlakken
    addTri(ex0, topY[i], ez0,  ex0, bottomY, ez0,  ex1, topY[j], ez1);
    addTri(ex1, topY[j], ez1,  ex0, bottomY, ez0,  ex1, bottomY, ez1);

    // Bovenvlak: 3 ringen
    addTri(ex0, topY[i], ez0,  ex1, topY[j], ez1,  mx1, midY[j], mz1);
    addTri(ex0, topY[i], ez0,  mx1, midY[j], mz1,  mx0, midY[i], mz0);
    addTri(0, centerY, 0,  mx0, midY[i], mz0,  mx1, midY[j], mz1);

    // Ondervlak
    addTri(0, bottomY, 0,  ex1, bottomY, ez1,  ex0, bottomY, ez0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function LowPolyHex({ color, height, seed }: { color: string; height: number; seed: number }) {
  const geo = useMemo(() => buildLowPolyHex(1, height, seed), [height, seed]);

  return (
    <mesh geometry={geo}>
      <meshLambertMaterial color={color} flatShading side={THREE.DoubleSide} />
    </mesh>
  );
}

interface TilePreviewProps {
  color: string;
  accentColor?: string;
  height?: number;
  seed?: number;
}

export default function TilePreview({ color, accentColor, height = 0.45, seed = 42 }: TilePreviewProps) {
  const accent = accentColor ?? color;

  return (
    <Canvas
      camera={{ position: [2.5, 2.2, 3.5], fov: 40 }}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
    >
      <directionalLight position={[4, 7, 3]} intensity={2.8} color="#fff5e0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 4, -4]} intensity={1.4} color="#a0c8ff" />
      <pointLight position={[0, -0.5, 2]} intensity={1.0} color={accent} distance={7} />
      <hemisphereLight args={["#ffe8c0", "#0d1117", 0.5]} />

      <Float speed={1.0} rotationIntensity={0.12} floatIntensity={0.25}>
        <LowPolyHex color={color} height={height} seed={seed} />
      </Float>

      <ContactShadows position={[0, -0.6, 0]} opacity={0.45} scale={5} blur={2.5} far={1.5} color="#000022" />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.2}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
      />

      <EffectComposer>
        <Bloom intensity={0.3} luminanceThreshold={0.75} luminanceSmoothing={0.5} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}

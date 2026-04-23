"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Float } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

function VillageModel({ color }: { color: string }) {
  return (
    <group position={[0, -0.18, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.28, 0.34, 0.46, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <coneGeometry args={[0.36, 0.46, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

function CityModel({ color }: { color: string }) {
  return (
    <group position={[0, -0.28, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.48, 0.32, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.32, 0.58, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.29, 0.26, 0.08, 6]} />
        <meshLambertMaterial color="#ffffff" flatShading />
      </mesh>
    </group>
  );
}

function RoadModel({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow rotation={[0, Math.PI / 6, 0]}>
        <boxGeometry args={[1.5, 0.14, 0.26]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

interface StructurePreviewProps {
  type: "village" | "city" | "road";
  color: string;
  accentColor?: string;
}

const CAMERA: Record<string, [number, number, number]> = {
  village: [1.4, 1.6, 2.2],
  city:    [1.6, 2.0, 2.6],
  road:    [1.2, 1.2, 2.0],
};

const FOV: Record<string, number> = {
  village: 38,
  city:    38,
  road:    42,
};

export default function StructurePreview({ type, color, accentColor }: StructurePreviewProps) {
  const accent = accentColor ?? color;

  return (
    <Canvas
      camera={{ position: CAMERA[type], fov: FOV[type] }}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <directionalLight position={[4, 7, 3]} intensity={2.6} color="#fff5e0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 4, -4]} intensity={1.2} color="#a0c8ff" />
      <pointLight position={[0, -0.5, 2]} intensity={0.8} color={accent} distance={6} />
      <hemisphereLight args={["#ffe8c0", "#0d1117", 0.5]} />

      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.2}>
        {type === "village" && <VillageModel color={color} />}
        {type === "city"    && <CityModel    color={color} />}
        {type === "road"    && <RoadModel    color={color} />}
      </Float>

      <ContactShadows position={[0, -0.55, 0]} opacity={0.5} scale={5} blur={2.5} far={1.5} color="#000022" />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.4}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.4}
      />

      <EffectComposer>
        <Bloom intensity={0.25} luminanceThreshold={0.8} luminanceSmoothing={0.5} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}

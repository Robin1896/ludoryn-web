"use client";

import { useState, useRef, useMemo, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { LEVELS, getActiveLevel, setActiveLevel, type LevelId, type Level } from "@/lib/levels";
import { BottomNav } from "@/components/ui";

// ─── Pirate 3D Scene ──────────────────────────────────────────────────────────

function PirateLights() {
  return (
    <>
      {/* Dark ambient — moody night */}
      <ambientLight intensity={0.4} color="#1a2a4a" />
      {/* Moonlight — cold blue-white from upper-right */}
      <directionalLight
        position={[15, 20, -10]}
        intensity={1.4}
        color="#c8d8ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {/* Subtle blue fill from below-left */}
      <directionalLight position={[-8, 2, 8]} intensity={0.3} color="#2040a0" />
      {/* Lantern glow — left */}
      <pointLight position={[-2.5, 3.2, 2]} intensity={5} color="#FF8C20" distance={10} decay={2} />
      {/* Lantern glow — right */}
      <pointLight position={[2.5, 3.2, 2]} intensity={5} color="#FFA030" distance={10} decay={2} />
      {/* Dim stern lantern */}
      <pointLight position={[0, 2.5, -6]} intensity={2.5} color="#FF7010" distance={7} decay={2} />
    </>
  );
}

function AnimatedOcean() {
  const geoRef = useRef<THREE.PlaneGeometry>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 120, 48, 48);
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      const wave =
        Math.sin(x * 0.25 + t * 0.9) * 0.45 +
        Math.sin(z * 0.3 - t * 0.7) * 0.3 +
        Math.sin((x * 0.18 + z * 0.12) + t * 1.2) * 0.2 +
        Math.sin(x * 0.5 - t * 1.4) * 0.1;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
      <meshStandardMaterial color="#09213A" roughness={0.15} metalness={0.5} />
    </mesh>
  );
}

// Deep water underneath
function OceanDepth() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#020A14" roughness={1} />
    </mesh>
  );
}

function ShipDeck() {
  const PLANK_COLORS = ["#2E1505", "#3A1A06", "#321608", "#2A1204", "#381807"];
  const GRAIN_COLOR = "#4A2810";

  return (
    <group>
      {/* Deck planks — run along Z (fore to aft) */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = (i - 4) * 0.85;
        return (
          <group key={i}>
            <mesh position={[x, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 0.14, 16]} />
              <meshStandardMaterial color={PLANK_COLORS[i % PLANK_COLORS.length]} roughness={0.9} />
            </mesh>
            {/* Grain line between planks */}
            <mesh position={[x + 0.41, 0.072, 0]}>
              <boxGeometry args={[0.025, 0.001, 16]} />
              <meshStandardMaterial color="#1A0A02" roughness={1} />
            </mesh>
          </group>
        );
      })}

      {/* Hull walls — port and starboard */}
      {[-3.85, 3.85].map((x, side) => (
        <group key={side}>
          {/* Hull wall */}
          <mesh position={[x, 0.9, 0]} castShadow>
            <boxGeometry args={[0.28, 1.9, 16]} />
            <meshStandardMaterial color="#200D04" roughness={0.92} />
          </mesh>
          {/* Top rail */}
          <mesh position={[x, 1.88, 0]} castShadow>
            <boxGeometry args={[0.35, 0.12, 16.2]} />
            <meshStandardMaterial color="#4A2810" roughness={0.8} />
          </mesh>
          {/* Rail posts every 2 units */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} position={[x, 0.9, i * 2 - 7]} castShadow>
              <boxGeometry args={[0.1, 1.9, 0.1]} />
              <meshStandardMaterial color="#3A1A06" roughness={0.88} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Stern (back) cross-beam and slight rise */}
      <mesh position={[0, 0.08, -7.5]} receiveShadow>
        <boxGeometry args={[7.9, 0.3, 1.2]} />
        <meshStandardMaterial color="#2E1505" roughness={0.9} />
      </mesh>
      {/* Bow (front) */}
      <mesh position={[0, 0.08, 7.5]} receiveShadow>
        <boxGeometry args={[7.9, 0.3, 1.2]} />
        <meshStandardMaterial color="#2E1505" roughness={0.9} />
      </mesh>

      {/* Metal reinforcement strips */}
      {[-2, 0, 2].map((z, i) => (
        <mesh key={i} position={[0, 0.075, z]} receiveShadow>
          <boxGeometry args={[7.7, 0.02, 0.08]} />
          <meshStandardMaterial color="#3A4048" roughness={0.6} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Mast() {
  return (
    <group position={[0, 0, -2]}>
      {/* Main mast */}
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, 14, 10]} />
        <meshStandardMaterial color="#2A1005" roughness={0.88} />
      </mesh>
      {/* Cross boom */}
      <mesh position={[0, 9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 7, 8]} />
        <meshStandardMaterial color="#2A1005" roughness={0.88} />
      </mesh>
      {/* Furled sail */}
      <mesh position={[0, 8.2, 0.15]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[6, 0.6, 0.3]} />
        <meshStandardMaterial color="#C8B890" roughness={0.95} />
      </mesh>
      {/* Rope stays — forward */}
      {[-2.5, 0, 2.5].map((x, i) => {
        const len = Math.sqrt(x * x + 100) + 2;
        const angle = Math.atan2(x, 8);
        return (
          <mesh key={i} position={[x * 0.5, 11, 4]} rotation={[0.6, angle * 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, len, 4]} />
            <meshStandardMaterial color="#8A6030" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Rope stays — backward */}
      {[-2, 2].map((x, i) => (
        <mesh key={i} position={[x * 0.4, 9.5, -3.5]} rotation={[-0.7, x * 0.1, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 7, 4]} />
          <meshStandardMaterial color="#8A6030" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function SwingingLantern({ position, phase = 0 }: { position: [number, number, number]; phase?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7 + phase) * 0.08;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Hanging rope */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1, 4]} />
        <meshStandardMaterial color="#8A6030" roughness={0.9} />
      </mesh>
      {/* Lantern body */}
      <group position={[0, -0.15, 0]}>
        <mesh>
          <boxGeometry args={[0.28, 0.38, 0.28]} />
          <meshStandardMaterial color="#3A4048" roughness={0.5} metalness={0.8} />
        </mesh>
        {/* Glass panes — slightly transparent warm */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * Math.PI) / 2;
          return (
            <mesh key={i} position={[Math.sin(angle) * 0.14, 0, Math.cos(angle) * 0.14]} rotation={[0, angle, 0]}>
              <planeGeometry args={[0.22, 0.3]} />
              <meshStandardMaterial color="#FFB030" emissive="#FF8000" emissiveIntensity={2} transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
        {/* Top cap */}
        <mesh position={[0, 0.24, 0]}>
          <coneGeometry args={[0.18, 0.2, 6]} />
          <meshStandardMaterial color="#2A2E34" roughness={0.5} metalness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function TreasureChest({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.9, 0.45, 0.6]} />
        <meshStandardMaterial color="#4A2810" roughness={0.88} />
      </mesh>
      {/* Lid — slightly open */}
      <mesh position={[0, 0.5, -0.25]} rotation={[-0.4, 0, 0]} castShadow>
        <boxGeometry args={[0.9, 0.18, 0.6]} />
        <meshStandardMaterial color="#5A3218" roughness={0.85} />
      </mesh>
      {/* Metal bands */}
      {[-0.3, 0, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.04, 0.48, 0.62]} />
          <meshStandardMaterial color="#5A6068" roughness={0.5} metalness={0.85} />
        </mesh>
      ))}
      {/* Lock */}
      <mesh position={[0, 0.38, 0.31]}>
        <boxGeometry args={[0.1, 0.1, 0.04]} />
        <meshStandardMaterial color="#C8A030" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Gold glow inside */}
      <pointLight position={[0, 0.5, 0]} intensity={1.5} color="#FFD700" distance={2} decay={2} />
    </group>
  );
}

function Cannon({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Barrel */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 1.2, 10]} />
        <meshStandardMaterial color="#2A2E34" roughness={0.4} metalness={0.9} />
      </mesh>
      {/* Carriage */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[1.0, 0.22, 0.45]} />
        <meshStandardMaterial color="#3A1A06" roughness={0.88} />
      </mesh>
      {/* Wheels */}
      {[-0.18, 0.18].map((z, i) => (
        <mesh key={i} position={[-0.35, -0.18, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
          <meshStandardMaterial color="#2A1808" roughness={0.88} />
        </mesh>
      ))}
      {[0.35].map((x, i) => (
        <group key={i}>
          {[-0.18, 0.18].map((z, j) => (
            <mesh key={j} position={[x, -0.18, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
              <meshStandardMaterial color="#2A1808" roughness={0.88} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Anchor() {
  return (
    <group position={[3, 0.1, 6]} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
        <meshStandardMaterial color="#3A4048" roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
        <meshStandardMaterial color="#3A4048" roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[-0.24, -0.08, 0]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshStandardMaterial color="#3A4048" roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[0.24, -0.08, 0]}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshStandardMaterial color="#3A4048" roughness={0.5} metalness={0.85} />
      </mesh>
    </group>
  );
}

function StarField() {
  const positions = useMemo(() => {
    const arr = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 70 + Math.random() * 25;
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 4;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.18} color="#e8f0ff" sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

function Moon() {
  return (
    <group position={[22, 28, -42]}>
      <mesh>
        <sphereGeometry args={[4, 20, 20]} />
        <meshStandardMaterial color="#dce8ff" emissive="#b0c8f8" emissiveIntensity={0.6} roughness={0.9} />
      </mesh>
      {/* Moon halo */}
      <mesh>
        <sphereGeometry args={[5.5, 16, 16]} />
        <meshStandardMaterial color="#b0c0e8" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function RopeCoil({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 0.18;
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0.04, Math.sin(angle) * r]}>
            <torusGeometry args={[0.06, 0.025, 5, 8, Math.PI / 2]} />
            <meshStandardMaterial color="#8A6030" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function HangingRope({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    Math.min(from[1], to[1]) - 0.3,
    (from[2] + to[2]) / 2,
  ];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return (
    <mesh position={mid} rotation={[Math.atan2(Math.sqrt(dx * dx + dz * dz), dy) - Math.PI / 2, Math.atan2(dx, dz), 0]}>
      <cylinderGeometry args={[0.02, 0.02, len * 1.05, 4]} />
      <meshStandardMaterial color="#8A6030" roughness={0.9} />
    </mesh>
  );
}

function PirateScene() {
  return (
    <>
      <fog attach="fog" args={["#050D1A", 18, 65]} />
      <PirateLights />
      <StarField />
      <Moon />
      <AnimatedOcean />
      <OceanDepth />
      <ShipDeck />
      <Mast />

      {/* Lantern rope across mast */}
      <HangingRope from={[-3.7, 2.1, 3]} to={[0, 4.2, -2]} />
      <HangingRope from={[3.7, 2.1, 3]} to={[0, 4.2, -2]} />

      {/* Lanterns */}
      <SwingingLantern position={[-2.5, 3.5, 2]} phase={0} />
      <SwingingLantern position={[2.5, 3.5, 2]} phase={1.4} />
      <SwingingLantern position={[0, 3.2, -5.5]} phase={2.8} />

      {/* Props */}
      <TreasureChest position={[-1.2, 0.08, 3.5]} />
      <Cannon position={[-3.3, 0.1, 1]} rotY={0.1} />
      <Cannon position={[3.3, 0.1, 1]} rotY={-0.1} />
      <Anchor />
      <RopeCoil position={[2.2, 0.08, 5.5]} />
      <RopeCoil position={[-2.6, 0.08, 5.2]} />

      {/* Cannonballs */}
      {(
        [[3.4, 0.1, 3.2], [-3.4, 0.1, -0.5], [3.4, 0.1, -0.8]] as Array<[number, number, number]>
      ).map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#2A2E34" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
    </>
  );
}

// ─── Magie 3D Scene ───────────────────────────────────────────────────────────

function ExplodedModel({ url, position, rotation = [0, 0, 0], scale = 1 }: {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

function FloatingModel({ url, position, rotSpeed = 0.4, floatAmp = 0.12, floatSpeed = 1, scale = 1 }: {
  url: string;
  position: [number, number, number];
  rotSpeed?: number;
  floatAmp?: number;
  floatSpeed?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const ref = useRef<THREE.Group>(null);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * floatSpeed + offset) * floatAmp;
    ref.current.rotation.y += rotSpeed * 0.01;
  });
  return <group ref={ref} position={position} scale={scale}><primitive object={cloned} /></group>;
}

function MagicParticles() {
  const count = 180;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.5 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = Math.random() * 7 + 0.2;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.06;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} color="#d8a8ff" sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

function MagicFloor() {
  return (
    <>
      {/* Stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial color="#1a1225" roughness={0.95} />
      </mesh>
      {/* Glowing magic circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.8, 3.1, 64]} />
        <meshStandardMaterial color="#9f50ff" emissive="#7c20e8" emissiveIntensity={1.5} transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.6, 1.75, 64]} />
        <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={1.2} transparent opacity={0.5} />
      </mesh>
      {/* Pentagram-like inner lines (6 radial lines) */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, angle]} position={[0, 0.012, 0]}>
            <planeGeometry args={[0.03, 2.8]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1} transparent opacity={0.4} />
          </mesh>
        );
      })}
      {/* Outer fade ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[22, 80, 48]} />
        <meshStandardMaterial color="#080410" roughness={1} />
      </mesh>
    </>
  );
}

function MagieLights() {
  return (
    <>
      <ambientLight intensity={0.25} color="#2a1050" />
      {/* Main purple-tinted overhead */}
      <directionalLight position={[5, 14, 8]} intensity={1.0} color="#d8b0ff" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-near={0.1} shadow-camera-far={60}
        shadow-camera-left={-16} shadow-camera-right={16}
        shadow-camera-top={16} shadow-camera-bottom={-16}
      />
      {/* Magic circle glow from below */}
      <pointLight position={[0, 0.3, 0]} intensity={8} color="#9f50ff" distance={12} decay={2} />
      {/* Accent fills */}
      <pointLight position={[-6, 3, 0]} intensity={3} color="#6040c0" distance={10} decay={2} />
      <pointLight position={[ 6, 3, 0]} intensity={3} color="#c040a0" distance={10} decay={2} />
      {/* Fire/fireball warm glow */}
      <pointLight position={[3, 2.5, -2]} intensity={4} color="#ff6020" distance={8} decay={2} />
      {/* Wizard cold backlight */}
      <pointLight position={[-3, 4, -3]} intensity={2} color="#4080ff" distance={8} decay={2} />
    </>
  );
}

function MagieScene() {
  return (
    <>
      <fog attach="fog" args={["#0c0514", 14, 40]} />
      <MagieLights />
      <MagicFloor />
      <MagicParticles />

      {/* Centre — floating card */}
      <FloatingModel url="/models/exploded/Card Backing.glb"       position={[0, 2.2, 0]}    rotSpeed={0.3} floatAmp={0.18} scale={1.8} />

      {/* Characters — arranged around the circle */}
      <ExplodedModel url="/models/exploded/Wizard.glb"             position={[-2.5, 0, -1.5]} rotation={[0, 0.6, 0]}  scale={1.4} />
      <ExplodedModel url="/models/exploded/Lightning Wizard.glb"   position={[ 2.5, 0, -1.5]} rotation={[0, -0.6, 0]} scale={1.4} />
      <ExplodedModel url="/models/exploded/King.glb"               position={[ 0,   0, -3.5]} rotation={[0, Math.PI, 0]} scale={1.3} />
      <ExplodedModel url="/models/exploded/Monk.glb"               position={[-3.8, 0,  1.0]} rotation={[0, 0.4, 0]}  scale={1.2} />
      <ExplodedModel url="/models/exploded/Skeleton.glb"           position={[ 3.8, 0,  1.0]} rotation={[0, -0.4, 0]} scale={1.2} />

      {/* Floating magic effects */}
      <FloatingModel url="/models/exploded/Fireball.glb"           position={[ 3,   2.8, -2]}  rotSpeed={0.6} floatAmp={0.15} floatSpeed={1.4} scale={1.0} />
      <FloatingModel url="/models/exploded/Blood Ring.glb"         position={[-3.5, 2.4,  0.5]} rotSpeed={0.5} floatAmp={0.2}  floatSpeed={0.9} scale={1.1} />
      <FloatingModel url="/models/exploded/Cool Triangle.glb"      position={[ 0,   3.8, -5]}  rotSpeed={0.8} floatAmp={0.1}  floatSpeed={1.2} scale={1.3} />
      <FloatingModel url="/models/exploded/Lightning Hands.glb"    position={[-4.5, 3.0, -3]}  rotSpeed={0.4} floatAmp={0.22} floatSpeed={1.1} scale={1.0} />
      <FloatingModel url="/models/exploded/Coin.glb"               position={[ 1.2, 2.0,  1.5]} rotSpeed={1.2} floatAmp={0.1}  floatSpeed={1.6} scale={1.2} />
      <FloatingModel url="/models/exploded/Coin.glb"               position={[-1.0, 1.8,  1.8]} rotSpeed={1.0} floatAmp={0.08} floatSpeed={1.3} scale={0.9} />

      {/* Icon elements — floating in background */}
      <FloatingModel url="/models/exploded/Fire Hands Icon.glb"    position={[ 5.5, 4.0,  0]}  rotSpeed={0.35} floatAmp={0.25} floatSpeed={0.7} scale={1.5} />
      <FloatingModel url="/models/exploded/Air Hands Icon.glb"     position={[-5.5, 4.0,  0]}  rotSpeed={0.3}  floatAmp={0.2}  floatSpeed={0.8} scale={1.5} />
      <FloatingModel url="/models/exploded/Water Element Icon.glb" position={[ 0,   4.5, -8]}  rotSpeed={0.4}  floatAmp={0.3}  floatSpeed={0.6} scale={1.6} />
      <FloatingModel url="/models/exploded/Dark Element Icon.glb"  position={[ 5,   3.5, -5]}  rotSpeed={0.5}  floatAmp={0.18} floatSpeed={0.9} scale={1.4} />
      <FloatingModel url="/models/exploded/Gambling Icon.glb"      position={[-5,   3.0, -4]}  rotSpeed={0.45} floatAmp={0.2}  floatSpeed={1.0} scale={1.3} />

      {/* Ground props */}
      <ExplodedModel url="/models/exploded/Evil Book.glb"          position={[-1.5, 0, 1.0]}  rotation={[0, 0.3, 0]}   scale={1.0} />
      <ExplodedModel url="/models/exploded/Magic Rock.glb"         position={[ 1.5, 0, 1.0]}  rotation={[0, -0.5, 0]}  scale={1.1} />
      <ExplodedModel url="/models/exploded/Ocean Chest.glb"        position={[ 0,   0, 2.8]}  rotation={[0, 0.1, 0]}   scale={1.0} />
      <ExplodedModel url="/models/exploded/Vines.glb"              position={[-5.5, 0, 2.0]}  rotation={[0, 1.2, 0]}   scale={1.4} />
      <ExplodedModel url="/models/exploded/Vines.glb"              position={[ 5.5, 0, 2.0]}  rotation={[0, -1.2, 0]}  scale={1.4} />

      {/* Background scene pieces */}
      <ExplodedModel url="/models/exploded/Market Scene.glb"       position={[ 0,   0, -10]}  rotation={[0, Math.PI, 0]} scale={1.2} />
      <ExplodedModel url="/models/exploded/Mimic.glb"              position={[-6.5, 0, -2]}   rotation={[0, 0.8, 0]}   scale={1.1} />
      <ExplodedModel url="/models/exploded/Sea Monster Scene.glb"  position={[ 7.5, 0,  0]}   rotation={[0, -0.9, 0]}  scale={0.9} />

      {/* Bee floating around */}
      <FloatingModel url="/models/exploded/Bee.glb"                position={[ 2.5, 3.5,  2]}  rotSpeed={0.7} floatAmp={0.3} floatSpeed={1.8} scale={0.9} />
      <FloatingModel url="/models/exploded/Bee Smooching A Flow.glb" position={[-2, 3.2, 2.5]} rotSpeed={0.5} floatAmp={0.25} floatSpeed={1.5} scale={0.8} />

      {/* Thief in shadow */}
      <ExplodedModel url="/models/exploded/Thief Icon.glb"         position={[ 4.5, 0.5, 3]}  rotation={[0, -1.0, 0]}  scale={1.3} />
    </>
  );
}

// ─── Nature 3D Scene ──────────────────────────────────────────────────────────

function NatureModel({ url, position, rotation = [0, 0, 0], scale = 1 }: {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(), [scene]);
  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

function AnimatedGrass({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.2 + offset) * 0.04;
  });
  return (
    <group ref={ref} position={position}>
      <NatureModel url="/models/nature/Grass.glb" position={[0, 0, 0]} scale={1.2} />
    </group>
  );
}

function NatureLights() {
  return (
    <>
      {/* Warm daylight from above-right */}
      <ambientLight intensity={0.8} color="#d4f0b0" />
      <directionalLight
        position={[12, 18, 8]}
        intensity={2.2}
        color="#fff8e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={80}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      {/* Soft blue sky fill from opposite side */}
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#a8d8f0" />
      {/* Subtle warm ground bounce */}
      <hemisphereLight args={["#c8f0a0", "#6a9040", 0.4]} />
    </>
  );
}

function Ground() {
  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[28, 64]} />
        <meshStandardMaterial color="#4a7c3f" roughness={0.95} />
      </mesh>
      {/* Darker patches for variation */}
      {([
        [3, -2, 0.15, "#3d6b34"],
        [-4, 1, 0.12, "#527a46"],
        [1, 4, 0.18, "#416138"],
        [-2, -4, 0.1, "#4e7a42"],
      ] as Array<[number, number, number, string]>).map(([x, z, r, c], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, z]} receiveShadow>
          <circleGeometry args={[r * 8, 32]} />
          <meshStandardMaterial color={c} roughness={0.98} />
        </mesh>
      ))}
      {/* Far ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[28, 120, 64]} />
        <meshStandardMaterial color="#2d5c24" roughness={1} />
      </mesh>
    </>
  );
}

function FloatingDust() {
  const positions = useMemo(() => {
    const arr = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      const r = Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      arr[i * 3]     = Math.cos(theta) * r;
      arr[i * 3 + 1] = Math.random() * 6 + 0.2;
      arr[i * 3 + 2] = Math.sin(theta) * r;
    }
    return arr;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.03;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#f0f8a0" sizeAttenuation transparent opacity={0.5} />
    </points>
  );
}

function NatureScene() {
  return (
    <>
      <fog attach="fog" args={["#a8d88a", 22, 55]} />
      <NatureLights />
      <Ground />
      <FloatingDust />

      {/* Background trees — outer ring */}
      <NatureModel url="/models/nature/Tree.glb"                         position={[-9,  0,  -8]} rotation={[0, 0.5, 0]}   scale={2.2} />
      <NatureModel url="/models/nature/Tree-QVOop92WmG.glb"              position={[ 8,  0,  -9]} rotation={[0, 2.1, 0]}   scale={2.0} />
      <NatureModel url="/models/nature/Tree-aVOxaHRPWe.glb"              position={[-7,  0, -11]} rotation={[0, 1.2, 0]}   scale={1.9} />
      <NatureModel url="/models/nature/Tree-qZtx0AHhcy.glb"              position={[11,  0,  -6]} rotation={[0, 3.4, 0]}   scale={2.1} />
      <NatureModel url="/models/nature/Tree-t9KbsfYdXz.glb"              position={[ 0,  0, -13]} rotation={[0, 0.8, 0]}   scale={2.3} />

      {/* Pines — mixed in */}
      <NatureModel url="/models/nature/Pine.glb"                         position={[-5,  0,  -7]} rotation={[0, 1.0, 0]}   scale={2.0} />
      <NatureModel url="/models/nature/Pine-699sFuLCN2.glb"              position={[ 5,  0,  -5]} rotation={[0, 2.5, 0]}   scale={1.8} />
      <NatureModel url="/models/nature/Pine-79gmlLnweB.glb"              position={[ 9,  0,  2]}  rotation={[0, 0.3, 0]}   scale={1.6} />
      <NatureModel url="/models/nature/Pine-rfnxJv0Rqa.glb"              position={[-8,  0,  3]}  rotation={[0, 1.8, 0]}   scale={1.7} />

      {/* Twisted trees — character */}
      <NatureModel url="/models/nature/Twisted Tree.glb"                 position={[-3.5, 0, -5]} rotation={[0, 0.4, 0]}   scale={1.5} />
      <NatureModel url="/models/nature/Twisted Tree-7PDBpElkQr.glb"     position={[ 4.5, 0, -4]} rotation={[0, 2.8, 0]}   scale={1.4} />

      {/* Dead trees for texture */}
      <NatureModel url="/models/nature/Dead Tree.glb"                    position={[-6.5, 0, 1]}  rotation={[0, 1.5, 0]}   scale={1.3} />
      <NatureModel url="/models/nature/Dead Tree-CD4edbPSGm.glb"        position={[ 6.5, 0, 2]}  rotation={[0, 3.1, 0]}   scale={1.2} />

      {/* Mid-ground bushes */}
      <NatureModel url="/models/nature/Bush with Flowers.glb"            position={[-2,   0, -3]} rotation={[0, 0.2, 0]}   scale={1.1} />
      <NatureModel url="/models/nature/Bush.glb"                         position={[ 3,   0, -2]} rotation={[0, 1.6, 0]}   scale={1.0} />
      <NatureModel url="/models/nature/Bush with Flowers.glb"            position={[ 1.5, 0,  2]} rotation={[0, 3.0, 0]}   scale={0.9} />
      <NatureModel url="/models/nature/Bush.glb"                         position={[-3.5, 0,  1.5]} rotation={[0, 2.2, 0]} scale={1.0} />

      {/* Plants */}
      <NatureModel url="/models/nature/Plant.glb"                        position={[-1.5, 0,  1]} rotation={[0, 0.9, 0]}   scale={0.9} />
      <NatureModel url="/models/nature/Plant Big.glb"                    position={[ 2,   0,  3.5]} rotation={[0, 2.4, 0]} scale={0.9} />
      <NatureModel url="/models/nature/Fern.glb"                         position={[-2.5, 0,  2.5]} rotation={[0, 1.1, 0]} scale={1.0} />
      <NatureModel url="/models/nature/Plant-xH5gNlQxAZ.glb"            position={[ 3.5, 0,  4]} rotation={[0, 0.5, 0]}   scale={0.8} />

      {/* Flowers — foreground */}
      <NatureModel url="/models/nature/Flower Group.glb"                 position={[ 0.5, 0,  1]} rotation={[0, 0.7, 0]}   scale={0.9} />
      <NatureModel url="/models/nature/Flower Group-LqTljN6Wg2.glb"     position={[-1,   0,  3]} rotation={[0, 2.1, 0]}   scale={0.85} />
      <NatureModel url="/models/nature/Flower Petal.glb"                 position={[ 1,   0,  4.5]} rotation={[0, 1.3, 0]} scale={0.8} />
      <NatureModel url="/models/nature/Flower Petal-eVE0j49ux9.glb"    position={[-0.5, 0,  5]} rotation={[0, 3.2, 0]}   scale={0.7} />
      <NatureModel url="/models/nature/Flower Single.glb"                position={[ 2.5, 0,  5.5]} rotation={[0, 0.4, 0]} scale={0.8} />
      <NatureModel url="/models/nature/Flower Single-GvfHo0roi3.glb"   position={[-2,   0,  4.5]} rotation={[0, 1.8, 0]} scale={0.75} />

      {/* Grass patches */}
      <AnimatedGrass position={[ 1.5, 0,  0.5]} />
      <AnimatedGrass position={[-1,   0, -0.8]} />
      <AnimatedGrass position={[ 3,   0,  1]} />
      <AnimatedGrass position={[-3,   0,  3]} />
      <NatureModel url="/models/nature/Grass Wispy.glb"                  position={[ 0,   0,  2]} rotation={[0, 0.6, 0]}   scale={1.1} />
      <NatureModel url="/models/nature/Tall Grass.glb"                   position={[-1.5, 0,  0.5]} rotation={[0, 2.3, 0]} scale={1.0} />
      <NatureModel url="/models/nature/Grass Wispy-Msr9zx66VU.glb"     position={[ 2.5, 0,  0]} rotation={[0, 1.5, 0]}   scale={0.9} />

      {/* Mushrooms */}
      <NatureModel url="/models/nature/Mushroom.glb"                     position={[-2.2, 0,  1.8]} rotation={[0, 0.3, 0]} scale={0.8} />
      <NatureModel url="/models/nature/Mushroom Laetiporus.glb"         position={[ 1.8, 0,  2.5]} rotation={[0, 2.7, 0]} scale={0.7} />

      {/* Clovers */}
      <NatureModel url="/models/nature/Clover.glb"                       position={[ 0.2, 0,  3.5]} rotation={[0, 1.0, 0]} scale={0.9} />
      <NatureModel url="/models/nature/Clover-u5SOgBFiut.glb"           position={[-0.8, 0,  4.5]} rotation={[0, 2.6, 0]} scale={0.85} />

      {/* Rock path — leading forward */}
      <NatureModel url="/models/nature/Rock Path Round Wide.glb"         position={[ 0,   0,  5.5]} rotation={[0, 0, 0]}   scale={1.0} />
      <NatureModel url="/models/nature/Rock Path Round Small.glb"        position={[ 0,   0,  6.5]} rotation={[0, 0.1, 0]} scale={1.0} />
      <NatureModel url="/models/nature/Rock Path Round Thin.glb"         position={[ 0,   0,  7.5]} rotation={[0, 0.05, 0]} scale={1.0} />

      {/* Scattered pebbles */}
      <NatureModel url="/models/nature/Pebble Round.glb"                 position={[ 1,   0,  3]} rotation={[0, 0.8, 0]}   scale={0.8} />
      <NatureModel url="/models/nature/Pebble Round-kAMfq1uJUY.glb"    position={[-1.5, 0,  2]} rotation={[0, 1.4, 0]}   scale={0.7} />
      <NatureModel url="/models/nature/Pebble Square.glb"                position={[ 3.5, 0,  2.5]} rotation={[0, 2.0, 0]} scale={0.75} />

      {/* Rock medium — scene anchors */}
      <NatureModel url="/models/nature/Rock Medium.glb"                  position={[-4,   0,  0.5]} rotation={[0, 1.2, 0]} scale={1.2} />
      <NatureModel url="/models/nature/Rock Medium-JQxF95498B.glb"      position={[ 5,   0,  1.5]} rotation={[0, 2.9, 0]} scale={1.1} />
    </>
  );
}

// ─── Level Card ───────────────────────────────────────────────────────────────

function LevelCard({
  level,
  active,
  onSelect,
  onHover,
}: {
  level: Level;
  active: boolean;
  onSelect: (id: LevelId) => void;
  onHover?: (id: LevelId) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => { setHovered(true); if (level.available) onHover?.(level.id); }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => level.available && onSelect(level.id)}
      style={{
        flexShrink: 0,
        width: 220,
        background: active
          ? `linear-gradient(135deg, ${level.accent}22 0%, rgba(0,0,0,0.5) 100%)`
          : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${active ? level.accent : hovered && level.available ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        padding: "20px 18px",
        cursor: level.available ? "pointer" : "default",
        opacity: !level.available ? 0.45 : 1,
        transition: "all 0.2s",
        boxShadow: active ? `0 0 24px ${level.accent}44` : hovered && level.available ? "0 4px 20px rgba(0,0,0,0.4)" : "none",
        position: "relative",
      }}
    >
      {/* Active glow ring */}
      {active && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: 18,
          border: `1px solid ${level.accent}66`,
          pointerEvents: "none",
        }} />
      )}

      <div style={{ fontSize: 32, marginBottom: 8 }}>{level.icon}</div>
      <div style={{
        fontFamily: "'Fredoka', sans-serif", fontSize: 18, fontWeight: 700,
        color: active ? level.accent : "#EEF2FF", marginBottom: 4,
      }}>
        {level.name}
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.18em",
        textTransform: "uppercase", color: "rgba(238,242,255,0.35)", marginBottom: 10,
      }}>
        {level.tagline}
      </div>
      <div style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "rgba(238,242,255,0.5)",
        lineHeight: 1.5, marginBottom: 14,
      }}>
        {level.description}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
        {level.tags.map((tag) => (
          <span key={tag} style={{
            fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700,
            background: `${level.accent}20`, color: level.accent,
            border: `1px solid ${level.accent}40`,
            borderRadius: 50, padding: "2px 8px",
          }}>
            {tag}
          </span>
        ))}
      </div>

      {level.available ? (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(level.id); }}
          style={{
            width: "100%", padding: "9px 0",
            background: active ? level.accent : `${level.accent}18`,
            color: active ? "#000" : level.accent,
            border: `1px solid ${active ? level.accent : `${level.accent}50`}`,
            borderRadius: 50, cursor: "pointer",
            fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13,
            transition: "all 0.15s",
            boxShadow: active ? `0 4px 14px ${level.accent}60` : "none",
          }}
        >
          {active ? "✓ Actief" : "Activeren"}
        </button>
      ) : (
        <div style={{
          width: "100%", padding: "9px 0", textAlign: "center",
          background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)",
          border: "1px solid rgba(255,255,255,0.07)", borderRadius: 50,
          fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12,
        }}>
          Binnenkort
        </div>
      )}
    </div>
  );
}

// ─── Overlay UI ───────────────────────────────────────────────────────────────

function SceneOverlay({ previewLevel }: { previewLevel: LevelId }) {
  const level = LEVELS.find(l => l.id === previewLevel) ?? LEVELS[0];
  const bgColor = level.bg;
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
      background: `linear-gradient(to top, ${bgColor}f5 0%, ${bgColor}99 60%, transparent 100%)`,
      padding: "40px 32px 28px",
    }}>
      {/* Active level badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: `${level.accent}26`, border: `1px solid ${level.accent}66`,
        borderRadius: 50, padding: "4px 14px", marginBottom: 12,
      }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: level.accent }}>
          Preview
        </span>
      </div>

      <h1 style={{
        fontFamily: "'Fredoka', sans-serif", fontSize: "clamp(36px, 7vw, 64px)",
        fontWeight: 900, letterSpacing: "0.06em",
        color: level.accent, margin: "0 0 6px", lineHeight: 1,
        textShadow: `0 0 40px ${level.accent}80`,
      }}>
        {level.name.toUpperCase()}
      </h1>
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: "clamp(10px, 1.5vw, 13px)",
        letterSpacing: "0.25em", textTransform: "uppercase",
        color: `${level.accent}99`, margin: 0,
      }}>
        {level.tagline}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SCENE_CONFIGS: Record<string, { camera: [number, number, number]; fov: number; lookAt: [number, number, number] }> = {
  piraten: { camera: [0, 7, 18], fov: 42, lookAt: [0, 0, -1] },
  gezellig: { camera: [0, 7, 18], fov: 42, lookAt: [0, 0, -1] },
  dojo:    { camera: [0, 7, 18], fov: 42, lookAt: [0, 0, -1] },
  ruimte:  { camera: [0, 7, 18], fov: 42, lookAt: [0, 0, -1] },
  magie:   { camera: [0, 6, 14], fov: 52, lookAt: [0, 1.5, 0] },
  natuur:  { camera: [0, 5, 14], fov: 48, lookAt: [0, 1, 0] },
};

const ADMINS = ["robin"];

export default function LevelsPage() {
  const router = useRouter();
  const [activeLevel, setActiveLevelState] = useState<LevelId>("piraten");
  const [previewLevel, setPreviewLevel] = useState<LevelId>("piraten");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const saved = getActiveLevel();
    setActiveLevelState(saved);
    setPreviewLevel(saved);
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.username && ADMINS.includes(d.username.toLowerCase())) setIsAdmin(true);
    }).catch(() => {});
  }, []);

  function handleSelect(id: LevelId) {
    setActiveLevel(id);
    setActiveLevelState(id);
    setPreviewLevel(id);
  }

  const sceneConfig = SCENE_CONFIGS[previewLevel] ?? SCENE_CONFIGS.piraten;
  const activeLevelData = LEVELS.find(l => l.id === previewLevel) ?? LEVELS[0];

  return (
    <div style={{ minHeight: "100vh", background: activeLevelData.bg, color: "#EEF2FF", overflowX: "hidden", transition: "background 0.4s" }}>

      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px",
        background: `linear-gradient(to bottom, ${activeLevelData.bg}e6 0%, transparent 100%)`,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 50, padding: "7px 16px", cursor: "pointer",
            fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 12,
            letterSpacing: "0.15em", textTransform: "uppercase",
            color: "rgba(238,242,255,0.5)", transition: "all 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#EEF2FF")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(238,242,255,0.5)")}
        >
          ← Terug
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 700,
            letterSpacing: "0.12em", color: "rgba(238,242,255,0.4)",
            textTransform: "uppercase",
          }}>
            Niveaus
          </div>
          {isAdmin && (
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.15em", textTransform: "uppercase",
              background: "#F59E0B26", color: "#F59E0B",
              border: "1px solid #F59E0B66", borderRadius: 50, padding: "2px 8px",
            }}>
              Admin
            </span>
          )}
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* 3D Canvas Hero */}
      <div style={{ height: "70vh", position: "relative" }}>
        <Canvas
          key={previewLevel}
          camera={{ position: sceneConfig.camera, fov: sceneConfig.fov }}
          shadows
          onCreated={({ camera }) => camera.lookAt(...sceneConfig.lookAt)}
          style={{ position: "absolute", inset: 0 }}
        >
          <Suspense fallback={null}>
            {previewLevel === "natuur" ? <NatureScene /> : previewLevel === "magie" ? <MagieScene /> : <PirateScene />}
          </Suspense>
        </Canvas>
        <SceneOverlay previewLevel={previewLevel} />
      </div>

      {/* Level selector */}
      <div style={{ padding: "32px 24px 24px", background: activeLevelData.bg }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
        }}>
          <div style={{
            fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(238,242,255,0.3)",
          }}>
            Kies je omgeving
          </div>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div style={{
          display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8,
          scrollbarWidth: "none",
        }}>
          {LEVELS.map((level) => (
            <LevelCard
              key={level.id}
              level={isAdmin ? { ...level, available: true } : level}
              active={activeLevel === level.id}
              onSelect={handleSelect}
              onHover={(id) => setPreviewLevel(id)}
            />
          ))}
        </div>
      </div>

      {/* Info strip */}
      <div style={{ padding: "0 24px 24px", background: activeLevelData.bg }}>
        <div style={{
          background: `${activeLevelData.accent}0f`, border: `1px solid ${activeLevelData.accent}26`,
          borderRadius: 12, padding: "14px 18px",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>💡</span>
          <div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, color: activeLevelData.accent, marginBottom: 3 }}>
              Hoe werkt het?
            </div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "rgba(238,242,255,0.45)", lineHeight: 1.6 }}>
              Het geselecteerde niveau bepaalt de spelomgeving voor alle spellen. Jouw keuze wordt opgeslagen en is zichtbaar bij elk potje.
            </div>
          </div>
        </div>
      </div>

      <BottomNav
        items={[
          { label: "Home",    icon: "home", onClick: () => router.push("/") },
          { label: "Lobby",   icon: "lobby", onClick: () => router.push("/lobby") },
          { label: "Niveaus", icon: "scores", active: true },
          { label: "Scores",  icon: "scores", onClick: () => router.push("/scores") },
        ]}
      />
    </div>
  );
}

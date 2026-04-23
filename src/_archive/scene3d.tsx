"use client";

/**
 * scene3d.tsx — Gedeelde Three.js scene-elementen voor alle Ludus games.
 * Importeer wat je nodig hebt in je game page.
 *
 * Exports:
 *   CozyEnvironment   — volledige cozy kamer-omgeving (tafel, vloer, decoraties)
 *   GLBTable          — geïmporteerde 3D tafel (table.glb)
 *   WoodTable         — procedurele houten tafel + poten (fallback)
 *   WoodFloor         — vloerplanken + tapijt
 *   BookStack         — stapel boeken (position prop)
 *   PlantPot          — succulent in terracotta pot (position prop)
 *   Candle            — kaars met vlam + pointLight (position prop)
 *   CoffeeMug         — mok op onderzettertje (position prop)
 *   DiceCup           — houten dobbelstenen-beker (position prop)
 *   CozyLights        — warme sfeerverlichting (ambient + directional + kaars)
 */

import { useEffect, useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ─── Types ───────────────────────────────────────────────────────────────────

type XYZ = [number, number, number];

// ─── Shared materials (reuse across games) ───────────────────────────────────

const WOOD_DARK  = "#A07248";
const WOOD_MID   = "#C8A278";
const WOOD_LIGHT = "#D8B888";

// ─── CozyLights ──────────────────────────────────────────────────────────────

export function CozyLights({ candlePosition = [4.5, 1.2, -5.0] as XYZ }: { candlePosition?: XYZ }) {
  return (
    <>
      <ambientLight intensity={1.5} color="#fdf4e8" />
      <directionalLight
        position={[6, 14, 4]}
        intensity={1.1}
        color="#ffe8c8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-5, 8, -4]} intensity={0.45} color="#e0d0f8" />
      <pointLight
        position={candlePosition}
        intensity={1.8}
        color="#FFA030"
        distance={6}
        decay={2}
      />
    </>
  );
}

// ─── WoodFloor ───────────────────────────────────────────────────────────────

const PLANK_COLORS = ["#C09870", "#B88C66", "#C8A278", "#BA9268", "#C4A070"];

export function WoodFloor({
  y = -3.1,
  rugColor = "#8B5E9A",
  rugAccent = "#A070B8",
}: {
  y?: number;
  rugColor?: string;
  rugAccent?: string;
}) {
  return (
    <>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[i * 1.1 - 7.5, y, 0.5] as XYZ} receiveShadow>
          <boxGeometry args={[1.05, 0.12, 18]} />
          <meshStandardMaterial color={PLANK_COLORS[i % PLANK_COLORS.length]} roughness={0.88} />
        </mesh>
      ))}
      {/* Rug layers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.12, 1] as XYZ} receiveShadow>
        <planeGeometry args={[9, 8]} />
        <meshStandardMaterial color={rugColor} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.13, 1] as XYZ}>
        <planeGeometry args={[8.4, 7.4]} />
        <meshStandardMaterial color={rugAccent} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.14, 1] as XYZ}>
        <planeGeometry args={[7.2, 6.2]} />
        <meshStandardMaterial color={rugColor} roughness={0.95} />
      </mesh>
    </>
  );
}

// ─── GLBTable ────────────────────────────────────────────────────────────────

export function GLBTable({
  targetWidth = 11.5,
  targetDepth = 9.5,
  y = 0,
}: {
  targetWidth?: number;
  targetDepth?: number;
  y?: number;
}) {
  const { scene } = useGLTF("/models/table.glb");
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!ref.current) return;
    const box = new THREE.Box3().setFromObject(ref.current);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Scale to fill targetWidth × targetDepth, preserve Y ratio
    const scaleX = targetWidth / size.x;
    const scaleZ = targetDepth / size.z;
    const scale = Math.min(scaleX, scaleZ);

    ref.current.scale.setScalar(scale);

    // Re-center after scaling
    const newBox = new THREE.Box3().setFromObject(ref.current);
    const newCenter = new THREE.Vector3();
    newBox.getCenter(newCenter);

    ref.current.position.x -= newCenter.x;
    ref.current.position.y = y - newBox.min.y;
    ref.current.position.z -= newCenter.z;
  }, [targetWidth, targetDepth, y]);

  return (
    <group ref={ref}>
      <primitive object={scene.clone(true)} castShadow receiveShadow />
    </group>
  );
}

useGLTF.preload("/models/table.glb");

// ─── WoodTable ───────────────────────────────────────────────────────────────

export function WoodTable({
  width = 11.5,
  depth = 9.5,
  legPositions = [[-4.8, -3.8], [4.8, -3.8], [-4.8, 3.6], [4.8, 3.6]] as [number, number][],
}: {
  width?: number;
  depth?: number;
  legPositions?: [number, number][];
}) {
  return (
    <>
      {/* Rim */}
      <mesh position={[0, -0.13, 0] as XYZ} receiveShadow castShadow>
        <boxGeometry args={[width + 0.5, 0.28, depth + 0.5]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.82} />
      </mesh>
      {/* Surface */}
      <mesh position={[0, 0, 0] as XYZ} receiveShadow>
        <boxGeometry args={[width, 0.18, depth]} />
        <meshStandardMaterial color={WOOD_MID} roughness={0.70} />
      </mesh>
      {/* Surface grain stripes */}
      {[-3.5, -1.2, 1.1, 3.4].map((x, i) => (
        <mesh key={i} position={[x, 0.092, 0] as XYZ}>
          <boxGeometry args={[0.08, 0.001, depth]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.6} />
        </mesh>
      ))}
      {/* Legs */}
      {legPositions.map(([lx, lz], i) => (
        <group key={i}>
          <mesh position={[lx, -1.9, lz] as XYZ} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 3.5, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
          </mesh>
          <mesh position={[lx, -3.62, lz] as XYZ}>
            <cylinderGeometry args={[0.28, 0.32, 0.12, 8]} />
            <meshStandardMaterial color="#8A6030" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ─── BookStack ───────────────────────────────────────────────────────────────

const DEFAULT_BOOKS = [
  { color: "#C04848", w: 0.55, h: 0.13, d: 0.75 },
  { color: "#3A60B8", w: 0.50, h: 0.15, d: 0.68 },
  { color: "#3A9050", w: 0.58, h: 0.11, d: 0.78 },
  { color: "#D07830", w: 0.46, h: 0.14, d: 0.64 },
];

export function BookStack({ position }: { position: XYZ }) {
  let yOffset = 0;
  return (
    <group position={position}>
      {DEFAULT_BOOKS.map((b, i) => {
        const y = yOffset + b.h / 2;
        yOffset += b.h;
        return (
          <group key={i} position={[0, y, 0] as XYZ}>
            <mesh castShadow>
              <boxGeometry args={[b.w, b.h, b.d]} />
              <meshStandardMaterial color={b.color} roughness={0.7} />
            </mesh>
            <mesh position={[b.w / 2 - 0.025, 0, 0] as XYZ}>
              <boxGeometry args={[0.04, b.h + 0.005, b.d]} />
              <meshStandardMaterial color="#000000" roughness={0.8} transparent opacity={0.18} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ─── PlantPot ────────────────────────────────────────────────────────────────

export function PlantPot({ position }: { position: XYZ }) {
  const [bx, by, bz] = position;
  const leafClusters: [number, number, number, number, string][] = [
    [0, 0.72, 0, 0.24, "#4A9040"],
    [0.18, 0.62, 0.10, 0.17, "#3A8030"],
    [-0.16, 0.60, 0.06, 0.18, "#5AA048"],
    [0.06, 0.58, -0.16, 0.16, "#409038"],
    [-0.04, 0.82, 0.04, 0.14, "#60B050"],
  ];
  return (
    <>
      <mesh position={[bx, by + 0.18, bz] as XYZ} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.36, 10]} />
        <meshStandardMaterial color="#C46840" roughness={0.82} />
      </mesh>
      <mesh position={[bx, by + 0.38, bz] as XYZ}>
        <cylinderGeometry args={[0.20, 0.20, 0.04, 10]} />
        <meshStandardMaterial color="#4A2E14" roughness={0.95} />
      </mesh>
      {leafClusters.map(([dx, dy, dz, r, c], i) => (
        <mesh key={i} position={[bx + dx, by + dy, bz + dz] as XYZ} castShadow>
          <sphereGeometry args={[r, 8, 6]} />
          <meshStandardMaterial color={c} roughness={0.75} />
        </mesh>
      ))}
    </>
  );
}

// ─── Candle ──────────────────────────────────────────────────────────────────

export function Candle({ position }: { position: XYZ }) {
  const [bx, by, bz] = position;
  return (
    <>
      <mesh position={[bx, by + 0.06, bz] as XYZ} castShadow>
        <cylinderGeometry args={[0.20, 0.20, 0.06, 10]} />
        <meshStandardMaterial color="#D4C090" roughness={0.7} />
      </mesh>
      <mesh position={[bx, by + 0.36, bz] as XYZ} castShadow>
        <cylinderGeometry args={[0.075, 0.082, 0.60, 10]} />
        <meshStandardMaterial color="#F8EED0" roughness={0.55} />
      </mesh>
      <mesh position={[bx, by + 0.70, bz] as XYZ}>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshStandardMaterial color="#FFD060" emissive="#FF8800" emissiveIntensity={3} />
      </mesh>
      <mesh position={[bx, by + 0.74, bz] as XYZ}>
        <sphereGeometry args={[0.028, 6, 5]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFEEAA" emissiveIntensity={4} />
      </mesh>
    </>
  );
}

// ─── CoffeeMug ───────────────────────────────────────────────────────────────

export function CoffeeMug({ position }: { position: XYZ }) {
  const [bx, by, bz] = position;
  return (
    <>
      {/* Coaster */}
      <mesh position={[bx, by + 0.02, bz] as XYZ}>
        <cylinderGeometry args={[0.16, 0.16, 0.03, 12]} />
        <meshStandardMaterial color="#C8A070" roughness={0.85} />
      </mesh>
      {/* Mug */}
      <mesh position={[bx, by + 0.14, bz] as XYZ} castShadow>
        <cylinderGeometry args={[0.12, 0.10, 0.28, 12]} />
        <meshStandardMaterial color="#E8E0D8" roughness={0.5} />
      </mesh>
      {/* Coffee inside */}
      <mesh position={[bx, by + 0.285, bz] as XYZ}>
        <cylinderGeometry args={[0.10, 0.10, 0.01, 12]} />
        <meshStandardMaterial color="#5A3010" roughness={0.6} />
      </mesh>
      {/* Handle */}
      <mesh position={[bx + 0.14, by + 0.14, bz] as XYZ} rotation={[Math.PI / 2, 0, 0] as XYZ}>
        <torusGeometry args={[0.07, 0.018, 6, 10, Math.PI]} />
        <meshStandardMaterial color="#E0D8D0" roughness={0.5} />
      </mesh>
    </>
  );
}

// ─── DiceCup ─────────────────────────────────────────────────────────────────

export function DiceCup({ position }: { position: XYZ }) {
  const [bx, by, bz] = position;
  return (
    <>
      <mesh position={[bx, by + 0.08, bz] as XYZ} castShadow>
        <cylinderGeometry args={[0.55, 0.40, 0.30, 14, 1, true]} />
        <meshStandardMaterial color="#B87040" roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[bx, by - 0.04, bz] as XYZ}>
        <cylinderGeometry args={[0.40, 0.40, 0.04, 14]} />
        <meshStandardMaterial color="#A06030" roughness={0.8} />
      </mesh>
    </>
  );
}

// ─── CozyEnvironment (alles in één) ──────────────────────────────────────────

export function CozyEnvironment() {
  return (
    <>
      <WoodFloor />
      <GLBTable />
      <BookStack position={[-4.8, 0, -4.0]} />
      <PlantPot position={[4.6, 0, -4.2]} />
      <Candle position={[4.5, 0, -4.8]} />
      <CoffeeMug position={[-4.6, 0, -4.6]} />
      <DiceCup position={[0, 0, 4.5]} />

      {/* Kleine keien */}
      {([
        [-3.8, 0.06, 4.8, 0.08, "#C8C0B8"],
        [-3.5, 0.05, 4.6, 0.06, "#B8B0A8"],
        [ 3.6, 0.07, 4.7, 0.09, "#C0B8B0"],
        [ 3.9, 0.05, 4.5, 0.07, "#D0C8C0"],
      ] as [number, number, number, number, string][]).map(([x, y, z, r, c], i) => (
        <mesh key={i} position={[x, y, z] as XYZ} castShadow>
          <sphereGeometry args={[r, 6, 5]} />
          <meshStandardMaterial color={c} roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

// ─── PirateLights ────────────────────────────────────────────────────────────

export function PirateLights() {
  return (
    <>
      <ambientLight intensity={1.5} color="#ffeedd" />
      <directionalLight
        position={[10, 18, 6]}
        intensity={1.4}
        color="#ffdd99"
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
      {/* Oceaan tegenlicht — blauw-groen */}
      <directionalLight position={[-8, 4, -10]} intensity={0.35} color="#88ccff" />
      {/* Warme lantaarn sfeer */}
      <pointLight position={[-4.5, 2.5, -4.5]} intensity={2.5} color="#ff9933" distance={10} decay={2} />
      <pointLight position={[4.5, 2.5, -4.0]} intensity={2.0} color="#ffaa44" distance={9} decay={2} />
    </>
  );
}

// ─── Pirate GLB helper ───────────────────────────────────────────────────────
// Alle Quaternius Pirate Kit modellen hebben een interne 100x schaal (origin bij bodem-center).
// yFloor = correctie voor modellen waarvan origin NIET op y=0 ligt (in gerenderde eenheden).

function PirateModel({
  url,
  position,
  rotY = 0,
  scale = 1,
}: {
  url: string;
  position: XYZ;
  rotY?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return (
    <primitive
      object={clone}
      position={position}
      rotation={[0, rotY, 0]}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

// ─── PirateFloor ─────────────────────────────────────────────────────────────

export function PirateFloor() {
  const PLANK_COLORS = ["#7A5530", "#8B6340", "#6E4A28", "#926848", "#7D5835"];
  return (
    <>
      {/* Vloerplanken langs X-as */}
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={i} position={[i * 1.0 - 10.5, -0.06, 0] as XYZ} receiveShadow>
          <boxGeometry args={[0.94, 0.12, 26]} />
          <meshStandardMaterial color={PLANK_COLORS[i % PLANK_COLORS.length]} roughness={0.88} />
        </mesh>
      ))}
      {/* Dwarsbalken */}
      {[-7, -4, -1, 2, 5, 8].map((z, i) => (
        <mesh key={i} position={[0, 0, z] as XYZ} receiveShadow>
          <boxGeometry args={[22, 0.08, 0.18]} />
          <meshStandardMaterial color="#4A2E14" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

// ─── PirateEnvironment ───────────────────────────────────────────────────────
//
// Game-speelveld: x ∈ [-3, +3], z ∈ [-3.5, +3], y = 0
// Camera: [9, 10, 9] → kijkt naar [0, 0, -0.5]  (front-right naar back-left)
//
// Decoraties liggen BUITEN het speelveld:
//   Links  : x < -4   |  Rechts: x > 4
//   Achter : z < -4   |  Voor  : z > 3.5
//
// Afmetingen (gemeten):
//   Barrel       : 0.71 × 0.66 × 0.71  (bottom y=0.00)
//   Chest-Closed : 1.39 × 0.88 × 0.89  (bottom y=-0.02 → yFloor+0.02)
//   Chest-Gold   : 1.82 × 1.29 × 1.59  (bottom y=-0.02 → yFloor+0.02)
//   Anchor       : 0.78 × 0.09 × 0.95  (flat, bottom y=0.00)
//   Cannon       : 1.04 × 1.13 × 1.48  (bottom y=-0.01 → yFloor+0.01)
//   Prop-Bottle  : 0.31 × 0.47 × 0.31  (bottom y=0.00)
//   Skull        : 0.48 × 0.44 × 0.51  (bottom y=-0.01 → yFloor+0.01)
//   Rock         : 0.69 × 0.59 × 0.66  (bottom y=-0.24 → yFloor+0.24)
//   Coins        : 0.46 × 0.34 × 0.64  (bottom y=0.00)
//   Small-Ship   : 5.15 × 1.99 × 3.60  (bottom y=-0.01, ver weg)
//   Palm-Tree    : 2.61 × 3.59 × 2.52  (bottom y=0.01)

export function PirateEnvironment({ floor = true }: { floor?: boolean } = {}) {
  return (
    <>
      {floor && <PirateFloor />}

      {/* ── LINKS ACHTER — schatkisten cluster ─────────────────────────── */}
      <PirateModel url="/models/pirate/Chest-Closed.glb" position={[-5.2, 0.02, -5.0]} rotY={0.4} />
      <PirateModel url="/models/pirate/Chest-Gold.glb"   position={[-4.0, 0.02, -5.8]} rotY={-0.3} scale={0.7} />

      {/* ── RECHTS ACHTER — vatenscluster ──────────────────────────────── */}
      <PirateModel url="/models/pirate/Barrel.glb" position={[5.5, 0, -5.2]} rotY={0.5} />
      <PirateModel url="/models/pirate/Barrel.glb" position={[6.4, 0, -4.4]} rotY={1.1} scale={0.85} />
      <PirateModel url="/models/pirate/Barrel.glb" position={[5.0, 0, -3.8]} rotY={-0.3} scale={0.75} />

      {/* ── LINKS MIDDEN — kanon ───────────────────────────────────────── */}
      <PirateModel url="/models/pirate/Cannon.glb" position={[-5.8, 0.01, 0.5]} rotY={-0.8} />

      {/* ── RECHTS MIDDEN — anker ──────────────────────────────────────── */}
      <PirateModel url="/models/pirate/Anchor.glb" position={[5.5, 0, 1.5]} rotY={0.6} />

      {/* ── LINKS VOOR — schedel + rots ────────────────────────────────── */}
      <PirateModel url="/models/pirate/Skull.glb"  position={[-4.5, 0.01, 4.5]}  rotY={1.2} />
      <PirateModel url="/models/pirate/Rock.glb"   position={[-5.8, 0.24, 3.0]}  rotY={0.8} />
      <PirateModel url="/models/pirate/Rock.glb"   position={[-6.5, 0.24, 4.8]}  rotY={2.1} scale={1.3} />

      {/* ── RECHTS VOOR — flessen + munten ─────────────────────────────── */}
      <PirateModel url="/models/pirate/Prop-Bottle.glb" position={[4.2, 0, 4.8]}  rotY={0.4} />
      <PirateModel url="/models/pirate/Prop-Bottle.glb" position={[4.8, 0, 5.5]}  rotY={2.0} scale={0.8} />
      <PirateModel url="/models/pirate/Coins.glb"       position={[3.5, 0, 5.0]}  rotY={0.9} />

      {/* ── RECHTS ACHTER HOEK — rots ──────────────────────────────────── */}
      <PirateModel url="/models/pirate/Rock.glb" position={[6.8, 0.24, -2.5]} rotY={1.5} scale={1.2} />

      {/* ── FAR BACKGROUND — schip + palmbomen ─────────────────────────── */}
      <PirateModel url="/models/pirate/Small-Ship.glb"  position={[-1.5, 0.01, -11]}  rotY={0.25} scale={1.0} />
      <PirateModel url="/models/pirate/Palm-Tree.glb"   position={[-9.0, 0, -7.0]}    rotY={0.3}  scale={1.2} />
      <PirateModel url="/models/pirate/Palm-Tree.glb"   position={[8.5,  0, -8.5]}    rotY={2.8}  scale={1.0} />
      <PirateModel url="/models/pirate/Palm-Tree.glb"   position={[-8.0, 0,  5.5]}    rotY={1.1}  scale={0.9} />
    </>
  );
}

// Preload pirate models
[
  "/models/pirate/Barrel.glb",
  "/models/pirate/Chest-Closed.glb",
  "/models/pirate/Chest-Gold.glb",
  "/models/pirate/Anchor.glb",
  "/models/pirate/Cannon.glb",
  "/models/pirate/Prop-Bottle.glb",
  "/models/pirate/Skull.glb",
  "/models/pirate/Rock.glb",
  "/models/pirate/Coins.glb",
  "/models/pirate/Small-Ship.glb",
  "/models/pirate/Palm-Tree.glb",
].forEach((url) => useGLTF.preload(url));

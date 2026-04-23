"use client";

import { useState, useRef, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Html, OrbitControls } from "@react-three/drei";
import { Physics as RapierPhysics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { Physics as CannonPhysics, usePlane } from "@react-three/cannon";
import * as THREE from "three";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav, TurnTimer } from "@/components/ui";
import { useTurnTimer } from "@/lib/useTurnTimer";
import GameControls from "@/components/GameControls";
import { PirateEnvironment, PirateLights, WoodTable } from "@/components/scene3d";
import DiceMesh from "@/components/DiceMesh";
import PhysicsDie from "@/components/PhysicsDie";
import {
  DiceFace,
  GameState,
  Tile,
  Player,
  newGame,
  rollN,
  pickFace,
  isBust,
  canClaim,
  performClaim,
  performBust,
  totalWorms,
  aiBestFace,
  aiShouldClaim,
  determineWinner,
} from "@/lib/grub";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Dobbelstenen rusten IN het bakje (rechterzijde, x≈4.5)
// y=0.22 → die bottom at 0.22-0.19=0.03, just above tray floor at y=0.01
const ROLLING_POSITIONS: [number, number, number][] = [
  [3.6, 0.22, -0.4], [4.2, 0.22, -0.4], [4.8, 0.22, -0.4], [5.4, 0.22, -0.4],
  [3.6, 0.22,  0.4], [4.2, 0.22,  0.4], [4.8, 0.22,  0.4], [5.4, 0.22,  0.4],
];


// Tile x positions for 8 tiles per row
function tileX(i: number): number {
  return -2.73 + i * 0.78;
}

// Euler rotation to bring each face value to world +Y (top)
const FACE_ROT: Record<string, [number, number, number]> = {
  '1': [0, 0, 0],
  '2': [0, 0, -Math.PI / 2],
  '3': [0, 0, Math.PI / 2],
  '4': [-Math.PI / 2, 0, 0],
  '5': [Math.PI / 2, 0, 0],
  'W': [Math.PI, 0, 0],
};

// ─────────────────────────────────────────────────────────────────────────────
// Dice helpers (for spawn configs)
// ─────────────────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) { return min + Math.random() * (max - min); }
function randomQuat(): [number, number, number, number] {
  const u1 = Math.random(), u2 = Math.random() * Math.PI * 2, u3 = Math.random() * Math.PI * 2;
  const s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1);
  return [s1 * Math.sin(u2), s1 * Math.cos(u2), s2 * Math.sin(u3), s2 * Math.cos(u3)];
}

// Bakje rechterzijde — buiten het speelveld
const TRAY_CX = 4.5;
const TRAY_CZ = 0.0;

// ─── DiceTray ────────────────────────────────────────────────────────────────

const TW = 5.2;   // interior width
const TD = 3.2;   // interior depth
const TH = 0.55;  // visible wall height
const TT = 0.22;  // wall thickness
const GUARD_H = 4.0; // invisible guard wall height above visible walls

// BoxGeometry face volgorde: +X, -X, +Y, -Y, +Z, -Z → 3, 4, W, 1, 2, 5
const WORM_FACES = [3, 4, 'W', 1, 2, 5] as const;
export const DICE_SIZE = 0.42;

function makeFaceTex(face: number | 'W'): THREE.CanvasTexture {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, S - 4, S - 4);

  if (face === 'W') {
    ctx.font = `${S * 0.55}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐛', S / 2, S / 2);
  } else {
    const pips: [number, number][][] = [
      [],
      [[0.5, 0.5]],
      [[0.25, 0.25], [0.75, 0.75]],
      [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    ];
    ctx.fillStyle = '#c0392b';
    for (const [px, py] of pips[face as number] ?? []) {
      ctx.beginPath();
      ctx.arc(px * S, py * S, S * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function GrubDiceMesh() {
  const materials = useMemo(
    () => WORM_FACES.map(f => new THREE.MeshStandardMaterial({ map: makeFaceTex(f), roughness: 0.5 })),
    []
  );
  return (
    <mesh material={materials}>
      <boxGeometry args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} />
    </mesh>
  );
}

function SandFloor() {
  const texture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#C8A86A';
    ctx.fillRect(0, 0, size, size);

    // Zandkorrels en patches
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 4 + 0.5;
      const bright = (Math.random() - 0.5) * 60;
      const base = [200, 168, 106];
      const col = base.map(v => Math.min(255, Math.max(0, v + bright)));
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.4 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 30);
    return tex;
  }, []);

  const geometry = useMemo(() => {
    const segs = 120;
    const geo = new THREE.PlaneGeometry(600, 600, segs, segs);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Dichtbij: lichte golving; ver weg: grote zandduinen
      const dist = Math.sqrt(x * x + y * y);
      const nearWave = Math.sin(x * 0.04) * Math.cos(y * 0.03) * 0.35
                     + Math.sin(x * 0.09 + 1.3) * Math.sin(y * 0.07) * 0.2
                     + Math.cos(x * 0.06 + y * 0.05) * 0.15;
      const farDunes = Math.max(0, dist - 60) * 0.12
                     * (0.6 + 0.4 * Math.sin(x * 0.05 + 0.7) * Math.cos(y * 0.04));
      const h = nearWave + farDunes;
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.92, 0]} receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

function DiceTray() {
  const wallColor = "#7A5030";
  const floorColor = "#5A3820";
  const cx = TRAY_CX;
  const cz = TRAY_CZ;
  const wy = TH / 2;
  // Guard collider center y = visible wall top + guard half height
  const guardCy = TH + GUARD_H / 2;
  const floorThick = 0.3; // dikke vloer zodat snelle dobbelstenen er niet doorvallen

  return (
    <>
      {/* Vloer — dikke collider zodat dobbelstenen er niet doorheen vallen */}
      <RigidBody type="fixed" colliders={false} restitution={0.15} friction={0.95}>
        <CuboidCollider args={[(TW + TT * 2) / 2, floorThick / 2, (TD + TT * 2) / 2]} position={[cx, -floorThick / 2, cz]} />
      </RigidBody>
      {/* Visuele vloer */}
      <mesh position={[cx, 0.01, cz]} receiveShadow>
        <boxGeometry args={[TW, 0.004, TD]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>

      {/* 4 wanden: zichtbaar (TH) + onzichtbare guard collider daarboven (GUARD_H) */}
      {([
        // [meshX, meshZ, meshW, meshD, collHW, collHD]
        [cx - TW/2 - TT/2, cz,               TT, TD + TT*2, TT/2,          (TD + TT*2)/2],
        [cx + TW/2 + TT/2, cz,               TT, TD + TT*2, TT/2,          (TD + TT*2)/2],
        [cx, cz - TD/2 - TT/2, TW + TT*2, TT, (TW + TT*2)/2, TT/2        ],
        [cx, cz + TD/2 + TT/2, TW + TT*2, TT, (TW + TT*2)/2, TT/2        ],
      ] as [number,number,number,number,number,number][]).map(([mx, mz, mw, md, chw, chd], i) => (
        <RigidBody key={i} type="fixed" colliders={false} restitution={0.05} friction={0.9}>
          {/* Zichtbare wand */}
          <mesh position={[mx, wy, mz]} castShadow receiveShadow>
            <boxGeometry args={[mw, TH, md]} />
            <meshStandardMaterial color={wallColor} roughness={0.82} />
          </mesh>
          {/* Collider over volledige hoogte (zichtbaar + guard) */}
          <CuboidCollider args={[chw, (TH + GUARD_H) / 2, chd]} position={[mx, (TH + GUARD_H) / 2, mz]} />
        </RigidBody>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile3D component
// ─────────────────────────────────────────────────────────────────────────────

interface Tile3DProps {
  tile: Tile;
  position: [number, number, number];
  highlight?: boolean;
  compact?: boolean;
}

function makeTileTexture(value: number, worms: number, highlight: boolean): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = highlight ? '#122212' : '#111111';
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = highlight ? '#20D9A0' : '#2a2a2a';
  ctx.lineWidth = 10;
  const r = 20;
  ctx.beginPath();
  ctx.moveTo(r + 6, 6);
  ctx.arcTo(size - 6, 6, size - 6, size - 6, r);
  ctx.arcTo(size - 6, size - 6, 6, size - 6, r);
  ctx.arcTo(6, size - 6, 6, 6, r);
  ctx.arcTo(6, 6, size - 6, 6, r);
  ctx.closePath();
  ctx.stroke();

  // Value number
  ctx.fillStyle = highlight ? '#20D9A0' : '#e8e8e8';
  ctx.font = `bold 110px "DM Mono", "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(value), size / 2, 160);

  // Worm icons
  ctx.font = `${worms > 3 ? 32 : 38}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('🐛'.repeat(worms), size / 2, 222);

  return new THREE.CanvasTexture(canvas);
}

// Laad custom textuur als /public/textures/tegel-{value}.png of /public/textures/tegel.png bestaat,
// anders gebruik de canvas-gegenereerde textuur als fallback.
function useCustomOrCanvas(value: number, worms: number, highlight: boolean, available: boolean): THREE.Texture | null {
  const [customTex, setCustomTex] = useState<THREE.Texture | null>(null);

  const fallback = useMemo(
    () => available ? makeTileTexture(value, worms, highlight) : null,
    [value, worms, highlight, available]
  );

  useEffect(() => {
    if (!available) return;
    const loader = new THREE.TextureLoader();
    const tryLoad = (paths: string[]) => {
      if (paths.length === 0) return;
      loader.load(paths[0], (t) => { t.needsUpdate = true; setCustomTex(t); }, undefined, () => tryLoad(paths.slice(1)));
    };
    tryLoad([
      `/textures/tegel-${value}.png`,
      `/textures/tegel-${value}.svg`,
      `/textures/tegel.png`,
      `/textures/tegel.svg`,
    ]);
  }, [value, available]);

  return customTex ?? fallback;
}

function Tile3D({ tile, position, highlight = false, compact = false }: Tile3DProps) {
  const [hovered, setHovered] = useState(false);
  const w = compact ? 0.40 : 0.62;
  const h = compact ? 0.10 : 0.13;
  const d = compact ? 0.52 : 0.82;

  const texture = useCustomOrCanvas(tile.value, tile.worms, highlight, tile.available);

  if (!tile.available) {
    return (
      <group position={position}>
        <RoundedBox args={[w, h, d]} radius={0.03} castShadow receiveShadow>
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </RoundedBox>
      </group>
    );
  }

  const sideColor = highlight ? '#0d200d' : '#111111';

  return (
    <group position={position}>
      <RoundedBox
        args={[w, h, d]}
        radius={0.03}
        castShadow receiveShadow
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <meshStandardMaterial color={hovered ? '#1e1e1e' : sideColor} roughness={0.6} metalness={0.1} />
      </RoundedBox>
      {/* Top face with canvas texture */}
      <mesh position={[0, h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.02, d - 0.02]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.5}
          emissive={highlight ? '#103010' : '#000000'}
          emissiveIntensity={highlight ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player stack component
// ─────────────────────────────────────────────────────────────────────────────

function PlayerStack({ player, position }: { player: Player; position: [number, number, number] }) {
  if (player.stack.length === 0) return null;

  // Show a small stack; only top tile is visible/readable
  const stackHeight = Math.min(player.stack.length, 4);
  const topTile = player.stack[player.stack.length - 1];

  return (
    <group position={position}>
      {/* Stack base shadow tiles */}
      {Array.from({ length: Math.min(stackHeight - 1, 3) }).map((_, i) => (
        <group key={i} position={[0, i * 0.05, 0]}>
          <RoundedBox args={[0.42, 0.055, 0.55]} radius={0.02}>
            <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.1} />
          </RoundedBox>
        </group>
      ))}
      {/* Top tile — readable */}
      <Tile3D
        tile={topTile}
        position={[0, (Math.min(stackHeight - 1, 3)) * 0.05, 0]}
        compact
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DiceSection — physics tray + dice (from /dice page)
// ─────────────────────────────────────────────────────────────────────────────

type SpawnConfig = {
  pos: [number, number, number];
  startRotation: [number, number, number, number];
  impulse: [number, number, number];
  torque: [number, number, number];
};

function VisualDie({ pos, delay }: { pos: [number, number, number]; delay: number }) {
  const ref = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const q0 = useRef(new THREE.Quaternion(...randomQuat()));
  const q1 = useRef(new THREE.Quaternion(...randomQuat()));

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime + delay;
    const raw = (clock.elapsedTime - t0.current) / 0.55;
    if (raw < 0) return;
    const t = Math.min(raw, 1);

    // Val: cubic ease-out van y=1.8 naar y=0.22
    const ease = 1 - Math.pow(1 - t, 3);
    ref.current.position.y = 1.8 - (1.8 - 0.22) * ease;

    // Kleine bounce aan het einde
    if (raw > 1 && raw < 1.3) {
      const b = (raw - 1) / 0.3;
      ref.current.position.y = 0.22 + Math.sin(b * Math.PI) * 0.07;
    }

    // Rotatie: draait snel en vertraagt
    const spinT = Math.min(t * 1.4, 1);
    ref.current.setRotationFromQuaternion(
      new THREE.Quaternion().slerpQuaternions(q0.current, q1.current, spinT)
    );
  });

  return (
    <group ref={ref} position={[pos[0], 1.8, pos[2]]}>
      <DiceMesh />
    </group>
  );
}

function TableFloor() {
  const [ref] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    restitution: 0.1,
    friction: 0.8,
  }));
  return <mesh ref={ref} />;
}

function DiceSection({ gs, rolling, rollKey }: { gs: GameState; rolling: boolean; rollKey: number }) {
  const configsRef = useRef<SpawnConfig[]>([]);
  const prevRollKey = useRef(-1);

  if (rolling && rollKey !== prevRollKey.current) {
    prevRollKey.current = rollKey;
    const count = gs.turn.diceLeft;
    const cols = 4;
    const spacing = 0.72;
    configsRef.current = Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        pos: [(col - (cols - 1) / 2) * spacing + rnd(-0.1, 0.1), 3.0 + i * 0.15, 1.6 + row * spacing + rnd(-0.1, 0.1)] as [number, number, number],
        startRotation: randomQuat(),
        impulse: [0, 0, 0] as [number, number, number],
        torque: [rnd(-18, 18), rnd(-18, 18), rnd(-18, 18)] as [number, number, number],
      };
    });
  }

  return (
    <CannonPhysics gravity={[0, -12, 0]}>
      <TableFloor />
      {configsRef.current.map((cfg, i) => (
        <PhysicsDie
          key={`${prevRollKey.current}-${i}`}
          startPos={cfg.pos}
          startRotation={cfg.startRotation}
          torque={cfg.torque}
          onSettled={() => {}}
        >
          <GrubDiceMesh />
        </PhysicsDie>
      ))}
    </CannonPhysics>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Scene
// ─────────────────────────────────────────────────────────────────────────────

interface GameSceneProps {
  gs: GameState;
  rolling: boolean;
  rollKey: number;
  onPickFace?: (face: DiceFace) => void;
  phase: 'playing' | 'start' | 'gameover';
}

function GameScene({ gs, rolling, rollKey, onPickFace, phase }: GameSceneProps) {
  if (phase !== 'playing') return null;

  const { turn, tiles, players } = gs;
  const claim = canClaim(gs);

  // Determine which faces in rolled are pickable
  const pickableFaces = new Set<DiceFace>(
    turn.rolled.filter((f) => !turn.usedFaces.includes(f))
  );

  // Determine highlight tile (what player can claim)
  const claimTileValue = claim?.tile.value ?? null;

  return (
    <>
      <OrbitControls
        enablePan={false}
        minDistance={7}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, -2.5]}
      />

      <fogExp2 attach="fog" args={["#d4b87a", 0.018]} />
      <PirateLights />
      <SandFloor />

      {/* Objecten in het zand — geen vloerplanken, groter uitgespreid */}
      <group position={[0, -3.77, 0]} scale={3.5}>
        <PirateEnvironment />
      </group>

      {/* Houten tafel — oppervlak op y=0 */}
      <group position={[0, -0.09, 0]}>
        <WoodTable width={8} depth={6.5} legPositions={[[-3.2, -2.6], [3.2, -2.6], [-3.2, 2.4], [3.2, 2.4]]} />
      </group>

      {/* Center tiles — row 1: 21–28 */}
      {tiles.slice(0, 8).map((tile, i) => (
        <Tile3D
          key={tile.value}
          tile={tile}
          position={[tileX(i), 0.05, -0.5]}
          highlight={tile.value === claimTileValue}
        />
      ))}

      {/* Center tiles — row 2: 29–36 */}
      {tiles.slice(8, 16).map((tile, i) => (
        <Tile3D
          key={tile.value}
          tile={tile}
          position={[tileX(i), 0.05, 0.6]}
          highlight={tile.value === claimTileValue}
        />
      ))}

      {/* Player 0 (Robin) stack — bottom area */}
      <PlayerStack player={players[0]} position={[-2.5, 0, 3.2]} />
      <PlayerStack player={players[1]} position={[2.5, 0, 3.2]} />


      {/* Physics dice tray */}
      <DiceSection gs={gs} rolling={rolling} rollKey={rollKey} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────────

interface HUDProps {
  gs: GameState;
  rolling: boolean;
  vsAI: boolean;
  onRoll: () => void;
  onPick: (face: DiceFace) => void;
  onStop: () => void;
  onBust: () => void;
  onRestart: () => void;
  isMyTurn?: boolean;
  waitingFor?: string;
  timeLeft?: number | null;
  gameMode?: 'fast' | 'slow';
}

function HUD({ gs, rolling, vsAI, onRoll, onPick, onStop, onBust, onRestart, isMyTurn = true, waitingFor, timeLeft, gameMode }: HUDProps) {
  const { turn, players, currentPlayer, phase } = gs;
  const cp = players[currentPlayer];
  const claim = canClaim(gs);
  const canStop = !!claim && phase === 'rolled';

  const pickableFaces = Array.from(
    new Set(turn.rolled.filter((f) => !turn.usedFaces.includes(f)))
  ) as DiceFace[];
  pickableFaces.sort((a, b) => {
    if (a === 'W') return 1;
    if (b === 'W') return -1;
    return (a as number) - (b as number);
  });

  const glass: React.CSSProperties = {
    background: 'rgba(14,18,48,0.96)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderBottom: 'none',
    borderRadius: '14px 14px 0 0',
    padding: '6px 12px',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
  };

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 50, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif", fontWeight: 700,
    fontSize: 12, padding: '7px 0', flex: 1,
    transition: 'all 0.15s',
  };

  return (
    <>
      {/* Player score pills — top left */}
      <div style={{ position: 'absolute', top: 14, left: 16, zIndex: 10, display: 'flex', gap: 8 }}>
        {players.map((p, i) => {
          const active = i === currentPlayer;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: active ? 'rgba(255,252,248,0.9)' : 'rgba(255,252,248,0.55)',
              border: `1px solid ${active ? 'rgba(90,180,130,0.5)' : 'rgba(160,130,100,0.2)'}`,
              borderRadius: 50, padding: '6px 14px',
              boxShadow: active ? '0 4px 16px rgba(80,160,110,0.2)' : 'none',
              transition: 'all 0.2s',
            }}>
              {active && <span style={{ color: '#2A6B4A', fontSize: 10 }}>▶</span>}
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: active ? '#2A1A08' : 'rgba(60,40,20,0.4)' }}>
                {p.name}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: active ? '#2A6B4A' : 'rgba(60,40,20,0.3)' }}>
                {totalWorms(p)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Control panel */}
      <div style={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', width: 'min(420px, calc(100vw - 32px))', zIndex: 10 }}>
        {phase === 'gameover' ? (
          <div style={{ ...glass, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 700, color: '#20D9A0', marginBottom: 6 }}>
              Spel Voorbij!
            </div>
            {(() => {
              const winnerName = determineWinner(players);
              return players.map((p, i) => (
                <div key={i} style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.7)', marginBottom: 2 }}>
                  {p.name}: {totalWorms(p)}
                  {p.name === winnerName && (
                    <span style={{ color: '#20D9A0', marginLeft: 6, fontWeight: 700 }}>Winnaar!</span>
                  )}
                </div>
              ));
            })()}
            <button onClick={onRestart} style={{ ...btnBase, marginTop: 8, background: '#20D9A0', color: '#052e16', padding: '7px 24px', flex: 'unset' }}>
              Opnieuw
            </button>
          </div>
        ) : phase === 'bust' ? (
          <div style={{ ...glass, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 14, fontWeight: 700, color: '#FF5C5C', marginBottom: vsAI && currentPlayer === 1 ? 0 : 8 }}>
              {vsAI && currentPlayer === 1 ? 'AI heeft pech...' : 'Pech! Geen geldige dobbelstenen.'}
            </div>
            {!(vsAI && currentPlayer === 1) && (
              <button onClick={onBust} style={{ ...btnBase, background: '#FF5C5C', color: '#fff', padding: '7px 24px', flex: 'unset' }}>
                Verder
              </button>
            )}
          </div>
        ) : waitingFor ? (
          <div style={{ ...glass, textAlign: 'center', padding: '8px 16px' }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.45)' }}>
              Wachten op {waitingFor}...
            </div>
          </div>
        ) : vsAI && currentPlayer === 1 ? (
          <div style={{ ...glass, textAlign: 'center', padding: '8px 16px' }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.4)' }}>AI speelt...</div>
          </div>
        ) : (
          <div style={glass}>
            {timeLeft !== null && timeLeft !== undefined && gameMode && (
              <div style={{ marginBottom: 4 }}>
                <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={!!isMyTurn} accent="#22C55E" />
              </div>
            )}
            {/* Status line */}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(238,242,255,0.4)', marginBottom: 5, display: 'flex', gap: 12 }}>
              <span style={{ color: '#4ADE80', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 11 }}>{cp.name}</span>
              <span>totaal <strong style={{ color: '#EEF2FF' }}>{turn.total}</strong></span>
              <span>worm <strong style={{ color: turn.hasWorm ? '#4ADE80' : '#F87171' }}>{turn.hasWorm ? '✓' : '✗'}</strong></span>
              <span><strong style={{ color: '#EEF2FF' }}>{turn.diceLeft}</strong>d over</span>
            </div>

            {/* Face pick buttons */}
            {phase === 'rolled' && pickableFaces.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
                {pickableFaces.map((face) => {
                  const count = turn.rolled.filter((f) => f === face).length;
                  return (
                    <button
                      key={face}
                      onClick={() => onPick(face)}
                      style={{
                        background: 'rgba(74,222,128,0.1)',
                        border: '1px solid rgba(74,222,128,0.35)',
                        color: '#4ADE80',
                        borderRadius: 8, padding: '4px 10px',
                        fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 13,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36,
                      }}
                    >
                      <span>{face}</span>
                      <span style={{ fontSize: 8, opacity: 0.5, marginTop: 1 }}>×{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onRoll}
                disabled={rolling || phase === 'rolled' || turn.diceLeft === 0}
                style={{
                  ...btnBase,
                  background: rolling || phase === 'rolled' || turn.diceLeft === 0 ? 'rgba(255,255,255,0.07)' : '#5EC49A',
                  color: rolling || phase === 'rolled' || turn.diceLeft === 0 ? 'rgba(238,242,255,0.2)' : '#fff',
                  border: rolling || phase === 'rolled' || turn.diceLeft === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  cursor: rolling || phase === 'rolled' || turn.diceLeft === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {rolling ? 'Gooien...' : 'Gooi'}
              </button>
              <button
                onClick={onStop}
                disabled={!canStop}
                style={{
                  ...btnBase,
                  background: canStop ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                  color: canStop ? '#4ADE80' : 'rgba(238,242,255,0.2)',
                  border: `1px solid ${canStop ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: canStop ? 'pointer' : 'not-allowed',
                }}
              >
                Stop{claim ? ` (${claim.tile.value})` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start Screen
// ─────────────────────────────────────────────────────────────────────────────

interface StartScreenProps {
  onStart: (names: [string, string], vsAI: boolean) => void;
}

function StartScreen({ onStart }: StartScreenProps) {
  const [name1, setName1] = useState("Robin");
  const [name2, setName2] = useState("Loic");

  const inputStyle: React.CSSProperties = {
    background: 'rgba(17,22,58,0.8)',
    border: '1px solid rgba(32,217,160,0.3)',
    borderRadius: 14,
    padding: '10px 14px',
    color: '#EEF2FF',
    fontFamily: "'Nunito', sans-serif",
    fontSize: 15,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'rgba(196,152,64,0.6)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080B24',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Back link */}
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(238,242,255,0.45)',
            background: 'transparent',
            border: '1px solid rgba(32,217,160,0.2)',
            borderRadius: 50,
            padding: '6px 14px',
            cursor: 'pointer',
          }}>
            ← Terug
          </button>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        {/* Title */}
        <h1 style={{
          fontFamily: "'Fredoka', sans-serif",
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 900,
          letterSpacing: '0.1em',
          background: 'linear-gradient(160deg, #ffffff 0%, #20D9A0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: '0 0 6px',
          lineHeight: 0.95,
        }}>
          REGEN
        </h1>
        <h1 style={{
          fontFamily: "'Fredoka', sans-serif",
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 900,
          letterSpacing: '0.1em',
          color: '#20D9A0',
          margin: '0 0 20px',
          lineHeight: 0.95,
        }}>
          WORMEN
        </h1>

        <div style={{ marginBottom: 20 }} />

        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: '#20D9A0',
          margin: '0 0 40px',
        }}>
          Dobbelstenen · Wormen · Stelen
        </p>

        {/* Form */}
        <div style={{
          background: 'rgba(17,22,58,0.6)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          padding: '28px 24px',
          textAlign: 'left',
        }}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Speler 1</label>
            <input
              style={inputStyle}
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(196,152,64,0.7)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(32,217,160,0.3)'; }}
              placeholder="Naam..."
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Speler 2</label>
            <input
              style={inputStyle}
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(196,152,64,0.7)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(32,217,160,0.3)'; }}
              placeholder="Naam..."
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onStart([name1 || 'Speler 1', name2 || 'Speler 2'], false)}
              style={{
                flex: 1,
                background: '#20D9A0',
                color: '#052e16',
                border: 'none',
                borderRadius: 50,
                padding: '13px',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              2 Spelers
            </button>
            <button
              onClick={() => onStart([name1 || 'Speler 1', 'AI'], true)}
              style={{
                flex: 1,
                background: 'rgba(32,217,160,0.12)',
                color: '#20D9A0',
                border: '1px solid rgba(32,217,160,0.4)',
                borderRadius: 50,
                padding: '13px',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              vs AI
            </button>
          </div>
        </div>

        {/* Rules teaser */}
        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 12,
          color: 'rgba(238,242,255,0.28)',
          margin: '24px 0 0',
          lineHeight: 1.7,
        }}>
          Gooi dobbelstenen, verzamel wormen en steel van je tegenstander.
          Maar pas op voor pech!
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page (inner — needs useSearchParams → wrap in Suspense)
// ─────────────────────────────────────────────────────────────────────────────

function GrubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const aiParam = searchParams.get("ai") === "1";

  const [screenPhase, setScreenPhase] = useState<'start' | 'waiting' | 'playing'>('start');
  const [gs, setGs] = useState<GameState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [vsAI, setVsAI] = useState(false);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [opponentName, setOpponentName] = useState("");
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Online mode: join room via socket and wait for opponent
  useEffect(() => {
    if (!roomId) return;

    const pidx = parseInt(sessionStorage.getItem(`ludus-pidx-${roomId}`) ?? "0");
    const myName = sessionStorage.getItem("ludus-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setScreenPhase('waiting');

    const socket = getSocket();

    // AI quickmatch fallback: start immediately with AI as player 2
    if (aiParam) {
      setVsAI(true);
      setMyPlayerIndex(pidx);
      const game = newGame([myName, "AI"]);
      setGs(game);
      setScreenPhase('playing');
      return;
    }

    // Only emit join-room on mount for fresh joins (no pidx set = didn't join via lobby)
    const pidxRaw = sessionStorage.getItem(`ludus-pidx-${roomId}`);
    const needsJoin = pidxRaw === null;

    function rejoin() {
      // Join or rejoin room (called on mount for fresh joins, and on reconnect)
      socket.emit("join-room", { roomId, name: myName }, (res: { ok: boolean; playerIndex?: number; players?: string[]; error?: string; isSpectator?: boolean }) => {
        if (!res.ok) return;
        if (res.players && res.players.length === 2) {
          const idx = res.isSpectator ? -1 : (res.playerIndex ?? pidx);
          setOpponentName(res.players[idx === 0 ? 1 : 0] ?? "");
        }
        if (res.isSpectator) {
          setIsSpectator(true);
          setMyPlayerIndex(-1);
        } else if (res.playerIndex !== undefined) {
          setMyPlayerIndex(res.playerIndex);
        }
      });
    }

    const onRoomUpdate = ({ players: names, ready }: { players: string[]; ready: boolean; roomId: string }) => {
      if (names.length >= 2) setOpponentName(names[1 - pidx] ?? "");
      if (ready && pidx === 0) {
        // Only init the game if not already playing (avoids re-init on reconnect)
        setGs((prev) => {
          if (prev) return prev; // already have a game state (e.g. from state-sync)
          const p2Name = names[1] ?? "Speler 2";
          const game = newGame([myName, p2Name]);
          socket.emit("state-update", { gameState: game });
          return game;
        });
        setScreenPhase('playing');
      }
    };

    const onStateSync = ({ gameState }: { gameState: GameState | null }) => {
      if (gameState) {
        setGs(gameState);
        setScreenPhase('playing');
      }
    };

    const onStateUpdate = ({ gameState }: { gameState: GameState }) => {
      setGs(gameState);
      setScreenPhase('playing');
    };

    socket.on("room-update", onRoomUpdate);
    socket.on("state-sync", onStateSync);
    socket.on("state-update", onStateUpdate);

    // Join on initial mount only for fresh navigations (not room creators via lobby)
    if (needsJoin) {
      if (socket.connected) {
        rejoin();
      } else {
        socket.once("connect", rejoin);
      }
    }
    socket.io.on("reconnect", rejoin);

    // Request current state in case we missed room-update/state-update during navigation
    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null; players: string[] }) => {
      if (res.players.length >= 2) setOpponentName(res.players[1 - pidx] ?? "");
      if (res.gameState) {
        setGs(res.gameState);
        setScreenPhase('playing');
      }
    });

    socket.on("turn-forfeit", ({ winnerName }: { loserIndex: number; winnerName: string }) => {
      setForfeitWinner(winnerName);
    });

    return () => {
      socket.off("room-update", onRoomUpdate);
      socket.off("state-sync", onStateSync);
      socket.off("state-update", onStateUpdate);
      socket.off("turn-forfeit");
      socket.off("connect", rejoin);
      socket.io.off("reconnect", rejoin);
    };
  }, [roomId, aiParam]); // eslint-disable-line react-hooks/exhaustive-deps

  function emitState(newGs: GameState) {
    if (roomId) getSocket().emit("state-update", { gameState: newGs });
  }

  // Local start
  function handleStart(names: [string, string], ai: boolean) {
    setVsAI(ai);
    setMyPlayerIndex(0);
    setGs(newGame(names));
    setScreenPhase('playing');
  }

  function handleRestart() {
    if (roomId) { router.push(`/lobby?game=grub`); return; }
    setGs(null);
    setVsAI(false);
    setScreenPhase('start');
  }

  // Is it my turn (online) or can I always act (local)?
  const isMyTurn = !roomId || (gs !== null && gs.currentPlayer === myPlayerIndex);
  const { timeLeft, gameMode } = useTurnTimer(isMyTurn);

  // AI beurt — local only
  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1 || gs.phase === 'gameover' || rolling) return;

    if (gs.phase === 'bust') {
      const t = setTimeout(() => setGs((prev) => prev ? performBust(prev) : prev), 900);
      return () => clearTimeout(t);
    }

    if (gs.phase === 'idle') {
      if (aiShouldClaim(gs)) {
        const t = setTimeout(() => setGs((prev) => prev ? performClaim(prev) : prev), 700);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setRolling(true);
        setRollKey((k) => k + 1);
        setTimeout(() => {
          setGs((prev) => {
            if (!prev) return prev;
            const rolled = rollN(prev.turn.diceLeft);
            const newTurn = { ...prev.turn, rolled };
            const bust = isBust(newTurn);
            return { ...prev, turn: newTurn, phase: bust ? 'bust' : 'rolled' };
          });
          setRolling(false);
        }, 1400);
      }, 600);
      return () => clearTimeout(t);
    }

    if (gs.phase === 'rolled') {
      const face = aiBestFace(gs.turn);
      if (!face) return;
      const t = setTimeout(() => {
        setGs((prev) => {
          if (!prev) return prev;
          const newTurn = pickFace(face, prev.turn);
          let newGs = { ...prev, turn: newTurn };
          if (newTurn.diceLeft === 0) {
            const claim = canClaim(newGs);
            newGs = claim ? performClaim(newGs) : { ...newGs, phase: 'bust' };
          } else {
            newGs = { ...newGs, phase: 'idle' };
          }
          return newGs;
        });
      }, 700);
      return () => clearTimeout(t);
    }
  }, [gs, vsAI, rolling, roomId]);

  function handleRoll() {
    if (!gs || rolling || !isMyTurn) return;
    setRolling(true);
    setRollKey((k) => k + 1);
    setTimeout(() => {
      setGs((prev) => {
        if (!prev) return prev;
        const rolled = rollN(prev.turn.diceLeft);
        const newTurn = { ...prev.turn, rolled };
        const bust = isBust(newTurn);
        const next = { ...prev, turn: newTurn, phase: bust ? 'bust' : 'rolled' } as GameState;
        emitState(next);
        return next;
      });
      setRolling(false);
    }, 1400);
  }

  function handlePick(face: DiceFace) {
    if (!gs || gs.phase !== 'rolled' || !isMyTurn) return;
    const newTurn = pickFace(face, gs.turn);
    let newGs = { ...gs, turn: newTurn };
    if (newTurn.diceLeft === 0) {
      const claim = canClaim(newGs);
      newGs = claim ? performClaim(newGs) : { ...newGs, phase: 'bust' };
    } else {
      newGs = { ...newGs, phase: 'idle' };
    }
    setGs(newGs);
    emitState(newGs);
  }

  function handleStop() {
    if (!gs || !isMyTurn) return;
    const claim = canClaim(gs);
    if (!claim) return;
    const newGs = performClaim(gs);
    setGs(newGs);
    emitState(newGs);
  }

  function handleBust() {
    if (!gs || !isMyTurn) return;
    const newGs = performBust(gs);
    setGs(newGs);
    emitState(newGs);
  }

  // Waiting screen (online, opponent not yet joined)
  if (screenPhase === 'waiting') {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 35%, #1A3A5C 0%, #0E2440 40%, #081828 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 28, fontWeight: 700, color: '#2A6B4A' }}>Wachten op tegenstander...</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'rgba(60,40,20,0.4)', letterSpacing: 3 }}>Room: {roomId}</div>
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }}
          style={{ padding: "10px 24px", borderRadius: 50, border: "1px solid rgba(42,107,74,0.3)", background: "transparent", color: inviteCopied ? "#22C55E" : "rgba(42,107,74,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          {inviteCopied ? "Link gekopieerd!" : "Kopieer uitnodigingslink"}
        </button>
        <BottomNav items={[
          { label: "Home",   icon: "home", onClick: () => router.push("/") },
          { label: "Lobby",  icon: "lobby", onClick: () => router.push("/lobby?game=grub") },
          { label: "Scores", icon: "scores", onClick: () => router.push("/scores") },
        ]} />
      </div>
    );
  }

  if (screenPhase === 'start' || !gs) {
    return <StartScreen onStart={handleStart} />;
  }

  // Online: show waiting panel when it's not my turn
  const showWaitingForOpponent = roomId && !isMyTurn;

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(ellipse at 50% 35%, #1A3A5C 0%, #0E2440 40%, #081828 100%)', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 14, 12], fov: 42 }}
        shadows
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 140 }}
        onCreated={({ camera }) => { camera.lookAt(0, 0, 0); }}
      >
        <Suspense fallback={null}>
          <RapierPhysics gravity={[0, -14, 0]} timeStep={1/60}>
            <GameScene
              gs={gs}
              rolling={rolling}
              rollKey={rollKey}
              onPickFace={isMyTurn ? handlePick : undefined}
              phase="playing"
            />
          </RapierPhysics>
        </Suspense>
      </Canvas>

      <HUD
        gs={gs}
        rolling={rolling}
        vsAI={vsAI && !roomId}
        onRoll={handleRoll}
        onPick={handlePick}
        onStop={handleStop}
        onBust={handleBust}
        onRestart={handleRestart}
        isMyTurn={isMyTurn}
        waitingFor={showWaitingForOpponent ? (opponentName || gs.players[gs.currentPlayer]?.name) : undefined}
        timeLeft={roomId && !forfeitWinner ? timeLeft : null}
        gameMode={gameMode}
      />
      {roomId && (
        <GameControls
          roomId={roomId}
          myName={gs?.players[myPlayerIndex]?.name ?? "Speler"}
          playerNames={gs?.players.map(p => p.name) ?? []}
          gameType="grub"
          isSpectator={isSpectator}
          isGameOver={gs?.phase === 'gameover' || forfeitWinner !== null}
          myPlayerIndex={myPlayerIndex}
          accent="#22C55E"
          onResign={!vsAI ? () => getSocket().emit("resign") : undefined}
        />
      )}

      {forfeitWinner && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,2,0,0.92)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 200 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(238,242,255,0.4)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/><path d="M9 3h6"/></svg>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: '#EEF2FF' }}>Tijd verstreken!</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: 'rgba(238,242,255,0.5)' }}>{forfeitWinner} wint door beurt-timeout</div>
          <button onClick={() => router.push('/lobby?game=grub')} style={{ marginTop: 12, padding: '12px 32px', borderRadius: 50, border: 'none', background: '#22C55E', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Terug naar lobby
          </button>
        </div>
      )}

      {/* Knoppen rechtsboven */}
      <div style={{ position: 'absolute', top: 14, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
        <button
          onClick={handleRestart}
          style={{
            fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 11,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(255,100,100,0.6)', background: 'transparent',
            border: '1px solid rgba(255,100,100,0.2)', borderRadius: 50,
            padding: '6px 14px', cursor: 'pointer',
          }}
        >
          Opgeven
        </button>
        <button
          onClick={() => setShowRules(true)}
          style={{
            fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 11,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(238,242,255,0.45)', background: 'transparent',
            border: '1px solid rgba(32,217,160,0.2)', borderRadius: 50,
            padding: '6px 14px', cursor: 'pointer',
          }}
        >
          Spelregels
        </button>
      </div>

      {showRules && (
        <div onClick={() => setShowRules(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(17,22,58,0.97)', border: '1px solid rgba(32,217,160,0.25)', borderRadius: 20, padding: '28px', maxWidth: 440, width: '100%', color: '#EEF2FF', fontFamily: "'Nunito', sans-serif", maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 22, fontWeight: 700, color: '#20D9A0', marginBottom: 16 }}>Spelregels — Grub</div>
            {([
              ['Doel', 'Verzamel zoveel mogelijk wormen door tegels te pakken. De speler met de meeste wormen wint.'],
              ['Gooien', 'Gooi alle 8 dobbelstenen. Kies één waarde (1–5 of 🐛) en leg die apart. Gooi de rest opnieuw.'],
              ['Worm (🐛)', 'De worm telt als 5 punten én is verplicht om een tegel te pakken. Zonder worm kun je niet stoppen.'],
              ['Stoppen', 'Je mag stoppen als je totaal ≥ 21 is én je minstens één worm hebt. Pak de tegel met die waarde (of lager).'],
              ['Stelen', 'Heb je exact het getal van de bovenste tegel van een tegenstander? Dan steel je die tegel!'],
              ['Pech', 'Geen nieuwe waarde te kiezen? Je verliest je beurt én de hoogste tegel van de rij keert terug.'],
              ['Einde', 'Het spel eindigt als alle tegels weg zijn. De meeste wormen wint.'],
            ] as [string, string][]).map(([title, text]) => (
              <div key={title} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#20D9A0', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'rgba(238,242,255,0.7)', lineHeight: 1.6 }}>{text}</div>
              </div>
            ))}
            <button onClick={() => setShowRules(false)} style={{ marginTop: 8, width: '100%', padding: '11px', borderRadius: 50, border: 'none', background: '#20D9A0', color: '#052e16', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Sluiten
            </button>
          </div>
        </div>
      )}

      <BottomNav items={[
        { label: "Home",   icon: "home", onClick: () => router.push("/") },
        { label: "Lobby",  icon: "lobby", onClick: () => router.push("/lobby?game=grub") },
        { label: "Scores", icon: "scores", onClick: () => router.push("/scores") },
      ]} />
    </div>
  );
}

export default function GrubPage() {
  return (
    <Suspense>
      <GrubContent />
    </Suspense>
  );
}

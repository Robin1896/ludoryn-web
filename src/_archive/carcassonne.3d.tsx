"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav, TurnTimer } from "@/components/ui";
import { useTurnTimer } from "@/lib/useTurnTimer";
import GameControls from "@/components/GameControls";
import {
  TileDef, PlacedTile, Board, GameState, MeepleFeature,
  TILE_DEFS, PLAYER_COLORS,
  newGame, rotateTile, placeTile, placeMeeple, passMeeple, skipTile, aiDecide,
  getEdge, getConnectedEdges, getValidPlacements, isValidPlacement,
  featureHasMeeple, cloisterScore, findFeature, scoreFeature,
} from "@/lib/carcassonne";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TILE_SIZE = 1.0;
const EDGE_COLORS: Record<string, string> = { C: '#c8a050', R: '#8c8c80', F: '#4a7c3f' };

// ─────────────────────────────────────────────────────────────────────────────
// Tile visual — purely declarative based on edge types
// ─────────────────────────────────────────────────────────────────────────────

// City strip positions for each direction (N=0, E=1, S=2, W=3)
const CITY_STRIPS: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [
  { pos: [0, 0.055, -0.36],  size: [0.94, 0.13, 0.23] }, // N
  { pos: [0.36, 0.055, 0],   size: [0.23, 0.13, 0.94] }, // E
  { pos: [0, 0.055, 0.36],   size: [0.94, 0.13, 0.23] }, // S
  { pos: [-0.36, 0.055, 0],  size: [0.23, 0.13, 0.94] }, // W
];

const ROAD_STUBS: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [
  { pos: [0, 0.065, -0.27], size: [0.17, 0.04, 0.47] }, // N stub
  { pos: [0.27, 0.065, 0],  size: [0.47, 0.04, 0.17] }, // E stub
  { pos: [0, 0.065, 0.27],  size: [0.17, 0.04, 0.47] }, // S stub
  { pos: [-0.27, 0.065, 0], size: [0.47, 0.04, 0.17] }, // W stub
];

interface TileVisualProps {
  defId: string;
  rotation: 0 | 1 | 2 | 3;
  meeple: { player: number; feature: MeepleFeature } | null;
  opacity?: number;
  emissive?: string;
}

function TileVisual({ defId, rotation, meeple, opacity = 1, emissive = '#000000' }: TileVisualProps) {
  const def = TILE_DEFS[defId];
  if (!def) return null;

  const edges = [0, 1, 2, 3].map(d => getEdge(def, rotation, d));
  const transparent = opacity < 1;

  const cityMat = <meshStandardMaterial color="#c8a050" transparent={transparent} opacity={opacity} emissive={emissive} emissiveIntensity={0.15} />;
  const roadMat = <meshStandardMaterial color="#8c8c7c" transparent={transparent} opacity={opacity} />;

  // Determine which road edges are connected — for connected pairs draw full strip
  const roadStubsNeeded = [false, false, false, false];
  const roadFullStrips: Array<[number, number]> = [];
  const roadProcessed = new Set<number>();

  for (let dir = 0; dir < 4; dir++) {
    if (edges[dir] !== 'R' || roadProcessed.has(dir)) continue;
    const connected = getConnectedEdges(def, rotation, dir).filter(e => edges[e] === 'R');
    if (connected.length === 2) {
      const a = connected[0], b = connected[1];
      roadFullStrips.push([a, b]);
      roadProcessed.add(a);
      roadProcessed.add(b);
    } else {
      roadStubsNeeded[dir] = true;
    }
  }

  return (
    <group>
      {/* Base / field */}
      <mesh>
        <boxGeometry args={[0.96, 0.1, 0.96]} />
        <meshStandardMaterial color="#4a7c3f" transparent={transparent} opacity={opacity} />
      </mesh>

      {/* City edge strips */}
      {[0, 1, 2, 3].map(dir =>
        edges[dir] === 'C' ? (
          <mesh key={`ce-${dir}`} position={CITY_STRIPS[dir].pos}>
            <boxGeometry args={CITY_STRIPS[dir].size} />
            {cityMat}
          </mesh>
        ) : null
      )}

      {/* Center city fill */}
      {def.center === 'C' && (
        <mesh position={[0, 0.055, 0]}>
          <boxGeometry args={[0.5, 0.13, 0.5]} />
          {cityMat}
        </mesh>
      )}

      {/* Shield */}
      {def.shield && (
        <mesh position={[0, 0.12, -0.2]}>
          <boxGeometry args={[0.12, 0.04, 0.12]} />
          <meshStandardMaterial color="#d4a017" emissive="#d4a017" emissiveIntensity={0.3} />
        </mesh>
      )}

      {/* Road full strips (connected pairs) */}
      {roadFullStrips.map(([a, b]) => {
        // N-S or E-W straight
        if ((a === 0 && b === 2) || (a === 2 && b === 0)) {
          return (
            <mesh key="rs-ns" position={[0, 0.065, 0]}>
              <boxGeometry args={[0.17, 0.04, 0.96]} />
              {roadMat}
            </mesh>
          );
        }
        if ((a === 1 && b === 3) || (a === 3 && b === 1)) {
          return (
            <mesh key="rs-ew" position={[0, 0.065, 0]}>
              <boxGeometry args={[0.96, 0.04, 0.17]} />
              {roadMat}
            </mesh>
          );
        }
        // Curve: render two stubs
        return [a, b].map(dir => (
          <mesh key={`rc-${dir}`} position={ROAD_STUBS[dir].pos}>
            <boxGeometry args={ROAD_STUBS[dir].size} />
            {roadMat}
          </mesh>
        ));
      })}

      {/* Road terminal stubs (crossroads) */}
      {[0, 1, 2, 3].map(dir =>
        roadStubsNeeded[dir] ? (
          <mesh key={`rst-${dir}`} position={ROAD_STUBS[dir].pos}>
            <boxGeometry args={ROAD_STUBS[dir].size} />
            {roadMat}
          </mesh>
        ) : null
      )}

      {/* Cloister */}
      {def.center === 'K' && (
        <group>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.2, 0.15, 0.2]} />
            <meshStandardMaterial color="#f0d060" emissive="#f0d060" emissiveIntensity={0.2} transparent={transparent} opacity={opacity} />
          </mesh>
          <mesh position={[0, 0.175, 0]}>
            <coneGeometry args={[0.12, 0.12, 4]} />
            <meshStandardMaterial color="#e05020" transparent={transparent} opacity={opacity} />
          </mesh>
        </group>
      )}

      {/* Meeple */}
      {meeple && <MeepleOn feature={meeple.feature} player={meeple.player} def={def} rotation={rotation} />}
    </group>
  );
}

// Meeple positions for each feature
const MEEPLE_POSITIONS: Record<string | number, [number, number, number]> = {
  0: [0, 0.2, -0.28],   // N
  1: [0.28, 0.2, 0],    // E
  2: [0, 0.2, 0.28],    // S
  3: [-0.28, 0.2, 0],   // W
  K: [0, 0.28, 0],      // Cloister
};

function MeepleOn({ feature, player, def, rotation }: { feature: MeepleFeature; player: number; def: TileDef; rotation: number }) {
  const pos = feature === 'K' ? MEEPLE_POSITIONS.K : MEEPLE_POSITIONS[feature as number];
  const color = PLAYER_COLORS[player];
  // Adjust position based on which edge the meeple is on
  const edgeType = feature === 'K' ? 'K' : getEdge(def, rotation, feature as number);
  const yBase = edgeType === 'C' ? 0.18 : 0.14;
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <mesh position={[0, yBase, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.12, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, yBase + 0.11, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board + interaction
// ─────────────────────────────────────────────────────────────────────────────

interface BoardSceneProps {
  gs: GameState;
  onPlaceTile: (bx: number, by: number) => void;
  onPlaceMeeple: (feature: MeepleFeature) => void;
  isMyTurn: boolean;
  vsAI: boolean;
}

function BoardScene({ gs, onPlaceTile, onPlaceMeeple, isMyTurn }: BoardSceneProps) {
  const [hover, setHover] = useState<{ bx: number; by: number } | null>(null);
  const planeRef = useRef<THREE.Mesh>(null);

  const validPositions = gs.phase === 'place_tile' && gs.currentTile && isMyTurn
    ? getValidPlacements(gs.board, gs.currentTile)
    : [];
  const validSet = new Set(validPositions.map(p => `${p.bx},${p.by}`));

  const isHoverValid = hover
    ? validSet.has(`${hover.bx},${hover.by}`) && isValidPlacement(gs.board, gs.currentTile!, gs.currentRotation, hover.bx, hover.by)
    : false;

  function handleFloorMove(e: ThreeEvent<PointerEvent>) {
    if (gs.phase !== 'place_tile' || !isMyTurn) return;
    e.stopPropagation();
    const bx = Math.round(e.point.x / TILE_SIZE);
    const by = Math.round(e.point.z / TILE_SIZE);
    setHover({ bx, by });
  }

  function handleFloorClick(e: ThreeEvent<MouseEvent>) {
    if (gs.phase !== 'place_tile' || !isMyTurn || !hover || !isHoverValid) return;
    e.stopPropagation();
    onPlaceTile(hover.bx, hover.by);
    setHover(null);
  }

  // For meeple placement: show click zones on last placed tile
  const lastTile = gs.lastPlaced ? gs.board[gs.lastPlaced] : null;
  const lastDef = lastTile ? TILE_DEFS[lastTile.defId] : null;
  const meepleZones: Array<{ feature: MeepleFeature; pos: [number, number, number]; valid: boolean }> = [];

  if (gs.phase === 'place_meeple' && isMyTurn && gs.lastPlaced && lastTile && lastDef) {
    const [lbx, lby] = gs.lastPlaced.split(',').map(Number);
    const wx = lbx * TILE_SIZE;
    const wz = lby * TILE_SIZE;

    // Edge features
    for (let dir = 0; dir < 4; dir++) {
      const et = getEdge(lastDef, lastTile.rotation, dir);
      if (et === 'F') continue;
      const valid = !featureHasMeeple(gs.board, gs.lastPlaced, dir) && gs.players[gs.currentPlayer].meeplesLeft > 0;
      const offsets: [number, number][] = [[0,-0.28],[0.28,0],[0,0.28],[-0.28,0]];
      const [ox, oz] = offsets[dir];
      meepleZones.push({ feature: dir as MeepleFeature, pos: [wx + ox, 0.15, wz + oz], valid });
    }

    // Cloister
    if (lastDef.center === 'K') {
      meepleZones.push({ feature: 'K', pos: [wx, 0.25, wz], valid: gs.players[gs.currentPlayer].meeplesLeft > 0 });
    }
  }

  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#2a4a22" />
      </mesh>

      {/* Grid dots */}
      {validPositions.map(({ bx, by }) => (
        <mesh key={`vp-${bx}-${by}`} position={[bx * TILE_SIZE, 0.001, by * TILE_SIZE]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 0.9]} />
          <meshStandardMaterial color="#6aaa5a" transparent opacity={0.25} />
        </mesh>
      ))}

      {/* Placed tiles */}
      {Object.entries(gs.board).map(([pos, placed]) => {
        const [bx, by] = pos.split(',').map(Number);
        const isLast = pos === gs.lastPlaced;
        return (
          <group key={pos} position={[bx * TILE_SIZE, 0, by * TILE_SIZE]}>
            <TileVisual
              defId={placed.defId}
              rotation={placed.rotation}
              meeple={placed.meeple}
              emissive={isLast ? '#334422' : '#000000'}
            />
          </group>
        );
      })}

      {/* Ghost tile at hover */}
      {hover && isHoverValid && gs.currentTile && !gs.board[`${hover.bx},${hover.by}`] && (
        <group position={[hover.bx * TILE_SIZE, 0, hover.by * TILE_SIZE]}>
          <TileVisual defId={gs.currentTile} rotation={gs.currentRotation} meeple={null} opacity={0.55} />
        </group>
      )}

      {/* Meeple placement zones */}
      {meepleZones.map((z, i) => (
        <mesh
          key={i}
          position={z.pos}
          onClick={(e) => { e.stopPropagation(); if (z.valid) onPlaceMeeple(z.feature); }}
        >
          <boxGeometry args={[0.22, 0.08, 0.22]} />
          <meshStandardMaterial
            color={z.valid ? '#22dd66' : '#dd2222'}
            transparent
            opacity={0.5}
            emissive={z.valid ? '#22dd66' : '#dd2222'}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}

      {/* Invisible click plane */}
      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.051, 0]}
        visible={false}
        onPointerMove={handleFloorMove}
        onClick={handleFloorClick}
        onPointerLeave={() => setHover(null)}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lights
// ─────────────────────────────────────────────────────────────────────────────

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-4, 8, -3]} intensity={0.4} color="#c0d8ff" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile preview (SVG)
// ─────────────────────────────────────────────────────────────────────────────

function TilePreview({ defId, rotation }: { defId: string; rotation: number }) {
  const def = TILE_DEFS[defId];
  if (!def) return null;
  const edges = [0, 1, 2, 3].map(d => getEdge(def, rotation, d));
  const ec: Record<string, string> = { C: '#c8a050', R: '#8c8c80', F: '#4a7c3f' };
  const sz = 64, ew = 14;
  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ borderRadius: 6, display: 'block' }}>
      <rect width={sz} height={sz} fill="#4a7c3f" rx="6" />
      {/* N */ }<rect x={0} y={0} width={sz} height={ew} fill={ec[edges[0]]} />
      {/* E */ }<rect x={sz - ew} y={0} width={ew} height={sz} fill={ec[edges[1]]} />
      {/* S */ }<rect x={0} y={sz - ew} width={sz} height={ew} fill={ec[edges[2]]} />
      {/* W */ }<rect x={0} y={0} width={ew} height={sz} fill={ec[edges[3]]} />
      {/* Center city */}
      {def.center === 'C' && <rect x={ew} y={ew} width={sz - ew * 2} height={sz - ew * 2} fill="#c8a050" />}
      {/* Cloister */}
      {def.center === 'K' && <rect x={sz / 2 - 7} y={sz / 2 - 7} width={14} height={14} fill="#f0d060" rx="2" />}
      {/* Road overlays */}
      {edges[0] === 'R' && <rect x={sz / 2 - 4} y={0} width={8} height={ew + 4} fill="#6a6a60" />}
      {edges[1] === 'R' && <rect x={sz - ew - 4} y={sz / 2 - 4} width={ew + 4} height={8} fill="#6a6a60" />}
      {edges[2] === 'R' && <rect x={sz / 2 - 4} y={sz - ew - 4} width={8} height={ew + 4} fill="#6a6a60" />}
      {edges[3] === 'R' && <rect x={0} y={sz / 2 - 4} width={ew + 4} height={8} fill="#6a6a60" />}
      {/* Shield */}
      {def.shield && <rect x={sz / 2 - 5} y={sz / 2 - 5} width={10} height={10} fill="#d4a017" rx="2" />}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

function CarcassonneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');
  const vsAI = searchParams.get('ai') === '1';

  const [gs, setGs] = useState<GameState | null>(null);
  const [myIndex, setMyIndex] = useState(0);
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init
  useEffect(() => {
    if (!roomId) return;
    const savedName = sessionStorage.getItem('ludus-name') || 'Speler 1';
    const savedIdx = parseInt(sessionStorage.getItem(`ludus-pidx-${roomId}`) ?? '0');
    setMyIndex(savedIdx);

    if (vsAI) {
      const aiName = 'AI';
      const names = savedIdx === 0 ? [savedName, aiName] : [aiName, savedName];
      setGs(newGame(names[0], names[1]));
      return;
    }

    const socket = getSocket();
    socket.emit('state-sync', { roomId }, (state: GameState) => {
      if (state) setGs(state);
      else {
        const initState = newGame(savedName, 'Speler 2');
        socket.emit('state-update', { roomId, state: initState });
        setGs(initState);
      }
    });

    socket.on('state-update', (state: GameState) => setGs(state));
    socket.on('turn-forfeit', ({ winnerName }: { loserIndex: number; winnerName: string }) => {
      setForfeitWinner(winnerName);
    });
    return () => { socket.off('state-update'); socket.off('turn-forfeit'); };
  }, [roomId, vsAI]);

  // AI turn
  useEffect(() => {
    if (!gs || !vsAI || gs.phase === 'gameover') return;
    const aiIdx = myIndex === 0 ? 1 : 0;
    if (gs.currentPlayer !== aiIdx) return;

    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      setGs(prev => prev ? aiDecide(prev) : prev);
    }, 700);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [gs, vsAI, myIndex]);

  function emitUpdate(newGs: GameState) {
    if (!vsAI && roomId) getSocket().emit('state-update', { roomId, state: newGs });
    setGs(newGs);
  }

  const isMyTurn = gs ? gs.currentPlayer === myIndex : false;
  const { timeLeft, gameMode } = useTurnTimer(isMyTurn);

  function handlePlaceTile(bx: number, by: number) {
    if (!gs || !isMyTurn) return;
    emitUpdate(placeTile(gs, bx, by));
  }

  function handlePlaceMeeple(feature: MeepleFeature) {
    if (!gs || !isMyTurn) return;
    emitUpdate(placeMeeple(gs, feature));
  }

  function handlePassMeeple() {
    if (!gs || !isMyTurn) return;
    emitUpdate(passMeeple(gs));
  }

  function handleRotate() {
    if (!gs || !isMyTurn) return;
    emitUpdate(rotateTile(gs));
  }

  function handleSkip() {
    if (!gs || !isMyTurn) return;
    emitUpdate(skipTile(gs));
  }

  const validCount = gs?.currentTile ? getValidPlacements(gs.board, gs.currentTile).length : 0;

  if (!gs) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a1a0e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EEF2FF', fontFamily: 'Fredoka' }}>
        Laden...
      </div>
    );
  }

  const curPlayer = gs.players[gs.currentPlayer];
  const myPlayer = gs.players[myIndex];

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#1a1a0e', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 14, 10], fov: 55 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <SceneLights />
        <BoardScene
          gs={gs}
          onPlaceTile={handlePlaceTile}
          onPlaceMeeple={handlePlaceMeeple}
          isMyTurn={isMyTurn}
          vsAI={vsAI}
        />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={4}
          maxDistance={28}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* HUD overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>

        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(to bottom, rgba(10,15,5,0.85), transparent)', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {gs.players.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 12, background: gs.currentPlayer === i && gs.phase !== 'gameover' ? `${PLAYER_COLORS[i]}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${gs.currentPlayer === i && gs.phase !== 'gameover' ? PLAYER_COLORS[i] + '66' : 'rgba(255,255,255,0.1)'}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: PLAYER_COLORS[i] }} />
                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: '#EEF2FF' }}>{p.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: PLAYER_COLORS[i] }}>{p.score}</span>
                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{'🧍'.repeat(Math.min(p.meeplesLeft, 7))}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
            {gs.deck.length} tegels over
          </div>
        </div>

        {/* Left panel: current tile + rotate */}
        {gs.phase === 'place_tile' && gs.currentTile && (
          <div style={{ position: 'absolute', left: 16, bottom: 80, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: isMyTurn ? 'auto' : 'none' }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {isMyTurn ? 'Jouw tegel' : `${curPlayer.name}'s tegel`}
            </div>
            <div style={{ padding: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }}>
              <TilePreview defId={gs.currentTile} rotation={gs.currentRotation} />
            </div>
            {isMyTurn && (
              <button
                onClick={handleRotate}
                style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, background: 'rgba(255,255,255,0.1)', color: '#EEF2FF', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                ↻ Draaien
              </button>
            )}
            {isMyTurn && validCount === 0 && (
              <button
                onClick={handleSkip}
                style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, background: 'rgba(200,50,50,0.3)', color: '#EEF2FF', border: '1px solid rgba(200,50,50,0.4)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', pointerEvents: 'auto' }}
              >
                Overslaan
              </button>
            )}
          </div>
        )}

        {/* Meeple placement panel */}
        {gs.phase === 'place_meeple' && isMyTurn && (
          <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: '#EEF2FF', background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 8 }}>
              Meeple plaatsen? Klik op een groen vlak of sla over.
            </div>
            <button
              onClick={handlePassMeeple}
              style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, background: 'rgba(255,255,255,0.1)', color: '#EEF2FF', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}
            >
              Overslaan
            </button>
          </div>
        )}

        {/* Waiting for opponent */}
        {!isMyTurn && gs.phase !== 'gameover' && (
          <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: 8 }}>
              Wachten op {curPlayer.name}...
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ position: 'absolute', right: 16, bottom: 80, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none' }}>
          {[['#c8a050', 'Stad'], ['#8c8c80', 'Weg'], ['#4a7c3f', 'Veld'], ['#f0d060', 'Klooster']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, background: c, borderRadius: 2 }} />
              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Recent log */}
        <div style={{ position: 'absolute', right: 16, top: 56, maxWidth: 200, pointerEvents: 'none' }}>
          {gs.log.slice(-4).map((line, i) => (
            <div key={i} style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2, textAlign: 'right' }}>
              {line}
            </div>
          ))}
        </div>

        {/* Game over overlay */}
        {gs.phase === 'gameover' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,3,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, pointerEvents: 'auto' }}>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 36, fontWeight: 700, color: '#EEF2FF', margin: 0 }}>
              {gs.players[0].score === gs.players[1].score ? 'Gelijkspel!' :
                `${gs.players[0].score > gs.players[1].score ? gs.players[0].name : gs.players[1].name} wint!`}
            </h2>
            <div style={{ display: 'flex', gap: 24 }}>
              {gs.players.map((p, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '12px 24px', background: `${PLAYER_COLORS[i]}22`, border: `1px solid ${PLAYER_COLORS[i]}66`, borderRadius: 16 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{p.name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 36, fontWeight: 700, color: PLAYER_COLORS[i] }}>{p.score}</div>
                </div>
              ))}
            </div>
            <div style={{ maxWidth: 320, maxHeight: 200, overflow: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '10px 14px' }}>
              {gs.log.slice(-12).map((line, i) => (
                <div key={i} style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{line}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setGs(newGame(gs.players[0].name, gs.players[1].name))}
                style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, background: '#4a7c3f', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', cursor: 'pointer' }}
              >
                Opnieuw
              </button>
              <button
                onClick={() => router.push('/lobby?game=carcassonne')}
                style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, background: 'rgba(255,255,255,0.1)', color: '#EEF2FF', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 28px', cursor: 'pointer' }}
              >
                Lobby
              </button>
            </div>
          </div>
        )}
      </div>

      {roomId && (
        <GameControls
          roomId={roomId}
          myName={gs?.players[myIndex]?.name ?? "Speler"}
          playerNames={gs?.players.map((p: {name: string}) => p.name) ?? []}
          gameType="carcassonne"
          isSpectator={isSpectator}
          isGameOver={gs?.phase === 'gameover' || forfeitWinner !== null}
          myPlayerIndex={myIndex}
          accent="#8B5CF6"
          onResign={!vsAI ? () => getSocket().emit("resign") : undefined}
        />
      )}

      {roomId && timeLeft !== null && !forfeitWinner && gs?.phase !== 'gameover' && (
        <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, padding: '0 16px', zIndex: 50 }}>
          <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={isMyTurn} accent="#8B5CF6" />
        </div>
      )}

      {forfeitWinner && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,2,0,0.92)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 300 }}>
          <div style={{ fontSize: 56 }}>⏱️</div>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: '#EEF2FF' }}>Tijd verstreken!</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: 'rgba(238,242,255,0.5)' }}>{forfeitWinner} wint door beurt-timeout</div>
          <button onClick={() => router.push('/lobby?game=carcassonne')} style={{ marginTop: 12, padding: '12px 32px', borderRadius: 50, border: 'none', background: '#8B5CF6', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Terug naar lobby
          </button>
        </div>
      )}

      <BottomNav
        items={[
          { label: 'Home', icon: '🏠', onClick: () => router.push('/') },
          { label: 'Lobby', icon: '⊞', onClick: () => router.push('/lobby?game=carcassonne') },
          { label: 'Scores', icon: '🏆', onClick: () => router.push('/scores') },
        ]}
      />
    </div>
  );
}

export default function CarcassonnePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1a1a0e' }} />}>
      <CarcassonneContent />
    </Suspense>
  );
}

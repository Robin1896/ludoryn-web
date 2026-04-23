"use client";

import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, BakeShadows } from "@react-three/drei";
import * as THREE from "three";
import HexTile from "./HexTile";
import TileModel, { TILE_MODEL_URLS } from "./TileModel";
import BoardBase from "./BoardBase";
import NumberToken from "./NumberToken";
import Settlement3D from "./Settlement3D";
import Road3D from "./Road3D";
import BuildSpots from "./BuildSpots";
import DiceRoller from "./DiceRoller";
import Robber3D from "./Robber3D";
import type { BoardTile } from "@/lib/board";
import type { BoardGraph } from "@/lib/vertices";
import type { GameState } from "@/lib/game";
import { PLAYER_COLORS } from "@/lib/game";

const HEX_SIZE = 1.08;

function hexToPixel(q: number, r: number, size = HEX_SIZE): [number, number, number] {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const z = size * (1.5 * r);
  return [x, 0, z];
}

const TILE_COLORS: Record<string, string> = {
  forest:    "#2d6a2d",
  pasture:   "#7ec850",
  grain:     "#e8c84a",
  hills:     "#c0522a",
  mountains: "#888888",
  desert:    "#d4b483",
  water:     "#1a6fad",
};

const TILE_HEIGHT: Record<string, number> = { water: 0.08 };

interface CatanBoardProps {
  tiles: BoardTile[];
  graph: BoardGraph;
  gameState: GameState | null;
  validSpots: string[];
  onPlace: (key: string) => void;
  onReshuffle: () => void;
  onTileClick: (q: number, r: number) => void;
  diceRolling: boolean;
  onDiceResult: (d1: number, d2: number) => void;
}

// Klikbaar tile-vlak voor ruiter verplaatsen
function ClickableTile({
  pos, q, r, isRobber, onTileClick,
}: {
  pos: [number, number, number];
  q: number;
  r: number;
  isRobber: boolean;
  onTileClick: (q: number, r: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      position={[pos[0], pos[1] + 0.22, pos[2]]}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onTileClick(q, r); }}
    >
      <cylinderGeometry args={[0.88, 0.88, 0.04, 6]} />
      <meshBasicMaterial
        color={isRobber ? "#ff2200" : "#ffffff"}
        transparent
        opacity={hovered ? (isRobber ? 0.18 : 0.14) : (isRobber ? 0.1 : 0.06)}
        depthWrite={false}
      />
    </mesh>
  );
}

interface SceneProps {
  tiles: BoardTile[];
  graph: BoardGraph;
  gameState: GameState | null;
  validSpots: string[];
  onPlace: (key: string) => void;
  onTileClick: (q: number, r: number) => void;
  playerColor: string;
  diceRolling: boolean;
  onDiceResult: (d1: number, d2: number) => void;
}

function Scene({ tiles, graph, gameState, validSpots, onPlace, onTileClick, playerColor, diceRolling, onDiceResult }: SceneProps) {
  const awaitingRobber = gameState?.awaitingRobber ?? false;

  return (
    <>
      <BoardBase />
      {tiles.map((tile, i) => {
        const pos = hexToPixel(tile.q, tile.r);
        const height = TILE_HEIGHT[tile.type] ?? 0.18;
        const y = tile.type === "water" ? -0.1 : 0;
        const isLand = tile.type !== "water";
        const isCurrentRobber =
          gameState !== null &&
          tile.q === gameState.robberQ &&
          tile.r === gameState.robberR;

        return (
          <group key={i}>
            <HexTile
              position={[pos[0], y, pos[2]]}
              color={TILE_COLORS[tile.type]}
              height={height}
              seed={i * 17 + 3}
            />
            {TILE_MODEL_URLS[tile.type] && (
              <TileModel type={tile.type} scale={0.9} position={[pos[0], y + 0.18, pos[2]]} />
            )}
            {tile.number && (
              <NumberToken position={[pos[0], y, pos[2]]} number={tile.number} />
            )}
            {/* Klikbaar overlay voor ruiter */}
            {awaitingRobber && isLand && (
              <ClickableTile
                pos={[pos[0], y, pos[2]]}
                q={tile.q}
                r={tile.r}
                isRobber={isCurrentRobber}
                onTileClick={onTileClick}
              />
            )}
          </group>
        );
      })}

      {/* Ruiter token */}
      {gameState && (() => {
        const pos = hexToPixel(gameState.robberQ, gameState.robberR);
        return <Robber3D x={pos[0]} z={pos[2]} />;
      })()}

      {/* Nederzettingen */}
      {gameState &&
        Object.entries(gameState.settlements).map(([key, s]) => {
          const v = graph.vertices.find((v) => v.key === key);
          if (!v) return null;
          return <Settlement3D key={key} x={v.x} z={v.z} player={s.player} type={s.type} />;
        })}

      {/* Wegen */}
      {gameState &&
        Object.entries(gameState.roads).map(([key, player]) => {
          const edge = graph.edgeMap.get(key);
          if (!edge) return null;
          return <Road3D key={key} edge={edge} player={player} />;
        })}

      {/* Bouwspots */}
      {gameState && gameState.buildMode && !awaitingRobber &&
        (gameState.buildMode === "settlement" || gameState.buildMode === "road" || gameState.buildMode === "city") && (
        <BuildSpots
          graph={graph}
          validSpots={validSpots}
          buildMode={gameState.buildMode}
          onPlace={onPlace}
          playerColor={playerColor}
        />
      )}

      <DiceRoller rolling={diceRolling} onResult={onDiceResult} />
    </>
  );
}

export default function CatanBoard({
  tiles, graph, gameState, validSpots, onPlace, onReshuffle, onTileClick, diceRolling, onDiceResult,
}: CatanBoardProps) {
  const playerColor = gameState ? PLAYER_COLORS[gameState.currentPlayer] : "#ffffff";

  return (
    <div
      className="w-full h-full relative"
      style={{ background: "linear-gradient(165deg, #080412 0%, #160828 20%, #2a0e3a 38%, #4a1628 55%, #8b2a10 72%, #c94f18 86%, #e8852a 94%, #f5c44a 100%)" }}
    >
      <Canvas
        camera={{ position: [0, 12, 14], fov: 50 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2, powerPreference: "high-performance" }}
        shadows="soft"
        style={{ background: "transparent" }}
        frameloop="demand"
        performance={{ min: 0.5 }}
      >
        <fog attach="fog" args={["#1a0a2a", 28, 62]} />

        {/* Zonlicht — warme avondzon schuin van opzij */}
        <directionalLight
          position={[12, 18, 8]}
          intensity={3.5}
          color="#ffcd7a"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={60}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-bias={-0.001}
        />
        {/* Koele tegenlicht — blauwig maanlicht achter het bord */}
        <directionalLight position={[-8, 10, -10]} intensity={0.8} color="#7ca4ff" />
        {/* Subtiel rood/oranje bounce light van onder */}
        <hemisphereLight args={["#c45a10", "#0d0520", 0.6]} />
        {/* Omgevingskaart voor PBR reflecties */}
        <Environment preset="sunset" background={false} />
        <BakeShadows />

        <Suspense fallback={null}>
        <Scene
          tiles={tiles}
          graph={graph}
          gameState={gameState}
          validSpots={validSpots}
          onPlace={onPlace}
          onTileClick={onTileClick}
          playerColor={playerColor}
          diceRolling={diceRolling}
          onDiceResult={onDiceResult}
        />

        <OrbitControls minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.2} enablePan={false} />
        </Suspense>
      </Canvas>

      {!gameState && (
        <button
          onClick={onReshuffle}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white font-semibold text-sm tracking-wide transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
        >
          Schud bord
        </button>
      )}
    </div>
  );
}

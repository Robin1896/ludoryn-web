"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { BottomNav, TurnTimer } from "@/components/ui";
import { useTurnTimer } from "@/lib/useTurnTimer";
import GameControls from "@/components/GameControls";
import WaitingScreen from "@/components/WaitingScreen";
import BottomHUD from "@/components/BottomHUD";
import ActionPanel from "@/components/ActionPanel";
import BottomSheet from "@/components/BottomSheet";
import { useLang } from "@/lib/lang";
import { generateBoard, type BoardTile } from "@/lib/board";
import { buildGraph, type BoardGraph } from "@/lib/vertices";
import { getSocket } from "@/lib/socket";
import {
  initialState,
  validSettlements,
  validRoads,
  placeSettlement,
  placeRoad,
  upgradeToCity,
  distributeResources,
  activateRobber,
  moveRobber,
  bankTrade,
  getTradeRatios,
  canAfford,
  BUILD_COST,
  getVP,
  WIN_VP,
  PLAYER_COLORS,
  PLAYER_NAMES,
  RESOURCE_EMOJI,
  type GameState,
  type ResourceType,
} from "@/lib/game";

// ─── Hex geometry constants (matches vertices.ts) ───────────────────────────

const HEX_SIZE = 1.08; // world-space hex size, same as vertices.ts

// Convert axial hex (q, r) to world-space (x, z) — flat-top
function hexCenter(q: number, r: number): { x: number; z: number } {
  return {
    x: HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    z: HEX_SIZE * (1.5 * r),
  };
}

// Scale factor: world units → SVG pixels
// The board spans roughly q/r in [-3,3]; world x/z roughly [-6,6].
// We want the SVG to be ~500px wide, so scale ≈ 40.
const SVG_SCALE = 40;
const SVG_CX = 250; // SVG center x
const SVG_CY = 250; // SVG center y

function worldToSVG(x: number, z: number): { sx: number; sy: number } {
  return {
    sx: SVG_CX + x * SVG_SCALE,
    sy: SVG_CY + z * SVG_SCALE,
  };
}

// Six corners of a flat-top hex in SVG space (returns path d string)
function hexPath(cx: number, cy: number, size: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30); // flat-top: start at 30°
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  });
  return `M ${pts.join(" L ")} Z`;
}

// ─── Tile colors ────────────────────────────────────────────────────────────

const TILE_COLORS: Record<string, string> = {
  forest:    "#2d6a2d",
  pasture:   "#7ec850",
  grain:     "#e8c84a",
  hills:     "#c0522a",
  mountains: "#888888",
  desert:    "#d4b483",
  water:     "#1a6fad",
};

// ─── Terrain image mapping ───────────────────────────────────────────────────

const TERRAIN_IMG: Record<string, string> = {
  forest:    "terrain-forest",
  pasture:   "terrain-sheep",
  grain:     "terrain-wheat",
  hills:     "terrain-clay",
  mountains: "terrain-ore",
  desert:    "terrain-desert",
  water:     "terrain-sea",
};

const TILE_STROKE: Record<string, string> = {
  forest:    "#1d4d1d",
  pasture:   "#5aa030",
  grain:     "#c8a030",
  hills:     "#8a3018",
  mountains: "#555555",
  desert:    "#b09060",
  water:     "#0a4f8a",
};

// ─── 2D SVG Board component ─────────────────────────────────────────────────

interface BoardProps {
  tiles: BoardTile[];
  graph: BoardGraph;
  gameState: GameState | null;
  validSpots: string[];
  onPlace: (key: string) => void;
  onTileClick: (q: number, r: number) => void;
  diceRolling: boolean;
  onDiceResult: (d1: number, d2: number) => void;
}

function CatanBoard2D({
  tiles, graph, gameState, validSpots, onPlace, onTileClick, diceRolling, onDiceResult,
}: BoardProps) {
  // Trigger dice roll via useEffect when diceRolling becomes true
  const diceRollingRef = useRef(false);
  useEffect(() => {
    if (diceRolling && !diceRollingRef.current) {
      diceRollingRef.current = true;
      // Simulate a short delay then produce random result
      const t = setTimeout(() => {
        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        diceRollingRef.current = false;
        onDiceResult(d1, d2);
      }, 600);
      return () => clearTimeout(t);
    }
    if (!diceRolling) {
      diceRollingRef.current = false;
    }
  }, [diceRolling, onDiceResult]);

  const awaitingRobber = gameState?.awaitingRobber ?? false;
  const buildMode = gameState?.buildMode ?? null;

  const hexSize = HEX_SIZE * SVG_SCALE * 0.98; // visual size (slight gap between tiles)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(165deg,#080412 0%,#160828 20%,#2a0e3a 38%,#4a1628 55%,#8b2a10 72%,#c94f18 86%,#e8852a 94%,#f5c44a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg
        width="500"
        height="500"
        viewBox="0 0 500 500"
        style={{ maxWidth: "min(500px, 100vw, calc(100vh - 180px))", maxHeight: "min(500px, 100vw, calc(100vh - 180px))" }}
      >
        {/* ── Tile terrain image patterns ── */}
        <defs>
          {tiles.map((tile, i) => {
            const { x, z } = hexCenter(tile.q, tile.r);
            const { sx, sy } = worldToSVG(x, z);
            const imgName = TERRAIN_IMG[tile.type];
            if (!imgName) return null;
            const patSize = hexSize * 2.1;
            return (
              <pattern
                key={i}
                id={`terrain-${i}`}
                patternUnits="userSpaceOnUse"
                x={sx - patSize / 2}
                y={sy - patSize / 2}
                width={patSize}
                height={patSize}
              >
                <image
                  href={`/images/games/${imgName}.png`}
                  x="0" y="0"
                  width={patSize} height={patSize}
                  preserveAspectRatio="xMidYMid slice"
                />
              </pattern>
            );
          })}
        </defs>

        {/* ── Tiles ── */}
        {tiles.map((tile, i) => {
          const { x, z } = hexCenter(tile.q, tile.r);
          const { sx, sy } = worldToSVG(x, z);
          const stroke = TILE_STROKE[tile.type] ?? "#555";
          const hasImg = !!TERRAIN_IMG[tile.type];
          const fill = hasImg ? `url(#terrain-${i})` : (TILE_COLORS[tile.type] ?? "#888");
          const isRobber =
            gameState !== null &&
            tile.q === gameState.robberQ &&
            tile.r === gameState.robberR;
          const isLand = tile.type !== "water";
          const clickable = awaitingRobber && isLand;

          return (
            <g key={i} onClick={() => clickable && onTileClick(tile.q, tile.r)} style={{ cursor: clickable ? "pointer" : "default" }}>
              <path
                d={hexPath(sx, sy, hexSize)}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
                opacity={awaitingRobber && isLand && !isRobber ? 0.75 : 1}
              />
              {/* Hover overlay for robber placement */}
              {awaitingRobber && isLand && (
                <path
                  d={hexPath(sx, sy, hexSize)}
                  fill={isRobber ? "#ff2200" : "#ffffff"}
                  stroke="none"
                  opacity={isRobber ? 0.18 : 0.0}
                  style={{ pointerEvents: "none" }}
                />
              )}
              {/* Number token */}
              {tile.number && !isRobber && (
                <g>
                  <circle cx={sx} cy={sy} r={14} fill="rgba(255,250,230,0.92)" stroke="#c8a030" strokeWidth={1} />
                  <text
                    x={sx}
                    y={sy + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={tile.number === 6 || tile.number === 8 ? 13 : 12}
                    fontWeight={tile.number === 6 || tile.number === 8 ? 900 : 700}
                    fill={tile.number === 6 || tile.number === 8 ? "#cc1111" : "#3a2a00"}
                    fontFamily="'DM Mono', monospace"
                  >
                    {tile.number}
                  </text>
                  {/* Probability dots */}
                  {tile.number && (() => {
                    const dots = [2,12].includes(tile.number!) ? 1
                      : [3,11].includes(tile.number!) ? 2
                      : [4,10].includes(tile.number!) ? 3
                      : [5,9].includes(tile.number!) ? 4
                      : 5; // 6, 8
                    const dotColor = tile.number === 6 || tile.number === 8 ? "#cc1111" : "#7a6a40";
                    const spacing = 4;
                    const startX = sx - ((dots - 1) * spacing) / 2;
                    return Array.from({ length: dots }, (_, di) => (
                      <circle key={di} cx={startX + di * spacing} cy={sy + 10} r={1.4} fill={dotColor} />
                    ));
                  })()}
                </g>
              )}
              {/* Robber token on this tile */}
              {isRobber && (
                <g>
                  <circle cx={sx} cy={sy} r={12} fill="#1a1a1a" stroke="#555" strokeWidth={1.5} opacity={0.9} />
                  <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>
                    ⚔️
                  </text>
                </g>
              )}
              {/* Robber placement hint */}
              {awaitingRobber && isLand && !isRobber && (
                <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" fontSize={18} opacity={0.4} style={{ pointerEvents: "none" }}>
                  🎯
                </text>
              )}
            </g>
          );
        })}

        {/* ── Roads ── */}
        {gameState && Object.entries(gameState.roads).map(([key, player]) => {
          const edge = graph.edgeMap.get(key);
          if (!edge) return null;
          const { sx: sx1, sy: sy1 } = worldToSVG(edge.mx, edge.mz);
          const v1 = graph.vertices.find((v) => v.key === edge.v1);
          const v2 = graph.vertices.find((v) => v.key === edge.v2);
          if (!v1 || !v2) return null;
          const { sx: ax, sy: ay } = worldToSVG(v1.x, v1.z);
          const { sx: bx, sy: by } = worldToSVG(v2.x, v2.z);
          return (
            <line
              key={key}
              x1={ax} y1={ay} x2={bx} y2={by}
              stroke={PLAYER_COLORS[player]}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })}

        {/* ── Build spots — edges (roads) ── */}
        {gameState && buildMode === "road" && graph.edges
          .filter((e) => validSpots.includes(e.key))
          .map((edge) => {
            const v1 = graph.vertices.find((v) => v.key === edge.v1);
            const v2 = graph.vertices.find((v) => v.key === edge.v2);
            if (!v1 || !v2) return null;
            const { sx: ax, sy: ay } = worldToSVG(v1.x, v1.z);
            const { sx: bx, sy: by } = worldToSVG(v2.x, v2.z);
            const { sx: mx, sy: my } = worldToSVG(edge.mx, edge.mz);
            return (
              <g key={edge.key} onClick={() => onPlace(edge.key)} style={{ cursor: "pointer" }}>
                <line x1={ax} y1={ay} x2={bx} y2={by} stroke={PLAYER_COLORS[gameState.currentPlayer]} strokeWidth={6} strokeLinecap="round" opacity={0.35} />
                <circle cx={mx} cy={my} r={7} fill={PLAYER_COLORS[gameState.currentPlayer]} opacity={0.7} stroke="#fff" strokeWidth={1.5} />
              </g>
            );
          })}

        {/* ── Settlements & Cities ── */}
        {gameState && Object.entries(gameState.settlements).map(([key, s]) => {
          const v = graph.vertices.find((vx) => vx.key === key);
          if (!v) return null;
          const { sx, sy } = worldToSVG(v.x, v.z);
          const color = PLAYER_COLORS[s.player];
          if (s.type === "city") {
            return (
              <g key={key}>
                <rect x={sx - 9} y={sy - 9} width={18} height={18} rx={3} fill={color} stroke="#fff" strokeWidth={1.5} opacity={0.95} />
                <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#fff" fontWeight={900}>C</text>
              </g>
            );
          }
          return (
            <g key={key}>
              <circle cx={sx} cy={sy} r={7} fill={color} stroke="#fff" strokeWidth={1.5} opacity={0.95} />
            </g>
          );
        })}

        {/* ── Build spots — vertices (settlements / cities) ── */}
        {gameState && (buildMode === "settlement" || buildMode === "city") &&
          graph.vertices
            .filter((v) => validSpots.includes(v.key))
            .map((v) => {
              const { sx, sy } = worldToSVG(v.x, v.z);
              return (
                <circle
                  key={v.key}
                  cx={sx} cy={sy} r={9}
                  fill={PLAYER_COLORS[gameState.currentPlayer]}
                  stroke="#fff" strokeWidth={2}
                  opacity={0.7}
                  style={{ cursor: "pointer" }}
                  onClick={() => onPlace(v.key)}
                />
              );
            })}
      </svg>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function useSocketRoom(roomId: string, playerIndex: number) {
  const socket = getSocket();
  return {
    emitState: (gs: GameState)        => socket.emit("state-update",  { gameState: gs }),
    emitTiles: (tiles: BoardTile[])   => socket.emit("tiles-init",    { tiles }),
    emitDice:  (d1: number, d2: number) => socket.emit("dice-result", { d1, d2 }),
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router     = useRouter();

  // Multiplayer meta
  const [playerIndex, setPlayerIndex] = useState<number>(-1);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [connected,   setConnected]   = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);

  // Game state
  const [tiles,       setTiles]       = useState<BoardTile[]>(() => generateBoard());
  const [gameState,   setGameState]   = useState<GameState | null>(null);
  const [diceRolled,  setDiceRolled]  = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [winner,      setWinner]      = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(true);
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState(0);
  const [rulesSearch, setRulesSearch] = useState('');
  const { t } = useLang();

  const graph = useMemo(() => buildGraph(tiles), [tiles]);

  // Socket refs (om stale closures te vermijden)
  const tilesRef     = useRef(tiles);
  const graphRef     = useRef(graph);
  const pidxRef      = useRef(playerIndex);
  useEffect(() => { tilesRef.current  = tiles;  }, [tiles]);
  useEffect(() => { graphRef.current  = graph;  }, [graph]);
  useEffect(() => { pidxRef.current   = playerIndex; }, [playerIndex]);

  function showToast(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }

  function checkWin(s: GameState) {
    const vps = getVP(s);
    const w = vps.findIndex((v) => v >= WIN_VP);
    if (w !== -1) {
      setWinner(w);
      // Alleen de winnaar stuurt het game-over event
      if (w === pidxRef.current) {
        const winnerName = playerNames[w] ?? PLAYER_NAMES[w];
        getSocket().emit("game-over", { winnerName });
      }
    }
  }

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    const storedIdx  = sessionStorage.getItem(`ludoryn-pidx-${roomId}`);
    const storedName = sessionStorage.getItem("ludoryn-name") ?? "Speler";

    if (storedIdx !== null) {
      setPlayerIndex(Number(storedIdx));
      pidxRef.current = Number(storedIdx);
      setConnected(true);
    }

    function rejoin() {
      if (storedIdx === null) return;
      socket.emit("join-room", { roomId, name: storedName }, (res: { ok: boolean; players?: string[]; isSpectator?: boolean }) => {
        if (res.ok) {
          setConnected(true);
          if (res.players) setPlayerNames(res.players);
          if (res.isSpectator) { setIsSpectator(true); setWaitingForOpponent(false); }
        }
      });
    }

    // Only rejoin on actual reconnect (hard refresh), not on initial mount
    socket.io.on("reconnect", rejoin);

    socket.on("room-update", ({ players, ready }: { players: string[]; ready: boolean }) => {
      setPlayerNames(players);
      if (ready) {
        setWaitingForOpponent(false);
        setOpponentConnected(true);
        // Player 0 start het spel en deelt de tiles
        if (pidxRef.current === 0 && !gameState) {
          const newTiles = generateBoard();
          setTiles(newTiles);
          tilesRef.current = newTiles;
          socket.emit("tiles-init", { tiles: newTiles });
          const gs = initialState(2, newTiles);
          setGameState(gs);
          socket.emit("state-update", { gameState: gs });
        }
      }
    });

    socket.on("tiles-init", ({ tiles: t }: { tiles: BoardTile[] }) => {
      setTiles(t);
      tilesRef.current = t;
    });

    socket.on("state-sync", ({ tiles: t, gameState: gs }: { tiles: BoardTile[]; gameState: GameState }) => {
      if (t) { setTiles(t); tilesRef.current = t; }
      if (gs) { setGameState(gs); setWaitingForOpponent(false); setOpponentConnected(true); checkWin(gs); }
    });

    socket.on("state-update", ({ gameState: gs }: { gameState: GameState }) => {
      setGameState(gs);
      checkWin(gs);
    });

    socket.on("dice-result", ({ d1, d2 }: { d1: number; d2: number }) => {
      // Tegenstander heeft dobbelstenen gegooid — verwerk
      setDiceRolling(false);
      setGameState((prev) => {
        if (!prev) return prev;
        const roll = d1 + d2;
        const withDice = { ...prev, lastDice: [d1, d2] as [number, number] };
        if (roll === 7) return activateRobber(withDice);
        return distributeResources(withDice, roll, tilesRef.current, graphRef.current);
      });
      setDiceRolled(true);
    });

    socket.on("player-disconnected", () => {
      setOpponentConnected(false);
      setDisconnectMsg("Je tegenstander heeft de verbinding verbroken.");
    });

    socket.on("turn-forfeit", ({ winnerName }: { loserIndex: number; winnerName: string }) => {
      setForfeitWinner(winnerName);
    });

    // Request current state in case we missed room-update/state-update during navigation
    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null; players: string[] }) => {
      if (res.players.length >= 2) {
        setPlayerNames(res.players);
        setWaitingForOpponent(false);
        setOpponentConnected(true);
      }
      if (res.gameState) {
        setGameState(res.gameState);
        checkWin(res.gameState);
      }
    });

    return () => {
      socket.off("room-update");
      socket.off("tiles-init");
      socket.off("state-sync");
      socket.off("state-update");
      socket.off("dice-result");
      socket.off("player-disconnected");
      socket.off("turn-forfeit");
      socket.io.off("reconnect", rejoin);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Game helpers ──────────────────────────────────────────────────────────

  const socket = getSocket();
  const isMyTurn = gameState?.currentPlayer === playerIndex;
  const { timeLeft, gameMode } = useTurnTimer(isMyTurn);

  function emit(gs: GameState) {
    socket.emit("state-update", { gameState: gs });
  }

  const validSpots = useMemo(() => {
    if (!gameState || gameState.awaitingRobber) return [];
    if (gameState.buildMode === "settlement") return validSettlements(gameState, graph);
    if (gameState.buildMode === "road")       return validRoads(gameState, graph);
    if (gameState.buildMode === "city") {
      return Object.entries(gameState.settlements)
        .filter(([, s]) => s.player === gameState.currentPlayer && s.type === "village")
        .map(([k]) => k);
    }
    return [];
  }, [gameState, graph]);

  function handlePlace(key: string) {
    if (!gameState || !isMyTurn) return;
    let next: GameState;
    if      (gameState.buildMode === "settlement") next = placeSettlement(gameState, key);
    else if (gameState.buildMode === "road")       next = placeRoad(gameState, key, tilesRef.current, graphRef.current);
    else if (gameState.buildMode === "city")       next = upgradeToCity(gameState, key);
    else return;
    setGameState(next);
    emit(next);
    checkWin(next);
  }

  function handleRollDice() {
    if (!gameState || !isMyTurn || diceRolled || diceRolling) return;
    setDiceRolling(true);
  }

  const handleDiceResult = useCallback((d1: number, d2: number) => {
    setDiceRolling(false);
    const roll = d1 + d2;
    socket.emit("dice-result", { d1, d2 });
    setGameState((prev) => {
      if (!prev) return prev;
      const withDice = { ...prev, lastDice: [d1, d2] as [number, number] };
      if (roll === 7) {
        const next = activateRobber(withDice);
        if (next.lastDiscards.length > 0) {
          const names = next.lastDiscards.map((p) => PLAYER_NAMES[p]).join(", ");
          showToast(`${names} moest de helft van zijn kaarten weggooien.`);
        }
        emit(next);
        return next;
      }
      const next = distributeResources(withDice, roll, tilesRef.current, graphRef.current);
      emit(next);
      return next;
    });
    setDiceRolled(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTileClick(q: number, r: number) {
    if (!gameState?.awaitingRobber || !isMyTurn) return;
    const next = moveRobber(gameState, q, r, graph);
    setGameState(next);
    emit(next);
    if (next.lastStolen) {
      const victimName = PLAYER_NAMES[next.lastStolen.victim];
      showToast(`Gestolen van ${victimName}: ${RESOURCE_EMOJI[next.lastStolen.resource]}`);
    }
  }

  function handleNextTurn() {
    if (!gameState || !isMyTurn) return;
    const nextPlayer = (gameState.currentPlayer + 1) % gameState.numPlayers;
    const next = { ...gameState, currentPlayer: nextPlayer, buildMode: null, lastSettlement: null, lastDice: null, lastStolen: null };
    setGameState(next as GameState);
    emit(next as GameState);
    setDiceRolled(false);
    setDiceRolling(false);
  }

  function handleBankTrade(give: ResourceType, receive: ResourceType) {
    if (!gameState || !isMyTurn) return;
    const ratios = getTradeRatios(playerIndex, gameState, tilesRef.current, graphRef.current);
    const next = bankTrade(gameState, give, receive, ratios[give]);
    setGameState(next);
    emit(next);
  }

  function handleSetBuildMode(mode: "settlement" | "road" | "city" | null) {
    if (!gameState || !isMyTurn) return;
    const next = { ...gameState, buildMode: mode };
    setGameState(next);
    emit(next);
  }

  const myPidx         = playerIndex >= 0 ? playerIndex : gameState?.currentPlayer ?? 0;
  const myRes          = gameState?.resources[myPidx];
  const tradeRatios    = gameState ? getTradeRatios(myPidx, gameState, tiles, graph) : { wood: 4, wool: 4, grain: 4, brick: 4, ore: 4 };
  const affordSettlement = myRes ? canAfford(myRes, BUILD_COST.settlement) : false;
  const affordRoad       = myRes ? canAfford(myRes, BUILD_COST.road) : false;
  const affordCity       = myRes ? canAfford(myRes, BUILD_COST.city) : false;
  const hasVillage       = gameState
    ? Object.values(gameState.settlements).some(
        (s) => s.player === (playerIndex >= 0 ? playerIndex : gameState.currentPlayer) && s.type === "village"
      )
    : false;

  // ── Waiting screen ────────────────────────────────────────────────────────
  if (waitingForOpponent || !gameState) {
    return <WaitingScreen roomId={roomId} players={playerNames} myPlayerIndex={playerIndex} gameType="catan" accent="#FF5252" />;
  }

  // ── Game ──────────────────────────────────────────────────────────────────
  return (
    <main className="w-screen h-screen overflow-hidden relative" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'relative', zIndex: 40, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: 'rgba(8,4,2,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,82,82,0.15)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 700, color: '#FF5252' }}>
            🏝 Kolonis
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(238,242,255,0.4)', marginTop: 1 }}>
            {gameState
              ? `${playerNames[gameState.currentPlayer] ?? PLAYER_NAMES[gameState.currentPlayer]} is aan de beurt`
              : 'Wachten...'}
          </div>
        </div>
        <GameControls
          roomId={roomId}
          myName={playerNames[playerIndex] ?? 'Speler'}
          playerNames={playerNames}
          gameType="catan"
          isSpectator={isSpectator}
          isGameOver={winner !== null || forfeitWinner !== null}
          myPlayerIndex={playerIndex}
          accent="#FF5252"
          onResign={() => getSocket().emit('resign')}
          inHeader
        />
        <button
          onClick={() => setShowRules(true)}
          style={{
            width: 34, height: 34, flexShrink: 0, borderRadius: 10,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(238,242,255,0.5)', fontSize: 14, fontWeight: 700,
            fontFamily: "'Nunito', sans-serif", cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >?</button>
      </header>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

      <BottomNav chatMode="popup" items={[
        { label: t.home,   icon: "home", onClick: () => router.push("/") },
        { label: t.lobby,  icon: "lobby", onClick: () => router.push("/lobby?game=catan") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
        { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
      ]} />

      <CatanBoard2D
        tiles={tiles}
        graph={graph}
        gameState={gameState}
        validSpots={validSpots}
        onPlace={handlePlace}
        onTileClick={handleTileClick}
        diceRolling={diceRolling}
        onDiceResult={handleDiceResult}
      />

      {/* "Niet jouw beurt" overlay — blokkeer interactie subtiel */}
      {!isMyTurn && !winner && (
        <div style={{
          position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "rgba(18,8,2,0.8)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, padding: "8px 18px",
          color: "rgba(255,220,150,0.55)", fontSize: 12, fontWeight: 600,
          backdropFilter: "blur(8px)", pointerEvents: "none",
        }}>
          {PLAYER_NAMES[gameState.currentPlayer]} is aan de beurt
        </div>
      )}

      {/* Disconnect banner */}
      {disconnectMsg && (
        <div style={{
          position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "rgba(120,20,10,0.9)", border: "1px solid rgba(255,80,40,0.4)",
          borderRadius: 12, padding: "10px 20px",
          color: "#ffaa88", fontSize: 13, fontWeight: 600,
          backdropFilter: "blur(8px)", zIndex: 50,
        }}>
          {disconnectMsg}
        </div>
      )}


      {/* Turn timer */}
      {!winner && !forfeitWinner && timeLeft !== null && (
        <div style={{ position: "absolute", bottom: 90, left: 0, right: 0, padding: "0 16px", zIndex: 50 }}>
          <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={isMyTurn} accent="#cc3333" />
        </div>
      )}

      {isMyTurn && !winner && (
        <ActionPanel
          gameState={gameState}
          diceRolled={diceRolled}
          diceRolling={diceRolling}
          affordSettlement={affordSettlement}
          affordRoad={affordRoad}
          affordCity={affordCity}
          hasVillage={hasVillage}
          tradeRatios={tradeRatios}
          myResources={myRes ?? { wood: 0, wool: 0, grain: 0, brick: 0, ore: 0 }}
          onRollDice={handleRollDice}
          onSetBuildMode={handleSetBuildMode}
          onNextTurn={handleNextTurn}
          onTrade={handleBankTrade}
        />
      )}

      <BottomHUD gameState={gameState} />

      {/* Toast */}
      {notification && (
        <div style={{
          position: "absolute", top: isMyTurn ? 80 : 116, left: "50%", transform: "translateX(-50%)",
          background: "rgba(18,8,2,0.92)", border: "1px solid rgba(240,180,60,0.4)",
          borderRadius: 14, padding: "10px 20px", backdropFilter: "blur(12px)",
          color: "#f5d580", fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)", whiteSpace: "nowrap", zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      {/* Forfeit scherm */}
      {forfeitWinner && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,2,0,0.92)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, zIndex: 200 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(238,242,255,0.4)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/><path d="M9 3h6"/></svg>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: "#EEF2FF" }}>Tijd verstreken!</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: "rgba(238,242,255,0.5)" }}>{forfeitWinner} wint door beurt-timeout</div>
          <button onClick={() => router.push("/lobby")} style={{ marginTop: 12, padding: "12px 32px", borderRadius: 50, border: "none", background: "#cc3333", color: "#fff", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>
            Terug naar lobby
          </button>
        </div>
      )}

      {/* Win scherm */}
      {winner !== null && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(5,2,0,0.88)", backdropFilter: "blur(20px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 24, zIndex: 200,
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,220,100,0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4a1 1 0 00-1 1v2c0 3.3 2.5 6 6 6.9M18 9h2a1 1 0 011 1v2c0 3.3-2.5 6-6 6.9"/><path d="M12 17v3M9 20h6"/><path d="M5 3h14l-1 8a6 6 0 01-12 0L5 3z"/></svg>
          <div style={{
            fontSize: 42, fontWeight: 900, color: PLAYER_COLORS[winner],
            textShadow: `0 0 40px ${PLAYER_COLORS[winner]}`, letterSpacing: -1,
          }}>
            {playerNames[winner] ?? PLAYER_NAMES[winner]} wint!
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,220,150,0.5)" }}>
            {WIN_VP} overwinningspunten bereikt
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {Array.from({ length: 2 }).map((_, p) => {
              const vps = getVP(gameState!);
              return (
                <div key={p} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "14px 20px", borderRadius: 14,
                  background: p === winner ? `${PLAYER_COLORS[p]}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${PLAYER_COLORS[p]}${p === winner ? "66" : "22"}`,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: PLAYER_COLORS[p] }}>{vps[p]} VP</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{playerNames[p] ?? PLAYER_NAMES[p]}</div>
                </div>
              );
            })}
          </div>
          <button onClick={() => router.push("/")} style={{
            marginTop: 8, padding: "14px 36px", borderRadius: 16, border: "none",
            background: "linear-gradient(135deg, #d4860a, #e8a020)",
            color: "#1a0a00", fontWeight: 800, fontSize: 15, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(200,120,10,0.4)",
          }}>
            Nieuw spel
          </button>
        </div>
      )}

      </div>{/* end flex-1 relative */}

      {/* ── Spelregels BottomSheet ── */}
      {(() => {
        const RULES = t.catanRules;
        const filtered = rulesSearch.trim()
          ? RULES.filter(([icon, title, text]) =>
              [icon, title, text].join(' ').toLowerCase().includes(rulesSearch.toLowerCase())
            )
          : null;
        const close = () => { setShowRules(false); setRulesSearch(''); setActiveRuleTab(0); };
        return (
          <BottomSheet isOpen={showRules} onClose={close}>
            {(close) => (<>
              <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20, color: '#FF5252', marginBottom: 10 }}>
                  {t.gameRules('Kolonis')}
                </div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45, pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="#EEF2FF" strokeWidth="2"/>
                    <path d="M14 14l3.5 3.5" stroke="#EEF2FF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input value={rulesSearch} onChange={e => setRulesSearch(e.target.value)} placeholder={t.searchPlaceholder}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,82,82,0.2)', borderRadius: 12, padding: '9px 14px 9px 36px', color: '#EEF2FF', fontFamily: "'Nunito', sans-serif", fontSize: 13, outline: 'none' }} />
                  {rulesSearch && <button onClick={() => setRulesSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(238,242,255,0.4)', fontSize: 16, lineHeight: 1 }}>×</button>}
                </div>
                {!filtered && (
                  <div style={{ position: 'relative', margin: '0 -20px' }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, paddingTop: 4, paddingLeft: 20, paddingRight: 20, scrollbarWidth: 'none' }}>
                      {RULES.map(([icon, title], i) => (
                        <button key={title} onClick={() => setActiveRuleTab(i)} style={{ flexShrink: 0, padding: '5px 13px', borderRadius: 50, border: 'none', background: activeRuleTab === i ? '#FF5252' : 'transparent', outline: activeRuleTab === i ? 'none' : '1px solid rgba(255,82,82,0.25)', color: activeRuleTab === i ? '#fff' : 'rgba(255,82,82,0.85)', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{icon}</span> {title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden', padding: '0 20px' }}>
                {filtered ? (
                  <div style={{ overflowY: 'auto', maxHeight: '100%', paddingTop: 8, paddingBottom: 16 }}>
                    {filtered.length === 0
                      ? <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(238,242,255,0.3)', fontFamily: "'Nunito', sans-serif", fontSize: 13 }}>{t.noResults}</div>
                      : filtered.map(([icon, title, text]) => (
                        <div key={title} style={{ marginBottom: 12, padding: '14px 16px', background: 'rgba(255,82,82,0.07)', border: '1px solid rgba(255,82,82,0.18)', borderRadius: 14 }}>
                          <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, color: '#FF5252', marginBottom: 5 }}>{icon} {title}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.8)', lineHeight: 1.65 }}>{text}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ textAlign: 'center', fontSize: 52, paddingTop: 16, paddingBottom: 8, flexShrink: 0 }}>{RULES[activeRuleTab][0]}</div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', height: '100%', transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(calc(-${activeRuleTab * 100}%))` }}>
                        {RULES.map(([, title, text]) => (
                          <div key={title} style={{ minWidth: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '8px 0 12px' }}>
                            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 26, color: '#FF5252', marginBottom: 12, textAlign: 'center' }}>{title}</div>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: 'rgba(238,242,255,0.85)', lineHeight: 1.75, textAlign: 'center' }}>{text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0', flexShrink: 0 }}>
                      {RULES.map((_, di) => (
                        <div key={di} onClick={() => setActiveRuleTab(di)} style={{ width: di === activeRuleTab ? 20 : 7, height: 7, borderRadius: 4, background: di === activeRuleTab ? '#FF5252' : 'rgba(255,255,255,0.18)', transition: 'all 0.2s', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!filtered && (
                <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setActiveRuleTab(i => Math.max(0, i - 1))} disabled={activeRuleTab === 0} style={{ flex: 1, padding: '11px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: activeRuleTab === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(238,242,255,0.7)', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, cursor: activeRuleTab === 0 ? 'default' : 'pointer' }}>{t.previous}</button>
                  <button onClick={() => activeRuleTab < RULES.length - 1 ? setActiveRuleTab(i => i + 1) : close()} style={{ flex: 2, padding: '11px', borderRadius: 50, border: 'none', background: '#FF5252', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 0 #C62828' }}>{activeRuleTab < RULES.length - 1 ? t.nextBtn : t.closeConfirm}</button>
                </div>
              )}
              {filtered && (
                <div style={{ padding: '12px 20px 20px', flexShrink: 0 }}>
                  <button onClick={close} style={{ width: '100%', padding: '11px', borderRadius: 50, border: 'none', background: '#FF5252', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #C62828' }}>{t.closeBtn}</button>
                </div>
              )}
            </>)}
          </BottomSheet>
        );
      })()}
    </main>
  );
}

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav, TurnTimer } from "@/components/ui";
import { useTurnTimer } from "@/lib/useTurnTimer";
import GameControls from "@/components/GameControls";
import BottomSheet from "@/components/BottomSheet";
import { useLang } from "@/lib/lang";
import {
  TileDef, PlacedTile, Board, GameState, MeepleFeature,
  TILE_DEFS, PLAYER_COLORS,
  newGame, rotateTile, placeTile, placeMeeple, passMeeple, skipTile, aiDecide,
  getEdge, getConnectedEdges, getValidPlacements, isValidPlacement,
  featureHasMeeple, cloisterScore, findFeature, scoreFeature,
} from "@/lib/carcassonne";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & colors
// ─────────────────────────────────────────────────────────────────────────────

const TILE_PX  = 60;
const C_CITY   = '#c4a050';  // city warm gold
const C_WALL   = '#7a5010';  // city inner wall border
const C_FIELD  = '#4f8c40';  // field green
const C_ROAD   = '#a09870';  // road surface
const C_ROAD_H = '#d8ceb8';  // road center highlight
const C_KLOOST = '#eada80';  // cloister building

// ─────────────────────────────────────────────────────────────────────────────
// Tile SVG — renders a single tile with proper terrain shapes
// ─────────────────────────────────────────────────────────────────────────────

interface TileSvgProps {
  defId: string;
  rotation: 0 | 1 | 2 | 3;
  size?: number;
  meeple?: { player: number; feature: MeepleFeature } | null;
  opacity?: number;
  highlight?: boolean;
}

function TileSvg({ defId, rotation, size = TILE_PX, meeple = null, opacity = 1, highlight = false }: TileSvgProps) {
  const def = TILE_DEFS[defId];
  if (!def) return null;

  const sz = size;
  const ci = Math.round(sz * 0.27); // edge terrain band depth
  const edges = [0, 1, 2, 3].map(d => getEdge(def, rotation, d));
  const [eN, eE, eS, eW] = edges;

  // Are two adjacent city edges connected (same feature)?
  const connCity = (a: number, b: number) =>
    edges[a] === 'C' && edges[b] === 'C' &&
    getConnectedEdges(def, rotation, a).includes(b);
  const neC = connCity(0, 1), seC = connCity(1, 2), swC = connCity(2, 3), nwC = connCity(3, 0);

  // ── Road paths ────────────────────────────────────────────────────────────
  const roadProcessed = new Set<number>();
  const roadPaths: string[] = [];
  const eMid: Record<number, [number, number]> = {
    0: [sz / 2, 0], 1: [sz, sz / 2], 2: [sz / 2, sz], 3: [0, sz / 2],
  };

  for (let dir = 0; dir < 4; dir++) {
    if (edges[dir] !== 'R' || roadProcessed.has(dir)) continue;
    const grp = getConnectedEdges(def, rotation, dir).filter(e => edges[e] === 'R');
    if (grp.length === 2) {
      const [a, b] = grp;
      roadProcessed.add(a); roadProcessed.add(b);
      const [ax, ay] = eMid[a], [bx, by] = eMid[b];
      const isOpposite = Math.abs(a - b) === 2;
      roadPaths.push(isOpposite
        ? `M${ax},${ay} L${bx},${by}`
        : `M${ax},${ay} Q${sz / 2},${sz / 2} ${bx},${by}`);
    } else {
      roadProcessed.add(dir);
      const [px, py] = eMid[dir];
      roadPaths.push(`M${px},${py} L${sz / 2},${sz / 2}`);
    }
  }

  const rw = Math.max(3, Math.round(sz * 0.125));
  const roadCount = edges.filter(e => e === 'R').length;

  // ── Meeple center positions per feature dir ───────────────────────────────
  const mPos: Record<string, [number, number]> = {
    '0': [sz / 2, ci * 0.5],
    '1': [sz - ci * 0.5, sz / 2],
    '2': [sz / 2, sz - ci * 0.5],
    '3': [ci * 0.5, sz / 2],
    'K': [sz / 2, sz / 2],
  };

  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ display: 'block', opacity }}>

      {/* ── Base field ── */}
      <rect width={sz} height={sz} fill={C_FIELD} />
      {/* Stone texture base layer */}
      <image href="/images/games/tile-stone.png" x={0} y={0} width={sz} height={sz} preserveAspectRatio="xMidYMid slice" opacity={0.15} />
      {/* Subtle darker edge vignette on field */}
      <rect width={sz} height={sz} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={sz * 0.06} />

      {/* ── City corner fills (drawn first so edge strips overlay) ── */}
      {nwC && <rect x={0}     y={0}     width={ci} height={ci} fill={C_CITY} />}
      {neC && <rect x={sz-ci} y={0}     width={ci} height={ci} fill={C_CITY} />}
      {seC && <rect x={sz-ci} y={sz-ci} width={ci} height={ci} fill={C_CITY} />}
      {swC && <rect x={0}     y={sz-ci} width={ci} height={ci} fill={C_CITY} />}

      {/* ── City edge strips ── */}
      {eN === 'C' && <rect x={ci}    y={0}     width={sz - 2 * ci} height={ci}          fill={C_CITY} />}
      {eE === 'C' && <rect x={sz-ci} y={ci}    width={ci}           height={sz - 2 * ci} fill={C_CITY} />}
      {eS === 'C' && <rect x={ci}    y={sz-ci} width={sz - 2 * ci} height={ci}          fill={C_CITY} />}
      {eW === 'C' && <rect x={0}     y={ci}    width={ci}           height={sz - 2 * ci} fill={C_CITY} />}

      {/* ── City center fill ── */}
      {def.center === 'C' && (
        <rect x={ci} y={ci} width={sz - 2 * ci} height={sz - 2 * ci} fill={C_CITY} />
      )}

      {/* ── City wall border lines (inner edge of each city band) ── */}
      {eN === 'C' && <line x1={nwC ? 0 : ci} y1={ci} x2={neC ? sz : sz-ci} y2={ci} stroke={C_WALL} strokeWidth={1.2} />}
      {eS === 'C' && <line x1={swC ? 0 : ci} y1={sz-ci} x2={seC ? sz : sz-ci} y2={sz-ci} stroke={C_WALL} strokeWidth={1.2} />}
      {eW === 'C' && <line x1={ci} y1={nwC ? 0 : ci} x2={ci} y2={swC ? sz : sz-ci} stroke={C_WALL} strokeWidth={1.2} />}
      {eE === 'C' && <line x1={sz-ci} y1={neC ? 0 : ci} x2={sz-ci} y2={seC ? sz : sz-ci} stroke={C_WALL} strokeWidth={1.2} />}
      {/* Side wall stubs where city meets field at corners */}
      {eN === 'C' && eW !== 'C' && !nwC && <line x1={ci} y1={0} x2={ci} y2={ci} stroke={C_WALL} strokeWidth={1} />}
      {eN === 'C' && eE !== 'C' && !neC && <line x1={sz-ci} y1={0} x2={sz-ci} y2={ci} stroke={C_WALL} strokeWidth={1} />}
      {eS === 'C' && eW !== 'C' && !swC && <line x1={ci} y1={sz} x2={ci} y2={sz-ci} stroke={C_WALL} strokeWidth={1} />}
      {eS === 'C' && eE !== 'C' && !seC && <line x1={sz-ci} y1={sz} x2={sz-ci} y2={sz-ci} stroke={C_WALL} strokeWidth={1} />}
      {eW === 'C' && eN !== 'C' && !nwC && <line x1={0} y1={ci} x2={ci} y2={ci} stroke={C_WALL} strokeWidth={1} />}
      {eW === 'C' && eS !== 'C' && !swC && <line x1={0} y1={sz-ci} x2={ci} y2={sz-ci} stroke={C_WALL} strokeWidth={1} />}
      {eE === 'C' && eN !== 'C' && !neC && <line x1={sz} y1={ci} x2={sz-ci} y2={ci} stroke={C_WALL} strokeWidth={1} />}
      {eE === 'C' && eS !== 'C' && !seC && <line x1={sz} y1={sz-ci} x2={sz-ci} y2={sz-ci} stroke={C_WALL} strokeWidth={1} />}

      {/* ── Road paths ── */}
      {roadPaths.map((d, i) => (
        <g key={`r${i}`}>
          <path d={d} stroke={C_ROAD}   strokeWidth={rw}         strokeLinecap="round" fill="none" />
          <path d={d} stroke={C_ROAD_H} strokeWidth={rw * 0.36}  strokeLinecap="round" fill="none" />
        </g>
      ))}
      {/* Junction circle for T/X crossroads */}
      {roadCount >= 3 && (
        <circle cx={sz / 2} cy={sz / 2} r={rw * 0.82} fill={C_ROAD} />
      )}

      {/* ── Cloister building ── */}
      {def.center === 'K' && (() => {
        const bw = sz * 0.3, bh = sz * 0.24;
        const bx = sz / 2 - bw / 2;
        const by = sz / 2 - bh * 0.3;
        const rh = sz * 0.16;
        return (
          <g>
            <rect x={bx + 1.5} y={by + 1.5} width={bw} height={bh} fill="rgba(0,0,0,0.18)" rx={1} />
            <rect x={bx} y={by} width={bw} height={bh} fill={C_KLOOST} stroke="#a08028" strokeWidth={0.8} rx={1} />
            <polygon
              points={`${bx-2},${by} ${sz/2},${by-rh} ${bx+bw+2},${by}`}
              fill="#c04010" stroke="#882808" strokeWidth={0.6}
            />
            <path
              d={`M${sz/2-sz*0.042},${by+bh} V${by+bh*0.52} Q${sz/2},${by+bh*0.28} ${sz/2+sz*0.042},${by+bh*0.52} V${by+bh}`}
              fill="#8a5010" stroke="#6a3008" strokeWidth={0.5}
            />
            <rect x={bx+bw*0.09}  y={by+bh*0.12} width={bw*0.24} height={bh*0.32} fill="#5888b8" rx={2} opacity={0.88} />
            <rect x={bx+bw*0.67}  y={by+bh*0.12} width={bw*0.24} height={bh*0.32} fill="#5888b8" rx={2} opacity={0.88} />
            <rect x={sz/2-1}      y={by-rh-sz*0.042} width={2}    height={sz*0.08} fill="#e8e0d0" />
            <rect x={sz/2-sz*0.042} y={by-rh-sz*0.008} width={sz*0.084} height={2} fill="#e8e0d0" />
          </g>
        );
      })()}

      {/* ── Shield (pentagon) ── */}
      {def.shield && (() => {
        const shW = sz * 0.15, shH = sz * 0.18;
        const shX = sz / 2, shY = eN === 'C' ? ci * 0.5 : ci * 0.5;
        return (
          <path
            d={`M${shX-shW/2},${shY-shH/2} h${shW} v${shH*0.6} l${-shW/2},${shH*0.4} l${-shW/2},${-shH*0.4} Z`}
            fill="#f0c820" stroke="#a07808" strokeWidth={0.8}
          />
        );
      })()}

      {/* ── Highlight border (last placed tile) ── */}
      {highlight && (
        <rect x={0.5} y={0.5} width={sz-1} height={sz-1}
          fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.5} />
      )}

      {/* ── Meeple ── */}
      {meeple !== null && meeple !== undefined && (() => {
        const [mx, my] = mPos[String(meeple.feature)] ?? [sz / 2, sz / 2];
        const color = PLAYER_COLORS[meeple.player];
        const mr = Math.max(3.5, sz * 0.078);
        return (
          <g>
            <ellipse cx={mx} cy={my+mr*1.35} rx={mr*0.6} ry={mr*0.2} fill="rgba(0,0,0,0.28)" />
            <line x1={mx-mr*0.4} y1={my+mr*0.52} x2={mx-mr*0.4} y2={my+mr*1.22}
              stroke={color} strokeWidth={mr*0.4} strokeLinecap="round" />
            <line x1={mx+mr*0.4} y1={my+mr*0.52} x2={mx+mr*0.4} y2={my+mr*1.22}
              stroke={color} strokeWidth={mr*0.4} strokeLinecap="round" />
            <line x1={mx-mr*0.88} y1={my+mr*0.1} x2={mx+mr*0.88} y2={my+mr*0.1}
              stroke={color} strokeWidth={mr*0.36} strokeLinecap="round" />
            <ellipse cx={mx} cy={my+mr*0.28} rx={mr*0.6} ry={mr*0.48}
              fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
            <circle cx={mx} cy={my-mr*0.4} r={mr*0.5}
              fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.8} />
          </g>
        );
      })()}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2D Board — scrollable grid of placed tiles + valid placement highlights
// ─────────────────────────────────────────────────────────────────────────────

interface Board2DProps {
  gs: GameState;
  onPlaceTile: (bx: number, by: number) => void;
  onPlaceMeeple: (feature: MeepleFeature) => void;
  isMyTurn: boolean;
}

function Board2D({ gs, onPlaceTile, onPlaceMeeple, isMyTurn }: Board2DProps) {
  const [hoverPos, setHoverPos] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine bounding box of all placed tiles + 2 empty border
  const positions = Object.keys(gs.board).map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });

  const minX = positions.length ? Math.min(...positions.map(p => p.x)) - 2 : -4;
  const maxX = positions.length ? Math.max(...positions.map(p => p.x)) + 2 : 4;
  const minY = positions.length ? Math.min(...positions.map(p => p.y)) - 2 : -4;
  const maxY = positions.length ? Math.max(...positions.map(p => p.y)) + 2 : 4;

  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;

  const validPlacements = gs.phase === 'place_tile' && gs.currentTile && isMyTurn
    ? Array.from(new Map(getValidPlacements(gs.board, gs.currentTile).map(p => [`${p.bx},${p.by}`, p])).values())
    : [];
  const validSet = new Set(validPlacements.map(p => `${p.bx},${p.by}`));

  const isHoverValid = hoverPos
    ? validSet.has(hoverPos) && isValidPlacement(gs.board, gs.currentTile!, gs.currentRotation, ...hoverPos.split(',').map(Number) as [number, number])
    : false;

  // Meeple placement zones for last placed tile
  const lastTile = gs.lastPlaced ? gs.board[gs.lastPlaced] : null;
  const lastDef = lastTile ? TILE_DEFS[lastTile.defId] : null;
  const meepleZones: Array<{ feature: MeepleFeature; valid: boolean; label: string }> = [];

  if (gs.phase === 'place_meeple' && isMyTurn && gs.lastPlaced && lastTile && lastDef) {
    for (let dir = 0; dir < 4; dir++) {
      const et = getEdge(lastDef, lastTile.rotation, dir);
      if (et === 'F') continue;
      const valid = !featureHasMeeple(gs.board, gs.lastPlaced, dir) && gs.players[gs.currentPlayer].meeplesLeft > 0;
      const labels = ['Noord', 'Oost', 'Zuid', 'West'];
      meepleZones.push({ feature: dir as MeepleFeature, valid, label: `${labels[dir]} (${et === 'C' ? 'Stad' : 'Weg'})` });
    }
    if (lastDef.center === 'K') {
      meepleZones.push({
        feature: 'K',
        valid: gs.players[gs.currentPlayer].meeplesLeft > 0,
        label: 'Klooster',
      });
    }
  }

  // Center on start tile initially
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cx = (-minX) * TILE_PX + el.clientWidth / 2 - TILE_PX / 2;
    const cy = (-minY) * TILE_PX + el.clientHeight / 2 - TILE_PX / 2;
    el.scrollLeft = (-minX) * TILE_PX - el.clientWidth / 2 + TILE_PX / 2;
    el.scrollTop = (-minY) * TILE_PX - el.clientHeight / 2 + TILE_PX / 2;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toKey(bx: number, by: number) {
    return `${bx},${by}`;
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        cursor: gs.phase === 'place_tile' && isMyTurn ? 'crosshair' : 'default',
      }}
    >
      <style>{`
        @keyframes carca-tile-place {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {/* Grid container */}
      <div
        style={{
          position: 'relative',
          width: cols * TILE_PX,
          height: rows * TILE_PX,
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        {/* Dark grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#080B24',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${TILE_PX}px ${TILE_PX}px`,
            backgroundPosition: `${(-minX % 1) * TILE_PX}px ${(-minY % 1) * TILE_PX}px`,
          }}
        />

        {/* Valid placement spots */}
        {validPlacements.map(({ bx, by }) => {
          const key = toKey(bx, by);
          const isHover = hoverPos === key;
          const hoverValid = isHover && isHoverValid;
          if (gs.board[key]) return null;
          return (
            <div
              key={`vp-${key}`}
              onMouseEnter={() => setHoverPos(key)}
              onMouseLeave={() => setHoverPos(null)}
              onClick={() => isHoverValid && onPlaceTile(bx, by)}
              style={{
                position: 'absolute',
                left: (bx - minX) * TILE_PX,
                top: (by - minY) * TILE_PX,
                width: TILE_PX,
                height: TILE_PX,
                boxSizing: 'border-box',
                border: `2px dashed ${hoverValid ? '#6aff80' : 'rgba(106,255,128,0.35)'}`,
                borderRadius: 4,
                background: hoverValid ? 'rgba(106,255,128,0.12)' : 'rgba(106,255,128,0.04)',
                cursor: 'pointer',
                zIndex: 2,
                transition: 'background 0.1s, border-color 0.1s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isHover && gs.currentTile && (
                <div style={{ opacity: isHoverValid ? 0.8 : 0.35, transform: 'scale(0.96)' }}>
                  <TileSvg defId={gs.currentTile} rotation={gs.currentRotation} size={TILE_PX - 2} />
                </div>
              )}
            </div>
          );
        })}

        {/* Placed tiles */}
        {Object.entries(gs.board).map(([pos, placed]) => {
          const [bx, by] = pos.split(',').map(Number);
          const isLast = pos === gs.lastPlaced;

          return (
            <div
              key={pos}
              style={{
                position: 'absolute',
                left: (bx - minX) * TILE_PX,
                top: (by - minY) * TILE_PX,
                width: TILE_PX,
                height: TILE_PX,
                zIndex: isLast ? 2 : 1,
                boxShadow: isLast ? '0 0 0 2.5px rgba(255,255,255,0.7), 0 0 18px rgba(255,255,255,0.2)' : undefined,
                borderRadius: 4,
                animation: isLast ? 'carca-tile-place 0.42s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
              }}
            >
              <TileSvg
                defId={placed.defId}
                rotation={placed.rotation}
                size={TILE_PX}
                meeple={placed.meeple}
                highlight={isLast}
              />
            </div>
          );
        })}

        {/* Meeple placement zones overlaid on last tile */}
        {gs.phase === 'place_meeple' && isMyTurn && gs.lastPlaced && (() => {
          const [lbx, lby] = gs.lastPlaced.split(',').map(Number);
          return meepleZones.map((z, i) => {
            // Position zones inside the tile cell
            const offsets: Record<string, [number, number]> = {
              '0': [TILE_PX / 2 - 12, 2],                      // N
              '1': [TILE_PX - 26, TILE_PX / 2 - 12],           // E
              '2': [TILE_PX / 2 - 12, TILE_PX - 26],           // S
              '3': [2, TILE_PX / 2 - 12],                       // W
              'K': [TILE_PX / 2 - 12, TILE_PX / 2 - 12],       // Cloister
            };
            const featureKey = String(z.feature);
            const [ox, oy] = offsets[featureKey] ?? [TILE_PX / 2 - 12, TILE_PX / 2 - 12];
            return (
              <div
                key={`mz-${i}`}
                title={z.label}
                onClick={() => z.valid && onPlaceMeeple(z.feature)}
                style={{
                  position: 'absolute',
                  left: (lbx - minX) * TILE_PX + ox,
                  top: (lby - minY) * TILE_PX + oy,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: z.valid ? 'rgba(34,221,102,0.85)' : 'rgba(221,34,34,0.6)',
                  border: `2px solid ${z.valid ? '#22dd66' : '#dd2222'}`,
                  cursor: z.valid ? 'pointer' : 'not-allowed',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: z.valid ? '0 0 8px rgba(34,221,102,0.6)' : 'none',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={e => { if (z.valid) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />
              </div>
            );
          });
        })()}
      </div>
    </div>
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
  const [localP1, setLocalP1] = useState('Robin');
  const [localP2, setLocalP2] = useState('Loic');
  const [showRules, setShowRules] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState(0);
  const [rulesSearch, setRulesSearch] = useState('');
  const { t } = useLang();
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init
  useEffect(() => {
    if (!roomId) return;
    const savedName = sessionStorage.getItem('ludoryn-name') || 'Speler 1';
    const savedIdx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? '0');
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
    if (roomId) {
      return (
        <div style={{
          minHeight: '100vh', background: 'linear-gradient(160deg, #0C1A08 0%, #060C03 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#EEF2FF', fontFamily: "'Fredoka', sans-serif", fontSize: 20,
        }}>
          Verbinden...
        </div>
      );
    }
    // Local start screen
    return (
      <div style={{
        minHeight: '100vh', background: 'linear-gradient(160deg, #0C1A08 0%, #060C03 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🏰</div>
            <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 36, fontWeight: 700, color: '#AB47BC', margin: 0 }}>
              Carcassonne
            </h1>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.45)', margin: '8px 0 0' }}>
              Leg tegels · Bouw steden · Win
            </p>
          </div>
          {[
            { label: 'Speler 1', value: localP1, set: setLocalP1, disabled: false },
            { label: vsAI ? 'Tegenstander' : 'Speler 2', value: vsAI ? 'AI' : localP2, set: setLocalP2, disabled: vsAI },
          ].map(({ label, value, set, disabled }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: 'rgba(238,242,255,0.5)', display: 'block', marginBottom: 5 }}>{label}</label>
              <input
                value={value}
                onChange={e => !disabled && set(e.target.value)}
                readOnly={disabled}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(171,71,188,0.25)',
                  borderRadius: 12, padding: '11px 14px',
                  color: disabled ? 'rgba(238,242,255,0.3)' : '#EEF2FF',
                  fontFamily: "'Nunito', sans-serif", fontSize: 15, outline: 'none',
                }}
              />
            </div>
          ))}
          <button
            onClick={() => {
              const p1 = localP1 || 'Speler 1';
              const p2 = vsAI ? 'AI' : (localP2 || 'Speler 2');
              setGs(newGame(p1, p2));
            }}
            style={{
              width: '100%', marginTop: 20, padding: '14px', borderRadius: 50, border: 'none',
              background: '#8B5CF6', color: '#fff',
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
              cursor: 'pointer', boxShadow: '0 5px 0 #5B21B6',
            }}
          >
            Spelen!
          </button>
        </div>
        <BottomNav items={[
          { label: 'Home', icon: 'home', onClick: () => { if (typeof window !== 'undefined') window.location.href = '/'; } },
          { label: 'Lobby', icon: 'lobby', onClick: () => { if (typeof window !== 'undefined') window.location.href = '/lobby?game=carcassonne'; } },
          { label: 'Scores', icon: 'scores', onClick: () => { if (typeof window !== 'undefined') window.location.href = '/scores'; } },
          { label: 'Shop', icon: 'shop', onClick: () => router.push('/shop') },
        ]} />
      </div>
    );
  }

  const curPlayer = gs.players[gs.currentPlayer];
  const myPlayer = gs.players[myIndex];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#080B24',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(8,11,36,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        zIndex: 40,
        gap: 12,
      }}>
        {/* Player cards */}
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          {gs.players.map((p, i) => {
            const isActive = gs.currentPlayer === i && gs.phase !== 'gameover';
            const color = PLAYER_COLORS[i];
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderRadius: 12,
                  background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? color + '55' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isActive ? `0 0 16px ${color}33` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {/* Meeple color dot */}
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: isActive ? `0 0 6px ${color}` : 'none',
                  flexShrink: 0,
                }} />
                {/* Name */}
                <span style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#EEF2FF',
                  whiteSpace: 'nowrap',
                }}>
                  {p.name}
                </span>
                {/* Score */}
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  color,
                }}>
                  {p.score}
                </span>
                {/* Meeple count */}
                <span style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                }}>
                  {Array.from({ length: Math.min(p.meeplesLeft, 7) }).map((_, j) => (
                    <span key={j} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, opacity: 0.7, marginRight: 2 }} />
                  ))}
                </span>
                {isActive && (
                  <span style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: 9,
                    fontWeight: 800,
                    color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}>
                    {i === myIndex ? 'jij' : 'beurt'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Deck count */}
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {gs.deck.length} tegels
        </div>

        {/* GameControls in header */}
        {roomId ? (
          <GameControls
            roomId={roomId}
            myName={gs?.players[myIndex]?.name ?? 'Speler'}
            playerNames={gs?.players.map((p: { name: string }) => p.name) ?? []}
            gameType="carcassonne"
            isSpectator={isSpectator}
            isGameOver={gs?.phase === 'gameover' || forfeitWinner !== null}
            myPlayerIndex={myIndex}
            accent="#8B5CF6"
            onResign={() => {
              if (vsAI) {
                setForfeitWinner(gs?.players.find((_, i) => i !== myIndex)?.name ?? 'Tegenstander');
              } else {
                getSocket().emit('resign');
                setForfeitWinner(gs?.players.find((_, i) => i !== myIndex)?.name ?? 'Tegenstander');
              }
            }}
            inHeader
          />
        ) : (
          <button
            onClick={() => setGs(null)}
            style={{
              width: 34, height: 34, flexShrink: 0, borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(238,242,255,0.5)', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >←</button>
        )}
        {/* Rules button */}
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

      {/* ── Main area: Board + Side panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Board */}
        <Board2D
          gs={gs}
          onPlaceTile={handlePlaceTile}
          onPlaceMeeple={handlePlaceMeeple}
          isMyTurn={isMyTurn}
        />

        {/* ── Side panel ── */}
        <div style={{
          width: 180,
          flexShrink: 0,
          background: 'rgba(17,22,58,0.85)',
          backdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: 12,
          gap: 12,
          overflowY: 'auto',
          zIndex: 20,
        }}>

          {/* Current tile to place */}
          {gs.phase === 'place_tile' && gs.currentTile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 10,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {isMyTurn ? 'Jouw tegel' : `${curPlayer.name}'s tegel`}
              </div>

              {/* Tile preview */}
              <div style={{
                padding: 4,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 10,
                border: isMyTurn ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isMyTurn ? '0 0 12px rgba(139,92,246,0.2)' : 'none',
              }}>
                <TileSvg defId={gs.currentTile} rotation={gs.currentRotation} size={80} />
              </div>

              {/* Rotate button */}
              {isMyTurn && (
                <button
                  onClick={handleRotate}
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    background: 'rgba(139,92,246,0.2)',
                    color: '#c4b5fd',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 8,
                    padding: '7px 0',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.2)'; }}
                >
                  <span style={{ fontSize: 16 }}>↻</span> Draaien
                </button>
              )}

              {/* Skip button (no valid placements) */}
              {isMyTurn && validCount === 0 && (
                <button
                  onClick={handleSkip}
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    background: 'rgba(200,50,50,0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(200,50,50,0.3)',
                    borderRadius: 8,
                    padding: '7px 0',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,50,50,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,50,50,0.2)'; }}
                >
                  Overslaan
                </button>
              )}

              {/* Waiting indicator */}
              {!isMyTurn && (
                <div style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.35)',
                  textAlign: 'center',
                }}>
                  Wachten op<br />{curPlayer.name}...
                </div>
              )}
            </div>
          )}

          {/* Meeple placement panel */}
          {gs.phase === 'place_meeple' && isMyTurn && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 10,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textAlign: 'center',
              }}>
                Meeple plaatsen?
              </div>
              <div style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}>
                Klik op een groen vlak op het bord, of sla over.
              </div>

              {/* Meeple zone buttons */}
              {(() => {
                const lastTileData = gs.lastPlaced ? gs.board[gs.lastPlaced] : null;
                const lastDefData = lastTileData ? TILE_DEFS[lastTileData.defId] : null;
                if (!lastDefData || !gs.lastPlaced) return null;
                const zones: Array<{ feature: MeepleFeature; valid: boolean; label: string }> = [];
                for (let dir = 0; dir < 4; dir++) {
                  const et = getEdge(lastDefData, lastTileData!.rotation, dir);
                  if (et === 'F') continue;
                  const valid = !featureHasMeeple(gs.board, gs.lastPlaced, dir) && gs.players[gs.currentPlayer].meeplesLeft > 0;
                  const labels = ['Noord', 'Oost', 'Zuid', 'West'];
                  zones.push({ feature: dir as MeepleFeature, valid, label: `${labels[dir]} (${et === 'C' ? 'Stad' : 'Weg'})` });
                }
                if (lastDefData.center === 'K') {
                  zones.push({ feature: 'K', valid: gs.players[gs.currentPlayer].meeplesLeft > 0, label: 'Klooster' });
                }
                return zones.map((z, i) => (
                  <button
                    key={i}
                    onClick={() => z.valid && handlePlaceMeeple(z.feature)}
                    disabled={!z.valid}
                    style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontWeight: 600,
                      fontSize: 11,
                      background: z.valid ? 'rgba(34,221,102,0.15)' : 'rgba(255,255,255,0.04)',
                      color: z.valid ? '#86efac' : 'rgba(255,255,255,0.2)',
                      border: `1px solid ${z.valid ? 'rgba(34,221,102,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 8,
                      padding: '6px 8px',
                      cursor: z.valid ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (z.valid) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,221,102,0.3)'; }}
                    onMouseLeave={e => { if (z.valid) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,221,102,0.15)'; }}
                  >
                    {z.label}
                  </button>
                ));
              })()}

              <button
                onClick={handlePassMeeple}
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding: '7px 0',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                Overslaan
              </button>
            </div>
          )}

          {/* Waiting for opponent (meeple phase) */}
          {gs.phase === 'place_meeple' && !isMyTurn && (
            <div style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              textAlign: 'center',
            }}>
              {curPlayer.name} plaatst meeple...
            </div>
          )}

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: 9,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 2,
            }}>
              Legenda
            </div>
            {[
              [C_CITY,   'Stad'],
              [C_ROAD,   'Weg'],
              [C_FIELD,  'Veld'],
              [C_KLOOST, 'Klooster'],
            ].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 14, height: 14, background: c, borderRadius: 3, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                  {l}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />

          {/* Recent log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: 9,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 2,
            }}>
              Log
            </div>
            {gs.log.slice(-6).map((line, i) => (
              <div key={i} style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.4,
              }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Turn Timer ── */}
      {roomId && timeLeft !== null && !forfeitWinner && gs?.phase !== 'gameover' && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 188,
          padding: '0 16px',
          zIndex: 50,
          pointerEvents: 'none',
        }}>
          <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={isMyTurn} accent="#8B5CF6" />
        </div>
      )}

      {/* ── Game Over overlay ── */}
      {gs.phase === 'gameover' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,8,30,0.9)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          zIndex: 200,
        }}>
          <h2 style={{
            fontFamily: "'Fredoka', sans-serif",
            fontSize: 36,
            fontWeight: 700,
            color: '#EEF2FF',
            margin: 0,
          }}>
            {gs.players[0].score === gs.players[1].score
              ? 'Gelijkspel!'
              : `${gs.players[0].score > gs.players[1].score ? gs.players[0].name : gs.players[1].name} wint!`}
          </h2>

          {/* Score cards */}
          <div style={{ display: 'flex', gap: 20 }}>
            {gs.players.map((p, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  padding: '16px 32px',
                  background: `${PLAYER_COLORS[i]}15`,
                  border: `1px solid ${PLAYER_COLORS[i]}44`,
                  borderRadius: 16,
                  boxShadow: `0 0 24px ${PLAYER_COLORS[i]}22`,
                }}
              >
                <div style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: 6,
                }}>
                  {p.name}
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 40,
                  fontWeight: 700,
                  color: PLAYER_COLORS[i],
                }}>
                  {p.score}
                </div>
                <div style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  punten
                </div>
              </div>
            ))}
          </div>

          {/* Log tail */}
          <div style={{
            maxWidth: 340,
            maxHeight: 160,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 10,
            padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {gs.log.slice(-12).map((line, i) => (
              <div key={i} style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
                marginBottom: 2,
              }}>
                {line}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setGs(newGame(gs.players[0].name, gs.players[1].name))}
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 600,
                fontSize: 16,
                background: '#4a7c3f',
                color: '#fff',
                border: 'none',
                borderRadius: 50,
                padding: '12px 32px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(74,124,63,0.5)',
              }}
            >
              Opnieuw
            </button>
            <button
              onClick={() => router.push('/lobby?game=carcassonne')}
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 600,
                fontSize: 16,
                background: 'rgba(255,255,255,0.08)',
                color: '#EEF2FF',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 50,
                padding: '12px 32px',
                cursor: 'pointer',
              }}
            >
              Lobby
            </button>
          </div>
        </div>
      )}

      {/* ── Forfeit overlay ── */}
      {forfeitWinner && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,2,0,0.92)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          zIndex: 300,
        }}>
          <div style={{ fontSize: 56 }}>⏱️</div>
          <div style={{
            fontFamily: "'Fredoka', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: '#EEF2FF',
          }}>
            Tijd verstreken!
          </div>
          <div style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 16,
            color: 'rgba(238,242,255,0.5)',
          }}>
            {forfeitWinner} wint door beurt-timeout
          </div>
          <button
            onClick={() => router.push('/lobby?game=carcassonne')}
            style={{
              marginTop: 12,
              padding: '12px 32px',
              borderRadius: 50,
              border: 'none',
              background: '#8B5CF6',
              color: '#fff',
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Terug naar lobby
          </button>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <BottomNav
        items={[
          { label: 'Home', icon: 'home', onClick: () => router.push('/') },
          { label: 'Lobby', icon: 'lobby', onClick: () => router.push('/lobby?game=carcassonne') },
          { label: 'Scores', icon: 'scores', onClick: () => router.push('/scores') },
          { label: 'Shop', icon: 'shop', onClick: () => router.push('/shop') },
        ]}
      />

      {/* ── Spelregels BottomSheet ── */}
      {(() => {
        const RULES = t.carcaRules;
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
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20, color: '#8B5CF6', marginBottom: 10 }}>
                  {t.gameRules('Carcassonne')}
                </div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45, pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="#EEF2FF" strokeWidth="2"/>
                    <path d="M14 14l3.5 3.5" stroke="#EEF2FF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input value={rulesSearch} onChange={e => setRulesSearch(e.target.value)} placeholder={t.searchPlaceholder}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: '9px 14px 9px 36px', color: '#EEF2FF', fontFamily: "'Nunito', sans-serif", fontSize: 13, outline: 'none' }} />
                  {rulesSearch && <button onClick={() => setRulesSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(238,242,255,0.4)', fontSize: 16, lineHeight: 1 }}>×</button>}
                </div>
                {!filtered && (
                  <div style={{ position: 'relative', margin: '0 -20px' }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, paddingTop: 4, paddingLeft: 20, paddingRight: 20, scrollbarWidth: 'none' }}>
                      {RULES.map(([icon, title], i) => (
                        <button key={title} onClick={() => setActiveRuleTab(i)} style={{ flexShrink: 0, padding: '5px 13px', borderRadius: 50, border: 'none', background: activeRuleTab === i ? '#8B5CF6' : 'transparent', outline: activeRuleTab === i ? 'none' : '1px solid rgba(139,92,246,0.25)', color: activeRuleTab === i ? '#fff' : 'rgba(139,92,246,0.85)', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                        <div key={title} style={{ marginBottom: 12, padding: '14px 16px', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 14 }}>
                          <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, color: '#8B5CF6', marginBottom: 5 }}>{icon} {title}</div>
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
                            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 26, color: '#8B5CF6', marginBottom: 12, textAlign: 'center' }}>{title}</div>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: 'rgba(238,242,255,0.85)', lineHeight: 1.75, textAlign: 'center' }}>{text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0', flexShrink: 0 }}>
                      {RULES.map((_, di) => (
                        <div key={di} onClick={() => setActiveRuleTab(di)} style={{ width: di === activeRuleTab ? 20 : 7, height: 7, borderRadius: 4, background: di === activeRuleTab ? '#8B5CF6' : 'rgba(255,255,255,0.18)', transition: 'all 0.2s', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!filtered && (
                <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setActiveRuleTab(i => Math.max(0, i - 1))} disabled={activeRuleTab === 0} style={{ flex: 1, padding: '11px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: activeRuleTab === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(238,242,255,0.7)', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, cursor: activeRuleTab === 0 ? 'default' : 'pointer' }}>{t.previous}</button>
                  <button onClick={() => activeRuleTab < RULES.length - 1 ? setActiveRuleTab(i => i + 1) : close()} style={{ flex: 2, padding: '11px', borderRadius: 50, border: 'none', background: '#8B5CF6', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 0 #5B21B6' }}>{activeRuleTab < RULES.length - 1 ? t.nextBtn : t.closeConfirm}</button>
                </div>
              )}
              {filtered && (
                <div style={{ padding: '12px 20px 20px', flexShrink: 0 }}>
                  <button onClick={close} style={{ width: '100%', padding: '11px', borderRadius: 50, border: 'none', background: '#8B5CF6', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #5B21B6' }}>{t.closeBtn}</button>
                </div>
              )}
            </>)}
          </BottomSheet>
        );
      })()}
    </div>
  );
}

export default function CarcassonnePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080B24' }} />}>
      <CarcassonneContent />
    </Suspense>
  );
}

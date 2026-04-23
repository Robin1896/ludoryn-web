"use client";

import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav, TurnTimer } from "@/components/ui";
import { useTurnTimer } from "@/lib/useTurnTimer";
import GameControls from "@/components/GameControls";
import {
  CITIES, CARD_HEX, PLAYER_COLORS, CARD_COLORS,
  type CardColor, type Route, type DestinationTicket, type GameState, type ClaimOption,
  newGame, drawFaceUpCard, drawFromDeck, claimRoute, initiateDrawTickets,
  keepTickets, getClaimOptions, routePoints, totalCards, areConnected,
  aiDecide,
} from "@/lib/ticket-to-ride";

// ─────────────────────────────────────────────────────────────────────────────
// World coordinate helpers
// ─────────────────────────────────────────────────────────────────────────────

const MAP_W = 26;
const MAP_D = 20;

function toWorld(svgX: number, svgY: number): [number, number, number] {
  return [
    (svgX / 640) * MAP_W - MAP_W / 2,
    0,
    (svgY / 490) * MAP_D - MAP_D / 2,
  ];
}

const CITY_WORLD: Record<string, [number, number, number]> = Object.fromEntries(
  CITIES.map(c => [c.id, toWorld(c.x, c.y)])
);

interface SegmentData {
  position: [number, number, number];
  rotY: number;
  segLen: number;
}

function getSegments3D(fromId: string, toId: string, length: number): SegmentData[] {
  const [ax, , az] = CITY_WORLD[fromId] ?? [0, 0, 0];
  const [bx, , bz] = CITY_WORLD[toId] ?? [0, 0, 0];

  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Align box's local X axis with direction (dx, dz)
  const rotY = Math.atan2(-dz, dx);

  const gapFrac = 0.14;
  const segLen = (dist / length) * (1 - gapFrac);

  return Array.from({ length }, (_, i) => {
    const t = (i + 0.5) / length;
    return {
      position: [ax + dx * t, 0.07, az + dz * t] as [number, number, number],
      rotY,
      segLen,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Board
// ─────────────────────────────────────────────────────────────────────────────

function Board() {
  return (
    <group>
      {/* Main felt surface */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[MAP_W + 1.5, 0.12, MAP_D + 1.5]} />
        <meshStandardMaterial color="#14241a" roughness={0.95} metalness={0} />
      </mesh>
      {/* Border frame */}
      {[
        { pos: [0, 0, -(MAP_D / 2 + 0.8)] as [number,number,number], args: [MAP_W + 2.5, 0.18, 0.5] as [number,number,number] },
        { pos: [0, 0,  (MAP_D / 2 + 0.8)] as [number,number,number], args: [MAP_W + 2.5, 0.18, 0.5] as [number,number,number] },
        { pos: [-(MAP_W / 2 + 0.8), 0, 0] as [number,number,number], args: [0.5, 0.18, MAP_D + 2.5] as [number,number,number] },
        { pos: [ (MAP_W / 2 + 0.8), 0, 0] as [number,number,number], args: [0.5, 0.18, MAP_D + 2.5] as [number,number,number] },
      ].map((edge, i) => (
        <mesh key={i} position={edge.pos} receiveShadow>
          <boxGeometry args={edge.args} />
          <meshStandardMaterial color="#4a2a08" roughness={0.7} metalness={0.05} />
        </mesh>
      ))}
      {/* Subtle grid overlay */}
      {[-8, -4, 0, 4, 8].map(x =>
        <mesh key={`vg${x}`} position={[x, 0.001, 0]}>
          <boxGeometry args={[0.02, 0.001, MAP_D]} />
          <meshStandardMaterial color="#ffffff" opacity={0.04} transparent />
        </mesh>
      )}
      {[-6, -3, 0, 3, 6].map(z =>
        <mesh key={`hg${z}`} position={[0, 0.001, z]}>
          <boxGeometry args={[MAP_W, 0.001, 0.02]} />
          <meshStandardMaterial color="#ffffff" opacity={0.04} transparent />
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Route segments
// ─────────────────────────────────────────────────────────────────────────────

const SEG_H = 0.14;
const SEG_D = 0.38;

interface RouteSegmentsProps {
  route: Route;
  claimable: boolean;
  selected: boolean;
  onClick: () => void;
}

function RouteSegments({ route, claimable, selected, onClick }: RouteSegmentsProps) {
  const [hovered, setHovered] = useState(false);
  const matRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const segments = useMemo(() => getSegments3D(route.from, route.to, route.length), [route.from, route.to, route.length]);

  const isClaimed = route.claimedBy !== null;
  const routeHex = route.color === 'gray' ? '#6B7280' : CARD_HEX[route.color as CardColor];
  const claimHex = isClaimed ? PLAYER_COLORS[route.claimedBy!] : null;

  const targetColor = isClaimed
    ? claimHex!
    : (hovered && claimable) || selected
      ? routeHex
      : '#1e2e1e';

  const targetEmissive = claimable && !isClaimed ? routeHex : '#000000';

  // Pulsing animation on claimable routes
  useFrame(({ clock }) => {
    if (!claimable || isClaimed) return;
    const pulse = 0.12 + Math.sin(clock.elapsedTime * 2.5) * 0.08;
    const intensity = hovered || selected ? pulse + 0.25 : pulse;
    matRefs.current.forEach(m => {
      if (m) m.emissiveIntensity = intensity;
    });
  });

  const baseEmissiveIntensity = selected ? 0.45 : hovered && claimable ? 0.35 : 0.12;

  return (
    <group
      onClick={claimable ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onPointerEnter={() => {
        if (claimable) { setHovered(true); document.body.style.cursor = 'pointer'; }
      }}
      onPointerLeave={() => {
        setHovered(false); document.body.style.cursor = 'auto';
      }}
    >
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={seg.position}
          rotation={[0, seg.rotY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[seg.segLen, SEG_H, SEG_D]} />
          <meshStandardMaterial
            ref={(el) => { if (el) matRefs.current[i] = el; }}
            color={targetColor}
            emissive={targetEmissive}
            emissiveIntensity={claimable && !isClaimed ? baseEmissiveIntensity : 0}
            roughness={isClaimed ? 0.35 : 0.88}
            metalness={isClaimed ? 0.15 : 0}
          />
        </mesh>
      ))}

      {/* Route points badge on middle segment */}
      {!isClaimed && (
        <Html
          position={[
            (CITY_WORLD[route.from][0] + CITY_WORLD[route.to][0]) / 2,
            0.35,
            (CITY_WORLD[route.from][2] + CITY_WORLD[route.to][2]) / 2,
          ]}
          center
          distanceFactor={16}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            fontWeight: 700,
            color: claimable ? routeHex : 'rgba(255,255,255,0.22)',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 4,
            padding: '1px 4px',
          }}>
            {route.length}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// City pin
// ─────────────────────────────────────────────────────────────────────────────

function CityPin({ city }: { city: { id: string; name: string } }) {
  const pos = CITY_WORLD[city.id];
  if (!pos) return null;

  return (
    <group position={pos}>
      {/* Base disk */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.1, 16]} />
        <meshStandardMaterial color="#1a2e1a" roughness={0.6} />
      </mesh>
      {/* Inner ring */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 16]} />
        <meshStandardMaterial color="#d4e8c4" roughness={0.4} />
      </mesh>
      {/* Center dot */}
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#e0ffe0" emissiveIntensity={0.6} />
      </mesh>
      {/* Label */}
      <Html
        position={[0, 0.55, 0]}
        center
        distanceFactor={14}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: city.name.length > 10 ? 9 : 10,
          fontWeight: 800,
          color: '#ffffff',
          textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}>
          {city.name}
        </div>
      </Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lighting
// ─────────────────────────────────────────────────────────────────────────────

function TrainLights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#d4ecd4" />
      <directionalLight
        position={[6, 22, 8]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <pointLight position={[-13, 7, -8]} intensity={0.4} color="#ffe4b0" />
      <pointLight position={[13, 5, 7]} intensity={0.3} color="#b0d4ff" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main 3D Game Scene
// ─────────────────────────────────────────────────────────────────────────────

interface GameScene3DProps {
  gs: GameState;
  claimableRoutes: string[];
  selectedRoute: string | null;
  onRouteClick: (id: string) => void;
}

function GameScene3D({ gs, claimableRoutes, selectedRoute, onRouteClick }: GameScene3DProps) {
  return (
    <>
      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={38}
        maxPolarAngle={Math.PI / 2.15}
        target={[1, 0, 0]}
      />
      <TrainLights />
      <fog attach="fog" args={['#050a05', 30, 65]} />

      <Board />

      {gs.routes.map(route => (
        <RouteSegments
          key={route.id}
          route={route}
          claimable={claimableRoutes.includes(route.id)}
          selected={selectedRoute === route.id}
          onClick={() => onRouteClick(route.id)}
        />
      ))}

      {CITIES.map(city => (
        <CityPin key={city.id} city={city} />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket card (HTML)
// ─────────────────────────────────────────────────────────────────────────────

const CITY_MAP = Object.fromEntries(CITIES.map(c => [c.id, c]));

function TicketCard({
  ticket, completed, small, selectable, selected, onToggle,
}: {
  ticket: DestinationTicket;
  completed?: boolean;
  small?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const from = CITY_MAP[ticket.from]?.name ?? ticket.from;
  const to   = CITY_MAP[ticket.to]?.name   ?? ticket.to;
  const col  = completed === undefined ? '#E8B56D' : completed ? '#20D9A0' : '#E55A2B';

  return (
    <div
      onClick={selectable ? onToggle : undefined}
      style={{
        background: selected ? 'rgba(232,181,109,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? '#E8B56D' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        padding: small ? '5px 8px' : '7px 11px',
        display: 'flex', alignItems: 'center', gap: 8,
        cursor: selectable ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: small ? 10 : 11, fontWeight: 700, color: '#EEF2FF', lineHeight: 1.3 }}>
          {from} → {to}
        </div>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: small ? 11 : 13, fontWeight: 700, color: col, minWidth: 22, textAlign: 'right' }}>
        {completed === false ? '-' : ''}{ticket.points}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Claim modal
// ─────────────────────────────────────────────────────────────────────────────

function ClaimModal({ route, options, onClaim, onCancel }: {
  route: Route;
  options: ClaimOption[];
  onClaim: (color: CardColor, wilds: number) => void;
  onCancel: () => void;
}) {
  const from = CITY_MAP[route.from]?.name ?? route.from;
  const to   = CITY_MAP[route.to]?.name   ?? route.to;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0f1a0f', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '24px 28px', width: 'min(380px, calc(100vw - 40px))', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: '#E8B56D', marginBottom: 6 }}>Route leggen</div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'rgba(238,242,255,0.7)', marginBottom: 20 }}>
          {from} → {to} · {route.length} waggons · {routePoints(route.length)} pt
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {options.map((opt, i) => (
            <button key={i} onClick={() => onClaim(opt.color, opt.wilds)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: `${CARD_HEX[opt.color]}22`, border: `1px solid ${CARD_HEX[opt.color]}66`,
              borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: CARD_HEX[opt.color], border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: '#EEF2FF' }}>
                {route.length - opt.wilds}× {opt.color}{opt.wilds > 0 ? ` + ${opt.wilds}× wild` : ''}
              </div>
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px', fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.4)', cursor: 'pointer' }}>
          Annuleren
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket picker
// ─────────────────────────────────────────────────────────────────────────────

function TicketPicker({ tickets, onKeep }: { tickets: DestinationTicket[]; onKeep: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(tickets.map(t => t.id));

  const toggle = (id: string) => setSelected(prev =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0f1a0f', border: '1px solid rgba(232,181,109,0.3)', borderRadius: 20, padding: '24px 28px', width: 'min(400px, calc(100vw - 40px))', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 22, fontWeight: 700, color: '#E8B56D', marginBottom: 6 }}>Reistickets</div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.5)', marginBottom: 18 }}>Kies minimaal 1 ticket om te houden</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {tickets.map(t => (
            <TicketCard key={t.id} ticket={t} selectable selected={selected.includes(t.id)} onToggle={() => toggle(t.id)} />
          ))}
        </div>
        <button onClick={() => onKeep(selected)} style={{ width: '100%', background: '#E8B56D', color: '#1a0d00', border: 'none', borderRadius: 12, padding: '12px', fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Bewaar {selected.length} ticket{selected.length > 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Final score screen
// ─────────────────────────────────────────────────────────────────────────────

function ScoreScreen({ gs, onRestart }: { gs: GameState; onRestart: () => void }) {
  const scores = gs.finalScores ?? [];
  const maxScore = Math.max(...scores);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0f1a0f', border: '1px solid rgba(232,181,109,0.4)', borderRadius: 24, padding: '32px 36px', width: 'min(440px, calc(100vw - 48px))', textAlign: 'center', boxShadow: '0 0 60px rgba(232,181,109,0.15)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 28, fontWeight: 700, color: '#E8B56D', marginBottom: 4 }}>Spel Voorbij!</div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: 'rgba(238,242,255,0.6)', marginBottom: 28 }}>
          {gs.players[scores.indexOf(maxScore)].name} wint!
        </div>
        {gs.players.map((p, i) => {
          const isWinner = scores[i] === maxScore;
          const ticketPts = scores[i] - p.routeScore - (gs.longestRouteHolder === i ? 10 : 0);
          return (
            <div key={i} style={{ background: isWinner ? 'rgba(232,181,109,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isWinner ? 'rgba(232,181,109,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '16px 20px', marginBottom: 12, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 18, fontWeight: 700, color: PLAYER_COLORS[i] }}>{p.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: isWinner ? '#E8B56D' : '#EEF2FF' }}>{scores[i]}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(238,242,255,0.5)', marginBottom: 10 }}>
                <span>Routes: {p.routeScore}</span>
                <span style={{ color: ticketPts >= 0 ? '#20D9A0' : '#E55A2B' }}>Tickets: {ticketPts >= 0 ? '+' : ''}{ticketPts}</span>
                {gs.longestRouteHolder === i && <span style={{ color: '#E8B56D' }}>Langste: +10</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.tickets.map(t => <TicketCard key={t.id} ticket={t} completed={areConnected(gs.routes, i, t.from, t.to)} small />)}
              </div>
            </div>
          );
        })}
        <button onClick={onRestart} style={{ marginTop: 8, background: '#E8B56D', color: '#1a0d00', border: 'none', borderRadius: 12, padding: '13px 40px', fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Opnieuw
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────────

interface HUDProps {
  gs: GameState;
  myPlayerIndex: number;
  isMyTurn: boolean;
  vsAI: boolean;
  claimableRoutes: string[];
  onDrawFaceUp: (idx: number) => void;
  onDrawDeck: () => void;
  onDrawTickets: () => void;
  waitingFor?: string;
}

function HUD({ gs, myPlayerIndex, isMyTurn, vsAI, claimableRoutes, onDrawFaceUp, onDrawDeck, onDrawTickets, waitingFor }: HUDProps) {
  const cp = gs.currentPlayer;
  const player = gs.players[myPlayerIndex];
  const canDrawCards   = isMyTurn && (gs.phase === 'idle' || gs.phase === 'drew_first');
  const canDrawTickets = isMyTurn && gs.phase === 'idle' && gs.ticketDeck.length > 0;
  const isSecondDraw   = gs.phase === 'drew_first';

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 10, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif", fontWeight: 700,
    fontSize: 12, padding: '9px 0', flex: 1, transition: 'all 0.15s',
  };

  return (
    <div style={{ position: 'absolute', bottom: 72, left: 0, right: 0, zIndex: 10, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Score pills */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {gs.players.map((p, i) => {
          const active = i === cp;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: active ? 'rgba(10,20,10,0.95)' : 'rgba(10,20,10,0.6)', border: `1px solid ${active ? PLAYER_COLORS[i] + '99' : 'rgba(255,255,255,0.1)'}`, borderRadius: 50, padding: '5px 12px', boxShadow: active ? `0 4px 16px ${PLAYER_COLORS[i]}44` : 'none', transition: 'all 0.2s' }}>
              {active && <span style={{ color: PLAYER_COLORS[i], fontSize: 9 }}>▶</span>}
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: active ? '#EEF2FF' : 'rgba(238,242,255,0.4)' }}>{p.name}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: PLAYER_COLORS[i], opacity: active ? 1 : 0.45 }}>{p.routeScore}pt</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(238,242,255,0.35)' }}>{p.trainsLeft}</span>
            </div>
          );
        })}
      </div>

      {/* Main control panel */}
      <div style={{ background: 'rgba(8,15,8,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Cards row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Face-up cards */}
          <div style={{ display: 'flex', gap: 5 }}>
            {gs.faceUpCards.map((card, i) => {
              const disabled = !canDrawCards || (isSecondDraw && card === 'wild');
              return (
                <div
                  key={i}
                  onClick={() => !disabled && card && onDrawFaceUp(i)}
                  title={card ?? ''}
                  style={{
                    width: 30, height: 44, borderRadius: 6,
                    background: card ? CARD_HEX[card] : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${card ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: !disabled && card ? 'pointer' : 'default',
                    opacity: disabled ? 0.3 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: card === 'wild' ? '#1a0d00' : 'rgba(255,255,255,0.9)',
                    fontFamily: "'DM Mono', monospace",
                    boxShadow: !disabled && card ? `0 3px 10px ${CARD_HEX[card ?? 'wild']}55` : 'none',
                    transition: 'all 0.12s',
                    flexShrink: 0,
                  }}
                >
                  {card === 'wild' ? '✦' : ''}
                </div>
              );
            })}
          </div>

          {/* Deck button */}
          <div
            onClick={() => canDrawCards && onDrawDeck()}
            style={{ width: 30, height: 44, borderRadius: 6, background: canDrawCards ? 'rgba(232,181,109,0.15)' : 'rgba(255,255,255,0.04)', border: `2px solid ${canDrawCards ? 'rgba(232,181,109,0.5)' : 'rgba(255,255,255,0.08)'}`, cursor: canDrawCards ? 'pointer' : 'default', opacity: canDrawCards ? 1 : 0.35, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, flexShrink: 0 }}
            title="Trek van stapel"
          >
            <div style={{ fontSize: 13 }}>🂠</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#E8B56D' }}>{gs.drawDeck.length}</div>
          </div>

          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          {/* Hand */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {CARD_COLORS.filter(c => player.hand[c] > 0).map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 3, background: `${CARD_HEX[c]}22`, border: `1px solid ${CARD_HEX[c]}55`, borderRadius: 6, padding: '3px 6px' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: CARD_HEX[c] }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: CARD_HEX[c] }}>{player.hand[c]}</span>
              </div>
            ))}
            {player.hand.wild > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: `${CARD_HEX.wild}22`, border: `1px solid ${CARD_HEX.wild}66`, borderRadius: 6, padding: '3px 6px' }}>
                <span style={{ fontSize: 10 }}>✦</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: CARD_HEX.wild }}>{player.hand.wild}</span>
              </div>
            )}
            {totalCards(player.hand) === 0 && <span style={{ fontSize: 11, color: 'rgba(238,242,255,0.25)', fontFamily: "'Nunito', sans-serif" }}>Geen kaarten</span>}
          </div>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 6 }}>
          {waitingFor ? (
            <div style={{ flex: 1, textAlign: 'center', padding: '8px', fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.4)' }}>Wachten op {waitingFor}...</div>
          ) : isSecondDraw ? (
            <div style={{ flex: 1, textAlign: 'center', padding: '8px', fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(232,181,109,0.7)' }}>Trek nog 1 kaart</div>
          ) : !isMyTurn ? (
            <div style={{ flex: 1, textAlign: 'center', padding: '8px', fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.4)' }}>
              {vsAI && cp === 1 ? 'AI speelt...' : `Wachten op ${gs.players[cp]?.name}...`}
            </div>
          ) : (
            <>
              <div style={{ ...btnBase, flex: 1, background: claimableRoutes.length > 0 ? 'rgba(232,181,109,0.12)' : 'rgba(255,255,255,0.04)', color: claimableRoutes.length > 0 ? '#E8B56D' : 'rgba(238,242,255,0.2)', border: `1px solid ${claimableRoutes.length > 0 ? 'rgba(232,181,109,0.35)' : 'rgba(255,255,255,0.06)'}`, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {claimableRoutes.length > 0 ? `${claimableRoutes.length} routes beschikbaar` : 'Geen routes'}
              </div>
              <button onClick={() => canDrawTickets && onDrawTickets()} disabled={!canDrawTickets} style={{ ...btnBase, background: canDrawTickets ? 'rgba(32,217,160,0.1)' : 'rgba(255,255,255,0.04)', color: canDrawTickets ? '#20D9A0' : 'rgba(238,242,255,0.2)', border: `1px solid ${canDrawTickets ? 'rgba(32,217,160,0.35)' : 'rgba(255,255,255,0.06)'}`, cursor: canDrawTickets ? 'pointer' : 'not-allowed' }}>
                🎫 Tickets ({gs.ticketDeck.length})
              </button>
            </>
          )}
        </div>

        {/* Tickets */}
        {player.tickets.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {player.tickets.map(t => (
              <TicketCard key={t.id} ticket={t} completed={areConnected(gs.routes, myPlayerIndex, t.from, t.to)} small />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log panel
// ─────────────────────────────────────────────────────────────────────────────

function LogPanel({ log }: { log: string[] }) {
  return (
    <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, width: 190, background: 'rgba(5,12,5,0.88)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 10px' }}>
      {log.slice(-4).map((msg, i, arr) => (
        <div key={i} style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, color: i === arr.length - 1 ? 'rgba(238,242,255,0.82)' : 'rgba(238,242,255,0.32)', lineHeight: 1.5 }}>{msg}</div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start screen
// ─────────────────────────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: (names: [string, string], vsAI: boolean) => void }) {
  const [name1, setName1] = useState("Robin");
  const [name2, setName2] = useState("Loic");

  const inputStyle: React.CSSProperties = {
    background: 'rgba(15,26,15,0.8)', border: '1px solid rgba(232,181,109,0.3)',
    borderRadius: 12, padding: '10px 14px', color: '#EEF2FF',
    fontFamily: "'Nunito', sans-serif", fontSize: 15,
    width: '100%', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080B24', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(238,242,255,0.45)', background: 'transparent', border: '1px solid rgba(232,181,109,0.2)', borderRadius: 50, padding: '6px 14px', cursor: 'pointer' }}>
            ← Terug
          </button>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(28px, 7vw, 52px)', fontWeight: 900, letterSpacing: '0.08em', background: 'linear-gradient(160deg, #ffffff 0%, #E8B56D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px', lineHeight: 0.95 }}>
          TICKET
        </h1>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(28px, 7vw, 52px)', fontWeight: 900, letterSpacing: '0.08em', color: '#E8B56D', margin: '0 0 16px', lineHeight: 0.95 }}>
          TO RIDE
        </h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#E8B56D', margin: '0 0 36px' }}>
          Routes · Treinen · Tickets
        </p>

        <div style={{ background: 'rgba(15,26,15,0.6)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '28px 24px', textAlign: 'left' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(232,181,109,0.6)', marginBottom: 6, display: 'block' }}>Speler 1</label>
            <input style={inputStyle} value={name1} onChange={e => setName1(e.target.value)} placeholder="Naam..." />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(232,181,109,0.6)', marginBottom: 6, display: 'block' }}>Speler 2</label>
            <input style={inputStyle} value={name2} onChange={e => setName2(e.target.value)} placeholder="Naam..." />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onStart([name1 || 'Speler 1', name2 || 'Speler 2'], false)} style={{ flex: 1, background: '#E8B56D', color: '#1a0d00', border: 'none', borderRadius: 50, padding: '13px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
              2 Spelers
            </button>
            <button onClick={() => onStart([name1 || 'Speler 1', 'AI'], true)} style={{ flex: 1, background: 'rgba(232,181,109,0.12)', color: '#E8B56D', border: '1px solid rgba(232,181,109,0.4)', borderRadius: 50, padding: '13px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
              vs AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

function TicketToRideContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const aiParam = searchParams.get("ai") === "1";

  const [screenPhase, setScreenPhase] = useState<'start' | 'waiting' | 'playing'>('start');
  const [gs, setGs] = useState<GameState | null>(null);
  const [vsAI, setVsAI] = useState(false);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [opponentName, setOpponentName] = useState("");
  const [claimModal, setClaimModal] = useState<{ routeId: string; options: ClaimOption[] } | null>(null);
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Online room setup
  useEffect(() => {
    if (!roomId) return;
    const pidx = parseInt(sessionStorage.getItem(`ludus-pidx-${roomId}`) ?? "0");
    const myName = sessionStorage.getItem("ludus-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setScreenPhase('waiting');
    const socket = getSocket();

    if (aiParam) {
      setVsAI(true);
      setGs(newGame([myName, "AI"]));
      setScreenPhase('playing');
      return;
    }

    const onRoomUpdate = ({ players: names, ready }: { players: string[]; ready: boolean; roomId: string }) => {
      if (names.length >= 2) setOpponentName(names[1 - pidx] ?? "");
      if (ready && pidx === 0) {
        setGs(prev => {
          if (prev) return prev;
          const game = newGame([myName, names[1] ?? "Speler 2"]);
          socket.emit("state-update", { gameState: game });
          return game;
        });
        setScreenPhase('playing');
      }
    };
    const onStateSync  = ({ gameState }: { gameState: GameState | null }) => { if (gameState) { setGs(gameState); setScreenPhase('playing'); } };
    const onStateUpdate = ({ gameState }: { gameState: GameState }) => { setGs(gameState); setScreenPhase('playing'); };

    socket.on("room-update", onRoomUpdate);
    socket.on("state-sync", onStateSync);
    socket.on("state-update", onStateUpdate);
    socket.io.on("reconnect", () => socket.emit("join-room", { roomId, name: myName }));

    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null; players: string[] }) => {
      if (res.players.length >= 2) setOpponentName(res.players[1 - pidx] ?? "");
      if (res.gameState) { setGs(res.gameState); setScreenPhase('playing'); }
    });

    socket.on("turn-forfeit", ({ winnerName }: { loserIndex: number; winnerName: string }) => {
      setForfeitWinner(winnerName);
    });

    return () => {
      socket.off("room-update", onRoomUpdate);
      socket.off("state-sync", onStateSync);
      socket.off("state-update", onStateUpdate);
      socket.off("turn-forfeit");
    };
  }, [roomId, aiParam]); // eslint-disable-line react-hooks/exhaustive-deps

  function emitState(newGs: GameState) {
    if (roomId) getSocket().emit("state-update", { gameState: newGs });
  }

  const isMyTurn = !roomId || (gs !== null && gs.currentPlayer === myPlayerIndex);
  const { timeLeft, gameMode } = useTurnTimer(isMyTurn);

  const claimableRoutes = useMemo(() =>
    gs && isMyTurn && gs.phase === 'idle'
      ? gs.routes.filter(r => r.claimedBy === null && getClaimOptions(gs.players[myPlayerIndex].hand, r).length > 0).map(r => r.id)
      : [],
    [gs, isMyTurn, myPlayerIndex]
  );

  const handleRouteClick = useCallback((routeId: string) => {
    if (!gs || !isMyTurn || gs.phase !== 'idle') return;
    const route = gs.routes.find(r => r.id === routeId);
    if (!route) return;
    const options = getClaimOptions(gs.players[myPlayerIndex].hand, route);
    if (options.length === 0) return;
    if (options.length === 1) {
      const newGs = claimRoute(gs, routeId, options[0].color, options[0].wilds);
      setGs(newGs); emitState(newGs);
    } else {
      setClaimModal({ routeId, options });
    }
  }, [gs, isMyTurn, myPlayerIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrawFaceUp  = (idx: number) => { if (!gs || !isMyTurn) return; const ng = drawFaceUpCard(gs, idx); setGs(ng); emitState(ng); };
  const handleDrawDeck    = () => { if (!gs || !isMyTurn) return; const ng = drawFromDeck(gs); setGs(ng); emitState(ng); };
  const handleDrawTickets = () => { if (!gs || !isMyTurn) return; const ng = initiateDrawTickets(gs); setGs(ng); emitState(ng); };

  const handleKeepTickets = (ids: string[]) => {
    if (!gs) return;
    const ng = keepTickets(gs, ids); setGs(ng); emitState(ng);
  };

  const handleClaim = (color: CardColor, wilds: number) => {
    if (!gs || !claimModal) return;
    const ng = claimRoute(gs, claimModal.routeId, color, wilds);
    setGs(ng); emitState(ng); setClaimModal(null);
  };

  // AI turn
  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1 || gs.gamePhase === 'gameover') return;
    const action = aiDecide(gs);
    if (!action) return;
    const t = setTimeout(() => {
      setGs(prev => {
        if (!prev || prev.currentPlayer !== 1) return prev;
        const dec = aiDecide(prev);
        if (!dec) return prev;
        switch (dec.type) {
          case 'claim':        return claimRoute(prev, dec.routeId, dec.color, dec.wilds);
          case 'draw_face_up': return drawFaceUpCard(prev, dec.cardIdx);
          case 'draw_deck':    return drawFromDeck(prev);
          case 'draw_tickets': return initiateDrawTickets(prev);
          case 'keep_tickets': return prev.pendingTickets ? keepTickets(prev, dec.ids) : prev;
          default: return prev;
        }
      });
    }, action.type === 'claim' ? 1000 : 650);
    return () => clearTimeout(t);
  }, [gs, vsAI]);

  if (screenPhase === 'waiting') {
    return (
      <div style={{ minHeight: '100vh', background: '#080B24', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 28, fontWeight: 700, color: '#E8B56D' }}>Wachten op tegenstander...</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'rgba(238,242,255,0.4)', letterSpacing: 3 }}>Room: {roomId}</div>
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }}
          style={{ padding: "10px 24px", borderRadius: 50, border: "1px solid rgba(232,181,109,0.3)", background: "transparent", color: inviteCopied ? "#F59E0B" : "rgba(232,181,109,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          {inviteCopied ? "Link gekopieerd!" : "Kopieer uitnodigingslink"}
        </button>
        <BottomNav items={[
          { label: "Home", icon: "home", onClick: () => router.push("/") },
          { label: "Lobby", icon: "lobby", onClick: () => router.push("/lobby?game=ticket-to-ride") },
          { label: "Scores", icon: "scores", onClick: () => router.push("/scores") },
        ]} />
      </div>
    );
  }

  if (screenPhase === 'start' || !gs) return <StartScreen onStart={(names, ai) => { setVsAI(ai); setMyPlayerIndex(0); setGs(newGame(names)); setScreenPhase('playing'); }} />;

  const showWaiting = roomId && !isMyTurn;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050a05', position: 'relative', overflow: 'hidden' }}>

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [1, 22, 13], fov: 44 }}
        shadows
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ camera }) => { camera.lookAt(1, 0, 0); }}
      >
        <Suspense fallback={null}>
          <GameScene3D
            gs={gs}
            claimableRoutes={claimableRoutes}
            selectedRoute={null}
            onRouteClick={handleRouteClick}
          />
        </Suspense>
      </Canvas>

      {/* Log */}
      <LogPanel log={gs.log} />

      {/* HUD */}
      <HUD
        gs={gs}
        myPlayerIndex={myPlayerIndex}
        isMyTurn={isMyTurn}
        vsAI={vsAI && !roomId}
        claimableRoutes={claimableRoutes}
        onDrawFaceUp={handleDrawFaceUp}
        onDrawDeck={handleDrawDeck}
        onDrawTickets={handleDrawTickets}
        waitingFor={showWaiting ? (opponentName || gs.players[gs.currentPlayer]?.name) : undefined}
      />

      <BottomNav items={[
        { label: "Home", icon: "🏠", onClick: () => router.push("/") },
        { label: "Lobby", icon: "⊞", onClick: () => router.push("/lobby?game=ticket-to-ride") },
        { label: "Scores", icon: "🏆", onClick: () => router.push("/scores") },
      ]} />

      {/* Ticket picker */}
      {gs.phase === 'picking_tickets' && gs.pendingTickets && isMyTurn && (
        <TicketPicker tickets={gs.pendingTickets} onKeep={handleKeepTickets} />
      )}

      {/* Claim modal */}
      {claimModal && (
        <ClaimModal
          route={gs.routes.find(r => r.id === claimModal.routeId)!}
          options={claimModal.options}
          onClaim={handleClaim}
          onCancel={() => setClaimModal(null)}
        />
      )}

      {roomId && (
        <GameControls
          roomId={roomId}
          myName={gs?.players[myPlayerIndex]?.name ?? "Speler"}
          playerNames={gs?.players.map(p => p.name) ?? []}
          gameType="ticket-to-ride"
          isSpectator={isSpectator}
          isGameOver={gs?.gamePhase === 'gameover' || forfeitWinner !== null}
          myPlayerIndex={myPlayerIndex}
          accent="#F59E0B"
          onResign={!vsAI ? () => getSocket().emit("resign") : undefined}
        />
      )}

      {/* Turn timer */}
      {roomId && timeLeft !== null && !forfeitWinner && gs.gamePhase !== 'gameover' && (
        <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, padding: '0 16px', zIndex: 50 }}>
          <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={isMyTurn} accent="#F59E0B" />
        </div>
      )}

      {/* Forfeit scherm */}
      {forfeitWinner && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,2,0,0.92)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 300 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(238,242,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: '#EEF2FF' }}>Tijd verstreken!</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: 'rgba(238,242,255,0.5)' }}>{forfeitWinner} wint door beurt-timeout</div>
          <button onClick={() => router.push('/lobby?game=ticket-to-ride')} style={{ marginTop: 12, padding: '12px 32px', borderRadius: 50, border: 'none', background: '#F59E0B', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Terug naar lobby
          </button>
        </div>
      )}

      {/* Final scores */}
      {gs.gamePhase === 'gameover' && gs.finalScores && (
        <ScoreScreen gs={gs} onRestart={() => { setGs(null); setVsAI(false); setScreenPhase('start'); setClaimModal(null); }} />
      )}
    </div>
  );
}

export default function TicketToRidePage() {
  return (
    <Suspense>
      <TicketToRideContent />
    </Suspense>
  );
}

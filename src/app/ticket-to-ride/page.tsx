"use client";

import { useState, useEffect, useMemo, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav, TurnTimer } from "@/components/ui";
import BottomSheet from "@/components/BottomSheet";
import { useTurnTimer } from "@/lib/useTurnTimer";
import { useLang } from "@/lib/lang";
import GameControls from "@/components/GameControls";
import WaitingScreen from "@/components/WaitingScreen";
import {
  CITIES, CARD_HEX, PLAYER_COLORS, CARD_COLORS,
  type CardColor, type Route, type DestinationTicket, type GameState, type ClaimOption,
  newGame, drawFaceUpCard, drawFromDeck, claimRoute, initiateDrawTickets,
  keepTickets, getClaimOptions, routePoints, totalCards, areConnected,
  aiDecide,
} from "@/lib/ticket-to-ride";

// ─────────────────────────────────────────────────────────────────────────────
// City lookup
// ─────────────────────────────────────────────────────────────────────────────

const CITY_MAP = Object.fromEntries(CITIES.map(c => [c.id, c]));

const CARD_IMG: Record<string, string> = {
  red: '/images/games/ttr-card-red.png',
  blue: '/images/games/ttr-card-blue.png',
  green: '/images/games/ttr-card-green.png',
  yellow: '/images/games/ttr-card-yellow.png',
  purple: '/images/games/ttr-card-purple.png',
  orange: '/images/games/ttr-card-orange.png',
  black: '/images/games/ttr-card-black.png',
  white: '/images/games/ttr-card-white.png',
  locomotive: '/images/games/ttr-card-loco.png',
  wild: '/images/games/ttr-card-loco.png',
};

// SVG coordinate space: 640×490 → scale to fit 580×420
const SVG_W = 580;
const SVG_H = 420;
const SRC_W = 640;
const SRC_H = 490;

function svgX(x: number): number { return (x / SRC_W) * SVG_W; }
function svgY(y: number): number { return (y / SRC_H) * SVG_H; }

// ─────────────────────────────────────────────────────────────────────────────
// SVG Map
// ─────────────────────────────────────────────────────────────────────────────

interface MapProps {
  routes: Route[];
  claimableRoutes: string[];
  selectedRoute: string | null;
  onRouteClick: (id: string) => void;
}

function RouteSegment({ route, claimable, selected, onClick }: {
  route: Route;
  claimable: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const from = CITY_MAP[route.from];
  const to = CITY_MAP[route.to];
  if (!from || !to) return null;

  const x1 = svgX(from.x);
  const y1 = svgY(from.y);
  const x2 = svgX(to.x);
  const y2 = svgY(to.y);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const isClaimed = route.claimedBy !== null;
  const routeHex = route.color === 'gray' ? '#6B7280' : CARD_HEX[route.color as CardColor];
  const claimHex = isClaimed ? PLAYER_COLORS[route.claimedBy!] : null;

  const strokeColor = isClaimed
    ? claimHex!
    : selected
      ? routeHex
      : hovered && claimable
        ? routeHex
        : route.color === 'gray' ? '#374151' : `${routeHex}55`;

  const strokeWidth = isClaimed ? 5 : selected ? 5 : hovered && claimable ? 4 : 3;
  const opacity = !claimable && !isClaimed && !selected ? 0.45 : 1;

  // Draw individual segments
  const segments = [];
  for (let i = 0; i < route.length; i++) {
    const t0 = i / route.length;
    const t1 = (i + 1) / route.length;
    const gap = 0.06 / route.length;
    const sx1 = x1 + dx * (t0 + gap);
    const sy1 = y1 + dy * (t0 + gap);
    const sx2 = x1 + dx * (t1 - gap);
    const sy2 = y1 + dy * (t1 - gap);
    segments.push({ sx1, sy1, sx2, sy2 });
  }

  return (
    <g
      onClick={claimable ? onClick : undefined}
      onMouseEnter={() => claimable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: claimable ? 'pointer' : 'default' }}
      opacity={opacity}
    >
      {/* Hit area */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="transparent"
        strokeWidth={12}
      />
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.sx1} y1={s.sy1} x2={s.sx2} y2={s.sy2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
        />
      ))}
      {/* Points label in the middle */}
      {!isClaimed && (
        <g>
          <rect
            x={mx - 8} y={my - 7} width={16} height={13}
            rx={3} fill="rgba(0,0,0,0.6)"
          />
          <text
            x={mx} y={my + 3}
            textAnchor="middle"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              fontWeight: 700,
              fill: claimable ? routeHex : 'rgba(255,255,255,0.3)',
            }}
          >
            {route.length}
          </text>
        </g>
      )}
    </g>
  );
}

function CityDot({ city }: { city: typeof CITIES[0] }) {
  const x = svgX(city.x);
  const y = svgY(city.y);
  const isLong = city.name.length > 10;

  return (
    <g>
      <circle cx={x} cy={y} r={5} fill="#0d1a38" stroke="rgba(120,165,255,0.8)" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={2.5} fill="#ffffff" />
      <text
        x={x}
        y={y - 9}
        textAnchor="middle"
        style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: isLong ? 7 : 8,
          fontWeight: 800,
          fill: '#ffffff',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,1))',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {city.name}
      </text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card icons
// ─────────────────────────────────────────────────────────────────────────────

function WagonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 22 30" width={size} height={size * 30/22} style={{ display: 'block' }}>
      {/* Body */}
      <rect x="1" y="5" width="20" height="13" rx="2.5" fill="rgba(255,255,255,0.28)" />
      {/* Window */}
      <rect x="4" y="8" width="14" height="7" rx="1.5" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
      {/* Chassis */}
      <rect x="1" y="17" width="20" height="2.5" rx="1" fill="rgba(255,255,255,0.18)" />
      {/* Left wheel */}
      <circle cx="5.5" cy="23" r="3" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <circle cx="5.5" cy="23" r="1" fill="rgba(255,255,255,0.4)" />
      {/* Right wheel */}
      <circle cx="16.5" cy="23" r="3" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <circle cx="16.5" cy="23" r="1" fill="rgba(255,255,255,0.4)" />
      {/* Axle */}
      <line x1="5.5" y1="19.5" x2="16.5" y2="19.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  );
}

function LocomotiveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 22 30" width={size} height={size * 30/22} style={{ display: 'block' }}>
      {/* Chimney */}
      <rect x="14" y="1" width="4" height="5" rx="1" fill="rgba(255,255,255,0.35)" />
      <rect x="13" y="4" width="6" height="2" rx="0.5" fill="rgba(255,255,255,0.4)" />
      {/* Boiler */}
      <ellipse cx="11" cy="10" rx="9" ry="4.5" fill="rgba(255,255,255,0.3)" />
      {/* Cab */}
      <rect x="1" y="4" width="9" height="9" rx="2" fill="rgba(255,255,255,0.22)" />
      {/* Cab window */}
      <rect x="2.5" y="5.5" width="5.5" height="4.5" rx="1" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />
      {/* Chassis */}
      <rect x="0" y="14" width="22" height="3" rx="1" fill="rgba(255,255,255,0.2)" />
      {/* Wheels */}
      <circle cx="4" cy="21" r="3.2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      <circle cx="4" cy="21" r="1.2" fill="rgba(255,255,255,0.4)" />
      <circle cx="11" cy="21" r="3.2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      <circle cx="11" cy="21" r="1.2" fill="rgba(255,255,255,0.4)" />
      <circle cx="18" cy="21" r="3.2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      <circle cx="18" cy="21" r="1.2" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Map
// ─────────────────────────────────────────────────────────────────────────────

function GameMap({ routes, claimableRoutes, selectedRoute, onRouteClick }: MapProps) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);
  scaleRef.current = scale;
  panRef.current = pan;

  // Native non-passive touch listeners to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 || scaleRef.current > 1) e.preventDefault();
      if (e.touches.length === 2 && pinchRef.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / pinchRef.current.dist;
        setScale(s => { const ns = Math.max(1, Math.min(4, s * factor)); setPan(p => clamp(p.x, p.y, ns)); return ns; });
        pinchRef.current = { dist, midX: pinchRef.current.midX, midY: pinchRef.current.midY };
      } else if (e.touches.length === 1 && dragRef.current) {
        const dx = e.touches[0].clientX - dragRef.current.startX;
        const dy = e.touches[0].clientY - dragRef.current.startY;
        setPan(clamp(dragRef.current.panX + dx, dragRef.current.panY + dy, scaleRef.current));
      }
    };
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clampPan(x: number, y: number, s: number) {
    const maxX = (SVG_W * (s - 1)) / 2;
    const maxY = (SVG_H * (s - 1)) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }
  const clamp = clampPan;

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.14 : 0.88;
    setScale(s => {
      const ns = Math.max(1, Math.min(4, s * factor));
      setPan(p => clampPan(p.x, p.y, ns));
      return ns;
    });
  }

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan(dragRef.current.panX + dx, dragRef.current.panY + dy, scale));
  }
  function onMouseUp() { dragRef.current = null; }

  // Touch: single finger = pan, two fingers = pinch
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        dist: Math.hypot(dx, dy),
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      dragRef.current = null;
    } else if (e.touches.length === 1 && scale > 1) {
      dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    }
  }


  function onTouchEnd() { pinchRef.current = null; dragRef.current = null; }

  const isInteracting = !!(dragRef.current);

  return (
    <div
      ref={containerRef}
      style={{
        background: '#051840',
        border: '1px solid rgba(66,133,244,0.2)',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none',
        cursor: scale > 1 ? 'grab' : 'default',
        userSelect: 'none',
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        style={{
          display: 'block',
          transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
          transformOrigin: '50% 50%',
          transition: isInteracting ? 'none' : 'transform 0.2s ease',
        }}
      >
        <defs>
          <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#051840"/>
            <stop offset="100%" stopColor="#020C22"/>
          </linearGradient>
        </defs>
        <rect width={SVG_W} height={SVG_H} fill="url(#mapBg)" />
        <image href="/images/games/ttr-map-bg.png" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" opacity="0.35"/>

        {routes.map(route => (
          <RouteSegment
            key={route.id}
            route={route}
            claimable={claimableRoutes.includes(route.id)}
            selected={selectedRoute === route.id}
            onClick={() => onRouteClick(route.id)}
          />
        ))}

        {CITIES.map(city => (
          <CityDot key={city.id} city={city} />
        ))}
      </svg>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={() => setScale(s => { const ns = Math.min(4, s * 1.3); setPan(p => clampPan(p.x, p.y, ns)); return ns; })}
          style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)', color: '#4285F4', fontSize: 16, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
        <button onClick={() => setScale(s => { const ns = Math.max(1, s * 0.77); setPan(p => clampPan(p.x, p.y, ns)); return ns; })}
          style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)', color: '#4285F4', fontSize: 16, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
        {scale > 1.05 && (
          <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontSize: 9, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>RST</button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket card
// ─────────────────────────────────────────────────────────────────────────────

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
  const col  = completed === undefined ? '#4285F4' : completed ? '#20D9A0' : '#E55A2B';

  return (
    <div
      onClick={selectable ? onToggle : undefined}
      style={{
        background: selected ? 'rgba(66,133,244,0.18)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? '#4285F4' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        padding: small ? '5px 8px' : '7px 11px',
        display: 'flex', alignItems: 'center', gap: 8,
        cursor: selectable ? 'pointer' : 'default',
        transition: 'all 0.15s',
        flexShrink: 0,
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
      <div style={{ background: '#050f28', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '24px 28px', width: 'min(380px, calc(100vw - 40px))', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: '#4285F4', marginBottom: 6 }}>Route leggen</div>
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
      <div style={{ background: '#050f28', border: '1px solid rgba(66,133,244,0.3)', borderRadius: 20, padding: '24px 28px', width: 'min(400px, calc(100vw - 40px))', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 22, fontWeight: 700, color: '#4285F4', marginBottom: 6 }}>Reistickets</div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.5)', marginBottom: 18 }}>Kies minimaal 1 ticket om te houden</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {tickets.map(t => (
            <TicketCard key={t.id} ticket={t} selectable selected={selected.includes(t.id)} onToggle={() => toggle(t.id)} />
          ))}
        </div>
        <button onClick={() => onKeep(selected)} style={{ width: '100%', background: '#4285F4', color: '#1a0d00', border: 'none', borderRadius: 12, padding: '12px', fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
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
      <div style={{ background: '#050f28', border: '1px solid rgba(66,133,244,0.4)', borderRadius: 24, padding: '32px 36px', width: 'min(440px, calc(100vw - 48px))', textAlign: 'center', boxShadow: '0 0 60px rgba(66,133,244,0.15)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 28, fontWeight: 700, color: '#4285F4', marginBottom: 4 }}>Spel Voorbij!</div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: 'rgba(238,242,255,0.6)', marginBottom: 28 }}>
          {gs.players[scores.indexOf(maxScore)].name} wint!
        </div>
        {gs.players.map((p, i) => {
          const isWinner = scores[i] === maxScore;
          const ticketPts = scores[i] - p.routeScore - (gs.longestRouteHolder === i ? 10 : 0);
          return (
            <div key={i} style={{ background: isWinner ? 'rgba(66,133,244,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isWinner ? 'rgba(66,133,244,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '16px 20px', marginBottom: 12, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 18, fontWeight: 700, color: PLAYER_COLORS[i] }}>{p.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: isWinner ? '#4285F4' : '#EEF2FF' }}>{scores[i]}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(238,242,255,0.5)', marginBottom: 10 }}>
                <span>Routes: {p.routeScore}</span>
                <span style={{ color: ticketPts >= 0 ? '#20D9A0' : '#E55A2B' }}>Tickets: {ticketPts >= 0 ? '+' : ''}{ticketPts}</span>
                {gs.longestRouteHolder === i && <span style={{ color: '#4285F4' }}>Langste: +10</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.tickets.map(t => <TicketCard key={t.id} ticket={t} completed={areConnected(gs.routes, i, t.from, t.to)} small />)}
              </div>
            </div>
          );
        })}
        <button onClick={onRestart} style={{ marginTop: 8, background: '#4285F4', color: '#1a0d00', border: 'none', borderRadius: 12, padding: '13px 40px', fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Opnieuw
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player header card
// ─────────────────────────────────────────────────────────────────────────────

function PlayerHeaderCard({ player, playerIdx, active, isMe, avatarId }: {
  player: GameState['players'][0];
  playerIdx: number;
  active: boolean;
  isMe: boolean;
  avatarId?: string | null;
}) {
  const color = PLAYER_COLORS[playerIdx];
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: active
        ? `linear-gradient(135deg, ${color}22, ${color}0a)`
        : 'rgba(255,255,255,0.03)',
      border: `1.5px solid ${active ? color + '66' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12,
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
      transition: 'all 0.2s',
      boxShadow: active ? `0 0 20px ${color}22` : 'none',
    }}>
      {/* Avatar / Color dot */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: active ? color + '33' : 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${color}88`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 12,
        color: active ? color : 'rgba(238,242,255,0.4)',
        overflow: 'hidden',
      }}>
        {avatarId
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={`/avatars/${avatarId}.png`} alt={player.name} width={28} height={28} style={{ width: 28, height: 28, objectFit: 'cover' }} />
          : player.name[0]?.toUpperCase()
        }
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        <div className="marquee-overflow" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 12, color: active ? '#EEF2FF' : 'rgba(238,242,255,0.4)', flexShrink: 1, minWidth: 0 }}>
          <span>{player.name}{isMe ? ' (jij)' : ''}</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: color, opacity: active ? 1 : 0.5, flexShrink: 0 }}>{player.routeScore}pt</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(238,242,255,0.3)', flexShrink: 0 }}>🚂{player.trainsLeft}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(238,242,255,0.25)', flexShrink: 0 }}>🎫{player.tickets.length}</span>
      </div>
      {active && (
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main game panel
// ─────────────────────────────────────────────────────────────────────────────

interface GamePanelProps {
  gs: GameState;
  myPlayerIndex: number;
  isMyTurn: boolean;
  vsAI: boolean;
  claimableRoutes: string[];
  onRouteClick: (id: string) => void;
  onDrawFaceUp: (idx: number) => void;
  onDrawDeck: () => void;
  onDrawTickets: () => void;
  waitingFor?: string;
  timeLeft?: number | null;
  gameMode?: 'fast' | 'slow';
}

function GamePanel({
  gs, myPlayerIndex, isMyTurn, vsAI, claimableRoutes,
  onRouteClick, onDrawFaceUp, onDrawDeck, onDrawTickets,
  waitingFor, timeLeft, gameMode,
}: GamePanelProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const cp = gs.currentPlayer;
  const player = gs.players[myPlayerIndex];
  const canDrawCards   = isMyTurn && (gs.phase === 'idle' || gs.phase === 'drew_first');
  const canDrawTickets = isMyTurn && gs.phase === 'idle' && gs.ticketDeck.length > 0;
  const isSecondDraw   = gs.phase === 'drew_first';

  const handleRouteClick = (id: string) => {
    if (claimableRoutes.includes(id)) {
      setSelectedRoute(id);
      onRouteClick(id);
    }
  };

  // Clear selection when phase changes
  useEffect(() => { setSelectedRoute(null); }, [gs.phase, gs.currentPlayer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* SVG Map */}
      <GameMap
        routes={gs.routes}
        claimableRoutes={claimableRoutes}
        selectedRoute={selectedRoute}
        onRouteClick={handleRouteClick}
      />

      {/* Cards area */}
      <div style={{
        background: 'rgba(5,12,35,0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* Face-up cards + deck */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(238,242,255,0.3)', whiteSpace: 'nowrap' }}>
            Trek
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {gs.faceUpCards.map((card, i) => {
              const disabled = !canDrawCards || (isSecondDraw && card === 'wild');
              return (
                <div
                  key={i}
                  onClick={() => !disabled && card && onDrawFaceUp(i)}
                  title={card ?? ''}
                  style={{
                    width: 32, height: 46, borderRadius: 7,
                    background: card
                      ? (CARD_IMG[card]
                        ? `linear-gradient(${CARD_HEX[card]}88, ${CARD_HEX[card]}88)`
                        : CARD_HEX[card])
                      : 'rgba(255,255,255,0.05)',
                    backgroundImage: card && CARD_IMG[card]
                      ? `url('${CARD_IMG[card]}'), linear-gradient(${CARD_HEX[card]}88, ${CARD_HEX[card]}88)`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: `2px solid ${card ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: !disabled && card ? 'pointer' : 'default',
                    opacity: disabled ? 0.3 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    color: card === 'wild' ? '#1a0d00' : 'rgba(255,255,255,0.9)',
                    fontFamily: "'DM Mono', monospace",
                    boxShadow: !disabled && card ? `0 3px 10px ${CARD_HEX[card ?? 'wild']}55` : 'none',
                    transition: 'all 0.12s, transform 0.12s',
                    flexShrink: 0,
                    transform: !disabled && card ? 'translateY(0)' : 'none',
                  }}
                  onMouseEnter={e => { if (!disabled && card) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  {card === 'wild' ? <LocomotiveIcon size={18} /> : <WagonIcon size={18} />}
                </div>
              );
            })}
          </div>

          {/* Deck button */}
          <div
            onClick={() => canDrawCards && onDrawDeck()}
            title="Trek van stapel"
            style={{
              width: 32, height: 46, borderRadius: 7,
              background: canDrawCards ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${canDrawCards ? 'rgba(66,133,244,0.5)' : 'rgba(255,255,255,0.08)'}`,
              cursor: canDrawCards ? 'pointer' : 'default',
              opacity: canDrawCards ? 1 : 0.35,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 1, flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 14 }}>🂠</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: '#4285F4' }}>{gs.drawDeck.length}</div>
          </div>

          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', flexShrink: 0, marginLeft: 2 }} />

          {/* Hand */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {CARD_COLORS.filter(c => player.hand[c] > 0).map(c => (
              <div key={c} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: CARD_IMG[c]
                  ? `url('${CARD_IMG[c]}'), ${CARD_HEX[c]}22`
                  : `${CARD_HEX[c]}22`,
                backgroundImage: CARD_IMG[c]
                  ? `url('${CARD_IMG[c]}')`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `1px solid ${CARD_HEX[c]}55`,
                borderRadius: 6, padding: '3px 6px',
              }}>
                <div style={{ color: CARD_HEX[c], flexShrink: 0, lineHeight: 0 }}><WagonIcon size={12} /></div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: CARD_HEX[c], textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{player.hand[c]}</span>
              </div>
            ))}
            {player.hand.wild > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3,
                backgroundImage: `url('${CARD_IMG.wild}')`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: `1px solid ${CARD_HEX.wild}66`, borderRadius: 6, padding: '3px 6px',
              }}>
                <div style={{ lineHeight: 0 }}><LocomotiveIcon size={12} /></div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: CARD_HEX.wild, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{player.hand.wild}</span>
              </div>
            )}
            {totalCards(player.hand) === 0 && (
              <span style={{ fontSize: 11, color: 'rgba(238,242,255,0.25)', fontFamily: "'Nunito', sans-serif" }}>Geen kaarten</span>
            )}
          </div>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 6 }}>
          {waitingFor ? (
            <div style={{ flex: 1, textAlign: 'center', padding: '8px', fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.4)' }}>
              Wachten op {waitingFor}...
            </div>
          ) : isSecondDraw ? (
            <div style={{ flex: 1, textAlign: 'center', padding: '8px', fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(66,133,244,0.7)' }}>
              Trek nog 1 kaart
            </div>
          ) : !isMyTurn ? (
            <div style={{ flex: 1, textAlign: 'center', padding: '8px', fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.4)' }}>
              {vsAI && cp === 1 ? 'AI speelt...' : `Wachten op ${gs.players[cp]?.name}...`}
            </div>
          ) : (
            <>
              <div style={{
                flex: 1, borderRadius: 10, cursor: 'default',
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12,
                padding: '9px 0', textAlign: 'center',
                background: claimableRoutes.length > 0 ? 'rgba(66,133,244,0.12)' : 'rgba(255,255,255,0.04)',
                color: claimableRoutes.length > 0 ? '#4285F4' : 'rgba(238,242,255,0.2)',
                border: `1px solid ${claimableRoutes.length > 0 ? 'rgba(66,133,244,0.35)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {claimableRoutes.length > 0 ? `${claimableRoutes.length} routes beschikbaar` : 'Geen routes'}
              </div>
              <button
                onClick={() => canDrawTickets && onDrawTickets()}
                disabled={!canDrawTickets}
                style={{
                  flex: 1, borderRadius: 10,
                  cursor: canDrawTickets ? 'pointer' : 'not-allowed',
                  fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12,
                  padding: '9px 0',
                  background: canDrawTickets ? 'rgba(32,217,160,0.1)' : 'rgba(255,255,255,0.04)',
                  color: canDrawTickets ? '#20D9A0' : 'rgba(238,242,255,0.2)',
                  border: `1px solid ${canDrawTickets ? 'rgba(32,217,160,0.35)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                Tickets ({gs.ticketDeck.length})
              </button>
            </>
          )}
        </div>

        {/* My tickets */}
        {player.tickets.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {player.tickets.map(t => (
              <TicketCard key={t.id} ticket={t} completed={areConnected(gs.routes, myPlayerIndex, t.from, t.to)} small />
            ))}
          </div>
        )}

        {/* Turn timer */}
        {timeLeft !== null && timeLeft !== undefined && gameMode && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
            <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={isMyTurn} accent="#4285F4" />
          </div>
        )}
      </div>

      {/* Log */}
      <div style={{
        background: 'rgba(4,8,20,0.7)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '6px 10px',
      }}>
        {gs.log.slice(-4).map((msg, i, arr) => (
          <div key={i} style={{
            fontFamily: "'Nunito', sans-serif", fontSize: 10,
            color: i === arr.length - 1 ? 'rgba(238,242,255,0.75)' : 'rgba(238,242,255,0.28)',
            lineHeight: 1.5,
          }}>{msg}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start screen
// ─────────────────────────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: (names: [string, string], vsAI: boolean) => void }) {
  const [name1, setName1] = useState("Robin");
  const [name2, setName2] = useState("Loic");
  const { t } = useLang();

  const inputStyle: React.CSSProperties = {
    background: 'rgba(5,12,30,0.8)', border: '1px solid rgba(66,133,244,0.3)',
    borderRadius: 12, padding: '10px 14px', color: '#EEF2FF',
    fontFamily: "'Nunito', sans-serif", fontSize: 15,
    width: '100%', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #051840 0%, #020C22 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(28px, 7vw, 52px)', fontWeight: 900, letterSpacing: '0.08em', background: 'linear-gradient(160deg, #ffffff 0%, #4285F4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px', lineHeight: 0.95 }}>
          TICKET
        </h1>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(28px, 7vw, 52px)', fontWeight: 900, letterSpacing: '0.08em', color: '#4285F4', margin: '0 0 16px', lineHeight: 0.95 }}>
          TO RIDE
        </h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#4285F4', margin: '0 0 36px' }}>
          Routes · Treinen · Tickets
        </p>
        <div style={{ background: 'rgba(5,12,30,0.6)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '28px 24px', textAlign: 'left' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(66,133,244,0.6)', marginBottom: 6, display: 'block' }}>Speler 1</label>
            <input style={inputStyle} value={name1} onChange={e => setName1(e.target.value)} placeholder="Naam..." />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(66,133,244,0.6)', marginBottom: 6, display: 'block' }}>Speler 2</label>
            <input style={inputStyle} value={name2} onChange={e => setName2(e.target.value)} placeholder="Naam..." />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onStart([name1 || 'Speler 1', name2 || 'Speler 2'], false)} style={{ flex: 1, background: '#4285F4', color: '#1a0d00', border: 'none', borderRadius: 50, padding: '13px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
              2 Spelers
            </button>
            <button onClick={() => onStart([name1 || 'Speler 1', 'AI'], true)} style={{ flex: 1, background: 'rgba(66,133,244,0.12)', color: '#4285F4', border: '1px solid rgba(66,133,244,0.4)', borderRadius: 50, padding: '13px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
              vs AI
            </button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        <BottomNav items={[
          { label: t.home, icon: "home", onClick: () => window.location.href = "/" },
          { label: t.lobby, icon: "lobby", onClick: () => window.location.href = "/lobby?game=ticket-to-ride" },
          { label: t.scores, icon: "scores", onClick: () => window.location.href = "/scores" },
          { label: t.shop, icon: "shop", onClick: () => { window.location.href = "/shop"; } },
        ]} />
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
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [opponentName, setOpponentName] = useState("");
  const [claimModal, setClaimModal] = useState<{ routeId: string; options: ClaimOption[] } | null>(null);
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState(0);
  const [rulesSearch, setRulesSearch] = useState('');
  const [avatarMap, setAvatarMap] = useState<Record<string, string | null>>({});
  const { t } = useLang();

  // Fetch avatarIds for players whenever game state changes
  useEffect(() => {
    if (!gs) return;
    const unknownNames = gs.players
      .map(p => p.name)
      .filter(name => name !== 'AI' && !(name in avatarMap));
    if (unknownNames.length === 0) return;
    unknownNames.forEach(name => {
      setAvatarMap(prev => ({ ...prev, [name]: null }));
      fetch(`/api/avatar?username=${encodeURIComponent(name)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setAvatarMap(prev => ({ ...prev, [name]: d.avatarId ?? null })); })
        .catch(() => {});
    });
  }, [gs?.players.map(p => p.name).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Online room setup
  useEffect(() => {
    if (!roomId) return;
    const pidx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? "0");
    const myName = sessionStorage.getItem("ludoryn-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setLobbyPlayers([myName]);
    setScreenPhase('waiting');
    const socket = getSocket();

    if (aiParam) {
      setVsAI(true);
      setGs(newGame([myName, "AI"]));
      setScreenPhase('playing');
      return;
    }

    const onRoomUpdate = ({ players: names, ready }: { players: string[]; ready: boolean; roomId: string }) => {
      setLobbyPlayers(names);
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

  // ── Waiting screen ──
  if (screenPhase === 'waiting') {
    const myName = sessionStorage.getItem("ludoryn-name") ?? `Speler ${myPlayerIndex + 1}`;
    const players = lobbyPlayers.length > 0 ? lobbyPlayers : [myName];
    return <WaitingScreen roomId={roomId!} players={players} myPlayerIndex={myPlayerIndex} gameType="ticket-to-ride" accent="#4285F4" />;
  }

  // ── Start screen ──
  if (screenPhase === 'start' || !gs) {
    return <StartScreen onStart={(names, ai) => { setVsAI(ai); setMyPlayerIndex(0); setGs(newGame(names)); setScreenPhase('playing'); }} />;
  }

  const showWaiting = roomId && !isMyTurn;
  const cp = gs.currentPlayer;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #051840 0%, #020C22 100%)', paddingBottom: 90 }}>

      {/* Fixed header: player cards */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(8,11,36,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(66,133,244,0.15)',
        padding: '8px 12px',
        display: 'flex', gap: 8,
      }}>
        {gs.players.map((p, i) => (
          <PlayerHeaderCard
            key={i}
            player={p}
            playerIdx={i}
            active={i === cp}
            isMe={i === myPlayerIndex}
            avatarId={avatarMap[p.name]}
          />
        ))}
        {gs.gamePhase === 'final_round' && (
          <div style={{
            flexShrink: 0, alignSelf: 'center',
            fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700,
            color: '#E55A2B', background: 'rgba(229,90,43,0.15)',
            border: '1px solid rgba(229,90,43,0.35)',
            borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap',
          }}>
            Laatste ronde!
          </div>
        )}
        {roomId && gs && (
          <GameControls
            roomId={roomId}
            myName={gs.players[myPlayerIndex]?.name ?? "Speler"}
            playerNames={gs.players.map(p => p.name)}
            gameType="ticket-to-ride"
            isSpectator={isSpectator}
            isGameOver={gs.gamePhase === 'gameover' || forfeitWinner !== null}
            myPlayerIndex={myPlayerIndex}
            accent="#4285F4"
            onResign={!vsAI ? () => getSocket().emit("resign") : undefined}
            inHeader
          />
        )}
        <button onClick={() => setShowRules(true)} style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(238,242,255,0.5)', fontSize: 15, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '72px 12px 12px',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        <GamePanel
          gs={gs}
          myPlayerIndex={myPlayerIndex}
          isMyTurn={isMyTurn}
          vsAI={vsAI && !roomId}
          claimableRoutes={claimableRoutes}
          onRouteClick={handleRouteClick}
          onDrawFaceUp={handleDrawFaceUp}
          onDrawDeck={handleDrawDeck}
          onDrawTickets={handleDrawTickets}
          waitingFor={showWaiting ? (opponentName || gs.players[gs.currentPlayer]?.name) : undefined}
          timeLeft={roomId ? timeLeft : undefined}
          gameMode={roomId ? gameMode : undefined}
        />
      </div>

      {/* Bottom nav */}
      <BottomNav items={[
        { label: t.home, icon: "home", active: false, onClick: () => router.push("/") },
        { label: t.lobby, icon: "lobby", active: false, onClick: () => router.push("/lobby?game=ticket-to-ride") },
        { label: t.scores, icon: "scores", active: false, onClick: () => router.push("/scores") },
        { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
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

      {/* Forfeit screen */}
      {forfeitWinner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,5,20,0.92)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 300 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(238,242,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: '#EEF2FF' }}>Tijd verstreken!</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: 'rgba(238,242,255,0.5)' }}>{forfeitWinner} wint door beurt-timeout</div>
          <button onClick={() => router.push('/lobby?game=ticket-to-ride')} style={{ marginTop: 12, padding: '12px 32px', borderRadius: 50, border: 'none', background: '#4285F4', color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Terug naar lobby
          </button>
        </div>
      )}

      {/* Final scores */}
      {gs.gamePhase === 'gameover' && gs.finalScores && (
        <ScoreScreen gs={gs} onRestart={() => { setGs(null); setVsAI(false); setScreenPhase('start'); setClaimModal(null); }} />
      )}

      {/* Spelregels */}
      {(() => {
        const RULES = t.ttrRules;
        const filtered = rulesSearch.trim()
          ? RULES.filter(([, title, text]) =>
              title.toLowerCase().includes(rulesSearch.toLowerCase()) ||
              text.toLowerCase().includes(rulesSearch.toLowerCase()))
          : null;
        return (
          <BottomSheet
            isOpen={showRules}
            onClose={() => { setShowRules(false); setRulesSearch(''); setActiveRuleTab(0); }}
            sheetStyle={{ background: '#020C22', border: '1px solid rgba(66,133,244,0.2)', borderRadius: '24px 24px 0 0' }}
          >
            {(close) => (<>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div style={{ padding: '8px 20px 0', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: '#4285F4', marginBottom: 12 }}>{t.gameRules('Treinreis')}</div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45, pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="#EEF2FF" strokeWidth="2"/>
                    <path d="M14 14l3.5 3.5" stroke="#EEF2FF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input value={rulesSearch} onChange={e => setRulesSearch(e.target.value)} placeholder={t.searchPlaceholder}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(66,133,244,0.2)', borderRadius: 12, padding: '9px 14px 9px 36px', color: '#EEF2FF', fontFamily: "'Nunito', sans-serif", fontSize: 13, outline: 'none' }} />
                  {rulesSearch && <button onClick={() => setRulesSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(238,242,255,0.4)', fontSize: 16, lineHeight: 1 }}>×</button>}
                </div>
                {!filtered && (
                  <div style={{ position: 'relative', margin: '0 -20px' }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, paddingTop: 4, paddingLeft: 20, paddingRight: 20, scrollbarWidth: 'none', maskImage: 'linear-gradient(to right, transparent 0px, black 56px, black calc(100% - 56px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 56px, black calc(100% - 56px), transparent 100%)' }}>
                      {RULES.map(([icon, title], i) => (
                        <button key={title} onClick={() => setActiveRuleTab(i)} style={{ flexShrink: 0, padding: '5px 13px', borderRadius: 50, border: 'none', background: activeRuleTab === i ? '#4285F4' : 'transparent', outline: activeRuleTab === i ? 'none' : '1px solid rgba(66,133,244,0.25)', color: activeRuleTab === i ? '#EEF2FF' : 'rgba(66,133,244,0.85)', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                        <div key={title} style={{ marginBottom: 12, padding: '14px 16px', background: 'rgba(66,133,244,0.07)', border: '1px solid rgba(66,133,244,0.18)', borderRadius: 14 }}>
                          <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, color: '#4285F4', marginBottom: 5 }}>{icon} {title}</div>
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
                            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 26, color: '#4285F4', marginBottom: 12, textAlign: 'center' }}>{title}</div>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: 'rgba(238,242,255,0.85)', lineHeight: 1.75, textAlign: 'center' }}>{text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0', flexShrink: 0 }}>
                      {RULES.map((_, di) => (
                        <div key={di} onClick={() => setActiveRuleTab(di)} style={{ width: di === activeRuleTab ? 20 : 7, height: 7, borderRadius: 4, background: di === activeRuleTab ? '#4285F4' : 'rgba(255,255,255,0.18)', transition: 'all 0.2s', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!filtered && (
                <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setActiveRuleTab(i => Math.max(0, i - 1))} disabled={activeRuleTab === 0} style={{ flex: 1, padding: '11px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: activeRuleTab === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(238,242,255,0.7)', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, cursor: activeRuleTab === 0 ? 'default' : 'pointer' }}>{t.previous}</button>
                  <button onClick={() => activeRuleTab < RULES.length - 1 ? setActiveRuleTab(i => i + 1) : close()} style={{ flex: 2, padding: '11px', borderRadius: 50, border: 'none', background: '#4285F4', color: '#EEF2FF', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 0 #1557C0' }}>{activeRuleTab < RULES.length - 1 ? t.nextBtn : t.closeConfirm}</button>
                </div>
              )}
              {filtered && (
                <div style={{ padding: '12px 20px 20px', flexShrink: 0 }}>
                  <button onClick={close} style={{ width: '100%', padding: '11px', borderRadius: 50, border: 'none', background: '#4285F4', color: '#EEF2FF', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #1557C0' }}>{t.closeBtn}</button>
                </div>
              )}
            </>)}
          </BottomSheet>
        );
      })()}
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

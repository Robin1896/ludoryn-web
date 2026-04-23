"use client";

import Image from "next/image";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PNG-first helpers — laad PNG als die bestaat, anders SVG fallback
// ─────────────────────────────────────────────────────────────────────────────

// Banner (16:7-ish ratio, bijv. 340×162) — gebruikt in lobby-header en game-tiles
function ArtWithImage({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactElement }) {
  const [err, setErr] = useState(false);
  if (err) return fallback;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Image
        src={src}
        alt={alt}
        fill
        style={{ objectFit: "cover" }}
        onError={() => setErr(true)}
        priority
      />
    </div>
  );
}

const GAME_EMOJIS: Record<string, string> = {
  grub:            "🎲",
  catan:           "🏝",
  "ticket-to-ride":"🚂",
  carcassonne:     "🏰",
  beverbende:      "🦫",
  placeholder:     "🎮",
};

// Vierkant icoon (44×44 in TableCard, schaalbaar)
export function GameIcon({ gameId, size = 44 }: { gameId: string; size?: number }) {
  const [err, setErr] = useState(false);
  const emoji = GAME_EMOJIS[gameId] ?? "🎮";
  if (err) {
    return <span style={{ fontSize: size * 0.48, lineHeight: 1 }}>{emoji}</span>;
  }
  return (
    <Image
      src={`/images/games/${gameId}-icon.png`}
      alt={gameId}
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: Math.round(size * 0.2) }}
      onError={() => setErr(true)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared game art SVG components (fallback als PNG ontbreekt)
// Each accepts a `uid` prop so gradient IDs don't clash when used multiple times
// ─────────────────────────────────────────────────────────────────────────────

function hexPoints(cx: number, cy: number, r = 25) {
  const h = r * 0.866;
  return `${cx},${cy - r} ${cx + h},${cy - r * 0.5} ${cx + h},${cy + r * 0.5} ${cx},${cy + r} ${cx - h},${cy + r * 0.5} ${cx - h},${cy - r * 0.5}`;
}

function DieFace({ cx, cy, face, rotation = 0, size = 48 }: {
  cx: number; cy: number; face: number; rotation?: number; size?: number;
}) {
  const half = size / 2;
  const sp = size * 0.23;
  const pr = size * 0.1;
  const rnd = size * 0.2;
  const pipMap: [number, number][][] = [
    [],
    [[0, 0]],
    [[-1, -1], [1, 1]],
    [[-1, -1], [0, 0], [1, 1]],
    [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  ];
  const pips = face >= 1 && face <= 6 ? pipMap[face] : [];
  return (
    <g transform={`rotate(${rotation} ${cx} ${cy})`}>
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={rnd} fill="#F5F0E4" />
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={rnd} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1.5" />
      {pips.map(([dx, dy], i) => (
        <circle key={i} cx={cx + dx * sp} cy={cy + dy * sp} r={pr} fill="#1A1A2E" />
      ))}
    </g>
  );
}

function WormDie({ cx, cy, rotation = 0, size = 48 }: { cx: number; cy: number; rotation?: number; size?: number }) {
  const half = size / 2;
  return (
    <g transform={`rotate(${rotation} ${cx} ${cy})`}>
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={size * 0.2} fill="#20D9A0" />
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={size * 0.2} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
      <text x={cx} y={cy + size * 0.13} textAnchor="middle" dominantBaseline="middle" fill="#052e16" fontSize={size * 0.52} fontFamily="'Fredoka', sans-serif" fontWeight="700">W</text>
    </g>
  );
}

const HEXES = [
  { cx: 170, cy: 82,   fill: "#9B7B4E" },
  { cx: 170, cy: 37,   fill: "#D4A020" },
  { cx: 209, cy: 59.5, fill: "#1B6B3A" },
  { cx: 209, cy: 104.5,fill: "#52606E" },
  { cx: 170, cy: 127,  fill: "#4EA660" },
  { cx: 131, cy: 104.5,fill: "#C24012" },
  { cx: 131, cy: 59.5, fill: "#DBA830" },
];

const HEX_TOKENS = [
  { cx: 170, cy: 37,   n: "9"  },
  { cx: 209, cy: 59.5, n: "6"  },
  { cx: 209, cy: 104.5,n: "11" },
  { cx: 170, cy: 127,  n: "4"  },
  { cx: 131, cy: 104.5,n: "8"  },
  { cx: 131, cy: 59.5, n: "3"  },
];

export function CatanArt({ uid = "a" }: { uid?: string }) {
  return (
    <svg viewBox="0 0 340 162" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
      <defs>
        <radialGradient id={`cBg${uid}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0E2040" />
          <stop offset="100%" stopColor="#050E22" />
        </radialGradient>
        <radialGradient id={`cGl${uid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FF9A3C" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FF9A3C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cFB${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#11163A" stopOpacity="0" />
          <stop offset="100%" stopColor="#11163A" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="340" height="162" fill={`url(#cBg${uid})`} />
      {([22, 62, 110, 148] as const).map((y) => (
        <ellipse key={y} cx="170" cy={y} rx="165" ry="10" fill="none" stroke="rgba(80,140,255,0.04)" strokeWidth="14" />
      ))}
      <ellipse cx="170" cy="82" rx="90" ry="55" fill={`url(#cGl${uid})`} />
      {HEXES.map((h, i) => (
        <polygon key={i} points={hexPoints(h.cx, h.cy)} fill={h.fill} stroke="#080B24" strokeWidth="3.5" />
      ))}
      {HEX_TOKENS.map(({ cx, cy, n }) => (
        <g key={n + cx}>
          <circle cx={cx} cy={cy} r="9" fill="#F5EDD4" opacity="0.88" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fontWeight="bold" fill={n === "6" || n === "8" ? "#C0202A" : "#2A1A08"} fontFamily="serif">{n}</text>
        </g>
      ))}
      <rect y="90" width="340" height="72" fill={`url(#cFB${uid})`} />
    </svg>
  );
}

const BG_TILES = [
  { x: 36,  y: 26,  v: "21", r: -12 },
  { x: 288, y: 20,  v: "36", r:   8 },
  { x: 312, y: 128, v: "28", r:  -5 },
  { x: 18,  y: 132, v: "33", r:  15 },
  { x: 180, y: 148, v: "25", r:   6 },
];

export function GrubArt({ uid = "a" }: { uid?: string }) {
  return (
    <svg viewBox="0 0 340 162" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
      <defs>
        <radialGradient id={`rwBg${uid}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0B1F14" />
          <stop offset="100%" stopColor="#04100A" />
        </radialGradient>
        <radialGradient id={`rwGl${uid}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#20D9A0" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#20D9A0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`rwFB${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#11163A" stopOpacity="0" />
          <stop offset="100%" stopColor="#11163A" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="340" height="162" fill={`url(#rwBg${uid})`} />
      <ellipse cx="170" cy="82" rx="145" ry="72" fill={`url(#rwGl${uid})`} />
      {BG_TILES.map((t) => (
        <g key={t.v} transform={`rotate(${t.r} ${t.x} ${t.y})`} opacity="0.32">
          <rect x={t.x - 20} y={t.y - 15} width="40" height="30" rx="5" fill="#112211" stroke="#20D9A0" strokeWidth="1" strokeOpacity="0.5" />
          <text x={t.x} y={t.y + 5} textAnchor="middle" fill="#20D9A0" fontSize="12" fontFamily="'DM Mono', monospace" fontWeight="500" fillOpacity="0.7">{t.v}</text>
        </g>
      ))}
      <DieFace cx={82}  cy={80} face={5} rotation={-16} size={54} />
      <DieFace cx={170} cy={70} face={3} rotation={9}   size={50} />
      <WormDie cx={255} cy={82} rotation={-7} size={52} />
      <DieFace cx={170} cy={138} face={6} rotation={15} size={40} />
      <rect y="90" width="340" height="72" fill={`url(#rwFB${uid})`} />
    </svg>
  );
}

const STARS = [
  { x: 28,  y: 18,  r: 1.5, o: 0.60 }, { x: 82,  y: 42,  r: 1.0, o: 0.45 },
  { x: 143, y: 14,  r: 2.0, o: 0.70 }, { x: 198, y: 28,  r: 1.5, o: 0.55 },
  { x: 262, y: 16,  r: 1.0, o: 0.50 }, { x: 312, y: 38,  r: 2.0, o: 0.65 },
  { x: 48,  y: 78,  r: 1.0, o: 0.40 }, { x: 168, y: 55,  r: 1.5, o: 0.60 },
  { x: 292, y: 72,  r: 1.0, o: 0.45 }, { x: 15,  y: 108, r: 1.5, o: 0.50 },
  { x: 320, y: 115, r: 1.0, o: 0.55 }, { x: 118, y: 140, r: 1.0, o: 0.40 },
  { x: 228, y: 132, r: 2.0, o: 0.70 }, { x: 325, y: 148, r: 1.5, o: 0.45 },
  { x: 72,  y: 148, r: 1.0, o: 0.50 },
];

const SPARKLES = [
  { x: 58,  y: 48,  s: 14 },
  { x: 202, y: 76,  s: 18 },
  { x: 292, y: 48,  s: 11 },
  { x: 128, y: 128, s: 15 },
];

export function PlaceholderArt({ uid = "a" }: { uid?: string }) {
  return (
    <svg viewBox="0 0 340 162" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
      <defs>
        <radialGradient id={`phBg${uid}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1C1030" />
          <stop offset="100%" stopColor="#080516" />
        </radialGradient>
        <radialGradient id={`phG1${uid}`} cx="35%" cy="40%" r="45%">
          <stop offset="0%" stopColor="#9C6FFF" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#9C6FFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`phG2${uid}`} cx="72%" cy="65%" r="38%">
          <stop offset="0%" stopColor="#5B7FFF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5B7FFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`phFB${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#11163A" stopOpacity="0" />
          <stop offset="100%" stopColor="#11163A" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="340" height="162" fill={`url(#phBg${uid})`} />
      <rect width="340" height="162" fill={`url(#phG1${uid})`} />
      <rect width="340" height="162" fill={`url(#phG2${uid})`} />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.o} />
      ))}
      {SPARKLES.map((sp, i) => (
        <g key={i} opacity="0.55">
          <line x1={sp.x - sp.s} y1={sp.y} x2={sp.x + sp.s} y2={sp.y} stroke="#9C6FFF" strokeWidth="1.5" />
          <line x1={sp.x} y1={sp.y - sp.s} x2={sp.x} y2={sp.y + sp.s} stroke="#9C6FFF" strokeWidth="1.5" />
          <line x1={sp.x - sp.s * 0.65} y1={sp.y - sp.s * 0.65} x2={sp.x + sp.s * 0.65} y2={sp.y + sp.s * 0.65} stroke="#9C6FFF" strokeWidth="0.8" />
          <line x1={sp.x + sp.s * 0.65} y1={sp.y - sp.s * 0.65} x2={sp.x - sp.s * 0.65} y2={sp.y + sp.s * 0.65} stroke="#9C6FFF" strokeWidth="0.8" />
        </g>
      ))}
      {([{ x: 65, y: 82, r: -16 }, { x: 175, y: 78, r: 0 }, { x: 278, y: 82, r: 13 }] as const).map((c, i) => (
        <g key={i} transform={`rotate(${c.r} ${c.x} ${c.y})`} opacity={0.14 + i * 0.04}>
          <rect x={c.x - 27} y={c.y - 37} width="54" height="74" rx="9" fill="#9C6FFF" />
          <rect x={c.x - 27} y={c.y - 37} width="54" height="74" rx="9" fill="none" stroke="#9C6FFF" strokeWidth="2" strokeOpacity="0.5" />
        </g>
      ))}
      <text x="170" y="94" textAnchor="middle" dominantBaseline="middle" fill="#9C6FFF" fontSize="34" fontFamily="'Fredoka', sans-serif" fontWeight="700" fillOpacity="0.35">?</text>
      <rect y="90" width="340" height="72" fill={`url(#phFB${uid})`} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket to Ride art
// ─────────────────────────────────────────────────────────────────────────────

const TTR_ROUTES = [
  { x1: 75, y1: 75, x2: 70, y2: 135, color: "#9CA3AF" },
  { x1: 75, y1: 75, x2: 265, y2: 198, color: "#F4C430" },
  { x1: 88, y1: 328, x2: 342, y2: 358, color: "#546E7A" },
  { x1: 182, y1: 355, x2: 342, y2: 358, color: "#E53935" },
  { x1: 265, y1: 198, x2: 380, y2: 235, color: "#FB8C00" },
  { x1: 380, y1: 235, x2: 452, y2: 155, color: "#1E88E5" },
  { x1: 452, y1: 155, x2: 534, y2: 175, color: "#546E7A" },
  { x1: 534, y1: 175, x2: 594, y2: 155, color: "#B0BEC5" },
  { x1: 534, y1: 175, x2: 578, y2: 225, color: "#9CA3AF" },
  { x1: 578, y1: 225, x2: 594, y2: 155, color: "#FB8C00" },
  { x1: 464, y1: 292, x2: 482, y2: 365, color: "#9CA3AF" },
  { x1: 482, y1: 365, x2: 524, y2: 442, color: "#1E88E5" },
];

const TTR_CITIES_ART = [
  { x: 75, y: 75 }, { x: 452, y: 155 }, { x: 594, y: 155 },
  { x: 265, y: 198 }, { x: 380, y: 235 }, { x: 88, y: 328 },
  { x: 482, y: 365 }, { x: 524, y: 442 },
];

export function TicketToRideArt({ uid = "a" }: { uid?: string }) {
  // Scale from 640x490 to 340x162
  const scaleX = 340 / 640;
  const scaleY = 162 / 490;

  return (
    <svg viewBox="0 0 340 162" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
      <defs>
        <radialGradient id={`ttrBg${uid}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1a0f06" />
          <stop offset="100%" stopColor="#0d0804" />
        </radialGradient>
        <radialGradient id={`ttrGl${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#E8B56D" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#E8B56D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ttrFB${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#11163A" stopOpacity="0" />
          <stop offset="100%" stopColor="#11163A" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="340" height="162" fill={`url(#ttrBg${uid})`} />
      <rect width="340" height="162" fill={`url(#ttrGl${uid})`} />

      {/* Routes as train tracks */}
      {TTR_ROUTES.map((r, i) => (
        <line
          key={i}
          x1={r.x1 * scaleX}
          y1={r.y1 * scaleY}
          x2={r.x2 * scaleX}
          y2={r.y2 * scaleY}
          stroke={r.color}
          strokeWidth="3"
          strokeOpacity="0.45"
          strokeLinecap="round"
          strokeDasharray="5 4"
        />
      ))}

      {/* City dots */}
      {TTR_CITIES_ART.map((c, i) => (
        <circle key={i} cx={c.x * scaleX} cy={c.y * scaleY} r="3.5" fill="#E8B56D" opacity="0.65" />
      ))}

      {/* Train car silhouette in center */}
      <g transform="translate(140, 68)" opacity="0.35">
        <rect x="0" y="5" width="60" height="18" rx="4" fill="#E8B56D" />
        <rect x="4" y="8" width="14" height="12" rx="2" fill="#0d0804" />
        <rect x="22" y="8" width="14" height="12" rx="2" fill="#0d0804" />
        <rect x="40" y="8" width="14" height="12" rx="2" fill="#0d0804" />
        <circle cx="12" cy="24" r="4" fill="#E8B56D" stroke="#0d0804" strokeWidth="1.5" />
        <circle cx="48" cy="24" r="4" fill="#E8B56D" stroke="#0d0804" strokeWidth="1.5" />
        {/* Chimney */}
        <rect x="52" y="0" width="8" height="8" rx="1" fill="#E8B56D" />
      </g>

      <rect y="90" width="340" height="72" fill={`url(#ttrFB${uid})`} />
    </svg>
  );
}

export function CarcassonneArt({ uid = "a" }: { uid?: string }) {
  // Colors matching the actual game tile renderer
  const CF = '#4f8c40'; // field green
  const CC = '#c4a050'; // city gold
  const CW = '#7a5010'; // city wall border
  const CR = '#a09870'; // road surface
  const CRH = '#d8ceb8'; // road highlight
  const CK = '#eada80'; // cloister
  const T = 60;          // tile size in banner
  const CI = Math.round(T * 0.27); // city band depth ~16

  // Draw a single tile inline as SVG group elements
  // Tile 1: NE corner city (N+E connected)
  // Tile 2: Straight road N-S
  // Tile 3: City on N+E+W (3 sides, connected)
  // Tile 4: Cloister
  // Layout: 2x2 grid starting at x=170, y=14, gap=4
  const tx = [170, 234, 170, 234];
  const ty = [14,  14,  78,  78 ];

  return (
    <svg viewBox="0 0 340 162" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
      <defs>
        <radialGradient id={`caBg${uid}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0C1A08" />
          <stop offset="100%" stopColor="#060C03" />
        </radialGradient>
        <linearGradient id={`caFB${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060C03" stopOpacity="0" />
          <stop offset="100%" stopColor="#060C03" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="340" height="162" fill={`url(#caBg${uid})`} />

      {/* ── Tile 1: NE corner city (N+E connected) ── */}
      <g transform={`translate(${tx[0]},${ty[0]})`} opacity="0.92">
        <rect width={T} height={T} fill={CF} />
        <rect width={T} height={T} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={T*0.06} />
        {/* NE corner + N strip + E strip */}
        <rect x={T-CI} y={0} width={CI} height={CI} fill={CC} />
        <rect x={CI} y={0} width={T-2*CI} height={CI} fill={CC} />
        <rect x={T-CI} y={CI} width={CI} height={T-2*CI} fill={CC} />
        {/* Wall lines */}
        <line x1={CI} y1={CI} x2={T} y2={CI} stroke={CW} strokeWidth={1.2} />
        <line x1={T-CI} y1={0} x2={T-CI} y2={T-CI} stroke={CW} strokeWidth={1.2} />
        <line x1={CI} y1={0} x2={CI} y2={CI} stroke={CW} strokeWidth={1} />
        <line x1={T} y1={T-CI} x2={T-CI} y2={T-CI} stroke={CW} strokeWidth={1} />
      </g>

      {/* ── Tile 2: Straight road N-S ── */}
      <g transform={`translate(${tx[1]},${ty[1]})`} opacity="0.92">
        <rect width={T} height={T} fill={CF} />
        <rect width={T} height={T} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={T*0.06} />
        <path d={`M${T/2},0 L${T/2},${T}`} stroke={CR} strokeWidth={T*0.13} strokeLinecap="round" fill="none" />
        <path d={`M${T/2},0 L${T/2},${T}`} stroke={CRH} strokeWidth={T*0.047} strokeLinecap="round" fill="none" />
      </g>

      {/* ── Tile 3: City N+E+W (3 sides, all connected through center) ── */}
      <g transform={`translate(${tx[2]},${ty[2]})`} opacity="0.92">
        <rect width={T} height={T} fill={CF} />
        <rect width={T} height={T} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={T*0.06} />
        {/* Corners NW+NE */}
        <rect x={0} y={0} width={CI} height={CI} fill={CC} />
        <rect x={T-CI} y={0} width={CI} height={CI} fill={CC} />
        {/* N strip */}
        <rect x={CI} y={0} width={T-2*CI} height={CI} fill={CC} />
        {/* E strip */}
        <rect x={T-CI} y={CI} width={CI} height={T-2*CI} fill={CC} />
        {/* W strip */}
        <rect x={0} y={CI} width={CI} height={T-2*CI} fill={CC} />
        {/* Center fill */}
        <rect x={CI} y={CI} width={T-2*CI} height={T-2*CI} fill={CC} />
        {/* Wall lines */}
        <line x1={0} y1={T-CI} x2={T} y2={T-CI} stroke={CW} strokeWidth={1.2} />
        <line x1={CI} y1={T-CI} x2={CI} y2={T} stroke={CW} strokeWidth={1} />
        <line x1={T-CI} y1={T-CI} x2={T-CI} y2={T} stroke={CW} strokeWidth={1} />
      </g>

      {/* ── Tile 4: Cloister ── */}
      <g transform={`translate(${tx[3]},${ty[3]})`} opacity="0.92">
        <rect width={T} height={T} fill={CF} />
        <rect width={T} height={T} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={T*0.06} />
        {/* Cloister building */}
        {(() => {
          const bw = T*0.3, bh = T*0.24;
          const bx = T/2 - bw/2, by = T/2 - bh*0.3;
          const rh = T*0.16;
          return (
            <g>
              <rect x={bx+1} y={by+1} width={bw} height={bh} fill="rgba(0,0,0,0.2)" rx={1} />
              <rect x={bx} y={by} width={bw} height={bh} fill={CK} stroke="#a08028" strokeWidth={0.8} rx={1} />
              <polygon points={`${bx-2},${by} ${T/2},${by-rh} ${bx+bw+2},${by}`} fill="#c04010" stroke="#882808" strokeWidth={0.6} />
              <rect x={T/2-1} y={by-rh-T*0.04} width={2} height={T*0.08} fill="#e8e0d0" />
              <rect x={T/2-T*0.04} y={by-rh-T*0.008} width={T*0.08} height={2} fill="#e8e0d0" />
            </g>
          );
        })()}
      </g>

      {/* ── Red meeple on tile 1 (city) ── */}
      <g transform={`translate(${tx[0]+T*0.5},${ty[0]+CI*0.5})`} opacity="0.9">
        <ellipse cx={0} cy={7} rx={4.5} ry={1.8} fill="rgba(0,0,0,0.3)" />
        <line x1={-3} y1={3} x2={-3} y2={8} stroke="#E53935" strokeWidth={3} strokeLinecap="round" />
        <line x1={3} y1={3} x2={3} y2={8} stroke="#E53935" strokeWidth={3} strokeLinecap="round" />
        <line x1={-6} y1={0.5} x2={6} y2={0.5} stroke="#E53935" strokeWidth={2.5} strokeLinecap="round" />
        <ellipse cx={0} cy={-1} rx={4} ry={3.2} fill="#E53935" stroke="rgba(0,0,0,0.3)" strokeWidth={0.6} />
        <circle cx={0} cy={-5} r={3.2} fill="#E53935" stroke="rgba(0,0,0,0.3)" strokeWidth={0.6} />
      </g>

      {/* ── Blue meeple on tile 3 (3-city) ── */}
      <g transform={`translate(${tx[2]+T*0.5},${ty[2]+T*0.5})`} opacity="0.9">
        <ellipse cx={0} cy={7} rx={4.5} ry={1.8} fill="rgba(0,0,0,0.3)" />
        <line x1={-3} y1={3} x2={-3} y2={8} stroke="#1565C0" strokeWidth={3} strokeLinecap="round" />
        <line x1={3} y1={3} x2={3} y2={8} stroke="#1565C0" strokeWidth={3} strokeLinecap="round" />
        <line x1={-6} y1={0.5} x2={6} y2={0.5} stroke="#1565C0" strokeWidth={2.5} strokeLinecap="round" />
        <ellipse cx={0} cy={-1} rx={4} ry={3.2} fill="#1565C0" stroke="rgba(0,0,0,0.3)" strokeWidth={0.6} />
        <circle cx={0} cy={-5} r={3.2} fill="#1565C0" stroke="rgba(0,0,0,0.3)" strokeWidth={0.6} />
      </g>

      {/* ── Castle silhouette – left side ── */}
      <g opacity="0.5" transform="translate(14, 8)">
        {/* Left tower */}
        <rect x="0" y="32" width="30" height="55" fill={CC} stroke={CW} strokeWidth="1.5" />
        <rect x="0" y="20" width="8" height="16" fill={CC} stroke={CW} strokeWidth="1" />
        <rect x="11" y="20" width="8" height="16" fill={CC} stroke={CW} strokeWidth="1" />
        <rect x="22" y="20" width="8" height="16" fill={CC} stroke={CW} strokeWidth="1" />
        {/* Right tower */}
        <rect x="96" y="32" width="30" height="55" fill={CC} stroke={CW} strokeWidth="1.5" />
        <rect x="96" y="20" width="8" height="16" fill={CC} stroke={CW} strokeWidth="1" />
        <rect x="107" y="20" width="8" height="16" fill={CC} stroke={CW} strokeWidth="1" />
        <rect x="118" y="20" width="8" height="16" fill={CC} stroke={CW} strokeWidth="1" />
        {/* Connecting wall with battlements */}
        <rect x="30" y="46" width="66" height="41" fill="#b88e40" stroke={CW} strokeWidth="1.5" />
        <rect x="30" y="38" width="8" height="12" fill={CC} stroke={CW} strokeWidth="1" />
        <rect x="48" y="38" width="8" height="12" fill={CC} stroke={CW} strokeWidth="1" />
        <rect x="66" y="38" width="8" height="12" fill={CC} stroke={CW} strokeWidth="1" />
        <rect x="84" y="38" width="12" height="12" fill={CC} stroke={CW} strokeWidth="1" />
        {/* Gate arch */}
        <rect x="52" y="57" width="22" height="30" fill="#060C03" rx="11" />
        {/* Flag */}
        <line x1="63" y1="20" x2="63" y2="46" stroke={CW} strokeWidth="2" />
        <polygon points="63,20 80,26 63,32" fill="#E53935" opacity="0.9" />
      </g>

      <rect y="100" width="340" height="62" fill={`url(#caFB${uid})`} />
    </svg>
  );
}

export function QwixxArt({ uid = "a" }: { uid?: string }) {
  const DICE = [
    { cx: 52,  cy: 75,  face: 3, color: "#FF5C5C",  rot: -14, size: 52 },
    { cx: 118, cy: 62,  face: 5, color: "#FFB830",  rot: 8,   size: 48 },
    { cx: 178, cy: 80,  face: 4, color: "#20D9A0",  rot: -5,  size: 50 },
    { cx: 240, cy: 65,  face: 6, color: "#5B7FFF",  rot: 10,  size: 48 },
    { cx: 298, cy: 78,  face: 2, color: "#F5F0E4",  rot: -8,  size: 44 },
  ];
  return (
    <svg viewBox="0 0 340 162" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
      <defs>
        <radialGradient id={`qxBg${uid}`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1A1230" />
          <stop offset="100%" stopColor="#080B24" />
        </radialGradient>
        <radialGradient id={`qxGl${uid}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFB830" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FFB830" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`qxFB${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#11163A" stopOpacity="0" />
          <stop offset="100%" stopColor="#11163A" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="340" height="162" fill={`url(#qxBg${uid})`} />
      <rect width="340" height="162" fill={`url(#qxGl${uid})`} />

      {/* Row color strips at bottom */}
      <rect x="0" y="142" width="85" height="8" fill="#FF5C5C" opacity="0.35" />
      <rect x="85" y="142" width="85" height="8" fill="#FFB830" opacity="0.35" />
      <rect x="170" y="142" width="85" height="8" fill="#20D9A0" opacity="0.35" />
      <rect x="255" y="142" width="85" height="8" fill="#5B7FFF" opacity="0.35" />

      {/* Dice */}
      {DICE.map((d, idx) => {
        const half = d.size / 2;
        const sp = d.size * 0.23;
        const pr = d.size * 0.1;
        const rnd = d.size * 0.2;
        const isDark = d.color !== '#F5F0E4';
        const pipColor = isDark ? 'rgba(0,0,0,0.7)' : '#1A1A2E';
        const pipMap: [number, number][][] = [
          [],
          [[0, 0]],
          [[-1, -1], [1, 1]],
          [[-1, -1], [0, 0], [1, 1]],
          [[-1, -1], [1, -1], [-1, 1], [1, 1]],
          [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
          [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
        ];
        const pips = d.face >= 1 && d.face <= 6 ? pipMap[d.face] : [];
        return (
          <g key={idx} transform={`rotate(${d.rot} ${d.cx} ${d.cy})`} opacity="0.88">
            <rect x={d.cx - half} y={d.cy - half} width={d.size} height={d.size} rx={rnd} fill={d.color} />
            <rect x={d.cx - half} y={d.cy - half} width={d.size} height={d.size} rx={rnd} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
            {pips.map(([dx, dy], i) => (
              <circle key={i} cx={d.cx + dx * sp} cy={d.cy + dy * sp} r={pr} fill={pipColor} />
            ))}
          </g>
        );
      })}

      <rect y="95" width="340" height="67" fill={`url(#qxFB${uid})`} />
    </svg>
  );
}

export function BeaverbendeArt({ uid = "a" }: { uid?: string }) {
  return (
    <svg viewBox="0 0 340 162" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
      <defs>
        <linearGradient id={`bvBG${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#041E1C" />
          <stop offset="100%" stopColor="#020E0D" />
        </linearGradient>
        <linearGradient id={`bvFB${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#041E1C" />
        </linearGradient>
      </defs>
      <rect width="340" height="162" fill={`url(#bvBG${uid})`} />
      {/* Playing cards scattered */}
      {[
        { x: 30,  y: 20, rot: -18, color: "#2EC4B6", label: "7" },
        { x: 95,  y: 10, rot:  8,  color: "#FF5C5C", label: "♥" },
        { x: 155, y: 25, rot: -5,  color: "#2EC4B6", label: "3" },
        { x: 215, y: 15, rot: 14,  color: "#FF5C5C", label: "♠" },
        { x: 270, y: 22, rot: -10, color: "#2EC4B6", label: "0" },
        { x: 65,  y: 72, rot:  12, color: "#FFB830", label: "?" },
        { x: 185, y: 68, rot: -14, color: "#FF5C5C", label: "?" },
        { x: 300, y: 65, rot:  6,  color: "#FFB830", label: "?" },
      ].map((c, i) => (
        <g key={i} transform={`translate(${c.x},${c.y}) rotate(${c.rot})`} opacity="0.88">
          <rect width="34" height="48" rx="5" fill="#1C2820" stroke={c.color} strokeWidth="1.5" />
          <text x="17" y="30" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="700" fill={c.color} fontFamily="sans-serif">{c.label}</text>
        </g>
      ))}
      {/* Face-down cards in a row */}
      {[50, 105, 160, 215].map((x, i) => (
        <g key={`fd${i}`} transform={`translate(${x}, 95)`} opacity="0.6">
          <rect width="38" height="54" rx="6" fill="#0D2422" stroke="rgba(46,196,182,0.35)" strokeWidth="1.5" />
          <rect x="4" y="4" width="30" height="46" rx="4" fill="none" stroke="rgba(46,196,182,0.2)" strokeWidth="1" />
          <path d="M12 27 L19 18 L26 27 L19 36 Z" fill="none" stroke="rgba(46,196,182,0.4)" strokeWidth="1.2" />
        </g>
      ))}
      <rect y="90" width="340" height="72" fill={`url(#bvFB${uid})`} />
    </svg>
  );
}

function RummikubArt({ uid = 'rum' }: { uid?: string }) {
  const tiles = [
    { x: 8,  y: 12, color: '#E53935', num: '7' },
    { x: 32, y: 12, color: '#2196F3', num: '7' },
    { x: 56, y: 12, color: '#FFC107', num: '7' },
    { x: 8,  y: 54, color: '#E53935', num: '4' },
    { x: 32, y: 54, color: '#E53935', num: '5' },
    { x: 56, y: 54, color: '#E53935', num: '6' },
  ];
  return (
    <svg viewBox="0 0 100 100" width="100" height="100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#3a1a0a" />
          <stop offset="100%" stopColor="#1a0a05" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}-bg)`} />
      {tiles.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width="22" height="32" rx="4"
            fill={t.color + '22'} stroke={t.color} strokeWidth="1.5" strokeOpacity="0.7" />
          <text x={t.x + 11} y={t.y + 21} textAnchor="middle"
            fontSize="13" fontWeight="700" fill={t.color} fontFamily="sans-serif">
            {t.num}
          </text>
        </g>
      ))}
    </svg>
  );
}

export const GAME_ART: Record<string, (props: { uid?: string }) => React.ReactElement> = {
  catan:            (p) => <ArtWithImage src="/images/games/catan-banner.png"           alt="Catan"           fallback={<CatanArt {...p} />} />,
  grub:             (p) => <ArtWithImage src="/images/games/grub-banner.png"            alt="Regenwormen"     fallback={<GrubArt {...p} />} />,
  qwixx:            (p) => <ArtWithImage src="/images/games/qwixx-banner.png"           alt="Qwixx"           fallback={<QwixxArt {...p} />} />,
  "ticket-to-ride": (p) => <ArtWithImage src="/images/games/ticket-to-ride-banner.png" alt="Ticket to Ride"  fallback={<TicketToRideArt {...p} />} />,
  carcassonne:      (p) => <ArtWithImage src="/images/games/carcassonne-banner.png"     alt="Carcassonne"     fallback={<CarcassonneArt {...p} />} />,
  beverbende:       (p) => <ArtWithImage src="/images/games/beverbende-banner.png"      alt="Beverbende"      fallback={<BeaverbendeArt {...p} />} />,
  rummikub:         (p) => <ArtWithImage src="/images/games/rummikub-banner.png"        alt="Rummikub"        fallback={<RummikubArt {...p} />} />,
  wingspan:         (p) => <ArtWithImage src="/images/games/wingspan-banner.png"        alt="Wingspan"        fallback={<PlaceholderArt {...p} />} />,
  placeholder:      (p) => <PlaceholderArt {...p} />,
};

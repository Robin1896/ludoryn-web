'use client';
import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

// ─────────────────────────────────────────────────────────────────────────────
// Bug Icon
// ─────────────────────────────────────────────────────────────────────────────

export function BugIcon({ size = 12, color = '#dc2626' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <ellipse cx="12" cy="14" rx="7" ry="8" fill={color}/>
      <ellipse cx="9.5" cy="10.5" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.25)" transform="rotate(-20 9.5 10.5)"/>
      <line x1="12" y1="6" x2="12" y2="22" stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="8.5" cy="12" r="1.6" fill="rgba(0,0,0,0.5)"/>
      <circle cx="15.5" cy="12" r="1.6" fill="rgba(0,0,0,0.5)"/>
      <circle cx="8.8" cy="17" r="1.4" fill="rgba(0,0,0,0.4)"/>
      <circle cx="15.2" cy="17" r="1.4" fill="rgba(0,0,0,0.4)"/>
      <circle cx="12" cy="5.5" r="3.5" fill="#1a0000"/>
      <circle cx="12" cy="5.5" r="2" fill="#2d0000"/>
      <circle cx="10.2" cy="4.5" r="0.8" fill="#ff6b6b"/>
      <circle cx="13.8" cy="4.5" r="0.8" fill="#ff6b6b"/>
      <line x1="10.5" y1="2.5" x2="7.5" y2="0.5" stroke="#1a0000" strokeWidth="1" strokeLinecap="round"/>
      <line x1="13.5" y1="2.5" x2="16.5" y2="0.5" stroke="#1a0000" strokeWidth="1" strokeLinecap="round"/>
      <circle cx="7.2" cy="0.3" r="0.8" fill="#1a0000"/>
      <circle cx="16.8" cy="0.3" r="0.8" fill="#1a0000"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pip positions (1–6 + worm)
// ─────────────────────────────────────────────────────────────────────────────

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
};

// ─────────────────────────────────────────────────────────────────────────────
// Die background color
// ─────────────────────────────────────────────────────────────────────────────

function getDieBg(color: string | undefined, face: DieFaceValue): string {
  if (face === 'W') return '#2d5c35';
  if (!color) return '#fffdf9';
  return color;
}

// ─────────────────────────────────────────────────────────────────────────────
// DieFace
// ─────────────────────────────────────────────────────────────────────────────

export type DieFaceValue = number | 'W';

type Props = {
  face: DieFaceValue;
  size?: number;
  picked?: boolean;
  pickable?: boolean;
  onClick?: () => void;
  animIndex?: number;
  rolling?: boolean;
  /** Override background color (hex). If provided, disables picked/pickable styling. */
  color?: string;
};

export default function DieFace({
  face,
  size = 44,
  picked = false,
  pickable = false,
  onClick,
  animIndex = 0,
  rolling = false,
  color,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [displayFace, setDisplayFace] = useState<DieFaceValue>(face);
  const ref = useRef<HTMLDivElement>(null);
  const isInteractive = !!onClick;

  // Shuffle face during roll
  useEffect(() => {
    if (!rolling) { setDisplayFace(face); return; }
    let frame = 0;
    const iv = setInterval(() => {
      setDisplayFace(Math.ceil(Math.random() * 5) as number);
      if (++frame > 20) clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, [rolling, face]);

  // GSAP roll animation
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (rolling) {
      gsap.killTweensOf(el);
      const dir = animIndex % 2 === 0 ? -1 : 1;
      const delay = animIndex * 0.07;
      const tl = gsap.timeline({ delay });
      tl.fromTo(el,
        { y: -55, rotation: dir * (80 + animIndex * 12), scaleX: 1, scaleY: 1, opacity: 0 },
        { y: 0, rotation: 0, scaleX: 1.2, scaleY: 0.75, opacity: 1, duration: 0.18, ease: 'power2.in' }
      )
      .to(el, { y: -18, scaleX: 0.92, scaleY: 1.08, rotation: dir * -6, duration: 0.13, ease: 'power2.out' })
      .to(el, { y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 0.1, ease: 'power2.in' });
    } else {
      gsap.to(el, { rotation: 0, scaleX: 1, scaleY: 1, duration: 0.2, ease: 'back.out(2)' });
    }
  }, [rolling, animIndex]);

  // Pick animation
  useEffect(() => {
    const el = ref.current;
    if (!el || rolling) return;
    if (picked) {
      gsap.fromTo(el, { scale: 0.85, y: 6 }, { scale: 1, y: 0, duration: 0.3, ease: 'back.out(2.5)' });
    }
  }, [picked, rolling]);

  const shadow = picked
    ? `0 0 0 2px var(--accent-alt)`
    : pickable
      ? `0 0 0 1px var(--border-hover)${hovered ? ', 0 0 0 2px var(--accent)' : ''}`
      : '0 1px 3px rgba(26,29,46,0.12)';

  const pipColor = displayFace === 'W'
    ? 'rgba(255,255,255,0.9)'
    : '#1a1d2e';

  const dieBg = getDieBg(color, displayFace);
  const borderRadius = 0;

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size, height: size,
        borderRadius: 0,
        background: dieBg,
        border: `1px solid ${picked ? 'var(--accent-alt)' : 'var(--border)'}`,
        boxShadow: shadow,
        cursor: isInteractive ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transform: hovered && isInteractive && !rolling ? 'translateY(-2px) scale(1.05)' : 'scale(1)',
        transition: 'box-shadow 0.15s',
        position: 'relative',
        userSelect: 'none',
        willChange: 'transform',
      }}
    >
      {/* Content (pips or worm icon) */}
      {displayFace === 'W' ? (
        <BugIcon size={Math.round(size * 0.58)} color={picked ? '#fca5a5' : '#ef4444'} />
      ) : (
        <svg
          width={size * 0.76}
          height={size * 0.76}
          viewBox="0 0 100 100"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {(PIP_POSITIONS[typeof displayFace === 'number' ? displayFace : 1] ?? []).map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r="10" fill={pipColor} />
          ))}
        </svg>
      )}
    </div>
  );
}

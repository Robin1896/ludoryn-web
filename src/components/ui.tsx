"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { playClick, playPress, playTick, playNav } from "@/lib/sound";
import { getSocket } from "@/lib/socket";
import BottomSheet from "@/components/BottomSheet";
import { useLang } from "@/lib/lang";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (defaults — override via props)
// ─────────────────────────────────────────────────────────────────────────────
export const UI_BG     = "var(--bg)";
export const UI_CARD   = "var(--card)";
export const UI_CARD2  = "var(--card2)";
export const UI_BORDER = "var(--border)";
export const UI_ACCENT = "var(--accent)";
export const UI_GREEN  = "#00C875";
export const UI_RED    = "#FF5252";
export const UI_AMBER  = "#FFCA28";

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 16, radius = 8, style }: {
  width?: number | string; height?: number | string; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "linear-gradient(90deg, var(--card2) 25%, var(--surface2, var(--card)) 50%, var(--card2) 75%)",
      backgroundSize: "200% 100%",
      animation: "skeleton-shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────────────────────
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  accent?: string;
  shadowColor?: string;
  textColor?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  flex?: number | string;
}

export function Button({
  children,
  onClick,
  accent = UI_ACCENT,
  shadowColor: _shadowColor,
  textColor = "#fff",
  disabled,
  fullWidth,
  size = "md",
  variant = "primary",
  flex,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const h   = size === "sm" ? 34 : size === "lg" ? 48 : 40;
  const pad = size === "sm" ? "0 18px" : size === "lg" ? "0 40px" : "0 28px";
  const fs  = size === "sm" ? 11 : size === "lg" ? 13 : 12;

  const isPrimary = variant === "primary";

  const bg    = disabled ? "var(--card2)"
              : isPrimary ? (hovered ? accent : "var(--text)")
              : (hovered ? "var(--text)" : "var(--card)");
  const color = disabled ? "var(--text-faint)"
              : isPrimary ? "var(--bg)"
              : (hovered ? "var(--bg)" : "var(--text)");
  const border = isPrimary && !disabled ? "none" : "1px solid var(--text)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={() => { if (!disabled) playPress(); }}
      onMouseUp={() => { if (!disabled) playClick(); }}
      style={{
        background: bg,
        color,
        border,
        height: h,
        padding: pad,
        borderRadius: 0,
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        fontSize: fs,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s, color 0.15s",
        width: fullWidth ? "100%" : undefined,
        flex,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IconButton — small square tactile button
// ─────────────────────────────────────────────────────────────────────────────
export function IconButton({
  icon,
  onClick,
  accent = UI_ACCENT,
  shadowColor,
  textColor = "#fff",
  size = 52,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  accent?: string;
  shadowColor?: string;
  textColor?: string;
  size?: number;
}) {
  const [pressed, setPressed] = useState(false);
  const shadow = shadowColor ?? darken(accent);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => { setPressed(true); playPress(); }}
      onMouseUp={() => { setPressed(false); playClick(); }}
      onMouseLeave={() => setPressed(false)}
      style={{
        width: size, height: size, borderRadius: 0, border: "none",
        background: accent, color: textColor, fontSize: size * 0.38,
        cursor: "pointer",
        boxShadow: pressed ? `0 2px 0 ${shadow}` : `0 0 16px ${accent}44, 0 5px 0 ${shadow}`,
        transform: pressed ? "translateY(3px)" : "translateY(0)",
        transition: "transform 0.1s, box-shadow 0.1s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────
export function Avatar({
  name,
  color = UI_ACCENT,
  size = 40,
  online,
  avatarId: _avatarId,
}: {
  name: string;
  color?: string;
  size?: number;
  online?: "green" | "grey";
  /** @deprecated — no longer used; kept for backwards compatibility */
  avatarId?: string | null;
}) {
  return (
    <div style={{ position: "relative", flexShrink: 0, display: "inline-flex" }}>
      <div style={{
        width: size, height: size, borderRadius: 0, background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.38, fontWeight: 600, color: "#fff",
        fontFamily: "var(--font-body)",
      }}>
        {name?.[0]?.toUpperCase() ?? "?"}
      </div>
      {online && (
        <span style={{
          position: "absolute", bottom: -3, right: -3,
          width: 8, height: 8,
          borderRadius: "50%",
          background: online === "green" ? "#2d7a3a" : "#a0a0a0",
          border: `2px solid var(--bg)`,
        }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GamePlayerCard — shared player card for game headers
// ─────────────────────────────────────────────────────────────────────────────
export function GamePlayerCard({
  name,
  active,
  accent,
  scoreLabel,
  children,
  avatarId: _avatarId,
}: {
  name: string;
  active: boolean;
  accent: string;
  scoreLabel: ReactNode;
  children?: ReactNode;
  /** @deprecated — no longer used; kept for backwards compatibility */
  avatarId?: string | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current && cardRef.current) {
      // Dynamic import to avoid bundling gsap in ui.tsx
      import("gsap").then(({ gsap }) => {
        gsap.fromTo(cardRef.current!, { scale: 0.95 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
      });
    }
    wasActive.current = active;
  }, [active]);

  return (
    <div ref={cardRef} style={{
      flex: 1, minWidth: 0,
      background: active
        ? `linear-gradient(135deg, ${accent}1E, ${accent}0D)`
        : "var(--card)",
      border: `1.5px solid ${active ? accent + "66" : "var(--border)"}`,
      borderRadius: 0,
      padding: "7px 10px",
      display: "flex", alignItems: "center", gap: 8,
      transition: "all 0.2s",
      boxShadow: active ? `0 0 20px ${accent}1A` : "none",
    }}>
      <div style={{ flexShrink: 0 }}>
        <Avatar name={name} size={30} color={active ? accent : "var(--text-faint)"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-body)", fontWeight: 800, fontSize: 11,
          color: active ? "var(--text)" : "var(--text-faint)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: 1.2,
        }}>{name}</div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: active ? accent : "var(--text-faint)",
          marginTop: 2, display: "flex", alignItems: "center",
        }}>{scoreLabel}</div>
      </div>
      {children}
      {active && (
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: accent,
          boxShadow: `0 0 8px ${accent}`,
          flexShrink: 0,
        }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle
// ─────────────────────────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  accent = UI_ACCENT,
}: {
  checked: boolean;
  onChange: () => void;
  accent?: string;
}) {
  return (
    <div
      onClick={() => { playTick(); onChange(); }}
      style={{
        width: 52, height: 28, borderRadius: 0,
        background: checked ? accent : "var(--card2)",
        cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: checked ? 27 : 3,
        width: 22, height: 22, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlayerDots
// ─────────────────────────────────────────────────────────────────────────────
export function PlayerDots({
  filled,
  total,
  accent = UI_ACCENT,
}: {
  filled: number;
  total: number;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i < filled ? accent : "var(--border)",
          boxShadow: i < filled ? `0 0 6px ${accent}88` : "none",
          transition: "background 0.25s ease, box-shadow 0.25s ease",
          animation: i < filled ? `dot-appear 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms both` : "none",
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
export function StatusBadge({
  label,
  color = UI_ACCENT,
  variant = "subtle",
}: {
  label: string;
  color?: string;
  variant?: "subtle" | "solid" | "outline";
}) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    subtle:  { background: `${color}22`, color, border: "none" },
    solid:   { background: color, color: "#fff", border: "none" },
    outline: { background: "transparent", color, border: `1px solid ${color}66` },
  };
  return (
    <span style={{
      fontFamily: "var(--font-body)",
      fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 0,
      letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap",
      ...styles[variant],
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TableCard — lobby table row
// ─────────────────────────────────────────────────────────────────────────────
export function TableCard({
  icon, title, subtitle, badge,
  filled, total, isFull, onJoin, onLeave,
  player1, player2,
  accent = UI_ACCENT,
  card2 = UI_CARD2,
  border = UI_BORDER,
}: {
  icon: string; title: string; subtitle: string; badge?: string;
  filled: number; total: number; isFull: boolean;
  onJoin: () => void;
  onLeave?: () => void;
  player1?: string; player2?: string;
  accent?: string; card2?: string; border?: string;
}) {
  const [hover, setHover] = useState(false);
  const { t } = useLang();
  return (
    <div
      onClick={onJoin}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: card2, borderRadius: 0, padding: "14px 16px",
        border: `1.5px solid ${hover ? accent + "77" : border}`,
        boxShadow: hover ? `0 0 20px ${accent}22, 0 4px 16px var(--shadow)` : `0 2px 8px var(--shadow), inset 0 1px 0 ${accent}22`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "border-color 0.18s, box-shadow 0.18s, transform 0.18s",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        animation: "slide-up 0.3s ease both",
        gap: 12, cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        {/* Player avatars or icon */}
        {player1 ? (
          <div style={{ display: "flex", flexShrink: 0 }}>
            <Avatar name={player1} color={`${accent}55`} size={40} />
            {player2 ? (
              <div style={{ marginLeft: -12 }}>
                <Avatar name={player2} color="var(--card2)" size={40} />
              </div>
            ) : (
              <div style={{ marginLeft: -12, width: 40, height: 40, borderRadius: "50%", background: "var(--card2)", border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "var(--text-faint)" }}>?</div>
            )}
          </div>
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 0, background: `${accent}18`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-body)", fontWeight: 800, fontSize: 14, color: "var(--text)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {title}
            {badge && <StatusBadge label={badge} color={accent} />}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isFull ? UI_GREEN : "var(--text)", marginBottom: 4, whiteSpace: "nowrap" }}>
            {isFull ? t.full : `${filled}/${total}`}
          </div>
          <PlayerDots filled={filled} total={total} accent={accent} />
        </div>
        {onLeave ? (
          <button
            onClick={(e) => { e.stopPropagation(); onLeave(); }}
            style={{
              padding: "8px 18px", borderRadius: 0, border: "none",
              fontFamily: "var(--font-body)",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
              background: "rgba(193,74,31,0.1)",
              color: "var(--accent)",
              transition: "background 0.15s, box-shadow 0.15s", whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.boxShadow = "0 0 12px var(--shadow)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(193,74,31,0.1)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {t.leave}
          </button>
        ) : (
          <button
            onClick={isFull ? undefined : (e) => { e.stopPropagation(); onJoin(); }}
            style={{
              padding: "8px 18px", borderRadius: 0, border: "none",
              fontFamily: "var(--font-body)",
              fontWeight: 600, fontSize: 14, cursor: isFull ? "default" : "pointer",
              background: isFull ? "var(--card2)" : `${accent}22`,
              color: isFull ? "var(--text-faint)" : accent,
              transition: "background 0.15s, box-shadow 0.15s", whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { if (!isFull) { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; e.currentTarget.style.boxShadow = `0 0 12px ${accent}44`; } }}
            onMouseLeave={(e) => { if (!isFull) { e.currentTarget.style.background = `${accent}22`; e.currentTarget.style.color = accent; e.currentTarget.style.boxShadow = "none"; } }}
          >
            {isFull ? t.watch : t.join}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTABanner — gradient call-to-action banner
// ─────────────────────────────────────────────────────────────────────────────
export function CTABanner({
  emoji = "🎲",
  title,
  description,
  buttonLabel,
  onButton,
  accent = UI_ACCENT,
  textColor = "#fff",
  bgEnd,
}: {
  emoji?: string;
  title: string;
  description: string;
  buttonLabel: string;
  onButton?: () => void;
  accent?: string;
  textColor?: string;
  bgEnd?: string;
}) {
  const end = bgEnd ?? darken(accent);
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 0, background: `linear-gradient(135deg, ${accent} 0%, ${end} 100%)`, padding: "32px 28px", boxShadow: `0 0 40px ${accent}33` }}>
      <div style={{ position: "absolute", right: -10, bottom: -10, fontSize: 100, opacity: 0.15, pointerEvents: "none" }}>{emoji}</div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24, fontWeight: 700, color: textColor, margin: "0 0 6px" }}>{title}</h3>
        <p style={{ fontFamily: "var(--font-body)", color: `${textColor}99`, fontSize: 14, maxWidth: 280, lineHeight: 1.6, margin: "0 0 20px", fontWeight: 500 }}>{description}</p>
        <button
          onClick={onButton}
          style={{ background: "var(--bg)", color: accent, border: "none", padding: "12px 28px", borderRadius: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification
// ─────────────────────────────────────────────────────────────────────────────
type NotifVariant = "urgent" | "info" | "warning" | "success";

export function Notification({
  variant,
  icon,
  title,
  body,
  action,
  accent = UI_ACCENT,
}: {
  variant: NotifVariant;
  icon?: string;
  title: string;
  body?: string;
  action?: { label: string; icon?: string; onClick?: () => void };
  accent?: string;
}) {
  if (variant === "urgent") {
    return (
      <div style={{ background: accent, borderRadius: 0, padding: "20px", display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden", boxShadow: `0 0 32px ${accent}55` }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "rgba(255,255,255,0.15)", transform: "skewX(12deg) translateX(20px)" }} />
        <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.9)", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
          {icon ?? "⏰"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>{title}</div>
          {body && <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{body}</div>}
        </div>
        {action && (
          <button onClick={action.onClick} style={{ background: "rgba(0,0,0,0.25)", color: "#fff", border: "none", width: 44, height: 44, borderRadius: 0, fontSize: 20, cursor: "pointer", flexShrink: 0, position: "relative", zIndex: 1 }}>
            {action.icon ?? action.label}
          </button>
        )}
      </div>
    );
  }

  const styles: Record<Exclude<NotifVariant, "urgent">, { bg: string; border: string; iconColor: string }> = {
    info:    { bg: `${accent}22`,              border: `${accent}55`,              iconColor: accent    },
    warning: { bg: "rgba(239,68,68,0.15)",     border: "rgba(239,68,68,0.4)",      iconColor: "#F87171" },
    success: { bg: "rgba(34,197,94,0.15)",     border: "rgba(34,197,94,0.35)",     iconColor: "#4ADE80" },
  };
  const s = styles[variant as Exclude<NotifVariant, "urgent">];

  return (
    <div style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 0, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 20, color: s.iconColor }}>{icon ?? (variant === "info" ? "ℹ" : variant === "warning" ? "⚠️" : "✅")}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title}</div>
        {body && <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{body}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VictoryPopup
// ─────────────────────────────────────────────────────────────────────────────
export function VictoryPopup({
  title = "Victory!",
  subtitle = "You totally dominated!",
  xp = 500,
  buttonLabel = "CLAIM REWARDS",
  onButton,
  accent = UI_ACCENT,
}: {
  title?: string;
  subtitle?: string;
  xp?: number;
  buttonLabel?: string;
  onButton?: () => void;
  accent?: string;
}) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 0, border: `2px solid ${accent}`, padding: "40px 28px 28px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", boxShadow: `0 0 40px ${accent}33` }}>
      <div style={{ position: "absolute", top: -24, background: UI_AMBER, width: 52, height: 52, borderRadius: "50%", border: "4px solid var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, animation: "bounce 1s infinite" }}>🏆</div>
      <h3 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 36, fontWeight: 700, color: "var(--text)", marginBottom: 8, marginTop: 8 }}>{title}</h3>
      <p style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)", fontSize: 16, marginBottom: 20 }}>{subtitle}</p>
      <div style={{ background: `${accent}22`, borderRadius: 0, padding: "14px 24px", width: "100%", marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: accent, fontWeight: 700, fontSize: 22 }}>+{xp} XP Earned</p>
      </div>
      <Button accent={accent} fullWidth onClick={onButton} size="lg">{buttonLabel}</Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NameModal — overlay with text input
// ─────────────────────────────────────────────────────────────────────────────
export function NameModal({
  title = "Jouw naam",
  subtitle = "Vul je naam in om mee te doen",
  confirmLabel = "Bevestigen →",
  onConfirm,
  onCancel,
  accent = UI_ACCENT,
  error,
}: {
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  accent?: string;
  error?: string | null;
}) {
  const [value, setValue] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,46,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 100, animation: "fade-in 0.15s ease both" }}>
      <div style={{ background: "var(--card)", borderRadius: 0, padding: "32px 28px", width: "100%", maxWidth: 360, border: "1px solid var(--border)", boxShadow: "0 0 40px var(--shadow)", animation: "bounce-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{title}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>{subtitle}</div>
        <input
          autoFocus value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onConfirm(value.trim())}
          placeholder="Jouw naam..."
          style={{ background: "var(--input-bg)", border: `1px solid ${error ? UI_RED : "var(--input-border)"}`, borderRadius: 0, padding: "13px 16px", color: "var(--text)", fontSize: 16, fontFamily: "var(--font-body)", outline: "none", width: "100%", boxSizing: "border-box", marginBottom: error ? 8 : 16 }}
        />
        {error && <div style={{ color: UI_RED, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" flex={1} onClick={onCancel}>Terug</Button>
          <Button accent={accent} flex={2} disabled={!value.trim()} onClick={() => value.trim() && onConfirm(value.trim())}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LeaderboardRow
// ─────────────────────────────────────────────────────────────────────────────
export function LeaderboardRow({
  rank,
  name,
  score,
  sub,
  accent = UI_ACCENT,
  highlight = false,
  avatarId,
}: {
  rank: number;
  name: string;
  score: string | number;
  sub?: string;
  accent?: string;
  highlight?: boolean;
  avatarId?: string | null;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  const isFirst = rank === 1;

  if (isFirst) {
    return (
      <div style={{ background: "var(--card)", borderRadius: 0, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: `1px solid ${UI_BORDER}`, animation: "bounce-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: accent, width: 24, flexShrink: 0 }}>01</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>1st Place</div>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, color: "var(--text)" }}>{name}</div>
          {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 500, color: accent }}>
          {score} <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>pts</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: highlight ? `${accent}0d` : "transparent", borderRadius: 0, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${highlight ? accent + "33" : UI_BORDER}`, animation: `slide-up 0.3s ease ${(rank - 1) * 50}ms both` }}>
      <span style={{ width: 24, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: rank <= 3 ? accent : "var(--text-faint)", flexShrink: 0 }}>
        {String(rank).padStart(2, "0")}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{name}</div>
        {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: highlight ? accent : "var(--text)" }}>
        {score} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-faint)" }}>pts</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopNav — sticky app header
// ─────────────────────────────────────────────────────────────────────────────
export function TopNav({
  left,
  center,
  right,
  bg = UI_BG,
  border = UI_BORDER,
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  bg?: string;
  border?: string;
}) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--card)", backdropFilter: "blur(20px)", borderBottom: `1px solid var(--border)`, padding: "12px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>{left}</div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{center}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>{right}</div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BottomNav — floating island navigation
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
  lobby: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  scores: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a1 1 0 00-1 1v2c0 3.3 2.5 6 6 6.9M18 9h2a1 1 0 011 1v2c0 3.3-2.5 6-6 6.9" />
      <path d="M12 17v3M9 20h6" />
      <path d="M5 3h14l-1 8a6 6 0 01-12 0L5 3z" />
    </svg>
  ),
  chat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  shop: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

function NavIcon({ icon }: { icon: string }) {
  return <>{NAV_ICONS[icon] ?? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/></svg>}</>;
}

type GlobalChatMsg = { user: string; text: string; role?: "mod" };

export function BottomNav({
  items,
  accent = UI_ACCENT,
  chatMode = "page",
}: {
  items: { label: string; icon: string; active?: boolean; onClick?: () => void }[];
  accent?: string;
  bg?: string;
  border?: string;
  chatMode?: "page" | "popup";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [pressed, setPressed] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<GlobalChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [myName, setMyName] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.username) setMyName(d.username); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (chatMode !== "popup") return;
    const socket = getSocket();
    const handler = (msg: GlobalChatMsg) => setChatMsgs(prev => [...prev.slice(-49), msg]);
    socket.on("chat-global", handler);
    socket.emit("chat-history", { gameType: "global" }, (history: GlobalChatMsg[]) => {
      setChatMsgs(history ?? []);
      setChatLoading(false);
    });
    return () => { socket.off("chat-global", handler); };
  }, [chatMode]);

  const chatActive = chatMode === "popup" ? chatOpen : pathname === "/chat";
  const allItems = [
    ...items,
    { label: t.chat,     icon: "chat",     active: chatActive, onClick: () => chatMode === "popup" ? setChatOpen(true) : router.push("/chat") },
    { label: t.settings, icon: "settings", active: pathname === "/settings", onClick: () => router.push("/settings") },
  ];

  return (
    <>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "flex-end",
        paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
        pointerEvents: "none",
        zIndex: 50,
        willChange: "transform",
        transform: "translateZ(0)",
      }}>
        <nav style={{
          pointerEvents: "all",
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "var(--card)",
          backdropFilter: "blur(28px)",
          border: "1px solid var(--border)",
          borderRadius: 0,
          padding: "4px 6px",
          boxShadow: "0 8px 40px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.02)",
          animation: "nav-slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
        }}>
          {allItems.map(({ label, icon, active, onClick }) => {
            const isPressed = pressed === label;
            return (
              <button
                key={label}
                data-nav-icon={icon}
                onClick={() => { playNav(); onClick?.(); }}
                onMouseDown={() => setPressed(label)}
                onMouseUp={() => setPressed(null)}
                onMouseLeave={() => setPressed(null)}
                onTouchStart={() => setPressed(label)}
                onTouchEnd={() => setPressed(null)}
                style={{
                  position: "relative",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 3,
                  background: active ? "var(--card2)" : "transparent",
                  border: "none",
                  borderRadius: 0,
                  padding: allItems.length >= 5 ? "6px 10px" : "6px 16px",
                  cursor: "pointer",
                  color: active ? "var(--text)" : "var(--text-faint)",
                  transition: "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  transform: isPressed ? "scale(0.93)" : "scale(1)",
                  minWidth: allItems.length >= 5 ? 44 : 56,
                }}
              >
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: active ? accent : "var(--text-faint)",
                  transition: "color 0.18s",
                }}>
                  <NavIcon icon={icon} />
                </span>
                <span style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  fontSize: 8,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: active ? "var(--text)" : "var(--text-faint)",
                  transition: "color 0.18s",
                }}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {chatMode === "popup" && (
        <BottomSheet
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          fixed
          sheetStyle={{ background: 'var(--card)', border: "1px solid var(--border)", borderRadius: 0 }}
        >
          {() => (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>
              <div style={{ padding: "4px 14px 8px", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700, fontSize: 20, color: accent }}>
                  {t.globalChat}
                </div>
              </div>
              <div style={{ flex: 1, overflow: "hidden", padding: "0 0 12px" }}>
                <ChatPanel
                  messages={chatMsgs}
                  loading={chatLoading}
                  myName={myName}
                  onSend={(text) => {
                    const name = myName ?? (typeof window !== "undefined" ? sessionStorage.getItem("ludoryn-name") : null) ?? t.anonymous;
                    getSocket().emit("chat-send", { gameType: "global", userName: name, message: text }, () => {});
                  }}
                  accent={accent}
                  card="transparent"
                  border="transparent"
                  maxHeight={999}
                />
              </div>
            </div>
          )}
        </BottomSheet>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — labelled section title
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// PageHeader — consistent transparent header with bottom border
// ─────────────────────────────────────────────────────────────────────────────
export function PageHeader({
  left,
  right,
}: {
  left: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div style={{
      background: "transparent",
      borderBottom: "1px solid var(--border)",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {left}
      </div>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {right}
        </div>
      )}
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  accent = UI_ACCENT,
}: {
  icon: string;
  title: string;
  accent?: string;
}) {
  return (
    <h2 style={{ fontFamily: "var(--font-body)", fontSize: 18, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <span style={{ color: accent, fontSize: 16 }}>{icon}</span>
      {title}
    </h2>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatPanel
// ─────────────────────────────────────────────────────────────────────────────
type ChatMsg = { user: string; text: string; role?: "mod" };

export function ChatPanel({
  messages,
  onSend,
  myName,
  avatarMap,
  loading = false,
  accent = UI_ACCENT,
  card = UI_CARD,
  border = UI_BORDER,
  maxHeight = 420,
}: {
  messages: ChatMsg[];
  loading?: boolean;
  onSend: (text: string) => void;
  myName?: string;
  avatarMap?: Record<string, string | null>;
  accent?: string;
  card?: string;
  border?: string;
  maxHeight?: number;
}) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLang();

  const EMOJIS = ["😂","😍","🔥","👍","😎","🎲","🏆","💀","😤","🤣","👀","😭","🤩","💯","🤔","😏","🎉","⚡","🐛","🫡"];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  function insertEmoji(emoji: string) {
    onSend(emoji);
    setShowEmoji(false);
  }

  return (
    <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, maxHeight }}>
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <>
            {[{ w: "70%", tw: "40%" }, { w: "55%", tw: "30%" }, { w: "80%", tw: "45%" }, { w: "60%", tw: "35%" }].map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <Skeleton width={s.tw} height={10} radius={5} />
                <Skeleton width={s.w} height={32} radius={10} />
              </div>
            ))}
          </>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 12, fontFamily: "var(--font-body)" }}>
            Nog geen berichten
          </div>
        ) : messages.map((msg, i) => {
          const isMe = myName && msg.user === myName;
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: isMe ? "row-reverse" : "row", animation: "slide-in-right 0.2s ease both" }}>
              <div style={{ maxWidth: "72%", minWidth: 0 }}>
                {!isMe && <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 800, color: msg.role === "mod" ? accent : "var(--text-muted)", marginBottom: 2, paddingLeft: 4 }}>{msg.user}</div>}
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.4,
                  padding: "8px 11px",
                  borderRadius: 0,
                  background: isMe ? `${accent}28` : msg.role === "mod" ? `${accent}18` : "var(--input-bg)",
                  color: isMe ? accent : "var(--text)",
                  fontStyle: msg.role === "mod" ? "italic" : "normal",
                  border: isMe ? `1px solid ${accent}33` : "none",
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${border}`, display: "flex", gap: 8, position: "relative" }}>
        {showEmoji && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowEmoji(false)} />
            <div style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: 12, zIndex: 50,
              background: "var(--card)", border: `1px solid ${border}`, borderRadius: 0,
              padding: 8, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
              boxShadow: "0 8px 32px var(--shadow)",
            }}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => insertEmoji(e)}
                  style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", padding: "6px 8px", borderRadius: 0, transition: "background 0.1s" }}
                  onMouseEnter={(ev) => ev.currentTarget.style.background = "var(--card2)"}
                  onMouseLeave={(ev) => ev.currentTarget.style.background = "none"}
                >{e}</button>
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => setShowEmoji((v) => !v)}
          style={{ background: showEmoji ? "rgba(255,255,255,0.1)" : "none", border: "none", fontSize: 18, cursor: "pointer", padding: "4px 6px", borderRadius: 0, transition: "background 0.15s", flexShrink: 0 }}
        >😊</button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t.typeMessage}
          style={{ flex: 1, background: "var(--input-bg)", border: "none", borderRadius: 0, padding: "8px 14px", color: "var(--text)", fontSize: 16, outline: "none", fontFamily: "var(--font-body)" }}
        />
        <button onClick={send} style={{ background: "none", border: "none", color: accent, fontSize: 18, cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}>➤</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TurnTimer — beurt countdown balk
// ─────────────────────────────────────────────────────────────────────────────
export function TurnTimer({
  timeLeft,
  gameMode,
  isMyTurn,
  accent = UI_ACCENT,
}: {
  timeLeft: number | null;
  gameMode: "fast" | "slow";
  isMyTurn: boolean;
  accent?: string;
}) {
  if (timeLeft === null) return null;

  const totalMs = gameMode === "fast" ? 2 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const fraction = Math.max(0, Math.min(1, timeLeft / totalMs));
  const urgent = fraction < 0.25;

  function fmt(ms: number) {
    if (gameMode === "slow") {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return h >= 1 ? `${h}u ${m}m` : `${m}m`;
    }
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  }

  const color = urgent ? UI_RED : isMyTurn ? accent : "rgba(255,255,255,0.3)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>
          {isMyTurn ? "Jouw beurt" : "Tegenstander"}
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
          color, animation: urgent && isMyTurn ? "pulse 1s infinite" : "none",
        }}>
          {fmt(timeLeft)}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 0, background: "var(--border)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 0,
          width: `${fraction * 100}%`,
          background: color,
          transition: "width 1s linear, background 0.3s",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginModal — login + register tabs
// ─────────────────────────────────────────────────────────────────────────────
export function LoginModal({
  onSuccess,
  onCancel,
  accent = UI_ACCENT,
}: {
  onSuccess: (username: string) => void;
  onCancel: () => void;
  accent?: string;
}) {
  const [tab, setTab]         = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLang();

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const url = tab === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t.somethingWentWrong); return; }
    onSuccess(data.username);
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 0", borderRadius: 0, border: "none",
    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14,
    cursor: "pointer",
    background: active ? accent : "transparent",
    color: active ? "#fff" : "var(--text-muted)",
    transition: "background 0.15s, color 0.15s",
  });

  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)", border: "1px solid var(--input-border)",
    borderRadius: 0, padding: "13px 16px", color: "var(--text)", fontSize: 16,
    fontFamily: "var(--font-body)", outline: "none", width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,46,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 100, animation: "fade-in 0.15s ease both" }}>
      <div style={{ background: "var(--card)", borderRadius: 0, padding: "28px 28px 24px", width: "100%", maxWidth: 360, border: "1px solid var(--border)", boxShadow: "0 0 40px var(--shadow)", animation: "bounce-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 18 }}>Account</div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--card2)", borderRadius: 0, padding: 4, marginBottom: 20 }}>
          <button style={tabStyle(tab === "login")} onClick={() => { setTab("login"); setError(null); }}>{t.logIn}</button>
          <button style={tabStyle(tab === "register")} onClick={() => { setTab("register"); setError(null); }}>{t.signUp}</button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <input
            autoFocus value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={t.username}
            style={inputStyle}
          />
          <input
            type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={t.password}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ color: UI_RED, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" flex={1} onClick={onCancel}>{t.cancel}</Button>
          <Button accent={accent} flex={2} disabled={loading || !username.trim() || !password} onClick={handleSubmit}>
            {loading ? "..." : tab === "login" ? t.signIn : t.signUp}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────
function darken(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.floor(((n >> 16) & 0xff) * 0.55);
  const g = Math.floor(((n >> 8)  & 0xff) * 0.55);
  const b = Math.floor(( n        & 0xff) * 0.55);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

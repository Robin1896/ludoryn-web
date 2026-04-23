"use client";

import { useState, useEffect, useRef, useLayoutEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { getSocket } from "@/lib/socket";
import { BottomNav, Avatar, GamePlayerCard } from "@/components/ui";
import GameControls from "@/components/GameControls";
import DieFace from "@/components/DieFace";
import BottomSheet from "@/components/BottomSheet";
import WaitingScreen from "@/components/WaitingScreen";
import { useLang } from "@/lib/lang";
import {
  Color,
  GameState,
  PlayerState,
  ROW_NUMBERS,
  ROW_COLOR_HEX,
  Dice,
  newGame,
  rollDice,
  getWhiteSum,
  getColorOptions,
  applyCross,
  canCross,
  checkGameOver,
  finalScores,
  calcScore,
} from "@/app/qwixx/logic";


// ─────────────────────────────────────────────────────────────────────────────
// Row display
// ─────────────────────────────────────────────────────────────────────────────

function KriskrasRow({
  color,
  numbers,
  crossed,
  validNums,
  locked,
  onCross,
  disabled,
  selectedNum,
}: {
  color: Color;
  numbers: number[];
  crossed: number[];
  validNums: number[];
  locked: boolean;
  onCross?: (num: number) => void;
  disabled?: boolean;
  selectedNum?: number;
}) {
  const hex = ROW_COLOR_HEX[color];
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCrossedRef = useRef<number[]>(crossed);
  const rowRef = useRef<HTMLDivElement>(null);

  // Animate newly crossed numbers
  useEffect(() => {
    const newlyCrossed = crossed.filter(n => !prevCrossedRef.current.includes(n));
    newlyCrossed.forEach(num => {
      const el = containerRef.current?.querySelector(`[data-num="${num}"]`);
      if (!el) return;
      gsap.fromTo(el,
        { scale: 0.4, opacity: 0.3 },
        { scale: 1, opacity: 1, duration: 0.38, ease: "back.out(2.5)" }
      );
    });
    // Animate lock
    if (locked && !prevCrossedRef.current.includes(-999)) {
      const row = rowRef.current;
      if (row) {
        gsap.fromTo(row,
          { opacity: 1 },
          { opacity: 0.5, duration: 0.5, ease: "power2.inOut" }
        );
      }
    }
    prevCrossedRef.current = crossed;
  }, [crossed, locked]);

  return (
    <div ref={rowRef} style={{
      background: `${hex}18`,
      border: `1.5px solid ${locked ? 'rgba(255,255,255,0.1)' : hex + '55'}`,
      borderRadius: 12,
      padding: '6px 8px',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      opacity: locked ? 0.5 : 1,
    }}>
      {/* Color dot */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: hex, flexShrink: 0, boxShadow: `0 0 6px ${hex}` }} />

      {/* Numbers */}
      <div ref={containerRef} style={{ display: 'flex', gap: 2, flex: 1, flexWrap: 'nowrap', minWidth: 0 }}>
        {numbers.map((num) => {
          const isCrossed = crossed.includes(num);
          const isValid = !locked && validNums.includes(num) && !isCrossed;
          const isSelected = selectedNum === num && !isCrossed;
          const isClickable = isValid && !disabled && !!onCross;
          return (
            <button
              key={num}
              data-num={num}
              disabled={!isClickable && !isSelected}
              onClick={() => {
                if (isSelected) { onCross?.(num); return; }
                if (isClickable) onCross?.(num);
              }}
              style={{
                flex: '1 1 0', minWidth: 0, height: 28,
                borderRadius: 6,
                border: isSelected
                  ? `2px solid #fff`
                  : isValid ? `1.5px solid ${hex}` : isCrossed ? `1.5px solid ${hex}55` : '1.5px solid rgba(255,255,255,0.08)',
                background: isCrossed
                  ? hex
                  : isSelected
                    ? hex
                    : isValid
                      ? `${hex}22`
                      : 'rgba(255,255,255,0.03)',
                color: isCrossed || isSelected ? '#fff' : isValid ? hex : 'rgba(238,242,255,0.35)',
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                fontSize: num >= 10 ? 10 : 12,
                cursor: (isClickable || isSelected) ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.12s',
                boxShadow: isSelected ? `0 0 12px ${hex}88, 0 0 4px rgba(255,255,255,0.4)` : isValid ? `0 0 8px ${hex}44` : 'none',
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {isCrossed ? '✕' : isSelected ? '✓' : num}
            </button>
          );
        })}
      </div>

      {/* Lock icon */}
      {locked && (
        <div style={{ fontSize: 14, flexShrink: 0, opacity: 0.5 }}>🔒</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Score badge
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBadge({ score, accent }: { score: number; accent: string }) {
  const numRef = useRef<HTMLSpanElement>(null);
  const prevScore = useRef(score);

  useEffect(() => {
    if (score !== prevScore.current && numRef.current) {
      gsap.fromTo(numRef.current,
        { scale: 1.5, color: '#fff' },
        { scale: 1, color: accent, duration: 0.4, ease: 'back.out(2)' }
      );
    }
    prevScore.current = score;
  }, [score, accent]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: `${accent}15`,
      border: `1px solid ${accent}33`,
      borderRadius: 20, padding: '4px 10px',
    }}>
      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, color: 'rgba(238,242,255,0.4)' }}>Score</span>
      <span ref={numRef} style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 700, color: accent }}>{score}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Penalty tracker
// ─────────────────────────────────────────────────────────────────────────────

function PenaltyCell({ active, index }: { active: boolean; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current && ref.current) {
      gsap.fromTo(ref.current,
        { scale: 0.3, rotate: -20 },
        { scale: 1, rotate: 0, duration: 0.4, ease: 'back.out(2.5)' }
      );
    }
    wasActive.current = active;
  }, [active]);

  return (
    <div ref={ref} style={{
      width: 18, height: 18, borderRadius: 4,
      background: active ? '#FF5252' : 'rgba(255,255,255,0.06)',
      border: active ? '1px solid #FF5252' : '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, color: active ? '#fff' : 'transparent',
    }}>
      {active ? '✕' : ''}
    </div>
  );
}

function PenaltyTracker({ count }: { count: number }) {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, color: 'rgba(238,242,255,0.3)', marginRight: 2 }}>{t.faults}</span>
      {Array.from({ length: 4 }).map((_, i) => (
        <PenaltyCell key={i} active={i < count} index={i} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player card (header)
// ─────────────────────────────────────────────────────────────────────────────

function PlayerCard({ player, active, avatarId }: { player: PlayerState; active: boolean; avatarId?: string | null }) {
  const score = calcScore(player.crossed, player.penalties);
  return (
    <GamePlayerCard
      name={player.name}
      avatarId={avatarId}
      active={active}
      accent="#FFCA28"
      scoreLabel={`${score} pt`}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Game board
// ─────────────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  gs: GameState;
  myPlayerIndex: number;
  displayPlayerIndex?: number;
  isMyTurn: boolean;
  vsAI: boolean;
  pendingCross: { color: Color; num: number } | null;
  rolling?: boolean;
  onRoll: () => void;
  onCrossWhite: (color: Color, num: number) => void;
  onCrossColor: (color: Color, num: number) => void;
  onConfirm: () => void;
  onPass: () => void;
  waitingFor?: string;
}

function GameBoard({ gs, myPlayerIndex, displayPlayerIndex, isMyTurn, vsAI, pendingCross, rolling, onRoll, onCrossWhite, onCrossColor, onConfirm, onPass, waitingFor }: GameBoardProps) {
  const { t, lang } = useLang();
  const COLORS: Color[] = ['red', 'yellow', 'green', 'blue'];
  const viewIdx = displayPlayerIndex ?? myPlayerIndex;
  const isSpectating = displayPlayerIndex !== undefined && displayPlayerIndex !== myPlayerIndex;
  const me = gs.players[viewIdx];
  const activePlayer = gs.players[gs.currentPlayer];
  const isActivePlayer = myPlayerIndex === gs.currentPlayer;

  const score = me ? calcScore(me.crossed, me.penalties) : 0;

  // What can I cross?
  const whiteSum = gs.dice ? getWhiteSum(gs.dice) : null;
  const canCrossWhiteNum = (num: number) => {
    if (!me || gs.phase !== 'choosing') return false;
    return COLORS.some(c => !gs.lockedRows.includes(c) && canCross(me.crossed[c], ROW_NUMBERS[c], num, false));
  };

  const validWhiteColors = (num: number): Color[] => {
    if (!me) return [];
    return COLORS.filter(c => !gs.lockedRows.includes(c) && canCross(me.crossed[c], ROW_NUMBERS[c], num, false));
  };

  const colorOptions = gs.dice && me && gs.phase === 'choosing' && isActivePlayer
    ? getColorOptions(gs.dice, me, gs.lockedRows)
    : [];

  // Build per-row valid numbers
  const validForRow = (color: Color): number[] => {
    if (gs.phase !== 'choosing' || rolling) return [];
    const result: number[] = [];

    // White sum — any player
    if (whiteSum !== null && me && !gs.lockedRows.includes(color) && canCross(me.crossed[color], ROW_NUMBERS[color], whiteSum, false)) {
      result.push(whiteSum);
    }
    // Color options — active player only
    if (isActivePlayer) {
      colorOptions.filter(o => o.color === color).forEach(o => {
        if (!result.includes(o.num)) result.push(o.num);
      });
    }
    return result;
  };

  const handleRowCross = (color: Color, num: number) => {
    if (!me || gs.phase !== 'choosing' || isSpectating) return;
    // Is this a white sum cross?
    const isWhite = whiteSum === num && canCross(me.crossed[color], ROW_NUMBERS[color], num, false) && !gs.lockedRows.includes(color);
    // Is this a color option?
    const isColorOpt = isActivePlayer && colorOptions.some(o => o.color === color && o.num === num);

    if (isWhite) {
      onCrossWhite(color, num);
    } else if (isColorOpt) {
      onCrossColor(color, num);
    }
  };

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 50, cursor: 'pointer',
    fontFamily: "'Nunito', sans-serif", fontWeight: 700,
    fontSize: 14, padding: '12px 0', flex: 1,
    transition: 'all 0.15s',
  };

  const canConfirm = gs.phase === 'choosing';

  return (
    <div style={{
      width: '100%', maxWidth: 500,
      background: 'linear-gradient(180deg, #1E1630 0%, #130F22 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 24, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>

      {/* Dice display — always rendered to prevent layout shift */}
      {gs.phase !== 'gameover' && (
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,202,40,0.5)', marginBottom: 8 }}>
            {t.dice}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {gs.dice ? (
              <>
                <DieFace face={gs.dice.white1} color="#F5F0E4" size={36} rolling={rolling} animIndex={0} />
                <DieFace face={gs.dice.white2} color="#F5F0E4" size={36} rolling={rolling} animIndex={1} />
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                <DieFace face={gs.dice.red} color={ROW_COLOR_HEX.red} size={36} rolling={rolling} animIndex={2} />
                <DieFace face={gs.dice.yellow} color={ROW_COLOR_HEX.yellow} size={36} rolling={rolling} animIndex={3} />
                <DieFace face={gs.dice.green} color={ROW_COLOR_HEX.green} size={36} rolling={rolling} animIndex={4} />
                <DieFace face={gs.dice.blue} color={ROW_COLOR_HEX.blue} size={36} rolling={rolling} animIndex={5} />
              </>
            ) : (
              <>
                {[0, 1].map(i => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.08)' }} />
                ))}
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)', margin: '0 2px' }} />
                {([ROW_COLOR_HEX.red, ROW_COLOR_HEX.yellow, ROW_COLOR_HEX.green, ROW_COLOR_HEX.blue] as string[]).map((hex, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: `${hex}10`, border: `1.5px dashed ${hex}30` }} />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Rows */}
      <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {COLORS.map((color) => (
          <KriskrasRow
            key={color}
            color={color}
            numbers={ROW_NUMBERS[color]}
            crossed={me?.crossed[color] ?? []}
            validNums={validForRow(color)}
            locked={gs.lockedRows.includes(color)}
            onCross={(num) => handleRowCross(color, num)}
            disabled={gs.phase !== 'choosing' || !!rolling || isSpectating}
            selectedNum={!isSpectating && pendingCross?.color === color ? pendingCross.num : undefined}
          />
        ))}
      </div>

      {/* Score + penalties */}
      <div style={{ padding: '0 14px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <ScoreBadge score={score} accent="#FFCA28" />
        <PenaltyTracker count={me?.penalties ?? 0} />
      </div>

      {/* Controls */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px 16px' }}>
        {gs.phase === 'gameover' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: '#FFCA28', marginBottom: 8 }}>{t.gameOver}</div>
            {gs.players.map((p, i) => {
              const s = gs.scores?.[i] ?? calcScore(p.crossed, p.penalties);
              const winner = gs.scores ? gs.scores.indexOf(Math.max(...gs.scores)) === i : false;
              return (
                <div key={i} style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'rgba(238,242,255,0.7)', marginBottom: 4 }}>
                  {p.name}: {s} {t.pts} {winner && <span style={{ color: '#FFCA28', fontWeight: 700 }}>{t.winner}</span>}
                </div>
              );
            })}
          </div>
        ) : isSpectating ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.25)', fontStyle: 'italic' }}>{t.spectating(gs.players[viewIdx]?.name ?? '')}</span>
          </div>
        ) : waitingFor ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4285F4', boxShadow: '0 0 8px #4285F4', animation: 'pulse 1.2s infinite' }} />
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.4)' }}>{t.waitingFor(waitingFor!)}</span>
          </div>
        ) : vsAI && gs.currentPlayer === 1 && gs.phase === 'rolling' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFCA28', boxShadow: '0 0 8px #FFCA28' }} />
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.35)' }}>{t.aiRolling}</span>
          </div>
        ) : gs.phase === 'rolling' ? (
          <button
            onClick={onRoll}
            disabled={!isMyTurn && !isActivePlayer}
            style={{
              ...btnBase,
              background: (isMyTurn || isActivePlayer)
                ? 'linear-gradient(135deg, #FFCA28, #e0952a)'
                : 'rgba(255,255,255,0.05)',
              color: (isMyTurn || isActivePlayer) ? '#1a0d00' : 'rgba(238,242,255,0.2)',
              boxShadow: (isMyTurn || isActivePlayer) ? '0 4px 16px rgba(255,202,40,0.35), 0 3px 0 #7A4A10' : 'none',
              cursor: (isMyTurn || isActivePlayer) ? 'pointer' : 'not-allowed',
              width: '100%',
            }}
          >
            {isActivePlayer ? t.rollDice : t.waitingFor(activePlayer.name)}
          </button>
        ) : (
          /* choosing phase */
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onPass}
              style={{
                ...btnBase,
                flex: '0 0 auto',
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(238,242,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
              }}
            >
              {t.pass}
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              style={{
                ...btnBase,
                background: 'linear-gradient(135deg, #00C875, #00A050)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0,200,117,0.35)',
                cursor: 'pointer',
              }}
            >
              {isActivePlayer ? t.confirmNext : t.confirm}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start screen
// ─────────────────────────────────────────────────────────────────────────────

function KriskrasStartScreen({ onStart }: { onStart: (names: [string, string], vsAI: boolean) => void }) {
  const [name1, setName1] = useState("Robin");
  const [name2, setName2] = useState("Loic");
  const { t } = useLang();
  const ACCENT = '#FFCA28';
  const inputStyle: React.CSSProperties = {
    background: 'rgba(28,26,46,0.8)',
    border: `1px solid rgba(255,202,40,0.3)`,
    borderRadius: 14, padding: '10px 14px',
    color: 'var(--text)', fontFamily: "'Nunito', sans-serif",
    fontSize: 15, width: '100%', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600,
    letterSpacing: '0.22em', textTransform: 'uppercase',
    color: 'rgba(255,202,40,0.6)', marginBottom: 6, display: 'block',
  };
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(36px, 10vw, 64px)', fontWeight: 900, letterSpacing: '0.08em', background: `linear-gradient(160deg, #ffffff 0%, ${ACCENT} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 8px', lineHeight: 0.95 }}>
          Kriskras
        </h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 40px' }}>
          {t.kriskrasSubtitle}
        </p>
        <div style={{ background: 'rgba(28,26,46,0.6)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '28px 24px', textAlign: 'left' }}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{t.playerN(1)}</label>
            <input style={inputStyle} value={name1} onChange={e => setName1(e.target.value)} placeholder={t.namePlaceholder} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>{t.playerN(2)}</label>
            <input style={inputStyle} value={name2} onChange={e => setName2(e.target.value)} placeholder={t.namePlaceholder} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onStart([name1 || t.playerN(1), name2 || t.playerN(2)], false)} style={{ flex: 1, background: ACCENT, color: '#1a0d00', border: 'none', borderRadius: 50, padding: '13px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {t.twoPlayers}
            </button>
            <button onClick={() => onStart([name1 || t.playerN(1), 'AI'], true)} style={{ flex: 1, background: `rgba(255,202,40,0.12)`, color: ACCENT, border: `1px solid rgba(255,202,40,0.4)`, borderRadius: 50, padding: '13px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
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

function KriskrasContent() {
  const { t, lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const aiParam = searchParams.get("ai") === "1";

  const [screenPhase, setScreenPhase] = useState<'start' | 'waiting' | 'lobby' | 'countdown' | 'playing'>('start');
  const [countdown, setCountdown] = useState(3);
  const pendingGsRef = useRef<GameState | null>(null);
  const hasGameRef = useRef(false);
  const [gs, setGs] = useState<GameState | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [myName, setMyName] = useState("");
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [readyIndices, setReadyIndices] = useState<number[]>([]);
  const [iAmReady, setIAmReady] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [vsAI, setVsAI] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string | null>>({});

  // Fetch avatars for all players
  useEffect(() => {
    if (!gs) return;
    gs.players.forEach(p => {
      if (p.name in playerAvatars) return;
      setPlayerAvatars(prev => ({ ...prev, [p.name]: null }));
      fetch(`/api/avatar?username=${encodeURIComponent(p.name)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setPlayerAvatars(prev => ({ ...prev, [p.name]: d.avatarId ?? null })); })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs?.players.map(p => p.name).join(',')]);

  // Per-turn state: what has this player crossed this turn
  const [myTurnCross, setMyTurnCross] = useState<{ color: Color; num: number } | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [rollingDice, setRollingDice] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState(0);
  const [rulesSearch, setRulesSearch] = useState('');

  const ACCENT = '#FFCA28';

  // On entering playing phase, reset turn state
  useEffect(() => {
    if (gs?.phase === 'rolling') {
      setMyTurnCross(null);
      setHasConfirmed(false);
    }
  }, [gs?.phase, gs?.currentPlayer]);

  // Persist gs to localStorage on every change, clear on gameover
  useEffect(() => {
    if (!gs || !roomId) return;
    try {
      if (gs.phase === 'gameover') {
        localStorage.removeItem(`qwixx-gs-${roomId}`);
      } else {
        localStorage.setItem(`qwixx-gs-${roomId}`, JSON.stringify(gs));
      }
    } catch { /* ignore */ }
  }, [gs, roomId]);

  useEffect(() => {
    if (!roomId) return;

    const pidx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? "0");
    const name = sessionStorage.getItem("ludoryn-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setMyName(name);

    // Restore from localStorage immediately (no flash while waiting for socket)
    try {
      const saved = localStorage.getItem(`qwixx-gs-${roomId}`);
      if (saved) {
        const parsed: GameState = JSON.parse(saved);
        setGs(parsed);
        hasGameRef.current = true;
        setScreenPhase('playing');
      } else {
        setScreenPhase('waiting');
      }
    } catch {
      setScreenPhase('waiting');
    }

    const socket = getSocket();

    if (aiParam) {
      setVsAI(true);
      if (!hasGameRef.current) {
        // No saved state — start fresh
        const game = newGame([name, "Tegenstander"]);
        setGs(game);
        setScreenPhase('playing');
      }
      // else: localStorage already restored the state, just continue
      return;
    }

    const pidxRaw = sessionStorage.getItem(`ludoryn-pidx-${roomId}`);
    const needsJoin = pidxRaw === null;

    function rejoin() {
      socket.emit("join-room", { roomId, name }, (res: { ok: boolean; playerIndex?: number; players?: string[]; error?: string; isSpectator?: boolean }) => {
        if (!res.ok) {
          try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /* ignore */ }
          router.push('/lobby?game=qwixx');
          return;
        }
        const realIdx = res.playerIndex ?? pidx;
        if (res.players && res.players.length >= 1) {
          setOpponentName(res.players[realIdx === 0 ? 1 : 0] ?? "");
        }
        if (res.playerIndex !== undefined) {
          setMyPlayerIndex(res.playerIndex);
          sessionStorage.setItem(`ludoryn-pidx-${roomId}`, String(res.playerIndex));
        }
      });
    }

    function startCountdown(afterCount: () => void) {
      setScreenPhase('countdown');
      setCountdown(3);
      let c = 3;
      const iv = setInterval(() => {
        c--;
        if (c <= 0) {
          clearInterval(iv);
          afterCount();
        } else {
          setCountdown(c);
        }
      }, 1000);
    }

    const onRoomUpdate = ({ players: names, readyIndices: ri }: { players: string[]; readyIndices?: number[]; ready?: boolean; roomId: string }) => {
      setLobbyPlayers(names);
      setReadyIndices(ri ?? []);
      if (names.length >= 2) setOpponentName(names.find((_, i) => i !== pidx) ?? "");
      if (names.length >= 2 && !hasGameRef.current) setScreenPhase((prev) => prev === 'waiting' ? 'lobby' : prev);
    };

    socket.on("all-ready", ({ players: names }: { players: string[] }) => {
      setLobbyPlayers(names);
      if (!needsJoin) {
        startCountdown(() => {
          const game = newGame(names);
          socket.emit("state-update", { gameState: game });
          setGs(game);
          setScreenPhase('playing');
        });
      } else {
        startCountdown(() => {
          setGs(pendingGsRef.current);
          setScreenPhase('playing');
        });
      }
    });

    const onStateSync = ({ gameState }: { gameState: GameState | null }) => {
      if (gameState) { hasGameRef.current = true; setGs(gameState); setScreenPhase('playing'); }
    };

    const onStateUpdate = ({ gameState }: { gameState: GameState }) => {
      if (!pendingGsRef.current) pendingGsRef.current = gameState;
      hasGameRef.current = true;
      setGs(gameState);
      setScreenPhase('playing');
    };

    socket.on("room-update", onRoomUpdate);
    socket.on("state-sync", onStateSync);
    socket.on("state-update", onStateUpdate);

    if (socket.connected) rejoin();
    else socket.once("connect", rejoin);
    socket.io.on("reconnect", rejoin);

    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null; players: string[] }) => {
      if (res.players.length >= 2) setOpponentName(res.players[1 - pidx] ?? "");
      if (res.gameState) { hasGameRef.current = true; setGs(res.gameState); setScreenPhase('playing'); }
    });

    socket.on("turn-forfeit", ({ winnerName }: { loserIndex: number; winnerName: string }) => {
      try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /* ignore */ }
      setForfeitWinner(winnerName);
    });

    return () => {
      socket.off("room-update", onRoomUpdate);
      socket.off("state-sync", onStateSync);
      socket.off("state-update", onStateUpdate);
      socket.off("turn-forfeit");
      socket.off("all-ready");
      socket.off("connect", rejoin);
      socket.io.off("reconnect", rejoin);
    };
  }, [roomId, aiParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active room tracking
  useEffect(() => {
    if (!roomId) return;
    if (screenPhase === 'playing' && gs?.phase !== 'gameover') {
      sessionStorage.setItem('ludoryn-active-room', JSON.stringify({ roomId, gameType: 'qwixx' }));
    } else if (gs?.phase === 'gameover') {
      try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /* ignore */ }
    }
  }, [roomId, screenPhase, gs?.phase]);

  function emitState(newGs: GameState) {
    if (roomId) getSocket().emit("state-update", { gameState: newGs });
  }

  const isActivePlayer = gs !== null && gs.currentPlayer === myPlayerIndex;
  const isMyTurn = !roomId || isActivePlayer;

  // AI turn logic — compute outside functional updater to avoid double emitState in strict mode
  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1 || gs.phase === 'gameover') return;

    if (gs.phase === 'rolling') {
      const t = setTimeout(() => {
        const dice = rollDice();
        const next = { ...gs, dice, phase: 'choosing' as const };
        setGs(next);
        emitState(next);
      }, 900);
      return () => clearTimeout(t);
    }

    if (gs.phase === 'choosing') {
      const t = setTimeout(() => {
        if (!gs.dice) return;
        const aiPlayer = gs.players[1];
        const whiteSum = getWhiteSum(gs.dice);
        const COLORS: Color[] = ['red', 'yellow', 'green', 'blue'];
        let updatedPlayers = [...gs.players];
        let newLockedRows = [...gs.lockedRows];
        let aiCrossed = false;

        for (const c of COLORS) {
          if (!gs.lockedRows.includes(c) && canCross(aiPlayer.crossed[c], ROW_NUMBERS[c], whiteSum, false)) {
            const result = applyCross(aiPlayer, c, whiteSum, gs.lockedRows);
            updatedPlayers[1] = result.player;
            if (result.newlyLocked) newLockedRows = [...newLockedRows, result.newlyLocked];
            aiCrossed = true;
            break;
          }
        }

        const colorOpts = getColorOptions(gs.dice, updatedPlayers[1], newLockedRows);
        if (colorOpts.length > 0) {
          const opt = colorOpts[0];
          const result = applyCross(updatedPlayers[1], opt.color, opt.num, newLockedRows);
          updatedPlayers[1] = result.player;
          if (result.newlyLocked) newLockedRows = [...newLockedRows, result.newlyLocked];
          aiCrossed = true;
        }

        if (!aiCrossed) {
          updatedPlayers[1] = { ...updatedPlayers[1], penalties: updatedPlayers[1].penalties + 1 };
        }

        const nextPlayer = (gs.currentPlayer + 1) % gs.players.length;
        const candidate: GameState = { ...gs, players: updatedPlayers, lockedRows: newLockedRows, currentPlayer: nextPlayer, phase: 'rolling', dice: null };
        const isOver = checkGameOver(candidate);
        const next: GameState = isOver ? { ...candidate, phase: 'gameover', scores: finalScores(candidate) } : candidate;
        setGs(next);
        emitState(next);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [gs, vsAI]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRoll() {
    if (!gs || !isActivePlayer) return;
    const dice = rollDice();
    const next: GameState = { ...gs, dice, phase: 'choosing' };
    setGs(next);
    emitState(next);
    setRollingDice(true);
    setTimeout(() => setRollingDice(false), 700);
  }

  function handleCrossWhite(color: Color, num: number) {
    if (!gs || !gs.dice || gs.phase !== 'choosing') return;
    const me = gs.players[myPlayerIndex];
    if (!me) return;
    if (!gs.lockedRows.includes(color) && canCross(me.crossed[color], ROW_NUMBERS[color], num, false)) {
      setMyTurnCross({ color, num });
    }
  }

  function handleCrossColor(color: Color, num: number) {
    if (!gs || gs.phase !== 'choosing' || !isActivePlayer) return;
    setMyTurnCross({ color, num });
  }

  function handleConfirm() {
    if (!gs || gs.phase !== 'choosing' || hasConfirmed) return;
    setHasConfirmed(true);

    setGs(prev => {
      if (!prev) return prev;
      let updatedPlayers = [...prev.players];
      let newLockedRows = [...prev.lockedRows];

      // Apply my cross
      if (myTurnCross) {
        const result = applyCross(updatedPlayers[myPlayerIndex], myTurnCross.color, myTurnCross.num, prev.lockedRows);
        updatedPlayers[myPlayerIndex] = result.player;
        if (result.newlyLocked) newLockedRows = [...newLockedRows, result.newlyLocked];
      }

      if (!isActivePlayer) {
        // Non-active player: just update own slot and emit
        const next: GameState = { ...prev, players: updatedPlayers, lockedRows: newLockedRows };
        emitState(next);
        return next;
      }

      // Active player: apply penalty if nothing crossed, then advance turn
      if (!myTurnCross) {
        updatedPlayers[myPlayerIndex] = { ...updatedPlayers[myPlayerIndex], penalties: updatedPlayers[myPlayerIndex].penalties + 1 };
      }

      const nextPlayer = (prev.currentPlayer + 1) % prev.players.length;
      const candidate: GameState = {
        ...prev,
        players: updatedPlayers,
        lockedRows: newLockedRows,
        currentPlayer: nextPlayer,
        phase: 'rolling',
        dice: null,
      };

      if (checkGameOver(candidate)) {
        const scores = finalScores(candidate);
        const final: GameState = { ...candidate, phase: 'gameover', scores };
        emitState(final);
        return final;
      }

      emitState(candidate);
      return candidate;
    });
  }

  function handlePass() {
    if (!gs || gs.phase !== 'choosing' || hasConfirmed) return;
    setHasConfirmed(true);

    setGs(prev => {
      if (!prev) return prev;
      let updatedPlayers = [...prev.players];
      let newLockedRows = [...prev.lockedRows];

      if (!isActivePlayer) {
        // Non-active player passes: no penalty
        const next: GameState = { ...prev, players: updatedPlayers };
        emitState(next);
        return next;
      }

      // Active player passes: apply penalty
      updatedPlayers[myPlayerIndex] = { ...updatedPlayers[myPlayerIndex], penalties: updatedPlayers[myPlayerIndex].penalties + 1 };
      const nextPlayer = (prev.currentPlayer + 1) % prev.players.length;
      const candidate: GameState = { ...prev, players: updatedPlayers, lockedRows: newLockedRows, currentPlayer: nextPlayer, phase: 'rolling', dice: null };

      if (checkGameOver(candidate)) {
        const scores = finalScores(candidate);
        const final: GameState = { ...candidate, phase: 'gameover', scores };
        emitState(final);
        return final;
      }

      emitState(candidate);
      return candidate;
    });
  }

  // ── WAITING SCREEN ─────────────────────────────────────────────────────────

  if (screenPhase === 'waiting') {
    const waitingPlayers = lobbyPlayers.length > 0 ? lobbyPlayers : (myName ? [myName] : ['Speler 1']);
    return <WaitingScreen roomId={roomId!} players={waitingPlayers} myPlayerIndex={myPlayerIndex} maxPlayers={5} gameType="qwixx" accent="#FFCA28" />;
  }

  // ── LOBBY SCREEN ───────────────────────────────────────────────────────────

  if (screenPhase === 'lobby') {
    const handleReady = () => {
      setIAmReady(true);
      getSocket().emit("player-ready", { roomId });
    };

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>Kriskras</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(238,242,255,0.25)', letterSpacing: '0.15em', marginTop: 4 }}>ROOM {roomId} · {lobbyPlayers.length}/5 spelers</div>
        </div>

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lobbyPlayers.map((name, i) => {
            const isReady = readyIndices.includes(i);
            const isMe = i === myPlayerIndex;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isMe ? 'rgba(255,202,40,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(255,202,40,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '10px 14px' }}>
                <Avatar name={name} color={isMe ? ACCENT : '#4285F4'} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}{isMe ? ` ${t.youParen}` : ''}</div>
                </div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: isReady ? ACCENT : 'rgba(238,242,255,0.2)' }}>
                  {isReady ? t.readyDone : t.waitDots}
                </div>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 2 - lobbyPlayers.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 14, padding: '10px 14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.1)' }} />
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.2)' }}>{t.waitingForPlayer}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }}
          style={{ padding: "8px 20px", borderRadius: 50, border: `1px solid ${inviteCopied ? "rgba(255,202,40,0.4)" : "rgba(255,255,255,0.1)"}`, background: 'transparent', color: inviteCopied ? ACCENT : "rgba(238,242,255,0.35)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
        >
          {inviteCopied ? t.inviteCopied : t.invitePlayers}
        </button>

        <button
          onClick={handleReady}
          disabled={iAmReady}
          style={{ padding: '14px 48px', borderRadius: 50, border: 'none', background: iAmReady ? 'rgba(255,202,40,0.15)' : ACCENT, color: iAmReady ? ACCENT : '#1a0d00', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18, cursor: iAmReady ? 'default' : 'pointer', boxShadow: iAmReady ? 'none' : '0 0 24px rgba(255,202,40,0.4), 0 4px 0 #7A4A10', transition: 'all 0.2s' }}
        >
          {iAmReady ? t.readyDone : t.readyBtn}
        </button>

        <BottomNav chatMode="popup" items={[
          { label: t.home, icon: "home", onClick: () => router.push("/") },
          { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=qwixx") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
        ]} />
      </div>
    );
  }

  // ── COUNTDOWN SCREEN ───────────────────────────────────────────────────────

  if (screenPhase === 'countdown') {
    const p1 = myPlayerIndex === 0 ? myName : opponentName;
    const p2 = myPlayerIndex === 0 ? opponentName : myName;
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar name={p1 || '?'} color={ACCENT} size={64} online="green" />
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p1 || '?'}</span>
          </div>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 22, color: 'rgba(238,242,255,0.3)' }}>vs</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar name={p2 || '?'} color="#4285F4" size={64} />
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p2 || '?'}</span>
          </div>
        </div>
        <div key={countdown} style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 100, fontWeight: 700, color: 'var(--text)', lineHeight: 1, animation: 'countPop 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {countdown}
        </div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.3)' }}>{t.gameStarting}</div>
        <style>{`@keyframes countPop { from { transform: scale(1.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  // ── START SCREEN (no room) ─────────────────────────────────────────────────

  if (screenPhase === 'start' || !gs) {
    return (
      <KriskrasStartScreen
        onStart={(names, ai) => {
          setMyPlayerIndex(0);
          setVsAI(ai);
          setGs(newGame(names));
          setScreenPhase('playing');
        }}
      />
    );
  }

  // ── PLAYING SCREEN ─────────────────────────────────────────────────────────

  const showWaitingForOpponent = roomId && !isActivePlayer && gs.phase === 'rolling';
  const activePlayer = gs.players[gs.currentPlayer];

  return (
    <div style={{
      width: '100vw', minHeight: '100dvh',
      background: 'var(--bg-gradient)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 80, paddingBottom: 76,
      userSelect: 'none',
    }}>

      {/* Fixed header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', justifyContent: 'center',
        padding: '10px 8px',
        background: 'linear-gradient(to bottom, rgba(8,11,32,0.9) 60%, transparent)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 0, overflow: 'hidden' }}>
            {gs.players.map((p, i) => (
              <PlayerCard key={i} player={p} active={i === gs.currentPlayer} avatarId={playerAvatars[p.name]} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <button onClick={() => setShowRules(true)} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(238,242,255,0.5)', fontSize: 15, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
            {roomId ? (
              <GameControls
                roomId={roomId}
                myName={gs.players[myPlayerIndex]?.name ?? "Speler"}
                playerNames={gs.players.map(p => p.name)}
                gameType="qwixx"
                isGameOver={gs.phase === 'gameover' || forfeitWinner !== null}
                myPlayerIndex={myPlayerIndex}
                accent="#FFCA28"
                onResign={() => {
                  getSocket().emit("resign");
                  setForfeitWinner(gs!.players.find((_, i) => i !== myPlayerIndex)?.name ?? "Tegenstander");
                }}
                inHeader
              />
            ) : (
              <button
                onClick={() => router.push('/')}
                style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.18)', color: 'rgba(255,100,100,0.6)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l16 16M4 20L20 4"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Turn indicator + board toggle */}
      <div style={{ width: '100%', maxWidth: 500, padding: '0 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Board toggle — only show when multiple players */}
          {gs.players.length > 1 && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 3, gap: 2, flexShrink: 0 }}>
              {gs.players.map((p, i) => {
                const active = (viewingIndex ?? myPlayerIndex) === i;
                return (
                  <button
                    key={i}
                    onClick={() => setViewingIndex(i === myPlayerIndex ? null : i)}
                    style={{
                      border: 'none', borderRadius: 16, padding: '4px 10px', cursor: 'pointer',
                      background: active ? 'rgba(255,202,40,0.18)' : 'transparent',
                      color: active ? '#FFCA28' : 'rgba(238,242,255,0.3)',
                      fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 11,
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {i === myPlayerIndex ? t.myBoard : p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main game board */}
      <div style={{ width: '100%', maxWidth: 500, padding: '0 12px' }}>
        <GameBoard
          gs={gs}
          myPlayerIndex={myPlayerIndex}
          displayPlayerIndex={viewingIndex ?? myPlayerIndex}
          isMyTurn={isMyTurn}
          vsAI={vsAI}
          pendingCross={myTurnCross}
          rolling={rollingDice}
          onRoll={handleRoll}
          onCrossWhite={handleCrossWhite}
          onCrossColor={handleCrossColor}
          onConfirm={handleConfirm}
          onPass={handlePass}
          waitingFor={showWaitingForOpponent ? (opponentName || activePlayer.name) : undefined}
        />
      </div>

      {/* Forfeit overlay */}
      {forfeitWinner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,2,0,0.92)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 200 }}>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: '#FFCA28' }}>{t.gameOver}</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: 'rgba(238,242,255,0.6)' }}>{forfeitWinner} {t.winsShort}</div>
          <button onClick={() => router.push('/lobby?game=qwixx')} style={{ padding: '12px 36px', borderRadius: 50, border: 'none', background: ACCENT, color: '#1a0d00', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
            {t.backToLobby}
          </button>
        </div>
      )}

      <BottomNav chatMode="popup" items={[
        { label: t.home,   icon: "home", onClick: () => router.push("/") },
        { label: t.lobby,  icon: "lobby", onClick: () => router.push("/lobby?game=qwixx") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
        { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
      ]} />

      {/* Spelregels */}
      {(() => {
        const RULES = t.kriskrasRules;
        const filtered = rulesSearch.trim()
          ? RULES.filter(([, title, text]) =>
              title.toLowerCase().includes(rulesSearch.toLowerCase()) ||
              text.toLowerCase().includes(rulesSearch.toLowerCase()))
          : null;
        return (
          <BottomSheet
            isOpen={showRules}
            onClose={() => { setShowRules(false); setRulesSearch(''); setActiveRuleTab(0); }}
            sheetStyle={{ background: '#131209', border: '1px solid rgba(255,202,40,0.2)', borderRadius: '24px 24px 0 0' }}
          >
            {(close) => (<>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div style={{ padding: '8px 20px 0', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: '#FFCA28', marginBottom: 12 }}>{t.gameRules('Kriskras')}</div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45, pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="#EEF2FF" strokeWidth="2"/>
                    <path d="M14 14l3.5 3.5" stroke="#EEF2FF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input value={rulesSearch} onChange={e => setRulesSearch(e.target.value)} placeholder={t.searchPlaceholder}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: 12, padding: '9px 14px 9px 36px', color: '#EEF2FF', fontFamily: "'Nunito', sans-serif", fontSize: 13, outline: 'none' }} />
                  {rulesSearch && <button onClick={() => setRulesSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(238,242,255,0.4)', fontSize: 16, lineHeight: 1 }}>×</button>}
                </div>
                {!filtered && (
                  <div style={{ position: 'relative', margin: '0 -20px' }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, paddingTop: 4, paddingLeft: 20, paddingRight: 20, scrollbarWidth: 'none', maskImage: 'linear-gradient(to right, transparent 0px, black 56px, black calc(100% - 56px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 56px, black calc(100% - 56px), transparent 100%)' }}>
                      {RULES.map(([icon, title], i) => (
                        <button key={title} onClick={() => setActiveRuleTab(i)} style={{ flexShrink: 0, padding: '5px 13px', borderRadius: 50, border: 'none', background: activeRuleTab === i ? '#FFCA28' : 'transparent', outline: activeRuleTab === i ? 'none' : '1px solid rgba(255,202,40,0.25)', color: activeRuleTab === i ? '#1A1000' : 'rgba(255,202,40,0.85)', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                        <div key={title} style={{ marginBottom: 12, padding: '14px 16px', background: 'rgba(255,202,40,0.07)', border: '1px solid rgba(255,202,40,0.18)', borderRadius: 14 }}>
                          <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, color: '#FFCA28', marginBottom: 5 }}>{icon} {title}</div>
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
                            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 26, color: '#FFCA28', marginBottom: 12, textAlign: 'center' }}>{title}</div>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: 'rgba(238,242,255,0.85)', lineHeight: 1.75, textAlign: 'center' }}>{text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0', flexShrink: 0 }}>
                      {RULES.map((_, di) => (
                        <div key={di} onClick={() => setActiveRuleTab(di)} style={{ width: di === activeRuleTab ? 20 : 7, height: 7, borderRadius: 4, background: di === activeRuleTab ? '#FFCA28' : 'rgba(255,255,255,0.18)', transition: 'all 0.2s', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!filtered && (
                <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setActiveRuleTab(i => Math.max(0, i - 1))} disabled={activeRuleTab === 0} style={{ flex: 1, padding: '11px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: activeRuleTab === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(238,242,255,0.7)', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, cursor: activeRuleTab === 0 ? 'default' : 'pointer' }}>{t.previous}</button>
                  <button onClick={() => activeRuleTab < RULES.length - 1 ? setActiveRuleTab(i => i + 1) : close()} style={{ flex: 2, padding: '11px', borderRadius: 50, border: 'none', background: '#FFCA28', color: '#1A1000', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 0 #9A7800' }}>{activeRuleTab < RULES.length - 1 ? t.nextBtn : t.closeConfirm}</button>
                </div>
              )}
              {filtered && (
                <div style={{ padding: '12px 20px 20px', flexShrink: 0 }}>
                  <button onClick={close} style={{ width: '100%', padding: '11px', borderRadius: 50, border: 'none', background: '#FFCA28', color: '#1A1000', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #9A7800' }}>{t.closeBtn}</button>
                </div>
              )}
            </>)}
          </BottomSheet>
        );
      })()}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slide-up { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function KriskrasPage() {
  return (
    <Suspense>
      <KriskrasContent />
    </Suspense>
  );
}

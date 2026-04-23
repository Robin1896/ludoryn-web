"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect, Suspense } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav, TurnTimer, Avatar, GamePlayerCard } from "@/components/ui";
import { useTurnTimer } from "@/lib/useTurnTimer";
import GameControls from "@/components/GameControls";
import BottomSheet from "@/components/BottomSheet";
import DieFace, { BugIcon } from "@/components/DieFace";
import WaitingScreen from "@/components/WaitingScreen";
import { getActiveLevel, setActiveLevel as saveLevelToStorage, LEVELS, LevelId } from "@/lib/levels";
import { useLang } from "@/lib/lang";
import {
  DiceFace,
  GameState,
  Tile,
  Player,
  newGame,
  rollN,
  pickFace,
  isBust,
  canClaim,
  performClaim,
  performBust,
  totalWorms,
  aiBestFace,
  aiShouldClaim,
  determineWinner,
} from "@/lib/grub";


// ─────────────────────────────────────────────────────────────────────────────
// Tile Card
// ─────────────────────────────────────────────────────────────────────────────

function tileColors(worms: number): { bg: string; glow: string; border: string; num: string; shine: string; img: string } {
  if (worms === 1) return { bg: '#dde5f0', glow: 'transparent', border: '#b8c8de', num: '#2c4a70', shine: 'transparent', img: 'blue' };
  if (worms === 2) return { bg: '#d4e8d8', glow: 'transparent', border: '#a8ccae', num: '#2d5c35', shine: 'transparent', img: 'green' };
  if (worms === 3) return { bg: '#f2ddd4', glow: 'transparent', border: '#d9b5a4', num: '#7a3018', shine: 'transparent', img: 'orange' };
  return { bg: '#ede8d0', glow: 'transparent', border: '#c8bc88', num: '#6b5500', shine: 'transparent', img: 'gold' };
}

function TileCard({ tile, highlight = false, compact = false }: {
  tile: Tile;
  highlight?: boolean;
  compact?: boolean;
}) {
  const w = compact ? 30 : 38;
  const h = compact ? 38 : 56;
  const ref = useRef<HTMLDivElement>(null);
  const wasAvailable = useRef(tile.available);

  // Animate when a tile gets claimed (available → false)
  useEffect(() => {
    if (!tile.available && wasAvailable.current && ref.current) {
      gsap.to(ref.current, {
        scale: 0.6, opacity: 0, duration: 0.28, ease: 'power2.in',
      });
    }
    wasAvailable.current = tile.available;
  }, [tile.available]);

  if (!tile.available) {
    return (
      <div ref={ref} style={{
        width: w, height: h, borderRadius: 0,
        background: 'var(--card2)',
        border: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!compact && (
          <span style={{
            fontFamily: "var(--font-body)", fontWeight: 600,
            fontSize: 13, color: 'var(--text-faint)',
            letterSpacing: '-0.01em',
          }}>{tile.value}</span>
        )}
      </div>
    );
  }

  const c = tileColors(tile.worms);

  // Mount animation for available tiles
  useLayoutEffect(() => {
    if (!ref.current || compact) return;
    gsap.fromTo(ref.current,
      { scale: 0.7, opacity: 0, y: 6 },
      { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: 'back.out(1.8)' }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} style={{
      width: w, height: h,
      borderRadius: 0,
      background: highlight ? '#d4e8d8' : c.bg,
      border: `1.5px solid ${highlight ? '#2d5c35' : c.border}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', gap: 3, paddingTop: 8, paddingBottom: 6,
      boxShadow: 'none',
      transition: 'all 0.2s',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* shine overlay */}
      {!compact && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)', borderRadius: '0', pointerEvents: 'none' }} />}
      <span style={{
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: compact ? 11 : 17,
        color: highlight ? '#2d5c35' : c.num,
        lineHeight: 1,
        textShadow: 'none',
        letterSpacing: '-0.01em',
        zIndex: 1,
      }}>{tile.value}</span>
      {compact ? (
        <span style={{ display: 'flex', gap: 1, zIndex: 1 }}>
          {Array.from({ length: tile.worms }).map((_, i) => <BugIcon key={i} size={7} color={highlight ? '#fca5a5' : '#ef4444'} />)}
        </span>
      ) : tile.worms === 3 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, zIndex: 1 }}>
          <BugIcon size={10} color={highlight ? '#fca5a5' : '#ef4444'} />
          <span style={{ display: 'flex', gap: 1 }}>
            <BugIcon size={10} color={highlight ? '#fca5a5' : '#ef4444'} />
            <BugIcon size={10} color={highlight ? '#fca5a5' : '#ef4444'} />
          </span>
        </div>
      ) : tile.worms === 4 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, zIndex: 1 }}>
          <span style={{ display: 'flex', gap: 1 }}>
            <BugIcon size={10} color={highlight ? '#fca5a5' : '#ef4444'} />
            <BugIcon size={10} color={highlight ? '#fca5a5' : '#ef4444'} />
          </span>
          <span style={{ display: 'flex', gap: 1 }}>
            <BugIcon size={10} color={highlight ? '#fca5a5' : '#ef4444'} />
            <BugIcon size={10} color={highlight ? '#fca5a5' : '#ef4444'} />
          </span>
        </div>
      ) : (
        <span style={{ display: 'flex', gap: 1, zIndex: 1 }}>
          {Array.from({ length: tile.worms }).map((_, i) => <BugIcon key={i} size={10} color={highlight ? '#fca5a5' : '#ef4444'} />)}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Card
// ─────────────────────────────────────────────────────────────────────────────

function PlayerCard({ player, active, avatarId }: { player: Player; active: boolean; avatarId?: string | null }) {
  const topTile = player.stack[player.stack.length - 1];
  const worms = totalWorms(player);
  const wormRef = useRef<HTMLSpanElement>(null);
  const prevWorms = useRef(worms);

  // Animate when worm count increases
  useEffect(() => {
    if (worms > prevWorms.current && wormRef.current) {
      gsap.fromTo(wormRef.current,
        { scale: 1.6, color: '#00FF99' },
        { scale: 1, color: active ? '#00C875' : 'var(--text-muted)', duration: 0.45, ease: 'back.out(2)' }
      );
    }
    prevWorms.current = worms;
  }, [worms, active]);

  return (
    <GamePlayerCard
      name={player.name}
      avatarId={avatarId}
      active={active}
      accent="#00C875"
      scoreLabel={
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span ref={wormRef}>{worms}</span>
          <BugIcon size={12} color={active ? '#f87171' : '#ef4444'} />
        </span>
      }
    >
      {topTile && <TileCard tile={topTile} compact />}
    </GamePlayerCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2D Game Board (alles in één venster)
// ─────────────────────────────────────────────────────────────────────────────

interface GameBoardProps {
  gs: GameState;
  rolling: boolean;
  onPick?: (face: DiceFace) => void;
  isMyTurn: boolean;
  vsAI: boolean;
  onRoll: () => void;
  onStop: () => void;
  onBust: () => void;
  onRestart: () => void;
  waitingFor?: string;
  timeLeft?: number | null;
  gameMode?: 'fast' | 'slow';
  onShowRules: () => void;
  onShowLevelSwitch: () => void;
  activeLevelId: LevelId; // kept for future use
}

function GameBoard({ gs, rolling, onPick, isMyTurn, vsAI, onRoll, onStop, onBust, onRestart, waitingFor, timeLeft, gameMode }: GameBoardProps) {
  const { t, lang } = useLang();
  const { turn, tiles, players, currentPlayer, phase } = gs;
  const cp = players[currentPlayer];
  const claim = canClaim(gs);
  const claimValue = claim?.tile.value ?? null;
  const canStop = !!claim && (phase === 'rolled' || phase === 'idle');

  const pickableFaces = new Set<DiceFace>(
    turn.rolled.filter(f => !turn.usedFaces.includes(f))
  );

  const pickableFacesSorted = Array.from(
    new Set(turn.rolled.filter(f => !turn.usedFaces.includes(f)))
  ) as DiceFace[];
  pickableFacesSorted.sort((a, b) => {
    if (a === 'W') return 1;
    if (b === 'W') return -1;
    return (a as number) - (b as number);
  });

  // GSAP handles rolling animation — no frame cycling needed

  // Staging: index-based so the exact clicked die is tracked (fixes last-die bug + allows undo)
  const [stagingIndices, setStagingIndices] = useState<Set<number>>(new Set());
  useEffect(() => { setStagingIndices(new Set()); }, [phase, rolling]);

  // Shake kept dice on bust
  const keptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === 'bust' && keptRef.current) {
      gsap.fromTo(keptRef.current,
        { x: 0 },
        { x: 8, duration: 0.07, yoyo: true, repeat: 7, ease: 'power1.inOut',
          onComplete: () => { gsap.set(keptRef.current!, { x: 0 }); } }
      );
    }
  }, [phase]);

  // Derive stagingFace for label display
  const stagedFacesSet = new Set(Array.from(stagingIndices).map(i => turn.rolled[i]));
  const stagingFace: DiceFace | null = stagedFacesSet.size === 1 ? [...stagedFacesSet][0] : null;

  function handleDieClick(face: DiceFace, index: number) {
    if (!onPick) return;

    // Toggle staged state — always allow undo
    if (stagingIndices.has(index)) {
      const next = new Set(stagingIndices);
      next.delete(index);
      setStagingIndices(next);
      return;
    }

    // Clicking a different face while staging → clear and start fresh
    if (stagingFace !== null && stagingFace !== face) {
      setStagingIndices(new Set([index]));
      return;
    }

    const next = new Set(stagingIndices);
    next.add(index);
    setStagingIndices(next);
  }

  function confirmPick() {
    if (!onPick || !stagingFace) return;
    setStagingIndices(new Set());
    onPick(stagingFace);
  }

  const displayRolled = turn.rolled;

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 0, cursor: 'pointer',
    fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: 13, padding: '9px 0', flex: 1,
    boxShadow: '0 4px 0 rgba(0,0,0,0.4)',
    transition: 'transform 0.1s, box-shadow 0.1s',
  };

  return (
    <div style={{
      width: '100%', maxWidth: 520,
      flex: 1,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Tile grid ── */}
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {tiles.slice(0, 8).map(tile => (
              <TileCard key={tile.value} tile={tile} highlight={tile.value === claimValue} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {tiles.slice(8, 16).map(tile => (
              <TileCard key={tile.value} tile={tile} highlight={tile.value === claimValue} />
            ))}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Dice area ── */}
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{
          background: 'var(--card2)',
          border: '1px solid var(--border)',
          borderRadius: 0, padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Bewaard — altijd zichtbaar */}
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 7, color: turn.kept.length > 0 ? 'rgba(0,200,117,0.5)' : 'var(--text-faint)' }}>{t.kept}</div>
            <div ref={keptRef} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
              {turn.kept.map((face, i) => <DieFace key={i} face={face} size={35} picked />)}
              {Array.from({ length: Math.max(0, 8 - turn.kept.length) }).map((_, i) => (
                <div key={`kp-${i}`} style={{ width: 35, height: 35, borderRadius: 0, background: 'var(--card2)', border: '1px dashed var(--border)', flexShrink: 0 }} />
              ))}
            </div>
          </div>
          {/* Gegooid — altijd zichtbaar */}
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 7, color: rolling ? 'rgba(251,191,36,0.5)' : stagingFace ? 'rgba(251,191,36,0.65)' : displayRolled.length > 0 ? 'var(--text-muted)' : 'var(--text-faint)' }}>
              {rolling ? t.rolling : stagingFace ? t.clickAll(String(stagingFace)) : displayRolled.length > 0 ? t.pickDie : t.rollDice}
            </div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
              {displayRolled.map((face, i) => {
                const isPickable = !rolling && phase === 'rolled' && pickableFaces.has(face) && isMyTurn && !!onPick;
                const isStaged = stagingIndices.has(i);
                const isPending = !!stagingFace && stagingFace === face && !isStaged && isPickable;
                const isDimmed = !!stagingFace && stagingFace !== face && isPickable;
                return (
                  <div key={i} style={{ position: 'relative', opacity: isDimmed ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                    <DieFace
                      face={face} size={35}
                      picked={isStaged}
                      pickable={isPickable && !isStaged}
                      onClick={isPickable || isStaged ? () => handleDieClick(face, i) : undefined}
                      animIndex={i}
                      rolling={rolling}
                    />
                    {isPending && (
                      <div style={{ position: 'absolute', inset: -3, borderRadius: 0, border: '2px solid rgba(251,191,36,0.8)', boxShadow: '0 0 10px rgba(251,191,36,0.4)', pointerEvents: 'none' }} />
                    )}
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, 8 - displayRolled.length) }).map((_, i) => (
                <div key={`rp-${i}`} style={{ width: 35, height: 35, borderRadius: 0, background: 'var(--card2)', border: '1px dashed var(--border)', flexShrink: 0 }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ padding: '8px 14px 16px' }}>
        {phase === 'gameover' ? (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 700, color: '#00C875', marginBottom: 8 }}>{t.gameOver}</div>
            {(() => {
              const winnerName = determineWinner(players);
              return players.map((p, i) => (
                <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>
                  {p.name}: {totalWorms(p)}{' '}
                  <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}><BugIcon size={12} /></span>
                  {p.name === winnerName && <span style={{ color: '#00C875', marginLeft: 6, fontWeight: 700 }}>{t.winner}</span>}
                </div>
              ));
            })()}
            <button onClick={onRestart} style={{ ...btnBase, marginTop: 12, background: '#00C875', color: '#052e16', padding: '11px 32px', flex: 'unset', boxShadow: '0 4px 0 #007A47' }}>
              {t.playAgain}
            </button>
          </div>
        ) : phase === 'bust' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: '#FF5252', marginBottom: vsAI && currentPlayer === 1 ? 0 : 10 }}>
              {vsAI && currentPlayer === 1 ? t.aiBust : t.bust}
            </div>
            {!(vsAI && currentPlayer === 1) && (
              <button onClick={onBust} style={{ ...btnBase, background: '#FF5252', color: '#fff', padding: '11px 28px', flex: 'unset', boxShadow: '0 4px 0 #B03A3A' }}>{t.continueBtn}</button>
            )}
          </div>
        ) : waitingFor ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'pulse 1.2s infinite' }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: 'var(--text-muted)' }}>{t.waitingFor(waitingFor!)}</span>
            </div>
            {timeLeft !== null && timeLeft !== undefined && gameMode && (
              <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={false} accent="var(--accent)" />
            )}
          </div>
        ) : vsAI && currentPlayer === 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', boxShadow: '0 0 8px var(--text-muted)' }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: 'var(--text-muted)' }}>{t.aiThinking}</span>
          </div>
        ) : (
          <div>
            {timeLeft !== null && timeLeft !== undefined && gameMode && (
              <div style={{ marginBottom: 10 }}>
                <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={!!isMyTurn} accent="#22C55E" />
              </div>
            )}

            {/* Status chips */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card2)', borderRadius: 0, padding: '4px 10px' }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: 'var(--text-muted)' }}>{t.total}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{turn.total}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: turn.hasWorm ? 'rgba(0,200,117,0.08)' : 'rgba(255,82,82,0.08)', border: `1px solid ${turn.hasWorm ? 'rgba(0,200,117,0.2)' : 'rgba(255,82,82,0.2)'}`, borderRadius: 0, padding: '4px 10px' }}>
                <BugIcon size={14} color={turn.hasWorm ? '#22c55e' : '#ef4444'} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: turn.hasWorm ? '#00C875' : '#FF5252' }}>{turn.hasWorm ? 'OK' : t.needed}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card2)', borderRadius: 0, padding: '4px 10px' }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: 'var(--text-muted)' }}>{t.dice}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{turn.diceLeft}</span>
              </div>
            </div>

            {/* Main action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {phase === 'rolled' ? (
                <button onClick={confirmPick} disabled={stagingIndices.size === 0} style={{
                  ...btnBase,
                  background: stagingIndices.size > 0 ? '#00C875' : 'var(--card2)',
                  color: stagingIndices.size > 0 ? '#052e16' : 'var(--text-faint)',
                  boxShadow: stagingIndices.size > 0 ? '0 4px 0 #007A47' : 'none',
                  cursor: stagingIndices.size > 0 ? 'pointer' : 'not-allowed',
                  fontSize: 14, padding: '12px 0',
                }}>
                  ✓ {t.confirm}
                </button>
              ) : (
              <button onClick={onRoll} disabled={rolling || turn.diceLeft === 0}
                style={{
                  ...btnBase,
                  background: rolling || turn.diceLeft === 0 ? 'var(--card2)' : 'var(--accent)',
                  color: rolling || turn.diceLeft === 0 ? 'var(--text-faint)' : '#fff',
                  border: 'none',
                  boxShadow: rolling || turn.diceLeft === 0 ? 'none' : '0 4px 0 rgba(0,0,0,0.3)',
                  cursor: rolling || turn.diceLeft === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  padding: '12px 0',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <rect x="1" y="1" width="18" height="18" rx="4" fill="white" opacity="0.95"/>
                    <circle cx="6" cy="6" r="1.8" fill="#1a1a2e"/>
                    <circle cx="14" cy="14" r="1.8" fill="#1a1a2e"/>
                    <circle cx="14" cy="6" r="1.8" fill="#1a1a2e"/>
                    <circle cx="6" cy="14" r="1.8" fill="#1a1a2e"/>
                  </svg>
                  {rolling ? t.rolling : t.roll}
                </span>
              </button>
              )}
              <button onClick={onStop} disabled={!canStop}
                style={{
                  ...btnBase,
                  background: canStop ? '#00C875' : 'var(--card2)',
                  color: canStop ? '#052e16' : 'var(--text-faint)',
                  border: 'none',
                  boxShadow: canStop ? '0 4px 0 #007A47' : 'none',
                  cursor: canStop ? 'pointer' : 'not-allowed',
                  fontSize: 14,
                  padding: '12px 0',
                }}>
                {t.stop}{claim ? ` (${claim.tile.value})` : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD (unused — controls zijn ingebouwd in GameBoard)
// ─────────────────────────────────────────────────────────────────────────────

interface HUDProps {
  gs: GameState;
  rolling: boolean;
  vsAI: boolean;
  onRoll: () => void;
  onPick: (face: DiceFace) => void;
  onStop: () => void;
  onBust: () => void;
  onRestart: () => void;
  isMyTurn?: boolean;
  waitingFor?: string;
  timeLeft?: number | null;
  gameMode?: 'fast' | 'slow';
}

function HUD({ gs, rolling, vsAI, onRoll, onPick, onStop, onBust, onRestart, isMyTurn = true, waitingFor, timeLeft, gameMode }: HUDProps) {
  const { t } = useLang();
  const { turn, players, currentPlayer, phase } = gs;
  const cp = players[currentPlayer];
  const claim = canClaim(gs);
  const canStop = !!claim && (phase === 'rolled' || phase === 'idle');

  const pickableFaces = Array.from(
    new Set(turn.rolled.filter((f) => !turn.usedFaces.includes(f)))
  ) as DiceFace[];
  pickableFaces.sort((a, b) => {
    if (a === 'W') return 1;
    if (b === 'W') return -1;
    return (a as number) - (b as number);
  });

  const glass: React.CSSProperties = {
    background: 'var(--card)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border)',
    borderBottom: 'none',
    borderRadius: '0',
    padding: '6px 12px',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
  };

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 0, cursor: 'pointer',
    fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: 12, padding: '7px 0', flex: 1,
    boxShadow: '0 4px 0 rgba(0,0,0,0.4)',
    transition: 'transform 0.1s, box-shadow 0.1s',
  };

  return (
    <div style={{ position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', width: 'min(420px, calc(100vw - 32px))', zIndex: 10 }}>
      {phase === 'gameover' ? (
        <div style={{ ...glass, textAlign: 'center' }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: '#00C875', marginBottom: 6 }}>
            {t.gameOver}
          </div>
          {(() => {
            const winnerName = determineWinner(players);
            return players.map((p, i) => (
              <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                {p.name}: {totalWorms(p)}
                {p.name === winnerName && (
                  <span style={{ color: '#00C875', marginLeft: 6, fontWeight: 700 }}>{t.winner}</span>
                )}
              </div>
            ));
          })()}
          <button onClick={onRestart} style={{ ...btnBase, marginTop: 8, background: '#00C875', color: '#052e16', padding: '7px 24px', flex: 'unset', boxShadow: '0 4px 0 #007A47' }}>
            Opnieuw
          </button>
        </div>
      ) : phase === 'bust' ? (
        <div style={{ ...glass, textAlign: 'center' }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700, color: '#FF5252', marginBottom: vsAI && currentPlayer === 1 ? 0 : 8 }}>
            {vsAI && currentPlayer === 1 ? t.aiBust : t.bust}
          </div>
          {!(vsAI && currentPlayer === 1) && (
            <button onClick={onBust} style={{ ...btnBase, background: '#FF5252', color: '#fff', padding: '7px 24px', flex: 'unset', boxShadow: '0 4px 0 #B03A3A' }}>
              {t.continueBtn}
            </button>
          )}
        </div>
      ) : waitingFor ? (
        <div style={{ ...glass, textAlign: 'center', padding: '8px 16px' }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: 'var(--text-muted)' }}>
            {t.waitingFor(waitingFor!)}
          </div>
        </div>
      ) : vsAI && currentPlayer === 1 ? (
        <div style={{ ...glass, textAlign: 'center', padding: '8px 16px' }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: 'var(--text-muted)' }}>AI speelt...</div>
        </div>
      ) : (
        <div style={glass}>
          {timeLeft !== null && timeLeft !== undefined && gameMode && (
            <div style={{ marginBottom: 4 }}>
              <TurnTimer timeLeft={timeLeft} gameMode={gameMode} isMyTurn={!!isMyTurn} accent="#22C55E" />
            </div>
          )}
          {/* Status line */}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, display: 'flex', gap: 12 }}>
            <span style={{ color: 'var(--accent)', fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 11 }}>{cp.name}</span>
            <span>totaal <strong style={{ color: 'var(--text)' }}>{turn.total}</strong></span>
            <span>worm <strong style={{ color: turn.hasWorm ? '#4ADE80' : '#F87171' }}>{turn.hasWorm ? '✓' : '✗'}</strong></span>
            <span><strong style={{ color: 'var(--text)' }}>{turn.diceLeft}</strong>d over</span>
          </div>

          {/* Face pick buttons */}
          {phase === 'rolled' && pickableFaces.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
              {pickableFaces.map((face) => {
                const count = turn.rolled.filter((f) => f === face).length;
                return (
                  <button
                    key={face}
                    onClick={() => onPick(face)}
                    style={{
                      background: 'var(--card2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      borderRadius: 0, padding: '4px 10px',
                      fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 13,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36,
                    }}
                  >
                    <span>{face}</span>
                    <span style={{ fontSize: 8, opacity: 0.5, marginTop: 1 }}>×{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onRoll}
              disabled={rolling || phase === 'rolled' || turn.diceLeft === 0}
              style={{
                ...btnBase,
                background: rolling || phase === 'rolled' || turn.diceLeft === 0 ? 'var(--card2)' : 'var(--accent)',
                color: rolling || phase === 'rolled' || turn.diceLeft === 0 ? 'var(--text-faint)' : '#fff',
                border: rolling || phase === 'rolled' || turn.diceLeft === 0 ? '1px solid var(--border)' : 'none',
                cursor: rolling || phase === 'rolled' || turn.diceLeft === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {rolling ? t.rolling : t.roll}
            </button>
            <button
              onClick={onStop}
              disabled={!canStop}
              style={{
                ...btnBase,
                background: canStop ? '#00C875' : 'var(--card2)',
                color: canStop ? '#052e16' : 'var(--text-faint)',
                border: 'none',
                boxShadow: canStop ? '0 4px 0 #007A47' : 'none',
                cursor: canStop ? 'pointer' : 'not-allowed',
              }}
            >
              {t.stop}{claim ? ` (${claim.tile.value})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Emoji Bar
// ─────────────────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ['😂','🔥','💀','😤','🤡','👀','🫡','🐛','😈','🎲','💯','😭','🙈','⚡','👑','🫶','🤌','💅','🥶','🤯','🫠','🗿'];

interface FloatingEmoji { id: number; emoji: string; x: number; fromOpponent?: boolean; }

function playEmojiSound(emoji: string) {
  try {
    const ctx = new AudioContext();
    ctx.resume().then(() => _playEmojiSound(ctx, emoji));
  } catch { /* blocked autoplay */ }
}

function _playEmojiSound(ctx: AudioContext, emoji: string) {
  try {
    const t = ctx.currentTime;

    function osc(type: OscillatorType, freq: number, dur: number, vol = 0.18, last = true) {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur);
      if (last) o.onended = () => ctx.close();
      return o;
    }

    switch (emoji) {
      case '😂': { // bouncy laugh
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine';
        [300,500,320,540,360].forEach((f, i) => o.frequency.setValueAtTime(f, t + i * 0.06));
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.start(t); o.stop(t + 0.35); o.onended = () => ctx.close(); break; }
      case '🔥': { // fire crackle (noise)
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*(1-i/d.length);
        const src = ctx.createBufferSource(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
        src.buffer = buf; src.connect(f); f.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.4, t); src.start(t); src.onended = () => ctx.close(); break; }
      case '💀': { // low descending
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.5);
        g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.start(t); o.stop(t + 0.5); o.onended = () => ctx.close(); break; }
      case '😤': { // angry square buzz
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'square';
        o.frequency.setValueAtTime(110, t); o.frequency.setValueAtTime(115, t+0.05); o.frequency.setValueAtTime(108, t+0.1);
        g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.start(t); o.stop(t + 0.22); o.onended = () => ctx.close(); break; }
      case '🤡': { // silly ascending toot
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'triangle';
        [350,500,700,450].forEach((f, i) => o.frequency.setValueAtTime(f, t + i * 0.07));
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        o.start(t); o.stop(t + 0.32); o.onended = () => ctx.close(); break; }
      case '👀': { // two blips
        [0, 0.1].forEach((delay, idx) => {
          const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = 900 + idx * 200;
          g.gain.setValueAtTime(0.15, t+delay); g.gain.exponentialRampToValueAtTime(0.001, t+delay+0.06);
          o.start(t+delay); o.stop(t+delay+0.06); if (idx === 1) o.onended = () => ctx.close();
        }); break; }
      case '🐛': { // wobbly low sine
        const o = ctx.createOscillator(); const g = ctx.createGain(); const lfo = ctx.createOscillator(); const lfog = ctx.createGain();
        lfo.frequency.value = 8; lfog.gain.value = 40; lfo.connect(lfog); lfog.connect(o.frequency);
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 220;
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        lfo.start(t); lfo.stop(t+0.5); o.start(t); o.stop(t+0.5); o.onended = () => ctx.close(); break; }
      case '😈': { // dark trill
        [0,0.07,0.14].forEach((delay, idx) => {
          const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type = 'sawtooth'; o.frequency.value = idx % 2 === 0 ? 140 : 160;
          g.gain.setValueAtTime(0.1, t+delay); g.gain.exponentialRampToValueAtTime(0.001, t+delay+0.1);
          o.start(t+delay); o.stop(t+delay+0.1); if (idx===2) o.onended = () => ctx.close();
        }); break; }
      case '🎲': { // dice clicks
        [0,0.09,0.16].forEach((delay, idx) => {
          const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type = 'square'; o.frequency.value = 600 + idx*100;
          g.gain.setValueAtTime(0, t+delay); g.gain.setValueAtTime(0.15, t+delay+0.001); g.gain.exponentialRampToValueAtTime(0.001, t+delay+0.05);
          o.start(t+delay); o.stop(t+delay+0.06); if (idx===2) o.onended = () => ctx.close();
        }); break; }
      case '💯': { // ascending arpeggio
        [523,659,784].forEach((freq, idx) => {
          const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = freq; const d = t + idx*0.07;
          g.gain.setValueAtTime(0, d); g.gain.setValueAtTime(0.14, d+0.01); g.gain.exponentialRampToValueAtTime(0.001, d+0.35);
          o.start(d); o.stop(d+0.35); if (idx===2) o.onended = () => ctx.close();
        }); break; }
      case '😭': { // sad descending wail
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine';
        o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.6);
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.start(t); o.stop(t + 0.6); o.onended = () => ctx.close(); break; }
      case '🙈': { // cartoon boing
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine';
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(800, t + 0.08); o.frequency.exponentialRampToValueAtTime(400, t + 0.2);
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.start(t); o.stop(t + 0.25); o.onended = () => ctx.close(); break; }
      case '⚡': { // electric zap
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth';
        o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.12);
        g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.start(t); o.stop(t + 0.12); o.onended = () => ctx.close(); break; }
      case '👑': { // regal fanfare
        [523,659,523,784].forEach((freq, idx) => {
          const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle'; o.frequency.value = freq; const d = t + idx*0.08;
          g.gain.setValueAtTime(0, d); g.gain.setValueAtTime(0.13, d+0.01); g.gain.exponentialRampToValueAtTime(0.001, d+0.12);
          o.start(d); o.stop(d+0.12); if (idx===3) o.onended = () => ctx.close();
        }); break; }
      case '🫶': { // warm soft chord
        [330,415,523].forEach((freq, idx) => {
          const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = freq;
          g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.5);
          o.start(t); o.stop(t+0.5); if (idx===2) o.onended = () => ctx.close();
        }); break; }
      case '🤌': { // chef's kiss — quick ascending flip
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine';
        o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(1200, t+0.1); o.frequency.exponentialRampToValueAtTime(900, t+0.18);
        g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.22);
        o.start(t); o.stop(t+0.22); o.onended = () => ctx.close(); break; }
      case '💅': { // dismissive little trill
        [700,500,700,400].forEach((freq, idx) => {
          const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type = 'triangle'; o.frequency.value = freq; const d = t + idx*0.055;
          g.gain.setValueAtTime(0.1, d); g.gain.exponentialRampToValueAtTime(0.001, d+0.06);
          o.start(d); o.stop(d+0.07); if (idx===3) o.onended = () => ctx.close();
        }); break; }
      case '🥶': { // shivering vibrato
        const o = ctx.createOscillator(); const g = ctx.createGain(); const lfo = ctx.createOscillator(); const lg = ctx.createGain();
        lfo.frequency.value = 14; lg.gain.value = 20; lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 400;
        g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.5);
        lfo.start(t); lfo.stop(t+0.5); o.start(t); o.stop(t+0.5); o.onended = () => ctx.close(); break; }
      case '🤯': { // mind blown — rising explosion
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth';
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(2000, t+0.18);
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.22);
        o.start(t); o.stop(t+0.22); o.onended = () => ctx.close(); break; }
      case '🫠': { // melting — slow glide down
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine';
        o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(80, t+0.7);
        g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.7);
        o.start(t); o.stop(t+0.7); o.onended = () => ctx.close(); break; }
      case '🗿': { // moai — deep thunk
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = 'sine';
        o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(40, t+0.2);
        g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.25);
        o.start(t); o.stop(t+0.25); o.onended = () => ctx.close(); break; }
      case '🫡': { // salute — crisp military note
        osc('square', 660, 0.06, 0.12, false); osc('square', 880, 0.08, 0.1); break; }
      default: { // generic blip
        osc('sine', 880, 0.18); break; }
    }
  } catch { /* blocked autoplay */ }
}

function EmojiBar({ open, onClose, onSend, incomingEmoji }: { open: boolean; onClose: () => void; onSend?: (emoji: string) => void; incomingEmoji?: { emoji: string; ts: number } | null }) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const nextId = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  // Toon inkomende emoji van tegenstander
  useEffect(() => {
    if (!incomingEmoji) return;
    const id = nextId.current++;
    const barW = barRef.current?.offsetWidth ?? 300;
    const x = (barRef.current?.getBoundingClientRect().left ?? 0) + barW * 0.72;
    playEmojiSound(incomingEmoji.emoji);
    setFloating(prev => [...prev, { id, emoji: incomingEmoji.emoji, x, fromOpponent: true }]);
    const t = setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 1400);
    return () => clearTimeout(t);
  }, [incomingEmoji]);

  function handleClick(emoji: string, e: React.MouseEvent) {
    playEmojiSound(emoji);
    onSend?.(emoji);
    onClose();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = nextId.current++;
    setFloating(prev => [...prev, { id, emoji, x: rect.left + rect.width / 2 }]);
    setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 1400);
  }

  return (
    <>
      {/* Floating emojis */}
      {floating.map(f => (
        <div key={f.id} style={{
          position: 'fixed',
          left: f.x,
          bottom: 130,
          fontSize: 32,
          pointerEvents: 'none',
          zIndex: 500,
          lineHeight: 1,
          animation: 'emoji-float 1.4s ease-out forwards',
        }}>
          {f.emoji}
        </div>
      ))}

      {/* Scrollbare balk — slide-in bij open */}
      <div ref={barRef} style={{
        position: 'fixed',
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        left: 0, right: 0,
        zIndex: 30,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 12px',
        pointerEvents: open ? 'auto' : 'none',
        transform: open ? 'translateY(0)' : 'translateY(16px)',
        opacity: open ? 1 : 0,
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.16s ease',
      }}>
        <div style={{
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          gap: 2,
          padding: '5px 10px',
          background: 'var(--card)',
          backdropFilter: 'blur(14px)',
          borderRadius: 0,
          border: '1px solid var(--border)',
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
        }}>
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={(e) => handleClick(emoji, e)}
              style={{
                background: 'none', border: 'none',
                fontSize: 22, cursor: 'pointer',
                padding: '5px 6px', borderRadius: 0,
                flexShrink: 0, lineHeight: 1,
              }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.animation = 'emoji-pop 0.18s ease'; }}
              onAnimationEnd={(e) => { (e.currentTarget as HTMLElement).style.animation = 'none'; }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start Screen
// ─────────────────────────────────────────────────────────────────────────────

interface StartScreenProps {
  onStart: (names: [string, string], vsAI: boolean) => void;
}

function StartScreen({ onStart }: StartScreenProps) {
  const [name1, setName1] = useState("Robin");
  const [name2, setName2] = useState("Loic");

  const inputStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 0,
    padding: '10px 14px',
    color: 'var(--text)',
    fontFamily: "var(--font-body)",
    fontSize: 15,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ position: 'absolute', top: 20, left: 20 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button style={{
            fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--text-muted)', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 0,
            padding: '6px 14px', cursor: 'pointer',
          }}>
            ← Terug
          </button>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "var(--font-body)", fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 900, letterSpacing: '0.1em',
          color: 'var(--text)',
          margin: '0 0 6px', lineHeight: 0.95,
        }}>KRIEKEL</h1>
        <h1 style={{
          fontFamily: "var(--font-body)", fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 900, letterSpacing: '0.1em', color: 'var(--accent)',
          margin: '0 0 20px', lineHeight: 0.95,
        }}>DUEL</h1>

        <p style={{
          fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600,
          letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--accent)',
          margin: '0 0 40px',
        }}>
          Dobbelstenen · Beestjes · Stelen
        </p>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 0, padding: '28px 24px', textAlign: 'left',
        }}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Speler 1</label>
            <input style={inputStyle} value={name1} onChange={(e) => setName1(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              placeholder="Naam..." />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Speler 2</label>
            <input style={inputStyle} value={name2} onChange={(e) => setName2(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              placeholder="Naam..." />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onStart([name1 || 'Speler 1', name2 || 'Speler 2'], false)}
              style={{
                flex: 1, background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 0, padding: '13px', fontFamily: "var(--font-body)",
                fontWeight: 700, fontSize: 14, letterSpacing: '0.15em',
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >2 Spelers</button>
            <button
              onClick={() => onStart([name1 || 'Speler 1', 'AI'], true)}
              style={{
                flex: 1, background: 'var(--card2)', color: 'var(--accent)',
                border: '1px solid var(--border)', borderRadius: 0, padding: '13px',
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14,
                letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >vs AI</button>
          </div>
        </div>

        <p style={{
          fontFamily: "var(--font-body)", fontSize: 12,
          color: 'var(--text-faint)', margin: '24px 0 0', lineHeight: 1.7,
        }}>
          Gooi dobbelstenen, verzamel beestjes en steel van je tegenstander.
          Maar pas op voor pech!
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

function GrubContent() {
  const { t, lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const aiParam = searchParams.get("ai") === "1";

  const LOCAL_KEY = 'grub-local-gs';
  const LOCAL_AI_KEY = 'grub-local-ai';

  const [screenPhase, setScreenPhase] = useState<'start' | 'waiting' | 'lobby' | 'countdown' | 'playing'>('start');
  const [countdown, setCountdown] = useState(3);
  const pendingGsRef = useRef<GameState | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasGameRef = useRef(false); // true wanneer een gameState geladen is (hervatten)
  const [gs, setGs] = useState<GameState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [vsAI, setVsAI] = useState(false);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [myName, setMyName] = useState("");
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [readyIndices, setReadyIndices] = useState<number[]>([]);
  const [iAmReady, setIAmReady] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [hasResigned, setHasResigned] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState(0);
  const [rulesSearch, setRulesSearch] = useState('');

  const [showLevelSwitch, setShowLevelSwitch] = useState(false);
  const [activeLevelId, setActiveLevelId] = useState<LevelId>(() => getActiveLevel());
  const [incomingEmoji, setIncomingEmoji] = useState<{ emoji: string; ts: number } | null>(null);
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string | null>>({});

  // Fetch avatars for players
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

  // Restore local game state on mount (only for non-room games)
  useEffect(() => {
    if (roomId) return;
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        const ai = localStorage.getItem(LOCAL_AI_KEY) === '1';
        setGs(parsed);
        setVsAI(ai);
        setScreenPhase('playing');
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist local game state on every change
  useEffect(() => {
    if (roomId || !gs) return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(gs));
      localStorage.setItem(LOCAL_AI_KEY, vsAI ? '1' : '0');
    } catch { /* ignore */ }
  }, [gs, vsAI, roomId]);

  useEffect(() => {
    if (!roomId) return;

    const pidx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? "0");
    const myName = sessionStorage.getItem("ludoryn-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setMyName(myName);
    setScreenPhase('waiting');

    const socket = getSocket();

    if (aiParam) {
      setVsAI(true);
      setMyPlayerIndex(pidx);
      const game = newGame([myName, "Tegenstander"]);
      setGs(game);
      setScreenPhase('playing');
      return;
    }

    const pidxRaw = sessionStorage.getItem(`ludoryn-pidx-${roomId}`);
    const needsJoin = pidxRaw === null;

    function rejoin() {
      socket.emit("join-room", { roomId, name: myName }, (res: { ok: boolean; playerIndex?: number; players?: string[]; error?: string; isSpectator?: boolean }) => {
        if (!res.ok) {
          try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /* ignore */ }
          router.push('/lobby?game=grub');
          return;
        }
        const realIdx = res.isSpectator ? -1 : (res.playerIndex ?? pidx);
        if (res.players && res.players.length >= 1) {
          setOpponentName(res.players[realIdx === 0 ? 1 : 0] ?? "");
        }
        if (res.isSpectator) {
          setIsSpectator(true);
          setMyPlayerIndex(-1);
        } else if (res.playerIndex !== undefined) {
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
      // Register cleanup so unmounting during countdown doesn't cause state updates on dead component
      countdownRef.current = iv;
    }

    const onRoomUpdate = ({ players: names, readyIndices: ri }: { players: string[]; readyIndices?: number[]; ready?: boolean; roomId: string }) => {
      setLobbyPlayers(names);
      setReadyIndices(ri ?? []);
      if (names.length >= 2) setOpponentName(names.find((_, i) => i !== pidx) ?? "");
      // Geen lobby-fase als er al een game loopt (hervatten)
      if (names.length >= 2 && !hasGameRef.current) setScreenPhase((prev) => prev === 'waiting' ? 'lobby' : prev);
    };

    socket.on("all-ready", ({ players: names }: { players: string[] }) => {
      setLobbyPlayers(names);
      if (!needsJoin) {
        // Room creator builds the game
        startCountdown(() => {
          const game = newGame(names);
          socket.emit("state-update", { gameState: game });
          setGs(game);
          setScreenPhase('playing');
        });
      } else {
        // Joiners wait for state-update
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
      // Store as pending for joiners waiting in countdown, otherwise apply directly
      if (!pendingGsRef.current) pendingGsRef.current = gameState;
      hasGameRef.current = true;
      setGs(gameState);
      setScreenPhase('playing');
    };

    socket.on("room-update", onRoomUpdate);
    socket.on("state-sync", onStateSync);
    socket.on("state-update", onStateUpdate);

    // Always rejoin so the server knows which room this socket belongs to,
    // even after page navigation (socket stays connected but server loses context).
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

    socket.on("turn-timeout", ({ loserIndex }: { loserIndex: number }) => {
      // Only the non-losing player applies performBust to avoid double-emit
      setGs((prev) => {
        if (!prev || prev.currentPlayer !== loserIndex) return prev;
        const busted = performBust(prev);
        socket.emit("state-update", { gameState: busted });
        return busted;
      });
      setScreenPhase('playing');
    });

    socket.on("react", ({ emoji }: { emoji: string }) => {
      setIncomingEmoji({ emoji, ts: Date.now() });
    });

    return () => {
      socket.off("room-update", onRoomUpdate);
      socket.off("state-sync", onStateSync);
      socket.off("state-update", onStateUpdate);
      socket.off("turn-forfeit");
      socket.off("turn-timeout");
      socket.off("all-ready");
      socket.off("react");
      socket.off("connect", rejoin);
      socket.io.off("reconnect", rejoin);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [roomId, aiParam]); // eslint-disable-line react-hooks/exhaustive-deps

  function emitState(newGs: GameState) {
    if (roomId) getSocket().emit("state-update", { gameState: newGs });
  }

  function handleStart(names: [string, string], ai: boolean) {
    try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
    setVsAI(ai);
    setMyPlayerIndex(0);
    setGs(newGame(names));
    setScreenPhase('playing');
  }

  function handleRestart() {
    hasGameRef.current = false;
    try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /* ignore */ }
    if (roomId) { router.push(`/lobby?game=grub`); return; }
    try { localStorage.removeItem(LOCAL_KEY); localStorage.removeItem(LOCAL_AI_KEY); } catch { /* ignore */ }
    setGs(null);
    setVsAI(false);
    setScreenPhase('start');
  }

  // Actieve room bijhouden zodat home-pagina kan hervatten
  useEffect(() => {
    if (!roomId) return;
    if (screenPhase === 'playing' && gs?.phase !== 'gameover') {
      sessionStorage.setItem('ludoryn-active-room', JSON.stringify({ roomId, gameType: 'grub' }));
    } else if (gs?.phase === 'gameover') {
      try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /* ignore */ }
    }
  }, [roomId, screenPhase, gs?.phase]);

  const isMyTurn = !roomId || (gs !== null && gs.currentPlayer === myPlayerIndex);
  const { timeLeft, gameMode } = useTurnTimer(isMyTurn);

  // AI turn
  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1 || gs.phase === 'gameover' || rolling) return;

    if (gs.phase === 'bust') {
      const t = setTimeout(() => setGs((prev) => prev ? performBust(prev) : prev), 900);
      return () => clearTimeout(t);
    }

    if (gs.phase === 'idle') {
      if (aiShouldClaim(gs)) {
        const t = setTimeout(() => setGs((prev) => prev ? performClaim(prev) : prev), 700);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setRolling(true);
        setTimeout(() => {
          setGs((prev) => {
            if (!prev) return prev;
            const rolled = rollN(prev.turn.diceLeft);
            const newTurn = { ...prev.turn, rolled };
            const bust = isBust(newTurn);
            return { ...prev, turn: newTurn, phase: bust ? 'bust' : 'rolled' };
          });
          setRolling(false);
        }, 1400);
      }, 600);
      return () => clearTimeout(t);
    }

    if (gs.phase === 'rolled') {
      const face = aiBestFace(gs.turn);
      if (!face) return;
      const t = setTimeout(() => {
        setGs((prev) => {
          if (!prev) return prev;
          const newTurn = pickFace(face, prev.turn);
          let newGs = { ...prev, turn: newTurn };
          if (newTurn.diceLeft === 0) {
            const claim = canClaim(newGs);
            newGs = claim ? performClaim(newGs) : { ...newGs, phase: 'bust' };
          } else {
            newGs = { ...newGs, phase: 'idle' };
          }
          return newGs;
        });
      }, 700);
      return () => clearTimeout(t);
    }
  }, [gs, vsAI, rolling, roomId]);

  function handleRoll() {
    if (!gs || rolling || !isMyTurn) return;
    const rolled = rollN(gs.turn.diceLeft);
    const newTurn = { ...gs.turn, rolled };
    const bust = isBust(newTurn);
    // Toon altijd eerst de gegooid dobbelstenen, switch pas naar bust ná animatie
    const next = { ...gs, turn: newTurn, phase: 'rolled' } as GameState;
    setGs(next);
    emitState(next);
    // Sla direct op — voorkomt hergooien bij refresh (useEffect is asynchroon)
    if (!roomId) try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      if (bust) {
        const busted = { ...next, phase: 'bust' as const };
        setGs(busted);
        emitState(busted);
      }
    }, 1400);
  }

  function handlePick(face: DiceFace) {
    if (!gs || gs.phase !== 'rolled' || !isMyTurn) return;
    const newTurn = pickFace(face, gs.turn);
    let newGs = { ...gs, turn: newTurn };
    if (newTurn.diceLeft === 0) {
      const claim = canClaim(newGs);
      newGs = claim ? performClaim(newGs) : { ...newGs, phase: 'bust' };
    } else {
      newGs = { ...newGs, phase: 'idle' };
    }
    setGs(newGs);
    emitState(newGs);
  }

  function handleStop() {
    if (!gs || !isMyTurn) return;
    const claim = canClaim(gs);
    if (!claim) return;
    const newGs = performClaim(gs);
    setGs(newGs);
    emitState(newGs);
  }

  function handleBust() {
    if (!gs || !isMyTurn) return;
    const newGs = performBust(gs);
    setGs(newGs);
    emitState(newGs);
  }

  if (screenPhase === 'waiting') {
    const waitingPlayers = lobbyPlayers.length > 0 ? lobbyPlayers : (myName ? [myName] : ['Speler 1']);
    return <WaitingScreen roomId={roomId!} players={waitingPlayers} myPlayerIndex={myPlayerIndex} maxPlayers={7} gameType="grub" accent="#00C875" />;
  }

  if (screenPhase === 'lobby') {
    const handleReady = () => {
      setIAmReady(true);
      getSocket().emit("player-ready", { roomId });
    };

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "var(--font-display)", fontStyle: 'italic', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>Wormenjacht</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 6 }}>ROOM {roomId} · {lobbyPlayers.length}/7 spelers</div>
        </div>

        {/* Spelerlijst */}
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lobbyPlayers.map((name, i) => {
            const isReady = readyIndices.includes(i);
            const isMe = i === myPlayerIndex;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isMe ? 'rgba(0,200,117,0.07)' : 'var(--card2)', border: `1px solid ${isMe ? 'rgba(0,200,117,0.2)' : 'var(--border)'}`, borderRadius: 0, padding: '10px 14px' }}>
                <Avatar name={name} color={isMe ? '#00C875' : 'var(--accent)'} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}{isMe ? ' (jij)' : ''}</div>
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: isReady ? '#00C875' : 'var(--text-faint)' }}>
                  {isReady ? '✓ Klaar' : 'Wacht…'}
                </div>
              </div>
            );
          })}
          {/* Lege slots */}
          {Array.from({ length: Math.max(0, 2 - lobbyPlayers.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card2)', border: '1px dashed var(--border)', borderRadius: 0, padding: '10px 14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px dashed var(--border)' }} />
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: 'var(--text-faint)' }}>Wachten op speler…</div>
            </div>
          ))}
        </div>

        {/* Invite link */}
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }}
          style={{ padding: "8px 20px", borderRadius: 0, border: `1px solid ${inviteCopied ? "rgba(0,200,117,0.4)" : "var(--border)"}`, background: 'transparent', color: inviteCopied ? "#00C875" : "var(--text-muted)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
        >
          {inviteCopied ? t.inviteCopied : t.invitePlayers}
        </button>

        {/* Ready knop */}
        <button
          onClick={handleReady}
          disabled={iAmReady}
          style={{ padding: '12px 40px', borderRadius: 0, border: iAmReady ? '1px solid rgba(0,200,117,0.3)' : 'none', background: iAmReady ? 'transparent' : '#00C875', color: iAmReady ? '#00C875' : '#fff', fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: iAmReady ? 'default' : 'pointer', transition: 'all 0.2s' }}
        >
          {iAmReady ? t.readyDone : t.readyBtn}
        </button>

        <BottomNav items={[
          { label: t.home, icon: "home", onClick: () => router.push("/") },
          { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=grub") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
        ]} />
      </div>
    );
  }

  if (screenPhase === 'countdown') {
    const p1 = myPlayerIndex === 0 ? myName : opponentName;
    const p2 = myPlayerIndex === 0 ? opponentName : myName;
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        {/* Avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar name={p1 || '?'} color="#00C875" size={64} online="green" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p1 || '?'}</span>
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 22, color: 'var(--text-faint)' }}>vs</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar name={p2 || '?'} color="var(--accent)" size={64} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p2 || '?'}</span>
          </div>
        </div>

        {/* Countdown */}
        <div key={countdown} style={{
          fontFamily: "var(--font-body)", fontSize: 100, fontWeight: 700, color: 'var(--text)', lineHeight: 1,
          animation: 'countPop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {countdown}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: 'var(--text-faint)' }}>{t.gameStarting}</div>
        <style>{`
          @keyframes countPop { from { transform: scale(1.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes tab-flow { 0% { background-position: 0% 50%; } 100% { background-position: 250% 50%; } }
          @keyframes slide-down { from { transform: translateY(0); } to { transform: translateY(110%); } }
        `}</style>
      </div>
    );
  }

  if (screenPhase === 'start' || !gs) {
    return <StartScreen onStart={handleStart} />;
  }

  const showWaitingForOpponent = roomId && !isMyTurn;

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      position: 'relative', overflow: 'clip',
      paddingTop: 80, paddingBottom: 76,
      userSelect: 'none',
    }}>

      {/* ── Floating player header ── */}
      {gs && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', justifyContent: 'center',
          padding: '10px 8px',
          background: 'var(--card)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 0, overflow: 'hidden' }}>
              {gs.players.map((p, i) => (
                <PlayerCard key={i} player={p} active={i === gs.currentPlayer} avatarId={playerAvatars[p.name]} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignSelf: 'stretch' }}>
              <button onClick={() => setShowRules(true)} style={{ width: 36, borderRadius: 0, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
              {roomId && (
                <GameControls
                  roomId={roomId}
                  myName={gs.players[myPlayerIndex]?.name ?? "Speler"}
                  playerNames={gs.players.map(p => p.name)}
                  gameType="grub"
                  isSpectator={isSpectator}
                  isGameOver={gs.phase === 'gameover' || forfeitWinner !== null}
                  myPlayerIndex={myPlayerIndex}
                  accent="#22C55E"
                  onResign={() => {
                    if (vsAI) {
                      setHasResigned(true);
                      setForfeitWinner("AI");
                    } else {
                      getSocket().emit("resign");
                      setHasResigned(true);
                      setForfeitWinner(gs!.players.find((_, i) => i !== myPlayerIndex)?.name ?? "Tegenstander");
                    }
                  }}
                  inHeader
                  onSendEmoji={(emoji) => getSocket().emit("react", { roomId, emoji })}
                  incomingEmoji={incomingEmoji}
                />
              )}
              {!roomId && (
                <button onClick={handleRestart} style={{ width: 36, height: 36, borderRadius: 0, background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l16 16M4 20L20 4"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {gs && (
        <GameBoard
          gs={gs}
          rolling={rolling}
          onPick={isMyTurn ? handlePick : undefined}
          isMyTurn={isMyTurn}
          vsAI={vsAI && !roomId}
          onRoll={handleRoll}
          onStop={handleStop}
          onBust={handleBust}
          onRestart={handleRestart}
          waitingFor={showWaitingForOpponent ? (opponentName || gs.players[gs.currentPlayer]?.name) : undefined}
          timeLeft={roomId && !forfeitWinner ? timeLeft : null}
          gameMode={gameMode}
          onShowRules={() => setShowRules(true)}
          onShowLevelSwitch={() => setShowLevelSwitch(true)}
          activeLevelId={activeLevelId}
        />
      )}


      {forfeitWinner && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 200 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 3"/>
            <path d="M9 3h6"/>
          </svg>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>{hasResigned ? 'Opgegeven' : 'Tegenstander gaf op'}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: 'var(--text-muted)' }}>{hasResigned ? `${forfeitWinner} wint` : `${forfeitWinner} wint!`}</div>
          <button onClick={() => router.push('/lobby?game=grub')} style={{ marginTop: 12, padding: '12px 32px', borderRadius: 0, border: 'none', background: '#00C875', color: '#052e16', fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 0 #007A47', transition: 'transform 0.1s, box-shadow 0.1s' }}>
            Terug naar lobby
          </button>
        </div>
      )}

      {(() => {
        const RULES = t.grubRules;
        const filtered = rulesSearch.trim()
          ? RULES.filter(([, title, text]) =>
              title.toLowerCase().includes(rulesSearch.toLowerCase()) ||
              text.toLowerCase().includes(rulesSearch.toLowerCase()))
          : null;
        return (
          <BottomSheet
            isOpen={showRules}
            onClose={() => { setShowRules(false); setRulesSearch(''); setActiveRuleTab(0); }}
            sheetStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0' }}
          >
            {(close) => (<>
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
              </div>

              {/* Header */}
              <div style={{ padding: '8px 20px 0', flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
                  {t.gameRules(t.grubName)}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45, pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 14l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    value={rulesSearch}
                    onChange={e => setRulesSearch(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 0, padding: '9px 14px 9px 36px', color: 'var(--text)', fontFamily: "var(--font-body)", fontSize: 13, outline: 'none' }}
                  />
                  {rulesSearch && (
                    <button onClick={() => setRulesSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
                  )}
                </div>

                {/* Tabs */}
                {!filtered && (
                  <div style={{ position: 'relative', margin: '0 -20px' }}>
                  <div style={{
                    display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10,
                    paddingTop: 4, paddingLeft: 20, paddingRight: 20,
                    scrollbarWidth: 'none',
                    maskImage: 'linear-gradient(to right, transparent 0px, black 56px, black calc(100% - 56px), transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 56px, black calc(100% - 56px), transparent 100%)',
                  }}>
                    {RULES.map(([icon, title], i) => (
                      <button
                        key={title}
                        onClick={() => setActiveRuleTab(i)}
                        style={{
                          flexShrink: 0, padding: '5px 13px', borderRadius: 0,
                          border: 'none',
                          background: activeRuleTab === i
                            ? 'var(--accent)'
                            : 'transparent',
                          backgroundSize: undefined,
                          animation: undefined,
                          outline: activeRuleTab === i ? 'none' : '1px solid var(--border)',
                          color: activeRuleTab === i ? '#fff' : 'var(--text-muted)',
                          fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 12,
                          cursor: 'pointer', transition: 'color 0.18s, outline 0.18s',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                  </div>
                )}
              </div>

              {/* Slider content */}
              <div style={{ flex: 1, overflow: 'hidden', padding: '0 20px' }}>
                {filtered ? (
                  <div style={{ overflowY: 'auto', maxHeight: '100%', paddingTop: 8, paddingBottom: 16 }}>
                    {filtered.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-faint)', fontFamily: "var(--font-body)", fontSize: 13 }}>{t.noResults}</div>
                    ) : filtered.map(([icon, title, text]) => (
                      <div key={title} style={{ marginBottom: 12, padding: '14px 16px', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 0 }}>
                        <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15, color: 'var(--accent)', marginBottom: 5 }}>{title}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{text}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Slider: titel + tekst */}
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', height: '100%', transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(calc(-${activeRuleTab * 100}%))` }}>
                        {RULES.map(([, title, text]) => (
                          <div key={title} style={{ minWidth: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '8px 0 12px' }}>
                            <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 26, color: 'var(--accent)', marginBottom: 12, textAlign: 'center' }}>{title}</div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.75, textAlign: 'center' }}>{text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Vaste progress dots — buiten de slider */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0', flexShrink: 0 }}>
                      {RULES.map((_, di) => (
                        <div key={di} onClick={() => setActiveRuleTab(di)} style={{ width: di === activeRuleTab ? 20 : 7, height: 7, borderRadius: '50%', background: di === activeRuleTab ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!filtered && (
                <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setActiveRuleTab(i => Math.max(0, i - 1))}
                    disabled={activeRuleTab === 0}
                    style={{ flex: 1, padding: '11px', borderRadius: 0, border: '1px solid var(--border)', background: 'transparent', color: activeRuleTab === 0 ? 'var(--text-faint)' : 'var(--text)', fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, cursor: activeRuleTab === 0 ? 'default' : 'pointer' }}
                  >{t.previous}</button>
                  <button
                    onClick={() => activeRuleTab < RULES.length - 1 ? setActiveRuleTab(i => i + 1) : close()}
                    style={{ flex: 2, padding: '11px', borderRadius: 0, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}
                  >{activeRuleTab < RULES.length - 1 ? t.nextBtn : t.closeConfirm}</button>
                </div>
              )}
              {filtered && (
                <div style={{ padding: '12px 20px 20px', flexShrink: 0 }}>
                  <button onClick={close} style={{ width: '100%', padding: '11px', borderRadius: 0, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}>{t.closeBtn}</button>
                </div>
              )}
          </>)}
          </BottomSheet>
        );
      })() }


      {showLevelSwitch && (
        <div onClick={() => setShowLevelSwitch(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 0, padding: '28px', maxWidth: 380, width: '100%', color: 'var(--text)', fontFamily: "var(--font-body)" }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Kies een omgeving</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LEVELS.filter(l => l.available).map(level => {
                const isActive = level.id === activeLevelId;
                return (
                  <button key={level.id} onClick={() => { saveLevelToStorage(level.id); setActiveLevelId(level.id); setShowLevelSwitch(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, background: isActive ? `${level.accent}22` : 'var(--card2)', border: `1px solid ${isActive ? level.accent + '66' : 'var(--border)'}`, borderRadius: 0, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 28 }}>{level.icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15, color: isActive ? level.accent : 'var(--text)' }}>{level.name}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{level.tagline}</div>
                    </div>
                    {isActive && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={level.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <path d="M3 8l3.5 3.5L13 4.5"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav items={[
        { label: t.home,   icon: "home", onClick: () => router.push("/") },
        { label: t.lobby,  icon: "lobby", onClick: () => router.push("/lobby?game=grub") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
        { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
      ]} />
    </div>
  );
}

export default function GrubPage() {
  return (
    <Suspense>
      <GrubContent />
    </Suspense>
  );
}

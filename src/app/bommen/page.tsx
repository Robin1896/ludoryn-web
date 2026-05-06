"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav } from "@/components/ui";
import { useLang } from "@/lib/lang";
import {
  GameState, Die, DieSymbol, PirateCard,
  newGame, startRoll, reroll, toggleKeep, toggleIsland,
  useSorceress, stopTurn, nextTurnAfterBust,
  aiTurn, aiKeepDice, drawCard,
  canRoll, canStop, countSkulls, swordCount,
  calcScore, COMBO, TARGET, BUST_AT,
} from "@/lib/bommen";

const DIE_VIS: Record<DieSymbol, { emoji: string; label: string; bg: string; border: string; textColor: string }> = {
  skull:   { emoji: '💀', label: 'Schedel',  bg: 'rgba(193,74,31,0.10)',  border: '#c14a1f',  textColor: '#c14a1f' },
  sword:   { emoji: '⚔️', label: 'Sabel',    bg: 'rgba(26,29,46,0.06)',   border: 'rgba(26,29,46,0.25)', textColor: 'var(--text-muted)' },
  parrot:  { emoji: '🦜', label: 'Papegaai', bg: 'rgba(45,122,58,0.10)',  border: '#2d7a3a',  textColor: '#2d7a3a' },
  monkey:  { emoji: '🐒', label: 'Aap',      bg: 'rgba(180,100,0,0.10)', border: '#b46400',  textColor: '#b46400' },
  gold:    { emoji: '🪙', label: 'Goud',     bg: 'rgba(184,134,11,0.10)', border: '#b8860b',  textColor: '#b8860b' },
  diamond: { emoji: '💎', label: 'Diamant',  bg: 'rgba(0,140,200,0.10)',  border: '#0088c8',  textColor: '#0088c8' },
};

function DieView({
  die, onClick, onIslandClick, islandMode, sorceressMode,
}: {
  die: Die;
  onClick?: () => void;
  onIslandClick?: () => void;
  islandMode?: boolean;
  sorceressMode?: boolean;
}) {
  const vis = DIE_VIS[die.symbol];
  const isSkull = die.symbol === 'skull';
  const isLocked = die.locked;
  const isKept = die.kept;
  const isOnIsland = die.onIsland;

  const bg = isSkull && isLocked
    ? 'rgba(193,74,31,0.15)'
    : isOnIsland ? 'rgba(0,140,200,0.12)'
    : isKept ? 'rgba(184,134,11,0.12)'
    : vis.bg;

  const border = isSkull && isLocked ? '#c14a1f'
    : isOnIsland ? '#0088c8'
    : isKept ? '#b8860b'
    : vis.border;

  const canClick = onClick && !isLocked && !isSkull;
  const canSorceress = sorceressMode && isSkull && isLocked;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        onClick={canSorceress ? onClick : canClick ? onClick : undefined}
        disabled={!canClick && !canSorceress}
        style={{
          width: 62, height: 62,
          borderRadius: 14,
          background: bg,
          border: `2px solid ${border}`,
          boxShadow: isKept || isOnIsland ? `0 0 10px ${border}44` : '0 1px 3px var(--shadow)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2,
          cursor: canClick || canSorceress ? 'pointer' : 'default',
          transform: isKept || isOnIsland ? 'translateY(-4px)' : 'none',
          transition: 'all 0.15s',
          opacity: isLocked && !isSkull ? 0.55 : 1,
        }}
      >
        <span style={{ fontSize: 26, lineHeight: 1 }}>{vis.emoji}</span>
      </button>
      {islandMode && !isSkull && (
        <button
          onClick={onIslandClick}
          style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 8,
            background: isOnIsland ? 'rgba(0,140,200,0.08)' : 'transparent',
            border: `1px solid ${isOnIsland ? '#0088c8' : 'var(--border)'}`,
            color: isOnIsland ? '#0088c8' : 'var(--text-faint)',
            cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
          }}
        >
          {isOnIsland ? '🏝️ eiland' : '+ eiland'}
        </button>
      )}
    </div>
  );
}

function PirateCardView({ card, compact }: { card: PirateCard; compact?: boolean }) {
  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '6px 12px',
        boxShadow: '0 1px 4px var(--shadow)',
      }}>
        <span style={{ fontSize: 20 }}>{card.icon}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          {card.label}
        </span>
      </div>
    );
  }
  return (
    <div style={{
      width: '100%', maxWidth: 340,
      background: 'var(--card)',
      border: '1.5px solid var(--border)',
      borderRadius: 20, padding: '16px 20px',
      textAlign: 'center',
      boxShadow: '0 2px 12px var(--shadow)',
    }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: 6 }}>
        PIRATENKAART
      </div>
      <div style={{ fontSize: 36, marginBottom: 6 }}>{card.icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
        {card.label}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {card.description}
      </div>
    </div>
  );
}

function ScoreBar({ score, name, active }: { score: number; name: string; active: boolean }) {
  const pct = Math.min(score / TARGET, 1);
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: active ? 'rgba(193,74,31,0.06)' : 'var(--card)',
      border: `1.5px solid ${active ? 'rgba(193,74,31,0.35)' : 'var(--border)'}`,
      borderRadius: 12, padding: '8px 10px',
      boxShadow: '0 1px 4px var(--shadow)',
    }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: active ? '#c14a1f' : 'var(--text-muted)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: active ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1, marginBottom: 4 }}>
        {score}
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: active ? '#c14a1f' : 'var(--text-faint)', borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: (names: string[], vsAI: boolean) => void }) {
  const [names, setNames] = useState(['', '', '', '']);
  const count = names.filter(Boolean).length;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>💣</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 8vw, 48px)', fontWeight: 900, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1 }}>
          1000 Bommen
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: '#c14a1f', margin: '0 0 8px', textTransform: 'uppercase' }}>
          &amp; Granaten
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)', margin: '0 0 28px' }}>
          Gooi dobbelstenen · Verzamel punten · Eerste naar {TARGET} wint
        </p>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 16px', marginBottom: 16, boxShadow: '0 2px 12px var(--shadow)' }}>
          {names.map((name, i) => (
            <div key={i} style={{ marginBottom: i < 3 ? 12 : 0 }}>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: i < 2 ? '#c14a1f' : 'var(--text-faint)', marginBottom: 4, display: 'block' }}>
                Speler {i + 1}{i >= 2 ? ' (optioneel)' : ''}
              </label>
              <input
                style={{ background: 'var(--input-bg)', border: `1px solid ${name ? 'rgba(193,74,31,0.3)' : 'var(--input-border)'}`, borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' }}
                value={name}
                onChange={e => setNames(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                placeholder={`Naam speler ${i + 1}…`}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onStart(names.filter(Boolean), false)}
            disabled={count < 2}
            style={{ flex: 2, background: '#c14a1f', color: '#fff', border: 'none', borderRadius: 50, padding: 14, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: count >= 2 ? 'pointer' : 'not-allowed', opacity: count >= 2 ? 1 : 0.4, boxShadow: count >= 2 ? '0 4px 0 #7a2e10' : 'none' }}>
            {count >= 2 ? `${count} Spelers` : '2+ nodig'}
          </button>
          <button
            onClick={() => onStart([names[0] || 'Speler 1', 'Tegenstander'], true)}
            style={{ flex: 1, background: 'rgba(193,74,31,0.08)', color: '#c14a1f', border: `1px solid rgba(193,74,31,0.3)`, borderRadius: 50, padding: 14, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            vs AI
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoringLegend() {
  return (
    <div style={{ width: '100%', maxWidth: 340, padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(COMBO).map(([n, pts]) => (
          <div key={n} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>
            {n}× = {pts}
          </div>
        ))}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#b8860b', background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 6, padding: '2px 6px' }}>
          🪙💎 = +100 elk
        </div>
      </div>
    </div>
  );
}

function BommenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const aiParam = searchParams.get("ai") === "1";
  const { t } = useLang();

  const [gs, setGs] = useState<GameState | null>(null);
  const [vsAI, setVsAI] = useState(false);
  const [myIdx, setMyIdx] = useState(0);
  const [sorceressMode, setSorceressMode] = useState(false);

  function emit(state: GameState) {
    if (roomId) getSocket().emit("state-update", { gameState: state });
  }

  useEffect(() => {
    if (!roomId) return;
    const pidx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? "0");
    setMyIdx(pidx);
    const socket = getSocket();
    const onStateUpdate = ({ gameState }: { gameState: GameState }) => setGs(gameState);
    socket.on("state-update", onStateUpdate);
    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null }) => {
      if (res.gameState) setGs(res.gameState);
    });
    return () => { socket.off("state-update", onStateUpdate); };
  }, [roomId]);

  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1) return;
    if (gs.phase === 'gameover') return;

    if (gs.phase === 'pre-roll') {
      const t = setTimeout(() => { const s = startRoll(gs); setGs(s); emit(s); }, 800);
      return () => clearTimeout(t);
    }

    if (gs.phase === 'bust') {
      const t = setTimeout(() => { const s = nextTurnAfterBust(gs); setGs(s); emit(s); }, 1200);
      return () => clearTimeout(t);
    }

    if (gs.phase === 'rolling') {
      const decision = aiTurn(gs);
      if (decision === 'stop') {
        const t = setTimeout(() => { const s = stopTurn(gs); setGs(s); emit(s); }, 900);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => {
          const kept = aiKeepDice(gs);
          const rolled = reroll(kept);
          setGs(rolled); emit(rolled);
        }, 900);
        return () => clearTimeout(t);
      }
    }
  }, [gs, vsAI]); // eslint-disable-line

  function update(s: GameState) { setGs(s); emit(s); setSorceressMode(false); }

  const isMyTurn = !roomId || gs?.currentPlayer === myIdx;

  if (!gs) {
    return <StartScreen onStart={(names, ai) => { setVsAI(ai); const g = newGame(names); setGs(g); emit(g); }} />;
  }

  const me = gs.players[gs.currentPlayer];
  const skulls = countSkulls(gs.dice);
  const card = gs.card;
  const isIsland = card.type === 'treasure_island';
  const isSorceress = card.type === 'sorceress' && !gs.sorceressUsed && skulls > 0 && gs.phase === 'rolling';
  const swords = swordCount(gs.dice);
  const shipMet = card.type === 'pirate_ship' && card.shipNeeds && swords >= card.shipNeeds;

  if (gs.phase === 'gameover') {
    const winner = gs.players.reduce((a, b) => a.score > b.score ? a : b);
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <div style={{ fontSize: 64 }}>🏆</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: '#c14a1f', textAlign: 'center' }}>{winner.name} wint!</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300 }}>
          {[...gs.players].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i === 0 ? 'rgba(193,74,31,0.06)' : 'var(--card)', border: `1px solid ${i === 0 ? 'rgba(193,74,31,0.25)' : 'var(--border)'}`, borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: i === 0 ? 'var(--text)' : 'var(--text-muted)' }}>{i === 0 ? '🏆 ' : ''}{p.name}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: i === 0 ? '#c14a1f' : 'var(--text-muted)' }}>{p.score}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { const g = newGame(gs.players.map(p => p.name)); setGs(g); }} style={{ padding: '12px 28px', borderRadius: 50, border: 'none', background: '#c14a1f', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Opnieuw
          </button>
          <button onClick={() => router.push('/')} style={{ padding: '12px 28px', borderRadius: 50, border: `1px solid rgba(193,74,31,0.3)`, background: 'transparent', color: '#c14a1f', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw', height: '100dvh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 8, paddingBottom: 72, boxSizing: 'border-box', overflowY: 'auto',
    }}>

      {/* Player scores */}
      <div style={{ width: '100%', maxWidth: 480, padding: '8px 12px', display: 'flex', gap: 8 }}>
        {gs.players.map((p, i) => (
          <ScoreBar key={p.name} name={p.name} score={p.score} active={i === gs.currentPlayer} />
        ))}
      </div>

      {/* Current player + card */}
      <div style={{ width: '100%', maxWidth: 480, padding: '0 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 2 }}>AAN DE BEURT</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{me.name}</div>
        </div>
        <PirateCardView card={card} compact />
      </div>

      {/* Skull counter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {Array.from({ length: BUST_AT }).map((_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < skulls ? '#c14a1f' : 'var(--border)', border: `1px solid ${i < skulls ? 'rgba(193,74,31,0.5)' : 'var(--border)'}`, boxShadow: i < skulls ? '0 0 6px rgba(193,74,31,0.4)' : 'none', transition: 'all 0.2s' }} />
        ))}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginLeft: 4, alignSelf: 'center' }}>
          {skulls}/{BUST_AT} schedels
        </span>
      </div>

      {/* Dice grid */}
      <div style={{ width: '100%', maxWidth: 400, padding: '0 12px', marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, justifyItems: 'center' }}>
          {gs.dice.map(die => (
            <DieView
              key={die.id}
              die={die}
              onClick={
                sorceressMode && die.symbol === 'skull' && die.locked
                  ? () => update(useSorceress(gs, die.id))
                  : isMyTurn && gs.phase === 'rolling' && !die.locked && die.symbol !== 'skull'
                    ? () => update(toggleKeep(gs, die.id))
                    : undefined
              }
              onIslandClick={isMyTurn ? () => update(toggleIsland(gs, die.id)) : undefined}
              islandMode={isIsland && gs.phase === 'rolling' && isMyTurn}
              sorceressMode={sorceressMode && gs.phase === 'rolling'}
            />
          ))}
        </div>
        {sorceressMode && (
          <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 11, color: '#0088c8' }}>
            🐙 Klik op een 💀 om opnieuw te gooien
          </div>
        )}
      </div>

      {/* Pirate ship progress */}
      {card.type === 'pirate_ship' && card.shipNeeds && gs.phase === 'rolling' && (
        <div style={{ marginBottom: 8, fontFamily: 'var(--font-body)', fontSize: 11, color: shipMet ? '#2d7a3a' : 'var(--text-muted)' }}>
          {shipMet ? `✓ ${swords} sabels — bonus +${card.shipBonus}!` : `⚔️ ${swords}/${card.shipNeeds} sabels nodig voor +${card.shipBonus} bonus`}
        </div>
      )}

      {/* Round score */}
      {gs.phase === 'rolling' && (
        <div style={{ marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>DEZE BEURT</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: gs.roundScore > 0 ? '#2d7a3a' : 'var(--text-muted)' }}>
            +{gs.roundScore}
          </div>
        </div>
      )}

      {/* Last action */}
      {gs.lastAction && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center', padding: '0 16px' }}>
          {gs.lastAction}
        </div>
      )}

      {/* Scoring legend */}
      {gs.phase === 'pre-roll' && <ScoringLegend />}

      {/* Action buttons */}
      {isMyTurn && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {isSorceress && !sorceressMode && (
            <button
              onClick={() => setSorceressMode(true)}
              style={{ padding: '12px 20px', borderRadius: 50, border: '1.5px solid #0088c8', background: 'rgba(0,140,200,0.08)', color: '#0088c8', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              🐙 Zeekat
            </button>
          )}

          {gs.phase === 'pre-roll' && (
            <button
              onClick={() => update(startRoll(gs))}
              style={{ padding: '14px 36px', borderRadius: 50, border: 'none', background: '#c14a1f', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 4px 0 #7a2e10' }}>
              🎲 Gooi!
            </button>
          )}

          {gs.phase === 'rolling' && canRoll(gs) && !sorceressMode && (
            <button
              onClick={() => update(reroll(gs))}
              style={{ padding: '12px 28px', borderRadius: 50, border: 'none', background: '#c14a1f', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 0 #7a2e10' }}>
              🎲 Opnieuw
            </button>
          )}

          {canStop(gs) && !sorceressMode && (
            <button
              onClick={() => update(stopTurn(gs))}
              style={{ padding: '12px 28px', borderRadius: 50, border: `1.5px solid rgba(45,122,58,0.45)`, background: 'rgba(45,122,58,0.08)', color: '#2d7a3a', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              ✓ Stop
            </button>
          )}

          {sorceressMode && (
            <button
              onClick={() => setSorceressMode(false)}
              style={{ padding: '12px 20px', borderRadius: 50, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Annuleer
            </button>
          )}
        </div>
      )}

      {/* AI thinking */}
      {vsAI && gs.currentPlayer === 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c14a1f', animation: 'pulse 1s infinite' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>AI denkt na…</span>
        </div>
      )}

      {/* BUST overlay */}
      {gs.phase === 'bust' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(244,239,230,0.92)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 200 }}>
          <div style={{ fontSize: 72 }}>💥</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: '#c14a1f' }}>BOEM!</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-muted)' }}>
            {me.name} gooit {skulls} schedels — geen punten!
          </div>
          {isMyTurn && (
            <button onClick={() => update(nextTurnAfterBust(gs))} style={{ padding: '14px 40px', borderRadius: 50, border: 'none', background: '#c14a1f', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 0 #7a2e10' }}>
              Volgende speler →
            </button>
          )}
        </div>
      )}

      <BottomNav chatMode="popup" items={[
        { label: t.home, icon: "home", onClick: () => router.push("/") },
        { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=bommen") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
      ]} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}

export default function BommenPage() {
  return <Suspense><BommenContent /></Suspense>;
}

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { BottomNav, Avatar, GamePlayerCard } from "@/components/ui";
import GameControls from "@/components/GameControls";
import WaitingScreen from "@/components/WaitingScreen";
import { useLang } from "@/lib/lang";
import {
  Card, PlayerState, GameState, Suit,
  newGame, playCard, chooseValue, startNewRound,
  aiPickCard, aiPickValue,
  getCardEffect, effectLabel, cardLabel, suitSymbol, isRedSuit,
  LIMIT, START_LIVES,
} from "@/lib/bommen";

const ACCENT = '#FF4444';
const ACCENT2 = '#FF8C00';

// ── Card component ────────────────────────────────────────────────────────────

function PlayingCard({
  card, selected, playable, onClick, small = false,
}: {
  card: Card; selected?: boolean; playable?: boolean; onClick?: () => void; small?: boolean;
}) {
  const isBomb = card.rank === 'B';
  const red = isRedSuit(card.suit);
  const sym = suitSymbol(card.suit);
  const w = small ? 44 : 56;
  const h = small ? 62 : 80;
  const fs = small ? 11 : 14;
  const symFs = small ? 14 : 20;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: w, height: h, borderRadius: 8, flexShrink: 0,
        background: isBomb
          ? 'linear-gradient(135deg, #1a0505 60%, #3a0000)'
          : selected ? '#fff' : playable ? 'rgba(255,255,255,0.96)' : 'rgba(200,195,185,0.7)',
        border: selected
          ? `2.5px solid ${ACCENT}`
          : playable ? '2px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.2)',
        boxShadow: selected
          ? `0 0 18px ${ACCENT}99, 0 4px 16px rgba(0,0,0,0.5)`
          : playable ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)',
        transform: selected ? 'translateY(-8px) scale(1.05)' : playable ? 'translateY(-2px)' : 'none',
        transition: 'all 0.15s',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        padding: 0,
      }}
    >
      {isBomb ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: small ? 20 : 28 }}>💣</span>
          {!small && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: '#FF4444', fontWeight: 700, letterSpacing: '0.08em' }}>BOMMEN</span>}
        </div>
      ) : (
        <>
          <div style={{
            position: 'absolute', top: 3, left: 5,
            fontFamily: "'DM Mono', monospace", fontSize: fs, fontWeight: 700,
            color: red ? '#CC2200' : '#111', lineHeight: 1,
          }}>{card.rank}</div>
          <div style={{ fontSize: symFs, color: red ? '#CC2200' : '#111' }}>{sym}</div>
          <div style={{
            position: 'absolute', bottom: 3, right: 5,
            fontFamily: "'DM Mono', monospace", fontSize: fs, fontWeight: 700,
            color: red ? '#CC2200' : '#111', lineHeight: 1,
            transform: 'rotate(180deg)',
          }}>{card.rank}</div>
        </>
      )}
    </button>
  );
}

// ── Total display ─────────────────────────────────────────────────────────────

function TotalDisplay({ total, boomPlayer, players }: { total: number; boomPlayer: number | null; players: PlayerState[] }) {
  const pct = Math.min(total / LIMIT, 1);
  const danger = total >= 900;
  const warn = total >= 700;
  const barColor = danger ? '#FF4444' : warn ? '#FF8C00' : '#00C875';

  return (
    <div style={{
      width: '100%', maxWidth: 420,
      background: 'linear-gradient(180deg, rgba(30,15,15,0.9) 0%, rgba(15,10,25,0.95) 100%)',
      border: `1.5px solid ${danger ? 'rgba(255,68,68,0.4)' : warn ? 'rgba(255,140,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 20, padding: '20px 24px', margin: '0 auto',
      textAlign: 'center',
      boxShadow: danger ? '0 0 40px rgba(255,68,68,0.15)' : 'none',
      transition: 'all 0.3s',
    }}>
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(238,242,255,0.3)', marginBottom: 6 }}>
        TOTAAL
      </div>
      <div style={{
        fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(52px, 14vw, 80px)',
        fontWeight: 900, color: danger ? '#FF4444' : warn ? '#FF8C00' : 'rgba(238,242,255,0.95)',
        lineHeight: 1, marginBottom: 12,
        textShadow: danger ? '0 0 30px rgba(255,68,68,0.5)' : 'none',
        transition: 'color 0.3s, text-shadow 0.3s',
        letterSpacing: '-0.02em',
      }}>
        {total}
      </div>
      {/* Progress bar */}
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: `linear-gradient(to right, #00C875, ${warn ? '#FF8C00' : '#4caf50'}, ${danger ? '#FF4444' : '#FF8C00'})`,
          borderRadius: 4, transition: 'width 0.4s ease',
          boxShadow: danger ? '0 0 12px rgba(255,68,68,0.6)' : 'none',
        }} />
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(238,242,255,0.2)' }}>
        {LIMIT - total} tot {LIMIT}
      </div>
    </div>
  );
}

// ── Lives display ─────────────────────────────────────────────────────────────

function LivesRow({ count, max = START_LIVES }: { count: number; max?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: i < count ? '#FF4444' : 'rgba(255,255,255,0.1)',
          border: i < count ? '1px solid rgba(255,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: i < count ? '0 0 6px rgba(255,68,68,0.5)' : 'none',
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  );
}

// ── Start screen ──────────────────────────────────────────────────────────────

function BommenStartScreen({ onStart }: { onStart: (names: string[], vsAI: boolean) => void }) {
  const [names, setNames] = useState(['Robin', 'Loic', '', '']);
  const { t } = useLang();

  const activePlayers = names.filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💣</div>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(32px, 9vw, 56px)', fontWeight: 900, letterSpacing: '0.04em', background: `linear-gradient(160deg, #ffffff 0%, ${ACCENT} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 4px', lineHeight: 1 }}>
          1000 Bommen
        </h1>
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 36px' }}>
          en Granaten
        </p>

        <div style={{ background: 'rgba(28,26,46,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 20px', textAlign: 'left', marginBottom: 16 }}>
          {names.map((name, i) => (
            <div key={i} style={{ marginBottom: i < 3 ? 14 : 0 }}>
              <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: i < 2 ? `rgba(255,68,68,0.7)` : 'rgba(238,242,255,0.3)', marginBottom: 6, display: 'block' }}>
                Speler {i + 1}{i >= 2 ? ' (optioneel)' : ''}
              </label>
              <input
                style={{ background: 'rgba(20,18,38,0.8)', border: `1px solid ${name ? 'rgba(255,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '10px 14px', color: 'var(--text)', fontFamily: "'Nunito', sans-serif", fontSize: 15, width: '100%', outline: 'none', boxSizing: 'border-box' }}
                value={name}
                onChange={e => setNames(prev => prev.map((n, j) => j === i ? e.target.value : n))}
                placeholder={i >= 2 ? `Speler ${i + 1}…` : t.namePlaceholder}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onStart(names.filter(Boolean), false)}
            disabled={activePlayers < 2}
            style={{ flex: 2, background: ACCENT, color: '#fff', border: 'none', borderRadius: 50, padding: '14px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, cursor: activePlayers >= 2 ? 'pointer' : 'not-allowed', opacity: activePlayers >= 2 ? 1 : 0.4, boxShadow: activePlayers >= 2 ? '0 4px 0 #990000' : 'none' }}
          >
            {activePlayers >= 2 ? `${activePlayers} Spelers` : '2+ spelers nodig'}
          </button>
          <button
            onClick={() => onStart([names[0] || 'Speler 1', 'Tegenstander'], true)}
            style={{ flex: 1, background: 'rgba(255,68,68,0.12)', color: ACCENT, border: `1px solid rgba(255,68,68,0.4)`, borderRadius: 50, padding: '14px', fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            vs AI
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main game ─────────────────────────────────────────────────────────────────

function BommenContent() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const aiParam = searchParams.get("ai") === "1";

  const [screenPhase, setScreenPhase] = useState<'start' | 'waiting' | 'lobby' | 'countdown' | 'playing'>('start');
  const [countdown, setCountdown] = useState(3);
  const [gs, setGs] = useState<GameState | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [myName, setMyName] = useState("");
  const [vsAI, setVsAI] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [readyIndices, setReadyIndices] = useState<number[]>([]);
  const [iAmReady, setIAmReady] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string | null>>({});
  const pendingGsRef = useRef<GameState | null>(null);
  const hasGameRef = useRef(false);

  // Fetch avatars
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

  // Reset selected card on turn change
  useEffect(() => {
    setSelectedCard(null);
  }, [gs?.currentPlayer, gs?.phase]);

  function emitState(newGs: GameState) {
    if (roomId) getSocket().emit("state-update", { gameState: newGs });
  }

  // Room / socket setup
  useEffect(() => {
    if (!roomId) return;
    const pidx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? "0");
    const name = sessionStorage.getItem("ludoryn-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setMyName(name);

    try {
      const saved = localStorage.getItem(`bommen-gs-${roomId}`);
      if (saved) {
        const parsed: GameState = JSON.parse(saved);
        setGs(parsed); hasGameRef.current = true; setScreenPhase('playing');
      } else { setScreenPhase('waiting'); }
    } catch { setScreenPhase('waiting'); }

    const socket = getSocket();

    if (aiParam) {
      setVsAI(true);
      if (!hasGameRef.current) {
        setGs(newGame([name, "Tegenstander"]));
        setScreenPhase('playing');
      }
      return;
    }

    const needsJoin = sessionStorage.getItem(`ludoryn-pidx-${roomId}`) === null;

    function rejoin() {
      socket.emit("join-room", { roomId, name }, (res: { ok: boolean; playerIndex?: number; players?: string[]; error?: string }) => {
        if (!res.ok) { router.push('/lobby?game=bommen'); return; }
        if (res.players && res.players.length >= 2) setOpponentName(res.players[pidx === 0 ? 1 : 0] ?? "");
        if (res.playerIndex !== undefined) {
          setMyPlayerIndex(res.playerIndex);
          sessionStorage.setItem(`ludoryn-pidx-${roomId}`, String(res.playerIndex));
        }
      });
    }

    function startCountdown(afterCount: () => void) {
      setScreenPhase('countdown'); setCountdown(3);
      let c = 3;
      const iv = setInterval(() => {
        c--;
        if (c <= 0) { clearInterval(iv); afterCount(); }
        else setCountdown(c);
      }, 1000);
    }

    const onRoomUpdate = ({ players: pnames, readyIndices: ri }: { players: string[]; readyIndices?: number[] }) => {
      setLobbyPlayers(pnames);
      setReadyIndices(ri ?? []);
      if (pnames.length >= 2) setOpponentName(pnames.find((_, i) => i !== pidx) ?? "");
      if (pnames.length >= 2 && !hasGameRef.current) setScreenPhase(prev => prev === 'waiting' ? 'lobby' : prev);
    };

    socket.on("all-ready", ({ players: pnames }: { players: string[] }) => {
      setLobbyPlayers(pnames);
      startCountdown(() => {
        if (!needsJoin) {
          const game = newGame(pnames);
          socket.emit("state-update", { gameState: game });
          setGs(game); setScreenPhase('playing');
        } else {
          setGs(pendingGsRef.current); setScreenPhase('playing');
        }
      });
    });

    const onStateSync = ({ gameState }: { gameState: GameState | null }) => {
      if (gameState) { hasGameRef.current = true; setGs(gameState); setScreenPhase('playing'); }
    };
    const onStateUpdate = ({ gameState }: { gameState: GameState }) => {
      if (!pendingGsRef.current) pendingGsRef.current = gameState;
      hasGameRef.current = true; setGs(gameState); setScreenPhase('playing');
    };

    socket.on("room-update", onRoomUpdate);
    socket.on("state-sync", onStateSync);
    socket.on("state-update", onStateUpdate);
    if (socket.connected) rejoin(); else socket.once("connect", rejoin);
    socket.io.on("reconnect", rejoin);
    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null; players: string[] }) => {
      if (res.players.length >= 2) setOpponentName(res.players[1 - pidx] ?? "");
      if (res.gameState) { hasGameRef.current = true; setGs(res.gameState); setScreenPhase('playing'); }
    });
    socket.on("turn-forfeit", ({ winnerName }: { winnerName: string }) => {
      try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /**/ }
      setForfeitWinner(winnerName);
    });

    return () => {
      socket.off("room-update", onRoomUpdate); socket.off("state-sync", onStateSync);
      socket.off("state-update", onStateUpdate); socket.off("turn-forfeit"); socket.off("all-ready");
      socket.off("connect", rejoin); socket.io.off("reconnect", rejoin);
    };
  }, [roomId, aiParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist
  useEffect(() => {
    if (!gs || !roomId) return;
    try {
      if (gs.phase === 'gameover') localStorage.removeItem(`bommen-gs-${roomId}`);
      else localStorage.setItem(`bommen-gs-${roomId}`, JSON.stringify(gs));
    } catch { /**/ }
  }, [gs, roomId]);

  // Active room
  useEffect(() => {
    if (!roomId) return;
    if (screenPhase === 'playing' && gs?.phase !== 'gameover') sessionStorage.setItem('ludoryn-active-room', JSON.stringify({ roomId, gameType: 'bommen' }));
    else if (gs?.phase === 'gameover') try { sessionStorage.removeItem('ludoryn-active-room'); } catch { /**/ }
  }, [roomId, screenPhase, gs?.phase]);

  // AI turn
  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1 || gs.phase === 'gameover' || gs.phase === 'boom') return;

    if (gs.phase === 'choosing') {
      const timer = setTimeout(() => {
        const cardId = aiPickCard(gs);
        const next = playCard(gs, cardId);
        setGs(next); emitState(next);
      }, 900);
      return () => clearTimeout(timer);
    }
    if (gs.phase === 'choosing-value') {
      const timer = setTimeout(() => {
        const value = aiPickValue(gs);
        const next = chooseValue(gs, value);
        setGs(next); emitState(next);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [gs, vsAI]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePlayCard() {
    if (!gs || !selectedCard) return;
    const next = playCard(gs, selectedCard);
    setGs(next); emitState(next); setSelectedCard(null);
  }

  function handleChooseValue(value: number) {
    if (!gs) return;
    const next = chooseValue(gs, value);
    setGs(next); emitState(next);
  }

  function handleNewRound() {
    if (!gs) return;
    const next = startNewRound(gs);
    setGs(next); emitState(next);
  }

  const isMyTurn = !roomId || (gs?.currentPlayer === myPlayerIndex);
  const isActivePlayer = gs?.currentPlayer === myPlayerIndex;

  // ── SCREENS ────────────────────────────────────────────────────────────────

  if (screenPhase === 'waiting') {
    return <WaitingScreen roomId={roomId!} players={lobbyPlayers.length > 0 ? lobbyPlayers : [myName || 'Speler 1']} myPlayerIndex={myPlayerIndex} maxPlayers={4} gameType="bommen" accent={ACCENT} />;
  }

  if (screenPhase === 'lobby') {
    const handleReady = () => { setIAmReady(true); getSocket().emit("player-ready", { roomId }); };
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>💣</div>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>1000 Bommen</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(238,242,255,0.25)', letterSpacing: '0.15em', marginTop: 4 }}>ROOM {roomId} · {lobbyPlayers.length}/4</div>
        </div>
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lobbyPlayers.map((name, i) => {
            const isReady = readyIndices.includes(i), isMe = i === myPlayerIndex;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isMe ? 'rgba(255,68,68,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(255,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '10px 14px' }}>
                <Avatar name={name} color={isMe ? ACCENT : '#4285F4'} size={36} />
                <div style={{ flex: 1, fontFamily: "'Nunito', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}{isMe ? ` ${t.youParen}` : ''}</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: isReady ? ACCENT : 'rgba(238,242,255,0.2)' }}>{isReady ? t.readyDone : t.waitDots}</div>
              </div>
            );
          })}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }} style={{ padding: "8px 20px", borderRadius: 50, border: `1px solid ${inviteCopied ? 'rgba(255,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, background: 'transparent', color: inviteCopied ? ACCENT : "rgba(238,242,255,0.35)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {inviteCopied ? t.inviteCopied : t.invitePlayers}
        </button>
        <button onClick={handleReady} disabled={iAmReady} style={{ padding: '14px 48px', borderRadius: 50, border: 'none', background: iAmReady ? 'rgba(255,68,68,0.15)' : ACCENT, color: iAmReady ? ACCENT : '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18, cursor: iAmReady ? 'default' : 'pointer', boxShadow: iAmReady ? 'none' : '0 4px 0 #990000' }}>
          {iAmReady ? t.readyDone : t.readyBtn}
        </button>
        <BottomNav chatMode="popup" items={[
          { label: t.home, icon: "home", onClick: () => router.push("/") },
          { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=bommen") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

        ]} />
      </div>
    );
  }

  if (screenPhase === 'countdown') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 100, fontWeight: 900, color: ACCENT, animation: 'countPop 0.35s cubic-bezier(0.34,1.56,0.64,1)' }} key={countdown}>{countdown}</div>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.3)' }}>{t.gameStarting}</div>
        <style>{`@keyframes countPop { from { transform: scale(1.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  if (screenPhase === 'start' || !gs) {
    return (
      <BommenStartScreen onStart={(names, ai) => {
        setMyPlayerIndex(0); setVsAI(ai);
        setGs(newGame(names)); setScreenPhase('playing');
      }} />
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────

  const me = gs.players[myPlayerIndex];
  const activePlayer = gs.players[gs.currentPlayer];
  const myTurn = isMyTurn && gs.phase === 'choosing';
  const myChoosing = isMyTurn && gs.phase === 'choosing-value';

  // Cards in hand
  const myHand = me?.hand ?? [];
  const handWithEffect = myHand.map(card => ({
    card,
    effect: getCardEffect(card.rank),
  }));

  return (
    <div style={{
      width: '100vw', height: '100dvh', background: 'var(--bg-gradient)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      paddingTop: 72, paddingBottom: 80, boxSizing: 'border-box', userSelect: 'none', gap: 8,
    }}>
      {/* Fixed header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', padding: '8px 8px', background: 'linear-gradient(to bottom, rgba(8,5,20,0.92) 60%, transparent)', backdropFilter: 'blur(12px)' }}>
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 0, overflow: 'hidden' }}>
            {gs.players.map((p, i) => (
              <GamePlayerCard key={i} name={p.name} avatarId={playerAvatars[p.name]} active={i === gs.currentPlayer} accent={ACCENT}
                scoreLabel={p.lives <= 0 ? '☠' : ''}>
                <LivesRow count={p.lives} />
              </GamePlayerCard>
            ))}
          </div>
          <div style={{ flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
            {roomId ? (
              <GameControls roomId={roomId} myName={gs.players[myPlayerIndex]?.name ?? "Speler"} playerNames={gs.players.map(p => p.name)} gameType="bommen" isGameOver={gs.phase === 'gameover' || forfeitWinner !== null} myPlayerIndex={myPlayerIndex} accent={ACCENT} onResign={() => { getSocket().emit("resign"); setForfeitWinner(gs!.players.find((_, i) => i !== myPlayerIndex)?.name ?? "Tegenstander"); }} inHeader />
            ) : (
              <button onClick={() => router.push('/')} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.18)', color: 'rgba(255,100,100,0.6)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l16 16M4 20L20 4"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Total + last action */}
      <div style={{ width: '100%', maxWidth: 500, padding: '0 16px' }}>
        <TotalDisplay total={gs.total} boomPlayer={gs.boomPlayer} players={gs.players} />
        {gs.lastAction && (
          <div style={{ textAlign: 'center', marginTop: 8, fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.35)', animation: 'fadeIn .3s ease' }}>
            {gs.lastAction}
          </div>
        )}
        {/* Direction indicator */}
        <div style={{ textAlign: 'center', marginTop: 4, fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(238,242,255,0.2)' }}>
          {gs.direction === 1 ? '→' : '←'} ronde {gs.roundNum}
        </div>
      </div>

      {/* Card hand */}
      <div style={{ width: '100%', maxWidth: 500, padding: '0 12px' }}>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: myTurn ? ACCENT : 'rgba(238,242,255,0.2)', marginBottom: 10, textAlign: 'center', transition: 'color 0.3s' }}>
          {myTurn ? 'Jouw beurt — kies een kaart' : myChoosing ? 'Kies een waarde' : gs.phase === 'boom' ? '' : isActivePlayer ? 'Aan het kiezen…' : `Wacht op ${activePlayer.name}…`}
        </div>

        {/* Hand cards */}
        {gs.phase !== 'boom' && gs.phase !== 'gameover' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', padding: '0 4px' }}>
            {myHand.map((c, i) => {
              const isSelected = selectedCard === c.id;
              const canPlay = myTurn;
              return (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <PlayingCard
                    card={c}
                    selected={isSelected}
                    playable={canPlay}
                    onClick={canPlay ? () => setSelectedCard(isSelected ? null : c.id) : undefined}
                  />
                  {isSelected && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: ACCENT, letterSpacing: '0.06em' }}>
                      {effectLabel(getCardEffect(c.rank))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Choice buttons for 9 or Ace */}
        {myChoosing && gs.choiceOptions.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            {gs.choiceOptions.map(v => (
              <button key={v} onClick={() => handleChooseValue(v)} style={{
                padding: '14px 28px', borderRadius: 50, border: 'none',
                background: v < 0 ? 'linear-gradient(135deg, #00C875, #00A050)' : `linear-gradient(135deg, ${ACCENT}, #CC2200)`,
                color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20,
                cursor: 'pointer', boxShadow: `0 4px 16px rgba(${v < 0 ? '0,200,117' : '255,68,68'},0.4)`,
              }}>
                {v >= 0 ? `+${v}` : v}
              </button>
            ))}
          </div>
        )}

        {/* Play button */}
        {myTurn && selectedCard && gs.phase === 'choosing' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <button onClick={handlePlayCard} style={{
              padding: '14px 40px', borderRadius: 50, border: 'none',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
              color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16,
              cursor: 'pointer', boxShadow: '0 4px 0 #990000',
            }}>
              Speel kaart
            </button>
          </div>
        )}

        {/* Other players card count */}
        {gs.phase === 'choosing' && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 16 }}>
            {gs.players.map((p, i) => {
              if (i === myPlayerIndex || p.lives <= 0) return null;
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 4 }}>
                    {Array.from({ length: p.hand.length }).map((_, j) => (
                      <div key={j} style={{ width: 20, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
                    ))}
                  </div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, color: 'rgba(238,242,255,0.3)' }}>{p.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI thinking indicator */}
      {vsAI && gs.currentPlayer === 1 && (gs.phase === 'choosing' || gs.phase === 'choosing-value') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 8px ${ACCENT}`, animation: 'pulse 1s infinite' }} />
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'rgba(238,242,255,0.35)' }}>{t.aiThinking}</span>
        </div>
      )}

      {/* BOOM overlay */}
      {gs.phase === 'boom' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,0,0,0.94)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, zIndex: 200, animation: 'fadeIn .2s ease' }}>
          <div style={{ fontSize: 80, animation: 'boomPop 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>💣</div>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 36, fontWeight: 900, color: ACCENT, textShadow: `0 0 30px ${ACCENT}` }}>BOOM!</div>
          {gs.boomPlayer !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 18, color: 'rgba(238,242,255,0.8)', marginBottom: 8 }}>
                {gs.players[gs.boomPlayer].name} verliest een leven!
              </div>
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                {gs.players.map((p, i) => (
                  p.lives >= 0 ? (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(238,242,255,0.4)', marginBottom: 4 }}>{p.name}</div>
                      <LivesRow count={i === gs.boomPlayer ? p.lives : p.lives} />
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}
          {(isMyTurn || !roomId) && (
            <button onClick={handleNewRound} style={{ padding: '14px 40px', borderRadius: 50, border: 'none', background: ACCENT, color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 0 #990000' }}>
              Nieuwe ronde →
            </button>
          )}
        </div>
      )}

      {/* GAMEOVER overlay */}
      {(gs.phase === 'gameover' || forfeitWinner) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,0,0,0.94)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 200 }}>
          <div style={{ fontSize: 60 }}>🏆</div>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 900, color: ACCENT }}>{t.gameOver}</div>
          {forfeitWinner ? (
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: 'rgba(238,242,255,0.7)' }}>{forfeitWinner} {t.winsShort}</div>
          ) : (
            <div>
              {gs.players.map((p, i) => {
                const winner = p.lives > 0 && gs.players.filter(pp => pp.lives > 0).length === 1;
                return (
                  <div key={i} style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: 'rgba(238,242,255,0.7)', marginBottom: 6, textAlign: 'center' }}>
                    {p.name}: {p.lives} {p.lives === 1 ? 'leven' : 'levens'}
                    {winner && <span style={{ color: ACCENT, fontWeight: 700, marginLeft: 8 }}>🏆 {t.winner}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            {!roomId && (
              <button onClick={() => { setGs(null); setScreenPhase('start'); }} style={{ padding: '12px 28px', borderRadius: 50, border: 'none', background: ACCENT, color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                {t.playAgain}
              </button>
            )}
            <button onClick={() => router.push('/lobby?game=bommen')} style={{ padding: '12px 28px', borderRadius: 50, border: `1px solid rgba(255,68,68,0.3)`, background: 'transparent', color: ACCENT, fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              {t.backToLobby}
            </button>
          </div>
        </div>
      )}

      <BottomNav chatMode="popup" items={[
        { label: t.home, icon: "home", onClick: () => router.push("/") },
        { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=bommen") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

      ]} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes boomPop { from{transform:scale(.3);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}

export default function BommenPage() {
  return (
    <Suspense>
      <BommenContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { getSocket } from "@/lib/socket";
import WaitingScreen from "@/components/WaitingScreen";
import { BottomNav } from "@/components/ui";
import BottomSheet from "@/components/BottomSheet";
import GameControls from "@/components/GameControls";
import { useLang } from "@/lib/lang";
import {
  type GameState, type Player,
  newGame, peekCard, confirmPeek, drawFromDeck, drawFromDiscard,
  swapCard, discardDrawn, callBeverbende, aiDecide, playerTotal,
} from "@/lib/beverbende";

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = "#2EC4B6";
const ACCENT_DARK = "#0D7A73";
const BG = "linear-gradient(160deg, #041E1C 0%, #020E0D 100%)";

// ─────────────────────────────────────────────────────────────────────────────
// Card component
// ─────────────────────────────────────────────────────────────────────────────

function CardFace({ value, size = 56, animDelay = 0 }: { value: number; size?: number; animDelay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const color = value <= 3 ? "#2EC4B6" : value <= 7 ? "#FFB830" : "#FF5C5C";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el,
      { scaleX: 0.05, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 0.32, delay: animDelay, ease: "back.out(2)" }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} style={{
      width: size, height: size * 1.4,
      borderRadius: size * 0.14,
      backgroundImage: "url('/images/games/beverbende-card-face.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Fredoka', sans-serif", fontWeight: 700,
      fontSize: size * 0.4, color,
      boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
    }}>
      {value}
    </div>
  );
}

function CardBack({ size = 56, highlight = false, onClick }: { size?: number; highlight?: boolean; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const prevHighlight = useRef(highlight);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el,
      { scale: 0.78, opacity: 0 },
      { scale: highlight ? 1.06 : 1, opacity: 1, duration: 0.28, ease: "back.out(1.8)" }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (highlight && !prevHighlight.current) {
      gsap.fromTo(el,
        { scale: 1 },
        { scale: 1.1, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.inOut" }
      );
    }
    prevHighlight.current = highlight;
  }, [highlight]);

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        width: size, height: size * 1.4,
        borderRadius: size * 0.14,
        backgroundImage: "url('/images/games/card-back.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: `1.5px solid ${highlight ? ACCENT : "rgba(46,196,182,0.25)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: highlight ? `0 0 14px ${ACCENT}55` : "none",
      }}
    >
    </div>
  );
}

// Flash overlay when Beverbende is called
function BeaverFlash({ caller }: { caller: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const tl = gsap.timeline();
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" })
      .fromTo(txt,
        { scale: 0.3, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: "back.out(2.5)" }, "-=0.05"
      )
      .to(txt, { scale: 1.06, duration: 0.12, ease: "power1.inOut", yoyo: true, repeat: 1 }, "+=0.3")
      .to(el, { opacity: 0, duration: 0.35, ease: "power2.in" }, "+=0.7");
  }, []);

  return (
    <div ref={ref} style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(2,14,13,0.88)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div ref={textRef} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, lineHeight: 1 }}>🦫</div>
        <div style={{
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 42,
          color: "#FFB830", letterSpacing: "0.04em", marginTop: 12,
          textShadow: "0 0 40px rgba(255,184,48,0.6)",
        }}>
          FLIKFLAK!
        </div>
        <div style={{
          fontFamily: "'Nunito', sans-serif", fontSize: 16, color: "rgba(238,242,255,0.6)",
          marginTop: 8,
        }}>
          {caller} riep het!
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player hand
// ─────────────────────────────────────────────────────────────────────────────

function PlayerHand({
  player, playerIdx, isMe, isActive, gs,
  onCardClick, highlightAll,
}: {
  player: Player;
  playerIdx: number;
  isMe: boolean;
  isActive: boolean;
  gs: GameState;
  onCardClick?: (idx: number) => void;
  highlightAll?: boolean;
}) {
  const isReveal = gs.phase === "reveal";
  const isPeek = gs.phase === "peek" && isMe && isActive;

  return (
    <div style={{
      padding: "14px 16px",
      background: isActive && gs.phase !== "reveal"
        ? `rgba(46,196,182,0.07)` : "rgba(255,255,255,0.03)",
      border: `1px solid ${isActive && gs.phase !== "reveal" ? "rgba(46,196,182,0.3)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 16,
      transition: "all 0.2s",
    }}>
      {/* Name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: isActive && gs.phase !== "reveal" ? ACCENT : "rgba(255,255,255,0.2)",
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Fredoka', sans-serif", fontSize: 15, fontWeight: 700,
          color: isActive && gs.phase !== "reveal" ? ACCENT : "rgba(238,242,255,0.7)",
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {player.name}{isMe ? " (jij)" : ""}
        </span>
        {isReveal && (
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700,
            color: ACCENT,
          }}>
            {playerTotal(player)} pt
          </span>
        )}
        {gs.callerIndex === playerIdx && !isReveal && (
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 50,
            background: "rgba(255,181,0,0.15)", border: "1px solid rgba(255,181,0,0.35)",
            color: "#FFB830", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
          }}>
            Beverbende!
          </span>
        )}
      </div>
      {/* Cards */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {player.cards.map((card, ci) => {
          const canClick = onCardClick && (isPeek || (isMe && gs.drawnCard !== null));
          if (isReveal || card.faceUp) {
            // stagger reveal: per player row delay + per card offset
            const revealDelay = isReveal ? playerIdx * 0.18 + ci * 0.1 : 0;
            return (
              <div key={card.id} onClick={() => canClick && onCardClick!(ci)}
                style={{ cursor: canClick ? "pointer" : "default" }}>
                <CardFace value={card.value} animDelay={revealDelay} />
              </div>
            );
          }
          return (
            <CardBack
              key={card.id}
              highlight={highlightAll || (canClick ?? false)}
              onClick={canClick ? () => onCardClick!(ci) : undefined}
            />
          );
        })}
      </div>
      {isPeek && (
        <div style={{
          marginTop: 10, textAlign: "center",
          fontFamily: "'Nunito', sans-serif", fontSize: 11,
          color: "rgba(238,242,255,0.4)",
        }}>
          Tik een kaart aan om te kijken
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawn card panel
// ─────────────────────────────────────────────────────────────────────────────

function DrawnCardPanel({
  card, from, onDiscard,
}: {
  card: number; from: "deck" | "discard";
  onDiscard: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // deck is left, discard is right of center — animate from corresponding direction
    const xDir = from === "deck" ? -28 : 28;
    gsap.fromTo(el,
      { y: -24, x: xDir, opacity: 0, scale: 0.88 },
      { y: 0, x: 0, opacity: 1, scale: 1, duration: 0.48, ease: "back.out(1.6)" }
    );
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} style={{
      padding: "14px 16px",
      background: "rgba(46,196,182,0.06)",
      border: "1px solid rgba(46,196,182,0.3)",
      borderRadius: 16, textAlign: "center",
    }}>
      <div style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 12,
        color: "rgba(238,242,255,0.5)", marginBottom: 10,
      }}>
        Getrokken van {from === "deck" ? "stapel" : "afleg"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <CardFace value={card} size={64} />
      </div>
      <div style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 12,
        color: `rgba(46,196,182,0.8)`, marginBottom: from === "deck" ? 12 : 0,
      }}>
        Klik op een van je kaarten om te wisselen
      </div>
      {from === "deck" && (
        <button onClick={onDiscard} style={{
          width: "100%", padding: "10px", borderRadius: 50,
          border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
          color: "rgba(238,242,255,0.6)",
          fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
          cursor: "pointer",
        }}>
          Afleggen
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────

function BeaverbendeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const roomId = params.get("room");
  const vsAI = params.get("ai") === "1";
  const { t } = useLang();

  const [gs, setGs] = useState<GameState | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [screenPhase, setScreenPhase] = useState<"start" | "playing">("start");
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [name1, setName1] = useState("Robin");
  const [name2, setName2] = useState(vsAI ? "AI" : "Loic");
  const [opponentName, setOpponentName] = useState("");
  const [isSpectator, setIsSpectator] = useState(false);
  const [forfeitWinner, setForfeitWinner] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState(0);
  const [rulesSearch, setRulesSearch] = useState("");
  const [beaverFlashCaller, setBeaverFlashCaller] = useState<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);

  // Detecteer fase-overgang naar 'called' voor flash overlay
  useEffect(() => {
    if (!gs) return;
    if (gs.phase === "called" && prevPhaseRef.current !== "called" && gs.callerIndex !== null) {
      setBeaverFlashCaller(gs.players[gs.callerIndex].name);
      setTimeout(() => setBeaverFlashCaller(null), 2000);
    }
    prevPhaseRef.current = gs.phase;
  }, [gs?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMyTurn = gs
    ? !roomId || gs.currentPlayer === myPlayerIndex
    : false;

  // ── Socket / multiplayer ──────────────────────────────────────────────────

  function emitState(state: GameState) {
    if (!roomId) return;
    getSocket().emit("state-update", { gameState: state });
  }

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    const pidx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? "0");
    const myName = sessionStorage.getItem("ludoryn-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setLobbyPlayers([myName]);

    if (vsAI) {
      const state = newGame([myName, "AI"]);
      setGs(state);
      setScreenPhase("playing");
      return;
    }

    const onRoomUpdate = ({ players: names, ready }: { players: string[]; ready: boolean }) => {
      setLobbyPlayers(names);
      if (names.length >= 2) setOpponentName(names[1 - pidx] ?? "");
      if (ready && pidx === 0) {
        setGs(prev => {
          if (prev) return prev;
          const state = newGame([myName, names[1] ?? "Speler 2"]);
          socket.emit("state-update", { gameState: state });
          return state;
        });
        setScreenPhase("playing");
      }
    };
    const onStateSync   = ({ gameState }: { gameState: GameState | null }) => { if (gameState) { setGs(gameState); setScreenPhase("playing"); } };
    const onStateUpdate = ({ gameState }: { gameState: GameState }) => { setGs(gameState); setScreenPhase("playing"); };

    socket.on("room-update", onRoomUpdate);
    socket.on("state-sync", onStateSync);
    socket.on("state-update", onStateUpdate);
    socket.on("turn-forfeit", ({ winnerName }: { winnerName: string }) => setForfeitWinner(winnerName));
    socket.io.on("reconnect", () => socket.emit("join-room", { roomId, name: myName }));

    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null; players: string[] }) => {
      if (res.players.length > 0) setLobbyPlayers(res.players);
      if (res.players.length >= 2) setOpponentName(res.players[1 - pidx] ?? "");
      if (res.gameState) { setGs(res.gameState); setScreenPhase("playing"); }
    });

    return () => {
      socket.off("room-update", onRoomUpdate);
      socket.off("state-sync", onStateSync);
      socket.off("state-update", onStateUpdate);
      socket.off("turn-forfeit");
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI turns ─────────────────────────────────────────────────────────────

  // AI peek: auto-peek and confirm
  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1 || gs.phase !== "peek") return;
    const timer = setTimeout(() => {
      let state = gs;
      // Peek card 0 (if not yet peeked)
      if (state.peekCardIndex === null) state = peekCard(state, 0);
      state = confirmPeek(state);
      if (state.phase === "peek" && state.currentPlayer === 1) {
        // Still AI's peek turn (second card)
        if (state.peekCardIndex === null) state = peekCard(state, 1);
        state = confirmPeek(state);
      }
      setGs(state);
    }, 400);
    return () => clearTimeout(timer);
  }, [gs, vsAI]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI normal turn
  useEffect(() => {
    if (!gs || !vsAI || gs.currentPlayer !== 1) return;
    if (gs.phase === "reveal" || gs.phase === "gameover" || gs.phase === "peek") return;
    const timer = setTimeout(() => {
      const ng = aiDecide(gs);
      setGs(ng);
    }, 1200);
    return () => clearTimeout(timer);
  }, [gs, vsAI]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleCardClick(idx: number) {
    if (!gs || !isMyTurn) return;

    if (gs.phase === "peek") {
      if (gs.peekCardIndex === null) {
        setGs(peekCard(gs, idx));
      }
      return;
    }

    if (gs.phase === "playing" || gs.phase === "called") {
      if (gs.drawnCard !== null) {
        const ng = swapCard(gs, idx);
        setGs(ng); emitState(ng);
      }
    }
  }

  function handleDrawDeck() {
    if (!gs || !isMyTurn || gs.drawnCard !== null) return;
    setGs(drawFromDeck(gs));
  }

  function handleDrawDiscard() {
    if (!gs || !isMyTurn || gs.drawnCard !== null || gs.discard.length === 0) return;
    setGs(drawFromDiscard(gs));
  }

  function handleDiscardDrawn() {
    if (!gs) return;
    const ng = discardDrawn(gs);
    setGs(ng); emitState(ng);
  }

  function handleConfirmPeek() {
    if (!gs) return;
    const ng = confirmPeek(gs);
    setGs(ng); emitState(ng);
  }

  function handleCallBeverbende() {
    if (!gs || !isMyTurn) return;
    const ng = callBeverbende(gs);
    setGs(ng); emitState(ng);
  }

  function handleNewRound() {
    if (!gs) return;
    const scores = gs.players.map(p => p.score);
    const ng = newGame(gs.players.map(p => p.name), scores);
    setGs(ng); emitState(ng);
  }

  // ── Waiting screen (online) ───────────────────────────────────────────────
  if (screenPhase === "start" && roomId) {
    const myName = sessionStorage.getItem("ludoryn-name") ?? `Speler ${myPlayerIndex + 1}`;
    const players = lobbyPlayers.length > 0 ? lobbyPlayers : [myName];
    return <WaitingScreen roomId={roomId} players={players} myPlayerIndex={myPlayerIndex} gameType="beverbende" accent={ACCENT} />;
  }

  // ── Start screen ─────────────────────────────────────────────────────────

  if (screenPhase === "start" && !roomId) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🦫</div>
            <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 36, fontWeight: 700, color: ACCENT, margin: 0 }}>Flikflak</h1>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(238,242,255,0.45)", margin: "8px 0 0" }}>
              Onthoud je kaarten · Laagste score wint
            </p>
          </div>

          {[
            { label: "Speler 1", value: name1, set: setName1 },
            { label: vsAI ? "Tegenstander" : "Speler 2", value: name2, set: setName2, disabled: vsAI },
          ].map(({ label, value, set, disabled }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(238,242,255,0.5)", display: "block", marginBottom: 5 }}>{label}</label>
              <input
                value={value}
                onChange={e => !disabled && set(e.target.value)}
                readOnly={disabled}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(46,196,182,0.2)",
                  borderRadius: 12, padding: "11px 14px",
                  color: disabled ? "rgba(238,242,255,0.3)" : "#EEF2FF",
                  fontFamily: "'Nunito', sans-serif", fontSize: 15, outline: "none",
                }}
              />
            </div>
          ))}

          <button
            onClick={() => {
              const state = newGame([name1 || "Speler 1", name2 || "Speler 2"]);
              setGs(state);
              setScreenPhase("playing");
            }}
            style={{
              width: "100%", marginTop: 20,
              padding: "14px", borderRadius: 50, border: "none",
              background: ACCENT, color: "#001A18",
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
              cursor: "pointer", boxShadow: `0 5px 0 ${ACCENT_DARK}`,
            }}
          >
            Spelen!
          </button>
        </div>

        <BottomNav items={[
          { label: t.home, icon: "home", onClick: () => router.push("/") },
          { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=beverbende") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

        ]} />
      </div>
    );
  }

  if (!gs) return null;

  const cp = gs.currentPlayer;
  const cpPlayer = gs.players[cp];
  const topDiscard = gs.discard[gs.discard.length - 1] ?? null;

  // ── Reveal/score screen ───────────────────────────────────────────────────

  if (gs.phase === "reveal") {
    const totals = gs.players.map(playerTotal);
    const minTotal = Math.min(...totals);
    const callerIdx = gs.callerIndex!;
    const callerWon = totals[callerIdx] <= minTotal;

    return (
      <div style={{ minHeight: "100vh", background: BG, paddingBottom: 90 }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 20px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{callerWon ? "🎉" : "😬"}</div>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 28, fontWeight: 700, color: ACCENT, margin: 0 }}>
              {callerWon ? "Goed geroepen!" : "Niet de laagste..."}
            </h2>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(238,242,255,0.5)", margin: "6px 0 0" }}>
              {gs.message}
            </p>
          </div>

          {gs.players.map((p, i) => {
            const roundScore = i === callerIdx
              ? (callerWon ? 0 : totals[i] * 2)
              : totals[i];
            const isWinner = totals[i] === minTotal;
            return (
              <div key={i} style={{
                marginBottom: 12, padding: "14px 16px",
                background: isWinner ? "rgba(46,196,182,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isWinner ? "rgba(46,196,182,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 700, color: isWinner ? ACCENT : "rgba(238,242,255,0.7)", flex: 1 }}>
                    {isWinner && "🏆 "}{p.name}
                    {i === callerIdx && <span style={{ fontSize: 11, marginLeft: 8, color: "#FFB830" }}>Flikflak!</span>}
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: isWinner ? ACCENT : "#FF5C5C" }}>
                    +{roundScore}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {p.cards.map(c => <CardFace key={c.id} value={c.value} size={42} />)}
                </div>
                <div style={{ marginTop: 8, fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "rgba(238,242,255,0.4)" }}>
                  Totaalscore: {p.score} punten
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={handleNewRound} style={{
              flex: 2, padding: "13px", borderRadius: 50, border: "none",
              background: ACCENT, color: "#001A18",
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16,
              cursor: "pointer", boxShadow: `0 4px 0 ${ACCENT_DARK}`,
            }}>
              Nieuwe ronde
            </button>
            <button onClick={() => router.push("/")} style={{
              flex: 1, padding: "13px", borderRadius: 50,
              border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
              color: "rgba(238,242,255,0.6)",
              fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
              cursor: "pointer",
            }}>
              Home
            </button>
          </div>
        </div>
        <BottomNav items={[
          { label: t.home, icon: "home", onClick: () => router.push("/") },
          { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=beverbende") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

        ]} />
      </div>
    );
  }

  // ── Playing screen ────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 90 }}>

      {/* Header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
        background: "rgba(2,8,8,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(46,196,182,0.15)",
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 700, color: ACCENT }}>
            🃏 Flikflak
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: "rgba(238,242,255,0.4)", marginTop: 1 }}>
            {gs.phase === "called"
              ? `${gs.players[gs.callerIndex!].name} riep Flikflak!`
              : gs.phase === "peek"
                ? `${cpPlayer.name} bekijkt kaarten`
                : `${cpPlayer.name} is aan de beurt`}
          </div>
        </div>
        {roomId ? (
          <GameControls
            roomId={roomId}
            myName={gs.players[myPlayerIndex]?.name ?? "Speler"}
            playerNames={gs.players.map(p => p.name)}
            gameType="beverbende"
            isSpectator={isSpectator}
            isGameOver={gs.phase === "gameover"}
            myPlayerIndex={myPlayerIndex}
            accent={ACCENT}
            onResign={() => {
              if (vsAI) {
                setForfeitWinner("AI");
              } else {
                getSocket().emit("resign");
                setForfeitWinner(gs.players.find((_, i) => i !== myPlayerIndex)?.name ?? "Tegenstander");
              }
            }}
            inHeader
          />
        ) : (
          <button
            onClick={() => { setGs(null); setScreenPhase("start"); }}
            style={{
              width: 34, height: 34, flexShrink: 0, borderRadius: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(238,242,255,0.5)", fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >←</button>
        )}
        <button onClick={() => setShowRules(true)} style={{
          width: 34, height: 34, flexShrink: 0, borderRadius: 10,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(238,242,255,0.5)", fontSize: 14, fontWeight: 700,
          fontFamily: "'Nunito', sans-serif", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>?</button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "76px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Status message */}
        <div style={{
          padding: "10px 14px",
          background: "rgba(46,196,182,0.05)",
          border: "1px solid rgba(46,196,182,0.15)",
          borderRadius: 12,
          fontFamily: "'Nunito', sans-serif", fontSize: 12,
          color: "rgba(238,242,255,0.6)", textAlign: "center",
        }}>
          {gs.message}
        </div>

        {/* Players */}
        {gs.players.map((player, i) => (
          <PlayerHand
            key={i}
            player={player}
            playerIdx={i}
            isMe={i === myPlayerIndex}
            isActive={i === cp}
            gs={gs}
            onCardClick={i === myPlayerIndex && isMyTurn ? handleCardClick : undefined}
            highlightAll={i === myPlayerIndex && isMyTurn && gs.drawnCard !== null}
          />
        ))}

        {/* Deck + discard row */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
          {/* Deck */}
          <div style={{ textAlign: "center" }}>
            <div
              onClick={() => isMyTurn && gs.phase !== "peek" && !gs.drawnCard && handleDrawDeck()}
              style={{
                width: 56, height: 78, borderRadius: 8,
                background: isMyTurn && !gs.drawnCard && gs.phase !== "peek"
                  ? "rgba(46,196,182,0.15)" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${isMyTurn && !gs.drawnCard && gs.phase !== "peek" ? ACCENT : "rgba(255,255,255,0.1)"}`,
                cursor: isMyTurn && !gs.drawnCard && gs.phase !== "peek" ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 12, color: "rgba(238,242,255,0.35)" }}>
                {gs.deck.length}
              </span>
            </div>
            <div style={{ marginTop: 4, fontFamily: "'Nunito', sans-serif", fontSize: 10, color: "rgba(238,242,255,0.35)" }}>Stapel</div>
          </div>

          {/* Discard */}
          <div style={{ textAlign: "center" }}>
            {topDiscard !== null ? (
              <div
                onClick={() => isMyTurn && !gs.drawnCard && gs.phase !== "peek" && handleDrawDiscard()}
                style={{ cursor: isMyTurn && !gs.drawnCard && gs.phase !== "peek" ? "pointer" : "default" }}
              >
                <CardFace value={topDiscard} size={56} />
              </div>
            ) : (
              <CardBack size={56} />
            )}
            <div style={{ marginTop: 4, fontFamily: "'Nunito', sans-serif", fontSize: 10, color: "rgba(238,242,255,0.35)" }}>Afleg</div>
          </div>
        </div>

        {/* Drawn card */}
        {gs.drawnCard !== null && isMyTurn && (
          <DrawnCardPanel
            card={gs.drawnCard}
            from={gs.drawnFrom!}
            onDiscard={handleDiscardDrawn}
          />
        )}

        {/* Actions */}
        {isMyTurn && gs.drawnCard === null && gs.phase !== "peek" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCallBeverbende}
              style={{
                flex: 1, padding: "12px", borderRadius: 50,
                border: "1px solid rgba(255,181,0,0.35)", background: "rgba(255,181,0,0.08)",
                color: "#FFB830",
                fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15,
                cursor: "pointer",
              }}
            >
              🃏 Flikflak!
            </button>
          </div>
        )}

        {/* Peek confirm */}
        {gs.phase === "peek" && isMyTurn && gs.peekCardIndex !== null && (
          <button
            onClick={handleConfirmPeek}
            style={{
              width: "100%", padding: "12px", borderRadius: 50,
              border: "none", background: ACCENT, color: "#001A18",
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16,
              cursor: "pointer", boxShadow: `0 4px 0 ${ACCENT_DARK}`,
            }}
          >
            Begrepen ✓
          </button>
        )}
      </div>

      {/* Bottom nav */}
      <BottomNav items={[
        { label: t.home, icon: "home", onClick: () => router.push("/") },
        { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=beverbende") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

      ]} />

      {/* Spelregels */}
      {(() => {
        const RULES = t.beaverRules;
        const filtered = rulesSearch.trim()
          ? RULES.filter(([, title, text]) =>
              title.toLowerCase().includes(rulesSearch.toLowerCase()) ||
              text.toLowerCase().includes(rulesSearch.toLowerCase()))
          : null;
        return (
          <BottomSheet
            isOpen={showRules}
            onClose={() => { setShowRules(false); setRulesSearch(""); setActiveRuleTab(0); }}
            sheetStyle={{ background: "#020E0D", border: "1px solid rgba(46,196,182,0.2)", borderRadius: "24px 24px 0 0" }}
          >
            {(close) => (<>
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
              </div>
              <div style={{ padding: "8px 20px 0", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: ACCENT, marginBottom: 12 }}>
                  {t.gameRules("Flikflak")}
                </div>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.45, pointerEvents: "none" }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="#EEF2FF" strokeWidth="2"/>
                    <path d="M14 14l3.5 3.5" stroke="#EEF2FF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input value={rulesSearch} onChange={e => setRulesSearch(e.target.value)} placeholder={t.searchPlaceholder}
                    style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: `1px solid rgba(46,196,182,0.2)`, borderRadius: 12, padding: "9px 14px 9px 36px", color: "#EEF2FF", fontFamily: "'Nunito', sans-serif", fontSize: 13, outline: "none" }} />
                  {rulesSearch && <button onClick={() => setRulesSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(238,242,255,0.4)", fontSize: 16, lineHeight: 1 }}>×</button>}
                </div>
                {!filtered && (
                  <div style={{ position: "relative", margin: "0 -20px" }}>
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, paddingTop: 4, paddingLeft: 20, paddingRight: 20, scrollbarWidth: "none" }}>
                      {RULES.map(([icon, title], i) => (
                        <button key={title} onClick={() => setActiveRuleTab(i)} style={{ flexShrink: 0, padding: "5px 13px", borderRadius: 50, border: "none", background: activeRuleTab === i ? ACCENT : "transparent", outline: activeRuleTab === i ? "none" : `1px solid rgba(46,196,182,0.25)`, color: activeRuleTab === i ? "#001A18" : `rgba(46,196,182,0.85)`, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                          <span>{icon}</span> {title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, overflow: "hidden", padding: "0 20px" }}>
                {filtered ? (
                  <div style={{ overflowY: "auto", maxHeight: "100%", paddingTop: 8, paddingBottom: 16 }}>
                    {filtered.length === 0
                      ? <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(238,242,255,0.3)", fontFamily: "'Nunito', sans-serif", fontSize: 13 }}>{t.noResults}</div>
                      : filtered.map(([icon, title, text]) => (
                        <div key={title} style={{ marginBottom: 12, padding: "14px 16px", background: `rgba(46,196,182,0.07)`, border: `1px solid rgba(46,196,182,0.18)`, borderRadius: 14 }}>
                          <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, color: ACCENT, marginBottom: 5 }}>{icon} {title}</div>
                          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(238,242,255,0.8)", lineHeight: 1.65 }}>{text}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ textAlign: "center", fontSize: 52, paddingTop: 16, paddingBottom: 8, flexShrink: 0 }}>{RULES[activeRuleTab][0]}</div>
                    <div style={{ overflow: "hidden", flex: 1 }}>
                      <div style={{ display: "flex", height: "100%", transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)", transform: `translateX(calc(-${activeRuleTab * 100}%))` }}>
                        {RULES.map(([, title, text]) => (
                          <div key={title} style={{ minWidth: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: "8px 0 12px" }}>
                            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 26, color: ACCENT, marginBottom: 12, textAlign: "center" }}>{title}</div>
                            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, color: "rgba(238,242,255,0.85)", lineHeight: 1.75, textAlign: "center" }}>{text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "12px 0", flexShrink: 0 }}>
                      {RULES.map((_, di) => (
                        <div key={di} onClick={() => setActiveRuleTab(di)} style={{ width: di === activeRuleTab ? 20 : 7, height: 7, borderRadius: 4, background: di === activeRuleTab ? ACCENT : "rgba(255,255,255,0.18)", transition: "all 0.2s", cursor: "pointer" }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!filtered && (
                <div style={{ padding: "12px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setActiveRuleTab(i => Math.max(0, i - 1))} disabled={activeRuleTab === 0} style={{ flex: 1, padding: "11px", borderRadius: 50, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: activeRuleTab === 0 ? "rgba(255,255,255,0.2)" : "rgba(238,242,255,0.7)", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, cursor: activeRuleTab === 0 ? "default" : "pointer" }}>{t.previous}</button>
                  <button onClick={() => activeRuleTab < RULES.length - 1 ? setActiveRuleTab(i => i + 1) : close()} style={{ flex: 2, padding: "11px", borderRadius: 50, border: "none", background: ACCENT, color: "#001A18", fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: `0 4px 0 ${ACCENT_DARK}` }}>{activeRuleTab < RULES.length - 1 ? t.nextBtn : t.closeConfirm}</button>
                </div>
              )}
              {filtered && (
                <div style={{ padding: "12px 20px 20px", flexShrink: 0 }}>
                  <button onClick={close} style={{ width: "100%", padding: "11px", borderRadius: 50, border: "none", background: ACCENT, color: "#001A18", fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: `0 4px 0 ${ACCENT_DARK}` }}>{t.closeBtn}</button>
                </div>
              )}
            </>)}
          </BottomSheet>
        );
      })()}

      {/* ── Beverbende flash ── */}
      {beaverFlashCaller && <BeaverFlash caller={beaverFlashCaller} />}

      {/* ── Forfeit overlay ── */}
      {forfeitWinner && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(2,10,9,0.92)",
          backdropFilter: "blur(20px)", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 20, zIndex: 300,
        }}>
          <div style={{ fontSize: 52 }}>🏳️</div>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: "#EEF2FF" }}>
            Opgegeven
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 16, color: "rgba(238,242,255,0.5)" }}>
            {forfeitWinner} wint
          </div>
          <button
            onClick={() => router.push("/lobby?game=beverbende")}
            style={{
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16,
              background: ACCENT, color: "#001A18", border: "none", borderRadius: 50,
              padding: "12px 32px", cursor: "pointer", boxShadow: `0 4px 0 ${ACCENT_DARK}`,
            }}
          >
            Lobby
          </button>
        </div>
      )}
    </div>
  );
}

export default function BeverbendePage() {
  return (
    <Suspense>
      <BeaverbendeContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl, apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getTheme, THEMES } from "@/lib/themes";
import {
  Avatar, Button, Skeleton,
  TableCard, NameModal, LoginModal,
  BottomNav, PageHeader,
} from "@/components/ui";
import { useLang } from "@/lib/lang";

type Session = {
  room_id: string;
  player1_name: string | null;
  player2_name: string | null;
  status: string;
  started_at: string;
  game_mode: "fast" | "slow" | null;
  game_type: string | null;
  turn_deadline: string | null;
};

function formatDeadline(deadline: string | null, gameMode: "fast" | "slow" | null, t: { expired: string; timeLeft: (h: number, m: number) => string; minutesLeft: (m: number) => string }): string {
  if (!deadline) return "";
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return t.expired;
  if (gameMode === "slow") {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h >= 1) return t.timeLeft(h, m);
    return t.minutesLeft(m);
  }
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function LobbyContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const theme       = getTheme(searchParams.get("game"));
  const { lang, t } = useLang();

  const [sessions, setSessions]       = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [joinTarget, setJoinTarget] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [searching, setSearching]   = useState(false);
  const [countdown, setCountdown]   = useState(5);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showLogin, setShowLogin]   = useState(false);
  const [loggedIn, setLoggedIn]     = useState(false);
  const [gameMode, setGameMode]     = useState<"fast" | "slow">("fast");
  const [showCodeJoin, setShowCodeJoin] = useState(false);
  const [codeInput, setCodeInput]   = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    // Probeer ingelogde user op te halen; anders val terug op sessionStorage
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.username) {
          setPlayerName(data.username);
          setLoggedIn(true);
          sessionStorage.setItem("ludoryn-name", data.username);
        } else {
          const saved = sessionStorage.getItem("ludoryn-name");
          if (saved) setPlayerName(saved);
        }
      })
      .catch(() => {
        const saved = sessionStorage.getItem("ludoryn-name");
        if (saved) setPlayerName(saved);
      });
  }, []);

  const gameId = searchParams.get("game") ?? "grub";

  function fetchSessions() {
    apiFetch(`/api/sessions?game=${gameId}`)
      .then((r) => r.json())
      .then((data: Session[]) => { setSessions(data.filter((s) => s.status === "waiting" || s.status === "active")); setSessionsLoading(false); })
      .catch(() => setSessionsLoading(false));
  }

  useEffect(() => {
    setSessionsLoading(true);
    fetchSessions();

    // Real-time lobby updates from server
    const socket = getSocket();
    socket.on("lobby-update", fetchSessions);
    return () => { socket.off("lobby-update", fetchSessions); };
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  function getGameRoute(roomId: string) {
    if (gameId === "grub") return `/grub?room=${roomId}`;
    if (gameId === "ticket-to-ride") return `/ticket-to-ride?room=${roomId}`;
    if (gameId === "carcassonne") return `/carcassonne?room=${roomId}`;
    if (gameId === "qwixx") return `/qwixx?room=${roomId}`;
    if (gameId === "beverbende") return `/beverbende?room=${roomId}`;
    return `/game/${roomId}`;
  }

  function handleJoin(roomId: string) {
    const name = playerName || sessionStorage.getItem("ludoryn-name") || "";
    if (!name) { setJoinTarget(roomId); return; }
    doJoin(roomId, name);
  }

  function handleCreate() {
    const name = playerName || sessionStorage.getItem("ludoryn-name") || "";
    if (!name) { setJoinTarget("__create__"); return; }
    doCreate(name);
  }

  function handleQuickMatch() {
    const name = playerName || sessionStorage.getItem("ludoryn-name") || "";
    if (!name) { setJoinTarget("__quickmatch__"); return; }
    doQuickMatch(name);
  }

  function doQuickMatch(name: string) {
    const socket = getSocket();
    sessionStorage.setItem("ludoryn-name", name);
    setPlayerName(name);
    setJoinTarget(null);

    // Direct zoekscherm tonen, niet wachten op socket callback
    setSearching(true);
    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);

    socket.emit("quickmatch-join", { name, gameType: gameId, gameMode }, (res: { ok: boolean; roomId?: string; playerIndex?: number; matched?: boolean }) => {
      if (!res.ok || !res.roomId) { setSearching(false); clearInterval(countdownRef.current!); return; }
      sessionStorage.setItem(`ludoryn-pidx-${res.roomId}`, String(res.playerIndex));

      if (res.matched) {
        clearInterval(countdownRef.current!);
        setSearching(false);
        router.push(getGameRoute(res.roomId));
        return;
      }

      // Luister op match of timeout
      const onRoomUpdate = ({ ready, roomId: rid }: { players: string[]; ready: boolean; roomId: string }) => {
        if (ready && rid === res.roomId) {
          clearInterval(countdownRef.current!);
          socket.off("room-update", onRoomUpdate);
          socket.off("quickmatch-timeout", onTimeout);
          setSearching(false);
          router.push(getGameRoute(res.roomId!));
        }
      };

      const onTimeout = () => {
        clearInterval(countdownRef.current!);
        socket.off("room-update", onRoomUpdate);
        socket.off("quickmatch-timeout", onTimeout);
        setSearching(false);
        // AI fallback
        if (gameId === "grub") {
          router.push(`/grub?room=${res.roomId}&ai=1`);
        } else if (gameId === "ticket-to-ride") {
          router.push(`/ticket-to-ride?room=${res.roomId}&ai=1`);
        } else if (gameId === "carcassonne") {
          router.push(`/carcassonne?room=${res.roomId}&ai=1`);
        } else if (gameId === "qwixx") {
          router.push(`/qwixx?room=${res.roomId}&ai=1`);
        } else if (gameId === "beverbende") {
          router.push(`/beverbende?room=${res.roomId}&ai=1`);
        } else {
          router.push(getGameRoute(res.roomId!));
        }
      };

      socket.on("room-update", onRoomUpdate);
      socket.on("quickmatch-timeout", onTimeout);
    });
  }

  function cancelQuickMatch() {
    clearInterval(countdownRef.current!);
    getSocket().emit("quickmatch-cancel");
    setSearching(false);
    setCountdown(5);
  }

  function doCreate(name: string) {
    const socket = getSocket();
    socket.emit("create-room", { name, gameType: gameId, gameMode }, (res: { ok: boolean; roomId?: string; playerIndex?: number }) => {
      if (!res.ok || !res.roomId) return;
      sessionStorage.setItem(`ludoryn-pidx-${res.roomId}`, String(res.playerIndex));
      sessionStorage.setItem("ludoryn-name", name);
      router.push(getGameRoute(res.roomId));
    });
  }

  function handleLeave(roomId: string) {
    const name = playerName || sessionStorage.getItem("ludoryn-name") || "";
    getSocket().emit("leave-room", { roomId, playerName: name }, () => {
      setSessions(prev => prev.filter(s => s.room_id !== roomId));
    });
  }

  function doJoin(roomId: string, name: string) {
    const socket = getSocket();
    socket.emit("join-room", { roomId, name }, (res: { ok: boolean; roomId?: string; playerIndex?: number; error?: string }) => {
      if (!res.ok || !res.roomId) { setError(res.error ?? t.connectionFailed); return; }
      sessionStorage.setItem(`ludoryn-pidx-${res.roomId}`, String(res.playerIndex));
      sessionStorage.setItem("ludoryn-name", name);
      router.push(getGameRoute(res.roomId));
    });
  }

  const waitingSessions = sessions.filter((s) => s.status === "waiting" && ((s.game_mode ?? "fast") === gameMode));
  const activeSessions  = sessions.filter((s) => s.status === "active" && (!s.turn_deadline || new Date(s.turn_deadline).getTime() > Date.now()));
  const mySessions      = sessions.filter((s) => s.status === "active" && (!s.turn_deadline || new Date(s.turn_deadline).getTime() > Date.now()) && (s.player1_name === playerName || s.player2_name === playerName));

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>

      <PageHeader
        left={<>
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, color: "var(--text)" }}>{t.lobby}</span>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <select
              value={theme.id}
              onChange={(e) => router.push(`/lobby?game=${e.target.value}`)}
              style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, background: "var(--card2)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 0, padding: "4px 22px 4px 8px", cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              <option value="grub">Grub</option>
            </select>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ position: "absolute", right: 7, pointerEvents: "none" }}>
              <path d="M1 1l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </>}
        right={<>
          <div className="lobby-user-info" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{playerName || t.anonymous}</div>
            {loggedIn ? (
              <button
                onClick={async () => {
                  await apiFetch("/api/auth/logout", { method: "POST" });
                  setLoggedIn(false);
                  setPlayerName("");
                  sessionStorage.removeItem("ludoryn-name");
                }}
                style={{ fontSize: 10, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-body)" }}
              >
                {t.logOut}
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                style={{ fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "var(--font-body)", fontWeight: 700 }}
              >
                {t.logIn}
              </button>
            )}
          </div>
          <div onClick={() => playerName && router.push(`/profile/${encodeURIComponent(playerName)}`)} style={{ cursor: playerName ? "pointer" : "default" }}>
            <Avatar name={playerName || "?"} color={theme.primary} size={26} online="green" />
          </div>
        </>}
      />

      {/* Body */}
      <div style={{ flex: 1, padding: "20px 20px 100px" }}>

        {/* ── Tables ───────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

          {/* Mijn actieve potjes */}
          {mySessions.length > 0 && (
            <>
              <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, fontWeight: 600, letterSpacing: "0.02em", margin: "0 0 -4px", color: "var(--text)" }}>{t.myGames}</h2>
              {mySessions.map((s) => {
                const opponent = s.player1_name === playerName ? s.player2_name : s.player1_name;
                const gameLabel = s.game_type === "grub" ? t.grubName : s.game_type === "ticket-to-ride" ? "Ticket to Ride" : s.game_type === "carcassonne" ? "Carcassonne" : s.game_type === "beverbende" ? "Beverbende" : s.game_type === "qwixx" ? t.kriskrasName : s.game_type;
                return (
                  <div key={s.room_id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        {gameLabel} <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>vs {opponent ?? "?"}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>
                        {s.game_mode === "slow" ? "Slow" : "Fast"} · #{s.room_id}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoin(s.room_id)}
                      style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 0, border: "none", background: theme.primary, color: "#fff", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                      {t.resume}
                    </button>
                  </div>
                );
              })}
              <div style={{ height: 4 }} />
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, fontWeight: 600, letterSpacing: "0.02em", margin: 0, color: "var(--text)" }}>{t.openTables}</h2>
            <div style={{ display: "flex", gap: 6, alignItems: "stretch", flexShrink: 0 }}>
              <Button accent={theme.primary} textColor={theme.primaryText} size="sm" onClick={handleQuickMatch}>
                {t.findOpponent}
              </Button>
              <div style={{ position: "relative", display: "flex" }}>
                <button
                  onClick={() => setShowNewMenu((v) => !v)}
                  style={{
                    width: 34, borderRadius: 0,
                    border: "1px solid var(--text)",
                    background: showNewMenu ? "var(--text)" : "var(--card)",
                    color: showNewMenu ? "var(--bg)" : "var(--text)", fontSize: 18, lineHeight: 1,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  +
                </button>
                {showNewMenu && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowNewMenu(false)} />
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 50,
                      background: "var(--card)", border: "1px solid var(--border)",
                      borderRadius: 0, padding: 10, display: "flex", flexDirection: "column", gap: 4,
                      minWidth: 210, boxShadow: "0 8px 32px var(--shadow)",
                    }}>
                      <div style={{ display: "flex", background: "var(--input-bg)", borderRadius: 0, padding: 2, gap: 2, marginBottom: 4 }}>
                        {(["fast", "slow"] as const).map((m) => (
                          <button key={m} onClick={() => setGameMode(m)}
                            style={{
                              flex: 1, padding: "5px 0", borderRadius: 0, border: "none", cursor: "pointer",
                              fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700,
                              background: gameMode === m ? theme.primary : "transparent",
                              color: gameMode === m ? theme.primaryText : "var(--text-faint)",
                              transition: "background 0.15s",
                            }}
                          >{m === "fast" ? "Fast" : t.slowMode}</button>
                        ))}
                      </div>
                      <div style={{ height: 1, background: "var(--border)" }} />
                      {[
                        { label: t.createTable, action: () => { setShowNewMenu(false); handleCreate(); } },
                        { label: t.joinViaCode, action: () => { setShowNewMenu(false); setShowCodeJoin(true); } },
                      ].map(({ label, action }) => (
                        <button key={label} onClick={action} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                          borderRadius: 0, border: "none", background: "var(--card2)",
                          color: "var(--text)", fontFamily: "var(--font-body)",
                          fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", textAlign: "left",
                        }}
                          onMouseEnter={(e) => (e.currentTarget.style.border = "1px solid var(--border-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.border = "none")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {sessionsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2].map(i => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <Skeleton height={14} width="40%" />
                  <Skeleton height={11} width="60%" />
                </div>
              ))}
            </div>
          ) : waitingSessions.length === 0 ? (
            <div style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 0, padding: 32, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
              {t.noOpenTables}
            </div>
          ) : waitingSessions.map((s, idx) => {
            const isOwn = s.player1_name === playerName;
            return (
              <div key={s.room_id} style={{ animationDelay: `${idx * 60}ms` }}>
                <TableCard
                  icon={theme.icon}
                  title={t.tableNumber(s.room_id)}
                  subtitle={t.waitingForOpponent(s.player1_name ?? "?")}
                  badge={s.game_mode === "slow" ? "Slow" : "Fast"}
                  filled={s.player1_name ? 1 : 0}
                  total={2}
                  isFull={false}
                  player1={s.player1_name ?? undefined}
                  onJoin={() => handleJoin(s.room_id)}
                  onLeave={isOwn ? () => handleLeave(s.room_id) : undefined}
                  accent={theme.primary}
                  card2={theme.card2}
                  border={theme.border}
                />
              </div>
            );
          })}

          {/* Actieve tafels */}
          {activeSessions.length > 0 && (
            <>
              <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, fontWeight: 600, letterSpacing: "0.02em", margin: "8px 0 4px", color: "var(--text)" }}>{t.activeGames}</h2>
              {activeSessions.map((s) => {
                const isOwn = s.player1_name === playerName || s.player2_name === playerName;
                return (
                  <TableCard
                    key={s.room_id}
                    icon={theme.icon}
                    title={t.tableNumber(s.room_id)}
                    subtitle={[`${s.player1_name ?? "?"} vs ${s.player2_name ?? "?"}`, formatDeadline(s.turn_deadline, s.game_mode, t)].filter(Boolean).join(" · ")}
                    badge={s.game_mode === "slow" ? "Slow" : "Fast"}
                    filled={2}
                    total={2}
                    isFull={true}
                    player1={s.player1_name ?? undefined}
                    player2={s.player2_name ?? undefined}
                    onJoin={() => isOwn ? handleJoin(s.room_id) : router.push(getGameRoute(s.room_id))}
                    onLeave={isOwn ? () => handleLeave(s.room_id) : undefined}
                    accent={theme.primary}
                    card2={theme.card2}
                    border={theme.border}
                  />
                );
              })}
            </>
          )}
        </section>

      </div>

      <BottomNav
        accent={theme.primary}
        items={[
          { label: t.home,   icon: "home",   onClick: () => router.push("/") },
          { label: t.lobby,  icon: "lobby",  active: true },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
        ]}
      />

      {/* Quickmatch zoekscherm */}
      {searching && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(244,239,230,0.95)", backdropFilter: "blur(12px)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
          {/* Spinning ring */}
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid ${theme.primary}22` }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid transparent`, borderTopColor: theme.primary, animation: "spin 1s linear infinite" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: theme.primary }}>
              {countdown}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              {t.findingOpponent}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
              {countdown > 0 ? t.aiStartsIn(countdown) : t.aiReady}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={cancelQuickMatch}>{t.cancel}</Button>
        </div>
      )}

      {/* Login modal */}
      {showLogin && (
        <LoginModal
          accent={theme.primary}
          onSuccess={(username) => {
            setPlayerName(username);
            setLoggedIn(true);
            sessionStorage.setItem("ludoryn-name", username);
            setShowLogin(false);
          }}
          onCancel={() => setShowLogin(false)}
        />
      )}

      {/* Code join modal */}
      {showCodeJoin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,46,0.5)", backdropFilter: "blur(12px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0, padding: "28px 24px", width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{t.enterTableCode}</div>
            <input
              autoFocus
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codeInput.trim()) {
                  setShowCodeJoin(false);
                  handleJoin(codeInput.trim());
                  setCodeInput("");
                }
              }}
              placeholder={t.tableCodeHint}
              style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, letterSpacing: "0.2em", textAlign: "center", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 0, padding: "12px 16px", color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" flex={1} size="sm" onClick={() => { setShowCodeJoin(false); setCodeInput(""); }}>{t.cancel}</Button>
              <Button accent={theme.primary} textColor={theme.primaryText} flex={1} size="sm" disabled={!codeInput.trim()} onClick={() => { setShowCodeJoin(false); handleJoin(codeInput.trim()); setCodeInput(""); }}>{t.join}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Name modal */}
      {joinTarget && (
        <NameModal
          error={error}
          accent={theme.primary}
          onConfirm={(name) => { setPlayerName(name); setError(null); joinTarget === "__create__" ? doCreate(name) : joinTarget === "__quickmatch__" ? doQuickMatch(name) : doJoin(joinTarget, name); }}
          onCancel={() => { setJoinTarget(null); setError(null); }}
        />
      )}

      <style>{`
        input::placeholder { color: var(--text-faint) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

export default function LobbyPage() {
  return (
    <Suspense>
      <LobbyContent />
    </Suspense>
  );
}

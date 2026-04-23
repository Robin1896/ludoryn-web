"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { BottomNav, PageHeader, Skeleton, StatusBadge } from "@/components/ui";
import { useLang } from "@/lib/lang";

interface GrubTile { value: number; worms: number; available: boolean; }
interface GrubPlayer { name: string; stack: GrubTile[]; }
interface GrubTurn {
  rolled: (number | string)[];
  kept: (number | string)[];
  usedFaces: (number | string)[];
  total: number;
  hasWorm: boolean;
  diceLeft: number;
}
interface GrubState {
  tiles: GrubTile[];
  players: GrubPlayer[];
  currentPlayer: number;
  turn: GrubTurn;
  phase: string;
  log: string[];
}

interface Session {
  room_id: string;
  game_type: string;
  game_mode: string | null;
  player1_name: string;
  player2_name: string;
  winner_name: string | null;
  started_at: string;
}
interface Snapshot {
  turn_num: number;
  game_state: Record<string, unknown>;
}

// ─── Mini helpers ────────────────────────────────────────────────────────────

function wormBg(worms: number) {
  if (worms === 1) return '#dde5f0';
  if (worms === 2) return '#d4e8d8';
  if (worms === 3) return '#f2ddd4';
  return '#ede8d0';
}
function wormBorder(worms: number) {
  if (worms === 1) return '#b8c8de';
  if (worms === 2) return '#a8ccae';
  if (worms === 3) return '#d9b5a4';
  return '#c8bc88';
}

function DieBox({ face, faded }: { face: number | string; faded?: boolean }) {
  const isWorm = face === 'W';
  return (
    <div style={{
      width: 26, height: 26, flexShrink: 0,
      background: isWorm ? '#2d5c35' : 'var(--card)',
      border: `1px solid ${isWorm ? '#2d5c35' : 'var(--border)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700,
      color: isWorm ? '#fff' : 'var(--text)',
      opacity: faded ? 0.35 : 1,
    }}>
      {isWorm ? '🐛' : face}
    </div>
  );
}

function TileBox({ tile, ownerColor }: { tile: GrubTile; ownerColor?: string }) {
  const taken = !tile.available;
  const bg = taken && !ownerColor ? 'var(--card2)' : wormBg(tile.worms);
  const border = taken && !ownerColor ? 'var(--border)' : wormBorder(tile.worms);
  return (
    <div style={{
      width: 30, height: 40, flexShrink: 0,
      background: ownerColor ? ownerColor : bg,
      border: `1px solid ${border}`,
      opacity: taken && !ownerColor ? 0.35 : 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
    }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{tile.value}</span>
      <span style={{ fontSize: 7, lineHeight: 1 }}>{'🐛'.repeat(tile.worms)}</span>
    </div>
  );
}

const PLAYER_COLORS = ['rgba(193,74,31,0.15)', 'rgba(59,130,246,0.15)'];
const PLAYER_BORDER = ['rgba(193,74,31,0.4)', 'rgba(59,130,246,0.4)'];

function GrubModal({ gs, turnNum, total, onClose }: { gs: GrubState; turnNum: number; total: number; onClose: () => void }) {
  const cp = gs.currentPlayer;
  const currentPlayer = gs.players[cp];

  // Build tile ownership map
  const ownerMap = new Map<number, number>();
  gs.players.forEach((p, pi) => {
    p.stack.forEach(t => ownerMap.set(t.value, pi));
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card)', borderTop: '1px solid var(--border)', maxHeight: '82vh', overflowY: 'auto', padding: '0 0 32px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, fontWeight: 400, color: 'var(--text)' }}>
              Beurt {turnNum}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 10 }}>
              {gs.phase} · {currentPlayer?.name} aan de beurt
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Scores */}
          <div style={{ display: 'flex', gap: 8 }}>
            {gs.players.map((p, pi) => {
              const worms = p.stack.reduce((s, t) => s + t.worms, 0);
              const isActive = pi === cp;
              return (
                <div key={pi} style={{
                  flex: 1, padding: '10px 12px',
                  background: PLAYER_COLORS[pi] ?? 'var(--card2)',
                  border: `1px solid ${PLAYER_BORDER[pi] ?? 'var(--border)'}`,
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                    {isActive && <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>beurt</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    {worms} 🐛 <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({p.stack.length} tegels)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current turn dice */}
          {(gs.turn.kept.length > 0 || gs.turn.rolled.length > 0) && (
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Dobbelstenen — totaal: {gs.turn.total}{gs.turn.hasWorm ? ' 🐛' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {gs.turn.kept.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Gehouden</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {gs.turn.kept.map((f, i) => <DieBox key={i} face={f} />)}
                    </div>
                  </div>
                )}
                {gs.turn.rolled.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Gegooid</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {gs.turn.rolled.map((f, i) => {
                        const isUsed = gs.turn.usedFaces.includes(f);
                        return <DieBox key={i} face={f} faded={isUsed} />;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tiles */}
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Tegels
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {gs.tiles.map((tile) => {
                const ownerIdx = ownerMap.get(tile.value);
                const ownerColor = ownerIdx !== undefined ? (PLAYER_COLORS[ownerIdx] ?? undefined) : undefined;
                return <TileBox key={tile.value} tile={tile} ownerColor={ownerColor} />;
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {gs.players.map((p, pi) => (
                <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, background: PLAYER_COLORS[pi], border: `1px solid ${PLAYER_BORDER[pi]}` }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Log */}
          {gs.log?.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                Log
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[...gs.log].reverse().map((entry, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: i === 0 ? 'var(--text)' : 'var(--text-muted)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function extractTurnSummary(gs: Record<string, unknown>, gameType: string): string {
  if (!gs) return "";
  const cp = gs.currentPlayer as number;
  const players = gs.players as Array<{ name: string; stack?: unknown[] }> | undefined;
  const playerName = players?.[cp]?.name ?? `Speler ${cp + 1}`;
  if (gameType === "grub") {
    const scores = players?.map((p) => `${p.name}: ${(p.stack ?? []).length}`) ?? [];
    return `${playerName} · ${scores.join(", ")}`;
  }
  if (gameType === "ticket-to-ride") {
    const scores = players?.map((p: { name: string; routeScore?: number }) => `${p.name}: ${p.routeScore ?? 0}`) ?? [];
    return `${playerName} · ${scores.join(", ")} pt`;
  }
  return `Beurt ${cp + 1}`;
}

export default function ReplayPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [modalStep, setModalStep] = useState<number | null>(null);

  useEffect(() => {
    apiFetch(`/api/replay/${roomId}`)
      .then((r) => r.json())
      .then((d) => { setSession(d.session); setSnapshots(d.snapshots); setLoading(false); })
      .catch(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!playing || step >= snapshots.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setStep((s) => s + 1), 1500);
    return () => clearTimeout(timer);
  }, [playing, step, snapshots.length]);

  const current = snapshots[step];
  const modalSnap = modalStep !== null ? snapshots[modalStep] : null;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {session && (
        <PageHeader
          left={<>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 4px 0 0", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 400, color: "var(--text)" }}>
              {session.player1_name} vs {session.player2_name}
            </span>
            {session.game_mode && (
              <StatusBadge label={session.game_mode === "slow" ? "Slow" : "Fast"} color={session.game_mode === "slow" ? "#8B5CF6" : "#F59E0B"} />
            )}
          </>}
          right={
            <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>
              {new Date(session.started_at).toLocaleDateString("nl-NL")}
              {session.winner_name && ` · ${session.winner_name} wint`}
            </span>
          }
        />
      )}

      <div style={{ padding: "20px 20px 100px" }}>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} height={52} radius={0} />)}
          </div>
        ) : !session ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 80, fontFamily: "var(--font-body)", fontSize: 14 }}>
            Replay niet gevonden
          </div>
        ) : (
          <>

            {snapshots.length === 0 ? (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 13 }}>
                Geen replay data beschikbaar
              </div>
            ) : (
              <>
                {/* Timeline card */}
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", marginBottom: 12 }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      Beurt {step + 1} / {snapshots.length}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>
                      {current && extractTurnSummary(current.game_state, session.game_type)}
                    </span>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <input
                      type="range" min={0} max={snapshots.length - 1} value={step}
                      onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>
                  <div style={{ padding: "0 16px 14px", display: "flex", gap: 8, justifyContent: "center" }}>
                    <button onClick={() => { setPlaying(false); setStep(0); }} style={btnStyle}>⏮</button>
                    <button onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} style={btnStyle}>◀</button>
                    <button onClick={() => setPlaying((v) => !v)} style={{ ...btnStyle, background: "var(--accent)", color: "#fff", border: "none", minWidth: 90 }}>
                      {playing ? "Pauzeren" : "Afspelen"}
                    </button>
                    <button onClick={() => { setPlaying(false); setStep((s) => Math.min(snapshots.length - 1, s + 1)); }} style={btnStyle}>▶</button>
                    <button onClick={() => { setPlaying(false); setStep(snapshots.length - 1); }} style={btnStyle}>⏭</button>
                  </div>
                </div>

                {/* Turn list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 360, overflowY: "auto" }}>
                  {snapshots.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => { setPlaying(false); setStep(i); setModalStep(i); }}
                      style={{
                        background: i === step ? "rgba(193,74,31,0.06)" : "var(--card)",
                        border: `1px solid ${i === step ? "var(--accent)" : "var(--border)"}`,
                        padding: "10px 14px", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: i === step ? 600 : 400, color: i === step ? "var(--accent)" : "var(--text)" }}>
                        Beurt {i + 1}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>
                          {extractTurnSummary(s.game_state, session.game_type)}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav
        items={[
          { label: t.home,   icon: "home",   onClick: () => router.push("/") },
          { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: t.shop,   icon: "shop",   onClick: () => router.push("/shop") },
        ]}
      />

      {/* State modal — grub only for now */}
      {modalSnap && session?.game_type === "grub" && (
        <GrubModal
          gs={modalSnap.game_state as unknown as GrubState}
          turnNum={modalStep! + 1}
          total={snapshots.length}
          onClose={() => setModalStep(null)}
        />
      )}
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  cursor: "pointer",
};

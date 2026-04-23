"use client";

import { useEffect, useState } from "react";
import { apiUrl, apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { BottomNav, Skeleton, StatusBadge, UI_BG, UI_CARD, UI_BORDER, UI_ACCENT } from "@/components/ui";
import { useLang } from "@/lib/lang";

interface Session {
  room_id: string;
  game_type: string;
  game_mode: string | null;
  player1_name: string;
  player2_name: string;
  winner_name: string | null;
  started_at: string;
  finished_at: string | null;
}
interface Snapshot {
  turn_num: number;
  game_state: Record<string, unknown>;
}

const GAME_LABELS: Record<string, string> = {
  catan: "CT", grub: "GR", "ticket-to-ride": "TR", carcassonne: "CA",
};

function extractTurnSummary(gs: Record<string, unknown>, gameType: string): string {
  if (!gs) return "";
  const cp = gs.currentPlayer as number;
  const players = (gs.players as Array<{name: string}> | undefined);
  const playerName = players?.[cp]?.name ?? `Speler ${cp + 1}`;
  if (gameType === "catan") {
    const vps = (gs.vp as number[] | undefined) ?? [];
    return `${playerName} · ${vps.join(" vs ")} VP`;
  }
  if (gameType === "grub") {
    const scores = players?.map((p: {name: string; stack?: unknown[]}) => `${p.name}: ${(p.stack as unknown[] | undefined)?.length ?? 0}`) ?? [];
    return `${playerName} aan de beurt · ${scores.join(", ")}`;
  }
  if (gameType === "ticket-to-ride") {
    const scores = players?.map((p: {name: string; routeScore?: number}) => `${p.name}: ${p.routeScore ?? 0}`) ?? [];
    return `${playerName} · ${scores.join(", ")} punten`;
  }
  return `Beurt ${cp}`;
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

  useEffect(() => {
    apiFetch(`/api/replay/${roomId}`)
      .then((r) => r.json())
      .then((d) => { setSession(d.session); setSnapshots(d.snapshots); setLoading(false); })
      .catch(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!playing || step >= snapshots.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 1500);
    return () => clearTimeout(t);
  }, [playing, step, snapshots.length]);

  const current = snapshots[step];

  return (
    <main style={{ minHeight: "100vh", background: UI_BG, color: "#EEF2FF" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 100px" }}>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <Skeleton key={i} height={60} radius={14} />)}
          </div>
        ) : !session ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", marginTop: 80 }}>Replay niet gevonden</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>{GAME_LABELS[session.game_type] ?? session.game_type.slice(0,2).toUpperCase()}</span>
                <div>
                  <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 22, fontWeight: 700 }}>
                    {session.player1_name} vs {session.player2_name}
                  </div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {new Date(session.started_at).toLocaleDateString("nl-NL")}
                    {session.winner_name && ` · ${session.winner_name} wint`}
                  </div>
                </div>
                {session.game_mode && <StatusBadge label={session.game_mode === "slow" ? "Slow" : "Fast"} color={session.game_mode === "slow" ? "#8B5CF6" : "#F59E0B"} />}
              </div>
            </div>

            {snapshots.length === 0 ? (
              <div style={{ background: UI_CARD, borderRadius: 16, padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", border: `1px solid ${UI_BORDER}` }}>
                Geen replay data beschikbaar voor dit spel
              </div>
            ) : (
              <>
                {/* Timeline */}
                <div style={{ background: UI_CARD, borderRadius: 16, border: `1px solid ${UI_BORDER}`, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${UI_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 15, fontWeight: 600 }}>
                      Beurt {step + 1} / {snapshots.length}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                      {current && extractTurnSummary(current.game_state, session.game_type)}
                    </span>
                  </div>

                  {/* Scrubber */}
                  <div style={{ padding: "16px 18px" }}>
                    <input
                      type="range" min={0} max={snapshots.length - 1} value={step}
                      onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
                      style={{ width: "100%", accentColor: UI_ACCENT }}
                    />
                  </div>

                  {/* Controls */}
                  <div style={{ padding: "0 18px 16px", display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={() => { setPlaying(false); setStep(0); }} style={btnStyle}>⏮</button>
                    <button onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} style={btnStyle}>◀</button>
                    <button onClick={() => setPlaying((v) => !v)} style={{ ...btnStyle, background: `${UI_ACCENT}22`, color: UI_ACCENT, minWidth: 80 }}>
                      {playing ? "Pauzeren" : "Afspelen"}
                    </button>
                    <button onClick={() => { setPlaying(false); setStep((s) => Math.min(snapshots.length - 1, s + 1)); }} style={btnStyle}>▶</button>
                    <button onClick={() => { setPlaying(false); setStep(snapshots.length - 1); }} style={btnStyle}>⏭</button>
                  </div>
                </div>

                {/* Turn list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                  {snapshots.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => { setPlaying(false); setStep(i); }}
                      style={{
                        background: i === step ? `${UI_ACCENT}22` : UI_CARD,
                        border: `1px solid ${i === step ? UI_ACCENT + "44" : UI_BORDER}`,
                        borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                        display: "flex", justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: i === step ? UI_ACCENT : "rgba(255,255,255,0.55)" }}>
                        Beurt {i + 1}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        {extractTurnSummary(s.game_state, session.game_type)}
                      </span>
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
          { label: t.home,   icon: "home", onClick: () => router.push("/") },
          { label: t.lobby,  icon: "lobby", onClick: () => router.push("/lobby") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
        ]}
      />
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`,
  background: "transparent", color: "rgba(255,255,255,0.6)",
  fontFamily: "'Nunito', sans-serif", fontSize: 13, cursor: "pointer",
};

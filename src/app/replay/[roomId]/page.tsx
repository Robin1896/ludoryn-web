"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { BottomNav, Skeleton, StatusBadge } from "@/components/ui";
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

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px 100px" }}>

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
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 400, color: "var(--text)" }}>
                  {session.player1_name} vs {session.player2_name}
                </div>
                {session.game_mode && (
                  <StatusBadge
                    label={session.game_mode === "slow" ? "Slow" : "Fast"}
                    color={session.game_mode === "slow" ? "#8B5CF6" : "#F59E0B"}
                  />
                )}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)" }}>
                {new Date(session.started_at).toLocaleDateString("nl-NL")}
                {session.winner_name && ` · ${session.winner_name} wint`}
              </div>
            </div>

            {snapshots.length === 0 ? (
              <div style={{
                background: "var(--card)", border: "1px solid var(--border)",
                padding: 40, textAlign: "center",
                color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 13,
              }}>
                Geen replay data beschikbaar
              </div>
            ) : (
              <>
                {/* Timeline card */}
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", marginBottom: 12 }}>
                  <div style={{
                    padding: "12px 16px", borderBottom: "1px solid var(--border)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
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
                    <button
                      onClick={() => setPlaying((v) => !v)}
                      style={{ ...btnStyle, background: "var(--accent)", color: "#fff", border: "none", minWidth: 90 }}
                    >
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
                      onClick={() => { setPlaying(false); setStep(i); }}
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
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>
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
          { label: t.home,   icon: "home",   onClick: () => router.push("/") },
          { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: t.shop,   icon: "shop",   onClick: () => router.push("/shop") },
        ]}
      />
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

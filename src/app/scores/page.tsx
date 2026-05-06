"use client";

import { useEffect, useState } from "react";
import { apiUrl, apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LeaderboardRow, StatusBadge, BottomNav, PageHeader, Skeleton, UI_BG, UI_CARD, UI_BORDER } from "@/components/ui";
import { useLang } from "@/lib/lang";

interface LeaderboardEntry {
  player_name: string;
  wins: number;
  games_played: number;
  win_rate: number | null;
  penalties?: number;
  elo?: number;
}

interface Session {
  room_id: string;
  player1_name: string | null;
  player2_name: string | null;
  winner_name: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
}

function timeAgo(dateStr: string, t: { timeAgoD: (n: number) => string; timeAgoH: (n: number) => string; timeAgoM: (n: number) => string; justNow: string }) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return t.timeAgoD(days);
  if (hours > 0) return t.timeAgoH(hours);
  if (mins  > 0) return t.timeAgoM(mins);
  return t.justNow;
}

const STATUS_COLOR: Record<string, string> = {
  waiting:   "#F59E0B",
  active:    "#22C55E",
  finished:  "#64748B",
  abandoned: "#EF4444",
};
function getStatusLabel(status: string, t: { statusWaiting: string; statusActive: string; statusFinished: string; statusAbandoned: string }): string {
  const labels: Record<string, string> = {
    waiting:   t.statusWaiting,
    active:    t.statusActive,
    finished:  t.statusFinished,
    abandoned: t.statusAbandoned,
  };
  return labels[status] ?? status;
}

export default function ScoresPage() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [avatarMap,   setAvatarMap]   = useState<Record<string, string | null>>({});

  useEffect(() => {
    Promise.all([
      apiFetch("/api/leaderboard").then((r) => r.json()),
      apiFetch("/api/sessions").then((r) => r.json()),
    ]).then(([lb, sess]) => {
      setLeaderboard(lb);
      setSessions(sess);
      setLoading(false);
      // Fetch avatars for all leaderboard players
      (lb as LeaderboardEntry[]).forEach((entry) => {
        fetch(`/api/avatar?username=${encodeURIComponent(entry.player_name)}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setAvatarMap(prev => ({ ...prev, [entry.player_name]: d.avatarId ?? null })); })
          .catch(() => {});
      });
    }).catch(() => setLoading(false));
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

      <PageHeader left={<>
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, color: "var(--text)" }}>Scores</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>{t.scoresSubtitle}</span>
      </>} />

      <div style={{ padding: "24px 24px 80px" }}>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="scores-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton width="35%" height={10} radius={5} style={{ marginBottom: 6 }} />
              {[1,2,3,4].map(i => (
                <div key={i} style={{ background: UI_CARD, borderRadius: 0, padding: 18, border: `1px solid ${UI_BORDER}`, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Skeleton height={14} width="50%" />
                  <Skeleton height={10} width="30%" />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton width="45%" height={10} radius={5} style={{ marginBottom: 6 }} />
              {[1,2,3,4].map(i => (
                <div key={i} style={{ background: UI_CARD, borderRadius: 0, padding: "14px 18px", border: `1px solid ${UI_BORDER}`, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Skeleton height={12} width="60%" />
                  <Skeleton height={10} width="40%" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="scores-grid">

            {/* Leaderboard */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Leaderboard</div>
              {leaderboard.length === 0 ? (
                <div style={{ background: "transparent", borderRadius: 0, padding: 32, textAlign: "center", color: "var(--text-faint)", fontSize: 13, border: "1px solid var(--border)" }}>
                  {t.noScoresYet}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {leaderboard.map((entry, i) => (
                    <div key={entry.player_name} onClick={() => router.push(`/profile/${encodeURIComponent(entry.player_name)}`)} style={{ cursor: "pointer" }}>
                      <LeaderboardRow
                        rank={i + 1}
                        name={entry.player_name}
                        avatarId={avatarMap[entry.player_name]}
                        score={entry.wins}
                        sub={`ELO ${entry.elo ?? 1000} · ${entry.games_played} ${t.played} · ${entry.win_rate != null ? entry.win_rate + "%" : "-"} winrate${entry.penalties ? ` · ${entry.penalties} ${t.penalty}` : ""}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recente sessies */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>{t.recentSessions}</div>
              {sessions.length === 0 ? (
                <div style={{ background: "transparent", borderRadius: 0, padding: 32, textAlign: "center", color: "var(--text-faint)", fontSize: 13, border: "1px solid var(--border)" }}>
                  {t.noSessionsYet}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sessions.map((s) => {
                    const color = STATUS_COLOR[s.status] ?? "#64748B";
                    const label = getStatusLabel(s.status, t);
                    return (
                      <div key={s.room_id} style={{ background: "transparent", borderRadius: 0, padding: "14px 18px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <code onClick={() => router.push(`/replay/${s.room_id}`)} style={{ fontSize: 12, color: "var(--text-faint)", fontFamily: "var(--font-mono)", letterSpacing: 2, cursor: "pointer", textDecoration: "underline" }}>{s.room_id}</code>
                            <StatusBadge label={label} color={color} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{timeAgo(s.started_at, t)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {s.player1_name ?? "?"} vs {s.player2_name ?? "?"}
                          </span>
                          {s.winner_name && (
                            <span style={{ fontSize: 11, color: "#F59E0B" }}>· {s.winner_name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <BottomNav
        items={[
          { label: t.home,   icon: "home", onClick: () => router.push("/") },
          { label: t.lobby,  icon: "lobby", onClick: () => router.push("/lobby") },
          { label: t.scores, icon: "scores", active: true },

        ]}
      />

      <style>{`
        @media (max-width: 700px) {
          .scores-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

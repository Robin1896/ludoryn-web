"use client";

import { useEffect, useState } from "react";
import { apiUrl, apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Avatar, BottomNav, LeaderboardRow, StatusBadge, Skeleton, UI_BG, UI_CARD, UI_BORDER, UI_ACCENT } from "@/components/ui";
import { useLang } from "@/lib/lang";

interface Stats {
  wins: number;
  games_played: number;
  penalties: number;
  win_rate: number | null;
  elo?: number;
}
interface Game {
  room_id: string;
  game_type: string;
  game_mode: string | null;
  player1_name: string;
  player2_name: string;
  winner_name: string | null;
  finished_at: string;
}
interface ByType {
  game_type: string;
  played: number;
  wins: number;
}

const GAME_LABELS: Record<string, string> = {
  catan: "CT",
  grub: "GR",
  "ticket-to-ride": "TR",
  carcassonne: "CA",
};

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u`;
  return `${Math.floor(h / 24)}d`;
}


export default function ProfilePage() {
  const { name } = useParams<{ name: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [byType, setByType] = useState<ByType[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarId, setAvatarId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/profile/${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => { setStats(d.stats); setGames(d.games); setByType(d.byType); setLoading(false); })
      .catch(() => setLoading(false));
    apiFetch(`/api/avatar?username=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => setAvatarId(d.avatarId ?? null))
      .catch(() => {});
  }, [name]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
          <Avatar name={name} color={UI_ACCENT} size={64} avatarId={avatarId} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 28, fontWeight: 700, color: "var(--text)" }}>{name}</div>
            {stats && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                ELO {stats.elo ?? 1000} · {stats.games_played} {t.played} · {stats.win_rate ?? 0}% winrate
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <Skeleton key={i} height={60} radius={14} />)}
          </div>
        ) : (
          <>
            {/* Stats pills */}
            {stats && (
              <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
                {[
                  { label: "ELO", value: stats.elo ?? 1000, color: "#F59E0B" },
                  { label: t.won, value: stats.wins, color: "#20D9A0" },
                  { label: t.played, value: stats.games_played, color: UI_ACCENT },
                  { label: t.penalties, value: stats.penalties, color: "#FF5C5C" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0, padding: "14px 20px", flex: 1, minWidth: 100, textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 28, fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Per game breakdown */}
            {byType.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Per spel</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {byType.map((g) => (
                    <div key={g.game_type} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 0, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.05em" }}>{GAME_LABELS[g.game_type] ?? g.game_type.slice(0,2).toUpperCase()}</span>
                      <div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{g.wins}/{g.played}</div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>{t.won}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent games */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Recente spellen</div>
              {games.length === 0 ? (
                <div style={{ background: "var(--card)", borderRadius: 0, padding: 32, textAlign: "center", color: "var(--text-faint)", fontSize: 13, border: "1px solid var(--border)" }}>
                  Nog geen gespeelde potjes
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {games.map((g) => {
                    const won = g.winner_name?.toLowerCase() === name.toLowerCase();
                    const opponent = g.player1_name?.toLowerCase() === name.toLowerCase() ? g.player2_name : g.player1_name;
                    return (
                      <div
                        key={g.room_id}
                        onClick={() => router.push(`/replay/${g.room_id}`)}
                        style={{ background: "var(--card)", borderRadius: 0, padding: "12px 16px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.05em" }}>{GAME_LABELS[g.game_type] ?? g.game_type.slice(0,2).toUpperCase()}</span>
                          <div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: won ? "#2d7a3a" : "#c14a1f" }}>
                              {won ? t.won : "Verloren"}
                            </div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>
                              vs {opponent ?? "?"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {g.game_mode && <StatusBadge label={g.game_mode === "slow" ? "Slow" : "Fast"} color={g.game_mode === "slow" ? "#8B5CF6" : "#F59E0B"} />}
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-faint)" }}>{timeAgo(g.finished_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav
        items={[
          { label: t.home,   icon: "home", onClick: () => router.push("/") },
          { label: t.lobby,  icon: "lobby", onClick: () => router.push("/lobby") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

        ]}
      />
    </main>
  );
}

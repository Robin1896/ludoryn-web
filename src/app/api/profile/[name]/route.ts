import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  try {
    const pool = getPool();

    const [statsRes, gamesRes, byTypeRes] = await Promise.all([
      pool.query(
        `SELECT wins, games_played, COALESCE(penalties, 0) AS penalties,
                COALESCE(elo, 1000) AS elo,
                ROUND(wins::numeric / NULLIF(games_played, 0) * 100) AS win_rate
         FROM leaderboard WHERE LOWER(player_name) = LOWER($1)`,
        [name]
      ),
      pool.query(
        `SELECT room_id, game_type, game_mode, player1_name, player2_name,
                winner_name, status, started_at, finished_at
         FROM game_sessions
         WHERE (LOWER(player1_name) = LOWER($1) OR LOWER(player2_name) = LOWER($1))
           AND status = 'finished'
         ORDER BY finished_at DESC LIMIT 15`,
        [name]
      ),
      pool.query(
        `SELECT game_type,
                COUNT(*) AS played,
                COUNT(*) FILTER (WHERE LOWER(winner_name) = LOWER($1)) AS wins
         FROM game_sessions
         WHERE (LOWER(player1_name) = LOWER($1) OR LOWER(player2_name) = LOWER($1))
           AND status = 'finished'
         GROUP BY game_type`,
        [name]
      ),
    ]);

    return NextResponse.json({
      name,
      stats: statsRes.rows[0] ?? null,
      games: gamesRes.rows,
      byType: byTypeRes.rows,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; detail?: string };
    console.error(`[API /profile/${name}] ❌`, e.message, "code:", e.code, "detail:", e.detail);
    return NextResponse.json({ name, stats: null, games: [], byType: [] });
  }
}

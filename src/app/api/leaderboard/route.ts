import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  console.log("[API /leaderboard] GET");
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT player_name, wins, games_played, COALESCE(penalties, 0) AS penalties,
             COALESCE(elo, 1000) AS elo,
             ROUND(wins::numeric / NULLIF(games_played, 0) * 100) AS win_rate
      FROM leaderboard
      ORDER BY elo DESC, wins DESC
      LIMIT 20
    `);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.error("[API /leaderboard] ❌", e.message, "code:", e.code);
    return NextResponse.json([], { status: 200 });
  }
}

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const gameType = req.nextUrl.searchParams.get("game");
  console.log("[API /sessions] GET game:", gameType ?? "all");
  try {
    const pool = getPool();
    const { rows } = gameType
      ? await pool.query(
          `SELECT room_id, game_type, game_mode, player1_name, player2_name, winner_name, status, started_at, finished_at, turn_deadline
           FROM game_sessions WHERE game_type=$1 AND status IN ('waiting','active') AND started_at > NOW() - INTERVAL '24 hours'
           ORDER BY started_at DESC LIMIT 30`,
          [gameType]
        )
      : await pool.query(
          `SELECT room_id, game_type, game_mode, player1_name, player2_name, winner_name, status, started_at, finished_at, turn_deadline
           FROM game_sessions WHERE status IN ('waiting','active') AND started_at > NOW() - INTERVAL '24 hours'
           ORDER BY started_at DESC LIMIT 30`
        );
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.error("[API /sessions] ❌", e.message, "code:", e.code);
    return NextResponse.json([], { status: 200 });
  }
}

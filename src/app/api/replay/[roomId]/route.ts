import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ session: null, snapshots: [] });
    }
    const pool = getPool();

    const [sessionRes, snapshotsRes] = await Promise.all([
      pool.query(
        `SELECT room_id, game_type, game_mode, player1_name, player2_name, winner_name, started_at, finished_at
         FROM game_sessions WHERE room_id = $1`,
        [roomId]
      ),
      pool.query(
        `SELECT turn_num, game_state FROM game_snapshots WHERE room_id = $1 ORDER BY turn_num ASC`,
        [roomId]
      ),
    ]);

    return NextResponse.json({
      session: sessionRes.rows[0] ?? null,
      snapshots: snapshotsRes.rows,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    console.error(`[API /replay/${roomId}] ❌`, e.message, "code:", e.code);
    return NextResponse.json({ session: null, snapshots: [] });
  }
}

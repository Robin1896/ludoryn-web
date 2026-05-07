import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/redis";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const ids = await redis.smembers("sessions:active") as string[];
  let cleaned = 0;

  for (const roomId of ids) {
    const s = await getSession(roomId);
    if (!s) { await redis.srem("sessions:active", roomId); cleaned++; continue; }
    if (new Date(s.started_at).getTime() < cutoff) {
      await setSession({ ...s, status: "abandoned", finished_at: new Date().toISOString() });
      cleaned++;
    }
  }

  return NextResponse.json({ ok: true, cleaned });
}

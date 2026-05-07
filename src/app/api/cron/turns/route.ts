import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession, getLbEntry, setLbEntry } from "@/lib/redis";
import { triggerRoom, triggerLobby } from "@/lib/pusher-server";
import { redis } from "@/lib/redis";

async function updateElo(winnerName: string, loserName: string | null) {
  if (!loserName) return;
  const [w, l] = await Promise.all([getLbEntry(winnerName), getLbEntry(loserName)]);
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, ((l.elo ?? 1000) - (w.elo ?? 1000)) / 400));
  w.elo = Math.round((w.elo ?? 1000) + K * (1 - expected));
  l.elo = Math.round((l.elo ?? 1000) + K * (0 - (1 - expected)));
  await Promise.all([setLbEntry(w), setLbEntry(l)]);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ids = await redis.smembers("sessions:active") as string[];
  let processed = 0;

  for (const roomId of ids) {
    const s = await getSession(roomId);
    if (!s || s.status !== "active" || !s.turn_deadline) continue;

    const deadline = new Date(s.turn_deadline).getTime();
    if (Date.now() < deadline) continue;

    // Turn has expired — determine loser by current player in game state
    const gs = s.game_state as Record<string, unknown> | null;
    const currentPlayer = gs?.currentPlayer as number | undefined;
    const loserIdx  = currentPlayer ?? 0;
    const winnerIdx = 1 - loserIdx;

    const players = [s.player1_name, s.player2_name].filter(Boolean) as string[];
    const winnerName = players[winnerIdx];
    const loserName  = players[loserIdx];

    if (!winnerName || !loserName) continue;

    await triggerRoom(roomId, "turn-forfeit", { loserIndex: loserIdx, winnerName });
    await setSession({ ...s, status: "finished", winner_name: winnerName, finished_at: new Date().toISOString(), turn_deadline: null });

    const [w, l] = await Promise.all([getLbEntry(winnerName), getLbEntry(loserName)]);
    w.wins = (w.wins ?? 0) + 1; w.games_played = (w.games_played ?? 0) + 1;
    l.games_played = (l.games_played ?? 0) + 1;
    await Promise.all([setLbEntry(w), setLbEntry(l)]);
    await updateElo(winnerName, loserName);
    await triggerLobby({});
    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}

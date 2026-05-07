import { NextRequest, NextResponse } from "next/server";
import { pusher, triggerRoom, triggerLobby } from "@/lib/pusher-server";
import {
  getSession, setSession, getLbEntry, setLbEntry,
  pushSnapshot, pushGlobalChat, getGlobalChat, pushRoomChat, getRoomChat,
  addActiveSession, removeActiveSession,
} from "@/lib/redis";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const TURN_MS = { fast: 2 * 60 * 1000, slow: 24 * 60 * 60 * 1000 };

function maxPlayers(gameType: string) {
  if (gameType === "grub")   return 7;
  if (gameType === "bommen") return 4;
  return 2;
}

async function updateElo(winnerName: string, loserName: string | null) {
  if (!loserName) return;
  const [w, l] = await Promise.all([getLbEntry(winnerName), getLbEntry(loserName)]);
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, ((l.elo ?? 1000) - (w.elo ?? 1000)) / 400));
  w.elo = Math.round((w.elo ?? 1000) + K * (1 - expected));
  l.elo = Math.round((l.elo ?? 1000) + K * (0 - (1 - expected)));
  await Promise.all([setLbEntry(w), setLbEntry(l)]);
}

// ── main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 }); }

  const event = body.event as string;
  if (!event) return NextResponse.json({ ok: false, error: "no event" }, { status: 400 });

  switch (event) {

    // ── create-room ──────────────────────────────────────────────────────────
    case "create-room": {
      const { name, gameType = "catan", gameMode = "fast" } = body as { name: string; gameType: string; gameMode: string };
      const roomId = makeCode();
      await setSession({
        room_id: roomId, game_type: gameType, game_mode: gameMode,
        player1_name: name ?? "Speler 1", player2_name: null, winner_name: null,
        status: "waiting", game_state: null, tiles: null, turn_deadline: null,
        started_at: new Date().toISOString(), finished_at: null,
      });
      await addActiveSession(roomId);
      await triggerLobby({});
      return NextResponse.json({ ok: true, roomId, playerIndex: 0 });
    }

    // ── join-room ────────────────────────────────────────────────────────────
    case "join-room": {
      const { roomId, name } = body as { roomId: string; name: string };
      const s = await getSession(roomId);
      if (!s || !["waiting", "active"].includes(s.status)) {
        return NextResponse.json({ ok: false, error: "Kamer niet gevonden" });
      }

      const players: string[] = [s.player1_name, s.player2_name].filter(Boolean) as string[];
      const maxP = maxPlayers(s.game_type ?? "catan");

      // reconnect existing player
      const existingIdx = players.indexOf(name);
      if (existingIdx >= 0) {
        await triggerRoom(roomId, "room-update", {
          players, readyIndices: [], roomId, gameMode: s.game_mode,
        });
        if (s.game_state) {
          await triggerRoom(roomId, "state-sync", { tiles: s.tiles, gameState: s.game_state });
        }
        return NextResponse.json({ ok: true, roomId, playerIndex: existingIdx, players, gameMode: s.game_mode, gameState: s.game_state, tiles: s.tiles });
      }

      // spectator
      if (players.length >= maxP) {
        await triggerRoom(roomId, "room-update", { players, readyIndices: [], roomId, gameMode: s.game_mode });
        if (s.game_state) {
          await triggerRoom(roomId, "state-sync", { tiles: s.tiles, gameState: s.game_state });
        }
        return NextResponse.json({ ok: true, roomId, playerIndex: -1, isSpectator: true, players, gameMode: s.game_mode });
      }

      // new player
      const idx = players.length;
      const updated = { ...s };
      if (idx === 0) updated.player1_name = name;
      if (idx === 1) { updated.player2_name = name; updated.status = "active"; }
      await setSession(updated);

      const newPlayers = [updated.player1_name, updated.player2_name].filter(Boolean) as string[];
      await triggerRoom(roomId, "room-update", { players: newPlayers, readyIndices: [], roomId, gameMode: s.game_mode });
      await triggerLobby({});
      return NextResponse.json({ ok: true, roomId, playerIndex: idx, players: newPlayers, gameMode: s.game_mode, gameState: s.game_state, tiles: s.tiles });
    }

    // ── quickmatch-join ──────────────────────────────────────────────────────
    case "quickmatch-join": {
      const { name, gameType = "catan", gameMode = "fast" } = body as { name: string; gameType: string; gameMode: string };
      const qKey = `quickmatch:${gameType}:${gameMode}`;
      const { redis } = await import("@/lib/redis");
      const waiting = await redis.get<{ name: string; roomId: string; joinedAt: number }>(qKey);

      if (waiting && waiting.name !== name) {
        // match found
        await redis.del(qKey);
        const s = await getSession(waiting.roomId);
        if (!s) return NextResponse.json({ ok: false, error: "Room verlopen" });
        await setSession({ ...s, player2_name: name, status: "active" });
        const players = [s.player1_name!, name];
        await triggerRoom(waiting.roomId, "room-update", { players, ready: true, roomId: waiting.roomId });
        await triggerLobby({});
        return NextResponse.json({ ok: true, roomId: waiting.roomId, playerIndex: 1, matched: true });
      }

      // no match — create room and wait
      const roomId = makeCode();
      await setSession({
        room_id: roomId, game_type: gameType, game_mode: gameMode,
        player1_name: name, player2_name: null, winner_name: null,
        status: "waiting", game_state: null, tiles: null, turn_deadline: null,
        started_at: new Date().toISOString(), finished_at: null,
      });
      await addActiveSession(roomId);
      await redis.set(qKey, { name, roomId, joinedAt: Date.now() }, { ex: 35 });
      await triggerLobby({});
      return NextResponse.json({ ok: true, roomId, playerIndex: 0, matched: false });
    }

    // ── quickmatch-cancel ────────────────────────────────────────────────────
    case "quickmatch-cancel": {
      const { name, gameType, gameMode } = body as { name: string; gameType: string; gameMode: string };
      const { redis } = await import("@/lib/redis");
      const qKey = `quickmatch:${gameType ?? "catan"}:${gameMode ?? "fast"}`;
      const waiting = await redis.get<{ name: string; roomId: string }>(qKey);
      if (waiting?.name === name) {
        await redis.del(qKey);
        const s = await getSession(waiting.roomId);
        if (s) await setSession({ ...s, status: "abandoned", finished_at: new Date().toISOString() });
        await triggerLobby({});
      }
      return NextResponse.json({ ok: true });
    }

    // ── player-ready ─────────────────────────────────────────────────────────
    case "player-ready": {
      const { roomId, playerIndex } = body as { roomId: string; playerIndex: number };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ ok: false });
      const players = [s.player1_name, s.player2_name].filter(Boolean) as string[];
      const ready = s.ready_indices ? [...s.ready_indices] : [];
      if (!ready.includes(playerIndex)) ready.push(playerIndex);
      await setSession({ ...s, ready_indices: ready });
      await triggerRoom(roomId, "room-update", { players, readyIndices: ready, roomId, gameMode: s.game_mode });
      if (ready.length >= players.length && players.length >= 2) {
        await triggerRoom(roomId, "all-ready", { players });
      }
      return NextResponse.json({ ok: true });
    }

    // ── request-state ────────────────────────────────────────────────────────
    case "request-state": {
      const { roomId } = body as { roomId: string };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ gameState: null, players: [] });
      const players = [s.player1_name, s.player2_name].filter(Boolean) as string[];
      return NextResponse.json({ gameState: s.game_state ?? null, players, tiles: s.tiles, gameMode: s.game_mode });
    }

    // ── state-update ─────────────────────────────────────────────────────────
    case "state-update": {
      const { roomId, gameState, playerIndex } = body as { roomId: string; gameState: unknown; playerIndex?: number };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ ok: false });

      const prevPlayer = (s.game_state as Record<string, unknown> | null)?.currentPlayer;
      const newPlayer  = (gameState as Record<string, unknown> | null)?.currentPlayer;
      const turnChanged = newPlayer !== undefined && prevPlayer !== newPlayer;

      await setSession({ ...s, game_state: gameState });
      // broadcast to others in room (not back to sender — but with Pusher, all receive)
      await triggerRoom(roomId, "state-update", { gameState });

      const isGameOver = (gameState as Record<string, unknown>)?.phase === "gameover"
        || (gameState as Record<string, unknown>)?.winner !== undefined
        || (gameState as Record<string, unknown>)?.gamePhase === "gameover";

      if (turnChanged && !isGameOver) {
        const players = [s.player1_name, s.player2_name].filter(Boolean);
        if (players.length >= 2) {
          const durationMs = TURN_MS[(s.game_mode as "fast" | "slow")] ?? TURN_MS.fast;
          const deadline = new Date(Date.now() + durationMs).toISOString();
          await setSession({ ...s, game_state: gameState, turn_deadline: deadline });
          await triggerRoom(roomId, "turn-deadline", { deadline, gameMode: s.game_mode });
          // save snapshot
          await pushSnapshot(roomId, { turn_num: Date.now(), game_type: s.game_type, game_state: gameState });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── tiles-init ───────────────────────────────────────────────────────────
    case "tiles-init": {
      const { roomId, tiles } = body as { roomId: string; tiles: unknown };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ ok: false });
      await setSession({ ...s, tiles });
      await triggerRoom(roomId, "tiles-init", { tiles });
      return NextResponse.json({ ok: true });
    }

    // ── dice events ──────────────────────────────────────────────────────────
    case "dice-result": {
      const { roomId, d1, d2 } = body as { roomId: string; d1: number; d2: number };
      await triggerRoom(roomId, "dice-result", { d1, d2 });
      return NextResponse.json({ ok: true });
    }
    case "roll-start": {
      const { roomId } = body as { roomId: string };
      await triggerRoom(roomId, "roll-start", {});
      return NextResponse.json({ ok: true });
    }
    case "dice-staging": {
      const { roomId, indices } = body as { roomId: string; indices: unknown };
      await triggerRoom(roomId, "dice-staging", { indices });
      return NextResponse.json({ ok: true });
    }

    // ── game-over ────────────────────────────────────────────────────────────
    case "game-over": {
      const { roomId, winnerName } = body as { roomId: string; winnerName: string };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ ok: false });
      const loserName = s.player1_name === winnerName ? s.player2_name : s.player1_name;
      const now = new Date().toISOString();
      await setSession({ ...s, status: "finished", winner_name: winnerName, finished_at: now, turn_deadline: null });

      const [w, l] = await Promise.all([getLbEntry(winnerName), loserName ? getLbEntry(loserName) : Promise.resolve(null)]);
      w.wins = (w.wins ?? 0) + 1; w.games_played = (w.games_played ?? 0) + 1;
      await setLbEntry(w);
      if (l) { l.games_played = (l.games_played ?? 0) + 1; await setLbEntry(l); }
      await updateElo(winnerName, loserName ?? null);

      const { redis } = await import("@/lib/redis");
      const addSess = async (name: string) => {
        const key = `player:sessions:${name.toLowerCase()}`;
        await redis.rpush(key, roomId);
        await redis.ltrim(key, -50, -1);
        await redis.expire(key, 60 * 60 * 24 * 90);
      };
      await addSess(winnerName);
      if (loserName) await addSess(loserName);
      return NextResponse.json({ ok: true });
    }

    // ── resign ───────────────────────────────────────────────────────────────
    case "resign": {
      const { roomId, playerIndex } = body as { roomId: string; playerIndex: number };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ ok: false });
      const players = [s.player1_name, s.player2_name].filter(Boolean) as string[];
      const winnerIdx  = 1 - playerIndex;
      const winnerName = players[winnerIdx];
      const loserName  = players[playerIndex];
      if (!winnerName) return NextResponse.json({ ok: false });

      await triggerRoom(roomId, "turn-forfeit", { loserIndex: playerIndex, winnerName });
      await setSession({ ...s, status: "finished", winner_name: winnerName, finished_at: new Date().toISOString(), turn_deadline: null });

      const [w, l] = await Promise.all([getLbEntry(winnerName), getLbEntry(loserName)]);
      w.wins = (w.wins ?? 0) + 1; w.games_played = (w.games_played ?? 0) + 1;
      l.games_played = (l.games_played ?? 0) + 1;
      await Promise.all([setLbEntry(w), setLbEntry(l)]);
      await updateElo(winnerName, loserName);
      await triggerLobby({});
      return NextResponse.json({ ok: true });
    }

    // ── leave-room ───────────────────────────────────────────────────────────
    case "leave-room": {
      const { roomId, playerName } = body as { roomId: string; playerName: string };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ ok: false });
      if (s.player1_name !== playerName) return NextResponse.json({ ok: false, error: "niet de eigenaar" });
      await setSession({ ...s, status: "abandoned", finished_at: new Date().toISOString() });
      const entry = await getLbEntry(playerName);
      entry.games_played = (entry.games_played ?? 0) + 1;
      entry.penalties = (entry.penalties ?? 0) + 1;
      await setLbEntry(entry);
      await triggerLobby({});
      return NextResponse.json({ ok: true });
    }

    // ── chat-send ────────────────────────────────────────────────────────────
    case "chat-send": {
      const { gameType, userName, message } = body as { gameType: string; userName: string; message: string };
      if (!message?.trim() || !userName) return NextResponse.json({ ok: false, error: "leeg bericht" });
      const msg = { user: userName, text: message.trim(), role: "user" };
      await pushGlobalChat(gameType, msg);
      await pusher.trigger("lobby", `chat-${gameType}`, msg);
      return NextResponse.json({ ok: true });
    }

    // ── chat-history ─────────────────────────────────────────────────────────
    case "chat-history": {
      const { gameType } = body as { gameType: string };
      const msgs = await getGlobalChat(gameType);
      return NextResponse.json(msgs);
    }

    // ── room-chat-send ───────────────────────────────────────────────────────
    case "room-chat-send": {
      const { roomId, message, name } = body as { roomId: string; message: string; name: string };
      if (!roomId || !message?.trim()) return NextResponse.json({ ok: false });
      const msg = { user: name ?? "Speler", text: message.trim() };
      await pushRoomChat(roomId, msg);
      await triggerRoom(roomId, "room-chat", msg);
      return NextResponse.json({ ok: true });
    }

    // ── room-chat-history ────────────────────────────────────────────────────
    case "room-chat-history": {
      const { roomId } = body as { roomId: string };
      const msgs = await getRoomChat(roomId);
      return NextResponse.json(msgs);
    }

    // ── rematch-request ──────────────────────────────────────────────────────
    case "rematch-request": {
      const { roomId, playerIndex, playerName } = body as { roomId: string; playerIndex: number; playerName: string };
      const s = await getSession(roomId);
      if (!s) return NextResponse.json({ ok: false });
      const votes: number[] = s.rematch_votes ?? [];
      if (!votes.includes(playerIndex)) votes.push(playerIndex);
      await setSession({ ...s, rematch_votes: votes });

      await triggerRoom(roomId, "rematch-offer", { from: playerName });

      if (votes.length >= 2) {
        const newRoomId = roomId + "-r" + Date.now();
        await setSession({
          room_id: newRoomId, game_type: s.game_type, game_mode: s.game_mode,
          player1_name: s.player1_name, player2_name: s.player2_name,
          winner_name: null, status: "active", game_state: null, tiles: null,
          turn_deadline: null, started_at: new Date().toISOString(), finished_at: null,
          rematch_votes: [],
        });
        await addActiveSession(newRoomId);
        const players = [s.player1_name!, s.player2_name!];
        await triggerRoom(roomId, "room-update", { players, ready: true, roomId: newRoomId, gameMode: s.game_mode });
      }
      return NextResponse.json({ ok: true });
    }

    // ── rematch-decline ──────────────────────────────────────────────────────
    case "rematch-decline": {
      const { roomId } = body as { roomId: string };
      await triggerRoom(roomId, "rematch-declined", {});
      return NextResponse.json({ ok: true });
    }

    // ── turn-expired (client-triggered forfeit for fast mode) ─────────────
    case "turn-expired": {
      const { roomId } = body as { roomId: string };
      const s = await getSession(roomId);
      if (!s || s.status !== "active" || !s.turn_deadline) return NextResponse.json({ ok: false });
      const deadline = new Date(s.turn_deadline).getTime();
      if (Date.now() < deadline) return NextResponse.json({ ok: false, reason: "not_expired" });

      const gs = s.game_state as Record<string, unknown> | null;
      const currentPlayer = gs?.currentPlayer as number | undefined;
      const loserIdx  = currentPlayer ?? 0;
      const winnerIdx = 1 - loserIdx;
      const players = [s.player1_name, s.player2_name].filter(Boolean) as string[];
      const winnerName = players[winnerIdx];
      const loserName  = players[loserIdx];
      if (!winnerName || !loserName) return NextResponse.json({ ok: false });

      await triggerRoom(roomId, "turn-forfeit", { loserIndex: loserIdx, winnerName });
      await setSession({ ...s, status: "finished", winner_name: winnerName, finished_at: new Date().toISOString(), turn_deadline: null });

      const [w, l] = await Promise.all([getLbEntry(winnerName), getLbEntry(loserName)]);
      w.wins = (w.wins ?? 0) + 1; w.games_played = (w.games_played ?? 0) + 1;
      l.games_played = (l.games_played ?? 0) + 1;
      await Promise.all([setLbEntry(w), setLbEntry(l)]);
      await updateElo(winnerName, loserName);
      await triggerLobby({});
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: false, error: `unknown event: ${event}` });
  }
}

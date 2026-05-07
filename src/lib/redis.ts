import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function rget<T>(key: string): Promise<T | null> {
  try { return await redis.get<T>(key); } catch { return null; }
}

export async function rset(key: string, value: unknown, exSeconds?: number): Promise<void> {
  try {
    if (exSeconds) await redis.setex(key, exSeconds, value as string);
    else await redis.set(key, value as string);
  } catch (e) { console.error('[redis] rset', key, e); }
}

export async function rdel(...keys: string[]): Promise<void> {
  try { await redis.del(...keys); } catch {}
}

// ── user helpers ────────────────────────────────────────────────────────────────

export interface RUser {
  username: string;
  password_hash: string;
  avatar_id?: string | null;
  unlocked_expansions?: string[];
}

export async function getUser(username: string): Promise<RUser | null> {
  return rget<RUser>(`user:${username.toLowerCase()}`);
}

export async function setUser(u: RUser): Promise<void> {
  await rset(`user:${u.username.toLowerCase()}`, u);
}

// ── session helpers ─────────────────────────────────────────────────────────────

export interface RSession {
  room_id: string;
  game_type: string;
  game_mode: string;
  player1_name?: string | null;
  player2_name?: string | null;
  winner_name?: string | null;
  status: string;
  game_state?: unknown;
  tiles?: unknown;
  turn_deadline?: string | null;
  started_at: string;
  finished_at?: string | null;
  ready_indices?: number[];
  rematch_votes?: number[];
}

const SESSION_TTL = 60 * 60 * 48; // 48h

export async function getSession(roomId: string): Promise<RSession | null> {
  return rget<RSession>(`session:${roomId}`);
}

export async function setSession(s: RSession): Promise<void> {
  await rset(`session:${s.room_id}`, s, SESSION_TTL);
  if (s.status === 'waiting' || s.status === 'active') {
    try { await redis.sadd('sessions:active', s.room_id); } catch {}
  } else {
    try { await redis.srem('sessions:active', s.room_id); } catch {}
  }
}

export async function addActiveSession(roomId: string): Promise<void> {
  try { await redis.sadd('sessions:active', roomId); } catch {}
}

export async function removeActiveSession(roomId: string): Promise<void> {
  try { await redis.srem('sessions:active', roomId); } catch {}
}

export async function getActiveSessions(): Promise<RSession[]> {
  try {
    const ids = await redis.smembers('sessions:active') as string[];
    if (!ids.length) return [];
    const sessions = await Promise.all(ids.map(id => getSession(id)));
    return sessions.filter(Boolean) as RSession[];
  } catch { return []; }
}

// ── leaderboard helpers ─────────────────────────────────────────────────────────

export interface RLbEntry {
  player_name: string;
  wins: number;
  games_played: number;
  penalties: number;
  elo: number;
}

export async function getLbEntry(name: string): Promise<RLbEntry> {
  const e = await rget<RLbEntry>(`lb:${name.toLowerCase()}`);
  return e ?? { player_name: name, wins: 0, games_played: 0, penalties: 0, elo: 1000 };
}

export async function setLbEntry(e: RLbEntry): Promise<void> {
  await rset(`lb:${e.player_name.toLowerCase()}`, e);
  try { await redis.zadd('lb:rank', { score: e.elo, member: e.player_name.toLowerCase() }); } catch {}
}

export async function getLeaderboard(limit = 20): Promise<RLbEntry[]> {
  try {
    const members = await redis.zrange('lb:rank', 0, limit - 1, { rev: true }) as string[];
    if (!members.length) return [];
    const entries = await Promise.all(members.map(m => getLbEntry(m)));
    return entries.filter(Boolean) as RLbEntry[];
  } catch { return []; }
}

// ── snapshot helpers ────────────────────────────────────────────────────────────

export async function pushSnapshot(roomId: string, snap: { turn_num: number; game_type: string | undefined; game_state: unknown }): Promise<void> {
  try {
    const key = `snap:${roomId}`;
    await redis.rpush(key, JSON.stringify(snap));
    await redis.expire(key, 60 * 60 * 24 * 7); // 7 days
  } catch {}
}

export async function getSnapshots(roomId: string): Promise<{turn_num: number; game_state: unknown}[]> {
  try {
    const items = await redis.lrange(`snap:${roomId}`, 0, -1) as string[];
    return items.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// ── chat helpers ────────────────────────────────────────────────────────────────

const CHAT_MAX = 50;

export async function pushGlobalChat(gameType: string, msg: unknown): Promise<void> {
  try {
    const key = `chat:g:${gameType}`;
    await redis.rpush(key, JSON.stringify(msg));
    await redis.ltrim(key, -CHAT_MAX, -1);
    await redis.expire(key, 60 * 60 * 24 * 30);
  } catch {}
}

export async function getGlobalChat(gameType: string): Promise<unknown[]> {
  try {
    const items = await redis.lrange(`chat:g:${gameType}`, 0, -1) as string[];
    return items.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export async function pushRoomChat(roomId: string, msg: unknown): Promise<void> {
  try {
    const key = `chat:r:${roomId}`;
    await redis.rpush(key, JSON.stringify(msg));
    await redis.ltrim(key, -CHAT_MAX, -1);
    await redis.expire(key, 60 * 60 * 48);
  } catch {}
}

export async function getRoomChat(roomId: string): Promise<unknown[]> {
  try {
    const items = await redis.lrange(`chat:r:${roomId}`, 0, -1) as string[];
    return items.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

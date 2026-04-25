const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { Pool } = require("pg");

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "8080", 10);

console.log("[startup] NODE_ENV:", process.env.NODE_ENV);
console.log("[startup] PORT:", port);
console.log("[startup] DATABASE_URL aanwezig:", !!process.env.DATABASE_URL);
console.log("[startup] NEXTAUTH_SECRET aanwezig:", !!process.env.NEXTAUTH_SECRET);
console.log("[startup] JWT_SECRET aanwezig:", !!process.env.JWT_SECRET);
const app  = next({ dev });
const handle = app.getRequestHandler();

// ── Database ─────────────────────────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error("[DB] ❌ DATABASE_URL is not set — running without database");
} else {
  console.log("[DB] DATABASE_URL present, host:", process.env.DATABASE_URL.split("@")[1]?.split("/")[0] ?? "unknown");
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

if (pool) {
  pool.on("error", (err) => {
    console.error("[DB] ❌ Pool error:", err.message, err.stack);
  });
  pool.on("connect", () => {
    console.log("[DB] ✅ New client connected to pool");
  });
}

async function initDB() {
  if (!pool) { console.warn("[DB] ⚠️  Skipping initDB — no pool"); return; }
  console.log("[DB] Running initDB...");
  // Test connection first
  try {
    await pool.query("SELECT 1");
    console.log("[DB] ✅ Connection test passed");
  } catch (err) {
    console.error("[DB] ❌ Connection test FAILED:", err.message);
    console.error("[DB]    Code:", err.code, "| Detail:", err.detail ?? "-");
    console.error("[DB]    Full error:", err);
    return;
  }
  try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id           SERIAL PRIMARY KEY,
      room_id      VARCHAR(10) UNIQUE NOT NULL,
      game_type    VARCHAR(50) DEFAULT 'catan',
      player1_name VARCHAR(100),
      player2_name VARCHAR(100),
      winner_name  VARCHAR(100),
      status       VARCHAR(20) DEFAULT 'waiting',
      game_state   JSONB,
      tiles        JSONB,
      game_mode    VARCHAR(10) DEFAULT 'fast',
      turn_deadline TIMESTAMP,
      started_at   TIMESTAMP DEFAULT NOW(),
      finished_at  TIMESTAMP
    );
    ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_mode VARCHAR(10) DEFAULT 'fast';
    ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS turn_deadline TIMESTAMP;

    CREATE TABLE IF NOT EXISTS leaderboard (
      id           SERIAL PRIMARY KEY,
      player_name  VARCHAR(100) UNIQUE NOT NULL,
      wins         INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      penalties    INTEGER DEFAULT 0,
      updated_at   TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS penalties INTEGER DEFAULT 0;
    ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS elo INTEGER DEFAULT 1000;

    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at    TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS game_snapshots (
      id         SERIAL PRIMARY KEY,
      room_id    VARCHAR(10) NOT NULL,
      game_type  VARCHAR(50),
      turn_num   INTEGER NOT NULL,
      game_state JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_room ON game_snapshots(room_id, turn_num);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         SERIAL PRIMARY KEY,
      game_type  VARCHAR(50) NOT NULL,
      user_name  VARCHAR(100) NOT NULL,
      message    VARCHAR(500) NOT NULL,
      role       VARCHAR(20) DEFAULT NULL,
      room_id    VARCHAR(10) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS room_id VARCHAR(10);

    CREATE INDEX IF NOT EXISTS idx_sessions_status  ON game_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON game_sessions(started_at DESC);
  `);

  // Herstel actieve rooms vanuit DB na herstart
  const { rows } = await pool.query(
    `SELECT room_id, player1_name, player2_name, game_type, game_mode, game_state, tiles
     FROM game_sessions WHERE status IN ('waiting', 'active')`
  );
  for (const row of rows) {
    if (!rooms.has(row.room_id)) {
      const players = [];
      if (row.player1_name) players.push({ socketId: null, name: row.player1_name, index: 0 });
      if (row.player2_name) players.push({ socketId: null, name: row.player2_name, index: 1 });
      rooms.set(row.room_id, {
        players,
        spectators:    [],
        gameType:      row.game_type  ?? 'catan',
        gameMode:      row.game_mode  ?? 'fast',
        tiles:         row.tiles      ?? null,
        gameState:     row.game_state ?? null,
        currentPlayer: row.game_state?.currentPlayer ?? undefined,
        rematchVotes:  new Set(),
        turnCount:     0,
      });
    }
  }
  console.log(`[DB] ✅ Schema ready — ${rows.length} active room(s) restored`);
  } catch (err) {
    console.error("[DB] ❌ initDB failed:", err.message);
    console.error("[DB]    Code:", err.code, "| Detail:", err.detail ?? "-");
    console.error("[DB]    Full error:", err);
  }
}

// ── ELO ───────────────────────────────────────────────────────────────────────

async function updateElo(winnerName, loserName) {
  if (!pool || !loserName) return;
  try {
    const { rows } = await pool.query(
      `SELECT player_name, COALESCE(elo, 1000) AS elo FROM leaderboard WHERE player_name = ANY($1)`,
      [[winnerName, loserName]]
    );
    const byName = Object.fromEntries(rows.map(r => [r.player_name, Number(r.elo)]));
    const eloW = byName[winnerName] ?? 1000;
    const eloL = byName[loserName]  ?? 1000;
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (eloL - eloW) / 400));
    const newEloW = Math.round(eloW + K * (1 - expected));
    const newEloL = Math.round(eloL + K * (0 - (1 - expected)));
    await pool.query(`UPDATE leaderboard SET elo=$1 WHERE player_name=$2`, [newEloW, winnerName]);
    await pool.query(`UPDATE leaderboard SET elo=$1 WHERE player_name=$2`, [newEloL, loserName]);
  } catch (e) {
    console.error('ELO update fout:', e);
  }
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

// roomId → { players, tiles, gameState, gameMode, currentPlayer }
const rooms = new Map();

// Grace period timers: roomId → timeoutId (15s before a room is abandoned)
const abandonTimers = new Map();

// Turn timers (fast mode): roomId → timeoutId
const turnTimers = new Map();

// Matchmaking queue: gameType → { socketId, name, roomId, timer }
const matchmakingQueue = new Map();

const TURN_DURATION_MS = { fast: 2 * 60 * 1000, slow: 24 * 60 * 60 * 1000 };

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function autoForfeit(roomId, room, io) {
  if (!rooms.has(roomId)) return;
  turnTimers.delete(roomId);

  const loserIdx = room.currentPlayer ?? 0;
  const loserName = room.players[loserIdx]?.name;

  // Emit turn-timeout so the client applies performBust and continues the game
  io.to(roomId).emit("turn-timeout", { loserIndex: loserIdx });
  console.log(`[timer] TURN-TIMEOUT ${roomId}: ${loserName} verloor beurt (bust) → volgende speler`);

}

function resetTurnTimer(roomId, room, io) {
  if (!room.gameMode) return;
  if (turnTimers.has(roomId)) {
    clearTimeout(turnTimers.get(roomId));
    turnTimers.delete(roomId);
  }

  const durationMs = TURN_DURATION_MS[room.gameMode] ?? TURN_DURATION_MS.fast;
  const deadline   = new Date(Date.now() + durationMs);

  if (pool) pool.query(
    `UPDATE game_sessions SET turn_deadline=$1 WHERE room_id=$2`,
    [deadline, roomId],
  ).catch(console.error);

  io.to(roomId).emit("turn-deadline", { deadline: deadline.toISOString(), gameMode: room.gameMode });

  if (room.gameMode === "fast") {
    const timer = setTimeout(() => autoForfeit(roomId, room, io), durationMs);
    turnTimers.set(roomId, timer);
  }
}

async function restoreFastTimers(io) {
  if (!pool) return;
  try {
    const { rows } = await pool.query(
      `SELECT room_id, turn_deadline FROM game_sessions
       WHERE status='active' AND game_mode='fast' AND turn_deadline > NOW()`
    );
    for (const row of rows) {
      const room = rooms.get(row.room_id);
      if (!room || turnTimers.has(row.room_id)) continue;
      const msLeft = new Date(row.turn_deadline).getTime() - Date.now();
      if (msLeft > 0) {
        const timer = setTimeout(() => autoForfeit(row.room_id, room, io), msLeft);
        turnTimers.set(row.room_id, timer);
        console.log(`  ✦ Timer hersteld: ${row.room_id} (nog ${Math.round(msLeft / 1000)}s)`);
      }
    }
  } catch (e) {
    console.error('restoreFastTimers fout:', e);
  }
}

// ── Server ────────────────────────────────────────────────────────────────────

app.prepare().then(async () => {
  await initDB();

  const httpServer = createServer((req, res) => {
    if (req.url === "/api/ping") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }
    handle(req, res, parse(req.url, true));
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
  });

  console.log("[server] ✅ HTTP server + Socket.IO klaar");

  io.on("connection", (socket) => {
    console.log(`[socket] CONNECT ${socket.id} (transport: ${socket.conn.transport.name})`);
    let myRoom  = null;
    let myIndex = -1;
    let myIsSpectator = false;

    // ── Kamer aanmaken ───────────────────────────────────────────────────────
    socket.on("create-room", async ({ name, gameType = "catan", gameMode = "fast" }, cb) => {
      let code;
      do { code = makeCode(); } while (rooms.has(code));

      const maxPlayers = gameType === "grub" ? 7 : gameType === "bommen" ? 4 : 2;
      rooms.set(code, {
        players:       [{ socketId: socket.id, name: name ?? "Speler 1", index: 0 }],
        spectators:    [],
        gameType,
        gameMode,
        maxPlayers,
        readyPlayers:  new Set(),
        tiles:         null,
        gameState:     null,
        currentPlayer: undefined,
        rematchVotes:  new Set(),
        turnCount:     0,
      });

      myRoom  = code;
      myIndex = 0;
      socket.join(code);

      console.log(`[room] CREATE ${code} (${gameType}) door "${name}" [socket ${socket.id}]`);

      // Await DB insert so the room is guaranteed persisted before client navigates
      if (pool) {
        await pool.query(
          `INSERT INTO game_sessions (room_id, game_type, game_mode, player1_name) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [code, gameType, gameMode, name ?? "Speler 1"],
        ).catch(console.error);
        console.log(`[db]   INSERT room ${code} OK`);
      }

      // Notify all lobby clients that sessions changed
      io.emit("lobby-update");

      cb({ ok: true, roomId: code, playerIndex: 0 });
    });

    // ── Kamer joinen ─────────────────────────────────────────────────────────
    socket.on("join-room", async ({ roomId, name }, cb) => {
      // Cancel pending abandon timer (player reconnected in time)
      if (abandonTimers.has(roomId)) {
        clearTimeout(abandonTimers.get(roomId));
        abandonTimers.delete(roomId);
        console.log(`[room] CANCEL abandon timer voor ${roomId} (reconnect)`);
      }

      let room = rooms.get(roomId);

      // DB-fallback: server herstarted — herstel room uit database (waiting én active)
      if (!room && pool) {
        try {
          const { rows } = await pool.query(
            `SELECT room_id, game_type, game_mode, player1_name, player2_name, game_state, status
             FROM game_sessions WHERE room_id=$1 AND status IN ('waiting','active') LIMIT 1`,
            [roomId]
          );
          if (rows.length > 0) {
            const row = rows[0];
            const players = [];
            if (row.player1_name) players.push({ socketId: null, name: row.player1_name, index: 0 });
            if (row.player2_name) players.push({ socketId: null, name: row.player2_name, index: 1 });
            room = { players, spectators: [], gameType: row.game_type, gameMode: row.game_mode ?? "fast", tiles: null, gameState: row.game_state ?? null, currentPlayer: row.game_state?.currentPlayer, rematchVotes: new Set(), turnCount: 0 };
            rooms.set(roomId, room);
            console.log(`[room] HERSTELD uit DB: ${roomId} (${row.game_type}, status=${row.status})`);
          }
        } catch (e) {
          console.error("[room] DB-fallback fout:", e);
        }
      }

      if (!room) {
        console.log(`[room] JOIN FAIL ${roomId} - niet gevonden`);
        return cb({ ok: false, error: "Kamer niet gevonden" });
      }

      // Already connected with this socket (idempotent re-join on page mount)
      const activeSlot = room.players.find((p) => p.socketId === socket.id);
      if (activeSlot) {
        myRoom  = roomId;
        myIndex = activeSlot.index;
        socket.join(roomId);
        const names = room.players.map((p) => p.name);
        const readyIndices = [...(room.readyPlayers ?? new Set())];
        io.to(roomId).emit("room-update", { players: names, readyIndices, roomId, gameMode: room.gameMode });
        if (room.gameState) socket.emit("state-sync", { tiles: room.tiles, gameState: room.gameState });
        return cb({ ok: true, roomId, playerIndex: activeSlot.index, players: names, gameMode: room.gameMode });
      }

      // Reconnect: player already has a slot (same name, any socketId)
      const existingSlot = room.players.find((p) => p.name === name);
      if (existingSlot) {
        console.log(`[room] RECONNECT ${roomId} speler "${name}" (slot ${existingSlot.index}) [socket ${socket.id}]`);
        existingSlot.socketId = socket.id;
        myRoom  = roomId;
        myIndex = existingSlot.index;
        socket.join(roomId);
        const names = room.players.map((p) => p.name);
        if (room.gameState) socket.emit("state-sync", { tiles: room.tiles, gameState: room.gameState });
        const readyIndices = [...(room.readyPlayers ?? new Set())];
        io.to(roomId).emit("room-update", { players: names, readyIndices, roomId });
        return cb({ ok: true, roomId, playerIndex: existingSlot.index, players: names });
      }

      // Count active (non-null) slots to determine if full
      const maxPlayers = room.maxPlayers ?? 2;
      const activeCount = room.players.filter((p) => p.socketId !== null).length;
      if (room.players.length >= maxPlayers && activeCount >= maxPlayers) {
        // Allow joining as spectator on full rooms
        if (!room.spectators) room.spectators = [];
        room.spectators.push({ socketId: socket.id, name: name ?? "Toeschouwer" });
        myRoom = roomId;
        myIsSpectator = true;
        socket.join(roomId);
        if (room.gameState) socket.emit("state-sync", { tiles: room.tiles, gameState: room.gameState });
        const players = room.players.map((p) => p.name);
        const readyIndices = [...(room.readyPlayers ?? new Set())];
        io.to(roomId).emit("room-update", { players, readyIndices, roomId, gameMode: room.gameMode });
        console.log(`[room] SPECTATOR ${roomId} "${name}" [socket ${socket.id}]`);
        return cb({ ok: true, roomId, playerIndex: -1, isSpectator: true, players, gameMode: room.gameMode });
      }

      const idx = room.players.length;
      console.log(`[room] JOIN ${roomId} speler "${name}" als index ${idx} [socket ${socket.id}]`);
      room.players.push({ socketId: socket.id, name: name ?? `Speler ${idx + 1}`, index: idx });
      if (!room.readyPlayers) room.readyPlayers = new Set();

      myRoom  = roomId;
      myIndex = idx;
      socket.join(roomId);

      const names = room.players.map((p) => p.name);
      const readyIndices = [...room.readyPlayers];
      io.to(roomId).emit("room-update", { players: names, readyIndices, roomId, gameMode: room.gameMode });

      if (room.gameState) socket.emit("state-sync", { tiles: room.tiles, gameState: room.gameState });

      if (pool && idx === 1) {
        pool.query(
          `UPDATE game_sessions SET player2_name=$1, status='active' WHERE room_id=$2`,
          [name ?? `Speler ${idx + 1}`, roomId],
        ).catch(console.error);
      }

      // Notify lobby clients
      io.emit("lobby-update");

      cb({ ok: true, roomId, playerIndex: idx, players: names, gameMode: room.gameMode });
    });

    // ── Quickmatch ───────────────────────────────────────────────────────────
    socket.on("quickmatch-join", async ({ name, gameType = "catan", gameMode = "fast" }, cb) => {
      const waiting = matchmakingQueue.get(gameType);

      if (waiting && waiting.socketId !== socket.id) {
        // Match gevonden — join de wachtende room
        clearTimeout(waiting.timer);
        matchmakingQueue.delete(gameType);
        console.log(`[mm] MATCH ${gameType}: "${waiting.name}" ↔ "${name}"`);

        const room = rooms.get(waiting.roomId);
        if (!room) return cb({ ok: false, error: "Room verlopen" });

        room.players.push({ socketId: socket.id, name, index: 1 });
        myRoom  = waiting.roomId;
        myIndex = 1;
        socket.join(waiting.roomId);

        const names = room.players.map((p) => p.name);
        io.to(waiting.roomId).emit("room-update", { players: names, ready: true, roomId: waiting.roomId });

        if (pool) {
          pool.query(
            `UPDATE game_sessions SET player2_name=$1, status='active' WHERE room_id=$2`,
            [name, waiting.roomId],
          ).catch(console.error);
        }
        io.emit("lobby-update");
        cb({ ok: true, roomId: waiting.roomId, playerIndex: 1, matched: true });

      } else {
        // Niemand in queue — maak room en wacht
        let code;
        do { code = makeCode(); } while (rooms.has(code));

        const maxPlayers = gameType === "grub" ? 7 : gameType === "bommen" ? 4 : 2;
        rooms.set(code, { players: [{ socketId: socket.id, name, index: 0 }], spectators: [], gameType, gameMode, maxPlayers, readyPlayers: new Set(), tiles: null, gameState: null, currentPlayer: undefined, rematchVotes: new Set(), turnCount: 0 });
        myRoom  = code;
        myIndex = 0;
        socket.join(code);
        console.log(`[mm] QUEUE ${gameType}: "${name}" wacht in ${code}`);

        if (pool) {
          await pool.query(
            `INSERT INTO game_sessions (room_id, game_type, game_mode, player1_name) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [code, gameType, gameMode, name],
          ).catch(console.error);
        }
        io.emit("lobby-update");

        // Na 30s: geen match gevonden → AI fallback
        const timer = setTimeout(() => {
          matchmakingQueue.delete(gameType);
          console.log(`[mm] TIMEOUT ${gameType}: "${name}" krijgt AI`);
          io.to(code).emit("quickmatch-timeout");
        }, 30000);

        matchmakingQueue.set(gameType, { socketId: socket.id, name, roomId: code, timer });
        cb({ ok: true, roomId: code, playerIndex: 0, matched: false });
      }
    });

    socket.on("quickmatch-cancel", () => {
      const entry = [...matchmakingQueue.entries()].find(([, v]) => v.socketId === socket.id);
      if (!entry) return;
      const [gameType, { roomId: code, timer }] = entry;
      clearTimeout(timer);
      matchmakingQueue.delete(gameType);
      rooms.delete(code);
      if (pool) pool.query(
        `UPDATE game_sessions SET status='abandoned', finished_at=NOW() WHERE room_id=$1`,
        [code],
      ).catch(console.error);
      io.emit("lobby-update");
      console.log(`[mm] CANCEL ${gameType}`);
    });

    // ── Board tiles ──────────────────────────────────────────────────────────
    socket.on("tiles-init", ({ tiles }) => {
      const room = rooms.get(myRoom);
      if (!room || myIndex !== 0) return;
      room.tiles = tiles;
      socket.to(myRoom).emit("tiles-init", { tiles });
      if (pool) pool.query(
        `UPDATE game_sessions SET tiles=$1 WHERE room_id=$2`,
        [JSON.stringify(tiles), myRoom]
      ).catch(console.error);
    });

    // ── Request current state (client reconnect / page mount) ────────────────
    socket.on("request-state", async ({ roomId: rid }, cb) => {
      let room = rooms.get(rid);
      if (!room && pool) {
        try {
          const { rows } = await pool.query(
            `SELECT room_id, game_type, game_mode, player1_name, player2_name, game_state
             FROM game_sessions WHERE room_id=$1 AND status IN ('waiting','active') LIMIT 1`,
            [rid]
          );
          if (rows.length > 0) {
            const row = rows[0];
            const players = [];
            if (row.player1_name) players.push({ socketId: null, name: row.player1_name, index: 0 });
            if (row.player2_name) players.push({ socketId: null, name: row.player2_name, index: 1 });
            room = { players, spectators: [], gameType: row.game_type, gameMode: row.game_mode ?? "fast", tiles: null, gameState: row.game_state ?? null, currentPlayer: row.game_state?.currentPlayer, rematchVotes: new Set(), turnCount: 0 };
            rooms.set(rid, room);
          }
        } catch (e) {
          console.error(`[socket] request-state DB-fallback fout voor ${rid}:`, e.message, e.code);
        }
      }
      if (!room) {
        console.log(`[socket] request-state: room ${rid} niet gevonden`);
        return cb({ gameState: null, players: [] });
      }
      const players = room.players.map((p) => p.name);
      console.log(`[socket] request-state: ${rid} players=[${players}] hasState=${!!room.gameState}`);
      cb({ gameState: room.gameState ?? null, players });
      // If room is full but no game state yet, re-emit room-update so player 0 initializes
      if (room.players.length >= 2 && !room.gameState) {
        const ready = room.players.every((p) => p.socketId !== null);
        io.to(rid).emit("room-update", { players, ready, roomId: rid });
      }
    });

    // ── Player ready ─────────────────────────────────────────────────────────
    socket.on("player-ready", ({ roomId: rid } = {}) => {
      const resolvedRoom = rid || myRoom;
      const room = rooms.get(resolvedRoom);
      if (!room || myIsSpectator) return;
      if (!myRoom) { myRoom = resolvedRoom; }
      const slot = room.players.find((p) => p.socketId === socket.id);
      if (slot && myIndex !== slot.index) myIndex = slot.index;
      if (!room.readyPlayers) room.readyPlayers = new Set();
      room.readyPlayers.add(myIndex);

      const names = room.players.map((p) => p.name);
      const readyIndices = [...room.readyPlayers];
      io.to(resolvedRoom).emit("room-update", { players: names, readyIndices, roomId: resolvedRoom, gameMode: room.gameMode });

      if (room.players.length >= 2 && room.readyPlayers.size === room.players.length) {
        io.to(resolvedRoom).emit("all-ready", { players: names });
        console.log(`[room] ALL-READY ${resolvedRoom}: ${names.join(", ")}`);
      }
    });

    // ── Game state ───────────────────────────────────────────────────────────
    socket.on("state-update", ({ gameState }) => {
      if (myIsSpectator) return;
      const room = rooms.get(myRoom);
      if (!room) return;

      const prevPlayer = room.currentPlayer;
      const newPlayer  = gameState?.currentPlayer;
      const turnChanged = newPlayer !== undefined &&
        (prevPlayer === undefined || prevPlayer !== newPlayer);

      room.gameState     = gameState;
      room.currentPlayer = newPlayer;

      socket.to(myRoom).emit("state-update", { gameState });
      if (pool) pool.query(
        `UPDATE game_sessions SET game_state=$1 WHERE room_id=$2`,
        [JSON.stringify(gameState), myRoom]
      ).catch(console.error);

      // Start/reset beurt-timer bij eerste update of beurtwissel
      const isGameOver = gameState?.phase === "gameover" || gameState?.winner !== undefined || gameState?.gamePhase === "gameover";
      if (turnChanged && !isGameOver && room.players.length === 2) {
        resetTurnTimer(myRoom, room, io);
        // Snapshot opslaan voor replay
        const turnNum = room.turnCount ?? 0;
        room.turnCount = turnNum + 1;
        if (pool) pool.query(
          `INSERT INTO game_snapshots (room_id, game_type, turn_num, game_state) VALUES ($1, $2, $3, $4)`,
          [myRoom, room.gameType, turnNum, JSON.stringify(gameState)]
        ).catch(console.error);
      }
    });

    // ── Chat ─────────────────────────────────────────────────────────────────
    socket.on("chat-send", async ({ gameType, userName, message }, cb) => {
      if (!message?.trim() || !userName) return cb?.({ ok: false, error: "leeg bericht" });
      const msg = { user: userName, text: message.trim(), role: "user" };
      // Broadcast naar alle clients in de lobby van dit gameType (inclusief sender)
      io.emit(`chat-${gameType}`, msg);
      if (!pool) {
        console.warn("[chat] chat-send: pool is null — bericht NIET opgeslagen");
        return cb?.({ ok: false, error: "pool null" });
      }
      try {
        await pool.query(
          `INSERT INTO chat_messages (game_type, user_name, message) VALUES ($1, $2, $3)`,
          [gameType, userName, message.trim()]
        );
        console.log(`[chat] INSERT OK: ${gameType} / ${userName}`);
        cb?.({ ok: true });
      } catch (e) {
        console.error("[chat] INSERT fout:", e.message, e.code, e.detail);
        cb?.({ ok: false, error: e.message });
      }
    });

    socket.on("chat-history", async ({ gameType }, cb) => {
      if (!pool) {
        console.warn("[chat] chat-history: pool is null — geef lege array terug");
        return cb([]);
      }
      try {
        const { rows } = await pool.query(
          `SELECT user_name, message, role FROM chat_messages WHERE game_type=$1 ORDER BY created_at DESC LIMIT 30`,
          [gameType]
        );
        cb(rows.reverse().map(r => ({ user: r.user_name, text: r.message, role: r.role === "mod" ? "mod" : undefined })));
      } catch (e) {
        console.error("[socket] chat-history fout:", e.message, e.code);
        cb([]);
      }
    });

    // ── Dobbelstenen ─────────────────────────────────────────────────────────
    socket.on("dice-result", ({ d1, d2 }) => {
      socket.to(myRoom).emit("dice-result", { d1, d2 });
    });

    socket.on("roll-start", () => {
      socket.to(myRoom).emit("roll-start");
    });

    socket.on("dice-staging", ({ indices }) => {
      socket.to(myRoom).emit("dice-staging", { indices });
    });

    // ── Game over ────────────────────────────────────────────────────────────
    socket.on("game-over", async ({ winnerName }) => {
      // Cancel turn timer als het spel gewoon klaar is
      if (myRoom && turnTimers.has(myRoom)) {
        clearTimeout(turnTimers.get(myRoom));
        turnTimers.delete(myRoom);
      }
      if (!myRoom || !pool) return;
      const room = rooms.get(myRoom);
      if (!room) return;

      const loserName = room.players.find((p) => p.name !== winnerName)?.name;

      try {
        await pool.query(
          `UPDATE game_sessions SET status='finished', winner_name=$1, finished_at=NOW() WHERE room_id=$2`,
          [winnerName, myRoom],
        );

        // Winner
        await pool.query(`
          INSERT INTO leaderboard (player_name, wins, games_played)
          VALUES ($1, 1, 1)
          ON CONFLICT (player_name) DO UPDATE SET
            wins         = leaderboard.wins + 1,
            games_played = leaderboard.games_played + 1,
            updated_at   = NOW()
        `, [winnerName]);

        // Loser
        if (loserName) {
          await pool.query(`
            INSERT INTO leaderboard (player_name, wins, games_played)
            VALUES ($1, 0, 1)
            ON CONFLICT (player_name) DO UPDATE SET
              games_played = leaderboard.games_played + 1,
              updated_at   = NOW()
          `, [loserName]);
        }

        await updateElo(winnerName, loserName ?? null);
      } catch (e) {
        console.error("DB game-over fout:", e);
      }
    });

    // ── Leave room (vrijwillig verlaten vanuit lobby) ─────────────────────────
    socket.on("leave-room", async ({ roomId, playerName }, cb) => {
      const room = rooms.get(roomId);
      if (!room) return cb?.({ ok: false });

      // Alleen de maker (player1) mag de tafel sluiten vanuit de lobby
      const isOwner = room.players[0]?.name === playerName;
      if (!isOwner) return cb?.({ ok: false });

      rooms.delete(roomId);
      if (pool) {
        try {
          await pool.query(
            `UPDATE game_sessions SET status='abandoned', finished_at=NOW() WHERE room_id=$1`,
            [roomId],
          );
          // Strafpunt registreren
          await pool.query(`
            INSERT INTO leaderboard (player_name, wins, games_played, penalties)
            VALUES ($1, 0, 1, 1)
            ON CONFLICT (player_name) DO UPDATE SET
              games_played = leaderboard.games_played + 1,
              penalties    = leaderboard.penalties + 1,
              updated_at   = NOW()
          `, [playerName]);
        } catch (e) {
          console.error("DB leave-room fout:", e);
        }
      }
      io.emit("lobby-update");
      cb?.({ ok: true });
      console.log(`[room] ${playerName} verliet tafel ${roomId} (strafpunt)`);
    });

    // ── Room chat ────────────────────────────────────────────────────────────
    socket.on("room-chat-send", ({ message, name, roomId: clientRoomId }) => {
      const room = myRoom || clientRoomId;
      console.log("[chat-send] ontvangen — myRoom:", myRoom, "clientRoomId:", clientRoomId, "room:", room, "msg:", message?.trim()?.slice(0,30));
      if (!room || !message?.trim()) return;
      const msg = { user: name || "Speler", text: message.trim() };
      socket.to(room).emit("room-chat", msg);
      if (pool) pool.query(
        `INSERT INTO chat_messages (game_type, user_name, message, room_id) VALUES ($1, $2, $3, $4)`,
        [rooms.get(room)?.gameType ?? "unknown", name || "Speler", message.trim(), room]
      ).then(() => console.log("[chat-send] INSERT OK room:", room)).catch(e => console.error("[chat-send] INSERT fout:", e.message, e.detail));
    });

    socket.on("room-chat-history", ({ roomId: rid }, cb) => {
      console.log("[chat-history] gevraagd voor roomId:", rid, "pool:", !!pool);
      if (!pool) return cb([]);
      pool.query(
        `SELECT user_name, message FROM chat_messages WHERE room_id=$1 ORDER BY created_at ASC LIMIT 50`,
        [rid]
      ).then(({ rows }) => cb(rows.map(r => ({ user: r.user_name, text: r.message })))).catch((e) => {
        console.error("[socket] room-chat-history fout:", e.message, e.code);
        cb([]);
      });
    });

    // ── Resign ───────────────────────────────────────────────────────────────
    socket.on("resign", async () => {
      const room = rooms.get(myRoom);
      if (!room || myIndex < 0 || myIsSpectator) return;
      const winnerIdx  = 1 - myIndex;
      const winnerName = room.players[winnerIdx]?.name;
      const loserName  = room.players[myIndex]?.name;
      if (!winnerName) return;

      // Cancel turn timer zodat geen race met turn-timeout
      if (turnTimers.has(myRoom)) { clearTimeout(turnTimers.get(myRoom)); turnTimers.delete(myRoom); }

      io.to(myRoom).emit("turn-forfeit", { loserIndex: myIndex, winnerName });
      rooms.delete(myRoom);

      if (pool) {
        await pool.query(
          `UPDATE game_sessions SET status='finished', winner_name=$1, finished_at=NOW(), turn_deadline=NULL WHERE room_id=$2`,
          [winnerName, myRoom],
        ).catch(console.error);
        await pool.query(`INSERT INTO leaderboard (player_name, wins, games_played) VALUES ($1,1,1) ON CONFLICT (player_name) DO UPDATE SET wins=leaderboard.wins+1, games_played=leaderboard.games_played+1, updated_at=NOW()`, [winnerName]).catch(console.error);
        if (loserName) await pool.query(`INSERT INTO leaderboard (player_name, wins, games_played) VALUES ($1,0,1) ON CONFLICT (player_name) DO UPDATE SET games_played=leaderboard.games_played+1, updated_at=NOW()`, [loserName]).catch(console.error);
        await updateElo(winnerName, loserName);
      }
      io.emit("lobby-update");
      console.log(`[room] RESIGN ${myRoom}: ${loserName} geeft op → ${winnerName} wint`);
    });

    // ── Rematch ──────────────────────────────────────────────────────────────
    socket.on("rematch-request", () => {
      const room = rooms.get(myRoom);
      if (!room || myIndex < 0) return;
      if (!room.rematchVotes) room.rematchVotes = new Set();
      room.rematchVotes.add(myIndex);
      socket.to(myRoom).emit("rematch-offer", { from: room.players[myIndex]?.name });

      if (room.rematchVotes.size >= 2) {
        // Reset game state for rematch
        room.gameState     = null;
        room.tiles         = null;
        room.currentPlayer = undefined;
        room.turnCount     = 0;
        room.rematchVotes  = new Set();
        if (turnTimers.has(myRoom)) { clearTimeout(turnTimers.get(myRoom)); turnTimers.delete(myRoom); }
        const names = room.players.map((p) => p.name);
        io.to(myRoom).emit("room-update", { players: names, ready: true, roomId: myRoom, gameMode: room.gameMode });
        if (pool) pool.query(
          `INSERT INTO game_sessions (room_id, game_type, game_mode, player1_name, player2_name, status) VALUES ($1,$2,$3,$4,$5,'active') ON CONFLICT DO NOTHING`,
          [myRoom + "-r" + Date.now(), room.gameType, room.gameMode, names[0], names[1]]
        ).catch(console.error);
        console.log(`[room] REMATCH ${myRoom}`);
      }
    });

    socket.on("rematch-decline", () => {
      socket.to(myRoom).emit("rematch-declined");
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`[socket] DISCONNECT ${socket.id} reden: ${reason} room: ${myRoom ?? "geen"}`);
      if (!myRoom) return;
      const room = rooms.get(myRoom);
      if (!room) return;

      // Mark player as disconnected (keep slot, just null the socketId)
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) player.socketId = null;

      // Remove spectator if this was one
      if (myIsSpectator && room.spectators) {
        room.spectators = room.spectators.filter((s) => s.socketId !== socket.id);
      }

      console.log(`[room] DISCONNECT socket ${socket.id} uit room ${myRoom} (speler "${player?.name ?? "?"}")`);

      if (room.players.every((p) => p.socketId === null)) {
        // All players gone — wait 15s before abandoning (covers hard refresh)
        const roomIdSnapshot = myRoom;
        console.log(`[room] START abandon timer ${roomIdSnapshot} (15s)`);
        const timer = setTimeout(() => {
          abandonTimers.delete(roomIdSnapshot);
          // Only abandon if still empty
          const r = rooms.get(roomIdSnapshot);
          if (r && r.players.every((p) => p.socketId === null)) {
            console.log(`[room] ABANDON ${roomIdSnapshot} (timer verlopen)`);
            rooms.delete(roomIdSnapshot);
            if (pool) {
              pool.query(
                `UPDATE game_sessions SET status='abandoned', finished_at=NOW() WHERE room_id=$1 AND status != 'finished'`,
                [roomIdSnapshot],
              ).catch(console.error);
            }
            io.emit("lobby-update");
          } else {
            console.log(`[room] ABANDON afgebroken ${roomIdSnapshot} (speler reconnectede)`);
          }
        }, 15000);
        abandonTimers.set(roomIdSnapshot, timer);
      } else {
        socket.to(myRoom).emit("player-disconnected", {
          name: player?.name ?? "Speler",
        });
      }
    });
  });

  // Stale session cleanup: elke uur, markeer waiting/active sessies ouder dan 24u als abandoned
  setInterval(async () => {
    if (!pool) return;
    try {
      const { rowCount } = await pool.query(
        `UPDATE game_sessions SET status='abandoned', finished_at=NOW()
         WHERE status IN ('waiting','active') AND started_at < NOW() - INTERVAL '24 hours'`
      );
      if (rowCount > 0) console.log(`[cleanup] ${rowCount} verlopen sessie(s) op abandoned gezet`);
    } catch (e) {
      console.error("[cleanup] ❌ fout:", e.message);
    }
  }, 60 * 60 * 1000);

  // Slow-mode poller: elke 60s controleren of beurten verlopen zijn
  setInterval(async () => {
    if (!pool) return;
    try {
      const { rows } = await pool.query(
        `SELECT room_id FROM game_sessions WHERE status='active' AND game_mode='slow' AND turn_deadline < NOW()`,
      );
      for (const row of rows) {
        const room = rooms.get(row.room_id);
        if (room) await autoForfeit(row.room_id, room, io);
      }
    } catch (e) {
      console.error("[slow-poller] ❌ fout:", e.message, e.code);
    }
  }, 60 * 1000);

  await restoreFastTimers(io);

  httpServer.listen(port, () => {
    console.log(`\n  ✦ Ludus  →  http://localhost:${port}\n`);
  });
});

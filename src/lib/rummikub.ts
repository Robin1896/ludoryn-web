// ─────────────────────────────────────────────────────────────────────────────
// Rummikub — tile-rummy game logic
// ─────────────────────────────────────────────────────────────────────────────

export type TileColor = 'red' | 'blue' | 'yellow' | 'black';

export interface Tile {
  id: string;
  color: TileColor | 'joker';
  num: number;      // 1-13 for normal, 0 for joker
  isJoker: boolean;
}

export type Group = Tile[];

export interface Player {
  name: string;
  rack: Tile[];
  hasInitialMeld: boolean;
  isAI: boolean;
}

export interface GameState {
  players: Player[];
  pool: Tile[];
  board: Group[];
  currentPlayer: number;
  phase: 'playing' | 'gameover';
  winner: number | null;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deck
// ─────────────────────────────────────────────────────────────────────────────

let _tileId = 0;
function makeTile(color: TileColor | 'joker', num: number): Tile {
  return { id: `t${_tileId++}`, color, num, isJoker: color === 'joker' };
}

function buildPool(): Tile[] {
  const tiles: Tile[] = [];
  const COLORS: TileColor[] = ['red', 'blue', 'yellow', 'black'];
  for (let copy = 0; copy < 2; copy++) {
    for (const color of COLORS) {
      for (let n = 1; n <= 13; n++) tiles.push(makeTile(color, n));
    }
  }
  tiles.push(makeTile('joker', 0));
  tiles.push(makeTile('joker', 0));
  // Fisher-Yates shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A valid run: same color, 3+ consecutive numbers, jokers fill gaps/extend.
 * Uses the "valid starting position" approach for correctness.
 */
export function isRun(group: Tile[]): boolean {
  if (group.length < 3) return false;
  const nonJokers = group.filter(t => !t.isJoker);
  if (nonJokers.length === 0) return false;

  const color = nonJokers[0].color;
  if (!nonJokers.every(t => t.color === color)) return false;

  const nums = nonJokers.map(t => t.num).sort((a, b) => a - b);
  if (new Set(nums).size !== nums.length) return false; // duplicate numbers

  const N = group.length;
  const minN = nums[0], maxN = nums[nums.length - 1];

  if (maxN - minN >= N) return false; // spread too wide for N tiles

  // There must exist a valid start s: 1 ≤ s, s+N-1 ≤ 13, s ≤ minN, s ≥ maxN-N+1
  const sMin = Math.max(1, maxN - N + 1);
  const sMax = Math.min(14 - N, minN);
  return sMin <= sMax;
}

/**
 * A valid set: same number, 3-4 tiles, all different colors, jokers allowed.
 */
export function isSet(group: Tile[]): boolean {
  if (group.length < 3 || group.length > 4) return false;
  const nonJokers = group.filter(t => !t.isJoker);
  if (nonJokers.length === 0) return false;

  const num = nonJokers[0].num;
  if (!nonJokers.every(t => t.num === num)) return false;

  const colors = nonJokers.map(t => t.color);
  if (new Set(colors).size !== colors.length) return false; // duplicate colors

  return true;
}

export function isValidGroup(group: Tile[]): boolean {
  if (group.length < 3) return false;
  return isSet(group) || isRun(group);
}

export function validateBoard(board: Group[]): boolean {
  return board.every(g => isValidGroup(g));
}

// Value of non-joker tiles in a group (for initial meld check)
export function groupValue(group: Tile[]): number {
  return group.filter(t => !t.isJoker).reduce((s, t) => s + t.num, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// New game
// ─────────────────────────────────────────────────────────────────────────────

export function newGame(names: string[], aiFlags: boolean[]): GameState {
  const pool = buildPool();
  const players: Player[] = names.map((name, i) => {
    const rack: Tile[] = [];
    for (let j = 0; j < 14; j++) rack.push(pool.pop()!);
    return { name, rack, hasInitialMeld: false, isAI: aiFlags[i] ?? false };
  });
  return {
    players,
    pool,
    board: [],
    currentPlayer: 0,
    phase: 'playing',
    winner: null,
    message: `${names[0]} begint!`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn actions
// ─────────────────────────────────────────────────────────────────────────────

export function drawTile(gs: GameState): GameState {
  if (gs.pool.length === 0) {
    // No tiles left — skip turn
    return advanceTurn(gs);
  }
  const pool = [...gs.pool];
  const tile = pool.pop()!;
  const players = gs.players.map((p, i) =>
    i === gs.currentPlayer ? { ...p, rack: [...p.rack, tile] } : p
  );
  return advanceTurn({ ...gs, pool, players });
}

export function commitTurn(
  gs: GameState,
  newBoard: Group[],
  newRack: Tile[],
  initialMeld: boolean,
): GameState {
  const players = gs.players.map((p, i) =>
    i === gs.currentPlayer
      ? { ...p, rack: newRack, hasInitialMeld: p.hasInitialMeld || initialMeld }
      : p
  );

  // Win check
  if (players[gs.currentPlayer].rack.length === 0) {
    return {
      ...gs,
      players,
      board: newBoard,
      phase: 'gameover',
      winner: gs.currentPlayer,
      message: `${gs.players[gs.currentPlayer].name} wint! Rack leeg!`,
    };
  }

  return advanceTurn({ ...gs, players, board: newBoard });
}

function advanceTurn(gs: GameState): GameState {
  const next = (gs.currentPlayer + 1) % gs.players.length;
  return {
    ...gs,
    currentPlayer: next,
    message: `${gs.players[next].name} is aan de beurt.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

function findGroupsFromRack(rack: Tile[]): Group[] {
  const result: Group[] = [];
  const used = new Set<string>();

  // Find sets (group by number, take 3-4 different colors)
  const byNum = new Map<number, Tile[]>();
  for (const t of rack) {
    if (t.isJoker) continue;
    byNum.set(t.num, [...(byNum.get(t.num) ?? []), t]);
  }
  for (const [, tiles] of byNum) {
    if (tiles.length >= 3) {
      // Pick best combination (max 4, all different colors)
      const picked: Tile[] = [];
      const usedColors = new Set<string>();
      for (const t of tiles) {
        if (picked.length >= 4) break;
        if (!usedColors.has(t.color) && !used.has(t.id)) {
          picked.push(t);
          usedColors.add(t.color);
        }
      }
      if (picked.length >= 3) {
        result.push(picked);
        picked.forEach(t => used.add(t.id));
      }
    }
  }

  // Find runs (group by color, find consecutive sequences)
  const byColor = new Map<string, Tile[]>();
  for (const t of rack) {
    if (t.isJoker || used.has(t.id)) continue;
    byColor.set(t.color, [...(byColor.get(t.color) ?? []), t]);
  }
  for (const [, tiles] of byColor) {
    const sorted = [...tiles].sort((a, b) => a.num - b.num);
    let run: Tile[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].num === run[run.length - 1].num + 1) {
        run.push(sorted[i]);
      } else {
        if (run.length >= 3) {
          result.push([...run]);
          run.forEach(t => used.add(t.id));
        }
        run = [sorted[i]];
      }
    }
    if (run.length >= 3) {
      result.push([...run]);
      run.forEach(t => used.add(t.id));
    }
  }

  return result;
}

function findInitialMeld(rack: Tile[]): Group[] | null {
  const all = findGroupsFromRack(rack);
  if (all.length === 0) return null;

  // Try single group ≥ 30
  for (const g of all) {
    if (groupValue(g) >= 30) return [g];
  }

  // Try pairs
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const idsI = new Set(all[i].map(t => t.id));
      if (all[j].some(t => idsI.has(t.id))) continue;
      if (groupValue(all[i]) + groupValue(all[j]) >= 30) return [all[i], all[j]];
    }
  }

  // Try triples
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      for (let k = j + 1; k < all.length; k++) {
        const tiles = [...all[i], ...all[j], ...all[k]];
        const ids = tiles.map(t => t.id);
        if (new Set(ids).size !== ids.length) continue;
        if (groupValue(all[i]) + groupValue(all[j]) + groupValue(all[k]) >= 30) {
          return [all[i], all[j], all[k]];
        }
      }
    }
  }

  return null;
}

function tryExtendBoardGroups(gs: GameState, currentRack: Tile[]): { board: Group[]; rack: Tile[] } | null {
  let board = gs.board.map(g => [...g]);
  let rack = [...currentRack];
  let improved = true;

  while (improved) {
    improved = false;
    for (let gi = 0; gi < board.length; gi++) {
      for (let ti = rack.length - 1; ti >= 0; ti--) {
        const tile = rack[ti];
        const tryEnd = [...board[gi], tile];
        const tryStart = [tile, ...board[gi]];
        if (isValidGroup(tryEnd)) {
          board[gi] = tryEnd;
          rack = rack.filter((_, i) => i !== ti);
          improved = true;
          break;
        } else if (isValidGroup(tryStart)) {
          board[gi] = tryStart;
          rack = rack.filter((_, i) => i !== ti);
          improved = true;
          break;
        }
      }
    }
  }

  const played = currentRack.length - rack.length;
  if (played === 0) return null;
  return { board, rack };
}

export function aiDecide(gs: GameState): GameState {
  const player = gs.players[gs.currentPlayer];

  if (!player.hasInitialMeld) {
    const meld = findInitialMeld(player.rack);
    if (!meld) return drawTile(gs);
    const usedIds = new Set(meld.flatMap(g => g.map(t => t.id)));
    const newRack = player.rack.filter(t => !usedIds.has(t.id));
    const newBoard = [...gs.board, ...meld];
    return commitTurn(gs, newBoard, newRack, true);
  }

  // Try to play groups from rack
  const newGroups = findGroupsFromRack(player.rack);
  if (newGroups.length > 0) {
    const usedIds = new Set(newGroups.flatMap(g => g.map(t => t.id)));
    const rackAfter = player.rack.filter(t => !usedIds.has(t.id));
    const boardAfter = [...gs.board, ...newGroups];

    // Also try to extend board groups with remaining tiles
    const tempGs = { ...gs, board: boardAfter, players: gs.players.map((p, i) =>
      i === gs.currentPlayer ? { ...p, rack: rackAfter } : p
    )};
    const extended = tryExtendBoardGroups(tempGs, rackAfter);
    if (extended) {
      return commitTurn(gs, extended.board, extended.rack, false);
    }
    return commitTurn(gs, boardAfter, rackAfter, false);
  }

  // Try extending board groups only
  const extended = tryExtendBoardGroups(gs, player.rack);
  if (extended) {
    return commitTurn(gs, extended.board, extended.rack, false);
  }

  return drawTile(gs);
}

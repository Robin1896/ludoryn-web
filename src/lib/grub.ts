// ─────────────────────────────────────────────────────────────────────────────
// Grub — Pure Game Logic
// ─────────────────────────────────────────────────────────────────────────────

export type DiceFace = 1 | 2 | 3 | 4 | 5 | 'W';

export interface Tile {
  value: number;
  worms: number;
  available: boolean; // false = flipped/removed from game
}

export interface Player {
  name: string;
  stack: Tile[]; // top tile = last in array
}

export interface Turn {
  rolled: DiceFace[];    // current roll (uncommitted)
  kept: DiceFace[];      // all kept dice this turn
  usedFaces: DiceFace[]; // faces already chosen (cannot re-pick)
  total: number;
  hasWorm: boolean;
  diceLeft: number;
}

export type Phase = 'idle' | 'rolled' | 'bust' | 'gameover';

export interface GameState {
  tiles: Tile[];
  players: Player[];
  currentPlayer: number;
  turn: Turn;
  phase: Phase;
  log: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function wormsFor(value: number): number {
  if (value <= 24) return 1;
  if (value <= 28) return 2;
  if (value <= 32) return 3;
  return 4;
}

export function totalWorms(player: Player): number {
  return player.stack.reduce((sum, t) => sum + t.worms, 0);
}

function faceValue(face: DiceFace): number {
  return face === 'W' ? 5 : face;
}

function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let v = 21; v <= 36; v++) {
    tiles.push({ value: v, worms: wormsFor(v), available: true });
  }
  return tiles;
}

function emptyTurn(): Turn {
  return {
    rolled: [],
    kept: [],
    usedFaces: [],
    total: 0,
    hasWorm: false,
    diceLeft: 8,
  };
}

function addToLog(gs: GameState, msg: string): GameState {
  return { ...gs, log: [...gs.log.slice(-9), msg] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core functions
// ─────────────────────────────────────────────────────────────────────────────

export function newGame(names: string[]): GameState {
  return {
    tiles: buildTiles(),
    players: names.map((name) => ({ name, stack: [] })),
    currentPlayer: 0,
    turn: emptyTurn(),
    phase: 'idle',
    log: [`${names[0]} begint!`],
  };
}

export function rollN(n: number): DiceFace[] {
  const faces: DiceFace[] = [1, 2, 3, 4, 5, 'W'];
  const result: DiceFace[] = [];
  for (let i = 0; i < n; i++) {
    result.push(faces[Math.floor(Math.random() * 6)]);
  }
  return result;
}

export function pickFace(face: DiceFace, turn: Turn): Turn {
  // Count how many dice in rolled show this face
  const picked = turn.rolled.filter((f) => f === face);
  const addedValue = picked.length * faceValue(face);
  const newKept = [...turn.kept, ...picked];
  const remaining = turn.rolled.filter((f) => f !== face);
  const newUsed = [...turn.usedFaces, face];
  const newTotal = turn.total + addedValue;
  const newHasWorm = turn.hasWorm || face === 'W';

  return {
    rolled: remaining,
    kept: newKept,
    usedFaces: newUsed,
    total: newTotal,
    hasWorm: newHasWorm,
    diceLeft: 8 - newKept.length,
  };
}

/**
 * After a roll: bust if every distinct face in `rolled` is already in `usedFaces`.
 * If rolled is empty (all dice are kept), NOT an immediate bust.
 */
export function isBust(turn: Turn): boolean {
  if (turn.rolled.length === 0) return false;
  const distinctRolled = [...new Set(turn.rolled)];
  return distinctRolled.every((f) => turn.usedFaces.includes(f));
}

/**
 * Returns claim info if the player can legally stop.
 * Conditions: hasWorm + total >= 21 + a tile exists to take.
 */
export function canClaim(gs: GameState): { type: 'center' | 'steal'; targetPlayer?: number; tile: Tile } | null {
  const { turn, tiles, players, currentPlayer } = gs;
  if (!turn.hasWorm || turn.total < 21) return null;

  // Check steal: opponent's top tile exactly matches total
  for (let i = 0; i < players.length; i++) {
    if (i === currentPlayer) continue;
    const p = players[i];
    if (p.stack.length === 0) continue;
    const top = p.stack[p.stack.length - 1];
    if (top.value === turn.total) {
      return { type: 'steal', targetPlayer: i, tile: top };
    }
  }

  // "30-rule": if player already owns a tile with the exact total value,
  // they must take the best available center tile (which will be lower).
  // Also exclude any tiles already in current player's stack as a state guard.
  const cpOwnedValues = new Set(players[currentPlayer].stack.map((t) => t.value));
  const available = tiles.filter((t) => t.available && t.value <= turn.total && !cpOwnedValues.has(t.value));
  if (available.length === 0) return null;
  const best = available.reduce((prev, cur) => (cur.value > prev.value ? cur : prev));
  return { type: 'center', tile: best };
}

export function performClaim(gs: GameState): GameState {
  const claim = canClaim(gs);
  if (!claim) return gs;

  let newGs = { ...gs };
  const cp = gs.currentPlayer;
  const playerName = gs.players[cp].name;

  if (claim.type === 'steal' && claim.targetPlayer !== undefined) {
    // Remove top tile from target player
    const targetIdx = claim.targetPlayer;
    const targetPlayer = { ...gs.players[targetIdx] };
    const stolenTile = targetPlayer.stack[targetPlayer.stack.length - 1];
    targetPlayer.stack = targetPlayer.stack.slice(0, -1);

    // Add to current player
    const currentPlayerObj = { ...gs.players[cp] };
    currentPlayerObj.stack = [...currentPlayerObj.stack, stolenTile];

    const newPlayers = [...gs.players];
    newPlayers[targetIdx] = targetPlayer;
    newPlayers[cp] = currentPlayerObj;

    newGs = addToLog(newGs, `${playerName} steelt tegel ${stolenTile.value} van ${gs.players[targetIdx].name}!`);
    newGs.players = newPlayers;
  } else {
    // Take from center
    const tile = claim.tile;
    const newTiles = gs.tiles.map((t) => (t.value === tile.value ? { ...t, available: false } : t));
    const currentPlayerObj = { ...gs.players[cp] };
    currentPlayerObj.stack = [...currentPlayerObj.stack, { ...tile }];

    const newPlayers = [...gs.players];
    newPlayers[cp] = currentPlayerObj;

    newGs = addToLog(newGs, `${playerName} neemt tegel ${tile.value} (${tile.worms} 🐛)`);
    newGs.tiles = newTiles;
    newGs.players = newPlayers;
  }

  // Next player
  const nextPlayer = (cp + 1) % gs.players.length;
  newGs.currentPlayer = nextPlayer;
  newGs.turn = emptyTurn();

  // Check if game is over
  const availableTiles = newGs.tiles.filter((t) => t.available);
  if (availableTiles.length === 0) {
    newGs.phase = 'gameover';
    const winner = determineWinner(newGs.players);
    newGs = addToLog(newGs, `Spel voorbij! ${winner} wint!`);
  } else {
    newGs.phase = 'idle';
    newGs = addToLog(newGs, `${newGs.players[nextPlayer].name} is aan de beurt`);
  }

  return newGs;
}

export function performBust(gs: GameState): GameState {
  let newGs = { ...gs };
  const cp = gs.currentPlayer;
  const playerName = gs.players[cp].name;

  const currentPlayerObj = { ...gs.players[cp], stack: [...gs.players[cp].stack] };
  let newTiles = [...gs.tiles];

  let returnedValue: number | null = null;

  if (currentPlayerObj.stack.length > 0) {
    // Return top tile to center (face up / available)
    const returned = currentPlayerObj.stack[currentPlayerObj.stack.length - 1];
    returnedValue = returned.value;
    currentPlayerObj.stack = currentPlayerObj.stack.slice(0, -1);

    // Re-insert as available in center
    newTiles = newTiles.map((t) => (t.value === returned.value ? { ...t, available: true } : t));

    newGs = addToLog(newGs, `${playerName} heeft pech! Tegel ${returned.value} terug.`);
  } else {
    newGs = addToLog(newGs, `${playerName} heeft pech! Geen tegel om terug te leggen.`);
  }

  // Flip the highest available center tile (unless it IS the returned tile)
  const centerAvailable = newTiles.filter((t) => t.available);
  if (centerAvailable.length > 0) {
    const highest = centerAvailable.reduce((prev, cur) => (cur.value > prev.value ? cur : prev));

    if (returnedValue !== null && highest.value === returnedValue) {
      // The returned tile IS the highest — leave it face up, don't flip anything
    } else {
      // Flip the highest
      newTiles = newTiles.map((t) => (t.value === highest.value ? { ...t, available: false } : t));
      newGs = addToLog(newGs, `Tegel ${highest.value} uit het spel!`);
    }
  }

  // Update state
  const newPlayers = [...gs.players];
  newPlayers[cp] = currentPlayerObj;
  newGs.players = newPlayers;
  newGs.tiles = newTiles;

  // Check game over
  const stillAvailable = newGs.tiles.filter((t) => t.available);
  if (stillAvailable.length === 0) {
    newGs.phase = 'gameover';
    const winner = determineWinner(newGs.players);
    newGs = addToLog(newGs, `Spel voorbij! ${winner} wint!`);
    return newGs;
  }

  // Next player
  const nextPlayer = (cp + 1) % gs.players.length;
  newGs.currentPlayer = nextPlayer;
  newGs.turn = emptyTurn();
  newGs.phase = 'idle';
  newGs = addToLog(newGs, `${newGs.players[nextPlayer].name} is aan de beurt`);

  return newGs;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

/** Pick the face that maximises value this roll. Always picks W first if no worm yet. */
export function aiBestFace(turn: Turn): DiceFace | null {
  const available = Array.from(
    new Set(turn.rolled.filter((f) => !turn.usedFaces.includes(f)))
  ) as DiceFace[];
  if (available.length === 0) return null;

  // Must get a worm at some point — prioritise W if not yet secured
  if (!turn.hasWorm && available.includes('W')) return 'W';

  // Pick the face that gives the highest total value (count × face-value)
  let best: DiceFace = available[0];
  let bestScore = -1;
  for (const face of available) {
    const count = turn.rolled.filter((f) => f === face).length;
    const value = face === 'W' ? 5 : (face as number);
    const score = count * value;
    if (score > bestScore) { bestScore = score; best = face; }
  }
  return best;
}

/** Returns true when the AI should stop and claim rather than roll again. */
export function aiShouldClaim(gs: GameState): boolean {
  const claim = canClaim(gs);
  if (!claim) return false;
  if (gs.turn.diceLeft <= 2) return true;   // too risky to continue
  if (claim.type === 'steal') return true;   // always steal
  if (claim.tile.value >= 27) return true;   // decent tile
  return false;
}

export function determineWinner(players: Player[]): string {
  let best = players[0];
  for (const p of players) {
    const pw = totalWorms(p);
    const bw = totalWorms(best);
    if (pw > bw) {
      best = p;
    } else if (pw === bw) {
      // Tiebreak: highest tile value
      const pTop = p.stack.length > 0 ? p.stack[p.stack.length - 1].value : 0;
      const bTop = best.stack.length > 0 ? best.stack[best.stack.length - 1].value : 0;
      if (pTop > bTop) best = p;
    }
  }
  return best.name;
}

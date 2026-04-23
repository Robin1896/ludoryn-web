// ─────────────────────────────────────────────────────────────────────────────
// Carcassonne — Pure Game Logic
// ─────────────────────────────────────────────────────────────────────────────

export type EdgeType = 'C' | 'R' | 'F'; // City, Road, Field
export type CenterType = 'C' | 'R' | 'F' | 'K'; // K = Klooster/Cloister
export type MeepleFeature = 0 | 1 | 2 | 3 | 'K'; // edge dir or cloister

export interface TileDef {
  id: string;
  edges: [EdgeType, EdgeType, EdgeType, EdgeType]; // N, E, S, W
  center: CenterType;
  shield: boolean;
  sameFeature: number[][]; // groups of original edge indices connected internally
}

export interface PlacedTile {
  defId: string;
  rotation: 0 | 1 | 2 | 3;
  meeple: { player: number; feature: MeepleFeature } | null;
}

export type Board = Record<string, PlacedTile>; // "bx,by" → tile

export interface Player {
  name: string;
  score: number;
  meeplesLeft: number;
}

export type GamePhase = 'place_tile' | 'place_meeple' | 'gameover';

export interface GameState {
  board: Board;
  deck: string[]; // tile def IDs remaining
  currentTile: string | null;
  currentRotation: 0 | 1 | 2 | 3;
  players: Player[];
  currentPlayer: number;
  phase: GamePhase;
  lastPlaced: string | null;
  log: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile definitions
// ─────────────────────────────────────────────────────────────────────────────

const DEFS_LIST: TileDef[] = [
  // Starting tile: N=city, E=field, S=road, W=field
  { id: 'start',    edges: ['C','F','R','F'], center: 'R', shield: false, sameFeature: [] },
  // City tiles
  { id: 'c1',       edges: ['C','F','F','F'], center: 'F', shield: false, sameFeature: [] },
  { id: 'c1r',      edges: ['C','R','F','R'], center: 'R', shield: false, sameFeature: [[1,3]] },
  { id: 'c2adj',    edges: ['C','C','F','F'], center: 'C', shield: false, sameFeature: [[0,1]] },
  { id: 'c2adjs',   edges: ['C','C','F','F'], center: 'C', shield: true,  sameFeature: [[0,1]] },
  { id: 'c2opp',    edges: ['C','F','C','F'], center: 'F', shield: false, sameFeature: [[0,2]] },
  { id: 'c3',       edges: ['C','C','F','C'], center: 'C', shield: false, sameFeature: [[0,1,3]] },
  { id: 'c3s',      edges: ['C','C','F','C'], center: 'C', shield: true,  sameFeature: [[0,1,3]] },
  { id: 'c3r',      edges: ['C','C','R','C'], center: 'C', shield: false, sameFeature: [[0,1,3]] },
  { id: 'c4',       edges: ['C','C','C','C'], center: 'C', shield: false, sameFeature: [[0,1,2,3]] },
  { id: 'c4s',      edges: ['C','C','C','C'], center: 'C', shield: true,  sameFeature: [[0,1,2,3]] },
  // Road tiles
  { id: 'rs',       edges: ['R','F','R','F'], center: 'R', shield: false, sameFeature: [[0,2]] },
  { id: 'rne',      edges: ['R','R','F','F'], center: 'R', shield: false, sameFeature: [[0,1]] },
  { id: 'res',      edges: ['F','R','R','F'], center: 'R', shield: false, sameFeature: [[1,2]] },
  { id: 'rsw',      edges: ['F','F','R','R'], center: 'R', shield: false, sameFeature: [[2,3]] },
  { id: 'rnw',      edges: ['R','F','F','R'], center: 'R', shield: false, sameFeature: [[0,3]] },
  { id: 'rt_esw',   edges: ['F','R','R','R'], center: 'R', shield: false, sameFeature: [] },
  { id: 'rt_nes',   edges: ['R','R','R','F'], center: 'R', shield: false, sameFeature: [] },
  { id: 'rx',       edges: ['R','R','R','R'], center: 'R', shield: false, sameFeature: [] },
  // Cloister tiles
  { id: 'kl',       edges: ['F','F','F','F'], center: 'K', shield: false, sameFeature: [] },
  { id: 'klr',      edges: ['F','F','R','F'], center: 'K', shield: false, sameFeature: [] },
];

export const TILE_DEFS: Record<string, TileDef> = {};
for (const d of DEFS_LIST) TILE_DEFS[d.id] = d;

// Deck quantities (start tile is pre-placed, not in deck)
const DECK_COUNTS: Record<string, number> = {
  c1: 4, c1r: 3,
  c2adj: 3, c2adjs: 1, c2opp: 2,
  c3: 2, c3s: 1, c3r: 1,
  c4: 1, c4s: 1,
  rs: 4, rne: 3, res: 2, rsw: 2, rnw: 1,
  rt_esw: 2, rt_nes: 1, rx: 1,
  kl: 2, klr: 1,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): string[] {
  const deck: string[] = [];
  for (const [id, count] of Object.entries(DECK_COUNTS)) {
    for (let i = 0; i < count; i++) deck.push(id);
  }
  return shuffle(deck);
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge helpers
// ─────────────────────────────────────────────────────────────────────────────

// After rotation r, placed direction d uses original edge (d - r + 4) % 4
export function getEdge(def: TileDef, rotation: number, dir: number): EdgeType {
  return def.edges[(dir - rotation + 4) % 4];
}

// Returns all placed-tile edge indices internally connected to `dir`
export function getConnectedEdges(def: TileDef, rotation: number, dir: number): number[] {
  const origDir = (dir - rotation + 4) % 4;
  for (const group of def.sameFeature) {
    if (group.includes(origDir)) {
      return group.map(i => (i + rotation) % 4);
    }
  }
  return [dir];
}

// Board coordinate neighbor offsets: [N, E, S, W]
const OFFSETS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function neighborOf(pos: string, dir: number): string {
  const [x, y] = pos.split(',').map(Number);
  const [dx, dy] = OFFSETS[dir];
  return `${x + dx},${y + dy}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature detection via BFS
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureInfo {
  type: EdgeType;
  tilePosSet: Set<string>;
  edgePairs: Array<[string, number]>; // [pos, dir]
  shieldCount: number;
  isComplete: boolean;
}

export function findFeature(board: Board, startPos: string, startDir: number): FeatureInfo {
  const placed = board[startPos];
  if (!placed) return { type: 'F', tilePosSet: new Set(), edgePairs: [], shieldCount: 0, isComplete: false };

  const def = TILE_DEFS[placed.defId];
  const featureType = getEdge(def, placed.rotation, startDir);

  const visited = new Set<string>();
  const queue: Array<[string, number]> = [[startPos, startDir]];
  const tilePosSet = new Set<string>();
  const edgePairs: Array<[string, number]> = [];
  let openEdges = 0;
  let shieldCount = 0;

  while (queue.length > 0) {
    const [pos, dir] = queue.shift()!;
    const key = `${pos}:${dir}`;
    if (visited.has(key)) continue;

    const curPlaced = board[pos];
    if (!curPlaced) {
      visited.add(key);
      openEdges++;
      continue;
    }

    const curDef = TILE_DEFS[curPlaced.defId];
    const edgeType = getEdge(curDef, curPlaced.rotation, dir);
    if (edgeType !== featureType) {
      visited.add(key);
      continue;
    }

    tilePosSet.add(pos);
    if (curDef.shield) shieldCount++;

    const connected = getConnectedEdges(curDef, curPlaced.rotation, dir);
    for (const e of connected) {
      const eKey = `${pos}:${e}`;
      if (visited.has(eKey)) continue;
      visited.add(eKey);
      edgePairs.push([pos, e]);

      const neighborPos = neighborOf(pos, e);
      const oppDir = (e + 2) % 4;
      const neighborKey = `${neighborPos}:${oppDir}`;

      if (!board[neighborPos]) {
        openEdges++;
      } else if (!visited.has(neighborKey)) {
        queue.push([neighborPos, oppDir]);
      }
    }
  }

  return { type: featureType, tilePosSet, edgePairs, shieldCount, isComplete: openEdges === 0 };
}

// Find meeples in a feature; returns { playerIndex: count }
export function findMeeples(board: Board, feature: FeatureInfo): Record<number, number> {
  const edgeSet = new Set(feature.edgePairs.map(([p, d]) => `${p}:${d}`));
  const counts: Record<number, number> = {};
  for (const pos of feature.tilePosSet) {
    const placed = board[pos];
    if (!placed?.meeple || placed.meeple.feature === 'K') continue;
    const mDir = placed.meeple.feature as number;
    if (edgeSet.has(`${pos}:${mDir}`)) {
      counts[placed.meeple.player] = (counts[placed.meeple.player] ?? 0) + 1;
    }
  }
  return counts;
}

export function featureHasMeeple(board: Board, pos: string, dir: number): boolean {
  const feature = findFeature(board, pos, dir);
  const m = findMeeples(board, feature);
  return Object.values(m).some(v => v > 0);
}

export function scoreFeature(feature: FeatureInfo, complete: boolean): number {
  if (feature.type === 'C') {
    return complete
      ? feature.tilePosSet.size * 2 + feature.shieldCount * 2
      : feature.tilePosSet.size + feature.shieldCount;
  }
  if (feature.type === 'R') return feature.tilePosSet.size;
  return 0;
}

function cloistersComplete(board: Board, pos: string): boolean {
  const [cx, cy] = pos.split(',').map(Number);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (!(dx === 0 && dy === 0) && !board[`${cx + dx},${cy + dy}`]) return false;
  return true;
}

export function cloisterScore(board: Board, pos: string): number {
  const [cx, cy] = pos.split(',').map(Number);
  let n = 1;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (!(dx === 0 && dy === 0) && board[`${cx + dx},${cy + dy}`]) n++;
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring after placement
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreAward {
  players: number[];
  points: number;
  reason: string;
  meeplePositions: string[];
}

export function processCompletions(board: Board, lastPos: string): ScoreAward[] {
  const awards: ScoreAward[] = [];
  const checkedFeatures = new Set<string>();
  const placed = board[lastPos];
  if (!placed) return awards;
  const def = TILE_DEFS[placed.defId];

  // Check edge features
  for (let dir = 0; dir < 4; dir++) {
    const edgeType = getEdge(def, placed.rotation, dir);
    if (edgeType === 'F') continue;
    const feature = findFeature(board, lastPos, dir);
    if (!feature.isComplete) continue;
    const fKey = [...feature.tilePosSet].sort().join('|') + ':' + feature.type;
    if (checkedFeatures.has(fKey)) continue;
    checkedFeatures.add(fKey);

    const meeples = findMeeples(board, feature);
    if (Object.keys(meeples).length === 0) continue;

    const maxC = Math.max(...Object.values(meeples));
    const winners = Object.keys(meeples).filter(k => meeples[+k] === maxC).map(Number);
    const pts = scoreFeature(feature, true);
    const meeplePositions = [...new Set(feature.edgePairs.map(([p]) => p))]
      .filter(p => board[p]?.meeple && board[p].meeple!.feature !== 'K');
    awards.push({ players: winners, points: pts, reason: feature.type === 'C' ? 'stad' : 'weg', meeplePositions });
  }

  // Check cloister at lastPos
  if (def.center === 'K' && cloistersComplete(board, lastPos)) {
    const p = board[lastPos];
    if (p?.meeple?.feature === 'K') {
      awards.push({ players: [p.meeple.player], points: 9, reason: 'klooster', meeplePositions: [lastPos] });
    }
  }

  // Check neighboring cloisters that might now be complete
  const [lx, ly] = lastPos.split(',').map(Number);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nPos = `${lx + dx},${ly + dy}`;
      const nb = board[nPos];
      if (!nb || TILE_DEFS[nb.defId].center !== 'K') continue;
      if (!nb.meeple || nb.meeple.feature !== 'K') continue;
      if (cloistersComplete(board, nPos)) {
        awards.push({ players: [nb.meeple.player], points: 9, reason: 'klooster', meeplePositions: [nPos] });
      }
    }
  }

  return awards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Placement validation
// ─────────────────────────────────────────────────────────────────────────────

export function isValidPlacement(board: Board, defId: string, rotation: number, bx: number, by: number): boolean {
  const pos = `${bx},${by}`;
  if (board[pos]) return false;
  const def = TILE_DEFS[defId];
  let hasNeighbor = false;
  for (let dir = 0; dir < 4; dir++) {
    const [dx, dy] = OFFSETS[dir];
    const nPos = `${bx + dx},${by + dy}`;
    const neighbor = board[nPos];
    if (!neighbor) continue;
    hasNeighbor = true;
    const nDef = TILE_DEFS[neighbor.defId];
    if (getEdge(def, rotation, dir) !== getEdge(nDef, neighbor.rotation, (dir + 2) % 4)) return false;
  }
  return hasNeighbor;
}

export function getValidPlacements(board: Board, defId: string): Array<{ bx: number; by: number; rotation: 0 | 1 | 2 | 3 }> {
  const results: Array<{ bx: number; by: number; rotation: 0 | 1 | 2 | 3 }> = [];
  const seen = new Set<string>();
  for (const pos of Object.keys(board)) {
    const [cx, cy] = pos.split(',').map(Number);
    for (let dir = 0; dir < 4; dir++) {
      const [dx, dy] = OFFSETS[dir];
      const bx = cx + dx; const by = cy + dy;
      const cellKey = `${bx},${by}`;
      if (board[cellKey] || seen.has(cellKey)) continue;
      seen.add(cellKey);
      for (let r = 0; r < 4; r++) {
        if (isValidPlacement(board, defId, r, bx, by)) {
          results.push({ bx, by, rotation: r as 0 | 1 | 2 | 3 });
        }
      }
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game actions
// ─────────────────────────────────────────────────────────────────────────────

export function newGame(player1: string, player2: string): GameState {
  const deck = buildDeck();
  return {
    board: { '0,0': { defId: 'start', rotation: 0, meeple: null } },
    deck,
    currentTile: deck[0],
    currentRotation: 0,
    players: [
      { name: player1, score: 0, meeplesLeft: 7 },
      { name: player2, score: 0, meeplesLeft: 7 },
    ],
    currentPlayer: 0,
    phase: 'place_tile',
    lastPlaced: null,
    log: [`Spel begonnen! ${player1} begint.`],
  };
}

export function rotateTile(gs: GameState): GameState {
  return { ...gs, currentRotation: ((gs.currentRotation + 1) % 4) as 0 | 1 | 2 | 3 };
}

export function placeTile(gs: GameState, bx: number, by: number): GameState {
  if (gs.phase !== 'place_tile' || !gs.currentTile) return gs;
  const pos = `${bx},${by}`;
  if (!isValidPlacement(gs.board, gs.currentTile, gs.currentRotation, bx, by)) return gs;

  const newBoard: Board = {
    ...gs.board,
    [pos]: { defId: gs.currentTile, rotation: gs.currentRotation, meeple: null },
  };

  const awards = processCompletions(newBoard, pos);
  const newPlayers = gs.players.map(p => ({ ...p }));
  const removedPositions = new Set<string>();

  for (const award of awards) {
    for (const pid of award.players) newPlayers[pid].score += award.points;
    for (const mPos of award.meeplePositions) {
      if (removedPositions.has(mPos)) continue;
      removedPositions.add(mPos);
      const owner = newBoard[mPos]?.meeple?.player;
      if (owner !== undefined) {
        newPlayers[owner].meeplesLeft++;
        newBoard[mPos] = { ...newBoard[mPos], meeple: null };
      }
    }
  }

  const logLines = awards.map(a => {
    const names = a.players.map(i => gs.players[i].name).join(' & ');
    return `${names} scoort ${a.points}p (${a.reason})`;
  });

  const newDeck = gs.deck.slice(1);
  return {
    ...gs,
    board: newBoard,
    deck: newDeck,
    currentTile: newDeck[0] ?? null,
    currentRotation: 0,
    players: newPlayers,
    lastPlaced: pos,
    phase: 'place_meeple',
    log: [...gs.log, ...logLines],
  };
}

export function placeMeeple(gs: GameState, feature: MeepleFeature): GameState {
  if (gs.phase !== 'place_meeple' || !gs.lastPlaced) return gs;
  const player = gs.players[gs.currentPlayer];
  if (player.meeplesLeft <= 0) return passMeeple(gs);

  const pos = gs.lastPlaced;
  const placed = gs.board[pos];
  if (!placed) return gs;
  const def = TILE_DEFS[placed.defId];

  if (feature === 'K') {
    if (def.center !== 'K') return gs;
  } else {
    const edgeType = getEdge(def, placed.rotation, feature as number);
    if (edgeType === 'F') return gs;
    if (featureHasMeeple(gs.board, pos, feature as number)) return gs;
  }

  const newBoard: Board = {
    ...gs.board,
    [pos]: { ...placed, meeple: { player: gs.currentPlayer, feature } },
  };
  const newPlayers = gs.players.map((p, i) =>
    i === gs.currentPlayer ? { ...p, meeplesLeft: p.meeplesLeft - 1 } : { ...p }
  );
  return endTurn({ ...gs, board: newBoard, players: newPlayers });
}

export function passMeeple(gs: GameState): GameState {
  return endTurn(gs);
}

export function skipTile(gs: GameState): GameState {
  // Discard current tile when no valid placement
  const newDeck = gs.deck.slice(1);
  const nextTile = newDeck[0] ?? null;
  return {
    ...gs,
    deck: newDeck,
    currentTile: nextTile,
    currentRotation: 0,
    log: [...gs.log, `Tegel overgeslagen (geen geldige plaatsing).`],
  };
}

function endTurn(gs: GameState): GameState {
  if (!gs.currentTile) return computeFinalScore(gs);
  const next = 1 - gs.currentPlayer;
  return {
    ...gs,
    currentPlayer: next,
    phase: 'place_tile',
    log: [...gs.log, `${gs.players[next].name} is aan de beurt.`],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Final scoring
// ─────────────────────────────────────────────────────────────────────────────

function computeFinalScore(gs: GameState): GameState {
  const newPlayers = gs.players.map(p => ({ ...p }));
  const newBoard = { ...gs.board };
  const logLines: string[] = ['--- Eindstand ---'];
  const checkedFeatures = new Set<string>();

  for (const [pos, placed] of Object.entries(newBoard)) {
    if (!placed.meeple) continue;
    const mf = placed.meeple.feature;

    if (mf === 'K') {
      const score = cloisterScore(newBoard, pos);
      newPlayers[placed.meeple.player].score += score;
      logLines.push(`${gs.players[placed.meeple.player].name}: klooster +${score}`);
      newBoard[pos] = { ...placed, meeple: null };
      newPlayers[placed.meeple.player].meeplesLeft++;
    } else {
      const edgeDir = mf as number;
      const feature = findFeature(newBoard, pos, edgeDir);
      const fKey = [...feature.tilePosSet].sort().join('|') + ':' + feature.type;
      if (checkedFeatures.has(fKey)) continue;
      checkedFeatures.add(fKey);

      const meeples = findMeeples(newBoard, feature);
      if (Object.keys(meeples).length === 0) continue;
      const maxC = Math.max(...Object.values(meeples));
      const winners = Object.keys(meeples).filter(k => meeples[+k] === maxC).map(Number);
      const score = scoreFeature(feature, false);

      for (const pid of winners) newPlayers[pid].score += score;
      const names = winners.map(i => gs.players[i].name).join(' & ');
      const t = feature.type === 'C' ? 'stad' : 'weg';
      logLines.push(`${names}: onvolledige ${t} +${score}`);

      for (const [fpos] of feature.edgePairs) {
        const fp = newBoard[fpos];
        if (fp?.meeple && fp.meeple.feature !== 'K') {
          newPlayers[fp.meeple.player].meeplesLeft++;
          newBoard[fpos] = { ...fp, meeple: null };
        }
      }
    }
  }

  const [p0, p1] = newPlayers;
  if (p0.score === p1.score) logLines.push('Gelijkspel!');
  else logLines.push(`${p0.score > p1.score ? p0.name : p1.name} wint!`);

  return { ...gs, board: newBoard, players: newPlayers, phase: 'gameover', log: [...gs.log, ...logLines] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Player colors
// ─────────────────────────────────────────────────────────────────────────────

export const PLAYER_COLORS = ['#E53935', '#1565C0'];

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

export function aiDecide(gs: GameState): GameState {
  if (!gs.currentTile) return gs;
  const placements = getValidPlacements(gs.board, gs.currentTile);

  if (placements.length === 0) return skipTile(gs);

  const aiPlayer = gs.currentPlayer;
  let bestPlacement = placements[0];
  let bestScore = -Infinity;

  for (const pl of placements) {
    const testBoard: Board = {
      ...gs.board,
      [`${pl.bx},${pl.by}`]: { defId: gs.currentTile!, rotation: pl.rotation, meeple: null },
    };
    const awards = processCompletions(testBoard, `${pl.bx},${pl.by}`);
    let score = 0;
    for (const award of awards) {
      if (award.players.includes(aiPlayer)) score += award.points;
      if (!award.players.includes(aiPlayer)) score -= award.points * 0.5;
    }
    score += Math.random() * 0.3;
    if (score > bestScore) { bestScore = score; bestPlacement = pl; }
  }

  let newGs = { ...gs, currentRotation: bestPlacement.rotation };
  newGs = placeTile(newGs, bestPlacement.bx, bestPlacement.by);

  if (newGs.phase === 'place_meeple') {
    const pos = newGs.lastPlaced!;
    const placed = newGs.board[pos];
    const def = TILE_DEFS[placed.defId];

    if (newGs.players[aiPlayer].meeplesLeft > 0) {
      let bestFeature: MeepleFeature | null = null;
      let bestFScore = 1; // only place if score > 1

      if (def.center === 'K') {
        const sc = cloisterScore(newGs.board, pos);
        if (sc > bestFScore) { bestFScore = sc; bestFeature = 'K'; }
      }

      for (let dir = 0; dir < 4; dir++) {
        const edgeType = getEdge(def, placed.rotation, dir);
        if (edgeType === 'F') continue;
        if (featureHasMeeple(newGs.board, pos, dir)) continue;
        const feature = findFeature(newGs.board, pos, dir);
        const sc = scoreFeature(feature, feature.isComplete);
        if (sc > bestFScore) { bestFScore = sc; bestFeature = dir as MeepleFeature; }
      }

      if (bestFeature !== null) {
        newGs = placeMeeple(newGs, bestFeature);
      } else {
        newGs = passMeeple(newGs);
      }
    } else {
      newGs = passMeeple(newGs);
    }
  }

  return newGs;
}

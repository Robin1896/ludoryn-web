// ─────────────────────────────────────────────────────────────────────────────
// Ticket to Ride — Pure Game Logic
// ─────────────────────────────────────────────────────────────────────────────

export type CardColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'black' | 'white' | 'wild';
export const CARD_COLORS: CardColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white'];

export const CARD_HEX: Record<CardColor, string> = {
  red:    '#E53935',
  orange: '#FB8C00',
  yellow: '#F4C430',
  green:  '#43A047',
  blue:   '#1E88E5',
  purple: '#8E24AA',
  black:  '#546E7A',
  white:  '#B0BEC5',
  wild:   '#FFD54F',
};

export const PLAYER_COLORS = ['#E8612A', '#2A8BE8'];

export interface City {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface Route {
  id: string;
  from: string;
  to: string;
  length: number;
  color: CardColor | 'gray';
  claimedBy: number | null;
}

export interface DestinationTicket {
  id: string;
  from: string;
  to: string;
  points: number;
}

export interface Player {
  name: string;
  hand: Record<CardColor, number>;
  tickets: DestinationTicket[];
  trainsLeft: number;
  routeScore: number; // accumulated from claiming routes
}

export type TurnPhase = 'idle' | 'drew_first' | 'picking_tickets';
export type GamePhase = 'playing' | 'final_round' | 'gameover';

export interface GameState {
  players: Player[];
  currentPlayer: number;
  phase: TurnPhase;
  gamePhase: GamePhase;
  finalRoundTrigger: number | null;
  finalRoundPlayed: number; // how many players have had their final turn
  faceUpCards: (CardColor | null)[];
  drawDeck: CardColor[];
  discardPile: CardColor[];
  routes: Route[];
  ticketDeck: DestinationTicket[];
  pendingTickets: DestinationTicket[] | null;
  finalScores: number[] | null;
  longestRouteHolder: number | null;
  log: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Map data
// ─────────────────────────────────────────────────────────────────────────────

export const CITIES: City[] = [
  { id: 'sea', name: 'Seattle',       x: 75,  y: 75  },
  { id: 'por', name: 'Portland',      x: 70,  y: 135 },
  { id: 'sf',  name: 'San Francisco', x: 55,  y: 228 },
  { id: 'la',  name: 'Los Angeles',   x: 88,  y: 328 },
  { id: 'lv',  name: 'Las Vegas',     x: 168, y: 272 },
  { id: 'phx', name: 'Phoenix',       x: 182, y: 355 },
  { id: 'den', name: 'Denver',        x: 265, y: 198 },
  { id: 'kc',  name: 'Kansas City',   x: 380, y: 235 },
  { id: 'dal', name: 'Dallas',        x: 342, y: 358 },
  { id: 'chi', name: 'Chicago',       x: 452, y: 155 },
  { id: 'stl', name: 'St. Louis',     x: 428, y: 245 },
  { id: 'nas', name: 'Nashville',     x: 464, y: 292 },
  { id: 'atl', name: 'Atlanta',       x: 482, y: 365 },
  { id: 'mia', name: 'Miami',         x: 524, y: 442 },
  { id: 'pit', name: 'Pittsburgh',    x: 534, y: 175 },
  { id: 'was', name: 'Washington',    x: 578, y: 225 },
  { id: 'nyc', name: 'New York',      x: 594, y: 155 },
];

export const INITIAL_ROUTES: Omit<Route, 'claimedBy'>[] = [
  { id: 'sea-por', from: 'sea', to: 'por', length: 1, color: 'gray'   },
  { id: 'sea-den', from: 'sea', to: 'den', length: 4, color: 'yellow' },
  { id: 'por-sf',  from: 'por', to: 'sf',  length: 5, color: 'green'  },
  { id: 'sf-la',   from: 'sf',  to: 'la',  length: 3, color: 'yellow' },
  { id: 'sf-lv',   from: 'sf',  to: 'lv',  length: 3, color: 'gray'   },
  { id: 'la-lv',   from: 'la',  to: 'lv',  length: 2, color: 'purple' },
  { id: 'la-phx',  from: 'la',  to: 'phx', length: 3, color: 'black'  },
  { id: 'la-dal',  from: 'la',  to: 'dal', length: 6, color: 'black'  },
  { id: 'lv-den',  from: 'lv',  to: 'den', length: 4, color: 'orange' },
  { id: 'phx-den', from: 'phx', to: 'den', length: 5, color: 'white'  },
  { id: 'phx-dal', from: 'phx', to: 'dal', length: 4, color: 'red'    },
  { id: 'den-kc',  from: 'den', to: 'kc',  length: 4, color: 'orange' },
  { id: 'den-stl', from: 'den', to: 'stl', length: 4, color: 'white'  },
  { id: 'dal-kc',  from: 'dal', to: 'kc',  length: 2, color: 'purple' },
  { id: 'dal-stl', from: 'dal', to: 'stl', length: 4, color: 'red'    },
  { id: 'dal-atl', from: 'dal', to: 'atl', length: 4, color: 'yellow' },
  { id: 'kc-chi',  from: 'kc',  to: 'chi', length: 3, color: 'blue'   },
  { id: 'kc-stl',  from: 'kc',  to: 'stl', length: 2, color: 'purple' },
  { id: 'chi-stl', from: 'chi', to: 'stl', length: 2, color: 'green'  },
  { id: 'chi-pit', from: 'chi', to: 'pit', length: 3, color: 'black'  },
  { id: 'stl-nas', from: 'stl', to: 'nas', length: 2, color: 'gray'   },
  { id: 'nas-atl', from: 'nas', to: 'atl', length: 1, color: 'gray'   },
  { id: 'nas-pit', from: 'nas', to: 'pit', length: 4, color: 'yellow' },
  { id: 'atl-mia', from: 'atl', to: 'mia', length: 5, color: 'blue'   },
  { id: 'pit-was', from: 'pit', to: 'was', length: 2, color: 'gray'   },
  { id: 'pit-nyc', from: 'pit', to: 'nyc', length: 2, color: 'white'  },
  { id: 'was-nyc', from: 'was', to: 'nyc', length: 2, color: 'orange' },
];

export const ALL_TICKETS: DestinationTicket[] = [
  { id: 't1',  from: 'sea', to: 'mia', points: 22 },
  { id: 't2',  from: 'la',  to: 'nyc', points: 21 },
  { id: 't3',  from: 'por', to: 'nas', points: 17 },
  { id: 't4',  from: 'sf',  to: 'atl', points: 17 },
  { id: 't5',  from: 'sea', to: 'was', points: 16 },
  { id: 't6',  from: 'la',  to: 'chi', points: 16 },
  { id: 't7',  from: 'por', to: 'pit', points: 13 },
  { id: 't8',  from: 'sf',  to: 'pit', points: 14 },
  { id: 't9',  from: 'den', to: 'chi', points: 10 },
  { id: 't10', from: 'dal', to: 'nyc', points: 11 },
  { id: 't11', from: 'lv',  to: 'atl', points: 15 },
  { id: 't12', from: 'phx', to: 'kc',  points: 9  },
  { id: 't13', from: 'den', to: 'mia', points: 14 },
  { id: 't14', from: 'chi', to: 'mia', points: 13 },
  { id: 't15', from: 'dal', to: 'was', points: 10 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function routePoints(length: number): number {
  const pts = [0, 1, 2, 4, 7, 10, 15];
  return pts[Math.min(length, 6)] ?? 15;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyHand(): Record<CardColor, number> {
  const hand: Record<string, number> = {};
  for (const c of [...CARD_COLORS, 'wild']) hand[c] = 0;
  return hand as Record<CardColor, number>;
}

export function totalCards(hand: Record<CardColor, number>): number {
  return Object.values(hand).reduce((s, v) => s + v, 0);
}

function buildDeck(): CardColor[] {
  const deck: CardColor[] = [];
  for (const c of CARD_COLORS) {
    for (let i = 0; i < 10; i++) deck.push(c);
  }
  for (let i = 0; i < 12; i++) deck.push('wild');
  return shuffle(deck);
}

function addLog(gs: GameState, msg: string): GameState {
  return { ...gs, log: [...gs.log.slice(-12), msg] };
}

function cityName(id: string): string {
  return CITIES.find(c => c.id === id)?.name ?? id;
}

// Draw from deck, reshuffle discard if needed
function drawFromDeckArr(deck: CardColor[], discard: CardColor[]): [CardColor | null, CardColor[], CardColor[]] {
  if (deck.length === 0) {
    if (discard.length === 0) return [null, [], []];
    const newDeck = shuffle([...discard]);
    const [card, ...rest] = newDeck;
    return [card, rest, []];
  }
  const [card, ...rest] = deck;
  return [card, rest, discard];
}

// Replace a face-up card
function replaceFaceUpCard(
  faceUp: (CardColor | null)[],
  idx: number,
  deck: CardColor[],
  discard: CardColor[]
): [(CardColor | null)[], CardColor[], CardColor[]] {
  const newFaceUp = [...faceUp];
  const [newCard, newDeck, newDiscard] = drawFromDeckArr(deck, discard);
  newFaceUp[idx] = newCard;
  return [newFaceUp, newDeck, newDiscard];
}

// ─────────────────────────────────────────────────────────────────────────────
// Connectivity (BFS)
// ─────────────────────────────────────────────────────────────────────────────

export function areConnected(routes: Route[], playerIdx: number, cityA: string, cityB: string): boolean {
  const adj: Record<string, string[]> = {};
  for (const r of routes) {
    if (r.claimedBy !== playerIdx) continue;
    (adj[r.from] ??= []).push(r.to);
    (adj[r.to] ??= []).push(r.from);
  }
  if (!adj[cityA]) return false;
  const visited = new Set<string>();
  const queue = [cityA];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === cityB) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const n of adj[curr] ?? []) if (!visited.has(n)) queue.push(n);
  }
  return false;
}

export function longestRoute(routes: Route[], playerIdx: number): number {
  // Build edge list with route lengths
  const edges: Record<string, Array<{ to: string; routeId: string; length: number }>> = {};
  for (const r of routes) {
    if (r.claimedBy !== playerIdx) continue;
    (edges[r.from] ??= []).push({ to: r.to, routeId: r.id, length: r.length });
    (edges[r.to] ??= []).push({ to: r.from, routeId: r.id, length: r.length });
  }

  let maxLen = 0;
  const cities = Object.keys(edges);

  function dfs(city: string, usedRoutes: Set<string>, pathLen: number) {
    maxLen = Math.max(maxLen, pathLen);
    for (const edge of edges[city] ?? []) {
      if (!usedRoutes.has(edge.routeId)) {
        usedRoutes.add(edge.routeId);
        dfs(edge.to, usedRoutes, pathLen + edge.length);
        usedRoutes.delete(edge.routeId);
      }
    }
  }

  for (const city of cities) dfs(city, new Set(), 0);
  return maxLen;
}

// ─────────────────────────────────────────────────────────────────────────────
// Can claim route?
// ─────────────────────────────────────────────────────────────────────────────

export interface ClaimOption {
  color: CardColor;
  wilds: number;
}

export function getClaimOptions(hand: Record<CardColor, number>, route: Route): ClaimOption[] {
  const wilds = hand.wild;
  const options: ClaimOption[] = [];

  const tryColor = (c: CardColor) => {
    const have = hand[c];
    const need = route.length;
    if (have >= need) options.push({ color: c, wilds: 0 });
    else if (have + wilds >= need) options.push({ color: c, wilds: need - have });
  };

  if (route.color === 'gray') {
    for (const c of CARD_COLORS) tryColor(c);
  } else {
    tryColor(route.color as CardColor);
  }

  return options;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core functions
// ─────────────────────────────────────────────────────────────────────────────

export function newGame(names: [string, string]): GameState {
  const deck = buildDeck();
  const tickets = shuffle([...ALL_TICKETS]);

  // Deal 4 cards to each player
  const hands: Record<CardColor, number>[] = [emptyHand(), emptyHand()];
  const remaining: CardColor[] = [...deck];
  for (let p = 0; p < 2; p++) {
    for (let i = 0; i < 4; i++) {
      const card = remaining.shift()!;
      hands[p][card]++;
    }
  }

  // Set up 5 face-up cards
  const faceUp: (CardColor | null)[] = [];
  for (let i = 0; i < 5; i++) {
    faceUp.push(remaining.shift() ?? null);
  }

  // Each player gets 3 destination ticket options to start (they'll pick in setup)
  // For simplicity, auto-assign 2 tickets each
  const playerTickets: DestinationTicket[][] = [[], []];
  const deckTickets = [...tickets];
  for (let p = 0; p < 2; p++) {
    playerTickets[p].push(deckTickets.shift()!);
    playerTickets[p].push(deckTickets.shift()!);
  }

  const players: Player[] = names.map((name, i) => ({
    name,
    hand: hands[i],
    tickets: playerTickets[i],
    trainsLeft: 45,
    routeScore: 0,
  }));

  return {
    players,
    currentPlayer: 0,
    phase: 'idle',
    gamePhase: 'playing',
    finalRoundTrigger: null,
    finalRoundPlayed: 0,
    faceUpCards: faceUp,
    drawDeck: remaining,
    discardPile: [],
    routes: INITIAL_ROUTES.map(r => ({ ...r, claimedBy: null })),
    ticketDeck: deckTickets,
    pendingTickets: null,
    finalScores: null,
    longestRouteHolder: null,
    log: [`${names[0]} begint!`],
  };
}

function advanceTurn(gs: GameState): GameState {
  const n = gs.players.length;
  const next = (gs.currentPlayer + 1) % n;
  let newGs = { ...gs, currentPlayer: next, phase: 'idle' as TurnPhase };

  if (gs.gamePhase === 'final_round') {
    const played = gs.finalRoundPlayed + 1;
    if (played >= n) {
      // Game over
      newGs = { ...newGs, finalRoundPlayed: played, gamePhase: 'gameover' };
      const scores = computeFinalScores(newGs);
      const longest = findLongestRouteHolder(newGs);
      const finalScores = scores.map((s, i) => s + (longest === i ? 10 : 0));
      const winner = gs.players[finalScores.indexOf(Math.max(...finalScores))].name;
      newGs = addLog(newGs, `Spel voorbij! ${winner} wint!`);
      newGs = { ...newGs, finalScores, longestRouteHolder: longest };
      return newGs;
    }
    newGs = { ...newGs, finalRoundPlayed: played };
  }

  newGs = addLog(newGs, `${newGs.players[next].name} is aan de beurt`);
  return newGs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export function drawFaceUpCard(gs: GameState, cardIdx: number): GameState {
  if (gs.phase !== 'idle' && gs.phase !== 'drew_first') return gs;
  if (gs.gamePhase !== 'playing' && gs.gamePhase !== 'final_round') return gs;

  const card = gs.faceUpCards[cardIdx];
  if (!card) return gs;

  const isSecondDraw = gs.phase === 'drew_first';
  // Wild from face-up on second draw is not allowed (rule)
  if (isSecondDraw && card === 'wild') return gs;

  const cp = gs.currentPlayer;
  const newHand = { ...gs.players[cp].hand, [card]: gs.players[cp].hand[card] + 1 };
  const newPlayers = [...gs.players];
  newPlayers[cp] = { ...gs.players[cp], hand: newHand };

  const [newFaceUp, newDeck, newDiscard] = replaceFaceUpCard(gs.faceUpCards, cardIdx, gs.drawDeck, gs.discardPile);

  let newGs: GameState = {
    ...gs,
    players: newPlayers,
    faceUpCards: newFaceUp,
    drawDeck: newDeck,
    discardPile: newDiscard,
  };

  // Wild from face-up counts as 2 draws, or this is the second draw
  if (card === 'wild' || isSecondDraw) {
    return advanceTurn(newGs);
  }
  return { ...newGs, phase: 'drew_first' };
}

export function drawFromDeck(gs: GameState): GameState {
  if (gs.phase !== 'idle' && gs.phase !== 'drew_first') return gs;
  if (gs.gamePhase !== 'playing' && gs.gamePhase !== 'final_round') return gs;

  const cp = gs.currentPlayer;
  const [card, newDeck, newDiscard] = drawFromDeckArr(gs.drawDeck, gs.discardPile);
  if (!card) return gs;

  const newHand = { ...gs.players[cp].hand, [card]: gs.players[cp].hand[card] + 1 };
  const newPlayers = [...gs.players];
  newPlayers[cp] = { ...gs.players[cp], hand: newHand };

  const newGs: GameState = {
    ...gs,
    players: newPlayers,
    drawDeck: newDeck,
    discardPile: newDiscard,
  };

  if (gs.phase === 'drew_first') {
    return advanceTurn(newGs);
  }
  return { ...newGs, phase: 'drew_first' };
}

export function claimRoute(gs: GameState, routeId: string, color: CardColor, wildsUsed: number): GameState {
  if (gs.phase !== 'idle') return gs;
  if (gs.gamePhase !== 'playing' && gs.gamePhase !== 'final_round') return gs;

  const routeIdx = gs.routes.findIndex(r => r.id === routeId);
  if (routeIdx === -1) return gs;
  const route = gs.routes[routeIdx];
  if (route.claimedBy !== null) return gs;

  const cp = gs.currentPlayer;
  const player = gs.players[cp];
  const regularCards = route.length - wildsUsed;

  // Validate
  if (player.hand[color] < regularCards) return gs;
  if (player.hand.wild < wildsUsed) return gs;

  const newHand = { ...player.hand };
  newHand[color] -= regularCards;
  newHand.wild -= wildsUsed;

  const pts = routePoints(route.length);
  const newTrainsLeft = player.trainsLeft - route.length;

  const newPlayer = { ...player, hand: newHand, trainsLeft: newTrainsLeft, routeScore: player.routeScore + pts };
  const newPlayers = [...gs.players];
  newPlayers[cp] = newPlayer;

  const newRoutes = [...gs.routes];
  newRoutes[routeIdx] = { ...route, claimedBy: cp };

  // Discard the cards used
  const discarded: CardColor[] = [];
  for (let i = 0; i < regularCards; i++) discarded.push(color);
  for (let i = 0; i < wildsUsed; i++) discarded.push('wild');
  const newDiscard = [...gs.discardPile, ...discarded];

  let newGs: GameState = {
    ...gs,
    players: newPlayers,
    routes: newRoutes,
    discardPile: newDiscard,
  };

  newGs = addLog(newGs, `${player.name} legt ${cityName(route.from)}–${cityName(route.to)} (${pts}pt)`);

  // Check for final round trigger
  if (newTrainsLeft <= 2 && gs.gamePhase === 'playing') {
    newGs = { ...newGs, gamePhase: 'final_round', finalRoundTrigger: cp };
    newGs = addLog(newGs, `${player.name} heeft nog ${newTrainsLeft} treinen! Laatste ronde!`);
  }

  return advanceTurn(newGs);
}

export function initiateDrawTickets(gs: GameState): GameState {
  if (gs.phase !== 'idle') return gs;
  if (gs.ticketDeck.length === 0) return gs;

  const draw = Math.min(3, gs.ticketDeck.length);
  const pending = gs.ticketDeck.slice(0, draw);
  const newDeck = gs.ticketDeck.slice(draw);

  return { ...gs, phase: 'picking_tickets', pendingTickets: pending, ticketDeck: newDeck };
}

export function keepTickets(gs: GameState, keptIds: string[]): GameState {
  if (gs.phase !== 'picking_tickets' || !gs.pendingTickets) return gs;
  if (keptIds.length === 0) return gs; // must keep at least 1

  const cp = gs.currentPlayer;
  const kept = gs.pendingTickets.filter(t => keptIds.includes(t.id));
  const returned = gs.pendingTickets.filter(t => !keptIds.includes(t.id));

  const newPlayer = { ...gs.players[cp], tickets: [...gs.players[cp].tickets, ...kept] };
  const newPlayers = [...gs.players];
  newPlayers[cp] = newPlayer;

  const newTicketDeck = shuffle([...gs.ticketDeck, ...returned]);

  let newGs: GameState = {
    ...gs,
    players: newPlayers,
    ticketDeck: newTicketDeck,
    pendingTickets: null,
  };

  newGs = addLog(newGs, `${gs.players[cp].name} neemt ${kept.length} reisticket(s)`);
  return advanceTurn(newGs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

function computeFinalScores(gs: GameState): number[] {
  return gs.players.map((p, i) => {
    let score = p.routeScore;
    for (const t of p.tickets) {
      if (areConnected(gs.routes, i, t.from, t.to)) {
        score += t.points;
      } else {
        score -= t.points;
      }
    }
    return score;
  });
}

function findLongestRouteHolder(gs: GameState): number | null {
  const lengths = gs.players.map((_, i) => longestRoute(gs.routes, i));
  const max = Math.max(...lengths);
  if (max < 6) return null; // minimum for longest route bonus
  const idx = lengths.indexOf(max);
  // Tiebreak: no bonus if tied
  if (lengths.filter(l => l === max).length > 1) return null;
  return idx;
}

export function getPlayerScore(gs: GameState, playerIdx: number): number {
  return gs.players[playerIdx].routeScore;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────────────────────────────────────

// Find shortest path for ticket using BFS (considering unclaimed + own routes)
function shortestPath(routes: Route[], playerIdx: number, from: string, to: string): string[] | null {
  // Returns route IDs on shortest path (unclaimed or own routes)
  const adj: Record<string, Array<{ to: string; routeId: string; length: number; color: CardColor | 'gray'; claimedBy: number | null }>> = {};
  for (const r of routes) {
    if (r.claimedBy !== null && r.claimedBy !== playerIdx) continue; // skip opponent's routes
    (adj[r.from] ??= []).push({ to: r.to, routeId: r.id, length: r.length, color: r.color, claimedBy: r.claimedBy });
    (adj[r.to] ??= []).push({ to: r.from, routeId: r.id, length: r.length, color: r.color, claimedBy: r.claimedBy });
  }

  const queue: Array<{ city: string; path: string[] }> = [{ city: from, path: [] }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { city, path } = queue.shift()!;
    if (city === to) return path;
    if (visited.has(city)) continue;
    visited.add(city);
    for (const edge of adj[city] ?? []) {
      if (!visited.has(edge.to)) {
        queue.push({ city: edge.to, path: [...path, edge.routeId] });
      }
    }
  }
  return null;
}

export type AIAction =
  | { type: 'claim'; routeId: string; color: CardColor; wilds: number }
  | { type: 'draw_face_up'; cardIdx: number }
  | { type: 'draw_deck' }
  | { type: 'draw_tickets' }
  | { type: 'keep_tickets'; ids: string[] };

export function aiDecide(gs: GameState): AIAction | null {
  const cp = gs.currentPlayer;
  const player = gs.players[cp];

  // If picking tickets: keep all
  if (gs.phase === 'picking_tickets' && gs.pendingTickets) {
    return { type: 'keep_tickets', ids: gs.pendingTickets.map(t => t.id) };
  }

  if (gs.phase !== 'idle' && gs.phase !== 'drew_first') return null;

  // Find all routes needed for tickets
  const neededRoutes = new Set<string>();
  const neededColors: Record<string, number> = {};

  for (const ticket of player.tickets) {
    if (areConnected(gs.routes, cp, ticket.from, ticket.to)) continue;
    const path = shortestPath(gs.routes, cp, ticket.from, ticket.to);
    if (!path) continue;
    for (const rid of path) {
      const r = gs.routes.find(x => x.id === rid);
      if (r && r.claimedBy === null) {
        neededRoutes.add(rid);
        const colorKey = r.color === 'gray' ? 'gray' : r.color;
        neededColors[colorKey] = (neededColors[colorKey] ?? 0) + r.length;
      }
    }
  }

  // Try to claim a needed route
  for (const rid of neededRoutes) {
    const route = gs.routes.find(r => r.id === rid)!;
    const opts = getClaimOptions(player.hand, route);
    if (opts.length > 0) {
      // Pick option with fewest wilds
      const best = opts.sort((a, b) => a.wilds - b.wilds)[0];
      // Only claim if it's our turn's idle phase
      if (gs.phase === 'idle') {
        return { type: 'claim', routeId: rid, color: best.color, wilds: best.wilds };
      }
    }
  }

  // If drew_first, just draw from deck
  if (gs.phase === 'drew_first') {
    // Try to draw a useful color from face-up
    const wantedColors = new Set<string>(
      Object.entries(neededColors)
        .filter(([k]) => k !== 'gray')
        .map(([k]) => k)
    );
    for (let i = 0; i < gs.faceUpCards.length; i++) {
      const c = gs.faceUpCards[i];
      if (c && c !== 'wild' && wantedColors.has(c)) {
        return { type: 'draw_face_up', cardIdx: i };
      }
    }
    return { type: 'draw_deck' };
  }

  // Idle phase: draw cards or draw tickets
  const handSize = totalCards(player.hand);

  // If hand is small, draw cards
  if (handSize < 4) {
    // Try face-up wild
    const wildIdx = gs.faceUpCards.findIndex(c => c === 'wild');
    if (wildIdx !== -1) return { type: 'draw_face_up', cardIdx: wildIdx };

    // Try needed color
    const wantedColors = new Set<string>(Object.keys(neededColors).filter(k => k !== 'gray'));
    for (let i = 0; i < gs.faceUpCards.length; i++) {
      const c = gs.faceUpCards[i];
      if (c && wantedColors.has(c)) return { type: 'draw_face_up', cardIdx: i };
    }
    return { type: 'draw_deck' };
  }

  // Occasionally draw tickets if we have few
  if (player.tickets.length <= 2 && gs.ticketDeck.length >= 3 && Math.random() < 0.3) {
    return { type: 'draw_tickets' };
  }

  // Default: draw from deck
  const wantedColors = new Set<string>(Object.keys(neededColors).filter(k => k !== 'gray'));
  for (let i = 0; i < gs.faceUpCards.length; i++) {
    const c = gs.faceUpCards[i];
    if (c && wantedColors.has(c)) return { type: 'draw_face_up', cardIdx: i };
  }
  return { type: 'draw_deck' };
}

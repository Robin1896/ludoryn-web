// ─────────────────────────────────────────────────────────────────────────────
// Beverbende — Cabo-variant kaartspel
// ─────────────────────────────────────────────────────────────────────────────
// Regels:
//   - 4 kaarten per speler, face-down
//   - Begin: kijk stiekem naar je 2 onderste kaarten
//   - Beurt: trek van stapel of van afleg → wissel of leg af
//   - "Beverbende!" roepen → iedereen nog 1 beurt → onthulling
//   - Laagste totaal wint; roeper verliest bij gelijkspel of niet laagste

export type Phase =
  | 'peek'        // begin: kijk naar 2 eigen kaarten
  | 'playing'     // normale beurt
  | 'called'      // iemand heeft Beverbende geroepen, rest mag nog 1 beurt
  | 'reveal'      // onthulling + scorebord
  | 'gameover';   // spel voorbij

export interface Card {
  id: string;
  value: number;   // 0–12
  faceUp: boolean; // of de speler hem mag zien (tijdelijk)
}

export interface Player {
  name: string;
  cards: Card[];
  score: number;   // cumulatief over rondes
}

export interface GameState {
  players: Player[];
  deck: number[];
  discard: number[];      // top = laatste element
  currentPlayer: number;
  phase: Phase;
  callerIndex: number | null;   // wie Beverbende riep
  turnsAfterCall: number;       // hoeveel spelers na de roeper al gespeeld hebben
  drawnCard: number | null;     // kaart die je momenteel in de hand houdt (na trekken)
  drawnFrom: 'deck' | 'discard' | null;
  peekRemaining: number;        // tijdens peek-fase: nog te kijken kaarten
  peekCardIndex: number | null; // welke kaart je nu bekijkt
  round: number;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deck
// ─────────────────────────────────────────────────────────────────────────────

function buildDeck(): number[] {
  const deck: number[] = [];
  for (let v = 0; v <= 12; v++) {
    // 0 heeft 4 kaarten, rest ook 4
    for (let i = 0; i < 4; i++) deck.push(v);
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

let cardIdCounter = 0;
function makeCard(value: number, faceUp = false): Card {
  return { id: `c${cardIdCounter++}`, value, faceUp };
}

// ─────────────────────────────────────────────────────────────────────────────
// New game
// ─────────────────────────────────────────────────────────────────────────────

export function newGame(names: string[], existingScores?: number[]): GameState {
  const deck = buildDeck();

  const players: Player[] = names.map((name, i) => {
    const cards: Card[] = [];
    for (let j = 0; j < 4; j++) cards.push(makeCard(deck.pop()!));
    return { name, cards, score: existingScores?.[i] ?? 0 };
  });

  const discard: number[] = [deck.pop()!];

  return {
    players,
    deck,
    discard,
    currentPlayer: 0,
    phase: 'peek',
    callerIndex: null,
    turnsAfterCall: 0,
    drawnCard: null,
    drawnFrom: null,
    peekRemaining: 2,
    peekCardIndex: null,
    round: 1,
    message: `${names[0]}, kijk naar 2 van je kaarten.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Peek phase — speler kijkt naar een kaart
// ─────────────────────────────────────────────────────────────────────────────

export function peekCard(gs: GameState, cardIndex: number): GameState {
  if (gs.phase !== 'peek') return gs;
  const player = gs.players[gs.currentPlayer];
  if (cardIndex < 0 || cardIndex >= player.cards.length) return gs;

  const players = gs.players.map((p, i) => {
    if (i !== gs.currentPlayer) return p;
    const cards = p.cards.map((c, ci) => ci === cardIndex ? { ...c, faceUp: true } : c);
    return { ...p, cards };
  });

  return {
    ...gs,
    players,
    peekCardIndex: cardIndex,
    peekRemaining: gs.peekRemaining,
    message: `Kaart ${cardIndex + 1}: ${gs.players[gs.currentPlayer].cards[cardIndex].value}`,
  };
}

export function confirmPeek(gs: GameState): GameState {
  if (gs.phase !== 'peek' || gs.peekCardIndex === null) return gs;

  // Hide the peeked card again
  const players = gs.players.map((p, i) => {
    if (i !== gs.currentPlayer) return p;
    const cards = p.cards.map(c => ({ ...c, faceUp: false }));
    return { ...p, cards };
  });

  const remaining = gs.peekRemaining - 1;

  if (remaining > 0) {
    return {
      ...gs,
      players,
      peekRemaining: remaining,
      peekCardIndex: null,
      message: `Kijk naar nog ${remaining} kaart${remaining > 1 ? 'en' : ''}.`,
    };
  }

  // Done peeking for this player — next player or start game
  const nextPlayer = (gs.currentPlayer + 1) % gs.players.length;
  if (nextPlayer === 0) {
    // All players peeked, start playing
    return {
      ...gs,
      players,
      currentPlayer: 0,
      phase: 'playing',
      peekRemaining: 2,
      peekCardIndex: null,
      message: `${gs.players[0].name} begint! Trek een kaart of roep Beverbende.`,
    };
  }

  return {
    ...gs,
    players,
    currentPlayer: nextPlayer,
    peekRemaining: 2,
    peekCardIndex: null,
    message: `${gs.players[nextPlayer].name}, kijk naar 2 van je kaarten.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw card from deck
// ─────────────────────────────────────────────────────────────────────────────

export function drawFromDeck(gs: GameState): GameState {
  if ((gs.phase !== 'playing' && gs.phase !== 'called') || gs.drawnCard !== null) return gs;

  // Reshuffle discard pile into deck if empty
  let { deck, discard } = gs;
  if (deck.length === 0) {
    if (discard.length === 0) return gs; // no cards left at all
    deck = [...discard].sort(() => Math.random() - 0.5);
    discard = [];
  }

  const newDeck = [...deck];
  const card = newDeck.pop()!;

  return {
    ...gs,
    deck: newDeck,
    discard,
    drawnCard: card,
    drawnFrom: 'deck',
    message: `Je hebt ${card} getrokken. Wissel met een van je kaarten of leg af.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw from discard
// ─────────────────────────────────────────────────────────────────────────────

export function drawFromDiscard(gs: GameState): GameState {
  if ((gs.phase !== 'playing' && gs.phase !== 'called') || gs.drawnCard !== null) return gs;
  if (gs.discard.length === 0) return gs;

  const discard = [...gs.discard];
  const card = discard.pop()!;

  return {
    ...gs,
    discard,
    drawnCard: card,
    drawnFrom: 'discard',
    message: `Je pakte ${card} van de aflegstapel. Wissel met een van je kaarten.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Swap drawn card with one of your cards
// ─────────────────────────────────────────────────────────────────────────────

export function swapCard(gs: GameState, cardIndex: number): GameState {
  if (gs.drawnCard === null) return gs;
  const player = gs.players[gs.currentPlayer];
  if (cardIndex < 0 || cardIndex >= player.cards.length) return gs;

  const oldCard = player.cards[cardIndex].value;
  const players = gs.players.map((p, i) => {
    if (i !== gs.currentPlayer) return p;
    const cards = p.cards.map((c, ci) =>
      ci === cardIndex ? makeCard(gs.drawnCard!) : c
    );
    return { ...p, cards };
  });

  const discard = [...gs.discard, oldCard];

  return advanceTurn({
    ...gs,
    players,
    discard,
    drawnCard: null,
    drawnFrom: null,
    message: `Gewisseld! Kaart ${cardIndex + 1} vervangen.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Discard drawn card (only allowed from deck draw)
// ─────────────────────────────────────────────────────────────────────────────

export function discardDrawn(gs: GameState): GameState {
  if (gs.drawnCard === null || gs.drawnFrom !== 'deck') return gs;

  const discard = [...gs.discard, gs.drawnCard];
  return advanceTurn({
    ...gs,
    discard,
    drawnCard: null,
    drawnFrom: null,
    message: `Afgelegd.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Call Beverbende
// ─────────────────────────────────────────────────────────────────────────────

export function callBeverbende(gs: GameState): GameState {
  if (gs.phase !== 'playing' || gs.drawnCard !== null) return gs;

  const callerIndex = gs.currentPlayer;
  const nextPlayer = (callerIndex + 1) % gs.players.length;

  return {
    ...gs,
    phase: 'called',
    callerIndex,
    turnsAfterCall: 0,
    currentPlayer: nextPlayer,
    message: `${gs.players[callerIndex].name} riep Beverbende! Alle anderen mogen nog 1 beurt.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Advance turn — handles both playing and called phases
// ─────────────────────────────────────────────────────────────────────────────

function advanceTurn(gs: GameState): GameState {
  if (gs.phase === 'called') {
    const turnsAfterCall = gs.turnsAfterCall + 1;
    // Only OTHER players get one more turn; caller does NOT get an extra turn
    if (turnsAfterCall >= gs.players.length - 1) {
      return revealAll({ ...gs, turnsAfterCall });
    }
    const next = (gs.currentPlayer + 1) % gs.players.length;
    return {
      ...gs,
      turnsAfterCall,
      currentPlayer: next,
      message: `${gs.players[next].name} is aan de beurt.`,
    };
  }

  const nextPlayer = (gs.currentPlayer + 1) % gs.players.length;
  return {
    ...gs,
    currentPlayer: nextPlayer,
    message: `${gs.players[nextPlayer].name} is aan de beurt.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reveal all cards and score
// ─────────────────────────────────────────────────────────────────────────────

function revealAll(gs: GameState): GameState {
  const players = gs.players.map(p => ({
    ...p,
    cards: p.cards.map(c => ({ ...c, faceUp: true })),
  }));

  const totals = players.map(p => p.cards.reduce((s, c) => s + c.value, 0));
  const minTotal = Math.min(...totals);
  const callerTotal = totals[gs.callerIndex!];

  const playersWithScores = players.map((p, i) => {
    let roundScore: number;
    if (i === gs.callerIndex) {
      roundScore = callerTotal < minTotal ? 0 : callerTotal * 2; // strict laagste: 0 pts, anders dubbele straf
    } else {
      roundScore = totals[i];
    }
    return { ...p, score: p.score + roundScore };
  });

  return {
    ...gs,
    players: playersWithScores,
    phase: 'reveal',
    message: callerTotal < minTotal
      ? `${gs.players[gs.callerIndex!].name} had de laagste score — 0 punten!`
      : `${gs.players[gs.callerIndex!].name} had niet de laagste score — dubbele straf!`,
  };
}

// helper: total card value for a player
export function playerTotal(player: Player): number {
  return player.cards.reduce((s, c) => s + c.value, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// AI logic — simple: draw from deck, discard if high, else swap highest card
// ─────────────────────────────────────────────────────────────────────────────

export function aiDecide(gs: GameState): GameState {
  if (gs.phase !== 'playing' && gs.phase !== 'called') return gs;
  if (gs.drawnCard !== null) return gs;

  const player = gs.players[gs.currentPlayer];
  // Known cards (faceUp) — but AI tracks all for simplicity (cheats a tiny bit)
  const knownTotal = player.cards.reduce((s, c) => s + c.value, 0);

  // Call Beverbende if total ≤ 12 and deck is small
  if (knownTotal <= 12 && gs.deck.length < 20 && gs.phase === 'playing') {
    return callBeverbende(gs);
  }

  // Draw from deck
  let state = drawFromDeck(gs);
  if (state.drawnCard === null) return state;

  const drawn = state.drawnCard;
  // Find highest card
  const highestIdx = player.cards.reduce((best, c, i) =>
    c.value > player.cards[best].value ? i : best, 0);

  if (drawn < player.cards[highestIdx].value) {
    return swapCard(state, highestIdx);
  } else {
    return discardDrawn(state);
  }
}


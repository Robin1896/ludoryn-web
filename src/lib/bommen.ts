export type Suit = 'H' | 'D' | 'C' | 'S'
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A'|'B'

export interface Card { suit: Suit | null; rank: Rank; id: string }
export interface PlayerState { name: string; hand: Card[]; lives: number }
export type GamePhase = 'choosing' | 'choosing-value' | 'boom' | 'gameover'

export interface GameState {
  players: PlayerState[]
  deck: Card[]
  total: number
  currentPlayer: number
  direction: 1 | -1
  phase: GamePhase
  pendingCard: Card | null
  choiceOptions: number[]
  boomPlayer: number | null
  lastAction: string
  scores: number[] | null
  roundNum: number
}

export type CardEffect =
  | { type: 'add'; value: number }
  | { type: 'choice'; options: number[] }
  | { type: 'reverse' }
  | { type: 'skip' }
  | { type: 'bomb' }

export const HAND_SIZE = 5
export const START_LIVES = 3
export const LIMIT = 1000

// ── Deck ─────────────────────────────────────────────────────────────────────

function createDeck(): Card[] {
  const suits: Suit[] = ['H', 'D', 'C', 'S']
  const ranks: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
  const cards: Card[] = []
  let i = 0
  for (const suit of suits) {
    for (const rank of ranks) {
      cards.push({ suit, rank, id: `${suit}${rank}${i++}` })
    }
  }
  cards.push({ suit: null, rank: 'B', id: 'B0' })
  cards.push({ suit: null, rank: 'B', id: 'B1' })
  return cards
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Card display ──────────────────────────────────────────────────────────────

export function suitSymbol(suit: Suit | null): string {
  if (!suit) return '💣'
  return { H: '♥', D: '♦', C: '♣', S: '♠' }[suit]
}

export function isRedSuit(suit: Suit | null): boolean {
  return suit === 'H' || suit === 'D'
}

export function cardLabel(card: Card): string {
  if (card.rank === 'B') return '💣'
  return `${card.rank}${suitSymbol(card.suit)}`
}

// ── Effects ───────────────────────────────────────────────────────────────────

export function getCardEffect(rank: Rank): CardEffect {
  switch (rank) {
    case '2':  return { type: 'add', value: 2 }
    case '3':  return { type: 'add', value: 3 }
    case '4':  return { type: 'add', value: 4 }
    case '5':  return { type: 'add', value: 5 }
    case '6':  return { type: 'add', value: 6 }
    case '7':  return { type: 'add', value: 7 }
    case '8':  return { type: 'add', value: 8 }
    case '9':  return { type: 'choice', options: [9, -9] }
    case '10': return { type: 'add', value: -10 }
    case 'J':  return { type: 'reverse' }
    case 'Q':  return { type: 'skip' }
    case 'K':  return { type: 'add', value: 100 }
    case 'A':  return { type: 'choice', options: [1, 11] }
    case 'B':  return { type: 'bomb' }
    default:   return { type: 'add', value: 0 }
  }
}

export function effectLabel(effect: CardEffect): string {
  switch (effect.type) {
    case 'add':    return effect.value >= 0 ? `+${effect.value}` : `${effect.value}`
    case 'choice': return effect.options.map(v => v >= 0 ? `+${v}` : `${v}`).join('/')
    case 'reverse': return '↩ Richting'
    case 'skip':   return '⏭ Overslaan'
    case 'bomb':   return '💥 Reset!'
    default:       return ''
  }
}

// ── Game creation ─────────────────────────────────────────────────────────────

export function newGame(names: string[]): GameState {
  const deck = shuffle(createDeck())
  const players: PlayerState[] = names.map(name => ({
    name, hand: [], lives: START_LIVES,
  }))
  for (const player of players) {
    player.hand = deck.splice(0, HAND_SIZE)
  }
  return {
    players, deck, total: 0, currentPlayer: 0, direction: 1,
    phase: 'choosing', pendingCard: null, choiceOptions: [],
    boomPlayer: null, lastAction: '', scores: null, roundNum: 1,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextAliveAfter(state: GameState, from: number, skip = false): number {
  const n = state.players.length
  let cur = from
  const advance = () => { cur = (cur + state.direction + n) % n }
  advance()
  while (state.players[cur].lives <= 0) advance()
  if (skip) {
    advance()
    while (state.players[cur].lives <= 0) advance()
  }
  return cur
}

function drawForPlayer(state: GameState, idx: number): GameState {
  let deck = [...state.deck]
  if (deck.length === 0) {
    const inHand = new Set(state.players.flatMap(p => p.hand.map(c => c.id)))
    deck = shuffle(createDeck().filter(c => !inHand.has(c.id)))
  }
  if (deck.length === 0) return state
  const [card, ...rest] = deck
  const players = state.players.map((p, i) =>
    i === idx ? { ...p, hand: [...p.hand, card] } : p
  )
  return { ...state, players, deck: rest }
}

function applyEffect(state: GameState, effect: CardEffect, byIdx: number): GameState {
  let newTotal = state.total
  let newDir = state.direction
  let nextP = nextAliveAfter(state, byIdx)

  switch (effect.type) {
    case 'add':
      newTotal = state.total + effect.value
      break
    case 'reverse':
      newDir = state.direction === 1 ? -1 : 1
      nextP = nextAliveAfter({ ...state, direction: newDir }, byIdx)
      break
    case 'skip':
      nextP = nextAliveAfter(state, byIdx, true)
      break
    case 'bomb':
      newTotal = 0
      break
  }

  if (newTotal > LIMIT) {
    const players = state.players.map((p, i) =>
      i === byIdx ? { ...p, lives: p.lives - 1 } : p
    )
    const alive = players.filter(p => p.lives > 0)
    if (alive.length <= 1) {
      const winnerIdx = players.findIndex(p => p.lives > 0)
      return { ...state, players, total: newTotal, phase: 'gameover', boomPlayer: byIdx,
        scores: players.map(p => p.lives), lastAction: '' }
    }
    return { ...state, players, total: newTotal, phase: 'boom', boomPlayer: byIdx, lastAction: '' }
  }

  return { ...state, total: newTotal, direction: newDir, currentPlayer: nextP,
    phase: 'choosing', boomPlayer: null, pendingCard: null, choiceOptions: [] }
}

// ── Actions ───────────────────────────────────────────────────────────────────

export function playCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'choosing') return state
  const idx = state.currentPlayer
  const card = state.players[idx].hand.find(c => c.id === cardId)
  if (!card) return state

  const players = state.players.map((p, i) =>
    i === idx ? { ...p, hand: p.hand.filter(c => c.id !== cardId) } : p
  )
  const s1 = { ...state, players }
  const effect = getCardEffect(card.rank)

  if (effect.type === 'choice') {
    return { ...s1, phase: 'choosing-value', pendingCard: card, choiceOptions: effect.options,
      lastAction: `${state.players[idx].name} speelt ${cardLabel(card)}` }
  }

  const s2 = drawForPlayer(s1, idx)
  return { ...applyEffect(s2, effect, idx),
    lastAction: `${state.players[idx].name} speelt ${cardLabel(card)} (${effectLabel(effect)})` }
}

export function chooseValue(state: GameState, value: number): GameState {
  if (state.phase !== 'choosing-value' || !state.pendingCard) return state
  const idx = state.currentPlayer
  const card = state.pendingCard
  const s1 = drawForPlayer({ ...state, phase: 'choosing', pendingCard: null, choiceOptions: [] }, idx)
  return { ...applyEffect(s1, { type: 'add', value }, idx),
    lastAction: `${state.players[idx].name} speelt ${cardLabel(card)} (${value >= 0 ? '+' : ''}${value})` }
}

export function startNewRound(state: GameState): GameState {
  const deck = shuffle(createDeck())
  const players = state.players.map(p => {
    if (p.lives <= 0) return p
    return { ...p, hand: deck.splice(0, HAND_SIZE) }
  })
  const firstAlive = players.findIndex(p => p.lives > 0)
  return { ...state, players, deck, total: 0, direction: 1,
    currentPlayer: firstAlive >= 0 ? firstAlive : 0,
    phase: 'choosing', pendingCard: null, choiceOptions: [],
    boomPlayer: null, lastAction: '', roundNum: state.roundNum + 1 }
}

// ── AI ────────────────────────────────────────────────────────────────────────

export function aiPickCard(state: GameState): string {
  const hand = state.players[state.currentPlayer].hand
  const scored = hand.map(card => {
    const eff = getCardEffect(card.rank)
    let score = 0
    switch (eff.type) {
      case 'bomb':
        score = state.total > 700 ? -1000 : state.total > 400 ? -200 : 10
        break
      case 'add':
        if (state.total + eff.value > LIMIT) score = 9000 + eff.value
        else score = eff.value < 0 ? eff.value - 10 : eff.value
        break
      case 'choice': {
        const best = Math.min(...eff.options.map(v => state.total + v > LIMIT ? 9000 : v < 0 ? v - 10 : v))
        score = best
        break
      }
      case 'reverse':
      case 'skip':
        score = state.total > 850 ? -80 : state.total > 700 ? -20 : 5
        break
    }
    return { card, score }
  })
  scored.sort((a, b) => a.score - b.score)
  return scored[0]?.card.id ?? hand[0].id
}

export function aiPickValue(state: GameState): number {
  const opts = state.choiceOptions
  const safe = opts.filter(v => state.total + v <= LIMIT)
  if (safe.length === 0) return opts.reduce((a, b) => state.total + a < state.total + b ? a : b)
  return safe.reduce((a, b) => {
    const da = state.total + a, db = state.total + b
    return Math.abs(da) < Math.abs(db) ? a : b
  })
}

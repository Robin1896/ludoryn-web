export type DieSymbol = 'skull' | 'sword' | 'parrot' | 'monkey' | 'gold' | 'diamond'

export interface Die {
  id: number
  symbol: DieSymbol
  kept: boolean      // player chose to keep (won't re-roll)
  locked: boolean    // forced (skull auto-locked, or pre-set by card)
  onIsland: boolean  // on treasure island
}

export type CardType =
  | 'skull1' | 'skull2'
  | 'sorceress'
  | 'pirate'
  | 'treasure_island'
  | 'pirate_ship'
  | 'gold'
  | 'diamond'
  | 'animals'

export interface PirateCard {
  type: CardType
  label: string
  icon: string
  description: string
  shipBonus?: number
  shipNeeds?: number
}

export interface PlayerState {
  name: string
  score: number
}

export type Phase = 'pre-roll' | 'rolling' | 'bust' | 'gameover'

export interface GameState {
  players: PlayerState[]
  currentPlayer: number
  dice: Die[]
  phase: Phase
  card: PirateCard
  roundScore: number
  rollCount: number
  sorceressUsed: boolean
  lastAction: string
}

export const TARGET = 6000
export const BUST_AT = 3
export const NUM_DICE = 8

const FACES: DieSymbol[] = ['skull', 'sword', 'parrot', 'monkey', 'gold', 'diamond']
function rollSymbol(): DieSymbol { return FACES[Math.floor(Math.random() * FACES.length)] }

export const ALL_CARDS: PirateCard[] = [
  { type: 'skull1',         label: 'Doodshoofd',      icon: '💀',    description: 'Je beurt begint al met 1 schedel.' },
  { type: 'skull1',         label: 'Doodshoofd',      icon: '💀',    description: 'Je beurt begint al met 1 schedel.' },
  { type: 'skull1',         label: 'Doodshoofd',      icon: '💀',    description: 'Je beurt begint al met 1 schedel.' },
  { type: 'skull2',         label: 'Doodshoofd ×2',   icon: '💀💀',  description: 'Je beurt begint al met 2 schedels.' },
  { type: 'skull2',         label: 'Doodshoofd ×2',   icon: '💀💀',  description: 'Je beurt begint al met 2 schedels.' },
  { type: 'sorceress',      label: 'Zeekat',           icon: '🐙',   description: 'Eenmalig mag je één schedel opnieuw gooien.' },
  { type: 'sorceress',      label: 'Zeekat',           icon: '🐙',   description: 'Eenmalig mag je één schedel opnieuw gooien.' },
  { type: 'sorceress',      label: 'Zeekat',           icon: '🐙',   description: 'Eenmalig mag je één schedel opnieuw gooien.' },
  { type: 'pirate',         label: 'Piraat',           icon: '🏴‍☠️',  description: 'Verdubbel al je punten deze beurt.' },
  { type: 'pirate',         label: 'Piraat',           icon: '🏴‍☠️',  description: 'Verdubbel al je punten deze beurt.' },
  { type: 'pirate',         label: 'Piraat',           icon: '🏴‍☠️',  description: 'Verdubbel al je punten deze beurt.' },
  { type: 'treasure_island',label: 'Schateiland',      icon: '🏝️',   description: 'Leg dobbelstenen veilig op het eiland — ze tellen mee maar worden niet meer gegooid.' },
  { type: 'treasure_island',label: 'Schateiland',      icon: '🏝️',   description: 'Leg dobbelstenen veilig op het eiland — ze tellen mee maar worden niet meer gegooid.' },
  { type: 'pirate_ship',    label: 'Piratenschip (3)', icon: '⛵',   description: 'Stop vrijwillig met ≥3 sabels voor +300 bonus.', shipBonus: 300, shipNeeds: 3 },
  { type: 'pirate_ship',    label: 'Piratenschip (4)', icon: '⚓',   description: 'Stop vrijwillig met ≥4 sabels voor +600 bonus.', shipBonus: 600, shipNeeds: 4 },
  { type: 'gold',           label: 'Goudstuk',         icon: '🪙',   description: 'Eén dobbelsteen begint al op goud (+100).' },
  { type: 'gold',           label: 'Goudstuk',         icon: '🪙',   description: 'Eén dobbelsteen begint al op goud (+100).' },
  { type: 'gold',           label: 'Goudstuk',         icon: '🪙',   description: 'Eén dobbelsteen begint al op goud (+100).' },
  { type: 'diamond',        label: 'Diamant',          icon: '💎',   description: 'Eén dobbelsteen begint al op diamant (+100).' },
  { type: 'diamond',        label: 'Diamant',          icon: '💎',   description: 'Eén dobbelsteen begint al op diamant (+100).' },
  { type: 'diamond',        label: 'Diamant',          icon: '💎',   description: 'Eén dobbelsteen begint al op diamant (+100).' },
  { type: 'animals',        label: 'Dieren',           icon: '🦜🐒', description: 'Papegaaien en apen tellen als dezelfde soort.' },
  { type: 'animals',        label: 'Dieren',           icon: '🦜🐒', description: 'Papegaaien en apen tellen als dezelfde soort.' },
  { type: 'animals',        label: 'Dieren',           icon: '🦜🐒', description: 'Papegaaien en apen tellen als dezelfde soort.' },
]

export function drawCard(): PirateCard {
  return ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)]
}

function freshDice(): Die[] {
  return Array.from({ length: NUM_DICE }, (_, i) => ({
    id: i, symbol: 'sword' as DieSymbol, kept: false, locked: false, onIsland: false,
  }))
}

function applyCardPreset(dice: Die[], card: PirateCard): Die[] {
  if (card.type === 'skull1') return dice.map((d, i) => i === 0 ? { ...d, symbol: 'skull', locked: true } : d)
  if (card.type === 'skull2') return dice.map((d, i) => i <= 1 ? { ...d, symbol: 'skull', locked: true } : d)
  if (card.type === 'gold')   return dice.map((d, i) => i === 0 ? { ...d, symbol: 'gold',  locked: true } : d)
  if (card.type === 'diamond')return dice.map((d, i) => i === 0 ? { ...d, symbol: 'diamond', locked: true } : d)
  return dice
}

export const COMBO: Record<number, number> = { 3: 100, 4: 200, 5: 500, 6: 1000, 7: 2000, 8: 4000 }

export function calcScore(dice: Die[], card: PirateCard): number {
  const scoring = dice.filter(d => d.kept || d.locked || d.onIsland).filter(d => d.symbol !== 'skull')

  const syms = scoring.map(d => {
    if (card.type === 'animals' && (d.symbol === 'parrot' || d.symbol === 'monkey')) return 'animal'
    return d.symbol as string
  })

  const counts: Record<string, number> = {}
  for (const s of syms) counts[s] = (counts[s] ?? 0) + 1

  let score = 0
  for (const count of Object.values(counts)) {
    if (count >= 3) score += COMBO[Math.min(count, 8)] ?? 4000
  }

  // Gold and diamond always give +100 each on top of combo
  score += scoring.filter(d => d.symbol === 'gold' || d.symbol === 'diamond').length * 100

  if (card.type === 'pirate') score *= 2
  return score
}

export function countSkulls(dice: Die[]): number {
  return dice.filter(d => d.locked && d.symbol === 'skull').length
}

export function swordCount(dice: Die[]): number {
  return dice.filter(d => (d.kept || d.locked || d.onIsland) && d.symbol === 'sword').length
}

export function canRoll(state: GameState): boolean {
  if (state.phase !== 'rolling') return false
  return state.dice.some(d => !d.kept && !d.locked && !d.onIsland)
}

export function canStop(state: GameState): boolean {
  return state.rollCount > 0 && state.phase === 'rolling'
}

function lockNewSkulls(dice: Die[]): Die[] {
  return dice.map(d => d.symbol === 'skull' && !d.locked ? { ...d, locked: true } : d)
}

function resolveRoll(state: GameState, newDice: Die[]): GameState {
  const dice = lockNewSkulls(newDice)
  const skulls = countSkulls(dice)
  const bust = skulls >= BUST_AT
  return {
    ...state,
    dice,
    phase: bust ? 'bust' : 'rolling',
    rollCount: state.rollCount + 1,
    roundScore: bust ? 0 : calcScore(dice, state.card),
    lastAction: bust ? `${state.players[state.currentPlayer].name} — BOEM! (${skulls} schedels)` : '',
  }
}

export function startRoll(state: GameState): GameState {
  const newDice = state.dice.map(d =>
    d.locked || d.onIsland ? d : { ...d, symbol: rollSymbol(), kept: false }
  )
  return resolveRoll(state, newDice)
}

export function reroll(state: GameState): GameState {
  if (!canRoll(state)) return state
  const newDice = state.dice.map(d =>
    d.kept || d.locked || d.onIsland ? d : { ...d, symbol: rollSymbol() }
  )
  return resolveRoll(state, newDice)
}

export function toggleKeep(state: GameState, dieId: number): GameState {
  if (state.phase !== 'rolling') return state
  const dice = state.dice.map(d => {
    if (d.id !== dieId || d.locked || d.symbol === 'skull') return d
    return { ...d, kept: !d.kept }
  })
  return { ...state, dice, roundScore: calcScore(dice, state.card) }
}

export function toggleIsland(state: GameState, dieId: number): GameState {
  if (state.card.type !== 'treasure_island' || state.phase !== 'rolling') return state
  const dice = state.dice.map(d => {
    if (d.id !== dieId || (d.locked && d.symbol === 'skull')) return d
    return { ...d, onIsland: !d.onIsland, kept: false }
  })
  return { ...state, dice, roundScore: calcScore(dice, state.card) }
}

export function useSorceress(state: GameState, dieId: number): GameState {
  if (state.card.type !== 'sorceress' || state.sorceressUsed || state.phase !== 'rolling') return state
  const die = state.dice.find(d => d.id === dieId && d.symbol === 'skull' && d.locked)
  if (!die) return state
  const newSymbol = rollSymbol()
  const dice = state.dice.map(d => {
    if (d.id !== dieId) return d
    if (newSymbol === 'skull') return d  // still skull, stays locked
    return { ...d, symbol: newSymbol, locked: false }
  })
  const skulls = countSkulls(dice)
  const bust = skulls >= BUST_AT
  return {
    ...state, dice,
    sorceressUsed: true,
    phase: bust ? 'bust' : 'rolling',
    roundScore: bust ? 0 : calcScore(dice, state.card),
    lastAction: newSymbol === 'skull' ? 'Zeekat mislukt — nog steeds een schedel!' : `Zeekat: schedel → ${newSymbol}`,
  }
}

function nextTurn(state: GameState, addScore: number, action: string): GameState {
  const players = state.players.map((p, i) =>
    i === state.currentPlayer ? { ...p, score: p.score + addScore } : p
  )
  const winner = players.find(p => p.score >= TARGET)
  if (winner) {
    return { ...state, players, phase: 'gameover', lastAction: `🏆 ${winner.name} wint met ${winner.score} punten!` }
  }
  const next = (state.currentPlayer + 1) % state.players.length
  const card = drawCard()
  const dice = applyCardPreset(freshDice(), card)
  return { ...state, players, currentPlayer: next, dice, card, phase: 'pre-roll', roundScore: 0, rollCount: 0, sorceressUsed: false, lastAction: action }
}

export function stopTurn(state: GameState): GameState {
  if (!canStop(state)) return state
  let score = state.roundScore
  if (state.card.type === 'pirate_ship' && state.card.shipNeeds) {
    if (swordCount(state.dice) >= state.card.shipNeeds) score += state.card.shipBonus ?? 0
  }
  return nextTurn(state, score, `${state.players[state.currentPlayer].name} scoort ${score} punten!`)
}

export function nextTurnAfterBust(state: GameState): GameState {
  return nextTurn(state, 0, `${state.players[state.currentPlayer].name} scoorde niets.`)
}

export function newGame(names: string[]): GameState {
  const card = drawCard()
  const dice = applyCardPreset(freshDice(), card)
  return {
    players: names.map(name => ({ name, score: 0 })),
    currentPlayer: 0,
    dice, card,
    phase: 'pre-roll',
    roundScore: 0,
    rollCount: 0,
    sorceressUsed: false,
    lastAction: '',
  }
}

// AI
export function aiTurn(state: GameState): 'roll' | 'stop' {
  const score = state.roundScore
  const free = state.dice.filter(d => !d.kept && !d.locked && !d.onIsland).length
  const skulls = countSkulls(state.dice)
  if (free === 0) return 'stop'
  if (skulls === 2 && score >= 100) return 'stop'
  if (score >= 400 && free <= 3) return 'stop'
  if (score >= 600) return 'stop'
  return 'roll'
}

export function aiKeepDice(state: GameState): GameState {
  let s = state
  const available = state.dice.filter(d => !d.locked && !d.kept && d.symbol !== 'skull')
  // Count frequencies
  const freq: Record<string, number> = {}
  for (const d of available) {
    const sym = state.card.type === 'animals' && (d.symbol === 'parrot' || d.symbol === 'monkey') ? 'animal' : d.symbol
    freq[sym] = (freq[sym] ?? 0) + 1
  }
  for (const d of available) {
    const sym = state.card.type === 'animals' && (d.symbol === 'parrot' || d.symbol === 'monkey') ? 'animal' : d.symbol
    if (d.symbol === 'gold' || d.symbol === 'diamond' || freq[sym] >= 2) {
      s = toggleKeep(s, d.id)
    }
  }
  return s
}

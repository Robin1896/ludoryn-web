// ─────────────────────────────────────────────────────────────────────────────
// Wingspan — game logic
// ─────────────────────────────────────────────────────────────────────────────

export type Food = 'worm' | 'wheat' | 'berry' | 'fish' | 'rodent';
export type Habitat = 'forest' | 'grassland' | 'wetland';
export type Expansion = 'european' | 'oceania' | 'asia';

export type PowerEffect =
  | { type: 'gain_food'; amount: number; foodType?: Food }
  | { type: 'lay_eggs'; amount: number }
  | { type: 'draw_cards'; amount: number }
  | { type: 'tuck_cards'; amount: number }
  | { type: 'cache_food'; amount: number }
  | { type: 'gain_food_from_supply'; amount: number }
  | { type: 'none' };

export type BirdCard = {
  id: string;
  name: string;
  nameDutch: string;
  habitats: Habitat[];
  foodCost: Food[];
  eggCapacity: number;
  points: number;
  powerText: string;
  effect: PowerEffect;
  color: string;
  expansion?: Expansion;
};

export type PlacedBird = {
  card: BirdCard;
  eggs: number;
  tucked: number;
  cachedFood: Food[];
};

export type BonusCard = {
  id: string;
  name: string;
  description: string;
  condition: (player: Player) => number;
};

export type RoundGoal = {
  id: string;
  name: string;
  description: string;
  score: (player: Player) => number;
};

export type Player = {
  name: string;
  hand: BirdCard[];
  forest: (PlacedBird | null)[];
  grassland: (PlacedBird | null)[];
  wetland: (PlacedBird | null)[];
  food: Partial<Record<Food, number>>;
  bonusCard: BonusCard;
  roundGoalTokens: number[];
  totalScore: number;
};

export type ActionType = 'gain_food' | 'lay_eggs' | 'draw_cards' | 'play_bird';

export type GameState = {
  phase: 'playing' | 'round_end' | 'gameover';
  players: Player[];
  currentPlayer: number;
  round: number;
  actionsLeft: number[];
  birdDeck: BirdCard[];
  birdTray: BirdCard[];
  roundGoals: RoundGoal[];
  message: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const FOOD_EMOJI: Record<Food, string> = {
  worm: '🪱',
  wheat: '🌾',
  berry: '🍒',
  fish: '🐟',
  rodent: '🐭',
};

export const HABITAT_LABEL: Record<Habitat, string> = {
  forest: 'Bos',
  grassland: 'Weide',
  wetland: 'Moeras',
};

export const HABITAT_COLOR: Record<Habitat, string> = {
  forest: '#1B5E20',
  grassland: '#F9A825',
  wetland: '#0D47A1',
};

const ACTIONS_PER_ROUND = [8, 7, 6, 5];

// ─────────────────────────────────────────────────────────────────────────────
// Bird cards
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_BIRDS: BirdCard[] = [
  { id: 'b1', name: 'Barn Owl', nameDutch: 'Kerkuil', habitats: ['forest'], foodCost: ['rodent'], eggCapacity: 2, points: 5, powerText: 'Wanneer gespeeld: +1 eten', effect: { type: 'gain_food', amount: 1 }, color: '#C8A96E' },
  { id: 'b2', name: 'Great Horned Owl', nameDutch: 'Virginiaooruilog', habitats: ['forest'], foodCost: ['rodent', 'rodent'], eggCapacity: 2, points: 6, powerText: 'Wanneer gespeeld: +2 eten', effect: { type: 'gain_food', amount: 2 }, color: '#A67C52' },
  { id: 'b3', name: 'Red-tailed Hawk', nameDutch: 'Roodstaartbuizerd', habitats: ['forest'], foodCost: ['rodent'], eggCapacity: 2, points: 5, powerText: 'Wanneer gespeeld: stop 2 kaarten', effect: { type: 'tuck_cards', amount: 2 }, color: '#C0392B' },
  { id: 'b4', name: 'American Kestrel', nameDutch: 'Torenvalk', habitats: ['forest'], foodCost: ['rodent'], eggCapacity: 3, points: 3, powerText: 'Wanneer gespeeld: +1 eten', effect: { type: 'gain_food', amount: 1 }, color: '#E67E22' },
  { id: 'b5', name: 'Bald Eagle', nameDutch: 'Zeearend', habitats: ['forest'], foodCost: ['fish', 'rodent'], eggCapacity: 1, points: 9, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#5D6D7E' },
  { id: 'b6', name: 'Black-capped Chickadee', nameDutch: 'Matkop', habitats: ['forest'], foodCost: ['berry', 'worm'], eggCapacity: 4, points: 4, powerText: 'Wanneer gespeeld: sla 1 eten op', effect: { type: 'cache_food', amount: 1 }, color: '#2C3E50' },
  { id: 'b7', name: 'Blue Jay', nameDutch: 'Blauwe Gaai', habitats: ['forest'], foodCost: ['berry'], eggCapacity: 3, points: 4, powerText: 'Wanneer gespeeld: trek 1 kaart', effect: { type: 'draw_cards', amount: 1 }, color: '#2980B9' },
  { id: 'b8', name: 'Carolina Wren', nameDutch: 'Carolinawinterkoning', habitats: ['forest'], foodCost: ['worm', 'berry'], eggCapacity: 5, points: 3, powerText: 'Wanneer gespeeld: trek 1 kaart', effect: { type: 'draw_cards', amount: 1 }, color: '#884EA0' },
  { id: 'b9', name: 'American Robin', nameDutch: 'Roodborstlijster', habitats: ['grassland'], foodCost: ['worm', 'berry'], eggCapacity: 3, points: 7, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#E74C3C' },
  { id: 'b10', name: 'Eastern Bluebird', nameDutch: 'Blauwborst', habitats: ['grassland'], foodCost: ['worm', 'berry'], eggCapacity: 4, points: 5, powerText: 'Wanneer gespeeld: leg 1 ei', effect: { type: 'lay_eggs', amount: 1 }, color: '#3498DB' },
  { id: 'b11', name: 'American Goldfinch', nameDutch: 'Goudvink', habitats: ['grassland'], foodCost: ['wheat'], eggCapacity: 3, points: 4, powerText: 'Wanneer gespeeld: trek 1 kaart', effect: { type: 'draw_cards', amount: 1 }, color: '#F1C40F' },
  { id: 'b12', name: 'Bobolink', nameDutch: 'Bobolink', habitats: ['grassland'], foodCost: ['wheat', 'berry'], eggCapacity: 3, points: 6, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#1ABC9C' },
  { id: 'b13', name: 'Killdeer', nameDutch: 'Killdeerplevier', habitats: ['grassland'], foodCost: ['worm'], eggCapacity: 4, points: 4, powerText: 'Wanneer gespeeld: leg 1 ei', effect: { type: 'lay_eggs', amount: 1 }, color: '#95A5A6' },
  { id: 'b14', name: 'Sandhill Crane', nameDutch: 'Kraanvogel', habitats: ['grassland'], foodCost: ['wheat'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#BDC3C7' },
  { id: 'b15', name: 'American Avocet', nameDutch: 'Kluut', habitats: ['grassland', 'wetland'], foodCost: ['worm'], eggCapacity: 3, points: 7, powerText: 'Wanneer gespeeld: trek 1 kaart', effect: { type: 'draw_cards', amount: 1 }, color: '#D35400' },
  { id: 'b16', name: 'Mallard', nameDutch: 'Wilde Eend', habitats: ['wetland'], foodCost: ['wheat', 'worm'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: +1 eten', effect: { type: 'gain_food', amount: 1 }, color: '#27AE60' },
  { id: 'b17', name: 'Great Blue Heron', nameDutch: 'Blauwe Reiger', habitats: ['wetland'], foodCost: ['fish'], eggCapacity: 2, points: 9, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#5D6D7E' },
  { id: 'b18', name: 'Osprey', nameDutch: 'Visarend', habitats: ['wetland'], foodCost: ['fish', 'fish'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: sla 1 eten op', effect: { type: 'cache_food', amount: 1 }, color: '#1E8BC3' },
  { id: 'b19', name: 'Kingfisher', nameDutch: 'IJsvogel', habitats: ['wetland'], foodCost: ['fish'], eggCapacity: 4, points: 3, powerText: 'Wanneer gespeeld: +1 eten', effect: { type: 'gain_food', amount: 1 }, color: '#00BCD4' },
  { id: 'b20', name: 'Wood Duck', nameDutch: 'Bruidseend', habitats: ['wetland'], foodCost: ['wheat'], eggCapacity: 4, points: 4, powerText: 'Wanneer gespeeld: trek 1 kaart', effect: { type: 'draw_cards', amount: 1 }, color: '#8E44AD' },
  { id: 'b21', name: 'Tufted Puffin', nameDutch: 'Papegaaiduiker', habitats: ['wetland'], foodCost: ['fish', 'fish'], eggCapacity: 2, points: 7, powerText: 'Wanneer gespeeld: stop 1 kaart', effect: { type: 'tuck_cards', amount: 1 }, color: '#E74C3C' },
  { id: 'b22', name: 'Common Loon', nameDutch: 'IJsduiker', habitats: ['wetland'], foodCost: ['fish'], eggCapacity: 3, points: 4, powerText: 'Wanneer gespeeld: +2 eten (vis)', effect: { type: 'gain_food', amount: 2, foodType: 'fish' }, color: '#2C3E50' },
  { id: 'b23', name: 'Canada Goose', nameDutch: 'Canadese Gans', habitats: ['forest', 'grassland', 'wetland'], foodCost: ['wheat', 'wheat'], eggCapacity: 2, points: 4, powerText: 'Wanneer gespeeld: +1 eten', effect: { type: 'gain_food', amount: 1 }, color: '#7F8C8D' },
  { id: 'b24', name: 'European Starling', nameDutch: 'Spreeuw', habitats: ['forest', 'grassland'], foodCost: ['berry'], eggCapacity: 5, points: 3, powerText: 'Wanneer gespeeld: sla 1 eten op', effect: { type: 'cache_food', amount: 1 }, color: '#2ECC71' },
];

export const EXPANSION_BIRDS: BirdCard[] = [
  // European
  { id: 'e1', name: 'Eurasian Jay', nameDutch: 'Vlaamse Gaai', habitats: ['forest'], foodCost: ['berry'], eggCapacity: 3, points: 4, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#3498DB', expansion: 'european' },
  { id: 'e2', name: 'Common Kingfisher', nameDutch: 'Gewone IJsvogel', habitats: ['wetland'], foodCost: ['fish'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: +2 eten', effect: { type: 'gain_food', amount: 2 }, color: '#E74C3C', expansion: 'european' },
  { id: 'e3', name: 'Barn Swallow', nameDutch: 'Boerenzwaluw', habitats: ['grassland'], foodCost: ['worm'], eggCapacity: 4, points: 4, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#1ABC9C', expansion: 'european' },
  { id: 'e4', name: 'White Stork', nameDutch: 'Ooievaar', habitats: ['grassland', 'wetland'], foodCost: ['worm', 'fish'], eggCapacity: 2, points: 8, powerText: 'Wanneer gespeeld: stop 3 kaarten', effect: { type: 'tuck_cards', amount: 3 }, color: '#BDC3C7', expansion: 'european' },
  { id: 'e5', name: 'Red Kite', nameDutch: 'Rode Wouw', habitats: ['forest'], foodCost: ['rodent', 'worm'], eggCapacity: 2, points: 7, powerText: 'Wanneer gespeeld: +2 eten', effect: { type: 'gain_food', amount: 2 }, color: '#C0392B', expansion: 'european' },
  { id: 'e6', name: 'European Robin', nameDutch: 'Roodborst', habitats: ['forest', 'grassland'], foodCost: ['worm'], eggCapacity: 4, points: 5, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#E74C3C', expansion: 'european' },
  { id: 'e7', name: 'Common Swift', nameDutch: 'Gierzwaluw', habitats: ['grassland'], foodCost: ['worm'], eggCapacity: 2, points: 6, powerText: 'Wanneer gespeeld: sla 2 eten op', effect: { type: 'cache_food', amount: 2 }, color: '#2C3E50', expansion: 'european' },
  { id: 'e8', name: 'Atlantic Puffin', nameDutch: 'Papegaaiduiker', habitats: ['wetland'], foodCost: ['fish'], eggCapacity: 2, points: 6, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#E67E22', expansion: 'european' },
  // Oceania
  { id: 'o1', name: 'Tui', nameDutch: 'Tui', habitats: ['forest'], foodCost: ['berry', 'berry'], eggCapacity: 2, points: 6, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#2C3E50', expansion: 'oceania' },
  { id: 'o2', name: 'Kea', nameDutch: 'Kea', habitats: ['forest', 'grassland'], foodCost: ['worm', 'berry'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: +2 eten', effect: { type: 'gain_food', amount: 2 }, color: '#27AE60', expansion: 'oceania' },
  { id: 'o3', name: 'Little Penguin', nameDutch: 'Kleine Pinguïn', habitats: ['wetland'], foodCost: ['fish'], eggCapacity: 2, points: 5, powerText: 'Wanneer gespeeld: leg 3 eieren', effect: { type: 'lay_eggs', amount: 3 }, color: '#2C3E50', expansion: 'oceania' },
  { id: 'o4', name: 'Sulphur-crested Cockatoo', nameDutch: 'Kaketoe', habitats: ['forest', 'grassland'], foodCost: ['wheat', 'berry'], eggCapacity: 2, points: 7, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#F1C40F', expansion: 'oceania' },
  { id: 'o5', name: 'Emu', nameDutch: 'Emoe', habitats: ['grassland'], foodCost: ['wheat', 'wheat'], eggCapacity: 1, points: 8, powerText: 'Wanneer gespeeld: leg 3 eieren', effect: { type: 'lay_eggs', amount: 3 }, color: '#8B6914', expansion: 'oceania' },
  { id: 'o6', name: 'Kookaburra', nameDutch: 'Kookaburra', habitats: ['forest'], foodCost: ['rodent'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: stop 2 kaarten', effect: { type: 'tuck_cards', amount: 2 }, color: '#E67E22', expansion: 'oceania' },
  { id: 'o7', name: 'Fairy Wren', nameDutch: 'Elfenwinterkoning', habitats: ['grassland'], foodCost: ['worm'], eggCapacity: 4, points: 3, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#3498DB', expansion: 'oceania' },
  { id: 'o8', name: 'Wedge-tailed Eagle', nameDutch: 'Wigstaartarend', habitats: ['forest'], foodCost: ['rodent', 'rodent'], eggCapacity: 1, points: 9, powerText: 'Wanneer gespeeld: sla 2 eten op', effect: { type: 'cache_food', amount: 2 }, color: '#884EA0', expansion: 'oceania' },
  // Asia
  { id: 'a1', name: 'Red-crowned Crane', nameDutch: 'Mantsjoerische Kraanvogel', habitats: ['wetland', 'grassland'], foodCost: ['fish', 'wheat'], eggCapacity: 2, points: 9, powerText: 'Wanneer gespeeld: leg 3 eieren', effect: { type: 'lay_eggs', amount: 3 }, color: '#E74C3C', expansion: 'asia' },
  { id: 'a2', name: 'Oriental Magpie', nameDutch: 'Ekster', habitats: ['forest', 'grassland'], foodCost: ['worm', 'berry'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#2C3E50', expansion: 'asia' },
  { id: 'a3', name: 'Mandarin Duck', nameDutch: 'Mandarijneend', habitats: ['wetland'], foodCost: ['berry', 'wheat'], eggCapacity: 3, points: 6, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#E67E22', expansion: 'asia' },
  { id: 'a4', name: 'Japanese Crane', nameDutch: 'Japanse Kraanvogel', habitats: ['wetland'], foodCost: ['fish'], eggCapacity: 2, points: 7, powerText: 'Wanneer gespeeld: stop 2 kaarten', effect: { type: 'tuck_cards', amount: 2 }, color: '#BDC3C7', expansion: 'asia' },
  { id: 'a5', name: 'Himalayan Monal', nameDutch: 'Himalaya-monaal', habitats: ['forest'], foodCost: ['worm', 'berry'], eggCapacity: 3, points: 6, powerText: 'Wanneer gespeeld: +2 eten', effect: { type: 'gain_food', amount: 2 }, color: '#8E44AD', expansion: 'asia' },
  { id: 'a6', name: 'Siberian Crane', nameDutch: 'Siberische Kraanvogel', habitats: ['wetland', 'grassland'], foodCost: ['worm', 'fish'], eggCapacity: 2, points: 8, powerText: 'Wanneer gespeeld: leg 3 eieren', effect: { type: 'lay_eggs', amount: 3 }, color: '#BDC3C7', expansion: 'asia' },
  { id: 'a7', name: 'Demoiselle Crane', nameDutch: 'Jufferkraanvogel', habitats: ['grassland'], foodCost: ['wheat'], eggCapacity: 3, points: 5, powerText: 'Wanneer gespeeld: leg 2 eieren', effect: { type: 'lay_eggs', amount: 2 }, color: '#85C1E9', expansion: 'asia' },
  { id: 'a8', name: 'Amur Falcon', nameDutch: 'Amoervalk', habitats: ['forest'], foodCost: ['rodent', 'worm'], eggCapacity: 3, points: 6, powerText: 'Wanneer gespeeld: trek 2 kaarten', effect: { type: 'draw_cards', amount: 2 }, color: '#E74C3C', expansion: 'asia' },
];

export const ALL_BIRDS: BirdCard[] = [...BASE_BIRDS, ...EXPANSION_BIRDS];

// ─────────────────────────────────────────────────────────────────────────────
// Bonus cards
// ─────────────────────────────────────────────────────────────────────────────

export const BONUS_CARDS: BonusCard[] = [
  {
    id: 'bc1',
    name: 'Wetlanddeskundige',
    description: '1 punt per vogel in het moeras',
    condition: (p) => p.wetland.filter(Boolean).length,
  },
  {
    id: 'bc2',
    name: 'Ornitholoog',
    description: '2 punten per habitat met minstens 1 vogel',
    condition: (p) => {
      const count =
        (p.forest.filter(Boolean).length > 0 ? 1 : 0) +
        (p.grassland.filter(Boolean).length > 0 ? 1 : 0) +
        (p.wetland.filter(Boolean).length > 0 ? 1 : 0);
      return count * 2;
    },
  },
  {
    id: 'bc3',
    name: 'Vogelspotter',
    description: '3 punten per vogel met 5+ eiercapaciteit',
    condition: (p) => {
      const all = [...p.forest, ...p.grassland, ...p.wetland].filter(Boolean) as PlacedBird[];
      return all.filter((b) => b.card.eggCapacity >= 5).length * 3;
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Round goals
// ─────────────────────────────────────────────────────────────────────────────

export const ROUND_GOALS: RoundGoal[] = [
  {
    id: 'rg1',
    name: 'Vogels in bos',
    description: 'Meeste vogels in het bos',
    score: (p) => p.forest.filter(Boolean).length,
  },
  {
    id: 'rg2',
    name: 'Eieren',
    description: 'Meeste eieren op vogels',
    score: (p) =>
      [...p.forest, ...p.grassland, ...p.wetland]
        .filter(Boolean)
        .reduce((s, b) => s + (b as PlacedBird).eggs, 0),
  },
  {
    id: 'rg3',
    name: 'Wetland vogels',
    description: 'Meeste vogels in het moeras',
    score: (p) => p.wetland.filter(Boolean).length,
  },
  {
    id: 'rg4',
    name: 'Opgeslagen eten',
    description: 'Meeste opgeslagen eten op vogels',
    score: (p) =>
      [...p.forest, ...p.grassland, ...p.wetland]
        .filter(Boolean)
        .reduce((s, b) => s + (b as PlacedBird).cachedFood.length, 0),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Expansion info
// ─────────────────────────────────────────────────────────────────────────────

export const EXPANSION_INFO: Record<Expansion, { name: string; description: string; icon: string; price: string; cards: number }> = {
  european: { name: 'Europese Vogels', description: '81 nieuwe Europese vogels + nectarfood', icon: '🌍', price: '€3,99', cards: 8 },
  oceania: { name: 'Oceanië', description: '95 Australische & Nieuw-Zeelandse vogels', icon: '🦘', price: '€3,99', cards: 8 },
  asia: { name: 'Aziatische Vogels', description: '75 Aziatische vogels + extra bonuskaarten', icon: '🐼', price: '€3,99', cards: 8 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function addFood(food: Partial<Record<Food, number>>, type: Food, amount = 1): Partial<Record<Food, number>> {
  return { ...food, [type]: (food[type] ?? 0) + amount };
}

function spendFood(food: Partial<Record<Food, number>>, cost: Food[]): Partial<Record<Food, number>> | null {
  const result = { ...food };
  for (const f of cost) {
    if ((result[f] ?? 0) <= 0) return null;
    result[f] = (result[f] ?? 0) - 1;
  }
  return result;
}

function getHabitatRow(player: Player, habitat: Habitat): (PlacedBird | null)[] {
  if (habitat === 'forest') return player.forest;
  if (habitat === 'grassland') return player.grassland;
  return player.wetland;
}

function setHabitatRow(player: Player, habitat: Habitat, row: (PlacedBird | null)[]): Player {
  if (habitat === 'forest') return { ...player, forest: row };
  if (habitat === 'grassland') return { ...player, grassland: row };
  return { ...player, wetland: row };
}

function applyEffect(
  player: Player,
  effect: PowerEffect,
  deck: BirdCard[],
  placedBird: PlacedBird,
  habitat: Habitat,
  slotIndex: number,
): { player: Player; deck: BirdCard[]; placedBird: PlacedBird } {
  let p = { ...player };
  let d = [...deck];
  let pb = { ...placedBird };

  if (effect.type === 'gain_food') {
    const foodType = effect.foodType ?? pickBestFood(p);
    for (let i = 0; i < effect.amount; i++) {
      p = { ...p, food: addFood(p.food, foodType) };
    }
  } else if (effect.type === 'lay_eggs') {
    // Spread eggs across all placed birds
    const allHabitats: Habitat[] = ['forest', 'grassland', 'wetland'];
    let eggsLeft = effect.amount;
    for (const h of allHabitats) {
      if (eggsLeft <= 0) break;
      const row = getHabitatRow(p, h).map((b) => {
        if (!b || eggsLeft <= 0) return b;
        if (b.eggs < b.card.eggCapacity) {
          eggsLeft--;
          return { ...b, eggs: b.eggs + 1 };
        }
        return b;
      });
      p = setHabitatRow(p, h, row);
    }
    // Also try to add to the just-placed bird
    if (eggsLeft > 0 && pb.eggs < pb.card.eggCapacity) {
      const toAdd = Math.min(eggsLeft, pb.card.eggCapacity - pb.eggs);
      pb = { ...pb, eggs: pb.eggs + toAdd };
    }
  } else if (effect.type === 'draw_cards') {
    const drawn = d.splice(0, effect.amount);
    p = { ...p, hand: [...p.hand, ...drawn] };
  } else if (effect.type === 'tuck_cards') {
    // Draw from deck and tuck under bird
    const tucked = d.splice(0, effect.amount);
    pb = { ...pb, tucked: pb.tucked + tucked.length };
  } else if (effect.type === 'cache_food') {
    // Take food from player inventory and cache on bird
    const foods: Food[] = ['worm', 'wheat', 'berry', 'fish', 'rodent'];
    let cached = 0;
    for (const f of foods) {
      if (cached >= effect.amount) break;
      if ((p.food[f] ?? 0) > 0) {
        p = { ...p, food: { ...p.food, [f]: (p.food[f] ?? 0) - 1 } };
        pb = { ...pb, cachedFood: [...pb.cachedFood, f] };
        cached++;
      }
    }
    // Only cache what the player actually has — no free food
  }

  return { player: p, deck: d, placedBird: pb };
}

function pickBestFood(player: Player): Food {
  const foods: Food[] = ['worm', 'wheat', 'berry', 'fish', 'rodent'];
  // Pick the food type player has least of
  return foods.reduce((best, f) =>
    (player.food[f] ?? 0) < (player.food[best] ?? 0) ? f : best,
    foods[0],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// newGame
// ─────────────────────────────────────────────────────────────────────────────

export function newGame(names: string[], unlockedExpansions: Expansion[] = []): GameState {
  const expansionBirds = EXPANSION_BIRDS.filter(
    (b) => b.expansion && unlockedExpansions.includes(b.expansion),
  );
  const allBirds = shuffle([...BASE_BIRDS, ...expansionBirds]);

  let deck = [...allBirds];

  const tray: BirdCard[] = deck.splice(0, 3);

  const goals = shuffle([...ROUND_GOALS]).slice(0, 4);
  const bonusCardPool = shuffle([...BONUS_CARDS]);

  const players: Player[] = names.map((name, i) => {
    const hand = deck.splice(0, 5);
    return {
      name,
      hand,
      forest: [null, null, null, null, null],
      grassland: [null, null, null, null, null],
      wetland: [null, null, null, null, null],
      food: { worm: 1, wheat: 1, berry: 1, fish: 1, rodent: 1 },
      bonusCard: bonusCardPool[i % bonusCardPool.length],
      roundGoalTokens: [],
      totalScore: 0,
    };
  });

  return {
    phase: 'playing',
    players,
    currentPlayer: 0,
    round: 1,
    actionsLeft: players.map(() => ACTIONS_PER_ROUND[0]),
    birdDeck: deck,
    birdTray: tray,
    roundGoals: goals,
    message: `${names[0]} begint! Kies een actie.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// gainFood
// ─────────────────────────────────────────────────────────────────────────────

export function gainFood(gs: GameState, foodType: Food): GameState {
  const cp = gs.currentPlayer;
  const player = gs.players[cp];
  const newFood = addFood(player.food, foodType);
  const updatedPlayer = { ...player, food: newFood };
  const players = gs.players.map((p, i) => (i === cp ? updatedPlayer : p));

  return {
    ...gs,
    players,
    message: `${player.name} verzamelt ${FOOD_EMOJI[foodType]} ${foodType}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// layEgg
// ─────────────────────────────────────────────────────────────────────────────

export function layEgg(gs: GameState, target: { habitat: Habitat; slot: number }): GameState {
  const cp = gs.currentPlayer;
  let player = { ...gs.players[cp] };
  const row = getHabitatRow(player, target.habitat);
  const bird = row[target.slot];
  if (!bird) return gs;
  if (bird.eggs >= bird.card.eggCapacity) return gs;

  const newRow = row.map((b, i) => (i === target.slot && b ? { ...b, eggs: b.eggs + 1 } : b));
  player = setHabitatRow(player, target.habitat, newRow);
  const players = gs.players.map((p, i) => (i === cp ? player : p));

  return {
    ...gs,
    players,
    message: `${player.name} legt een ei op ${bird.card.nameDutch}.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// drawCard
// ─────────────────────────────────────────────────────────────────────────────

export function drawCard(gs: GameState, source: 'deck' | number): GameState {
  const cp = gs.currentPlayer;
  let player = { ...gs.players[cp] };
  let deck = [...gs.birdDeck];
  let tray = [...gs.birdTray];

  if (source === 'deck') {
    if (deck.length === 0) return gs;
    const card = deck.shift()!;
    player = { ...player, hand: [...player.hand, card] };
  } else {
    const idx = source as number;
    if (idx < 0 || idx >= tray.length || !tray[idx]) return gs;
    const card = tray[idx];
    player = { ...player, hand: [...player.hand, card] };
    // Refill from deck
    if (deck.length > 0) {
      tray[idx] = deck.shift()!;
    } else {
      tray.splice(idx, 1);
    }
  }

  const players = gs.players.map((p, i) => (i === cp ? player : p));

  return {
    ...gs,
    players,
    birdDeck: deck,
    birdTray: tray,
    message: `${player.name} trekt een vogelkaart.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// canPlayBird
// ─────────────────────────────────────────────────────────────────────────────

export function canPlayBird(
  gs: GameState,
  handIndex: number,
  habitat: Habitat,
  slotIndex: number,
): { canPlay: boolean; missingFood: Food[]; eggCost: number; missingEggs: number } {
  const player = gs.players[gs.currentPlayer];
  if (handIndex < 0 || handIndex >= player.hand.length) {
    return { canPlay: false, missingFood: [], eggCost: 0, missingEggs: 0 };
  }
  const card = player.hand[handIndex];
  const row = getHabitatRow(player, habitat);

  if (row[slotIndex] !== null) {
    return { canPlay: false, missingFood: [], eggCost: 0, missingEggs: 0 };
  }

  if (!card.habitats.includes(habitat)) {
    return { canPlay: false, missingFood: [], eggCost: 0, missingEggs: 0 };
  }

  // Egg cost = number of birds already in habitat
  const birdsInHabitat = row.filter(Boolean).length;
  const eggCost = birdsInHabitat;

  // Count available eggs in this habitat
  const availableEggs = row
    .filter(Boolean)
    .reduce((s, b) => s + (b as PlacedBird).eggs, 0);

  const missingEggs = Math.max(0, eggCost - availableEggs);

  // Check food cost
  const foodCopy = { ...player.food };
  const missingFood: Food[] = [];
  for (const f of card.foodCost) {
    if ((foodCopy[f] ?? 0) > 0) {
      foodCopy[f] = (foodCopy[f] ?? 0) - 1;
    } else {
      missingFood.push(f);
    }
  }

  const canPlay = missingFood.length === 0 && missingEggs === 0;
  return { canPlay, missingFood, eggCost, missingEggs };
}

// ─────────────────────────────────────────────────────────────────────────────
// playBird
// ─────────────────────────────────────────────────────────────────────────────

export function playBird(gs: GameState, handIndex: number, habitat: Habitat, slotIndex: number): GameState {
  const cp = gs.currentPlayer;
  const { canPlay, eggCost } = canPlayBird(gs, handIndex, habitat, slotIndex);
  if (!canPlay) return gs;

  let player = { ...gs.players[cp] };
  const card = player.hand[handIndex];

  // Deduct food cost
  let food = { ...player.food };
  for (const f of card.foodCost) {
    food[f] = (food[f] ?? 0) - 1;
  }
  player = { ...player, food };

  // Deduct egg cost from birds in habitat (remove eggs right to left)
  let eggsToRemove = eggCost;
  const row = [...getHabitatRow(player, habitat)];
  for (let i = row.length - 1; i >= 0 && eggsToRemove > 0; i--) {
    const b = row[i];
    if (!b) continue;
    const remove = Math.min(b.eggs, eggsToRemove);
    row[i] = { ...b, eggs: b.eggs - remove };
    eggsToRemove -= remove;
  }

  // Place bird in slot
  let placedBird: PlacedBird = { card, eggs: 0, tucked: 0, cachedFood: [] };

  // Remove from hand
  const hand = player.hand.filter((_, i) => i !== handIndex);
  player = { ...player, hand };
  player = setHabitatRow(player, habitat, row);

  // Apply "when played" effect
  let deck = [...gs.birdDeck];
  const result = applyEffect(player, card.effect, deck, placedBird, habitat, slotIndex);
  player = result.player;
  deck = result.deck;
  placedBird = result.placedBird;

  // Set the bird in the slot (after effect)
  const finalRow = [...getHabitatRow(player, habitat)];
  finalRow[slotIndex] = placedBird;
  player = setHabitatRow(player, habitat, finalRow);

  const players = gs.players.map((p, i) => (i === cp ? player : p));

  return {
    ...gs,
    players,
    birdDeck: deck,
    message: `${player.name} speelt ${card.nameDutch}! ${card.powerText}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// endAction
// ─────────────────────────────────────────────────────────────────────────────

function scoreRoundGoal(gs: GameState, round: number): GameState {
  if (round < 1 || round > gs.roundGoals.length) return gs;
  const goal = gs.roundGoals[round - 1];

  // Score each player
  const scores = gs.players.map((p) => goal.score(p));
  const maxScore = Math.max(...scores);

  // Tokens: 1st place gets 3, 2nd gets 1 (simplified for 2 players)
  const players = gs.players.map((p, i) => {
    let tokens = 0;
    if (scores[i] === maxScore && maxScore > 0) tokens = 3;
    else if (scores[i] > 0) tokens = 1;
    return { ...p, roundGoalTokens: [...p.roundGoalTokens, tokens] };
  });

  return { ...gs, players };
}

export function endAction(gs: GameState): GameState {
  const cp = gs.currentPlayer;
  const actionsLeft = [...gs.actionsLeft];
  actionsLeft[cp] = actionsLeft[cp] - 1;

  // Find next player who still has actions
  const numPlayers = gs.players.length;
  let next = (cp + 1) % numPlayers;
  let found = false;
  for (let i = 0; i < numPlayers; i++) {
    const idx = (cp + 1 + i) % numPlayers;
    if (actionsLeft[idx] > 0) {
      next = idx;
      found = true;
      break;
    }
  }

  // Check if all players are out of actions
  const allDone = actionsLeft.every((a) => a <= 0);

  if (allDone) {
    // End of round
    let nextGs = scoreRoundGoal({ ...gs, actionsLeft }, gs.round);

    if (gs.round >= 4) {
      // Calculate final scores
      const players = nextGs.players.map((p) => {
        const s = calcScore(p);
        return { ...p, totalScore: s.total };
      });
      return {
        ...nextGs,
        phase: 'gameover',
        players,
        message: 'Het spel is voorbij! Bekijk de eindscores.',
      };
    }

    const newRound = gs.round + 1;
    const newActionsLeft = gs.players.map(() => ACTIONS_PER_ROUND[newRound - 1]);

    return {
      ...nextGs,
      phase: 'playing',
      round: newRound,
      actionsLeft: newActionsLeft,
      currentPlayer: 0,
      message: `Ronde ${newRound} begint! ${nextGs.players[0].name} is aan de beurt.`,
    };
  }

  if (!found) {
    // All other players are out — current player keeps going if they still have actions
    const cpActions = actionsLeft[cp];
    if (cpActions > 0) {
      return { ...gs, actionsLeft, currentPlayer: cp, message: `${gs.players[cp].name} is aan de beurt.` };
    }
    // Shouldn't reach here (allDone handles it above), but fail-safe: end round
    return endAction({ ...gs, actionsLeft });
  }

  return {
    ...gs,
    actionsLeft,
    currentPlayer: next,
    message: `${gs.players[next].name} is aan de beurt.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// calcScore
// ─────────────────────────────────────────────────────────────────────────────

export function calcScore(player: Player): {
  birds: number;
  eggs: number;
  cached: number;
  tucked: number;
  roundGoals: number;
  bonus: number;
  total: number;
} {
  const allPlaced = [...player.forest, ...player.grassland, ...player.wetland].filter(Boolean) as PlacedBird[];

  const birds = allPlaced.reduce((s, b) => s + b.card.points, 0);
  const eggs = allPlaced.reduce((s, b) => s + b.eggs, 0);
  const cached = allPlaced.reduce((s, b) => s + b.cachedFood.length, 0);
  const tucked = allPlaced.reduce((s, b) => s + b.tucked, 0);
  const roundGoals = player.roundGoalTokens.reduce((s, t) => s + t, 0);
  const bonus = player.bonusCard.condition(player);
  const total = birds + eggs + cached + tucked + roundGoals + bonus;

  return { birds, eggs, cached, tucked, roundGoals, bonus, total };
}

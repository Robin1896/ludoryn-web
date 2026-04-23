export type Color = 'red' | 'yellow' | 'green' | 'blue';

export const ROW_NUMBERS: Record<Color, number[]> = {
  red:    [2,3,4,5,6,7,8,9,10,11,12],
  yellow: [2,3,4,5,6,7,8,9,10,11,12],
  green:  [12,11,10,9,8,7,6,5,4,3,2],
  blue:   [12,11,10,9,8,7,6,5,4,3,2],
};

export const ROW_COLOR_HEX: Record<Color, string> = {
  red: '#FF5C5C',
  yellow: '#FFB830',
  green: '#20D9A0',
  blue: '#5B7FFF',
};

export type Dice = {
  white1: number; white2: number;
  red: number; yellow: number; green: number; blue: number;
};

export type PlayerState = {
  name: string;
  crossed: Record<Color, number[]>;
  penalties: number;
};

export type GameState = {
  players: PlayerState[];
  dice: Dice | null;
  currentPlayer: number;
  phase: 'rolling' | 'choosing' | 'gameover';
  lockedRows: Color[];
  scores?: number[];
};

const SCORE_TABLE = [0,1,3,6,10,15,21,28,36,45,55,66,78];

export function calcScore(crossed: Record<Color, number[]>, penalties: number): number {
  const colors: Color[] = ['red','yellow','green','blue'];
  return colors.reduce((t, c) => t + (SCORE_TABLE[crossed[c].length] ?? 0), 0) - penalties * 5;
}

export function canCross(crossed: number[], rowNums: number[], num: number, isLocked: boolean): boolean {
  if (isLocked) return false;
  const idx = rowNums.indexOf(num);
  if (idx === -1) return false;
  if (crossed.includes(num)) return false;
  const lastCrossedIdx = crossed.length > 0 ? Math.max(...crossed.map(n => rowNums.indexOf(n))) : -1;
  if (idx <= lastCrossedIdx) return false;
  // Locking the last number requires >= 5 already crossed
  if (idx === rowNums.length - 1 && crossed.length < 5) return false;
  return true;
}

export function getWhiteSum(dice: Dice): number {
  return dice.white1 + dice.white2;
}

export function getColorOptions(dice: Dice, player: PlayerState, lockedRows: Color[]): { color: Color; num: number }[] {
  const options: { color: Color; num: number }[] = [];
  const colors: Color[] = ['red','yellow','green','blue'];
  for (const color of colors) {
    if (lockedRows.includes(color)) continue;
    const colorVal = dice[color];
    for (const white of [dice.white1, dice.white2]) {
      const sum = white + colorVal;
      if (sum >= 2 && sum <= 12 && canCross(player.crossed[color], ROW_NUMBERS[color], sum, false)) {
        if (!options.find(o => o.color === color && o.num === sum)) {
          options.push({ color, num: sum });
        }
      }
    }
  }
  return options;
}

export function rollDice(): Dice {
  return {
    white1: Math.ceil(Math.random() * 6),
    white2: Math.ceil(Math.random() * 6),
    red:    Math.ceil(Math.random() * 6),
    yellow: Math.ceil(Math.random() * 6),
    green:  Math.ceil(Math.random() * 6),
    blue:   Math.ceil(Math.random() * 6),
  };
}

export function applyCross(player: PlayerState, color: Color, num: number, lockedRows: Color[]): { player: PlayerState; newlyLocked: Color | null } {
  if (!canCross(player.crossed[color], ROW_NUMBERS[color], num, lockedRows.includes(color))) {
    return { player, newlyLocked: null };
  }
  const newCrossed = { ...player.crossed, [color]: [...player.crossed[color], num] };
  const row = ROW_NUMBERS[color];
  const isLastNum = num === row[row.length - 1];
  const newlyLocked = isLastNum && newCrossed[color].length >= 6 ? color : null;
  return { player: { ...player, crossed: newCrossed }, newlyLocked };
}

export function newGame(names: string[]): GameState {
  const empty: Record<Color, number[]> = { red: [], yellow: [], green: [], blue: [] };
  return {
    players: names.map(name => ({ name, crossed: { ...empty, red:[], yellow:[], green:[], blue:[] }, penalties: 0 })),
    dice: null,
    currentPlayer: 0,
    phase: 'rolling',
    lockedRows: [],
  };
}

export function checkGameOver(state: GameState): boolean {
  if (state.lockedRows.length >= 2) return true;
  if (state.players.some(p => p.penalties >= 4)) return true;
  return false;
}

export function finalScores(state: GameState): number[] {
  return state.players.map(p => calcScore(p.crossed, p.penalties));
}

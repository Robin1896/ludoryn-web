export type TileType = "forest" | "pasture" | "grain" | "hills" | "mountains" | "desert" | "water";
export type HarborType = "3:1" | "2:1-wood" | "2:1-wool" | "2:1-grain" | "2:1-brick" | "2:1-ore";

export interface BoardTile {
  q: number;
  r: number;
  type: TileType;
  number?: number;
  harbor?: HarborType;
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Officiële Catan verdeling: 19 landtiles
const TILE_DISTRIBUTION: TileType[] = [
  "forest", "forest", "forest", "forest",
  "pasture", "pasture", "pasture", "pasture",
  "grain",   "grain",   "grain",   "grain",
  "hills",    "hills",    "hills",
  "mountains","mountains","mountains",
  "desert",
];

// Officiële nummertokens: 18 (1 per niet-woestijn tile), geen 7
const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// Ring 0 t/m 2: 19 landposities (axial coördinaten)
const LAND_POSITIONS = [
  { q: 0,  r: 0  },
  { q: 1,  r: -1 }, { q: 1,  r: 0  }, { q: 0,  r: 1  },
  { q: -1, r: 1  }, { q: -1, r: 0  }, { q: 0,  r: -1 },
  { q: 2,  r: -2 }, { q: 2,  r: -1 }, { q: 2,  r: 0  },
  { q: 1,  r: 1  }, { q: 0,  r: 2  }, { q: -1, r: 2  },
  { q: -2, r: 2  }, { q: -2, r: 1  }, { q: -2, r: 0  },
  { q: -1, r: -1 }, { q: 0,  r: -2 }, { q: 1,  r: -2 },
];

// Ring 3: 18 watertiles — elke 2e heeft een haven (9 havens totaal)
export const WATER_POSITIONS: { q: number; r: number }[] = [
  { q: -3, r: 3  }, { q: -2, r: 3  }, // 0, 1
  { q: -1, r: 3  }, { q: 0,  r: 3  }, // 2, 3
  { q: 1,  r: 2  }, { q: 2,  r: 1  }, // 4, 5
  { q: 3,  r: 0  }, { q: 3,  r: -1 }, // 6, 7
  { q: 3,  r: -2 }, { q: 3,  r: -3 }, // 8, 9
  { q: 2,  r: -3 }, { q: 1,  r: -3 }, // 10, 11
  { q: 0,  r: -3 }, { q: -1, r: -2 }, // 12, 13
  { q: -2, r: -1 }, { q: -3, r: 0  }, // 14, 15
  { q: -3, r: 1  }, { q: -3, r: 2  }, // 16, 17
];

// Standaard Catan haven layout: 9 havens op vaste posities
const HARBOR_MAP: Record<string, HarborType> = {
  "-2,3":  "2:1-wool",
  "0,3":   "3:1",
  "2,1":   "2:1-ore",
  "3,-1":  "3:1",
  "3,-3":  "2:1-grain",
  "1,-3":  "3:1",
  "-1,-2": "2:1-brick",
  "-3,0":  "2:1-wood",
  "-3,2":  "3:1",
};

export function generateBoard(): BoardTile[] {
  const types  = shuffle(TILE_DISTRIBUTION);
  const numbers = shuffle(NUMBER_TOKENS);

  let numIdx = 0;
  const land: BoardTile[] = LAND_POSITIONS.map((pos, i) => {
    const type = types[i];
    return {
      ...pos,
      type,
      number: type !== "desert" ? numbers[numIdx++] : undefined,
    };
  });

  const water: BoardTile[] = WATER_POSITIONS.map((pos) => ({
    ...pos,
    type: "water" as TileType,
    harbor: HARBOR_MAP[`${pos.q},${pos.r}`],
  }));

  return [...land, ...water];
}

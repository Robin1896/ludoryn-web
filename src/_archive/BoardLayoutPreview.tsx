"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import HexTile from "@/components/HexTile";
import NumberToken from "@/components/NumberToken";
import TileModel, { TILE_MODEL_URLS } from "@/components/TileModel";
import type { TileType } from "@/lib/board";

const HEX_SIZE = 1.08;

const TILE_COLORS: Record<string, string> = {
  forest:    "#2d6a2d",
  pasture:   "#7ec850",
  grain:     "#e8c84a",
  hills:     "#c0522a",
  mountains: "#888888",
  desert:    "#d4b483",
  water:     "#1a6fad",
};

const LAND_POSITIONS = [
  { q: 0,  r: 0  },
  { q: 1,  r: -1 }, { q: 1,  r: 0  }, { q: 0,  r: 1  },
  { q: -1, r: 1  }, { q: -1, r: 0  }, { q: 0,  r: -1 },
  { q: 2,  r: -2 }, { q: 2,  r: -1 }, { q: 2,  r: 0  },
  { q: 1,  r: 1  }, { q: 0,  r: 2  }, { q: -1, r: 2  },
  { q: -2, r: 2  }, { q: -2, r: 1  }, { q: -2, r: 0  },
  { q: -1, r: -1 }, { q: 0,  r: -2 }, { q: 1,  r: -2 },
];

const WATER_POSITIONS = [
  { q: -3, r: 3  }, { q: -2, r: 3  }, { q: -1, r: 3  }, { q: 0,  r: 3  },
  { q: 1,  r: 2  }, { q: 2,  r: 1  }, { q: 3,  r: 0  }, { q: 3,  r: -1 },
  { q: 3,  r: -2 }, { q: 3,  r: -3 }, { q: 2,  r: -3 }, { q: 1,  r: -3 },
  { q: 0,  r: -3 }, { q: -1, r: -2 }, { q: -2, r: -1 }, { q: -3, r: 0  },
  { q: -3, r: 1  }, { q: -3, r: 2  },
];

const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hexToPixel(q: number, r: number): [number, number, number] {
  return [
    HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    0,
    HEX_SIZE * 1.5 * r,
  ];
}

// 5 voorgedefinieerde bord layouts — elk met een uniek thema
// Verdeling is altijd Catan-conform: 4 forest, 4 pasture, 4 grain, 3 hills, 3 mountains, 1 desert
export const BOARD_VARIANTS = [
  {
    name: "Gebalanceerd",
    subtitle: "Klassieke verdeling, woestijn in het midden",
    emoji: "⚖️",
    accentColor: "#f5d580",
    bg: "from-amber-950/60 to-slate-950",
    // Woestijn centraal, alle resources goed verspreid
    types: [
      "desert",
      "forest","pasture","grain","hills","mountains","grain",
      "forest","pasture","mountains","grain","hills","forest",
      "pasture","grain","hills","mountains","forest","pasture",
    ] as TileType[],
    numberSeed: 42,
  },
  {
    name: "Bergvesting",
    subtitle: "Erts geconcentreerd in het centrum, groen aan de rand",
    emoji: "⛰️",
    accentColor: "#aaaaaa",
    bg: "from-slate-700/50 to-slate-950",
    // Mountains + hills clustered in center/inner ring
    types: [
      "mountains",
      "mountains","hills","mountains","hills","grain","hills",
      "forest","pasture","grain","forest","pasture","grain",
      "forest","pasture","grain","forest","pasture","desert",
    ] as TileType[],
    numberSeed: 77,
  },
  {
    name: "Groene Oase",
    subtitle: "Bossen en weiden domineren het centrum",
    emoji: "🌿",
    accentColor: "#7ec850",
    bg: "from-green-950/60 to-slate-950",
    // Forest + pasture in center, ore/hills on the outside
    types: [
      "forest",
      "pasture","forest","pasture","forest","pasture","forest",
      "pasture","grain","hills","grain","mountains","grain",
      "hills","grain","hills","mountains","mountains","desert",
    ] as TileType[],
    numberSeed: 13,
  },
  {
    name: "Goudkoorts",
    subtitle: "Graan en hout richrijk — voor snelle steden",
    emoji: "🌾",
    accentColor: "#e8c84a",
    bg: "from-yellow-900/60 to-slate-950",
    // Grain + forest heavy in center, hills/mountains on edges
    types: [
      "grain",
      "forest","grain","forest","grain","forest","grain",
      "forest","pasture","hills","pasture","mountains","pasture",
      "hills","pasture","hills","mountains","mountains","desert",
    ] as TileType[],
    numberSeed: 99,
  },
  {
    name: "Lavaveld",
    subtitle: "Heuvels en bergen domineren, schaarse groene tegels",
    emoji: "🌋",
    accentColor: "#e06030",
    bg: "from-red-950/60 to-slate-950",
    // Hills/mountains dominant, very little forest/grain
    types: [
      "hills",
      "hills","hills","mountains","grain","mountains","pasture",
      "mountains","forest","grain","pasture","forest","grain",
      "pasture","grain","forest","pasture","forest","desert",
    ] as TileType[],
    numberSeed: 55,
  },
];

function MiniBoard({ types, numberSeed }: { types: TileType[]; numberSeed: number }) {
  const numbers = useMemo(() => seededShuffle(NUMBER_TOKENS, numberSeed), [numberSeed]);

  let numIdx = 0;
  const tiles = LAND_POSITIONS.map((pos, i) => {
    const type = types[i];
    return { ...pos, type, number: type !== "desert" ? numbers[numIdx++] : undefined };
  });

  return (
    <>
      {/* Waterring */}
      {WATER_POSITIONS.map((pos, i) => {
        const [x, , z] = hexToPixel(pos.q, pos.r);
        return (
          <HexTile key={`w${i}`} position={[x, -0.07, z]} color={TILE_COLORS.water} height={0.1} seed={i * 7} />
        );
      })}

      {/* Landtiles */}
      {tiles.map((tile, i) => {
        const [x, , z] = hexToPixel(tile.q, tile.r);
        return (
          <group key={i}>
            <HexTile position={[x, 0, z]} color={TILE_COLORS[tile.type]} height={0.28} seed={i * 13 + numberSeed} />
            {TILE_MODEL_URLS[tile.type] && (
              <TileModel type={tile.type} scale={0.9} position={[x, 0.28, z]} />
            )}
            {tile.number && (
              <NumberToken position={[x, 0.14, z]} number={tile.number} />
            )}
          </group>
        );
      })}

      <ContactShadows position={[0, -0.05, 0]} opacity={0.25} blur={2} far={3} />
    </>
  );
}

interface Props {
  variantIndex: number;
}

export default function BoardLayoutPreview({ variantIndex }: Props) {
  const variant = BOARD_VARIANTS[variantIndex % BOARD_VARIANTS.length];

  return (
    <Canvas
      camera={{ position: [0, 10, 8], fov: 42 }}
      shadows
      gl={{ antialias: true, powerPreference: "high-performance" }}
      performance={{ min: 0.5 }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[5, 10, 5]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 4, -3]} intensity={0.25} color="#8899cc" />

        <MiniBoard types={variant.types} numberSeed={variant.numberSeed} />

        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={18}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 10}
          maxPolarAngle={Math.PI / 2.4}
        />
      </Suspense>
    </Canvas>
  );
}

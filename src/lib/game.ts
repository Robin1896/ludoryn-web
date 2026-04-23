import type { BoardGraph } from "@/lib/vertices";
import type { BoardTile, HarborType } from "@/lib/board";

export const PLAYER_COLORS = ["#cc3333", "#3377cc", "#dd8800", "#cccccc"];
export const PLAYER_NAMES  = ["Rood", "Blauw", "Oranje", "Wit"];

export type ResourceType = "wood" | "wool" | "grain" | "brick" | "ore";
export type Phase = "setup1" | "setup2" | "main";

export const TILE_RESOURCE: Partial<Record<string, ResourceType>> = {
  forest:    "wood",
  pasture:   "wool",
  grain:     "grain",
  hills:     "brick",
  mountains: "ore",
};

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  wood:  "Hout",
  wool:  "Wol",
  grain: "Graan",
  brick: "Steen",
  ore:   "Erts",
};

export const RESOURCE_COLOR: Record<ResourceType, string> = {
  wood:  "#2d6a2d",
  wool:  "#7ec850",
  grain: "#e8c84a",
  brick: "#c0522a",
  ore:   "#888888",
};

export const RESOURCE_EMOJI: Record<ResourceType, string> = {
  wood:  "🪵",
  wool:  "🧶",
  grain: "🌾",
  brick: "🧱",
  ore:   "⛰️",
};

export type Resources = Record<ResourceType, number>;

export function emptyResources(): Resources {
  return { wood: 0, wool: 0, grain: 0, brick: 0, ore: 0 };
}

export const BUILD_COST: Record<"road" | "settlement" | "city", Resources> = {
  road:       { wood: 1, brick: 1, wool: 0, grain: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, wool: 1, grain: 1, ore: 0 },
  city:       { wood: 0, brick: 0, wool: 0, grain: 2, ore: 3 },
};

export function canAfford(resources: Resources, cost: Resources): boolean {
  return (Object.keys(cost) as ResourceType[]).every((r) => resources[r] >= cost[r]);
}

export function deductCost(resources: Resources, cost: Resources): Resources {
  const next = { ...resources };
  (Object.keys(cost) as ResourceType[]).forEach((r) => { next[r] -= cost[r]; });
  return next;
}

export interface Settlement {
  player: number;
  type: "village" | "city";
}

export interface StolenInfo {
  victim: number;
  resource: ResourceType;
}

export interface GameState {
  numPlayers: number;
  currentPlayer: number;
  phase: Phase;
  setupStep: "settlement" | "road";
  lastSettlement: string | null;
  settlements: Record<string, Settlement>;
  roads: Record<string, number>;
  buildMode: "settlement" | "road" | "city" | null;
  resources: Resources[];
  lastDice: [number, number] | null;
  // Ruiter
  robberQ: number;
  robberR: number;
  awaitingRobber: boolean;
  lastStolen: StolenInfo | null;
  lastDiscards: number[];
  // Langste weg
  longestRoadOwner: number | null;
}

export const WIN_VP = 10;

export function getVP(state: GameState): number[] {
  const vp = Array(state.numPlayers).fill(0) as number[];
  for (const s of Object.values(state.settlements)) {
    vp[s.player] += s.type === "city" ? 2 : 1;
  }
  if (state.longestRoadOwner !== null) {
    vp[state.longestRoadOwner] += 2;
  }
  return vp;
}

export function initialState(numPlayers: number, tiles: BoardTile[]): GameState {
  const desert = tiles.find((t) => t.type === "desert");
  return {
    numPlayers,
    currentPlayer: 0,
    phase: "setup1",
    setupStep: "settlement",
    lastSettlement: null,
    settlements: {},
    roads: {},
    buildMode: "settlement",
    resources: Array.from({ length: numPlayers }, emptyResources),
    lastDice: null,
    robberQ: desert?.q ?? 0,
    robberR: desert?.r ?? 0,
    awaitingRobber: false,
    lastStolen: null,
    lastDiscards: [],
    longestRoadOwner: null,
  };
}

export function rollDice(): [number, number] {
  return [
    Math.ceil(Math.random() * 6),
    Math.ceil(Math.random() * 6),
  ];
}

function getTileVertexKeys(q: number, r: number, graph: BoardGraph): string[] {
  const { HEX_SIZE } = require("@/lib/vertices");
  const cx = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const cz = HEX_SIZE * 1.5 * r;
  return graph.vertices
    .filter((v) => {
      const dx = v.x - cx;
      const dz = v.z - cz;
      return Math.sqrt(dx * dx + dz * dz) < HEX_SIZE * 1.1;
    })
    .map((v) => v.key);
}

// Geef resources voor alle tiles rondom een vertex (voor setup2)
function getSetupResourcesForVertex(vertexKey: string, tiles: BoardTile[], graph: BoardGraph): Resources {
  const resources = emptyResources();
  for (const tile of tiles) {
    const resource = TILE_RESOURCE[tile.type];
    if (!resource) continue;
    const vKeys = getTileVertexKeys(tile.q, tile.r, graph);
    if (vKeys.includes(vertexKey)) {
      resources[resource]++;
    }
  }
  return resources;
}

export function distributeResources(
  state: GameState,
  roll: number,
  tiles: BoardTile[],
  graph: BoardGraph,
): GameState {
  const newResources = state.resources.map((r) => ({ ...r }));

  for (const tile of tiles) {
    if (tile.number !== roll) continue;
    if (tile.q === state.robberQ && tile.r === state.robberR) continue;
    const resource = TILE_RESOURCE[tile.type];
    if (!resource) continue;

    const tileVertexKeys = getTileVertexKeys(tile.q, tile.r, graph);
    for (const vKey of tileVertexKeys) {
      const settlement = state.settlements[vKey];
      if (!settlement) continue;
      const amount = settlement.type === "city" ? 2 : 1;
      newResources[settlement.player][resource] += amount;
    }
  }

  return { ...state, resources: newResources };
}

// ── Langste weg ─────────────────────────────────────────────────────────────

function buildRoadAdjacency(
  roads: Record<string, number>,
  player: number,
  graph: BoardGraph,
): Map<string, { neighbor: string; edgeKey: string }[]> {
  const adj = new Map<string, { neighbor: string; edgeKey: string }[]>();
  for (const edge of graph.edges) {
    if (roads[edge.key] !== player) continue;
    if (!adj.has(edge.v1)) adj.set(edge.v1, []);
    if (!adj.has(edge.v2)) adj.set(edge.v2, []);
    adj.get(edge.v1)!.push({ neighbor: edge.v2, edgeKey: edge.key });
    adj.get(edge.v2)!.push({ neighbor: edge.v1, edgeKey: edge.key });
  }
  return adj;
}

function dfsLongest(
  current: string,
  usedEdges: Set<string>,
  adj: Map<string, { neighbor: string; edgeKey: string }[]>,
  settlements: Record<string, Settlement>,
  player: number,
): number {
  let max = 0;
  for (const { neighbor, edgeKey } of (adj.get(current) ?? [])) {
    if (usedEdges.has(edgeKey)) continue;
    // Weg geblokkeerd door tegenstander
    const occ = settlements[neighbor];
    if (occ && occ.player !== player) continue;
    usedEdges.add(edgeKey);
    const len = 1 + dfsLongest(neighbor, usedEdges, adj, settlements, player);
    max = Math.max(max, len);
    usedEdges.delete(edgeKey);
  }
  return max;
}

export function calculateLongestRoad(player: number, state: GameState, graph: BoardGraph): number {
  const adj = buildRoadAdjacency(state.roads, player, graph);
  let max = 0;
  for (const start of adj.keys()) {
    const len = dfsLongest(start, new Set(), adj, state.settlements, player);
    max = Math.max(max, len);
  }
  return max;
}

export function updateLongestRoad(state: GameState, graph: BoardGraph): GameState {
  const lengths = Array.from({ length: state.numPlayers }, (_, i) =>
    calculateLongestRoad(i, state, graph),
  );
  const max = Math.max(...lengths);
  if (max < 5) return { ...state, longestRoadOwner: null };

  // Huidige eigenaar behoudt bij gelijkspel
  const { longestRoadOwner } = state;
  if (longestRoadOwner !== null && lengths[longestRoadOwner] === max) {
    return state;
  }

  const newOwner = lengths.indexOf(max);
  return { ...state, longestRoadOwner: newOwner };
}

// ── Haven handelstarieven ────────────────────────────────────────────────────

export function getTradeRatios(
  player: number,
  state: GameState,
  tiles: BoardTile[],
  graph: BoardGraph,
): Record<ResourceType, number> {
  const ratios: Record<ResourceType, number> = { wood: 4, wool: 4, grain: 4, brick: 4, ore: 4 };

  for (const tile of tiles) {
    if (!tile.harbor) continue;
    const harborVertices = getTileVertexKeys(tile.q, tile.r, graph);
    const hasSettlement = harborVertices.some((vk) => state.settlements[vk]?.player === player);
    if (!hasSettlement) continue;

    if (tile.harbor === "3:1") {
      (Object.keys(ratios) as ResourceType[]).forEach((r) => {
        ratios[r] = Math.min(ratios[r], 3);
      });
    } else {
      const res = tile.harbor.split("-")[1] as ResourceType;
      ratios[res] = Math.min(ratios[res], 2);
    }
  }

  return ratios;
}

export function bankTrade(
  state: GameState,
  give: ResourceType,
  receive: ResourceType,
  ratio: number,
): GameState {
  const newResources = state.resources.map((r, i) => {
    if (i !== state.currentPlayer) return { ...r };
    const next = { ...r };
    next[give] -= ratio;
    next[receive]++;
    return next;
  });
  return { ...state, resources: newResources };
}

// ── Ruiter ──────────────────────────────────────────────────────────────────

export function activateRobber(state: GameState): GameState {
  const discards: number[] = [];
  const newResources = state.resources.map((res, p) => {
    const total = Object.values(res).reduce((a, b) => a + b, 0);
    if (total <= 7) return { ...res };
    discards.push(p);
    const toDiscard = Math.floor(total / 2);
    const next = { ...res };
    const types = (Object.keys(next) as ResourceType[]).filter((t) => next[t] > 0);
    let dropped = 0;
    while (dropped < toDiscard && types.length > 0) {
      const idx = Math.floor(Math.random() * types.length);
      const t = types[idx];
      next[t]--;
      if (next[t] === 0) types.splice(idx, 1);
      dropped++;
    }
    return next;
  });

  return {
    ...state,
    awaitingRobber: true,
    resources: newResources,
    lastDiscards: discards,
    lastStolen: null,
  };
}

export function moveRobber(
  state: GameState,
  q: number,
  r: number,
  graph: BoardGraph,
): GameState {
  const vKeys = getTileVertexKeys(q, r, graph);
  const candidates = new Set<number>();
  for (const vk of vKeys) {
    const s = state.settlements[vk];
    if (s && s.player !== state.currentPlayer) candidates.add(s.player);
  }

  const newResources = state.resources.map((r) => ({ ...r }));
  let lastStolen: StolenInfo | null = null;

  const candidateList = Array.from(candidates);
  if (candidateList.length > 0) {
    const victim = candidateList[Math.floor(Math.random() * candidateList.length)];
    const victimRes = newResources[victim];
    const available = (Object.keys(victimRes) as ResourceType[]).filter((t) => victimRes[t] > 0);
    if (available.length > 0) {
      const resource = available[Math.floor(Math.random() * available.length)];
      newResources[victim][resource]--;
      newResources[state.currentPlayer][resource]++;
      lastStolen = { victim, resource };
    }
  }

  return {
    ...state,
    robberQ: q,
    robberR: r,
    awaitingRobber: false,
    resources: newResources,
    lastStolen,
  };
}

// ── Validatie ────────────────────────────────────────────────────────────────

export function validSettlements(state: GameState, graph: BoardGraph): string[] {
  return graph.vertices
    .filter((v) => {
      if (state.settlements[v.key] !== undefined) return false;
      const adj = graph.vertexAdj.get(v.key) ?? [];
      if (adj.some((k) => state.settlements[k] !== undefined)) return false;
      if (state.phase === "main") {
        const edges = graph.vertexEdges.get(v.key) ?? [];
        return edges.some((ek) => state.roads[ek] === state.currentPlayer);
      }
      return true;
    })
    .map((v) => v.key);
}

export function validRoads(state: GameState, graph: BoardGraph): string[] {
  return graph.edges
    .filter((e) => {
      if (state.roads[e.key] !== undefined) return false;
      if (state.phase === "setup1" || state.phase === "setup2") {
        if (!state.lastSettlement) return false;
        return e.v1 === state.lastSettlement || e.v2 === state.lastSettlement;
      }
      const adjToOwn =
        state.settlements[e.v1]?.player === state.currentPlayer ||
        state.settlements[e.v2]?.player === state.currentPlayer;
      if (adjToOwn) return true;
      const allEdges = [
        ...(graph.vertexEdges.get(e.v1) ?? []),
        ...(graph.vertexEdges.get(e.v2) ?? []),
      ];
      return allEdges.some((ek) => ek !== e.key && state.roads[ek] === state.currentPlayer);
    })
    .map((e) => e.key);
}

// ── Bouwen ───────────────────────────────────────────────────────────────────

export function placeSettlement(state: GameState, key: string): GameState {
  const newResources = state.resources.map((r, i) =>
    i === state.currentPlayer && state.phase === "main"
      ? deductCost(r, BUILD_COST.settlement)
      : { ...r }
  );
  return {
    ...state,
    settlements: { ...state.settlements, [key]: { player: state.currentPlayer, type: "village" } },
    lastSettlement: key,
    setupStep: "road",
    buildMode: "road",
    resources: newResources,
  };
}

export function upgradeToCity(state: GameState, key: string): GameState {
  const newResources = state.resources.map((r, i) =>
    i === state.currentPlayer ? deductCost(r, BUILD_COST.city) : { ...r }
  );
  return {
    ...state,
    settlements: { ...state.settlements, [key]: { player: state.currentPlayer, type: "city" } },
    resources: newResources,
  };
}

export function placeRoad(
  state: GameState,
  key: string,
  tiles?: BoardTile[],
  graph?: BoardGraph,
): GameState {
  const newRoads = { ...state.roads, [key]: state.currentPlayer };
  const { numPlayers, currentPlayer, phase } = state;

  let nextPlayer = currentPlayer;
  let nextPhase: Phase = phase;

  if (phase === "setup1") {
    if (currentPlayer < numPlayers - 1) { nextPlayer = currentPlayer + 1; }
    else { nextPhase = "setup2"; }
  } else if (phase === "setup2") {
    if (currentPlayer > 0) { nextPlayer = currentPlayer - 1; }
    else { nextPhase = "main"; nextPlayer = 0; }
  } else {
    nextPlayer = (currentPlayer + 1) % numPlayers;
  }

  // Resources aftrekken bij main fase
  let newResources = state.resources.map((r, i) =>
    i === currentPlayer && phase === "main"
      ? deductCost(r, BUILD_COST.road)
      : { ...r }
  );

  // Setup2: resources geven voor het 2e dorp
  if (phase === "setup2" && state.lastSettlement && tiles && graph) {
    const bonus = getSetupResourcesForVertex(state.lastSettlement, tiles, graph);
    newResources = newResources.map((r, i) => {
      if (i !== currentPlayer) return r;
      const next = { ...r };
      (Object.keys(bonus) as ResourceType[]).forEach((res) => { next[res] += bonus[res]; });
      return next;
    });
  }

  let next: GameState = {
    ...state,
    roads: newRoads,
    currentPlayer: nextPlayer,
    phase: nextPhase,
    setupStep: "settlement",
    lastSettlement: null,
    buildMode: nextPhase === "main" ? null : "settlement",
    resources: newResources,
  };

  // Langste weg bijwerken
  if (graph) {
    next = updateLongestRoad(next, graph);
  }

  return next;
}

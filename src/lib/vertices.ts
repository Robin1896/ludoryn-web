import type { BoardTile } from "@/lib/board";

export const HEX_SIZE = 1.08;

export interface Vertex {
  key: string;
  x: number;
  z: number;
}

export interface Edge {
  key: string;
  v1: string;
  v2: string;
  mx: number;
  mz: number;
  angle: number;
  length: number;
}

export interface BoardGraph {
  vertices: Vertex[];
  edges: Edge[];
  vertexAdj: Map<string, string[]>;
  vertexEdges: Map<string, string[]>;
  edgeMap: Map<string, Edge>;
}

function hexToPixel(q: number, r: number): { x: number; z: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const z = HEX_SIZE * (1.5 * r);
  return { x, z };
}

function cornerAngle(i: number): number {
  return (i / 6) * 2 * Math.PI - Math.PI / 6;
}

export function buildGraph(tiles: BoardTile[]): BoardGraph {
  const landTiles = tiles.filter((t) => t.type !== "water");

  const vertexMap = new Map<string, Vertex>();
  // tile index -> list of 6 vertex keys in order
  const tileVertexKeys: string[][] = [];

  for (const tile of landTiles) {
    const { x: cx, z: cz } = hexToPixel(tile.q, tile.r);
    const keys: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = cornerAngle(i);
      const vx = cx + HEX_SIZE * Math.cos(angle);
      const vz = cz + HEX_SIZE * Math.sin(angle);
      const key = `${vx.toFixed(2)},${vz.toFixed(2)}`;
      if (!vertexMap.has(key)) {
        vertexMap.set(key, { key, x: vx, z: vz });
      }
      keys.push(key);
    }
    tileVertexKeys.push(keys);
  }

  const edgeMap = new Map<string, Edge>();
  const vertexAdj = new Map<string, string[]>();
  const vertexEdges = new Map<string, string[]>();

  const ensureAdj = (k: string) => {
    if (!vertexAdj.has(k)) vertexAdj.set(k, []);
    if (!vertexEdges.has(k)) vertexEdges.set(k, []);
  };

  for (const keys of tileVertexKeys) {
    for (let i = 0; i < 6; i++) {
      const k1 = keys[i];
      const k2 = keys[(i + 1) % 6];
      const edgeKey = [k1, k2].sort().join("|");

      ensureAdj(k1);
      ensureAdj(k2);

      if (!edgeMap.has(edgeKey)) {
        const v1 = vertexMap.get(k1)!;
        const v2 = vertexMap.get(k2)!;
        const mx = (v1.x + v2.x) / 2;
        const mz = (v1.z + v2.z) / 2;
        const dx = v2.x - v1.x;
        const dz = v2.z - v1.z;
        const angle = -Math.atan2(dz, dx);
        const length = Math.sqrt(dx * dx + dz * dz);
        edgeMap.set(edgeKey, { key: edgeKey, v1: k1, v2: k2, mx, mz, angle, length });

        // adjacency
        const adj1 = vertexAdj.get(k1)!;
        if (!adj1.includes(k2)) adj1.push(k2);
        const adj2 = vertexAdj.get(k2)!;
        if (!adj2.includes(k1)) adj2.push(k1);

        vertexEdges.get(k1)!.push(edgeKey);
        vertexEdges.get(k2)!.push(edgeKey);
      }
    }
  }

  return {
    vertices: Array.from(vertexMap.values()),
    edges: Array.from(edgeMap.values()),
    vertexAdj,
    vertexEdges,
    edgeMap,
  };
}

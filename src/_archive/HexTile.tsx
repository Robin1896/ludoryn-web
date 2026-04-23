"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface HexTileProps {
  position: [number, number, number];
  color: string;
  height?: number;
  seed?: number;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildLowPolyHex(radius = 1, baseHeight = 0.3, seed = 0): THREE.BufferGeometry {
  const rng = seededRng(seed);
  const sides = 6;
  const halfH = baseHeight / 2;
  const bumpScale = 0.18;
  const midRadius = radius * 0.52;

  // Buitenring, middenring en centrum
  const topY    = Array.from({ length: sides }, () => halfH + (rng() - 0.4) * bumpScale);
  const midY    = Array.from({ length: sides }, () => halfH + (rng() - 0.3) * bumpScale * 0.8);
  const centerY = halfH + rng() * bumpScale * 0.4;

  const angle = (i: number) => (i / sides) * Math.PI * 2 - Math.PI / 6;

  const positions: number[] = [];
  const bottomY = -halfH;

  const addTri = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
  ) => positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);

  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;

    // Buitenring vertices
    const ex0 = Math.cos(angle(i)) * radius,  ez0 = Math.sin(angle(i)) * radius;
    const ex1 = Math.cos(angle(j)) * radius,  ez1 = Math.sin(angle(j)) * radius;

    // Middenring vertices (halverwege hoek, halverwege radius)
    const midAngleI = angle(i) + (angle(j) - angle(i)) * 0.0;
    const midAngleJ = angle(j);
    const mx0 = Math.cos(midAngleI) * midRadius, mz0 = Math.sin(midAngleI) * midRadius;
    const mx1 = Math.cos(midAngleJ) * midRadius, mz1 = Math.sin(midAngleJ) * midRadius;

    // Zijvlakken (ongewijzigd)
    addTri(ex0, topY[i], ez0,  ex0, bottomY, ez0,  ex1, topY[j], ez1);
    addTri(ex1, topY[j], ez1,  ex0, bottomY, ez0,  ex1, bottomY, ez1);

    // Bovenvlak: 3 ringen → meer facetten
    // Buitenste driehoek (buitenrand → midring)
    addTri(ex0, topY[i], ez0,  ex1, topY[j], ez1,  mx1, midY[j], mz1);
    addTri(ex0, topY[i], ez0,  mx1, midY[j], mz1,  mx0, midY[i], mz0);

    // Binnenste driehoek (midring → centrum)
    addTri(0, centerY, 0,  mx0, midY[i], mz0,  mx1, midY[j], mz1);

    // Ondervlak
    addTri(0, bottomY, 0,  ex1, bottomY, ez1,  ex0, bottomY, ez0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export default function HexTile({ position, color, height = 0.3, seed = 0 }: HexTileProps) {
  const geo = useMemo(() => buildLowPolyHex(1, height, seed), [height, seed]);

  return (
    <mesh position={position} geometry={geo}>
      <meshLambertMaterial color={color} flatShading side={THREE.DoubleSide} />
    </mesh>
  );
}

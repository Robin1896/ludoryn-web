"use client";

import { useMemo } from "react";
import * as THREE from "three";

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Low-poly hex schijf met lichte hoogtevariatie op de bovenkant
function buildHexDisc(radius: number, height: number, seed: number): THREE.BufferGeometry {
  const rng = seededRng(seed);
  const sides = 6;
  const halfH = height / 2;
  const bottomY = -halfH;
  const midRadius = radius * 0.5;
  const bump = height * 1.4;

  const edgeY   = Array.from({ length: sides }, () => halfH + (rng() - 0.5) * bump);
  const midY    = Array.from({ length: sides }, () => halfH + (rng() - 0.5) * bump * 0.6);
  const centerY = halfH + (rng() - 0.5) * bump * 0.3;

  const angle = (i: number) => (i / sides) * Math.PI * 2;

  const positions: number[] = [];

  const addTri = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
  ) => positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);

  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;

    const ex0 = Math.cos(angle(i)) * radius, ez0 = Math.sin(angle(i)) * radius;
    const ex1 = Math.cos(angle(j)) * radius, ez1 = Math.sin(angle(j)) * radius;
    const mx0 = Math.cos(angle(i)) * midRadius, mz0 = Math.sin(angle(i)) * midRadius;
    const mx1 = Math.cos(angle(j)) * midRadius, mz1 = Math.sin(angle(j)) * midRadius;

    // Zijkant
    addTri(ex0, edgeY[i], ez0,  ex0, bottomY, ez0,  ex1, edgeY[j], ez1);
    addTri(ex1, edgeY[j], ez1,  ex0, bottomY, ez0,  ex1, bottomY,  ez1);

    // Bovenkant (2 ringen)
    addTri(ex0, edgeY[i], ez0,  ex1, edgeY[j], ez1,  mx1, midY[j], mz1);
    addTri(ex0, edgeY[i], ez0,  mx1, midY[j],  mz1,  mx0, midY[i], mz0);
    addTri(0, centerY, 0,  mx0, midY[i], mz0,  mx1, midY[j], mz1);

    // Onderkant
    addTri(0, bottomY, 0,  ex1, bottomY, ez1,  ex0, bottomY, ez0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export default function BoardBase() {
  const sandGeo = useMemo(() => buildHexDisc(8.0, 0.35, 7), []);

  return (
    <group position={[0, -0.32, 0]}>
      <mesh geometry={sandGeo}>
        <meshLambertMaterial color="#c9a96e" flatShading side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

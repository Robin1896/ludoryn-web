"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import PhysicsDie from "./PhysicsDie";

interface Props {
  rolling: boolean;
  onResult: (d1: number, d2: number) => void;
}

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomQuat(): [number, number, number, number] {
  // Shoemake uniforme willekeurige quaternion
  const u1 = Math.random();
  const u2 = Math.random() * Math.PI * 2;
  const u3 = Math.random() * Math.PI * 2;
  const s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1);
  return [s1 * Math.sin(u2), s1 * Math.cos(u2), s2 * Math.sin(u3), s2 * Math.cos(u3)];
}

function makeDiceConfig() {
  const angle = rnd(0, Math.PI * 2);
  const dist = rnd(3.5, 5.5);
  const fromX = Math.cos(angle) * dist;
  const fromZ = Math.sin(angle) * dist;
  const height = rnd(1.5, 3.0);

  // Richting naar middelpunt + spreiding
  const toX = rnd(-0.8, 0.8);
  const toZ = rnd(-0.8, 0.8);
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const len = Math.sqrt(dx * dx + dz * dz);
  const speed = rnd(6, 10);

  return {
    pos: [fromX, height, fromZ] as [number, number, number],
    startRotation: randomQuat(),
    impulse: [
      (dx / len) * speed + rnd(-0.8, 0.8),
      rnd(0.5, 2.5),
      (dz / len) * speed + rnd(-0.8, 0.8),
    ] as [number, number, number],
    torque: [rnd(-35, 35), rnd(-35, 35), rnd(-35, 35)] as [number, number, number],
  };
}

// Vloer + 4 wanden als vaste colliders
function Arena() {
  return (
    <>
      {/* Vloer */}
      <RigidBody type="fixed" restitution={0.3} friction={0.85}>
        <CuboidCollider args={[10, 0.05, 10]} position={[0, 0.25, 0]} />
      </RigidBody>
      {/* Noord */}
      <RigidBody type="fixed">
        <CuboidCollider args={[10, 2, 0.1]} position={[0, 1.5, 10]} />
      </RigidBody>
      {/* Zuid */}
      <RigidBody type="fixed">
        <CuboidCollider args={[10, 2, 0.1]} position={[0, 1.5, -10]} />
      </RigidBody>
      {/* Oost */}
      <RigidBody type="fixed">
        <CuboidCollider args={[0.1, 2, 10]} position={[10, 1.5, 0]} />
      </RigidBody>
      {/* West */}
      <RigidBody type="fixed">
        <CuboidCollider args={[0.1, 2, 10]} position={[-10, 1.5, 0]} />
      </RigidBody>
    </>
  );
}

export default function DiceRoller({ rolling, onResult }: Props) {
  const [key, setKey] = useState(0);
  const results = useRef<number[]>([]);
  const reported = useRef(false);
  const configs = useRef([makeDiceConfig(), makeDiceConfig()]);

  useEffect(() => {
    if (rolling) {
      results.current = [];
      reported.current = false;
      configs.current = [makeDiceConfig(), makeDiceConfig()];
      setKey((k) => k + 1);
    }
  }, [rolling]);

  const handleSettled = useCallback((value: number) => {
    if (reported.current) return;
    results.current.push(value);
    if (results.current.length === 2) {
      reported.current = true;
      onResult(results.current[0], results.current[1]);
    }
  }, [onResult]);

  if (!rolling && key === 0) return null;

  return (
    <Physics key={key} gravity={[0, -20, 0]}>
      <Arena />
      {configs.current.map((cfg, i) => (
        <PhysicsDie
          key={`${key}-${i}`}
          startPos={cfg.pos}
          startRotation={cfg.startRotation}
          impulse={cfg.impulse}
          torque={cfg.torque}
          onSettled={handleSettled}
        />
      ))}
    </Physics>
  );
}

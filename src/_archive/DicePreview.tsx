"use client";

import { useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import PhysicsDie from "./PhysicsDie";

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomQuat(): [number, number, number, number] {
  const u1 = Math.random(), u2 = Math.random() * Math.PI * 2, u3 = Math.random() * Math.PI * 2;
  const s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1);
  return [s1 * Math.sin(u2), s1 * Math.cos(u2), s2 * Math.sin(u3), s2 * Math.cos(u3)];
}

function makeDiceConfig() {
  const angle = rnd(0, Math.PI * 2);
  const dist = rnd(1.2, 2.0);
  const fromX = Math.cos(angle) * dist;
  const fromZ = Math.sin(angle) * dist;
  const speed = rnd(3, 5.5);
  const len = Math.sqrt(fromX * fromX + fromZ * fromZ);
  return {
    pos:           [fromX, rnd(1.0, 2.2), fromZ] as [number, number, number],
    startRotation: randomQuat(),
    impulse:       [(-fromX / len) * speed + rnd(-0.3, 0.3), rnd(0.3, 1.2), (-fromZ / len) * speed + rnd(-0.3, 0.3)] as [number, number, number],
    torque:        [rnd(-30, 30), rnd(-30, 30), rnd(-30, 30)] as [number, number, number],
  };
}

export default function DicePreview() {
  const [rollKey, setRollKey] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [values, setValues] = useState<number[]>([]);
  const resultsRef = useRef<number[]>([]);
  const configs = useRef([makeDiceConfig(), makeDiceConfig()]);

  function handleThrow() {
    if (rolling) return;
    resultsRef.current = [];
    setValues([]);
    setRolling(true);
    configs.current = [makeDiceConfig(), makeDiceConfig()];
    setRollKey((k) => k + 1);
  }

  const handleSettled = useCallback((value: number) => {
    resultsRef.current.push(value);
    if (resultsRef.current.length === 2) {
      setValues([...resultsRef.current]);
      setRolling(false);
    }
  }, []);

  const total = values.length === 2 ? values[0] + values[1] : null;

  return (
    <div style={{
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "linear-gradient(to bottom, #1a100480, #0d0a0480)",
      boxShadow: "0 0 40px -10px rgba(200,150,50,0.2)",
    }}>
      <div style={{ height: 280, position: "relative", background: "linear-gradient(to bottom, #2a1a08 0%, #0d0604 100%)" }}>
        <Canvas
          camera={{ position: [0, 3.5, 5.5], fov: 42 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          shadows
        >
          <directionalLight
            position={[4, 8, 5]}
            intensity={2.6}
            color="#ffe4aa"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={0.5}
            shadow-camera-far={20}
          />
          <hemisphereLight args={["#ffcc88", "#1a0800", 0.5]} />
          <ambientLight intensity={0.2} color="#ff9944" />

          <Physics key={rollKey} gravity={[0, -22, 0]}>
            {/* Vloer met zichtbare mesh + collider */}
            <RigidBody type="fixed" restitution={0.3} friction={0.85}>
              <mesh receiveShadow position={[0, 0, 0]}>
                <boxGeometry args={[7, 0.12, 7]} />
                <meshStandardMaterial color="#2a1a08" roughness={0.9} />
              </mesh>
              <CuboidCollider args={[3.5, 0.06, 3.5]} position={[0, 0, 0]} />
            </RigidBody>

            {/* Onzichtbare wanden */}
            <RigidBody type="fixed">
              <CuboidCollider args={[3.5, 1.5, 0.08]} position={[0, 1, 3.5]} />
            </RigidBody>
            <RigidBody type="fixed">
              <CuboidCollider args={[3.5, 1.5, 0.08]} position={[0, 1, -3.5]} />
            </RigidBody>
            <RigidBody type="fixed">
              <CuboidCollider args={[0.08, 1.5, 3.5]} position={[3.5, 1, 0]} />
            </RigidBody>
            <RigidBody type="fixed">
              <CuboidCollider args={[0.08, 1.5, 3.5]} position={[-3.5, 1, 0]} />
            </RigidBody>

            {rolling && configs.current.map((cfg, i) => (
              <PhysicsDie
                key={`${rollKey}-${i}`}
                startPos={cfg.pos}
                startRotation={cfg.startRotation}
                impulse={cfg.impulse}
                torque={cfg.torque}
                onSettled={handleSettled}
              />
            ))}
          </Physics>

          <ContactShadows position={[0, 0.07, 0]} opacity={0.55} scale={7} blur={2.5} far={2} />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2.4}
            autoRotate={!rolling && values.length === 0}
            autoRotateSpeed={0.7}
          />
        </Canvas>
      </div>

      <div style={{
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div>
          {total !== null ? (
            <div>
              <div style={{ color: "#f5d580", fontWeight: 800, fontSize: 22 }}>
                {values[0]} + {values[1]} = {total}
              </div>
              <div style={{ color: "rgba(255,200,100,0.4)", fontSize: 11, marginTop: 1 }}>Uitkomst</div>
            </div>
          ) : rolling ? (
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Gooien...</div>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Druk op gooi om te beginnen</div>
          )}
        </div>

        <button
          onClick={handleThrow}
          disabled={rolling}
          style={{
            padding: "10px 22px",
            borderRadius: 12,
            border: rolling ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(240,180,60,0.5)",
            background: rolling
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(180,110,10,0.5), rgba(220,150,20,0.4))",
            color: rolling ? "rgba(255,255,255,0.25)" : "#f5d580",
            fontWeight: 700,
            fontSize: 14,
            cursor: rolling ? "default" : "pointer",
            transition: "all 0.15s",
            boxShadow: rolling ? "none" : "0 4px 12px rgba(180,110,10,0.2)",
          }}
        >
          Gooi
        </button>
      </div>
    </div>
  );
}

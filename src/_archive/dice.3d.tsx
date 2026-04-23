"use client";

import { useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import PhysicsDie from "@/components/PhysicsDie";
import Link from "next/link";

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomQuat(): [number, number, number, number] {
  const u1 = Math.random(), u2 = Math.random() * Math.PI * 2, u3 = Math.random() * Math.PI * 2;
  const s1 = Math.sqrt(1 - u1), s2 = Math.sqrt(u1);
  return [s1 * Math.sin(u2), s1 * Math.cos(u2), s2 * Math.sin(u3), s2 * Math.cos(u3)];
}

// Bakje afmetingen (inner)
const TRAY_W = 3.2;      // breedte (inner)
const TRAY_D = 3.2;      // diepte (inner)
const TRAY_WALL = 0.15;  // wanddikte
const TRAY_H = 0.65;     // zichtbare wandhoogte
const GUARD_H = 3.0;     // onzichtbare guard-wanden hierboven (vangt alles op)

function makeDiceConfig(index: number, total: number) {
  // Spawn verdeeld in een klein raster boven het bakje
  const cols = Math.ceil(Math.sqrt(total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const spacing = 0.52;
  // Clamp spawn binnen 70% van het bakje zodat ze altijd binnen vallen
  const maxOff = (TRAY_W / 2) * 0.65;
  const offsetX = Math.max(-maxOff, Math.min(maxOff, (col - (cols - 1) / 2) * spacing + rnd(-0.1, 0.1)));
  const offsetZ = Math.max(-maxOff, Math.min(maxOff, (row - (Math.ceil(total / cols) - 1) / 2) * spacing + rnd(-0.1, 0.1)));
  return {
    pos: [offsetX, rnd(5.0, 7.5), offsetZ] as [number, number, number],
    startRotation: randomQuat(),
    // Nagenoeg geen horizontale impulse — ze vallen recht naar beneden
    impulse: [rnd(-0.15, 0.15), 0, rnd(-0.15, 0.15)] as [number, number, number],
    torque:  [rnd(-30, 30), rnd(-30, 30), rnd(-30, 30)] as [number, number, number],
  };
}


type Config = ReturnType<typeof makeDiceConfig>;

export default function DicePage() {
  const [diceCount, setDiceCount] = useState(2);
  const [rollKey, setRollKey] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [values, setValues] = useState<number[]>([]);
  const resultsRef = useRef<number[]>([]);
  const expectedRef = useRef(0);
  const configs = useRef<Config[]>([]);

  function roll(count: number) {
    if (rolling) return;
    resultsRef.current = [];
    expectedRef.current = count;
    setValues([]);
    setRolling(true);
    configs.current = Array.from({ length: count }, (_, i) => makeDiceConfig(i, count));
    setRollKey((k) => k + 1);
  }

  const handleSettled = useCallback((value: number) => {
    resultsRef.current.push(value);
    if (resultsRef.current.length === expectedRef.current) {
      setValues([...resultsRef.current]);
      setRolling(false);
    }
  }, []);

  const total = values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;

  return (
    <div style={{
      width: "100vw",
      height: "100dvh",
      background: "#0a0705",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <Link href="/" style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, textDecoration: "none" }}>
          ← Terug
        </Link>
        <span style={{ color: "rgba(255,200,80,0.7)", fontWeight: 700, fontSize: 15, letterSpacing: "0.05em" }}>
          Dobbelstenen
        </span>
        <div style={{ width: 48 }} />
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas
          camera={{ position: [0, 4.5, 5.5], fov: 38 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          shadows
        >
          <directionalLight
            position={[3, 7, 4]}
            intensity={1.8}
            color="#ffffff"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={0.5}
            shadow-camera-far={15}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={4}
            shadow-camera-bottom={-4}
          />
          {/* Zachte vullamp van onderen zodat donkere vlakken niet pikzwart worden */}
          <directionalLight position={[-2, -3, -2]} intensity={0.4} color="#ffffff" />
          <ambientLight intensity={0.6} color="#ffffff" />

          <Physics key={rollKey} gravity={[0, -26, 0]} timeStep="vary">
            {/* Bakje — vloer (dik zodat snelle dobbelstenen er niet doorvallen) */}
            <RigidBody type="fixed" restitution={0.2} friction={0.95}>
              <mesh receiveShadow position={[0, -0.1, 0]}>
                <boxGeometry args={[TRAY_W + TRAY_WALL * 2, 0.2, TRAY_D + TRAY_WALL * 2]} />
                <meshStandardMaterial color="#2a1a0c" roughness={0.92} />
              </mesh>
              <CuboidCollider args={[(TRAY_W + TRAY_WALL * 2) / 2, 0.1, (TRAY_D + TRAY_WALL * 2) / 2]} position={[0, -0.1, 0]} />
            </RigidBody>

            {/* Bakje — 4 zichtbare wanden */}
            {[
              // [meshPosX, meshPosZ, meshW, meshD, collPosX, collPosZ, collHW, collHD]
              [0, TRAY_D/2+TRAY_WALL/2, TRAY_W+TRAY_WALL*2, TRAY_WALL, 0, TRAY_D/2+TRAY_WALL/2, (TRAY_W+TRAY_WALL*2)/2, TRAY_WALL/2],
              [0, -(TRAY_D/2+TRAY_WALL/2), TRAY_W+TRAY_WALL*2, TRAY_WALL, 0, -(TRAY_D/2+TRAY_WALL/2), (TRAY_W+TRAY_WALL*2)/2, TRAY_WALL/2],
              [TRAY_W/2+TRAY_WALL/2, 0, TRAY_WALL, TRAY_D+TRAY_WALL*2, TRAY_W/2+TRAY_WALL/2, 0, TRAY_WALL/2, (TRAY_D+TRAY_WALL*2)/2],
              [-(TRAY_W/2+TRAY_WALL/2), 0, TRAY_WALL, TRAY_D+TRAY_WALL*2, -(TRAY_W/2+TRAY_WALL/2), 0, TRAY_WALL/2, (TRAY_D+TRAY_WALL*2)/2],
            ].map(([mx, mz, mw, md, cx, cz, chw, chd], i) => (
              <RigidBody key={i} type="fixed" restitution={0.05} friction={0.9}>
                {/* Zichtbare wand */}
                <mesh receiveShadow castShadow position={[mx, TRAY_H/2, mz]}>
                  <boxGeometry args={[mw, TRAY_H, md]} />
                  <meshStandardMaterial color="#3a2510" roughness={0.85} />
                </mesh>
                {/* Collider over volledige hoogte (zichtbaar + guard) */}
                <CuboidCollider args={[chw, (TRAY_H + GUARD_H)/2, chd]} position={[cx, (TRAY_H + GUARD_H)/2, cz]} />
              </RigidBody>
            ))}

            {configs.current.map((cfg, i) => (
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

          <ContactShadows position={[0, 0.06, 0]} opacity={0.5} scale={5} blur={1.5} far={1.5} />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3}
            maxDistance={10}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.3}
            autoRotate={!rolling && values.length === 0}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* Onderbalk */}
      <div style={{
        flexShrink: 0,
        padding: "16px 20px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "#0d0a06",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        {/* Resultaat */}
        <div style={{ minHeight: 36, display: "flex", alignItems: "center", gap: 12 }}>
          {rolling ? (
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Gooien...</span>
          ) : total !== null ? (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {values.map((v, i) => (
                  <span key={i} style={{
                    background: "rgba(255,200,80,0.12)",
                    border: "1px solid rgba(255,200,80,0.25)",
                    color: "#f5d580",
                    fontWeight: 700,
                    fontSize: 18,
                    borderRadius: 8,
                    padding: "4px 12px",
                  }}>{v}</span>
                ))}
                {values.length > 1 && (
                  <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                    = <strong style={{ color: "#f5d580" }}>{total}</strong>
                  </span>
                )}
              </div>
            </>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Kies aantal en gooi</span>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Aantal dobbelstenen */}
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setDiceCount(n)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: diceCount === n
                    ? "1px solid rgba(240,180,60,0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: diceCount === n
                    ? "rgba(180,110,10,0.4)"
                    : "rgba(255,255,255,0.04)",
                  color: diceCount === n ? "#f5d580" : "rgba(255,255,255,0.4)",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Gooi knop */}
          <button
            onClick={() => roll(diceCount)}
            disabled={rolling}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: rolling ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(240,180,60,0.5)",
              background: rolling
                ? "rgba(255,255,255,0.04)"
                : "linear-gradient(135deg, rgba(180,110,10,0.55), rgba(220,150,20,0.45))",
              color: rolling ? "rgba(255,255,255,0.25)" : "#f5d580",
              fontWeight: 700,
              fontSize: 15,
              cursor: rolling ? "default" : "pointer",
              transition: "all 0.15s",
              boxShadow: rolling ? "none" : "0 4px 16px rgba(180,110,10,0.25)",
            }}
          >
            Gooi {diceCount === 1 ? "1 dobbelsteen" : `${diceCount} dobbelstenen`}
          </button>
        </div>
      </div>
    </div>
  );
}

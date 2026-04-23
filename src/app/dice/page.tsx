"use client";

import { useState } from "react";
import Link from "next/link";

type Face = 1 | 2 | 3 | 4 | 5 | 6;

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
};

function Die({ face, size = 72, rolling = false }: { face: Face; size?: number; rolling?: boolean }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.18,
      background: "linear-gradient(145deg, #f8f5ef, #ede8de)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 4px 16px rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      transform: rolling ? "rotate(15deg) scale(0.95)" : "none",
      transition: "transform 0.1s",
    }}>
      <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 100 100">
        {(PIP_POSITIONS[face] ?? []).map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="10" fill="#7c2d12" />
        ))}
      </svg>
    </div>
  );
}

function rollDie(): Face {
  return (Math.floor(Math.random() * 6) + 1) as Face;
}

export default function DicePage() {
  const [count, setCount] = useState(5);
  const [dice, setDice] = useState<Face[]>([1, 2, 3, 4, 5]);
  const [rolling, setRolling] = useState(false);
  const [total, setTotal] = useState(15);

  function roll() {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    const iv = setInterval(() => {
      setDice(Array.from({ length: count }, rollDie));
      ticks++;
      if (ticks >= 8) {
        clearInterval(iv);
        const final = Array.from({ length: count }, rollDie);
        setDice(final);
        setTotal(final.reduce((s, d) => s + d, 0));
        setRolling(false);
      }
    }, 100);
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 30%, #0e1a30 0%, #080B24 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, color: "#EEF2FF",
    }}>
      <div style={{ position: "absolute", top: 20, left: 20 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={{
            fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 11,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(238,242,255,0.45)", background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50,
            padding: "6px 14px", cursor: "pointer",
          }}>← Terug</button>
        </Link>
      </div>

      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <h1 style={{
          fontFamily: "'Fredoka', sans-serif", fontSize: 36, fontWeight: 900,
          letterSpacing: "0.08em", color: "#EEF2FF", margin: "0 0 4px",
        }}>DOBBELAAR</h1>
        <p style={{
          fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "rgba(238,242,255,0.3)",
          letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 40px",
        }}>Rol je dobbelstenen</p>

        {/* Dice */}
        <div style={{
          background: "rgba(4,7,20,0.6)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 24, padding: "28px 20px", marginBottom: 24,
          display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center",
          minHeight: 120,
        }}>
          {dice.map((f, i) => <Die key={i} face={f} size={72} rolling={rolling} />)}
        </div>

        {/* Total */}
        {!rolling && (
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 48, fontWeight: 700,
            color: "#EEF2FF", lineHeight: 1, marginBottom: 8,
          }}>{total}</div>
        )}
        <div style={{
          fontFamily: "'Nunito', sans-serif", fontSize: 11, color: "rgba(238,242,255,0.3)",
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 32,
        }}>Totaal</div>

        {/* Count picker */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <button
              key={n}
              onClick={() => { setCount(n); setDice(Array.from({ length: n }, rollDie)); setTotal(0); }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: count === n ? "rgba(91,127,255,0.2)" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${count === n ? "rgba(91,127,255,0.6)" : "rgba(255,255,255,0.08)"}`,
                color: count === n ? "#8fa8ff" : "rgba(238,242,255,0.4)",
                fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 14,
                cursor: "pointer",
              }}
            >{n}</button>
          ))}
        </div>

        <button
          onClick={roll}
          disabled={rolling}
          style={{
            width: "100%", padding: "16px", borderRadius: 50, border: "none",
            background: rolling ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#5B7FFF,#3d5ce8)",
            color: rolling ? "rgba(238,242,255,0.3)" : "#fff",
            fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
            letterSpacing: "0.1em", cursor: rolling ? "default" : "pointer",
            boxShadow: rolling ? "none" : "0 4px 20px rgba(91,127,255,0.4)",
            transition: "all 0.15s",
          }}
        >
          {rolling ? "Gooien..." : "Gooi"}
        </button>
      </div>
    </main>
  );
}

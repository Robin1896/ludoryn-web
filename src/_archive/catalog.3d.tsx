"use client";

import Nav from "@/components/Nav";
import TilePreview from "@/components/TilePreview";
import DicePreview from "@/components/DicePreview";
import StructurePreview from "@/components/StructurePreview";
import BoardLayoutPreview, { BOARD_VARIANTS } from "@/components/BoardLayoutPreview";
import TileModelPreview from "@/components/TileModelPreview";

const TILE_TYPES = [
  { name: "Woud",      key: "forest",    color: "#2d6a2d", accentColor: "#4a9e4a", description: "Hout resource",  bg: "from-green-950/80 to-slate-950",  seed: 11 },
  { name: "Weide",     key: "pasture",   color: "#7ec850", accentColor: "#a8e870", description: "Wol resource",   bg: "from-lime-900/70 to-slate-950",   seed: 37 },
  { name: "Graanveld", key: "grain",     color: "#e8c84a", accentColor: "#f5e080", description: "Graan resource", bg: "from-yellow-900/70 to-slate-950", seed: 53 },
  { name: "Heuvels",   key: "hills",     color: "#c0522a", accentColor: "#e06030", description: "Steen resource", bg: "from-red-950/80 to-slate-950",    seed: 79 },
  { name: "Bergen",    key: "mountains", color: "#888888", accentColor: "#aaaaaa", description: "Erts resource",  bg: "from-slate-700/60 to-slate-950",  seed: 99 },
  { name: "Woestijn",  key: "desert",    color: "#d4b483", accentColor: "#e8cfa0", description: "Geen resource",  bg: "from-amber-900/60 to-slate-950",  seed: 23 },
  { name: "Water",     key: "water",     color: "#1a6fad", accentColor: "#4ab0f0", description: "Zee / rand",     bg: "from-blue-950/80 to-slate-950",   seed: 61 },
];

const STRUCTURES = [
  {
    type:        "village" as const,
    name:        "Dorp",
    color:       "#cc3333",
    accentColor: "#ff6666",
    description: "1 VP · kost 🪵🧱🧶🌾",
    bg:          "from-red-950/70 to-slate-950",
  },
  {
    type:        "city" as const,
    name:        "Stad",
    color:       "#3377cc",
    accentColor: "#66aaff",
    description: "2 VP · kost 🌾🌾⛰️⛰️⛰️",
    bg:          "from-blue-950/70 to-slate-950",
  },
  {
    type:        "road" as const,
    name:        "Weg",
    color:       "#dd8800",
    accentColor: "#ffbb44",
    description: "Verbindt dorpen · kost 🪵🧱",
    bg:          "from-amber-950/70 to-slate-950",
  },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: "rgba(240,180,80,0.4)",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <main className="min-h-screen pt-20 px-6 pb-16" style={{ background: "#0d0805" }}>
      <Nav />

      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(180,100,20,0.08) 0%, transparent 70%)"
      }} />

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="mb-12">
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#f5d580", letterSpacing: -0.5, marginBottom: 6 }}>
            Catalogus
          </h1>
          <p style={{ color: "rgba(255,200,100,0.35)", fontSize: 15 }}>
            Overzicht van alle tiles, gebouwen en assets
          </p>
        </div>

        {/* Bord varianten */}
        <SectionLabel>Bord varianten</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-14">
          {BOARD_VARIANTS.map((variant, i) => (
            <div
              key={i}
              className={`rounded-2xl overflow-hidden bg-gradient-to-b ${variant.bg}`}
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 40px -10px ${variant.accentColor}33`,
              }}
            >
              <div style={{ height: 280, position: "relative" }}>
                <BoardLayoutPreview variantIndex={i} />
              </div>
              <div style={{ padding: "14px 18px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{variant.emoji}</span>
                  <div style={{ color: "#f0e4c8", fontWeight: 700, fontSize: 15 }}>{variant.name}</div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{variant.subtitle}</div>
                {/* Tile count chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                  {(["forest","pasture","grain","hills","mountains","desert"] as const).map((type) => {
                    const count = variant.types.filter((t) => t === type).length;
                    if (count === 0) return null;
                    const colors: Record<string, string> = {
                      forest: "#2d6a2d", pasture: "#7ec850", grain: "#e8c84a",
                      hills: "#c0522a", mountains: "#888888", desert: "#d4b483",
                    };
                    const labels: Record<string, string> = {
                      forest: "🌲", pasture: "🐑", grain: "🌾",
                      hills: "🧱", mountains: "⛰️", desert: "🏜️",
                    };
                    return (
                      <span key={type} style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 6,
                        background: `${colors[type]}22`,
                        border: `1px solid ${colors[type]}44`,
                        color: "rgba(255,255,255,0.55)",
                      }}>
                        {labels[type]} ×{count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Terrein tiles */}
        <SectionLabel>Terrein tiles</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-14">
          {TILE_TYPES.map((tile) => (
            <div
              key={tile.key}
              className={`rounded-2xl overflow-hidden bg-gradient-to-b ${tile.bg}`}
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 40px -10px ${tile.color}33`,
              }}
            >
              <div className="h-48 relative">
                {tile.key !== "water"
                  ? <TileModelPreview tileType={tile.key} seed={tile.seed} />
                  : <TilePreview color={tile.color} accentColor={tile.accentColor} seed={tile.seed} />
                }
              </div>
              <div style={{ padding: "14px 18px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#f0e4c8", fontWeight: 600, fontSize: 14 }}>{tile.name}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>{tile.description}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: tile.color, display: "inline-block", outline: "1px solid rgba(255,255,255,0.15)" }} />
                  <code style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{tile.color}</code>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Gebouwen & wegen */}
        <SectionLabel>Gebouwen & wegen</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {STRUCTURES.map((s) => (
            <div
              key={s.type}
              className={`rounded-2xl overflow-hidden bg-gradient-to-b ${s.bg}`}
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 40px -10px ${s.color}33`,
              }}
            >
              <div className="h-52 relative">
                <StructurePreview type={s.type} color={s.color} accentColor={s.accentColor} />
              </div>
              <div style={{ padding: "14px 18px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#f0e4c8", fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>{s.description}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block", outline: "1px solid rgba(255,255,255,0.15)" }} />
                  <code style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{s.color}</code>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dobbelstenen */}
        <SectionLabel>Dobbelstenen</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DicePreview />
          <div style={{
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            <div style={{ color: "#f5d580", fontWeight: 700, fontSize: 16 }}>Dobbelsteen details</div>
            {[
              { label: "Waarden",     value: "1 – 6 per steen" },
              { label: "Physics",     value: "@react-three/rapier" },
              { label: "Collider",    value: "Cuboid, restitutie 0.4" },
              { label: "Settling",    value: "Velocity < 0.008 × 40 frames" },
              { label: "Face detect", value: "Quaternion → hoogste Y-normaal" },
              { label: "Puntjes",     value: "Standaard indeling 1–6" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 12 }}>
                <span style={{ color: "rgba(255,220,150,0.45)", fontSize: 12, fontWeight: 600 }}>{label}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

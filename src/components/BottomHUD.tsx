"use client";

import {
  RESOURCE_COLOR, RESOURCE_EMOJI, RESOURCE_LABEL,
  PLAYER_COLORS, PLAYER_NAMES, getVP, WIN_VP,
  type GameState, type ResourceType,
} from "@/lib/game";

const RESOURCES: ResourceType[] = ["wood", "wool", "grain", "brick", "ore"];

const RESOURCE_IMG: Record<ResourceType, string> = {
  wood:  '/images/games/catan-card-wood.png',
  wool:  '/images/games/catan-card-sheep.png',
  grain: '/images/games/catan-card-wheat.png',
  brick: '/images/games/catan-card-clay.png',
  ore:   '/images/games/catan-card-ore.png',
};

const VIVID: Record<ResourceType, { bg: string; border: string; glow: string }> = {
  wood:  { bg: "linear-gradient(145deg,#1a4a1a,#2d7a2d)", border: "#4ade80", glow: "#22c55e" },
  wool:  { bg: "linear-gradient(145deg,#2a5a10,#5ab820)", border: "#a3e635", glow: "#84cc16" },
  grain: { bg: "linear-gradient(145deg,#6b4a00,#d4900a)", border: "#fbbf24", glow: "#f59e0b" },
  brick: { bg: "linear-gradient(145deg,#5a1a06,#b84020)", border: "#f97316", glow: "#ea580c" },
  ore:   { bg: "linear-gradient(145deg,#2a2a3a,#5a5a7a)", border: "#94a3b8", glow: "#64748b" },
};

function ResourceCard({ type, count }: { type: ResourceType; count: number }) {
  const v = VIVID[type];
  const active = count > 0;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 3, width: 62, height: 76, borderRadius: 16, position: "relative",
      background: active ? v.bg : "rgba(255,255,255,0.04)",
      border: `1.5px solid ${active ? v.border : "rgba(255,255,255,0.07)"}`,
      boxShadow: active ? `0 0 18px ${v.glow}55, 0 0 6px ${v.glow}33, inset 0 1px 0 rgba(255,255,255,0.15)` : "none",
      opacity: active ? 1 : 0.35,
      transition: "all 0.3s ease",
      flexShrink: 0,
      justifyContent: "center",
    }}>
      <span style={{ fontSize: 24, lineHeight: 1, filter: active ? `drop-shadow(0 0 6px ${v.glow})` : "none" }}>
        {RESOURCE_EMOJI[type]}
      </span>
      <span style={{
        fontSize: 8, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase",
        color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
      }}>
        {RESOURCE_LABEL[type]}
      </span>
      {/* Count badge */}
      <div style={{
        position: "absolute", top: -8, right: -7,
        background: active ? v.border : "rgba(30,20,10,0.9)",
        color: active ? "#000" : "rgba(255,255,255,0.3)",
        borderRadius: "50%", width: 24, height: 24,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: 13,
        boxShadow: active ? `0 0 10px ${v.glow}, 0 2px 4px rgba(0,0,0,0.6)` : "none",
        border: `1.5px solid ${active ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.08)"}`,
      }}>
        {count}
      </div>
    </div>
  );
}

export default function BottomHUD({ gameState }: { gameState: GameState }) {
  const { currentPlayer, numPlayers, resources } = gameState;
  const myRes = resources[currentPlayer];
  const playerColor = PLAYER_COLORS[currentPlayer];
  const playerName  = PLAYER_NAMES[currentPlayer];
  const vps = getVP(gameState);
  const myVP = vps[currentPlayer];

  const phaseLabel =
    gameState.awaitingRobber ? "Verplaats de ruiter"
    : gameState.phase !== "main"
      ? gameState.setupStep === "settlement" ? "Setup: dorp" : "Setup: weg"
    : gameState.buildMode === "settlement" ? "Plaatsen: dorp"
    : gameState.buildMode === "road"       ? "Plaatsen: weg"
    : gameState.buildMode === "city"       ? "Upgraden: stad"
    : "Aan de beurt";

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      padding: "8px 10px 10px",
      background: "linear-gradient(to top, rgba(4,2,8,0.97) 0%, rgba(6,3,12,0.85) 70%, transparent 100%)",
      userSelect: "none", pointerEvents: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(12,6,20,0.82)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        backdropFilter: "blur(24px)",
        padding: "10px 14px",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}>

        {/* LEFT — Player */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 4,
          minWidth: 100, paddingRight: 12,
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              width: 11, height: 11, borderRadius: "50%",
              background: playerColor,
              boxShadow: `0 0 10px ${playerColor}, 0 0 4px ${playerColor}`,
            }} />
            <span style={{ fontSize: 15, fontWeight: 900, color: playerColor, letterSpacing: 0.2 }}>
              {playerName}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(200,160,255,0.6)", fontWeight: 600, letterSpacing: 0.3 }}>
            {phaseLabel}
          </div>
          {/* VP */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              fontSize: 18, fontWeight: 900, color: "#fbbf24",
              textShadow: "0 0 12px #fbbf24, 0 0 4px #f59e0b",
              lineHeight: 1,
            }}>
              {myVP}
            </span>
            <span style={{ fontSize: 10, color: "rgba(251,191,36,0.5)", fontWeight: 700 }}>/ {WIN_VP} VP</span>
          </div>
          {/* VP bar */}
          <div style={{
            height: 4, borderRadius: 4,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden", width: "100%",
          }}>
            <div style={{
              height: "100%", borderRadius: 4,
              width: `${Math.min(100, (myVP / WIN_VP) * 100)}%`,
              background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
              boxShadow: "0 0 8px #fbbf24",
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {/* CENTER — Resources */}
        <div style={{
          display: "flex", gap: 7, alignItems: "center",
          flex: 1, justifyContent: "center",
        }}>
          {RESOURCES.map((r) => (
            <ResourceCard key={r} type={r} count={myRes[r]} />
          ))}
        </div>

        {/* RIGHT — Opponents */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          paddingLeft: 12,
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          {Array.from({ length: numPlayers }).map((_, p) => {
            if (p === currentPlayer) return null;
            const pTotal = Object.values(resources[p]).reduce((a, b) => a + b, 0);
            const pColor = PLAYER_COLORS[p];
            return (
              <div key={p} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "8px 10px", borderRadius: 14,
                background: `linear-gradient(145deg, ${pColor}18, ${pColor}08)`,
                border: `1.5px solid ${pColor}44`,
                boxShadow: `0 0 14px ${pColor}22`,
                minWidth: 58,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: `radial-gradient(circle at 35% 35%, ${pColor}, ${pColor}88)`,
                  boxShadow: `0 0 12px ${pColor}88, 0 2px 6px rgba(0,0,0,0.5)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 900, color: "#fff",
                  border: "2px solid rgba(255,255,255,0.2)",
                }}>
                  {PLAYER_NAMES[p][0]}
                </div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", fontWeight: 800, letterSpacing: 0.5 }}>
                  {PLAYER_NAMES[p].toUpperCase()}
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <div style={{
                    background: `${pColor}33`, border: `1px solid ${pColor}66`,
                    borderRadius: 7, padding: "2px 8px",
                    fontSize: 12, color: "#fff", fontWeight: 900,
                  }}>
                    {pTotal}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 900, color: "#fbbf24",
                    textShadow: "0 0 8px #fbbf24",
                  }}>
                    {vps[p]}★
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

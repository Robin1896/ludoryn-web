"use client";

import {
  RESOURCE_COLOR,
  RESOURCE_EMOJI,
  RESOURCE_LABEL,
  PLAYER_COLORS,
  PLAYER_NAMES,
  type GameState,
  type ResourceType,
} from "@/lib/game";

const RESOURCES: ResourceType[] = ["wood", "wool", "grain", "brick", "ore"];

interface Props {
  gameState: GameState;
}

function ResourceCard({ type, count }: { type: ResourceType; count: number }) {
  const color = RESOURCE_COLOR[type];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        width: 64,
        height: 90,
        borderRadius: 10,
        padding: "10px 6px 8px",
        background: `linear-gradient(160deg, ${color}cc, ${color}88)`,
        border: `1px solid ${color}`,
        boxShadow: count > 0 ? `0 4px 16px ${color}55` : "none",
        opacity: count === 0 ? 0.45 : 1,
        transition: "opacity 0.2s, box-shadow 0.2s",
        position: "relative",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{RESOURCE_EMOJI[type]}</span>
      <span style={{ fontSize: 11, color: "#fff", opacity: 0.85, fontWeight: 600, letterSpacing: 0.3 }}>
        {RESOURCE_LABEL[type]}
      </span>
      <div
        style={{
          position: "absolute",
          top: -8,
          right: -6,
          background: count > 0 ? "#fff" : "#555",
          color: count > 0 ? "#111" : "#999",
          borderRadius: "50%",
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}
      >
        {count}
      </div>
    </div>
  );
}

function OtherPlayer({ player, total, color, name }: { player: number; total: number; color: string; name: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "#fff", opacity: 0.65 }}>{name}</span>
      <span
        style={{
          marginLeft: 2,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 6,
          padding: "1px 7px",
          fontSize: 12,
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {total}
      </span>
    </div>
  );
}

export default function ResourceCards({ gameState }: Props) {
  const { currentPlayer, numPlayers, resources, lastDice } = gameState;
  const myResources = resources[currentPlayer];
  const total = Object.values(myResources).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* Andere spelers — compact */}
      <div
        style={{
          display: "flex",
          gap: 14,
          background: "rgba(0,0,0,0.35)",
          borderRadius: 10,
          padding: "6px 14px",
          backdropFilter: "blur(6px)",
        }}
      >
        {Array.from({ length: numPlayers }).map((_, p) => {
          if (p === currentPlayer) return null;
          const pTotal = Object.values(resources[p]).reduce((a, b) => a + b, 0);
          return (
            <OtherPlayer
              key={p}
              player={p}
              total={pTotal}
              color={PLAYER_COLORS[p]}
              name={PLAYER_NAMES[p]}
            />
          );
        })}
      </div>

      {/* Huidige speler — kaarten */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          background: "rgba(0,0,0,0.5)",
          borderRadius: 16,
          padding: "14px 18px 12px",
          backdropFilter: "blur(10px)",
          border: `1px solid ${PLAYER_COLORS[currentPlayer]}44`,
          boxShadow: `0 0 24px ${PLAYER_COLORS[currentPlayer]}22`,
        }}
      >
        {/* Speler header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: PLAYER_COLORS[currentPlayer] }} />
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>
            {PLAYER_NAMES[currentPlayer]}
          </span>
          <span style={{ color: "#fff", opacity: 0.4, fontSize: 12 }}>·</span>
          <span style={{ color: "#fff", opacity: 0.5, fontSize: 12 }}>{total} kaarten</span>
          {lastDice && (
            <>
              <span style={{ color: "#fff", opacity: 0.4, fontSize: 12 }}>·</span>
              <span style={{ color: "#ffd97a", fontSize: 13, fontWeight: 700 }}>
                {lastDice[0] + lastDice[1]}
              </span>
            </>
          )}
        </div>

        {/* Kaarten */}
        <div style={{ display: "flex", gap: 8 }}>
          {RESOURCES.map((r) => (
            <ResourceCard key={r} type={r} count={myResources[r]} />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  PLAYER_COLORS, PLAYER_NAMES, BUILD_COST, RESOURCE_EMOJI,
  type GameState, type ResourceType, type Resources,
} from "@/lib/game";

const COST_ICONS: Record<ResourceType, string> = {
  wood:  "🪵",
  brick: "🧱",
  wool:  "🧶",
  grain: "🌾",
  ore:   "⛰️",
};

const ALL_RESOURCES: ResourceType[] = ["wood", "brick", "wool", "grain", "ore"];

const RES_COLOR: Record<ResourceType, string> = {
  wood:  "#4ade80",
  brick: "#f97316",
  wool:  "#a3e635",
  grain: "#fbbf24",
  ore:   "#94a3b8",
};

interface Props {
  gameState: GameState;
  diceRolled: boolean;
  diceRolling: boolean;
  affordSettlement: boolean;
  affordRoad: boolean;
  affordCity: boolean;
  hasVillage: boolean;
  tradeRatios: Record<ResourceType, number>;
  myResources: Resources;
  onRollDice: () => void;
  onSetBuildMode: (mode: "settlement" | "road" | "city" | null) => void;
  onNextTurn: () => void;
  onTrade: (give: ResourceType, receive: ResourceType) => void;
}

function CostPip({ res }: { res: ResourceType }) {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: 4,
      background: RES_COLOR[res] + "33",
      border: `1px solid ${RES_COLOR[res]}88`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 8, lineHeight: 1,
    }}>
      {COST_ICONS[res]}
    </span>
  );
}

function CostRow({ cost }: { cost: Record<ResourceType, number> }) {
  const pips: ResourceType[] = [];
  (Object.entries(cost) as [ResourceType, number][]).forEach(([r, n]) => {
    for (let i = 0; i < n; i++) pips.push(r);
  });
  return (
    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", marginTop: 3 }}>
      {pips.map((r, i) => <CostPip key={i} res={r} />)}
    </div>
  );
}

const glass: React.CSSProperties = {
  background: "rgba(10,5,18,0.85)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 18,
  backdropFilter: "blur(24px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
};

export default function ActionPanel({
  gameState, diceRolled, diceRolling, affordSettlement, affordRoad, affordCity,
  hasVillage, tradeRatios, myResources, onRollDice, onSetBuildMode, onNextTurn, onTrade,
}: Props) {
  const [tradeGive, setTradeGive] = useState<ResourceType | null>(null);
  const { phase, buildMode, lastDice, currentPlayer } = gameState;
  const playerColor = PLAYER_COLORS[currentPlayer];
  const playerName  = PLAYER_NAMES[currentPlayer];

  // ── Robber ──────────────────────────────────────────────────────────────────
  if (gameState.awaitingRobber) {
    return (
      <div style={{
        position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
        ...glass, padding: "12px 22px",
        display: "flex", alignItems: "center", gap: 10,
        border: "1.5px solid #ef444488",
        boxShadow: "0 0 40px #ef444430, 0 8px 24px rgba(0,0,0,0.6)",
        whiteSpace: "nowrap",
      }}>
        <span style={{ fontSize: 20 }}>⚔️</span>
        <span style={{ color: "#ef4444", fontWeight: 900, fontSize: 14 }}>Ruiter</span>
        <span style={{ color: "rgba(255,200,150,0.55)", fontSize: 11 }}>Klik op een tegel om te verplaatsen</span>
      </div>
    );
  }

  // ── Setup ───────────────────────────────────────────────────────────────────
  if (phase !== "main") {
    const label = gameState.setupStep === "settlement" ? "Plaats een dorp" : "Plaats een weg";
    const icon  = gameState.setupStep === "settlement" ? "🏠" : "🛤️";
    return (
      <div style={{
        position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
        ...glass, padding: "12px 22px",
        display: "flex", alignItems: "center", gap: 10,
        border: `1.5px solid ${playerColor}66`,
        boxShadow: `0 0 30px ${playerColor}25, 0 8px 24px rgba(0,0,0,0.6)`,
        whiteSpace: "nowrap",
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ color: playerColor, fontWeight: 900, fontSize: 14 }}>{playerName}</span>
        <span style={{ color: "rgba(255,220,160,0.5)", fontSize: 11 }}>{label}</span>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  const tradeable = ALL_RESOURCES.filter((r) => myResources[r] >= tradeRatios[r]);
  const isRolled  = diceRolled || diceRolling;

  return (
    <div style={{
      position: "absolute", top: 16, right: 16, width: 226,
      display: "flex", flexDirection: "column", gap: 8,
      userSelect: "none",
    }}>

      {/* ── Dice ─────────────────────────────────────────────────────────── */}
      <div style={{ ...glass, padding: 10 }}>
        <button
          onClick={onRollDice}
          disabled={isRolled}
          style={{
            width: "100%", borderRadius: 12,
            border: isRolled ? "1px solid rgba(255,255,255,0.06)" : "1.5px solid #fbbf24aa",
            background: diceRolling
              ? "linear-gradient(135deg, rgba(180,100,10,0.4), rgba(220,140,20,0.3))"
              : isRolled
                ? "rgba(255,255,255,0.03)"
                : "linear-gradient(135deg, rgba(245,158,11,0.55), rgba(251,191,36,0.4))",
            color: isRolled ? "rgba(255,255,255,0.6)" : "#fef3c7",
            cursor: isRolled ? "default" : "pointer",
            padding: "12px 8px",
            transition: "all 0.2s",
            boxShadow: isRolled ? "none" : "0 4px 20px #f59e0b44, inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {diceRolling ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>🎲</div>
              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 3, fontWeight: 700 }}>Gooien…</div>
            </div>
          ) : lastDice ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5 }}>
                <span style={{ fontSize: 15, opacity: 0.45 }}>{lastDice[0]}</span>
                <span style={{ fontSize: 11, opacity: 0.25 }}>+</span>
                <span style={{ fontSize: 15, opacity: 0.45 }}>{lastDice[1]}</span>
                <span style={{ fontSize: 11, opacity: 0.25 }}>=</span>
                <span style={{ fontSize: 36, fontWeight: 900, color: "#fbbf24", lineHeight: 1, textShadow: "0 0 16px #f59e0b" }}>
                  {lastDice[0] + lastDice[1]}
                </span>
              </div>
              <div style={{ fontSize: 9, opacity: 0.3, marginTop: 2, letterSpacing: 1 }}>GEGOOID</div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>🎲</div>
              <div style={{ fontSize: 13, marginTop: 3, fontWeight: 800, letterSpacing: 0.3 }}>Gooi dobbelstenen</div>
            </div>
          )}
        </button>
      </div>

      {/* ── Build ────────────────────────────────────────────────────────── */}
      <div style={{ ...glass, padding: "10px 10px 12px" }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>
          Bouwen
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {([
            { mode: "settlement" as const, label: "Dorp",  emoji: "🏠", cost: BUILD_COST.settlement, enabled: affordSettlement },
            { mode: "road"       as const, label: "Weg",   emoji: "🛤️", cost: BUILD_COST.road,       enabled: affordRoad },
            { mode: "city"       as const, label: "Stad",  emoji: "🏙️", cost: BUILD_COST.city,       enabled: affordCity && hasVillage },
          ] as const).map(({ mode, label, emoji, cost, enabled }) => {
            const active = buildMode === mode;
            return (
              <button
                key={mode}
                onClick={() => enabled && onSetBuildMode(active ? null : mode)}
                style={{
                  flex: 1, borderRadius: 12,
                  border: active
                    ? `2px solid ${playerColor}`
                    : enabled
                      ? "1.5px solid rgba(255,255,255,0.14)"
                      : "1px solid rgba(255,255,255,0.05)",
                  background: active
                    ? `linear-gradient(145deg, ${playerColor}44, ${playerColor}22)`
                    : enabled
                      ? "rgba(255,255,255,0.06)"
                      : "transparent",
                  color: enabled ? "#fff" : "rgba(255,255,255,0.18)",
                  cursor: enabled ? "pointer" : "not-allowed",
                  padding: "9px 4px 10px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  transition: "all 0.15s",
                  boxShadow: active ? `0 0 20px ${playerColor}44, inset 0 1px 0 rgba(255,255,255,0.1)` : "none",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1, filter: active ? `drop-shadow(0 0 6px ${playerColor})` : "none" }}>{emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3 }}>{label}</span>
                <CostRow cost={cost} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Trade ────────────────────────────────────────────────────────── */}
      {diceRolled && (
        <div style={{ ...glass, padding: "10px 10px 12px", border: "1.5px solid rgba(99,179,237,0.2)", boxShadow: "0 0 24px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(147,210,255,0.5)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7 }}>
            {tradeGive ? "Ontvang:" : "Ruilen"}
          </div>

          {!tradeGive ? (
            tradeable.length === 0 ? (
              <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "6px 0" }}>
                Te weinig kaarten
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {ALL_RESOURCES.map((r) => {
                  const canGive = myResources[r] >= tradeRatios[r];
                  return (
                    <button
                      key={r}
                      onClick={() => canGive && setTradeGive(r)}
                      style={{
                        borderRadius: 10, position: "relative",
                        border: canGive ? `1.5px solid ${RES_COLOR[r]}66` : "1px solid rgba(255,255,255,0.05)",
                        background: canGive ? `${RES_COLOR[r]}18` : "transparent",
                        color: canGive ? "#fff" : "rgba(255,255,255,0.14)",
                        cursor: canGive ? "pointer" : "not-allowed",
                        padding: "7px 9px", fontSize: 18,
                        boxShadow: canGive ? `0 0 10px ${RES_COLOR[r]}30` : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {RESOURCE_EMOJI[r]}
                      {canGive && (
                        <span style={{
                          position: "absolute", top: -6, right: -6,
                          background: RES_COLOR[r], color: "#000",
                          borderRadius: 5, fontSize: 8, fontWeight: 900,
                          padding: "1px 4px", lineHeight: 1.4,
                        }}>
                          {tradeRatios[r]}:1
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div>
              <div style={{
                fontSize: 10.5, color: "rgba(251,191,36,0.7)",
                marginBottom: 7, display: "flex", alignItems: "center", gap: 5,
              }}>
                <span>Geef {tradeRatios[tradeGive]}×</span>
                <span style={{ fontSize: 16 }}>{RESOURCE_EMOJI[tradeGive]}</span>
                <span style={{ opacity: 0.4 }}>→</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {ALL_RESOURCES.filter((r) => r !== tradeGive).map((r) => (
                  <button
                    key={r}
                    onClick={() => { onTrade(tradeGive, r); setTradeGive(null); }}
                    style={{
                      borderRadius: 10,
                      border: `1.5px solid ${RES_COLOR[r]}55`,
                      background: `${RES_COLOR[r]}22`,
                      color: "#fff", cursor: "pointer",
                      padding: "7px 10px", fontSize: 18,
                      boxShadow: `0 0 10px ${RES_COLOR[r]}30`,
                      transition: "all 0.15s",
                    }}
                  >
                    {RESOURCE_EMOJI[r]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setTradeGive(null)}
                style={{
                  marginTop: 7, fontSize: 10, color: "rgba(255,255,255,0.3)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}
              >
                ← Terug
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Next turn ────────────────────────────────────────────────────── */}
      <button
        onClick={onNextTurn}
        style={{
          borderRadius: 16,
          border: diceRolled ? "2px solid #fbbf2466" : "1px solid rgba(255,255,255,0.08)",
          background: diceRolled
            ? "linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)"
            : "rgba(10,5,18,0.7)",
          color: diceRolled ? "#000" : "rgba(255,255,255,0.25)",
          fontWeight: 900, fontSize: 14, cursor: "pointer",
          padding: "14px 12px",
          backdropFilter: "blur(24px)",
          transition: "all 0.2s",
          letterSpacing: 0.5,
          boxShadow: diceRolled
            ? "0 4px 24px #f59e0b55, 0 0 40px #fbbf2422, inset 0 1px 0 rgba(255,255,255,0.3)"
            : "none",
        }}
      >
        Volgende beurt →
      </button>
    </div>
  );
}

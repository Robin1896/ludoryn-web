"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import WaitingScreen from "@/components/WaitingScreen";
import BottomSheet from "@/components/BottomSheet";
import { BottomNav } from "@/components/ui";
import {
  type GameState, type BirdCard, type Habitat, type Food, type Expansion, type PlacedBird, type Player,
  newGame, gainFood, layEgg, drawCard, canPlayBird, playBird, endAction, calcScore,
  FOOD_EMOJI, HABITAT_LABEL, HABITAT_COLOR, EXPANSION_INFO, ROUND_GOALS,
} from "@/lib/wingspan";
import { loadUnlocked, unlockExpansion as unlockExpansionInShop, migrateOldKeys } from "@/lib/shop";
import { useLang } from "@/lib/lang";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = "#4A90D9";
const ACCENT_DARK = "#1F5C99";
const BG = "linear-gradient(160deg, #0A1F35 0%, #050F1C 100%)";
const TEXT = "#E8F4FF";
const TEXT_MUTED = "rgba(232,244,255,0.45)";

const HABITAT_BG: Record<string, string> = {
  forest: '/images/games/wingspan-habitat-forest.png',
  grassland: '/images/games/wingspan-habitat-grassland.png',
  wetland: '/images/games/wingspan-habitat-wetland.png',
};

const FOOD_IMG: Record<string, string> = {
  worm: '/images/games/wingspan-food-worm.png',
  wheat: '/images/games/wingspan-food-grain.png',
  berry: '/images/games/wingspan-food-berry.png',
  fish: '/images/games/wingspan-food-fish.png',
  rodent: '/images/games/wingspan-food-mouse.png',
};

const ALL_FOODS: Food[] = ['worm', 'wheat', 'berry', 'fish', 'rodent'];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function BirdCardUI({
  card,
  selected = false,
  disabled = false,
  small = false,
  onClick,
}: {
  card: BirdCard;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const w = small ? 100 : 130;
  const h = small ? 130 : 170;

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        width: w, height: h,
        borderRadius: 12,
        background: selected
          ? `linear-gradient(160deg, ${card.color}44 0%, rgba(74,144,217,0.12) 100%)`
          : `linear-gradient(160deg, ${card.color}22 0%, rgba(10,31,53,0.8) 100%)`,
        border: `2px solid ${selected ? card.color : card.color + "55"}`,
        boxShadow: selected ? `0 0 16px ${card.color}88, 0 4px 0 ${ACCENT_DARK}` : `0 2px 8px rgba(0,0,0,0.4)`,
        display: "flex", flexDirection: "column",
        padding: "8px 7px 7px",
        cursor: disabled ? "default" : onClick ? "pointer" : "default",
        opacity: disabled ? 0.45 : 1,
        transition: "box-shadow 0.15s, border-color 0.15s, transform 0.15s",
        transform: selected ? "translateY(-4px)" : "none",
        position: "relative",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "12px 12px 0 0", background: card.color }} />
      {/* Points badge */}
      <div style={{
        position: "absolute", top: 6, right: 6,
        background: card.color, color: "#fff",
        fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: small ? 11 : 13,
        borderRadius: 6, padding: "1px 5px", lineHeight: 1.4,
      }}>
        {card.points}
      </div>
      {/* Name */}
      <div style={{
        fontFamily: "'Fredoka', sans-serif", fontWeight: 700,
        fontSize: small ? 10 : 12, color: TEXT, lineHeight: 1.2,
        marginTop: 4, paddingRight: 22,
        overflow: "hidden", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>
        {card.nameDutch}
      </div>
      {/* Habitats */}
      <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
        {card.habitats.map((h) => (
          <div key={h} style={{
            background: HABITAT_COLOR[h] + "88",
            border: `1px solid ${HABITAT_COLOR[h]}`,
            borderRadius: 4, padding: "1px 4px",
            fontSize: small ? 8 : 9, fontFamily: "'Nunito', sans-serif", fontWeight: 800,
            color: "#fff", letterSpacing: "0.06em",
          }}>
            {HABITAT_LABEL[h].slice(0, 3).toUpperCase()}
          </div>
        ))}
      </div>
      {/* Food cost */}
      <div style={{ display: "flex", gap: 2, marginTop: 4, flexWrap: "wrap" }}>
        {card.foodCost.map((f, i) => (
          FOOD_IMG[f]
            ? <img key={i} src={FOOD_IMG[f]} alt={f} width={small ? 12 : 14} height={small ? 12 : 14} style={{ objectFit: "contain" }} />
            : <span key={i} style={{ fontSize: small ? 12 : 14 }}>{FOOD_EMOJI[f]}</span>
        ))}
        {card.foodCost.length === 0 && (
          <span style={{ fontSize: 10, color: TEXT_MUTED }}>Gratis</span>
        )}
      </div>
      {/* Egg capacity */}
      <div style={{ display: "flex", gap: 2, marginTop: "auto" }}>
        {Array.from({ length: card.eggCapacity }, (_, i) => (
          <img key={i} src="/images/games/wingspan-egg.png" alt="egg" width={small ? 8 : 10} height={small ? 8 : 10} style={{ objectFit: "contain", opacity: 0.55 }} />
        ))}
      </div>
      {/* Power text */}
      {!small && (
        <div style={{
          fontSize: 8, color: TEXT_MUTED, fontFamily: "'Nunito', sans-serif",
          marginTop: 3, lineHeight: 1.3,
          overflow: "hidden", display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {card.powerText}
        </div>
      )}
    </div>
  );
}

function PlacedBirdUI({ placed, habitat, slot, canLayEgg, onEggClick }: {
  placed: PlacedBird;
  habitat: Habitat;
  slot: number;
  canLayEgg?: boolean;
  onEggClick?: () => void;
}) {
  const card = placed.card;
  return (
    <div style={{
      width: "100%", height: "100%",
      borderRadius: 8,
      background: `linear-gradient(160deg, ${card.color}22 0%, rgba(10,31,53,0.9) 100%)`,
      border: `1.5px solid ${card.color}66`,
      display: "flex", flexDirection: "column",
      padding: "5px 6px",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: card.color }} />
      {/* Name */}
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 9, color: TEXT, lineHeight: 1.2, marginTop: 2 }}>
        {card.nameDutch}
      </div>
      {/* Points */}
      <div style={{ position: "absolute", top: 4, right: 4, background: card.color, color: "#fff", fontSize: 9, fontWeight: 700, fontFamily: "'Fredoka', sans-serif", borderRadius: 4, padding: "0 3px" }}>
        {card.points}
      </div>
      {/* Eggs */}
      <div
        style={{ display: "flex", gap: 2, marginTop: "auto", cursor: canLayEgg ? "pointer" : "default" }}
        onClick={canLayEgg ? onEggClick : undefined}
      >
        {Array.from({ length: card.eggCapacity }, (_, i) => (
          i < placed.eggs ? (
            <img key={i} src="/images/games/wingspan-egg.png" alt="egg" width={10} height={10} style={{ objectFit: "contain" }} />
          ) : (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }} />
          )
        ))}
        {placed.cachedFood.length > 0 && (
          <span style={{ display: "flex", gap: 1, marginLeft: 2, alignItems: "center" }}>
            {placed.cachedFood.map((f, fi) => (
              FOOD_IMG[f]
                ? <img key={fi} src={FOOD_IMG[f]} alt={f} width={9} height={9} style={{ objectFit: "contain" }} />
                : <span key={fi} style={{ fontSize: 9 }}>{FOOD_EMOJI[f]}</span>
            ))}
          </span>
        )}
        {placed.tucked > 0 && (
          <span style={{ fontSize: 9, color: TEXT_MUTED, marginLeft: 2 }}>📄{placed.tucked}</span>
        )}
      </div>
    </div>
  );
}

function EmptySlotUI({ habitat, slot, canPlace, selected, onPlace }: {
  habitat: Habitat;
  slot: number;
  canPlace?: boolean;
  selected?: boolean;
  onPlace?: () => void;
}) {
  return (
    <div
      onClick={canPlace ? onPlace : undefined}
      style={{
        width: "100%", height: "100%",
        borderRadius: 8,
        border: `1.5px dashed ${canPlace ? HABITAT_COLOR[habitat] + "cc" : "rgba(255,255,255,0.1)"}`,
        background: canPlace
          ? (selected ? HABITAT_COLOR[habitat] + "22" : HABITAT_COLOR[habitat] + "08")
          : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: canPlace ? "pointer" : "default",
        transition: "background 0.15s, border-color 0.15s",
        boxSizing: "border-box",
      }}
    >
      {canPlace && (
        <div style={{ fontSize: 14, opacity: 0.5 }}>+</div>
      )}
    </div>
  );
}

function HabitatRow({
  habitat,
  player,
  selectedBirdIndex,
  gs,
  onSlotClick,
  showEggPicker,
  onEggSlotClick,
}: {
  habitat: Habitat;
  player: Player | null;
  selectedBirdIndex: number | null;
  gs: GameState;
  onSlotClick: (habitat: Habitat, slot: number) => void;
  showEggPicker: boolean;
  onEggSlotClick: (habitat: Habitat, slot: number) => void;
}) {
  if (!player) return null;
  const row = habitat === 'forest' ? player.forest : habitat === 'grassland' ? player.grassland : player.wetland;
  const ICONS: Record<Habitat, string> = { forest: '🌲', grassland: '🌾', wetland: '💧' };
  const color = HABITAT_COLOR[habitat];

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px",
        background: color + "22", borderRadius: "8px 8px 0 0",
        borderBottom: `1px solid ${color}44`,
      }}>
        <span style={{ fontSize: 14 }}>{ICONS[habitat]}</span>
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 13, color: TEXT }}>
          {HABITAT_LABEL[habitat]}
        </span>
        <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: TEXT_MUTED, marginLeft: "auto" }}>
          {row.filter(Boolean).length}/5 vogels
        </span>
      </div>
      {/* Slots */}
      <div style={{
        display: "flex", gap: 4,
        padding: "6px 8px",
        background: color + "0A",
        borderRadius: "0 0 8px 8px",
        border: `1px solid ${color}22`, borderTop: "none",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Habitat background image */}
        <img
          src={HABITAT_BG[habitat]}
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center",
            opacity: 0.15,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {row.map((bird, i) => {
          const slotHeight = 68;
          const slotWidth = "calc(20% - 4px)";

          // Can we place selected bird here?
          const canPlace = selectedBirdIndex !== null && !bird && (() => {
            const check = canPlayBird(gs, selectedBirdIndex, habitat, i);
            return check.canPlay;
          })();

          // Can we lay egg here?
          const canLayEgg = showEggPicker && !!bird && bird.eggs < bird.card.eggCapacity;

          return (
            <div key={i} style={{ flex: 1, height: slotHeight, position: "relative", zIndex: 1 }}>
              {bird ? (
                <PlacedBirdUI
                  placed={bird}
                  habitat={habitat}
                  slot={i}
                  canLayEgg={canLayEgg}
                  onEggClick={() => onEggSlotClick(habitat, i)}
                />
              ) : (
                <EmptySlotUI
                  habitat={habitat}
                  slot={i}
                  canPlace={canPlace}
                  onPlace={() => onSlotClick(habitat, i)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FoodDisplay({ food }: { food: Partial<Record<Food, number>> }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {ALL_FOODS.map((f) => {
        const count = food[f] ?? 0;
        return (
          <div key={f} style={{
            display: "flex", alignItems: "center", gap: 3,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "4px 8px",
            opacity: count === 0 ? 0.4 : 1,
          }}>
            {FOOD_IMG[f]
              ? <img src={FOOD_IMG[f]} alt={f} width={20} height={20} style={{ objectFit: "contain" }} />
              : <span style={{ fontSize: 16 }}>{FOOD_EMOJI[f]}</span>
            }
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14, color: TEXT }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActionButton({
  label, emoji, active, disabled, onClick,
}: {
  label: string; emoji: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: "10px 6px",
        borderRadius: 12, border: `1.5px solid ${active ? ACCENT : "rgba(74,144,217,0.25)"}`,
        background: active ? ACCENT + "22" : "rgba(74,144,217,0.06)",
        color: disabled ? TEXT_MUTED : TEXT,
        fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s, border-color 0.15s",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{ lineHeight: 1.2, textAlign: "center" }}>{label}</span>
    </button>
  );
}

function RoundInfo({ gs }: { gs: GameState }) {
  const cp = gs.currentPlayer;
  const actionsLeft = gs.actionsLeft[cp];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px",
      background: "rgba(74,144,217,0.08)", border: "1px solid rgba(74,144,217,0.2)",
      borderRadius: 12,
    }}>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 13, color: ACCENT }}>
        Ronde {gs.round}/4
      </div>
      <div style={{ width: 1, height: 16, background: "rgba(74,144,217,0.3)" }} />
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: TEXT_MUTED }}>
        {gs.players[cp].name}: {actionsLeft} actie{actionsLeft !== 1 ? "s" : ""}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        {gs.actionsLeft.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 3,
            background: i === cp ? "rgba(74,144,217,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${i === cp ? ACCENT + "66" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 6, padding: "2px 6px",
          }}>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: i === cp ? TEXT : TEXT_MUTED }}>
              {gs.players[i].name.slice(0, 4)}: {a}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────

type ScreenPhase = 'start' | 'waiting' | 'playing' | 'scoring';
type ActiveAction = 'food' | 'eggs' | 'cards' | 'bird' | null;

function WingspanContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLang();
  const roomId = params.get("room");

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('start');
  const [gs, setGs] = useState<GameState | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [name1, setName1] = useState("Robin");
  const [name2, setName2] = useState("Loic");
  const [unlockedExpansions, setUnlockedExpansions] = useState<Expansion[]>([]);
  const unlockedExpansionsRef = useRef<Expansion[]>([]);
  const [selectedBird, setSelectedBird] = useState<number | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [showEggPicker, setShowEggPicker] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [shopExpansion, setShopExpansion] = useState<Expansion | null>(null);

  // Load expansions from shared shop storage
  useEffect(() => {
    migrateOldKeys();
    const all = loadUnlocked();
    const ws = all.filter((id) => id.startsWith('wingspan-')).map((id) => id.replace('wingspan-', '') as Expansion);
    setUnlockedExpansions(ws);
    unlockedExpansionsRef.current = ws;
  }, []);

  // Keep ref in sync with state so socket handlers always read latest value
  useEffect(() => { unlockedExpansionsRef.current = unlockedExpansions; }, [unlockedExpansions]);

  function saveExpansion(exp: Expansion) {
    unlockExpansionInShop(`wingspan-${exp}` as import('@/lib/shop').ExpansionId);
    const next = [...unlockedExpansions.filter((e) => e !== exp), exp];
    setUnlockedExpansions(next);
  }

  const isMyTurn = gs ? (!roomId || gs.currentPlayer === myPlayerIndex) : false;

  // ── Socket ──────────────────────────────────────────────────────────────

  function emitState(state: GameState) {
    if (!roomId) return;
    getSocket().emit("state-update", { gameState: state });
  }

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    const pidx = parseInt(sessionStorage.getItem(`ludoryn-pidx-${roomId}`) ?? "0");
    const myName = sessionStorage.getItem("ludoryn-name") ?? `Speler ${pidx + 1}`;
    setMyPlayerIndex(pidx);
    setLobbyPlayers([myName]);

    const onRoomUpdate = ({ players: names, ready }: { players: string[]; ready: boolean }) => {
      setLobbyPlayers(names);
      if (ready && pidx === 0) {
        setGs((prev) => {
          if (prev) return prev;
          const state = newGame([myName, names[1] ?? "Speler 2"], unlockedExpansionsRef.current);
          socket.emit("state-update", { gameState: state });
          return state;
        });
        setScreenPhase("playing");
      }
    };
    const onStateSync = ({ gameState }: { gameState: GameState | null }) => {
      if (gameState) { setGs(gameState); setScreenPhase("playing"); }
    };
    const onStateUpdate = ({ gameState }: { gameState: GameState }) => {
      setGs(gameState); setScreenPhase("playing");
    };

    socket.on("room-update", onRoomUpdate);
    socket.on("state-sync", onStateSync);
    socket.on("state-update", onStateUpdate);
    socket.io.on("reconnect", () => socket.emit("join-room", { roomId, name: myName }));

    socket.emit("request-state", { roomId }, (res: { gameState: GameState | null; players: string[] }) => {
      if (res.players.length > 0) setLobbyPlayers(res.players);
      if (res.gameState) { setGs(res.gameState); setScreenPhase("playing"); }
    });

    return () => {
      socket.off("room-update", onRoomUpdate);
      socket.off("state-sync", onStateSync);
      socket.off("state-update", onStateUpdate);
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Action handlers ──────────────────────────────────────────────────────

  function handleGainFood(foodType: Food) {
    if (!gs || !isMyTurn) return;
    let ng = gainFood(gs, foodType);
    ng = endAction(ng);
    setGs(ng); emitState(ng);
    setShowFood(false);
    setActiveAction(null);
  }

  function handleLayEgg(habitat: Habitat, slot: number) {
    if (!gs || !isMyTurn) return;
    let ng = layEgg(gs, { habitat, slot });
    ng = endAction(ng);
    setGs(ng); emitState(ng);
    setShowEggPicker(false);
    setActiveAction(null);
  }

  function handleDrawCard(source: 'deck' | number) {
    if (!gs || !isMyTurn) return;
    let ng = drawCard(gs, source);
    ng = endAction(ng);
    setGs(ng); emitState(ng);
    setShowCardPicker(false);
    setActiveAction(null);
  }

  function handleSelectBird(idx: number) {
    if (!gs || !isMyTurn) return;
    if (selectedBird === idx) {
      setSelectedBird(null);
      setActiveAction(null);
    } else {
      setSelectedBird(idx);
      setActiveAction('bird');
    }
  }

  function handlePlaceBird(habitat: Habitat, slot: number) {
    if (!gs || !isMyTurn || selectedBird === null) return;
    const { canPlay } = canPlayBird(gs, selectedBird, habitat, slot);
    if (!canPlay) return;
    let ng = playBird(gs, selectedBird, habitat, slot);
    ng = endAction(ng);
    setGs(ng); emitState(ng);
    setSelectedBird(null);
    setActiveAction(null);
  }

  function handleEggSlotClick(habitat: Habitat, slot: number) {
    if (!gs || !isMyTurn || !showEggPicker) return;
    handleLayEgg(habitat, slot);
  }

  function handleActionButton(action: ActiveAction) {
    if (!isMyTurn) return;
    if (activeAction === action) {
      setActiveAction(null);
      setShowFood(false);
      setShowEggPicker(false);
      setShowCardPicker(false);
      setSelectedBird(null);
      return;
    }
    setActiveAction(action);
    setSelectedBird(null);
    if (action === 'food') { setShowFood(true); setShowEggPicker(false); setShowCardPicker(false); }
    if (action === 'eggs') { setShowEggPicker(true); setShowFood(false); setShowCardPicker(false); }
    if (action === 'cards') { setShowCardPicker(true); setShowFood(false); setShowEggPicker(false); }
    if (action === 'bird') { setShowFood(false); setShowEggPicker(false); setShowCardPicker(false); }
  }

  // ── Waiting screen ───────────────────────────────────────────────────────

  if (screenPhase === 'start' && roomId) {
    const myName = sessionStorage.getItem("ludoryn-name") ?? `Speler ${myPlayerIndex + 1}`;
    return (
      <WaitingScreen
        roomId={roomId}
        players={lobbyPlayers.length > 0 ? lobbyPlayers : [myName]}
        myPlayerIndex={myPlayerIndex}
        gameType="wingspan"
        accent={ACCENT}
      />
    );
  }

  // ── Start screen ─────────────────────────────────────────────────────────

  if (screenPhase === 'start') {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", paddingBottom: 100 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 10 }}>🦅</div>
            <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 40, fontWeight: 700, color: ACCENT, margin: 0 }}>Wingspan</h1>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: TEXT_MUTED, margin: "8px 0 0" }}>
              Verzamel vogels · Leg eieren · Beheer habitats
            </p>
          </div>

          {[
            { label: "Speler 1", value: name1, set: setName1 },
            { label: "Speler 2", value: name2, set: setName2 },
          ].map(({ label, value, set }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: TEXT_MUTED, display: "block", marginBottom: 5 }}>{label}</label>
              <input
                value={value}
                onChange={(e) => set(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(74,144,217,0.2)",
                  borderRadius: 12, padding: "11px 14px",
                  color: TEXT, fontFamily: "'Nunito', sans-serif", fontSize: 15, outline: "none",
                }}
              />
            </div>
          ))}

          <button
            onClick={() => {
              const state = newGame([name1 || "Speler 1", name2 || "Speler 2"], unlockedExpansions);
              setGs(state);
              setScreenPhase("playing");
            }}
            style={{
              width: "100%", marginTop: 8, padding: "14px",
              borderRadius: 50, border: "none",
              background: ACCENT, color: "#0A1F35",
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
              cursor: "pointer", boxShadow: `0 5px 0 ${ACCENT_DARK}`,
            }}
          >
            Spelen!
          </button>
        </div>

        {/* Shop bottom sheet */}
        <BottomSheet isOpen={showShop} onClose={() => setShowShop(false)}>
          {(close) => (
            <div style={{ padding: "0 16px 24px", color: TEXT }}>
              <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 24, fontWeight: 700, color: ACCENT }}>Uitbreidingen</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>Voeg meer vogels toe aan je spel</div>
              </div>
              {(Object.keys(EXPANSION_INFO) as Expansion[]).map((exp) => {
                const info = EXPANSION_INFO[exp];
                const unlocked = unlockedExpansions.includes(exp);
                return (
                  <div key={exp} style={{
                    marginBottom: 12, padding: "14px",
                    background: unlocked ? "rgba(74,144,217,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${unlocked ? "rgba(74,144,217,0.4)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 14,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 28 }}>{info.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16, color: TEXT }}>{info.name}</div>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{info.description}</div>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: ACCENT, marginTop: 3 }}>{info.cards} extra vogels</div>
                      </div>
                      {unlocked ? (
                        <div style={{ background: ACCENT + "22", border: `1px solid ${ACCENT}55`, borderRadius: 8, padding: "4px 10px", fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: ACCENT }}>
                          Actief
                        </div>
                      ) : (
                        <button
                          onClick={() => setShopExpansion(exp)}
                          style={{
                            background: ACCENT, color: "#0A1F35",
                            border: "none", borderRadius: 20,
                            padding: "6px 12px", fontSize: 13, fontWeight: 700,
                            fontFamily: "'Fredoka', sans-serif", cursor: "pointer",
                          }}
                        >
                          {info.price}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BottomSheet>

        {/* Payment modal */}
        {shopExpansion && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 300, padding: 24,
          }} onClick={() => setShopExpansion(null)}>
            <div style={{
              background: "#0D1E35", border: "1px solid rgba(74,144,217,0.3)",
              borderRadius: 20, padding: 28, maxWidth: 320, width: "100%",
              textAlign: "center",
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{EXPANSION_INFO[shopExpansion].icon}</div>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                {EXPANSION_INFO[shopExpansion].name}
              </div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: TEXT_MUTED, marginBottom: 20 }}>
                {EXPANSION_INFO[shopExpansion].price}
              </div>
              <button
                onClick={() => { saveExpansion(shopExpansion); setShopExpansion(null); }}
                style={{
                  width: "100%", padding: "12px", borderRadius: 12,
                  background: ACCENT, border: "none", color: "#0A1F35",
                  fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16,
                  cursor: "pointer", marginBottom: 10,
                }}
              >
                Demo ontgrendelen
              </button>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: TEXT_MUTED }}>
                Betaling binnenkort beschikbaar
              </div>
              <button
                onClick={() => setShopExpansion(null)}
                style={{ marginTop: 12, background: "transparent", border: "none", color: TEXT_MUTED, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontSize: 13 }}
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        <BottomNav items={[
          { label: t.home, icon: "home", onClick: () => router.push("/") },
          { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=wingspan") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

        ]} />
      </div>
    );
  }

  if (!gs) return null;

  // ── Scoring screen ────────────────────────────────────────────────────────

  if (screenPhase === 'scoring' || gs.phase === 'gameover') {
    const scores = gs.players.map((p) => calcScore(p));
    const maxTotal = Math.max(...scores.map((s) => s.total));

    return (
      <div style={{ minHeight: "100vh", background: BG, paddingBottom: 100 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🏆</div>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 32, fontWeight: 700, color: ACCENT, margin: 0 }}>Eindstand</h2>
            <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: TEXT_MUTED, margin: "8px 0 0" }}>
              {gs.message}
            </p>
          </div>

          {gs.players.map((player, i) => {
            const s = scores[i];
            const isWinner = s.total === maxTotal;
            return (
              <div key={i} style={{
                marginBottom: 16, padding: "16px",
                background: isWinner ? "rgba(74,144,217,0.12)" : "rgba(255,255,255,0.04)",
                border: `2px solid ${isWinner ? "rgba(74,144,217,0.5)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  {isWinner && <span style={{ fontSize: 20 }}>🥇</span>}
                  <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20, color: TEXT }}>{player.name}</div>
                  <div style={{ marginLeft: "auto", fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 28, color: isWinner ? ACCENT : TEXT }}>
                    {s.total}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Vogels", value: s.birds, emoji: "🦅" },
                    { label: "Eieren", value: s.eggs, emoji: "🥚" },
                    { label: "Opgeslagen", value: s.cached, emoji: "🍱" },
                    { label: "Gestokte", value: s.tucked, emoji: "📄" },
                    { label: "Rondes", value: s.roundGoals, emoji: "🎯" },
                    { label: "Bonuskaart", value: s.bonus, emoji: "⭐" },
                  ].map(({ label, value, emoji }) => (
                    <div key={label} style={{
                      background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: 16 }}>{emoji}</div>
                      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18, color: TEXT }}>{value}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, color: TEXT_MUTED }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: TEXT_MUTED }}>
                    Bonuskaart: <span style={{ color: ACCENT, fontWeight: 700 }}>{player.bonusCard.name}</span> — {player.bonusCard.description}
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => { setGs(null); setScreenPhase("start"); }}
            style={{
              width: "100%", marginTop: 16, padding: "14px",
              borderRadius: 50, border: "none",
              background: ACCENT, color: "#0A1F35",
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
              cursor: "pointer", boxShadow: `0 5px 0 ${ACCENT_DARK}`,
            }}
          >
            Opnieuw spelen
          </button>
        </div>

        <BottomNav items={[
          { label: t.home, icon: "home", onClick: () => router.push("/") },
          { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=wingspan") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

        ]} />
      </div>
    );
  }

  // ── Playing screen ────────────────────────────────────────────────────────

  const cp = gs.currentPlayer;
  const cpPlayer = gs.players[cp];
  const myPlayer = gs.players[myPlayerIndex];
  const viewPlayer = isMyTurn ? cpPlayer : myPlayer;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "12px 14px 0", maxWidth: 600, margin: "0 auto" }}>
        <RoundInfo gs={gs} />

        {/* Message */}
        <div style={{
          marginTop: 8, padding: "8px 12px",
          background: "rgba(255,255,255,0.04)", borderRadius: 10,
          fontFamily: "'Nunito', sans-serif", fontSize: 12, color: TEXT_MUTED,
          minHeight: 30,
        }}>
          {gs.message}
        </div>

        {/* Round goal */}
        {gs.roundGoals[gs.round - 1] && (
          <div style={{
            marginTop: 8, padding: "6px 12px",
            background: "rgba(74,144,217,0.06)", border: "1px solid rgba(74,144,217,0.2)",
            borderRadius: 10, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <div>
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 12, color: ACCENT, fontWeight: 700 }}>
                Rondedoel: {gs.roundGoals[gs.round - 1].name}
              </span>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: TEXT_MUTED, marginLeft: 6 }}>
                {gs.roundGoals[gs.round - 1].description}
              </span>
            </div>
          </div>
        )}

        {/* Player tabs */}
        {!isMyTurn && gs.players.length > 1 && (
          <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.2)", borderRadius: 10 }}>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "rgba(255,150,150,0.8)" }}>
              Wacht op {cpPlayer.name}...
            </span>
          </div>
        )}
      </div>

      {/* Board */}
      <div style={{ padding: "10px 14px 0", maxWidth: 600, margin: "0 auto" }}>
        {/* Habitat rows */}
        {(['forest', 'grassland', 'wetland'] as Habitat[]).map((habitat) => (
          <HabitatRow
            key={habitat}
            habitat={habitat}
            player={viewPlayer}
            selectedBirdIndex={isMyTurn ? selectedBird : null}
            gs={gs}
            onSlotClick={handlePlaceBird}
            showEggPicker={isMyTurn && showEggPicker}
            onEggSlotClick={handleEggSlotClick}
          />
        ))}

        {/* Action buttons */}
        {isMyTurn && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <ActionButton
              label="Eten"
              emoji="🍱"
              active={activeAction === 'food'}
              onClick={() => handleActionButton('food')}
            />
            <ActionButton
              label="Eieren"
              emoji="🥚"
              active={activeAction === 'eggs'}
              onClick={() => handleActionButton('eggs')}
            />
            <ActionButton
              label="Kaarten"
              emoji="🃏"
              active={activeAction === 'cards'}
              onClick={() => handleActionButton('cards')}
            />
            <ActionButton
              label="Vogel"
              emoji="🦅"
              active={activeAction === 'bird'}
              onClick={() => handleActionButton('bird')}
            />
          </div>
        )}

        {/* Food picker */}
        {isMyTurn && showFood && (
          <div style={{
            marginTop: 10, padding: "12px",
            background: "rgba(74,144,217,0.06)", border: "1px solid rgba(74,144,217,0.2)",
            borderRadius: 14,
          }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 14, fontWeight: 700, color: ACCENT, marginBottom: 10 }}>
              Kies eten om te verzamelen:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ALL_FOODS.map((f) => (
                <button
                  key={f}
                  onClick={() => handleGainFood(f)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                    cursor: "pointer", color: TEXT,
                    fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
                  }}
                >
                  {FOOD_IMG[f]
                    ? <img src={FOOD_IMG[f]} alt={f} width={20} height={20} style={{ objectFit: "contain" }} />
                    : <span style={{ fontSize: 18 }}>{FOOD_EMOJI[f]}</span>
                  }
                  <span style={{ textTransform: "capitalize" }}>{f === 'worm' ? 'Worm' : f === 'wheat' ? 'Graan' : f === 'berry' ? 'Bes' : f === 'fish' ? 'Vis' : 'Knaagdier'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Egg picker hint */}
        {isMyTurn && showEggPicker && (
          <div style={{
            marginTop: 10, padding: "10px 12px",
            background: "rgba(255,224,102,0.08)", border: "1px solid rgba(255,224,102,0.2)",
            borderRadius: 12,
          }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 13, color: "#FFE066" }}>
              Tik op een vogel (gele stip) om een ei te leggen
            </div>
          </div>
        )}

        {/* Card picker */}
        {isMyTurn && showCardPicker && (
          <div style={{
            marginTop: 10, padding: "12px",
            background: "rgba(74,144,217,0.06)", border: "1px solid rgba(74,144,217,0.2)",
            borderRadius: 14,
          }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 14, fontWeight: 700, color: ACCENT, marginBottom: 10 }}>
              Kies een kaart:
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {gs.birdTray.map((card, i) => (
                <div key={card.id} onClick={() => handleDrawCard(i)} style={{ cursor: "pointer", flexShrink: 0 }}>
                  <BirdCardUI card={card} small />
                </div>
              ))}
              <button
                onClick={() => handleDrawCard('deck')}
                style={{
                  width: 100, height: 130, borderRadius: 12, flexShrink: 0,
                  background: "rgba(74,144,217,0.08)", border: "2px dashed rgba(74,144,217,0.35)",
                  cursor: "pointer", color: TEXT_MUTED,
                  fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 12,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <span style={{ fontSize: 24 }}>📦</span>
                <span>Trekstapel</span>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>({gs.birdDeck.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Bird selection hint */}
        {isMyTurn && activeAction === 'bird' && selectedBird === null && (
          <div style={{
            marginTop: 10, padding: "10px 12px",
            background: "rgba(74,144,217,0.08)", border: "1px solid rgba(74,144,217,0.2)",
            borderRadius: 12,
          }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 13, color: ACCENT }}>
              Tik op een vogel in je hand om hem te selecteren, dan op een leeg slot
            </div>
          </div>
        )}

        {/* Food display */}
        <div style={{
          marginTop: 10, padding: "10px 12px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
        }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Eten ({viewPlayer.name})
          </div>
          <FoodDisplay food={viewPlayer.food} />
        </div>

        {/* Hand */}
        <div style={{
          marginTop: 10, padding: "10px 12px 14px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
        }}>
          <div style={{
            display: "flex", alignItems: "center", marginBottom: 10,
          }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Hand ({viewPlayer.name}) — {viewPlayer.hand.length} kaart{viewPlayer.hand.length !== 1 ? "en" : ""}
            </div>
            {selectedBird !== null && (
              <button
                onClick={() => { setSelectedBird(null); setActiveAction(null); }}
                style={{ marginLeft: "auto", background: "transparent", border: "none", color: TEXT_MUTED, cursor: "pointer", fontSize: 12, fontFamily: "'Nunito', sans-serif" }}
              >
                Selectie opheffen
              </button>
            )}
          </div>
          {viewPlayer.hand.length === 0 ? (
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: TEXT_MUTED, textAlign: "center", padding: "16px 0" }}>
              Geen kaarten in hand
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {viewPlayer.hand.map((card, i) => {
                const isSelected = selectedBird === i;
                // Check if card can be played somewhere
                let canPlay = false;
                if (isMyTurn && activeAction === 'bird') {
                  const habitats: Habitat[] = ['forest', 'grassland', 'wetland'];
                  for (const h of habitats) {
                    for (let s = 0; s < 5; s++) {
                      const row = h === 'forest' ? viewPlayer.forest : h === 'grassland' ? viewPlayer.grassland : viewPlayer.wetland;
                      if (!row[s] && canPlayBird(gs, i, h, s).canPlay) { canPlay = true; break; }
                    }
                    if (canPlay) break;
                  }
                }
                return (
                  <div key={card.id}>
                    <BirdCardUI
                      card={card}
                      selected={isSelected}
                      disabled={isMyTurn && activeAction === 'bird' && !canPlay && !isSelected}
                      onClick={isMyTurn ? () => handleSelectBird(i) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Other player info */}
        {gs.players.length > 1 && (
          <div style={{
            marginTop: 10, padding: "10px 12px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
          }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Andere spelers
            </div>
            {gs.players.map((p, i) => {
              if (i === myPlayerIndex) return null;
              const allPlaced = [...p.forest, ...p.grassland, ...p.wetland].filter(Boolean);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 14, fontWeight: 700, color: TEXT }}>{p.name}</div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: TEXT_MUTED }}>
                    {allPlaced.length} vogels · {p.hand.length} kaarten · acties: {gs.actionsLeft[i]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bonus card info */}
        <div style={{
          marginTop: 10, padding: "10px 12px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
        }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>Bonuskaart</div>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 14, fontWeight: 700, color: ACCENT }}>{viewPlayer.bonusCard.name}</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: TEXT_MUTED }}>{viewPlayer.bonusCard.description}</div>
        </div>

        {/* Shop & menu buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => setShowShop(true)}
            style={{
              flex: 1, padding: "9px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: TEXT_MUTED, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12,
              cursor: "pointer",
            }}
          >
            🏪 Winkel
          </button>
          <button
            onClick={() => { setGs(null); setScreenPhase("start"); }}
            style={{
              flex: 1, padding: "9px", borderRadius: 10,
              background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.2)",
              color: "rgba(255,150,150,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12,
              cursor: "pointer",
            }}
          >
            Stoppen
          </button>
        </div>
      </div>

      {/* Shop sheet during game */}
      <BottomSheet isOpen={showShop} onClose={() => setShowShop(false)}>
        {(close) => (
          <div style={{ padding: "0 16px 24px", color: TEXT }}>
            <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 24, fontWeight: 700, color: ACCENT }}>Uitbreidingen</div>
            </div>
            {(Object.keys(EXPANSION_INFO) as Expansion[]).map((exp) => {
              const info = EXPANSION_INFO[exp];
              const unlocked = unlockedExpansions.includes(exp);
              return (
                <div key={exp} style={{
                  marginBottom: 12, padding: "14px",
                  background: unlocked ? "rgba(74,144,217,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${unlocked ? "rgba(74,144,217,0.4)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 28 }}>{info.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16, color: TEXT }}>{info.name}</div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: TEXT_MUTED }}>{info.description}</div>
                    </div>
                    {unlocked ? (
                      <div style={{ background: ACCENT + "22", border: `1px solid ${ACCENT}55`, borderRadius: 8, padding: "4px 10px", fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700, color: ACCENT }}>
                        Actief
                      </div>
                    ) : (
                      <button
                        onClick={() => { saveExpansion(exp); }}
                        style={{
                          background: ACCENT, color: "#0A1F35",
                          border: "none", borderRadius: 20,
                          padding: "6px 12px", fontSize: 12, fontWeight: 700,
                          fontFamily: "'Fredoka', sans-serif", cursor: "pointer",
                        }}
                      >
                        Demo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BottomSheet>

      <BottomNav items={[
        { label: t.home, icon: "home", onClick: () => router.push("/") },
        { label: t.lobby, icon: "lobby", onClick: () => router.push("/lobby?game=wingspan") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

      ]} />
    </div>
  );
}

export default function WingspanPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 48 }}>🦅</div>
      </div>
    }>
      <WingspanContent />
    </Suspense>
  );
}

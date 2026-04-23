"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { BottomNav } from "@/components/ui";
import { useLang } from "@/lib/lang";
import {
  type Tile, type Group, type GameState, type Player,
  newGame, drawTile, commitTurn, aiDecide,
  isValidGroup, validateBoard, groupValue,
} from "@/lib/rummikub";

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT    = "#FF7043";
const ACCENT_DK = "#BF360C";
const BG        = "linear-gradient(160deg, #1a0f0a 0%, #0d0805 100%)";

const TILE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  red:    { bg: 'rgba(229,57,53,0.12)',  border: '#E53935', text: '#FF6B6B', glow: 'rgba(229,57,53,0.4)' },
  blue:   { bg: 'rgba(33,150,243,0.12)', border: '#2196F3', text: '#64B5F6', glow: 'rgba(33,150,243,0.4)' },
  yellow: { bg: 'rgba(255,193,7,0.12)',  border: '#FFC107', text: '#FFD54F', glow: 'rgba(255,193,7,0.4)'  },
  black:  { bg: 'rgba(224,224,224,0.08)',border: '#BDBDBD', text: '#E0E0E0', glow: 'rgba(200,200,200,0.3)' },
  joker:  { bg: 'rgba(171,71,188,0.15)', border: '#AB47BC', text: '#CE93D8', glow: 'rgba(171,71,188,0.5)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tile component
// ─────────────────────────────────────────────────────────────────────────────

function TileComp({
  tile, selected = false, onClick, size = 44, animDelay = 0, placed = false,
}: {
  tile: Tile;
  selected?: boolean;
  onClick?: () => void;
  size?: number;
  animDelay?: number;
  placed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tc = TILE_COLORS[tile.isJoker ? 'joker' : tile.color];

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el,
      { scale: 0.35, opacity: 0, y: placed ? -10 : 6 },
      { scale: selected ? 1.08 : 1, opacity: 1, y: 0, duration: 0.3, delay: animDelay, ease: 'back.out(2.2)' }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, {
      scale: selected ? 1.08 : 1,
      duration: 0.15,
      ease: 'power2.out',
    });
  }, [selected]);

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        width: size, height: size * 1.38,
        borderRadius: size * 0.16,
        backgroundImage: selected
          ? `linear-gradient(145deg, ${tc.border}30, ${tc.border}15), url('/images/games/tile-stone.png')`
          : `linear-gradient(145deg, ${tc.bg}, ${tc.bg}), url('/images/games/tile-stone.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: `${selected ? 2.5 : 1.5}px solid ${selected ? tc.border : tc.border + '66'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        boxShadow: selected
          ? `0 0 14px ${tc.glow}, 0 2px 8px rgba(0,0,0,0.5)`
          : `0 2px 6px rgba(0,0,0,0.4)`,
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transition: 'border-color 0.12s, box-shadow 0.12s',
      }}
    >
      {tile.isJoker ? (
        <span style={{ fontSize: size * 0.38, lineHeight: 1 }}>★</span>
      ) : (
        <span style={{
          fontFamily: "'Fredoka', sans-serif",
          fontWeight: 700,
          fontSize: size * 0.4,
          color: tc.text,
          lineHeight: 1,
        }}>{tile.num}</span>
      )}
      {placed && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 10, height: 10, borderRadius: '50%',
          background: ACCENT,
          boxShadow: `0 0 6px ${ACCENT}`,
        }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board group component
// ─────────────────────────────────────────────────────────────────────────────

function BoardGroup({
  group, groupIdx, hasSelected, placedIds, onGroupTap, onTileTap, isNew,
}: {
  group: Group;
  groupIdx: number;
  hasSelected: boolean;
  placedIds: Set<string>;
  onGroupTap: (idx: number) => void;
  onTileTap: (groupIdx: number, tileIdx: number) => void;
  isNew: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isNew || !ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, y: -12, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'back.out(1.8)' }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = isValidGroup(group);

  return (
    <div
      ref={ref}
      onClick={() => hasSelected && onGroupTap(groupIdx)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        padding: '8px 10px',
        borderRadius: 12,
        background: valid
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,80,80,0.08)',
        border: `1.5px solid ${hasSelected
          ? ACCENT + 'aa'
          : valid
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,80,80,0.4)'}`,
        cursor: hasSelected ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        boxShadow: hasSelected ? `0 0 12px ${ACCENT}44` : 'none',
        minWidth: 60,
        alignItems: 'center',
      }}
    >
      {group.map((tile, ti) => (
        <TileComp
          key={tile.id}
          tile={tile}
          size={36}
          placed={placedIds.has(tile.id)}
          onClick={placedIds.has(tile.id) ? () => { onTileTap(groupIdx, ti); } : undefined}
          animDelay={ti * 0.04}
        />
      ))}
      {!valid && (
        <span style={{
          fontSize: 10, color: '#FF5252', fontFamily: "'Nunito', sans-serif",
          fontWeight: 800, marginLeft: 4, alignSelf: 'center',
        }}>✗</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection bar
// ─────────────────────────────────────────────────────────────────────────────

function SelectionBar({
  tiles, onNewGroup, onCancel, valid, initialMeldNeeded, meldValue,
}: {
  tiles: Tile[];
  onNewGroup: () => void;
  onCancel: () => void;
  valid: boolean;
  initialMeldNeeded: boolean;
  meldValue: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(1.6)' }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (tiles.length === 0) return null;

  const meetsInitialMeld = !initialMeldNeeded || meldValue >= 30;
  const canPlay = valid && meetsInitialMeld;

  return (
    <div ref={ref} style={{
      padding: '8px 12px',
      background: 'rgba(255,112,67,0.08)',
      borderTop: '1px solid rgba(255,112,67,0.2)',
      borderBottom: '1px solid rgba(255,112,67,0.2)',
    }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, paddingBottom: 2 }}>
        {tiles.map((t, i) => (
          <TileComp key={t.id} tile={t} size={34} animDelay={i * 0.04} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {initialMeldNeeded && (
          <span style={{
            fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700,
            color: meldValue >= 30 ? '#4CAF50' : 'rgba(255,255,255,0.4)',
          }}>
            {meldValue}/30 pt
          </span>
        )}
        <button
          onClick={onNewGroup}
          disabled={!canPlay}
          style={{
            flex: 1, padding: '7px 14px',
            borderRadius: 10,
            background: canPlay ? ACCENT : 'rgba(255,255,255,0.06)',
            border: 'none', cursor: canPlay ? 'pointer' : 'not-allowed',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 13,
            color: canPlay ? '#fff' : 'rgba(255,255,255,0.25)',
            boxShadow: canPlay ? `0 2px 0 ${ACCENT_DK}` : 'none',
          }}
        >
          {tiles.length < 3 ? `${tiles.length}/3 tiles` : 'Nieuwe groep'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '7px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player score row
// ─────────────────────────────────────────────────────────────────────────────

function PlayerRow({ player, active, tileCount }: { player: Player; active: boolean; tileCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current && ref.current) {
      gsap.fromTo(ref.current,
        { scale: 0.97 },
        { scale: 1, duration: 0.22, ease: 'back.out(2)' }
      );
    }
    wasActive.current = active;
  }, [active]);

  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px',
      borderRadius: 10,
      background: active ? `rgba(255,112,67,0.12)` : 'rgba(255,255,255,0.03)',
      border: `1.5px solid ${active ? ACCENT + '88' : 'rgba(255,255,255,0.07)'}`,
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? ACCENT : 'rgba(255,255,255,0.15)',
        boxShadow: active ? `0 0 8px ${ACCENT}` : 'none',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14,
          color: active ? '#fff' : 'rgba(255,255,255,0.55)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{player.name}{player.isAI ? ' 🤖' : ''}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {!player.hasInitialMeld && (
          <span style={{
            fontSize: 9, fontFamily: "'Nunito', sans-serif", fontWeight: 800,
            color: '#FFB830', letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>30+</span>
        )}
        <div style={{
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 13,
          color: 'rgba(255,255,255,0.5)', minWidth: 22, textAlign: 'right',
        }}>
          {tileCount}
          <span style={{ fontSize: 9, marginLeft: 2, opacity: 0.6 }}>tiles</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main game
// ─────────────────────────────────────────────────────────────────────────────

interface TurnDraft {
  rack: Tile[];          // current rack (selected tiles removed when placed)
  board: Group[];        // current working board
  placed: Set<string>;   // IDs of rack tiles placed this turn
  newGroupIndices: Set<number>; // indices of groups added this turn
}

function initDraft(gs: GameState): TurnDraft {
  return {
    rack: [...gs.players[gs.currentPlayer].rack],
    board: gs.board.map(g => [...g]),
    placed: new Set(),
    newGroupIndices: new Set(),
  };
}

function RummikubGame({ playerNames, aiFlags, onExit }: {
  playerNames: string[];
  aiFlags: boolean[];
  onExit: () => void;
}) {
  const [gs, setGs] = useState<GameState>(() => newGame(playerNames, aiFlags));
  const [draft, setDraft] = useState<TurnDraft>(() => initDraft(newGame(playerNames, aiFlags)));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const prevBoardLen = useRef(0);

  const player = gs.players[gs.currentPlayer];
  const isMyTurn = !player.isAI && gs.phase === 'playing';

  // Reset draft when turn changes
  useEffect(() => {
    setDraft(initDraft(gs));
    setSelectedIds(new Set());
    setErrorMsg(null);
    prevBoardLen.current = gs.board.length;
  }, [gs.currentPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI turn
  useEffect(() => {
    if (gs.phase !== 'playing' || !gs.players[gs.currentPlayer].isAI) return;
    setIsAiThinking(true);
    const timeout = setTimeout(() => {
      setGs(prev => aiDecide(prev));
      setIsAiThinking(false);
    }, 900);
    return () => clearTimeout(timeout);
  }, [gs.currentPlayer, gs.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll board to bottom when new groups added
  useEffect(() => {
    if (draft.board.length > prevBoardLen.current && boardRef.current) {
      boardRef.current.scrollTo({ top: boardRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [draft.board.length]);

  const selectedTiles = draft.rack.filter(t => selectedIds.has(t.id));
  const selectionValue = groupValue(selectedTiles);
  const selectionValid = isValidGroup(selectedTiles);

  const handleRackTap = useCallback((tile: Tile) => {
    if (!isMyTurn) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(tile.id)) next.delete(tile.id);
      else next.add(tile.id);
      return next;
    });
  }, [isMyTurn]);

  const handleNewGroup = useCallback(() => {
    if (!selectionValid || selectedTiles.length === 0) return;
    if (!player.hasInitialMeld && !draft.placed.size && selectionValue < 30) {
      setErrorMsg('Eerste inzet moet minimaal 30 punten zijn.');
      return;
    }

    const newGroup: Group = [...selectedTiles];
    const newGroupIdx = draft.board.length;

    setDraft(prev => {
      const newPlaced = new Set(prev.placed);
      selectedTiles.forEach(t => newPlaced.add(t.id));
      const newGroupIndices = new Set(prev.newGroupIndices);
      newGroupIndices.add(newGroupIdx);
      return {
        rack: prev.rack.filter(t => !selectedIds.has(t.id)),
        board: [...prev.board, newGroup],
        placed: newPlaced,
        newGroupIndices,
      };
    });
    setSelectedIds(new Set());
    setErrorMsg(null);
  }, [selectionValid, selectedTiles, selectionValue, player.hasInitialMeld, draft.placed.size, draft.board.length, selectedIds]);

  const handleGroupTap = useCallback((groupIdx: number) => {
    if (selectedTiles.length === 0) return;

    // Try to add tiles to this group
    const group = draft.board[groupIdx];
    const tileToAdd = selectedTiles[0]; // add one at a time or all

    // Try adding all selected tiles at various positions
    let newGroup: Group | null = null;
    for (let i = 0; i <= group.length; i++) {
      const candidate = [...group.slice(0, i), ...selectedTiles, ...group.slice(i)];
      if (isValidGroup(candidate)) {
        newGroup = candidate;
        break;
      }
    }
    void tileToAdd; // suppress unused warning

    if (!newGroup) {
      setErrorMsg('Deze tegels passen niet bij die groep.');
      setTimeout(() => setErrorMsg(null), 2000);
      return;
    }

    // Check initial meld for new groups
    if (!player.hasInitialMeld && draft.placed.size === 0) {
      const totalVal = selectedTiles.reduce((s, t) => s + (t.isJoker ? 0 : t.num), 0);
      if (totalVal < 30) {
        setErrorMsg('Eerste inzet moet minimaal 30 punten zijn.');
        return;
      }
    }

    setDraft(prev => {
      const newBoard = prev.board.map((g, i) => i === groupIdx ? newGroup! : g);
      const newPlaced = new Set(prev.placed);
      selectedTiles.forEach(t => newPlaced.add(t.id));
      return {
        ...prev,
        board: newBoard,
        rack: prev.rack.filter(t => !selectedIds.has(t.id)),
        placed: newPlaced,
      };
    });
    setSelectedIds(new Set());
    setErrorMsg(null);
  }, [selectedTiles, draft.board, draft.placed, player.hasInitialMeld, selectedIds]);

  // Take back a placed tile from a board group
  const handleTileTakeback = useCallback((groupIdx: number, tileIdx: number) => {
    setDraft(prev => {
      const group = prev.board[groupIdx];
      const tile = group[tileIdx];
      if (!prev.placed.has(tile.id)) return prev;

      const newGroup = group.filter((_, i) => i !== tileIdx);
      const newBoard = newGroup.length === 0
        ? prev.board.filter((_, i) => i !== groupIdx)
        : prev.board.map((g, i) => i === groupIdx ? newGroup : g);

      const newPlaced = new Set(prev.placed);
      newPlaced.delete(tile.id);

      // If new group indices need updating
      const newGroupIndices = new Set<number>();
      prev.newGroupIndices.forEach(idx => {
        if (idx < groupIdx) newGroupIndices.add(idx);
        else if (idx > groupIdx) newGroupIndices.add(idx - (newGroup.length === 0 ? 1 : 0));
        else if (newGroup.length > 0) newGroupIndices.add(idx);
      });

      return {
        ...prev,
        board: newBoard,
        rack: [...prev.rack, tile],
        placed: newPlaced,
        newGroupIndices,
      };
    });
  }, []);

  const handleDraw = useCallback(() => {
    if (!isMyTurn) return;
    if (draft.placed.size > 0) {
      setErrorMsg('Je hebt al tegels gespeeld. Bevestig je beurt of neem ze terug.');
      return;
    }
    setGs(prev => drawTile(prev));
  }, [isMyTurn, draft.placed.size]);

  const handleCommit = useCallback(() => {
    if (!isMyTurn || draft.placed.size === 0) return;

    if (!validateBoard(draft.board)) {
      setErrorMsg('Niet alle groepen op het bord zijn geldig!');
      // Shake animation
      if (boardRef.current) {
        gsap.fromTo(boardRef.current,
          { x: 0 },
          { x: 8, duration: 0.06, yoyo: true, repeat: 7, ease: 'power1.inOut',
            onComplete: () => { gsap.set(boardRef.current!, { x: 0 }); } }
        );
      }
      return;
    }

    // Check initial meld
    const isInitialMeld = !player.hasInitialMeld;
    if (isInitialMeld) {
      const playedTiles = [...draft.placed].map(id => {
        for (const g of draft.board) {
          const t = g.find(t => t.id === id);
          if (t) return t;
        }
        return null;
      }).filter(Boolean) as Tile[];
      const val = playedTiles.filter(t => !t.isJoker).reduce((s, t) => s + t.num, 0);
      if (val < 30) {
        setErrorMsg('Eerste inzet moet minimaal 30 punten zijn.');
        return;
      }
    }

    setGs(prev => commitTurn(prev, draft.board, draft.rack, isInitialMeld));
    setErrorMsg(null);
  }, [isMyTurn, draft, player.hasInitialMeld]);

  if (gs.phase === 'gameover') {
    return <WinScreen winner={gs.players[gs.winner!]} players={gs.players} onRestart={onExit} />;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: BG, color: '#EEF2FF',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes rum-pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '12px 16px 8px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <button onClick={onExit} style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div style={{
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
          color: ACCENT, flex: 1,
        }}>Rummikub</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: gs.pool.length > 0 ? '#4CAF50' : '#FF5252',
          }} />
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {gs.pool.length} over
          </span>
        </div>
      </div>

      {/* Players bar */}
      <div style={{
        padding: '6px 12px',
        display: 'flex', gap: 6, overflowX: 'auto',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {gs.players.map((p, i) => (
          <PlayerRow
            key={i}
            player={p}
            active={i === gs.currentPlayer}
            tileCount={i === gs.currentPlayer && isMyTurn ? draft.rack.length : p.rack.length}
          />
        ))}
      </div>

      {/* AI thinking indicator */}
      {isAiThinking && (
        <div style={{
          padding: '6px 16px',
          fontFamily: "'Nunito', sans-serif", fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          animation: 'rum-pulse 1.2s ease-in-out infinite',
          flexShrink: 0,
        }}>
          {gs.players[gs.currentPlayer].name} denkt na...
        </div>
      )}

      {/* Board */}
      <div
        ref={boardRef}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {draft.board.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 32, opacity: 0.2 }}>🃏</div>
            <div style={{
              fontFamily: "'Nunito', sans-serif", fontSize: 12,
              color: 'rgba(255,255,255,0.2)',
            }}>Bord is leeg — speel de eerste groep!</div>
          </div>
        ) : (
          draft.board.map((group, gi) => (
            <BoardGroup
              key={gi}
              group={group}
              groupIdx={gi}
              hasSelected={selectedIds.size > 0}
              placedIds={draft.placed}
              onGroupTap={handleGroupTap}
              onTileTap={handleTileTakeback}
              isNew={draft.newGroupIndices.has(gi)}
            />
          ))
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div style={{
          padding: '6px 16px',
          background: 'rgba(255,80,80,0.1)',
          borderTop: '1px solid rgba(255,80,80,0.2)',
          fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700,
          color: '#FF6B6B',
          flexShrink: 0,
        }}>
          {errorMsg}
        </div>
      )}

      {/* Selection bar */}
      {selectedIds.size > 0 && isMyTurn && (
        <SelectionBar
          tiles={selectedTiles}
          onNewGroup={handleNewGroup}
          onCancel={() => setSelectedIds(new Set())}
          valid={selectionValid}
          initialMeldNeeded={!player.hasInitialMeld}
          meldValue={selectionValue}
        />
      )}

      {/* Player rack */}
      {isMyTurn && (
        <div style={{
          borderTop: '1px solid rgba(255,112,67,0.2)',
          background: 'rgba(255,112,67,0.04)',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '6px 12px 4px',
            fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
          }}>
            Jouw tegels ({draft.rack.length})
            {!player.hasInitialMeld && (
              <span style={{ marginLeft: 8, color: '#FFB830' }}>— eerste inzet: min 30 pt</span>
            )}
          </div>
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            padding: '4px 12px 10px',
          }}>
            {draft.rack.map((tile, i) => (
              <TileComp
                key={tile.id}
                tile={tile}
                selected={selectedIds.has(tile.id)}
                onClick={() => handleRackTap(tile)}
                size={44}
                animDelay={i * 0.025}
              />
            ))}
            {draft.rack.length === 0 && (
              <div style={{
                padding: '12px 16px',
                fontFamily: "'Fredoka', sans-serif", fontSize: 14,
                color: '#4CAF50', fontWeight: 700,
              }}>
                Rack leeg! Bevestig je beurt!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other player rack (face-down) */}
      {!isMyTurn && gs.phase === 'playing' && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 12px',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 800,
            letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            {isAiThinking ? 'AI speelt...' : 'Wachten op andere speler'}
          </div>
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto' }}>
            {Array.from({ length: Math.min(14, gs.players[gs.currentPlayer].rack.length) }).map((_, i) => (
              <div key={i} style={{
                width: 34, height: 47, borderRadius: 6, flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      {isMyTurn && (
        <div style={{
          display: 'flex', gap: 8, padding: '8px 12px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleDraw}
            disabled={draft.placed.size > 0}
            style={{
              flex: 1, padding: '11px 8px', borderRadius: 12,
              background: draft.placed.size > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
              border: `1.5px solid ${draft.placed.size > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)'}`,
              cursor: draft.placed.size > 0 ? 'not-allowed' : 'pointer',
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14,
              color: draft.placed.size > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
            }}
          >
            Trek kaart
          </button>
          <button
            onClick={handleCommit}
            disabled={draft.placed.size === 0}
            style={{
              flex: 1, padding: '11px 8px', borderRadius: 12,
              background: draft.placed.size > 0 ? ACCENT : 'rgba(255,255,255,0.04)',
              border: 'none',
              cursor: draft.placed.size > 0 ? 'pointer' : 'not-allowed',
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14,
              color: draft.placed.size > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
              boxShadow: draft.placed.size > 0 ? `0 3px 0 ${ACCENT_DK}` : 'none',
            }}
          >
            Bevestig beurt
          </button>
        </div>
      )}

      <BottomNav chatMode="popup" items={[{ label: 'Terug', icon: 'home', onClick: onExit }]} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Win screen
// ─────────────────────────────────────────────────────────────────────────────

function WinScreen({ winner, players, onRestart }: {
  winner: Player;
  players: Player[];
  onRestart: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tl = gsap.timeline();
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo(el.querySelector('.win-title'),
        { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2.5)' }, '-=0.1')
      .to(el.querySelector('.win-title'), { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1 }, '+=0.2');
  }, []);

  const scores = players.map(p => ({
    name: p.name,
    tiles: p.rack.length,
    pts: p.rack.filter(t => !t.isJoker).reduce((s, t) => s + t.num, 0),
  })).sort((a, b) => a.tiles - b.tiles);

  return (
    <div ref={ref} style={{
      minHeight: '100dvh', background: BG, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 20, color: '#EEF2FF',
    }}>
      <div className="win-title" style={{
        fontFamily: "'Fredoka', sans-serif", fontSize: 52, fontWeight: 700,
        color: ACCENT, textAlign: 'center', lineHeight: 1.1,
        textShadow: `0 0 40px ${ACCENT}66`,
      }}>
        🏆<br />{winner.name}
      </div>
      <div style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
      }}>
        wint met een leeg rack!
      </div>

      <div style={{
        width: '100%', maxWidth: 320,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {scores.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', padding: '12px 16px',
            borderBottom: i < scores.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            background: s.name === winner.name ? `rgba(255,112,67,0.08)` : 'transparent',
          }}>
            <span style={{
              fontFamily: "'Fredoka', sans-serif", fontSize: 14, fontWeight: 700,
              width: 24, color: 'rgba(255,255,255,0.35)',
            }}>#{i + 1}</span>
            <span style={{ flex: 1, fontFamily: "'Fredoka', sans-serif", fontSize: 16 }}>
              {s.name}
            </span>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {s.tiles} tiles · {s.pts} pt
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        style={{
          padding: '14px 40px', borderRadius: 14,
          background: ACCENT, border: 'none', cursor: 'pointer',
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
          color: '#fff', boxShadow: `0 4px 0 ${ACCENT_DK}, 0 0 30px ${ACCENT}44`,
        }}
      >
        Nieuw spel
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start screen
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_COLORS_START = [ACCENT, '#2196F3', '#4CAF50', '#AB47BC'];

function StartScreen({ onStart }: { onStart: (names: string[], ai: boolean[]) => void }) {
  const router = useRouter();
  const [players, setPlayers] = useState([
    { name: '', ai: false },
    { name: '', ai: true },
  ]);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
  }, []);

  const canStart = players.every(p => p.name.trim().length > 0);

  function addPlayer() {
    if (players.length >= 4) return;
    setPlayers(p => [...p, { name: '', ai: true }]);
  }

  function removePlayer(i: number) {
    if (players.length <= 2) return;
    setPlayers(p => p.filter((_, idx) => idx !== i));
  }

  return (
    <div ref={ref} style={{
      minHeight: '100dvh', background: BG, color: '#EEF2FF',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24, gap: 0,
    }}>
      <div style={{
        fontFamily: "'Fredoka', sans-serif", fontSize: 42, fontWeight: 700,
        color: ACCENT, marginBottom: 4,
        textShadow: `0 0 30px ${ACCENT}44`,
      }}>
        Rummikub
      </div>
      <div style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 800,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)', marginBottom: 32,
      }}>
        TEGELS · SETS · RUNS
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {players.map((p, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: PLAYER_COLORS_START[i], flexShrink: 0,
              boxShadow: `0 0 8px ${PLAYER_COLORS_START[i]}`,
            }} />
            <input
              value={p.name}
              onChange={e => setPlayers(prev => prev.map((pp, ii) => ii === i ? { ...pp, name: e.target.value } : pp))}
              placeholder={`Speler ${i + 1}`}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                color: '#EEF2FF', fontFamily: "'Nunito', sans-serif",
                fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={() => setPlayers(prev => prev.map((pp, ii) => ii === i ? { ...pp, ai: !pp.ai } : pp))}
              style={{
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: p.ai ? 'rgba(255,112,67,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${p.ai ? ACCENT + '88' : 'rgba(255,255,255,0.12)'}`,
                fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800,
                color: p.ai ? ACCENT : 'rgba(255,255,255,0.4)',
                flexShrink: 0,
              }}
            >
              {p.ai ? '🤖 AI' : '👤'}
            </button>
            {players.length > 2 && (
              <button
                onClick={() => removePlayer(i)}
                style={{
                  width: 28, height: 28, borderRadius: 8, cursor: 'pointer', padding: 0,
                  background: 'rgba(255,80,80,0.1)',
                  border: '1px solid rgba(255,80,80,0.2)',
                  color: '#FF5252', fontSize: 14, flexShrink: 0,
                }}
              >✕</button>
            )}
          </div>
        ))}

        {players.length < 4 && (
          <button
            onClick={addPlayer}
            style={{
              padding: '8px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px dashed rgba(255,255,255,0.15)',
              fontFamily: "'Nunito', sans-serif", fontSize: 12,
              color: 'rgba(255,255,255,0.35)', fontWeight: 700,
            }}
          >
            + Speler toevoegen
          </button>
        )}

        <div style={{ height: 8 }} />

        <button
          onClick={() => {
            if (!canStart) return;
            onStart(players.map(p => p.name.trim()), players.map(p => p.ai));
          }}
          disabled={!canStart}
          style={{
            padding: '14px', borderRadius: 14,
            background: canStart ? ACCENT : 'rgba(255,255,255,0.06)',
            border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
            color: canStart ? '#fff' : 'rgba(255,255,255,0.25)',
            boxShadow: canStart ? `0 4px 0 ${ACCENT_DK}` : 'none',
          }}
        >
          Start spel
        </button>
      </div>

      <div style={{ height: 24 }} />
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Nunito', sans-serif", fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        ← Terug naar home
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page entry
// ─────────────────────────────────────────────────────────────────────────────

function RummikubContent() {
  useSearchParams(); // for SSR compat
  const [gameState, setGameState] = useState<{ names: string[]; ai: boolean[] } | null>(null);

  if (!gameState) {
    return <StartScreen onStart={(names, ai) => setGameState({ names, ai })} />;
  }

  return (
    <RummikubGame
      playerNames={gameState.names}
      aiFlags={gameState.ai}
      onExit={() => setGameState(null)}
    />
  );
}

export default function RummikubPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#1a0f0a' }} />}>
      <RummikubContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { getSocket } from "@/lib/socket";

export type GameMode = "fast" | "slow";

export function useTurnTimer(isMyTurn: boolean, roomId?: string, playerIndex?: number) {
  const [deadline, setDeadline]   = useState<Date | null>(null);
  const [gameMode, setGameMode]   = useState<GameMode>("fast");
  const [timeLeft, setTimeLeft]   = useState<number | null>(null); // ms
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef   = useRef(false);
  const roomIdRef    = useRef(roomId);
  const playerIdxRef = useRef(playerIndex);
  roomIdRef.current    = roomId;
  playerIdxRef.current = playerIndex;

  useEffect(() => {
    const socket = getSocket();

    function onDeadline({ deadline: d, gameMode: gm }: { deadline: string; gameMode: GameMode }) {
      setDeadline(new Date(d));
      setGameMode(gm);
      expiredRef.current = false;
    }

    socket.on("turn-deadline", onDeadline);
    return () => { socket.off("turn-deadline", onDeadline); };
  }, []);

  // Countdown tick — trigger forfeit via API when fast-mode deadline passes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!deadline) { setTimeLeft(null); return; }

    function tick() {
      const ms = deadline!.getTime() - Date.now();
      setTimeLeft(Math.max(0, ms));

      if (ms <= 0 && !expiredRef.current && gameMode === "fast" && !isMyTurn && roomIdRef.current) {
        expiredRef.current = true;
        // Non-active player triggers the server-side forfeit check
        fetch("/api/socket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "turn-expired", roomId: roomIdRef.current, playerIndex: playerIdxRef.current }),
        }).catch(() => {});
      }
    }
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [deadline, gameMode, isMyTurn]);

  return { timeLeft, gameMode, deadline, isMyTurn };
}

export function formatTimeLeft(ms: number, gameMode: GameMode): string {
  if (gameMode === "slow") {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h >= 1) return `${h}u ${m}m`;
    return `${m}m`;
  }
  // fast: MM:SS
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

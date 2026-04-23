"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import BottomSheet from "@/components/BottomSheet";
import { ChatPanel } from "@/components/ui";
import { getSocket } from "@/lib/socket";
import { useLang } from "@/lib/lang";
import toast from "react-hot-toast";

type ChatMsg = { user: string; text: string };

const REACTION_EMOJIS = ['😂','🔥','💀','😤','🤡','👀','🫡','🐛','😈','🎲','💯','😭','🙈','⚡','👑','🫶','🤌','💅','🥶','🤯','🫠','🗿'];
interface FloatingEmoji { id: number; emoji: string; x: number; }

function playReactSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch { /* Safari / blocked */ }
}

function getGameRoute(gameType: string, roomId: string) {
  if (gameType === "grub")  return `/grub?room=${roomId}`;
  if (gameType === "ticket-to-ride") return `/ticket-to-ride?room=${roomId}`;
  if (gameType === "carcassonne")  return `/carcassonne?room=${roomId}`;
  return `/game/${roomId}`;
}

interface Props {
  roomId: string;
  myName: string;
  playerNames: string[];
  gameType: string;
  isSpectator?: boolean;
  isGameOver: boolean;
  myPlayerIndex: number;
  accent?: string;
  onResign?: () => void;
  inHeader?: boolean;
  onSendEmoji?: (emoji: string) => void;
  incomingEmoji?: { emoji: string; ts: number } | null;
  hideChat?: boolean;
}

export default function GameControls({
  roomId,
  myName,
  playerNames,
  gameType,
  isSpectator,
  isGameOver,
  myPlayerIndex,
  accent = "#5B7FFF",
  onResign,
  inHeader = false,
  onSendEmoji,
  incomingEmoji,
  hideChat = false,
}: Props) {
  const router = useRouter();
  const { t } = useLang();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [unread, setUnread] = useState(0);
  const [confirmResign, setConfirmResign] = useState(false);
  const [rematch, setRematch] = useState<"idle" | "offered_by_us" | "incoming" | "declined">("idle");
  const [rematchFrom, setRematchFrom] = useState("");
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const nextEmojiId = useRef(0);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  const resignSheetRef = useRef<HTMLDivElement>(null);
  const resignBackdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    console.log("[chat] mount — room-chat-history voor roomId:", roomId);
    socket.emit("room-chat-history", { roomId }, (history: ChatMsg[]) => {
      console.log("[chat] mount history ontvangen:", history);
      setMessages(history);
    });

    const onMsg = (msg: ChatMsg) => {
      console.log("[chat] room-chat ontvangen:", msg);
      setMessages((prev) => [...prev.slice(-99), msg]);
      if (!chatOpenRef.current) {
        setUnread((n) => n + 1);
        toast(`${msg.user}: ${msg.text}`, {
          icon: "💬",
          style: { maxWidth: 320 },
        });
      }
    };
    const onOffer = ({ from }: { from: string }) => {
      setRematchFrom(from);
      setRematch("incoming");
    };
    const onDeclined = () => setRematch("declined");
    const onRoomUpdate = ({ ready, roomId: rid }: { ready: boolean; roomId: string }) => {
      if (ready && rid) {
        router.push(getGameRoute(gameType, rid));
      }
    };

    socket.on("room-chat", onMsg);
    socket.on("rematch-offer", onOffer);
    socket.on("rematch-declined", onDeclined);
    socket.on("room-update", onRoomUpdate);

    return () => {
      socket.off("room-chat", onMsg);
      socket.off("rematch-offer", onOffer);
      socket.off("rematch-declined", onDeclined);
      socket.off("room-update", onRoomUpdate);
    };
  }, [roomId, gameType, router]);

  useEffect(() => {
    if (!chatOpen) return;
    setUnread(0);
    // Herlaad history elke keer dat chat opengaat
    console.log("[chat] open — room-chat-history voor roomId:", roomId);
    getSocket().emit("room-chat-history", { roomId }, (history: ChatMsg[]) => {
      console.log("[chat] open history ontvangen:", history);
      if (Array.isArray(history) && history.length > 0) setMessages(history);
    });
  }, [chatOpen, roomId]);

  function sendChatMessage(text: string) {
    console.log("[chat] stuur bericht:", { text, name: myName, roomId });
    getSocket().emit("room-chat-send", { message: text, name: myName, roomId });
    setMessages((prev) => [...prev.slice(-99), { user: myName, text }]);
  }

  function requestRematch() {
    setRematch("offered_by_us");
    getSocket().emit("rematch-request");
  }

  function acceptRematch() {
    getSocket().emit("rematch-request");
  }

  function declineRematch() {
    getSocket().emit("rematch-decline");
    setRematch("idle");
  }

  useEffect(() => {
    if (!incomingEmoji) return;
    playReactSound();
    const id = nextEmojiId.current++;
    setFloating(prev => [...prev, { id, emoji: incomingEmoji.emoji, x: window.innerWidth * 0.72 }]);
    const t = setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 1400);
    return () => clearTimeout(t);
  }, [incomingEmoji]);

  function handleEmojiClick(emoji: string, e: React.MouseEvent) {
    playReactSound();
    onSendEmoji?.(emoji);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = nextEmojiId.current++;
    setFloating(prev => [...prev, { id, emoji, x: rect.left + rect.width / 2 }]);
    setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 1400);
  }

  useEffect(() => {
    if (confirmResign && resignSheetRef.current && resignBackdropRef.current) {
      gsap.fromTo(resignBackdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(resignSheetRef.current, { y: "100%" }, { y: "0%", duration: 0.38, ease: "power3.out" });
    }
  }, [confirmResign]);

  function closeResign() {
    if (resignSheetRef.current && resignBackdropRef.current) {
      gsap.to(resignSheetRef.current, { y: "100%", duration: 0.32, ease: "power3.in" });
      gsap.to(resignBackdropRef.current, { opacity: 0, duration: 0.28, ease: "power2.in", onComplete: () => setConfirmResign(false) });
    } else {
      setConfirmResign(false);
    }
  }

  const canAction = !isSpectator && myPlayerIndex >= 0;

  return (
    <>
      {/* Floating emojis */}
      {floating.map(f => (
        <div key={f.id} style={{
          position: 'fixed', left: f.x, bottom: 130,
          fontSize: 32, pointerEvents: 'none', zIndex: 500, lineHeight: 1,
          animation: 'emoji-float 1.4s ease-out forwards',
        }}>
          {f.emoji}
        </div>
      ))}

      {/* Spectator badge */}
      {isSpectator && (
        <div style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20, padding: "6px 16px", zIndex: 200,
          fontFamily: "'Nunito', sans-serif", fontSize: 12, fontWeight: 700,
          color: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)",
        }}>
          Toeschouwer
        </div>
      )}

      {/* Toolbar */}
      <div style={inHeader ? {
        display: "flex", flexDirection: "row", alignSelf: "stretch", gap: 4,
      } : {
        position: "fixed", bottom: 72, right: 12, zIndex: 150,
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      }}>
        {/* Chat button */}
        {!hideChat && (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              width: inHeader ? 36 : 44, height: inHeader ? undefined : 44,
              alignSelf: inHeader ? "stretch" : undefined,
              borderRadius: 0,
              background: "var(--card2)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              fontSize: 15, cursor: "pointer", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
            } as React.CSSProperties}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            {unread > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4, background: "var(--accent)",
                color: "#fff", borderRadius: "50%", width: 16, height: 16,
                fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-body)",
              }}>
                {unread}
              </span>
            )}
          </button>
        )}

        {/* Resign button */}
        {canAction && !isGameOver && (
          <button
            onClick={() => setConfirmResign(true)}
            title="Opgeven"
            style={{
              width: inHeader ? 36 : 44, height: inHeader ? undefined : 44,
              alignSelf: inHeader ? "stretch" : undefined,
              borderRadius: 0,
              background: "rgba(193,74,31,0.06)",
              border: "1px solid rgba(193,74,31,0.2)",
              color: "var(--accent)",
              fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            } as React.CSSProperties}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l16 16M4 20L20 4"/>
            </svg>
          </button>
        )}
      </div>

      {/* Chat — bottom sheet met ChatPanel */}
      <BottomSheet
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        fixed
        zIndex={9000}
        maxHeight="80vh"
        sheetStyle={{ background: "#0E0B1E", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", display: "flex", flexDirection: "column" }}
      >
        {(close) => (
          <>
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>
            {/* Header */}
            <div style={{ padding: "8px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700, color: accent }}>Spelchat</div>
              <button onClick={close} style={{ background: "none", border: "none", color: "rgba(238,242,255,0.35)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {/* ChatPanel */}
            <div style={{ flex: 1, minHeight: 0, padding: "0 12px 20px", display: "flex", flexDirection: "column" }}>
              <ChatPanel
                messages={messages}
                onSend={sendChatMessage}
                myName={myName}
                accent={accent}
                card="transparent"
                border="transparent"
              />
            </div>
          </>
        )}
      </BottomSheet>

      {/* Resign confirm — bottom drawer */}
      <BottomSheet
        isOpen={confirmResign}
        onClose={() => setConfirmResign(false)}
        fixed
        zIndex={9000}
        sheetStyle={{ background: "#11163A", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", padding: "8px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}
      >
        {(close) => (
          <>
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>
            <div style={{ padding: "0 24px 32px" }}>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 24, fontWeight: 700, color: "#EEF2FF", marginBottom: 6, textAlign: "center" }}>{t.resignTitle}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 28, textAlign: "center" }}>
                {t.resignSub}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => { close(); setTimeout(() => onResign?.(), 420); }}
                  style={{ width: "100%", padding: "14px 0", borderRadius: 50, border: "none", background: "#ef4444", color: "#fff", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 17, cursor: "pointer", boxShadow: "0 4px 0 #b91c1c" }}
                >
                  {t.resignBtn}
                </button>
                <button
                  onClick={close}
                  style={{ width: "100%", padding: "14px 0", borderRadius: 50, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 0 rgba(0,0,0,0.4)" }}
                >
                  {t.cancelBtn}
                </button>
              </div>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Rematch overlays */}
      {isGameOver && canAction && rematch === "idle" && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200 }}>
          <button
            onClick={requestRematch}
            style={{
              padding: "11px 28px", borderRadius: 50, border: "none",
              background: accent, color: "#fff",
              fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 15,
              cursor: "pointer", boxShadow: `0 0 20px ${accent}55`,
            }}
          >
            Rematch aanvragen
          </button>
        </div>
      )}

      {rematch === "offered_by_us" && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", background: "rgba(17,22,58,0.9)", borderRadius: 50, padding: "10px 20px", backdropFilter: "blur(8px)" }}>
          Wachten op tegenstander...
        </div>
      )}

      {rematch === "incoming" && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", gap: 10, alignItems: "center", background: "rgba(17,22,58,0.95)", borderRadius: 20, padding: "12px 20px", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            {rematchFrom} wil rematch
          </span>
          <button onClick={acceptRematch} style={{ padding: "7px 18px", borderRadius: 50, border: "none", background: accent, color: "#fff", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Accepteren
          </button>
          <button onClick={declineRematch} style={{ padding: "7px 14px", borderRadius: 50, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.5)", fontFamily: "'Nunito', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Nee
          </button>
        </div>
      )}

      {rematch === "declined" && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(255,100,100,0.7)", background: "rgba(17,22,58,0.9)", borderRadius: 50, padding: "10px 20px", backdropFilter: "blur(8px)" }}>
          Rematch geweigerd
        </div>
      )}
    </>
  );
}

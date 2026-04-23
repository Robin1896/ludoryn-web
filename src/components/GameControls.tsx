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
  if (gameType === "grub") return `/grub?room=${roomId}`;
  if (gameType === "ticket-to-ride") return `/ticket-to-ride?room=${roomId}`;
  if (gameType === "carcassonne") return `/carcassonne?room=${roomId}`;
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
  accent = "var(--accent)",
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

    socket.emit("room-chat-history", { roomId }, (history: ChatMsg[]) => {
      setMessages(history);
    });

    const onMsg = (msg: ChatMsg) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
      if (!chatOpenRef.current) {
        setUnread((n) => n + 1);
        toast(`${msg.user}: ${msg.text}`, { icon: "💬", style: { maxWidth: 320 } });
      }
    };
    const onOffer = ({ from }: { from: string }) => { setRematchFrom(from); setRematch("incoming"); };
    const onDeclined = () => setRematch("declined");
    const onRoomUpdate = ({ ready, roomId: rid }: { ready: boolean; roomId: string }) => {
      if (ready && rid) router.push(getGameRoute(gameType, rid));
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
    getSocket().emit("room-chat-history", { roomId }, (history: ChatMsg[]) => {
      if (Array.isArray(history) && history.length > 0) setMessages(history);
    });
  }, [chatOpen, roomId]);

  function sendChatMessage(text: string) {
    getSocket().emit("room-chat-send", { message: text, name: myName, roomId });
    setMessages((prev) => [...prev.slice(-99), { user: myName, text }]);
  }

  function requestRematch() { setRematch("offered_by_us"); getSocket().emit("rematch-request"); }
  function acceptRematch() { getSocket().emit("rematch-request"); }
  function declineRematch() { getSocket().emit("rematch-decline"); setRematch("idle"); }

  useEffect(() => {
    if (!incomingEmoji) return;
    playReactSound();
    const id = nextEmojiId.current++;
    setFloating(prev => [...prev, { id, emoji: incomingEmoji.emoji, x: window.innerWidth * 0.72 }]);
    const timer = setTimeout(() => setFloating(prev => prev.filter(f => f.id !== id)), 1400);
    return () => clearTimeout(timer);
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
          position: "fixed", left: f.x, bottom: 130,
          fontSize: 32, pointerEvents: "none", zIndex: 500, lineHeight: 1,
          animation: "emoji-float 1.4s ease-out forwards",
        }}>
          {f.emoji}
        </div>
      ))}

      {/* Spectator badge */}
      {isSpectator && (
        <div style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 0, padding: "5px 14px", zIndex: 200,
          fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--text-muted)",
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

      {/* Chat bottom sheet */}
      <BottomSheet
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        fixed
        zIndex={9000}
        maxHeight="80vh"
        sheetStyle={{
          background: "var(--card)",
          borderRadius: 0,
          borderTop: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
        }}
      >
        {(close) => (
          <>
            <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, fontWeight: 400, color: "var(--text)" }}>Spelchat</div>
              <button onClick={close} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
            </div>
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

      {/* Resign confirm bottom sheet */}
      <BottomSheet
        isOpen={confirmResign}
        onClose={() => setConfirmResign(false)}
        fixed
        zIndex={9000}
        sheetStyle={{
          background: "var(--card)",
          borderRadius: 0,
          borderTop: "1px solid var(--border)",
          padding: "20px 24px 32px",
        }}
      >
        {(close) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 24, fontWeight: 400, color: "var(--text)", marginBottom: 6 }}>{t.resignTitle}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{t.resignSub}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => { close(); setTimeout(() => onResign?.(), 320); }}
                style={{ width: "100%", padding: "12px 0", borderRadius: 0, border: "none", background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
              >
                {t.resignBtn}
              </button>
              <button
                onClick={close}
                style={{ width: "100%", padding: "12px 0", borderRadius: 0, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Rematch overlays */}
      {isGameOver && canAction && rematch === "idle" && (
        <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", zIndex: 200 }}>
          <button
            onClick={requestRematch}
            style={{
              padding: "10px 24px", borderRadius: 0, border: "none",
              background: "var(--accent)", color: "#fff",
              fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Rematch aanvragen
          </button>
        </div>
      )}

      {rematch === "offered_by_us" && (
        <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", zIndex: 200, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", background: "var(--card)", border: "1px solid var(--border)", padding: "8px 16px", whiteSpace: "nowrap" }}>
          Wachten op tegenstander…
        </div>
      )}

      {rematch === "incoming" && (
        <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", gap: 8, alignItems: "center", background: "var(--card)", border: "1px solid var(--border)", padding: "10px 16px" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {rematchFrom} wil rematch
          </span>
          <button onClick={acceptRematch} style={{ padding: "6px 14px", borderRadius: 0, border: "none", background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
            Ja
          </button>
          <button onClick={declineRematch} style={{ padding: "6px 12px", borderRadius: 0, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 11, cursor: "pointer" }}>
            Nee
          </button>
        </div>
      )}

      {rematch === "declined" && (
        <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", zIndex: 200, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--accent)", background: "var(--card)", border: "1px solid var(--border)", padding: "8px 16px", whiteSpace: "nowrap" }}>
          Rematch geweigerd
        </div>
      )}
    </>
  );
}

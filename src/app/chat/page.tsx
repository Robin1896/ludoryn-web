"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { BottomNav, PageHeader, ChatPanel } from "@/components/ui";
import { getSocket } from "@/lib/socket";
import { useLang } from "@/lib/lang";

type GlobalChatMsg = { user: string; text: string; role?: "mod" };

function ChatContent() {
  const router = useRouter();
  const { t } = useLang();
  const [msgs, setMsgs] = useState<GlobalChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.username) setMyName(d.username); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const handler = (msg: GlobalChatMsg) => setMsgs(prev => [...prev.slice(-49), msg]);
    socket.on("chat-global", handler);
    socket.emit("chat-history", { gameType: "global" }, (history: GlobalChatMsg[]) => {
      setMsgs(history ?? []);
      setLoading(false);
    });
    return () => { socket.off("chat-global", handler); };
  }, []);

  function handleSend(text: string) {
    const name = myName ?? sessionStorage.getItem("ludoryn-name") ?? t.anonymous;
    getSocket().emit("chat-send", { gameType: "global", userName: name, message: text }, () => {});
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg-gradient)",
      color: "var(--text)",
      display: "flex",
      flexDirection: "column",
    }}>
      <PageHeader left={<>
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, color: "var(--text)" }}>{t.globalChat}</span>
      </>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 16px 100px", minHeight: 0 }}>
        <ChatPanel
          messages={msgs}
          loading={loading}
          myName={myName}
          onSend={handleSend}
          card="transparent"
          border="var(--border)"
          maxHeight={999999}
        />
      </div>

      <BottomNav
        chatMode="page"
        items={[
          { label: t.home,   icon: "home",   onClick: () => router.push("/")       },
          { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby")  },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

        ]}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--bg-gradient)" }} />}>
      <ChatContent />
    </Suspense>
  );
}

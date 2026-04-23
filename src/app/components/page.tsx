"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button, IconButton,
  Avatar, Toggle, PlayerDots,
  StatusBadge, TableCard,
  CTABanner, Notification, VictoryPopup,
  NameModal, LeaderboardRow,
  TopNav, BottomNav,
  SectionHeader, ChatPanel,
  UI_BG, UI_CARD, UI_CARD2, UI_BORDER, UI_ACCENT, UI_AMBER,
} from "@/components/ui";

const MOCK_CHAT = [
  { user: "WheatKing88",   text: "Anyone for a quick match? 🎲" },
  { user: "TradeMaster",   text: "I've got wood for sheep! 😂" },
  { user: "GameMod_Alex",  text: "Server maintenance scheduled for 02:00 UTC.", role: "mod" as const },
];

function Section({ children }: { children: React.ReactNode }) {
  return <section style={{ marginBottom: 56 }}>{children}</section>;
}

export default function ComponentsPage() {
  const [volume, setVolume]         = useState(75);
  const [soundFx, setSoundFx]       = useState(true);
  const [fastMode, setFastMode]     = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [chat, setChat]             = useState(MOCK_CHAT);

  return (
    <main style={{ minHeight: "100vh", background: UI_BG, color: "#fff", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <TopNav
        left={
          <>
            <div style={{ background: UI_ACCENT, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⊞</div>
            <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1, textTransform: "uppercase", fontStyle: "italic" }}>Ludoryn UI</span>
          </>
        }
        right={
          <Link href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: `1px solid ${UI_BORDER}` }}>
            ← Home
          </Link>
        }
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 140px" }}>

        {/* ── BUTTONS ──────────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="⊡" title="Buttons" />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <Button accent={UI_ACCENT}>PLAY NOW ▶</Button>
            <Button accent="#334155" shadowColor="#1e293b">QUIT</Button>
            <Button accent={UI_ACCENT} size="sm">Small</Button>
            <Button accent={UI_ACCENT} size="lg">Large</Button>
            <Button accent={UI_ACCENT} disabled>Disabled</Button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <IconButton icon="⚙" accent={UI_CARD2} shadowColor="#0f172a" />
            <IconButton icon="♥" accent="#EF4444" shadowColor="#991b1b" />
            <IconButton icon="🏆" accent={UI_AMBER} shadowColor="#92400e" textColor="#1c0a00" />
          </div>
        </Section>

        {/* ── AVATAR ───────────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="◉" title="Avatar" />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Avatar name="Aria" color="#7C3AED" size={64} online="green" />
            <Avatar name="Leo"  color={UI_ACCENT} size={48} online="green" />
            <Avatar name="Sam"  color="#64748B" size={40} online="grey" />
            <Avatar name="Kai"  color="#EF4444" size={32} />
          </div>
        </Section>

        {/* ── TOGGLE ───────────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="⇄" title="Game Settings" />
          <div style={{ background: UI_CARD, borderRadius: 20, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 460 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginBottom: 12 }}>
                <span>Music Volume</span>
                <span style={{ color: UI_ACCENT }}>{volume}%</span>
              </div>
              <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ width: "100%", accentColor: UI_ACCENT, height: 6, cursor: "pointer" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700 }}>Sound Effects</span>
              <Toggle checked={soundFx} onChange={() => setSoundFx((v) => !v)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700 }}>Fast Mode</span>
              <Toggle checked={fastMode} onChange={() => setFastMode((v) => !v)} />
            </div>
          </div>
        </Section>

        {/* ── PLAYER DOTS + STATUS BADGE ───────────────────────────────── */}
        <Section>
          <SectionHeader icon="●" title="Player Dots & Badges" />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <PlayerDots filled={1} total={4} />
              <PlayerDots filled={2} total={4} />
              <PlayerDots filled={3} total={4} />
              <PlayerDots filled={4} total={4} accent="#22c55e" />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge label="Competitive" color={UI_ACCENT} />
              <StatusBadge label="Live"        color="#22C55E" variant="solid" />
              <StatusBadge label="Binnenkort"  color="rgba(255,255,255,0.4)" variant="outline" />
              <StatusBadge label="Full"        color="#EF4444" />
              <StatusBadge label="Joined"      color={UI_ACCENT} variant="solid" />
            </div>
          </div>
        </Section>

        {/* ── TABLE CARD ───────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="⊞" title="Table Cards" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TableCard icon="🏝" title="Table #42"     subtitle="Classic Mode · Victory Points: 10" badge="Competitive" filled={3} total={4} isFull={false} onJoin={() => {}} />
            <TableCard icon="🏝" title="Seafarers Hub" subtitle="Expansion · Random Map"           filled={4} total={4} isFull={true}  onJoin={() => {}} />
            <TableCard icon="🏝" title="Table #108"    subtitle="Fast Mode · 15 min"               filled={1} total={4} isFull={false} onJoin={() => {}} accent="#22c55e" />
          </div>
        </Section>

        {/* ── LEADERBOARD ──────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="📊" title="Leaderboard" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
            <LeaderboardRow rank={1} name="Aria Stark"    score="4,250" />
            <LeaderboardRow rank={2} name="Leo (You)"     score="3,800" accent={UI_ACCENT} highlight />
            <LeaderboardRow rank={3} name="King Joffrey"  score="2,100" accent={UI_AMBER} />
            <LeaderboardRow rank={4} name="Sasha"         score="1,950" accent="#64748B" />
          </div>
        </Section>

        {/* ── CTA BANNER ───────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="✦" title="CTA Banners" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <CTABanner
              emoji="🎲"
              title="Feeling Lucky?"
              description="Join the queue for a random match and earn bonus XP!"
              buttonLabel="Quick Match"
              accent={UI_ACCENT}
              textColor="#fff"
            />
            <CTABanner
              emoji="🪱"
              title="Grub"
              description="Gooi dobbelstenen en steel grubs van tegenstanders!"
              buttonLabel="Snel spelen"
              accent="#22c55e"
              textColor="#fff"
            />
          </div>
        </Section>

        {/* ── GAME EVENTS ──────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="🔔" title="Notifications" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
            <Notification variant="urgent" icon="⏰" title="YOUR TURN!" body="15 seconds left to roll" accent={UI_AMBER} action={{ icon: "🎲", label: "Roll" }} />
            <Notification variant="info"    title="@DragonMaster just joined the lobby!" />
            <Notification variant="warning" title="Robber placed on your wheat tile!" />
            <Notification variant="success" title="Trade accepted — you received 2 Wheat!" />
          </div>
        </Section>

        {/* ── VICTORY POPUP ────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="🏆" title="Victory Popup" />
          <div style={{ maxWidth: 360 }}>
            <VictoryPopup xp={500} onButton={() => {}} />
          </div>
        </Section>

        {/* ── CHAT PANEL ───────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="💬" title="Chat Panel" />
          <div style={{ maxWidth: 320 }}>
            <ChatPanel
              messages={chat}
              onSend={(text) => setChat((c) => [...c, { user: "Jij", text }])}
            />
          </div>
        </Section>

        {/* ── NAME MODAL ───────────────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="✎" title="Name Modal" />
          <Button onClick={() => setShowModal(true)}>Toon Modal</Button>
          {showModal && (
            <NameModal
              onConfirm={() => setShowModal(false)}
              onCancel={() => setShowModal(false)}
            />
          )}
        </Section>

        {/* ── TOP NAV & BOTTOM NAV ─────────────────────────────────────── */}
        <Section>
          <SectionHeader icon="≡" title="Navigation" />
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${UI_BORDER}` }}>
            <TopNav
              left={<span style={{ fontWeight: 900, fontSize: 16, letterSpacing: 3, fontStyle: "italic" }}>LUDORYN</span>}
              right={<Avatar name="R" color={UI_ACCENT} size={34} online="green" />}
            />
          </div>
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${UI_BORDER}`, marginTop: 12, position: "relative", height: 72 }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <BottomNav
                items={[
                  { label: "PLAY",   icon: "🎮", active: true  },
                  { label: "SHOP",   icon: "🏪" },
                  { label: "CLANS",  icon: "👥" },
                  { label: "ME",     icon: "👤" },
                ]}
              />
            </div>
          </div>
        </Section>

      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        input[type=range] { -webkit-appearance: none; appearance: none; border-radius: 4px; }
      `}</style>
    </main>
  );
}

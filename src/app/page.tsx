"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/ui";
import { playClick } from "@/lib/sound";
import { useLang, LANGUAGES } from "@/lib/lang";

const GAME_ROUTES: Record<string, string> = {
  grub: "/grub",
  qwixx: "/qwixx",
  "ticket-to-ride": "/ticket-to-ride",
  beverbende: "/beverbende",
  carcassonne: "/carcassonne",
  rummikub: "/rummikub",
  catan: "/game",
  wingspan: "/wingspan",
};

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={lang}
        onChange={e => setLang(e.target.value as typeof lang)}
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 0, padding: '6px 28px 6px 10px', cursor: 'pointer',
          fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--text-muted)',
          appearance: 'none', WebkitAppearance: 'none',
          outline: 'none',
        }}
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>{l.nativeLabel}</option>
        ))}
      </select>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ position: 'absolute', right: 9, pointerEvents: 'none' }}>
        <path d="M1 1l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function ResumeGameBanner() {
  const router = useRouter();
  const { t } = useLang();
  const [activeRoom, setActiveRoom] = useState<{ roomId: string; gameType: string } | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ludoryn-active-room");
      if (stored) setActiveRoom(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  if (!activeRoom) return null;

  const route = GAME_ROUTES[activeRoom.gameType];
  if (!route) return null;

  const gameLabel: Record<string, string> = {
    grub: "Wormenjacht",
    qwixx: "Kriskras",
    "ticket-to-ride": "Treinreis",
    beverbende: "Flikflak",
    carcassonne: "Basteon",
    catan: "Kolonis",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
      <button
        onClick={() => router.push(`${route}?room=${activeRoom.roomId}`)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          background: "var(--card)",
          border: "1.5px solid rgba(45,122,58,0.3)",
          borderRadius: 0, padding: "12px 16px",
          cursor: "pointer", textAlign: "left",
          boxShadow: "0 1px 4px var(--shadow)",
          marginBottom: 12,
          animation: "slide-down 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.2s both",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--accent-alt)", flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--accent-alt)" }}>
            {t.resumeGame}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
            {gameLabel[activeRoom.gameType] ?? activeRoom.gameType} · Room {activeRoom.roomId}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="var(--accent-alt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

const GAMES = [
  {
    id: "grub",
    title: "Grub Hunt",
    subtitle: "Dobbelstenen · Wormen",
    description:
      "Gooi dobbelstenen om zoveel mogelijk wormen te verzamelen. Maar pas op — andere spelers kunnen jouw stapel stelen!",
    players: "2–7 spelers",
    duration: "20–40 min",
    accent: "#00C875",
    shadow: "#007A45",
    href: "/lobby?game=grub",
    available: true,
  },
  {
    id: "qwixx",
    title: "Kriskras",
    subtitle: "Dobbelstenen · Rijen",
    description:
      "Gooi dobbelstenen en kruis getallen af in vier gekleurde rijen. Hoe meer je afkruist, hoe meer punten — maar je kunt niet terug!",
    players: "2–5 spelers",
    duration: "15–45 min",
    accent: "#FFCA28",
    shadow: "#9A7800",
    href: "/lobby?game=qwixx",
    available: false,
  },
  {
    id: "catan",
    title: "Kolonis",
    subtitle: "RESOURCES · HANDEL · BOUW",
    description:
      "Bouw nederzettingen, leg wegen en handel in grondstoffen. Wie als eerste 10 overwinningspunten haalt op het eiland Kolonis wint!",
    players: "2–4 spelers",
    duration: "60–120 min",
    accent: "#FF5252",
    shadow: "#C62828",
    href: "/lobby?game=catan",
    available: false,
  },
  {
    id: "ticket-to-ride",
    title: "Treinreis",
    subtitle: "2–5 spelers",
    description:
      "Leg routes op de kaart van de VS, verbind steden en voltooi je geheime reistickets. De speler met de meeste punten wint!",
    players: "2 spelers",
    duration: "45–75 min",
    accent: "#4285F4",
    shadow: "#1557C0",
    href: "/lobby?game=ticket-to-ride",
    available: false,
  },
  {
    id: "beverbende",
    title: "Flikflak",
    subtitle: "Kaarten · Geheugen",
    description:
      "Onthoud je kaarten en roep 'Flikflak!' als je denkt de laagste score te hebben. Maar vergis je niet — dan krijg je strafpunten!",
    players: "2–6 spelers",
    duration: "15–30 min",
    accent: "#2EC4B6",
    shadow: "#0D7A73",
    href: "/lobby?game=beverbende",
    available: false,
  },
  {
    id: "carcassonne",
    title: "Basteon",
    subtitle: "TEGELS · MEEPLES",
    description:
      "Leg tegels om steden, wegen en kloosters te bouwen. Plaats je meeples slim en scoor punten als features worden afgemaakt.",
    players: "2 spelers",
    duration: "30–60 min",
    accent: "#AB47BC",
    shadow: "#6A1B9A",
    href: "/lobby?game=carcassonne",
    available: false,
  },
  {
    id: "wingspan",
    title: "Wingspan",
    subtitle: "Vogels · Eieren · Habitats",
    description:
      "Verzamel vogels, leg eieren en beheer je habitats. Speel krachtige vogelkaarten en scoor punten over 4 rondes!",
    players: "2 spelers",
    duration: "45–75 min",
    accent: "#4A90D9",
    shadow: "#1F5C99",
    href: "/wingspan",
    available: false,
  },
  {
    id: "rummikub",
    title: "Rummikub",
    subtitle: "Tegels · Sets · Runs",
    description:
      "Leg sets en reeksen op tafel met genummerde tegels in vier kleuren. Eerste speler met een leeg rek wint!",
    players: "2–4 spelers",
    duration: "30–60 min",
    accent: "#FF7043",
    shadow: "#BF360C",
    href: "/rummikub",
    available: false,
  },
  {
    id: "placeholder",
    title: "Meer Games",
    subtitle: "Nog niet beschikbaar",
    description:
      "Nieuwe spellen worden toegevoegd aan Ludoryn. Houd deze ruimte in de gaten voor toekomstige releases.",
    players: "—",
    duration: "—",
    accent: "#FF7043",
    shadow: "#BF360C",
    href: "#",
    available: false,
  },
] as const;


// ─────────────────────────────────────────────
// GameTile
// ─────────────────────────────────────────────

function GameTile({ game, index }: { game: (typeof GAMES)[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const { t } = useLang();

  // Dynamic translated fields for known games
  const translated = {
    subtitle: game.id === 'grub' ? t.grubSubtitle
      : game.id === 'qwixx' ? t.kriskrasSubtitle
      : game.id === 'ticket-to-ride' ? t.ttrSubtitle
      : game.id === 'beverbende' ? t.beaverSubtitle
      : game.id === 'placeholder' ? t.comingSoon
      : game.subtitle,
    description: game.id === 'grub' ? t.grubDesc
      : game.id === 'qwixx' ? t.kriskrasDesc
      : game.id === 'ticket-to-ride' ? t.ttrDesc
      : game.id === 'beverbende' ? t.beaverDesc
      : game.id === 'placeholder' ? t.moreComing
      : game.description,
    players: game.id === 'grub' ? t.grubPlayers
      : game.id === 'qwixx' ? t.kriskrasPlayers
      : game.id === 'ticket-to-ride' ? t.ttrPlayers
      : game.id === 'beverbende' ? t.beaverPlayers
      : game.players,
    title: game.id === 'placeholder' ? t.moreGames : game.title,
  };

  const card = (
    <div
      className="game-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--card)",
        border: `1px solid ${hovered && game.available ? "var(--border-hover)" : "var(--border)"}`,
        borderRadius: 0,
        overflow: "hidden",
        transition: "box-shadow 0.18s, border-color 0.18s, transform 0.18s",
        animation: `slide-up 0.35s ease ${index * 60}ms both`,
        boxShadow: hovered && game.available
          ? "0 4px 20px var(--shadow)"
          : "0 1px 4px var(--shadow)",
        transform: hovered && game.available ? "translateY(-2px)" : "none",
        cursor: game.available ? "pointer" : "default",
        pointerEvents: game.available ? "auto" : "none",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        height: 100,
      }}
    >
      {/* Text content */}
      <div style={{ flex: 1, padding: "14px 16px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 400, color: "var(--text)", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {translated.title}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {translated.subtitle}
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45, margin: "5px 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {translated.description}
        </p>
      </div>

      {/* Play button */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", paddingRight: 16, paddingLeft: 8 }}>
        {game.available ? (
          <div style={{
            padding: "8px 16px",
            background: hovered ? "#a03d18" : "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: "#fff",
            transition: "background 0.15s",
            flexShrink: 0,
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            Spelen
          </div>
        ) : (
          <div style={{
            padding: "8px 16px",
            background: "var(--card2)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-faint)",
            whiteSpace: "nowrap",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            Binnenkort
          </div>
        )}
      </div>
    </div>
  );

  return game.available ? (
    <Link href={game.href} style={{ textDecoration: "none", color: "inherit" }} onClick={playClick}>{card}</Link>
  ) : card;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { t } = useLang();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <LangToggle />

      {/* Hero */}
      <header className="hero-header" style={{ textAlign: "center", padding: "56px 24px 32px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(56px, 14vw, 128px)",
            margin: 0,
            lineHeight: 0.95,
            color: "var(--text)",
            animation: "scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          Ludoryn
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            margin: "18px 0 0",
            animation: "fade-in 0.6s ease 0.25s both",
          }}
        >
          {t.tagline}
        </p>
      </header>


      {/* Resume banner */}
      <ResumeGameBanner />

      {/* Game grid */}
      <section style={{ padding: "0 16px 100px" }}>
        <div
          className="games-grid"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {GAMES.filter(g => g.id !== 'carcassonne').map((game, i) => (
            <GameTile key={game.id} game={game} index={i} />
          ))}
        </div>
      </section>

      <BottomNav
        items={[
          { label: t.home,   icon: "home",   active: true },
          { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: "Shop",   icon: "shop",   onClick: () => router.push("/shop") },
        ]}
      />

      <style>{`
        @media (max-width: 500px) {
          .hero-header { padding: 48px 16px 32px !important; }
          .games-grid { gap: 6px !important; padding: 0 8px 24px !important; }
        }
      `}</style>
    </main>
  );
}

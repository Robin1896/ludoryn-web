"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEVELS, getActiveLevel, setActiveLevel, type LevelId } from "@/lib/levels";
import { BottomNav } from "@/components/ui";
import { useLang } from "@/lib/lang";

export default function LevelsPage() {
  const router = useRouter();
  const { t } = useLang();
  const [active, setActive] = useState<LevelId>(() => getActiveLevel());

  function select(id: LevelId) {
    setActiveLevel(id);
    setActive(id);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#080B24", color: "#EEF2FF" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px 120px" }}>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>
            {t.environments}
          </div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(238,242,255,0.4)" }}>
            {t.chooseTheme}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {LEVELS.map((level) => {
            const isActive = level.id === active;
            const locked = !level.available;
            return (
              <button
                key={level.id}
                onClick={() => !locked && select(level.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  background: isActive
                    ? `linear-gradient(135deg, ${level.accent}18, ${level.accent}08)`
                    : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isActive ? level.accent + "55" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 18, padding: "16px 18px",
                  cursor: locked ? "default" : "pointer",
                  textAlign: "left", width: "100%",
                  opacity: locked ? 0.45 : 1,
                  transition: "all 0.18s",
                  boxShadow: isActive ? `0 0 24px ${level.accent}20` : "none",
                } as React.CSSProperties}
              >
                {/* Icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: isActive ? `${level.accent}22` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isActive ? level.accent + "44" : "rgba(255,255,255,0.08)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>
                  {level.icon || level.name.slice(0, 1)}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontFamily: "'Fredoka', sans-serif", fontSize: 17, fontWeight: 700,
                      color: isActive ? level.accent : "#EEF2FF",
                    }}>
                      {level.name}
                    </span>
                    {locked && (
                      <span style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 9, fontWeight: 700,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        color: "rgba(238,242,255,0.3)", background: "rgba(255,255,255,0.06)",
                        borderRadius: 6, padding: "2px 7px",
                      }}>{t.comingSoon}</span>
                    )}
                  </div>
                  <div style={{
                    fontFamily: "'Nunito', sans-serif", fontSize: 12,
                    color: isActive ? `${level.accent}bb` : "rgba(238,242,255,0.35)",
                    marginBottom: 6,
                  }}>
                    {level.tagline}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {level.tags.map(tag => (
                      <span key={tag} style={{
                        fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 600,
                        color: isActive ? level.accent : "rgba(238,242,255,0.3)",
                        background: isActive ? `${level.accent}14` : "rgba(255,255,255,0.04)",
                        borderRadius: 6, padding: "2px 8px",
                        border: `1px solid ${isActive ? level.accent + "30" : "rgba(255,255,255,0.06)"}`,
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Checkmark */}
                {isActive && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="9" cy="9" r="9" fill={level.accent} opacity="0.2"/>
                    <path d="M5 9l3 3 5-5" stroke={level.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav
        items={[
          { label: t.home,   icon: "home",   onClick: () => router.push("/") },
          { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby") },
          { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
          { label: t.shop, icon: "shop", onClick: () => router.push("/shop") },
        ]}
      />
    </main>
  );
}

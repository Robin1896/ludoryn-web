"use client";

import { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { BottomNav } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { isNative, restorePurchases } from "@/lib/purchases";
import { useLang, LANGUAGES } from "@/lib/lang";

// ─────────────────────────────────────────────────────────────────────────────
// Settings page content
// ─────────────────────────────────────────────────────────────────────────────

function SettingsContent() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d?.username) {
          // Not logged in — still show page but in "guest" mode
          setLoading(false);
          return;
        }
        setUsername(d.username);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
    );
  }, []);

  async function handleRestore() {
    setRestoring(true);
    setRestoreMsg(null);
    const result = await restorePurchases();
    if (result.success) {
      if (result.unlockedIds.length > 0) {
        await apiFetch("/api/shop/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unlockedIds: result.unlockedIds, allPro: result.allPro }),
        }).catch(() => {});
        setRestoreMsg(`${result.unlockedIds.length} ${t.restoreExpansions}`);
      } else {
        setRestoreMsg(t.noPreviousPurchases);
      }
    } else {
      setRestoreMsg(isNative() ? t.restoreFailed : t.iosAppRequired);
    }
    setRestoring(false);
    setTimeout(() => setRestoreMsg(null), 4000);
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh", background: "var(--bg-gradient)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid var(--border)",
          borderTopColor: "var(--accent)",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg-gradient)",
      color: "var(--text)",
      paddingBottom: 90,
    }}>

      {/* Header */}
      <div ref={headerRef} style={{
        background: "transparent",
        borderBottom: "1px solid var(--border)",
        padding: "12px 20px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, background: "var(--accent)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "var(--font-body)",
        }}>
          {(username ?? "?")[0]?.toUpperCase() ?? "?"}
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, color: "var(--text)" }}>
          {username ?? t.guest}
        </span>
        {!username && (
          <button
            onClick={() => router.push("/lobby")}
            style={{
              marginLeft: 4, padding: "4px 12px", borderRadius: 0,
              background: "var(--accent)", border: "none", cursor: "pointer",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 11, color: "#fff",
            }}
          >
            {t.logInToSave}
          </button>
        )}
      </div>

      {/* Language picker */}
      <div style={{ margin: "28px 0 0", padding: "0 20px" }}>
        <div style={{
          paddingTop: 4,
        }}>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: 11, fontWeight: 800,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 12,
          }}>
            {t.language}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 6,
          }}>
            {LANGUAGES.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  style={{
                    background: active ? "var(--card2)" : "transparent",
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 0,
                    padding: "8px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "background 0.15s, border-color 0.15s",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: active ? 800 : 600,
                    color: active ? "var(--text)" : "var(--text-muted)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {l.nativeLabel}
                  </span>
                  {active && (
                    <span style={{ fontSize: 10, color: "#4CAF50", fontWeight: 800 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aankopen herstellen */}
      <div style={{ margin: "28px 0 0", padding: "0 20px" }}>
        <div style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700,
              color: "var(--text)",
            }}>
              {t.restorePurchases}
            </div>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted)", marginTop: 2,
            }}>
              {restoreMsg ?? t.restoreExpansions}
            </div>
          </div>
          <button
            onClick={handleRestore}
            disabled={restoring}
            style={{
              background: "var(--card2)",
              border: "1px solid var(--border)",
              borderRadius: 0, padding: "8px 14px",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
              color: restoring ? "var(--text-faint)" : "var(--text)",
              cursor: restoring ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {restoring ? t.restoring : t.restore}
          </button>
        </div>
      </div>

      <BottomNav items={[
        { label: t.home,   icon: "home",   onClick: () => router.push("/")       },
        { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby")  },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
        { label: t.shop,   icon: "shop",   onClick: () => router.push("/shop")   },
      ]} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--bg-gradient)" }} />}>
      <SettingsContent />
    </Suspense>
  );
}

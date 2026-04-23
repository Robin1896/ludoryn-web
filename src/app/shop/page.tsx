"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav, PageHeader } from "@/components/ui";
import {
  type ExpansionId, type ExpansionDef,
  EXPANSIONS, GAMES_IN_SHOP, GAME_ACCENT,
  ALL_EXPANSION_IDS,
  loadUnlocked, syncUnlockedFromServer, addUnlockedLocally,
  migrateOldKeys,
} from "@/lib/shop";
import { apiFetch } from "@/lib/api";
import { isNative, initPurchases, purchaseExpansion, purchaseProBundle, restorePurchases } from "@/lib/purchases";
import { useLang } from "@/lib/lang";

// ─────────────────────────────────────────────────────────────────────────────
// Thumbnail components
// ─────────────────────────────────────────────────────────────────────────────

function ExpansionThumb({ exp }: { exp: ExpansionDef; accent: string; isUnlocked: boolean }) {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: 0, flexShrink: 0,
      overflow: "hidden",
      border: "1px solid var(--border)",
      background: "var(--card2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--text-muted)",
    }}>
      {exp.name.charAt(0)}
    </div>
  );
}

function ConfirmThumb({ exp }: { exp: ExpansionDef; accent: string }) {
  return (
    <div style={{
      width: 88, height: 88, borderRadius: 0, overflow: "hidden",
      margin: "0 auto 14px",
      border: "1px solid var(--border)",
      background: "var(--card2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, color: "var(--text-muted)",
    }}>
      {exp.name.charAt(0)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <>
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `2.5px solid ${color}40`,
        borderTopColor: color,
        animation: "spin 0.75s linear infinite",
        display: "inline-block",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pro Bundle banner
// ─────────────────────────────────────────────────────────────────────────────

function ProBundleBanner({
  unlocked, isAllUnlocked, onBuy, buying, lang, t,
}: {
  unlocked: ExpansionId[];
  isAllUnlocked: boolean;
  onBuy: () => void;
  buying: boolean;
  lang: string;
  t: { bestDeal: string; active: string; buyAll: string; buying: string; probundleDesc: (n: number) => string; individualPrice: string; youHaveExpansions: (n: number, total: number) => string };
}) {
  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 0,
      padding: "22px 20px",
      marginBottom: 40,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Achtergrond glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 80% 50%, rgba(193,74,31,0.06) 0%, transparent 70%)",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 0, flexShrink: 0,
          background: "rgba(193,74,31,0.08)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26,
        }}>
          ♾️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: 18, color: "var(--text)",
            }}>
              Ludoryn Pro Bundle
            </span>
            <span style={{
              background: "rgba(193,74,31,0.08)", border: "1px solid var(--border)",
              borderRadius: 0, padding: "1px 7px",
              fontFamily: "var(--font-body)", fontSize: 10,
              fontWeight: 800, color: "var(--accent)", letterSpacing: "0.04em",
            }}>
              {t.bestDeal}
            </span>
          </div>
          <div style={{
            fontFamily: "var(--font-body)", fontSize: 12,
            color: "var(--text-muted)", lineHeight: 1.5,
          }}>
            {t.probundleDesc(ALL_EXPANSION_IDS.length)}
          </div>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 16, paddingTop: 14,
        borderTop: "1px solid var(--border)",
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-body)", fontSize: 11,
            color: "var(--text-faint)", textDecoration: "line-through",
          }}>
            {t.individualPrice}{Math.round(EXPANSIONS.reduce((s, e) => {
              const p = parseFloat(e.price.replace("€", "").replace(",", "."));
              return s + p;
            }, 0))}
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: 22, color: "var(--accent)",
          }}>
            €9,99
          </div>
        </div>

        {isAllUnlocked ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(193,74,31,0.06)", border: "1px solid var(--border)",
            borderRadius: 0, padding: "7px 16px",
          }}>
            <span style={{ fontSize: 13 }}>✓</span>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              fontWeight: 700, color: "var(--accent)",
            }}>
              {t.active}
            </span>
          </div>
        ) : (
          <button
            onClick={onBuy}
            disabled={buying}
            style={{
              background: "var(--accent)",
              color: "#fff", border: "none", borderRadius: 0,
              padding: "10px 22px",
              fontFamily: "var(--font-body)", fontWeight: 700,
              fontSize: 15, cursor: buying ? "wait" : "pointer",
              boxShadow: "none",
              display: "flex", alignItems: "center", gap: 8,
              opacity: buying ? 0.7 : 1,
            }}
          >
            {buying ? <Spinner color="#fff" /> : null}
            {buying ? t.buying : `${t.buyAll} — €9,99`}
          </button>
        )}
      </div>

      {unlocked.length > 0 && !isAllUnlocked && (
        <div style={{
          marginTop: 10, textAlign: "right",
          fontFamily: "var(--font-body)", fontSize: 11,
          color: "var(--accent)",
        }}>
          {t.youHaveExpansions(unlocked.length, ALL_EXPANSION_IDS.length)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expansion localisation helpers
// ─────────────────────────────────────────────────────────────────────────────

import type { Translation } from "@/lib/translations/types";

type ExpField = 'name' | 'tagline' | 'description';

const EXP_TRANSLATION_KEYS: Partial<Record<ExpansionId, Partial<Record<ExpField, keyof Translation>>>> = {
  'qwixx-gemixxt':   { tagline: 'qwixxGemixxTagline',    description: 'qwixxGemixxDesc' },
  'qwixx-big-points':{ tagline: 'qwixxBigPointsTagline', description: 'qwixxBigPointsDesc' },
  'grub-uitbreiding':{ name: 'grubExpName', tagline: 'grubExpTagline', description: 'grubExpDesc' },
};

function getExpText(exp: ExpansionDef, field: ExpField, lang: string, t: Translation): string {
  if (lang === 'nl') return exp[field] ?? '';
  const key = EXP_TRANSLATION_KEYS[exp.id]?.[field];
  if (key) {
    const val = t[key];
    if (typeof val === 'string') return val;
  }
  const enKey = `${field}En` as keyof ExpansionDef;
  return (exp[enKey] as string | undefined) ?? exp[field] ?? '';
}

const BADGE_NL: Record<string, keyof Translation> = {
  'Populair': 'badgePopular',
  'Nieuw':    'badgeNew',
  'Snel':     'badgeFast',
};

const GAME_NAME_KEY: Record<string, keyof Translation> = {
  'Qwixx':       'kriskrasName',
  'Regenwormen': 'grubName',
};

function getGameName(game: string, t: Translation): string {
  const key = GAME_NAME_KEY[game];
  if (key) {
    const val = t[key];
    if (typeof val === 'string') return val;
  }
  return game;
}

function getBadgeText(badge: string, lang: string, t: Translation): string {
  if (lang === 'nl') return badge;
  const key = BADGE_NL[badge];
  if (key) {
    const val = t[key];
    if (typeof val === 'string') return val;
  }
  return badge;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hoofd component
// ─────────────────────────────────────────────────────────────────────────────

type PurchaseState = "idle" | "buying" | "success" | "error" | "cancelled";

export default function ShopPage() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [unlocked, setUnlocked] = useState<ExpansionId[]>([]);
  const [confirm, setConfirm] = useState<ExpansionDef | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<ExpansionId | null>(null);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>("idle");
  const [buyingPro, setBuyingPro] = useState(false);
  const [confirmPro, setConfirmPro] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [serverSynced, setServerSynced] = useState(false);

  // Laad unlocks: eerst localStorage (snel), dan server (authoritative)
  useEffect(() => {
    migrateOldKeys();
    setUnlocked(loadUnlocked()); // directe weergave uit cache

    apiFetch("/api/auth/me")
      .then(r => r.json())
      .then(async (d) => {
        if (d?.username) {
          setUsername(d.username);
          // Initialiseer RevenueCat met de username als app user ID
          await initPurchases(d.username);
        }
        if (d?.unlockedExpansions?.length >= 0) {
          syncUnlockedFromServer(d.unlockedExpansions);
          setUnlocked(d.unlockedExpansions);
        }
        setServerSynced(true);
      })
      .catch(() => {
        setServerSynced(true);
        // Anoniem: ook RC initialiseren (anonieme user)
        initPurchases();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAllUnlocked = ALL_EXPANSION_IDS.every(id => unlocked.includes(id));

  // Sla een unlock op in de server en update UI
  async function persistUnlock(expansionId: ExpansionId) {
    addUnlockedLocally(expansionId);
    setUnlocked(prev => prev.includes(expansionId) ? prev : [...prev, expansionId]);
    setJustUnlocked(expansionId);
    setTimeout(() => setJustUnlocked(null), 2500);

    if (username) {
      try {
        await apiFetch("/api/shop/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expansionId }),
        });
      } catch {
        // Webhook doet het als backup — niet fataal
        console.warn("[shop] Server unlock mislukt, webhook vangt het op");
      }
    }
  }

  async function persistProBundle() {
    syncUnlockedFromServer(ALL_EXPANSION_IDS);
    setUnlocked([...ALL_EXPANSION_IDS]);
    setJustUnlocked(null);

    if (username) {
      try {
        await apiFetch("/api/shop/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proBundle: true }),
        });
      } catch {
        console.warn("[shop] Pro Bundle server unlock mislukt, webhook vangt het op");
      }
    }
  }

  // ── Losse expansion kopen ──────────────────────────────────────────────────

  async function handleBuy(def: ExpansionDef) {
    if (!isNative()) {
      // Op web: toon uitleg modal (geen IAP mogelijk)
      setConfirm(def);
      return;
    }
    setConfirm(null);
    setPurchaseState("buying");

    const result = await purchaseExpansion(def.id);
    if (result.success) {
      await persistUnlock(def.id);
      setPurchaseState("success");
      setTimeout(() => setPurchaseState("idle"), 3000);
    } else if (result.error === "cancelled") {
      setPurchaseState("cancelled");
      setTimeout(() => setPurchaseState("idle"), 1500);
    } else {
      setPurchaseState("error");
      setTimeout(() => setPurchaseState("idle"), 3000);
    }
  }

  // ── Pro Bundle kopen ───────────────────────────────────────────────────────

  async function handleBuyPro() {
    if (!isNative()) {
      setConfirmPro(true);
      return;
    }
    setBuyingPro(true);

    const result = await purchaseProBundle();
    if (result.success) {
      await persistProBundle();
      setPurchaseState("success");
      setTimeout(() => setPurchaseState("idle"), 3000);
    } else if (result.error !== "cancelled") {
      setPurchaseState("error");
      setTimeout(() => setPurchaseState("idle"), 3000);
    }
    setBuyingPro(false);
  }

  // ── Aankopen herstellen ────────────────────────────────────────────────────

  async function handleRestore() {
    if (!isNative()) {
      setRestoreMsg(t.iapWebWarning);
      setTimeout(() => setRestoreMsg(null), 3000);
      return;
    }
    setRestoring(true);
    setRestoreMsg(null);

    const result = await restorePurchases();
    if (result.success) {
      // Sync naar server
      if (username) {
        await apiFetch("/api/shop/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unlockedIds: result.unlockedIds, allPro: result.allPro }),
        }).catch(() => {});
      }
      syncUnlockedFromServer(result.unlockedIds);
      setUnlocked(result.unlockedIds);

      if (result.unlockedIds.length > 0) {
        setRestoreMsg(t.expansionsRestored(result.unlockedIds.length));
      } else {
        setRestoreMsg(t.noPreviousPurchases);
      }
    } else {
      setRestoreMsg(t.restoreFailed);
    }

    setRestoring(false);
    setTimeout(() => setRestoreMsg(null), 4000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 100 }}>

      {/* Toast feedback */}
      {purchaseState !== "idle" && (
        <div style={{
          position: "fixed", top: 52, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, pointerEvents: "none",
          background: purchaseState === "success" ? "var(--card)" : purchaseState === "error" ? "var(--card)" : "var(--card)",
          border: `1px solid ${purchaseState === "success" ? "rgba(45,122,58,0.4)" : purchaseState === "error" ? "rgba(193,74,31,0.4)" : "var(--border)"}`,
          borderRadius: 0, padding: "10px 20px",
          fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
          color: purchaseState === "success" ? "var(--accent-alt)" : purchaseState === "error" ? "var(--accent)" : "var(--text-muted)",
          boxShadow: "0 4px 20px var(--shadow)",
          whiteSpace: "nowrap",
        }}>
          {purchaseState === "buying" && `⏳ ${t.buying}`}
          {purchaseState === "success" && `✓ ${t.expansionUnlocked}`}
          {purchaseState === "error" && `✕ ${t.purchaseFailed}`}
          {purchaseState === "cancelled" && t.cancelled}
        </div>
      )}

      {/* Restore feedback */}
      {restoreMsg && (
        <div style={{
          position: "fixed", top: 52, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, pointerEvents: "none",
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 0, padding: "10px 20px",
          fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
          color: "var(--text)", boxShadow: "0 4px 20px var(--shadow)",
          whiteSpace: "nowrap",
        }}>
          {restoreMsg}
        </div>
      )}

      <PageHeader left={<>
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, color: "var(--text)" }}>Shop</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>{t.shopSubtitle}</span>
      </>} />

      <div style={{ padding: "24px 20px 0" }}>

        <div style={{ marginBottom: 24 }}>

          {/* Stats + herstel rij */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, marginTop: 12, flexWrap: "wrap",
          }}>
            {serverSynced && unlocked.length > 0 && (
              <div style={{
                background: "var(--card2)", border: "1px solid var(--border)",
                borderRadius: 0, padding: "4px 14px",
                fontFamily: "var(--font-body)", fontSize: 12,
                color: "var(--text-muted)",
              }}>
                {unlocked.length} / {ALL_EXPANSION_IDS.length} {t.unlocked}
              </div>
            )}
            <button
              onClick={handleRestore}
              disabled={restoring}
              style={{
                background: "transparent", border: "none", cursor: restoring ? "wait" : "pointer",
                fontFamily: "var(--font-body)", fontSize: 12,
                color: "var(--text-faint)",
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 8px",
              }}
            >
              {restoring ? <Spinner color="var(--text-faint)" /> : "↩"}
              {restoring ? t.restoring : t.restorePurchases}
            </button>
          </div>
        </div>

        {/* Pro Bundle banner */}
        {!isAllUnlocked && (
          <ProBundleBanner
            unlocked={unlocked}
            isAllUnlocked={isAllUnlocked}
            onBuy={handleBuyPro}
            buying={buyingPro}
            lang={lang}
            t={t}
          />
        )}
        {isAllUnlocked && serverSynced && (
          <div style={{
            background: "transparent",
            border: "1px solid rgba(45,122,58,0.3)",
            borderRadius: 0, padding: "18px 20px",
            marginBottom: 40, textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
            <div style={{
              fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700,
              fontSize: 18, color: "var(--accent-alt)", marginBottom: 4,
            }}>
              {t.fullCollection}
            </div>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              color: "var(--text-muted)",
            }}>
              {t.allExpansionsUnlocked}
            </div>
          </div>
        )}

        {/* Per-spel secties */}
        {GAMES_IN_SHOP.map((game) => {
          const accent = "var(--accent)";
          const gameExps = EXPANSIONS.filter((e) => e.game === game);
          return (
            <section key={game} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <h2 style={{
                  fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, fontWeight: 700,
                  color: "var(--text)", margin: 0,
                }}>
                  {getGameName(game, t)}
                </h2>
                <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {gameExps.map((exp) => {
                  const isUnlocked = unlocked.includes(exp.id);
                  const wasJustUnlocked = justUnlocked === exp.id;
                  return (
                    <div key={exp.id} style={{
                      padding: "16px",
                      background: isUnlocked ? `${accent}0a` : "transparent",
                      border: `1px solid ${isUnlocked ? accent + "40" : "var(--border)"}`,
                      borderRadius: 0,
                      transition: "border-color 0.3s, background 0.3s",
                      display: "flex", flexDirection: "column",
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1 }}>
                        <ExpansionThumb exp={exp} accent={accent} isUnlocked={isUnlocked} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                            <span style={{
                              fontFamily: "var(--font-body)", fontWeight: 700,
                              fontSize: 16, color: "var(--text)",
                            }}>
                              {getExpText(exp, 'name', lang, t)}
                            </span>
                            {exp.badge && !isUnlocked && (
                              <span style={{
                                background: `${accent}22`, border: `1px solid ${accent}44`,
                                borderRadius: 0, padding: "1px 7px",
                                fontFamily: "var(--font-body)", fontSize: 10,
                                fontWeight: 800, color: accent, letterSpacing: "0.04em",
                              }}>
                                {getBadgeText(exp.badge, lang, t).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontFamily: "var(--font-body)", fontSize: 12,
                            color: "var(--text-muted)", marginBottom: 4,
                          }}>
                            {getExpText(exp, 'tagline', lang, t)}
                          </div>
                          <div style={{
                            fontFamily: "var(--font-body)", fontSize: 12,
                            color: "var(--text-faint)", lineHeight: 1.5,
                          }}>
                            {getExpText(exp, 'description', lang, t)}
                          </div>
                        </div>
                      </div>

                      {/* Action row */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "flex-end",
                        marginTop: 12,
                      }}>
                        {isUnlocked ? (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: `${accent}18`, border: `1px solid ${accent}44`,
                            borderRadius: 0, padding: "5px 12px",
                          }}>
                            <span style={{ fontSize: 12 }}>✓</span>
                            <span style={{
                              fontFamily: "var(--font-body)", fontSize: 12,
                              fontWeight: 700, color: accent,
                            }}>
                              {wasJustUnlocked ? `${t.unlocked}!` : t.active}
                            </span>
                          </div>
                        ) : purchaseState === "buying" && confirm?.id === exp.id ? (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            background: `${accent}15`, border: `1px solid ${accent}30`,
                            borderRadius: 0, padding: "7px 16px",
                          }}>
                            <Spinner color={accent} />
                            <span style={{
                              fontFamily: "var(--font-body)", fontWeight: 700,
                              fontSize: 13, color: accent,
                            }}>
                              {t.buying}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirm(exp);
                            }}
                            style={{
                              background: accent, color: "#fff",
                              border: "none", borderRadius: 0,
                              padding: "8px 18px",
                              fontFamily: "var(--font-body)", fontWeight: 700,
                              fontSize: 14, cursor: "pointer",
                              boxShadow: `0 3px 0 ${accent}66`,
                            }}
                          >
                            {exp.price}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Juridische links (App Store vereiste) */}
        <div style={{
          textAlign: "center", marginTop: 10, marginBottom: 20,
          fontFamily: "var(--font-body)", fontSize: 11,
          color: "var(--text-faint)", lineHeight: 2,
        }}>
          {lang === 'nl' ? (
            <>Aankopen worden verwerkt via Apple. Prijzen worden bepaald bij aankoop.<br />{t.oneTimePurchase}, geen abonnement. Geen automatische verlenging.</>
          ) : (
            <>Purchases are processed via Apple. Prices are determined at purchase.<br />{t.oneTimePurchase}, no subscription. No automatic renewal.</>
          )}
        </div>
      </div>

      {/* Bevestigingsmodal */}
      {confirm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(26,29,46,0.5)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 300, padding: "0 0 20px",
          }}
          onClick={() => setConfirm(null)}
        >
          <div
            style={{
              background: "var(--card)",
              border: `1px solid ${"var(--accent)"}44`,
              borderRadius: 0,
              padding: "28px 24px 24px",
              maxWidth: 400, width: "100%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmThumb exp={confirm} accent={"var(--accent)"} />

            <div style={{
              fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700,
              color: "var(--text-muted)", letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: 6,
            }}>
              {confirm.game}
            </div>
            <div style={{
              fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 700,
              color: "var(--text)", marginBottom: 6,
            }}>
              {confirm.name}
            </div>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5,
            }}>
              {confirm.description}
            </div>

            {/* Platform check */}
            {!isNative() ? (
              <div style={{
                background: "var(--card2)",
                border: "1px solid var(--border)",
                borderRadius: 0, padding: "12px 16px", marginBottom: 20,
                fontFamily: "var(--font-body)", fontSize: 13,
                color: "var(--text-muted)", lineHeight: 1.6,
              }}>
                {t.iosAppRequired}
              </div>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--card2)",
                border: "1px solid var(--border)",
                borderRadius: 0, padding: "12px 16px", marginBottom: 20,
              }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 13,
                  color: "var(--text-muted)",
                }}>
                  {t.oneTimePurchase}
                </span>
                <span style={{
                  fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 700,
                  fontSize: 18, color: "var(--accent)",
                }}>
                  {confirm.price}
                </span>
              </div>
            )}

            <button
              onClick={() => handleBuy(confirm)}
              disabled={!isNative()}
              style={{
                width: "100%", padding: "13px", borderRadius: 0,
                background: isNative() ? "var(--accent)" : "var(--card2)",
                border: "none",
                color: isNative() ? "#fff" : "var(--text-faint)",
                fontFamily: "var(--font-body)",
                fontWeight: 700, fontSize: 16,
                cursor: isNative() ? "pointer" : "not-allowed",
                marginBottom: 10,
                boxShadow: isNative() ? `0 4px 0 ${"var(--accent)"}66` : "none",
              }}
            >
              {isNative() ? t.buyFor(confirm.price) : t.notAvailableOnWeb}
            </button>
            <button
              onClick={() => setConfirm(null)}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-faint)", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: 13,
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Pro Bundle web-only modal */}
      {confirmPro && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(26,29,46,0.5)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            zIndex: 300, padding: "0 0 20px",
          }}
          onClick={() => setConfirmPro(false)}
        >
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--accent)44",
              borderRadius: 0,
              padding: "28px 24px 24px",
              maxWidth: 400, width: "100%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 88, height: 88, borderRadius: 0, overflow: "hidden",
              margin: "0 auto 14px",
              border: "1px solid var(--border)",
              background: "rgba(193,74,31,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36,
            }}>
              ♾️
            </div>

            <div style={{
              fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700,
              color: "var(--text-muted)", letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: 6,
            }}>
              Ludoryn
            </div>
            <div style={{
              fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 700,
              color: "var(--text)", marginBottom: 6,
            }}>
              Pro Bundle
            </div>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5,
            }}>
              {t.probundleDesc(ALL_EXPANSION_IDS.length)}
            </div>

            <div style={{
              background: "var(--card2)",
              border: "1px solid var(--border)",
              borderRadius: 0, padding: "12px 16px", marginBottom: 20,
              fontFamily: "var(--font-body)", fontSize: 13,
              color: "var(--text-muted)", lineHeight: 1.6,
            }}>
              {t.iosAppRequired}
            </div>

            <button
              disabled
              style={{
                width: "100%", padding: "13px", borderRadius: 0,
                background: "var(--card2)", border: "none",
                color: "var(--text-faint)",
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 16,
                cursor: "not-allowed", marginBottom: 10,
              }}
            >
              {t.notAvailableOnWeb}
            </button>
            <button
              onClick={() => setConfirmPro(false)}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-faint)", cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: 13,
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      <BottomNav items={[
        { label: t.home,   icon: "home",   onClick: () => router.push("/") },
        { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },
        { label: t.shop,   icon: "shop",   active: true },
      ]} />
    </main>
  );
}

"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import Image from "next/image";
import {
  CatanArt, GrubArt, QwixxArt, TicketToRideArt,
  CarcassonneArt, BeaverbendeArt, GAME_ART,
} from "@/components/game-art";
import { BottomNav } from "@/components/ui";
import { useLang } from "@/lib/lang";

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const AVATARS = [
  { id: "owl",         label: "Uil"         },
  { id: "fox",         label: "Vos"         },
  { id: "bear",        label: "Beer"        },
  { id: "rabbit",      label: "Konijn"      },
  { id: "penguin",     label: "Pinguïn"     },
  { id: "cat",         label: "Kat"         },
  { id: "dog",         label: "Hond"        },
  { id: "lion",        label: "Leeuw"       },
  { id: "frog",        label: "Kikker"      },
  { id: "panda",       label: "Panda"       },
  { id: "wolf",        label: "Wolf"        },
  { id: "duck",        label: "Eend"        },
  { id: "knight",      label: "Ridder"      },
  { id: "pirate",      label: "Piraat"      },
  { id: "captain",     label: "Kapitein"    },
  { id: "inventor",    label: "Uitvinder"   },
  { id: "samurai",     label: "Samurai"     },
  { id: "explorer",    label: "Ontdekker"   },
  { id: "chef",        label: "Kok"         },
  { id: "astronaut",   label: "Astronaut"   },
];

const SVG_BANNERS = [
  { id: "catan",         label: "Kolonis",          accent: "#FF9A3C", Component: CatanArt },
  { id: "grub",          label: "Kriekelduel",     accent: "#20D9A0", Component: GrubArt },
  { id: "qwixx",         label: "Kriskras",        accent: "#FFB830", Component: QwixxArt },
  { id: "ticket-to-ride",label: "Treinreis",       accent: "#E8B56D", Component: TicketToRideArt },
  { id: "carcassonne",   label: "Basteon",     accent: "#c4a050", Component: CarcassonneArt },
  { id: "beverbende",    label: "Beverbende",      accent: "#2EC4B6", Component: BeaverbendeArt },
];

const PNG_BANNERS = [
  { src: "/images/games/catan-banner.png",           label: "Catan banner"       },
  { src: "/images/games/grub-banner.png",            label: "Grub banner"        },
  { src: "/images/games/qwixx-banner.png",           label: "Kriskras banner"    },
  { src: "/images/games/ticket-to-ride-banner.png",  label: "Treinreis banner"   },
  { src: "/images/games/beverbende-banner.png",      label: "Beverbende banner"  },
  { src: "/images/games/carcassonne-banner.png",     label: "Carcassonne banner" },
  { src: "/images/games/rummikub-banner.png",        label: "Rummikub banner"    },
  { src: "/images/games/wingspan-banner.png",        label: "Wingspan banner"    },
];

const GAME_SECTIONS = [
  {
    id: "catan",
    label: "Kolonis",
    accent: "#FF9A3C",
    assets: [
      { src: "/images/games/catan-card-wood.png",  label: "Hout"     },
      { src: "/images/games/catan-card-clay.png",  label: "Klei"     },
      { src: "/images/games/catan-card-sheep.png", label: "Schaap"   },
      { src: "/images/games/catan-card-wheat.png", label: "Tarwe"    },
      { src: "/images/games/catan-card-ore.png",   label: "Erts"     },
      { src: "/images/games/terrain-forest.png",   label: "Bos"      },
      { src: "/images/games/terrain-clay.png",     label: "Klei"     },
      { src: "/images/games/terrain-sheep.png",    label: "Grasland" },
      { src: "/images/games/terrain-wheat.png",    label: "Akker"    },
      { src: "/images/games/terrain-ore.png",      label: "Bergen"   },
      { src: "/images/games/terrain-desert.png",   label: "Woestijn" },
      { src: "/images/games/terrain-sea.png",      label: "Zee"      },
      { src: "/images/games/tile-stone.png",       label: "Steen"    },
    ],
  },
  {
    id: "grub",
    label: "Kriekelduel",
    accent: "#20D9A0",
    assets: [
      { src: "/images/games/grub-tile-blue.png",   label: "Tegel blauw"   },
      { src: "/images/games/grub-tile-green.png",  label: "Tegel groen"   },
      { src: "/images/games/grub-tile-orange.png", label: "Tegel oranje"  },
      { src: "/images/games/grub-tile-gold.png",   label: "Tegel goud"    },
      { src: "/images/games/grub-worm.png",        label: "Worm"          },
    ],
  },
  {
    id: "ttr",
    label: "Treinreis",
    accent: "#4285F4",
    assets: [
      { src: "/images/games/ttr-card-black.png",  label: "Zwart"    },
      { src: "/images/games/ttr-card-blue.png",   label: "Blauw"    },
      { src: "/images/games/ttr-card-green.png",  label: "Groen"    },
      { src: "/images/games/ttr-card-loco.png",   label: "Locomotief"},
      { src: "/images/games/ttr-card-orange.png", label: "Oranje"   },
      { src: "/images/games/ttr-card-purple.png", label: "Paars"    },
      { src: "/images/games/ttr-card-red.png",    label: "Rood"     },
      { src: "/images/games/ttr-card-white.png",  label: "Wit"      },
      { src: "/images/games/ttr-card-yellow.png", label: "Geel"     },
    ],
  },
  {
    id: "wingspan",
    label: "Wingspan",
    accent: "#4A90D9",
    assets: [
      { src: "/images/games/wingspan-egg.png",              label: "Ei"          },
      { src: "/images/games/wingspan-food-berry.png",       label: "Bes"         },
      { src: "/images/games/wingspan-food-fish.png",        label: "Vis"         },
      { src: "/images/games/wingspan-food-grain.png",       label: "Graan"       },
      { src: "/images/games/wingspan-food-mouse.png",       label: "Muis"        },
      { src: "/images/games/wingspan-food-worm.png",        label: "Worm"        },
      { src: "/images/games/wingspan-habitat-forest.png",   label: "Bos"         },
      { src: "/images/games/wingspan-habitat-grassland.png",label: "Grasland"    },
      { src: "/images/games/wingspan-habitat-wetland.png",  label: "Wetland"     },
    ],
  },
  {
    id: "beverbende",
    label: "Beverbende",
    accent: "#2EC4B6",
    assets: [
      { src: "/images/games/beverbende-card-face.png", label: "Kaart voorkant" },
      { src: "/images/games/card-back.png",            label: "Kaart achterkant"},
    ],
  },
  {
    id: "qwixx",
    label: "Kriskras",
    accent: "#FFB830",
    assets: [
      { src: "/images/games/qwixx-scoresheet-bg.png", label: "Scoreblad" },
    ],
  },
];

const SHOP_ART = [
  { src: "/images/shop/wingspan-european.png",           label: "Wingspan — Europese Vogels"        },
  { src: "/images/shop/wingspan-oceania.png",            label: "Wingspan — Oceanië"                },
  { src: "/images/shop/wingspan-asia.png",               label: "Wingspan — Aziatische Vogels"      },
  { src: "/images/shop/catan-seafarers.png",             label: "Catan — Zeevaarders"               },
  { src: "/images/shop/catan-cities-knights.png",        label: "Catan — Steden & Ridders"          },
  { src: "/images/shop/catan-traders-barbarians.png",    label: "Catan — Handelaars & Barbaren"     },
  { src: "/images/shop/qwixx-gemixxt.png",               label: "Qwixx — Gemixxt"                   },
  { src: "/images/shop/qwixx-big-points.png",            label: "Qwixx — Big Points"                },
  { src: "/images/shop/ttr-europe.png",                  label: "TTR — Europa"                      },
  { src: "/images/shop/ttr-usa-1910.png",                label: "TTR — USA 1910"                    },
  { src: "/images/shop/ttr-nordic.png",                  label: "TTR — Scandinavië"                 },
  { src: "/images/shop/ttr-switzerland.png",             label: "TTR — Zwitserland"                 },
  { src: "/images/shop/ttr-germany.png",                 label: "TTR — Duitsland"                   },
  { src: "/images/shop/ttr-france.png",                  label: "TTR — Frankrijk & Oud West"        },
  { src: "/images/shop/ttr-asia.png",                    label: "TTR — Azië"                        },
  { src: "/images/shop/ttr-africa.png",                  label: "TTR — Afrika"                      },
  { src: "/images/shop/ttr-amsterdam.png",               label: "TTR — Amsterdam"                   },
  { src: "/images/shop/ttr-london.png",                  label: "TTR — Londen"                      },
  { src: "/images/shop/ttr-new-york.png",                label: "TTR — New York"                    },
  { src: "/images/shop/ttr-japan-italy.png",             label: "TTR — Japan & Italië"              },
  { src: "/images/shop/carcassonne-inns-cathedrals.png", label: "Carcassonne — Herbergen"           },
  { src: "/images/shop/carcassonne-traders-builders.png",label: "Carcassonne — Handelaars"          },
  { src: "/images/shop/carcassonne-princess-dragon.png", label: "Carcassonne — Prinses & Draak"     },
  { src: "/images/shop/beverbende-specials.png",         label: "Beverbende — Speciale Kaarten"     },
  { src: "/images/shop/grub-uitbreiding.png",            label: "Grub Expansion"         },
  { src: "/images/shop/rummikub-twist.png",              label: "Rummikub — Twist"                  },
];

const BOARD_BACKGROUNDS = [
  { src: "/images/boards/ttr-map-europe.png",      label: "TTR — Europa kaart"           },
  { src: "/images/boards/ttr-map-usa.png",         label: "TTR — USA kaart"              },
  { src: "/images/boards/ttr-map-nordic.png",      label: "TTR — Scandinavië kaart"      },
  { src: "/images/boards/ttr-map-switzerland.png", label: "TTR — Zwitserland kaart"      },
  { src: "/images/boards/ttr-map-germany.png",     label: "TTR — Duitsland kaart"        },
  { src: "/images/boards/ttr-map-france.png",      label: "TTR — Frankrijk kaart"        },
  { src: "/images/boards/ttr-map-asia.png",        label: "TTR — Azië kaart"             },
  { src: "/images/boards/ttr-map-africa.png",      label: "TTR — Afrika kaart"           },
  { src: "/images/boards/ttr-map-amsterdam.png",   label: "TTR — Amsterdam kaart"        },
  { src: "/images/boards/ttr-map-london.png",      label: "TTR — Londen kaart"           },
  { src: "/images/boards/ttr-map-new-york.png",    label: "TTR — New York kaart"         },
  { src: "/images/boards/ttr-map-japan-italy.png", label: "TTR — Japan & Italië kaart"   },
  { src: "/images/boards/carcassonne-board.png",   label: "Carcassonne — Speelbord"      },
  { src: "/images/boards/beverbende-table.png",    label: "Beverbende — Speeltafel"      },
  { src: "/images/boards/rummikub-table.png",      label: "Rummikub — Speeltafel"        },
];

const GRUB_TILES = Array.from({ length: 16 }, (_, i) => ({
  src: `/images/tegel-${21 + i}.png`,
  label: `${21 + i}`,
}));

const SVG_MISC = [
  { src: "/images/dobbelsteen-uitvouw.svg",   label: "Dobbelsteen uitvouw" },
  { src: "/images/regenwormen-tegels.svg",    label: "Grub tegels"  },
  { src: "/og-image.svg",                     label: "OG image"            },
  { src: "/icon.svg",                         label: "App icoon"           },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, count, accent = "var(--accent)" }: { title: string; count?: number; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
      <h2 style={{
        fontFamily: "'Fredoka', sans-serif", fontSize: 20, fontWeight: 700,
        color: accent, margin: 0,
      }}>{title}</h2>
      {count !== undefined && (
        <span style={{
          fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800,
          color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em",
        }}>{count} items</span>
      )}
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}44, transparent)` }} />
    </div>
  );
}

function AssetCard({ src, label, wide = false, tall = false, onZoom }: {
  src: string; label: string; wide?: boolean; tall?: boolean; onZoom: (src: string, label: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          gsap.fromTo(el, { opacity: 0, y: 14, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "back.out(1.6)" });
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={() => !err && onZoom(src, label)}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: err ? "default" : "zoom-in",
        gridColumn: wide ? "span 2" : "span 1",
        gridRow: tall ? "span 2" : "span 1",
        display: "flex", flexDirection: "column",
        transition: "border-color 0.15s, transform 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.22)"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
    >
      <div style={{ flex: 1, position: "relative", minHeight: wide || tall ? 120 : 80 }}>
        {err ? (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column", gap: 4, opacity: 0.3,
          }}>
            <span style={{ fontSize: 24 }}>🖼</span>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)" }}>niet beschikbaar</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            loading="lazy"
            onError={() => setErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8 }}
          />
        )}
      </div>
      <div style={{
        padding: "4px 8px 6px",
        fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700,
        color: "rgba(255,255,255,0.35)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.2)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {label}
      </div>
    </div>
  );
}

function BannerCard({ src, label, onZoom }: { src: string; label: string; onZoom: (src: string, label: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          gsap.fromTo(el, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" });
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={() => !err && onZoom(src, label)}
      style={{
        borderRadius: 14, overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: err ? "default" : "zoom-in",
        transition: "border-color 0.15s, transform 0.15s",
        aspectRatio: "340 / 162",
        position: "relative",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.22)"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1.015)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
    >
      {err ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11 }}>niet beschikbaar</span>
        </div>
      ) : (
        <Image src={src} alt={label} fill style={{ objectFit: "cover" }} onError={() => setErr(true)} />
      )}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "20px 12px 8px",
        background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
        fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800,
        color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em",
      }}>{label}</div>
    </div>
  );
}

function AvatarCard({ avatar, onZoom, index }: {
  avatar: typeof AVATARS[number]; onZoom: (src: string, label: string) => void; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          gsap.fromTo(el,
            { opacity: 0, scale: 0.7, y: 10 },
            { opacity: 1, scale: 1, y: 0, duration: 0.3, delay: (index % 5) * 0.05, ease: "back.out(1.8)" }
          );
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const src = `/avatars/${avatar.id}.png`;

  return (
    <div
      ref={ref}
      onClick={() => onZoom(src, avatar.label)}
      style={{
        borderRadius: 16, overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "zoom-in",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "8px 8px 6px", gap: 6,
        transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.3)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px) scale(1.04)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={avatar.label}
        loading="lazy"
        style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, display: "block" }}
      />
      <span style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 800,
        color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        maxWidth: "100%",
      }}>{avatar.label}</span>
    </div>
  );
}

function SvgBannerCard({ item, onZoom }: {
  item: typeof SVG_BANNERS[number]; onZoom: (label: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const art = GAME_ART[item.id];

  return (
    <div
      ref={ref}
      onClick={() => onZoom(item.label)}
      style={{
        borderRadius: 14, overflow: "hidden",
        border: `1px solid ${item.accent}33`,
        cursor: "pointer",
        aspectRatio: "340 / 162",
        position: "relative",
        transition: "border-color 0.15s, transform 0.15s",
        boxShadow: `0 2px 12px ${item.accent}18`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = item.accent + "88";
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.015)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = item.accent + "33";
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
      }}
    >
      {art ? art({ uid: `ill-${item.id}` }) : <item.Component uid={`ill-${item.id}`} />}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "20px 12px 8px",
        background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
        fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 800,
        color: item.accent, letterSpacing: "0.06em",
        pointerEvents: "none",
      }}>
        {item.label} <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>SVG</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────────────────────────────────────

function Lightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const img = imgRef.current;
    if (!el || !img) return;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(img, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.8)" });
  }, []);

  function handleClose() {
    const el = ref.current;
    if (!el) { onClose(); return; }
    gsap.to(el, { opacity: 0, duration: 0.15, onComplete: onClose });
  }

  return (
    <div
      ref={ref}
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
        padding: 24, cursor: "zoom-out",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={label}
        style={{
          maxWidth: "min(90vw, 800px)",
          maxHeight: "80dvh",
          objectFit: "contain",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      />
      <div style={{
        fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700,
        color: "rgba(255,255,255,0.5)",
      }}>
        {label} — <span style={{ opacity: 0.5 }}>klik om te sluiten</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function IllustrationsPage() {
  const router = useRouter();
  const { t } = useLang();
  const headerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    gsap.fromTo(el,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, []);

  function openZoom(src: string, label: string) { setZoom({ src, label }); }
  function closeZoom() { setZoom(null); }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg-gradient)",
      color: "var(--text)",
      paddingBottom: 80,
    }}>

      {/* Header */}
      <div ref={headerRef} style={{
        padding: "48px 20px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            fontFamily: "'Fredoka', sans-serif", fontSize: 34, fontWeight: 700,
            color: "var(--text)", marginBottom: 4,
          }}>
            Illustrations
          </div>
          <div style={{
            fontFamily: "'Nunito', sans-serif", fontSize: 12,
            color: "var(--text-muted)",
          }}>
            Alle game art, banners, assets en DALL-E avatars van Ludoryn
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { label: "SVG banners",  count: SVG_BANNERS.length  },
              { label: "PNG banners",  count: PNG_BANNERS.length  },
              { label: "Game assets",  count: GAME_SECTIONS.reduce((s, g) => s + g.assets.length, 0) },
              { label: "Avatars",      count: AVATARS.length      },
              { label: "Grub tegels", count: GRUB_TILES.length   },
              { label: "Board backgrounds", count: BOARD_BACKGROUNDS.length },
              { label: "Shop art",     count: SHOP_ART.length     },
              { label: "SVG misc",     count: SVG_MISC.length     },
            ].map(({ label, count }) => (
              <div key={label} style={{
                padding: "4px 10px", borderRadius: 20,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 700,
                color: "rgba(255,255,255,0.5)",
              }}>
                {count} {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {/* SVG Game Banners */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="SVG Game Banners" count={SVG_BANNERS.length} accent="var(--accent)" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}>
            {SVG_BANNERS.map(item => (
              <SvgBannerCard key={item.id} item={item} onZoom={(label) => {
                // For SVG banners we just scroll / show info, no zoom needed
                void label;
              }} />
            ))}
          </div>
        </section>

        {/* PNG Banners */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="PNG Banners" count={PNG_BANNERS.length} accent="#4CAF50" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}>
            {PNG_BANNERS.map((b) => (
              <BannerCard key={b.src} src={b.src} label={b.label} onZoom={openZoom} />
            ))}
          </div>
        </section>

        {/* DALL-E Avatars */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="DALL-E 3 Avatars" count={AVATARS.length} accent="#AB47BC" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: 10,
          }}>
            {AVATARS.map((av, i) => (
              <AvatarCard key={av.id} avatar={av} onZoom={openZoom} index={i} />
            ))}
          </div>
        </section>

        {/* Per-game assets */}
        {GAME_SECTIONS.map(section => (
          <section key={section.id} style={{ marginBottom: 48 }}>
            <SectionHeader title={`${section.label} — Assets`} count={section.assets.length} accent={section.accent} />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: 8,
            }}>
              {section.assets.map(a => (
                <AssetCard key={a.src} src={a.src} label={a.label} onZoom={openZoom} />
              ))}
            </div>
          </section>
        ))}

        {/* Grub tegels */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="Grub Tegels (21–36)" count={GRUB_TILES.length} accent="#FFB830" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 8,
          }}>
            {GRUB_TILES.map(t => (
              <AssetCard key={t.src} src={t.src} label={t.label} onZoom={openZoom} />
            ))}
          </div>
        </section>

        {/* Board backgrounds */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="In-game Board Achtergronden" count={BOARD_BACKGROUNDS.length} accent="#4285F4" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
          }}>
            {BOARD_BACKGROUNDS.map(a => (
              <AssetCard key={a.src} src={a.src} label={a.label} onZoom={openZoom} />
            ))}
          </div>
        </section>

        {/* Shop art */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="Shop — Uitbreidingen" count={SHOP_ART.length} accent="#FF9A3C" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
          }}>
            {SHOP_ART.map(a => (
              <AssetCard key={a.src} src={a.src} label={a.label} onZoom={openZoom} />
            ))}
          </div>
        </section>

        {/* SVG misc */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="SVG Assets" count={SVG_MISC.length} accent="#E53935" />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}>
            {SVG_MISC.map(s => (
              <AssetCard key={s.src} src={s.src} label={s.label} wide onZoom={openZoom} />
            ))}
          </div>
        </section>

      </div>

      {/* Lightbox */}
      {zoom && <Lightbox src={zoom.src} label={zoom.label} onClose={closeZoom} />}

      <BottomNav items={[
        { label: t.home,   icon: "home",   onClick: () => router.push("/")       },
        { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby")  },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

      ]} />
    </div>
  );
}

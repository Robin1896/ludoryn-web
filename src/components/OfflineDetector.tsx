"use client";

import { useEffect, useState } from "react";

export default function OfflineDetector() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function onOnline()  { setOffline(false); }
    function onOffline() { setOffline(true); }

    // Check initial state
    if (!navigator.onLine) setOffline(true);

    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#080B24",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
    }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(238,242,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5C5 9.46 7.46 7 10.5 7S16 9.46 16 12.5"/>
        <path d="M2 9.5C2 5.36 5.36 2 9.5 2S17 5.36 17 9.5"/>
        <path d="M8 15.5C8 13.57 9.57 12 11.5 12S15 13.57 15 15.5"/>
        <circle cx="11" cy="19" r="1.5" fill="rgba(238,242,255,0.3)" stroke="none"/>
      </svg>
      <div style={{
        fontFamily: "'Fredoka', sans-serif",
        fontSize: 26, fontWeight: 700, color: "#EEF2FF",
      }}>
        Geen verbinding
      </div>
      <div style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: 14, color: "rgba(238,242,255,0.45)",
        textAlign: "center", maxWidth: 280, lineHeight: 1.6,
      }}>
        Ludoryn heeft internet nodig om multiplayer te spelen. Controleer je verbinding en probeer opnieuw.
      </div>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          padding: "12px 32px", borderRadius: 50,
          background: "#20D9A0", color: "#052e16",
          border: "none", cursor: "pointer",
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 700, fontSize: 14,
        }}
      >
        Opnieuw proberen
      </button>
    </div>
  );
}

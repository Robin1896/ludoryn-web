"use client";

import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/ui";
import { useLang } from "@/lib/lang";

export default function CatalogPage() {
  const router = useRouter();
  const { t } = useLang();
  return (
    <main style={{ minHeight: "100vh", background: "#080B24", color: "#EEF2FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 24, fontWeight: 700, color: "rgba(238,242,255,0.3)", marginBottom: 8 }}>Catalogus</div>
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: "rgba(238,242,255,0.2)" }}>Binnenkort beschikbaar</div>
      <BottomNav items={[
        { label: t.home,   icon: "home",   onClick: () => router.push("/") },
        { label: t.lobby,  icon: "lobby",  onClick: () => router.push("/lobby") },
        { label: t.scores, icon: "scores", onClick: () => router.push("/scores") },

      ]} />
    </main>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineDetector from "@/components/OfflineDetector";
import { AppThemeProvider } from "@/lib/theme-context";
import { LangProvider } from "@/lib/lang";
import { Toaster } from "react-hot-toast";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ludoryn.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Ludoryn — Speel bordspellen online",
    template: "%s | Ludoryn",
  },
  description: "Speel bordspellen online met vrienden — Grub, Kriskras, Carcassonne en meer. Direct in de browser, geen app nodig.",
  keywords: ["bordspel", "online bordspel", "Wormenjacht", "Kriskras", "Carcassonne", "multiplayer", "spel met vrienden"],
  authors: [{ name: "Ludoryn" }],
  creator: "Ludoryn",
  openGraph: {
    type: "website",
    siteName: "Ludoryn",
    title: "Ludoryn — Speel bordspellen online",
    description: "Speel bordspellen online met vrienden — Grub, Kriskras, Carcassonne en meer.",
    url: APP_URL,
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Ludoryn" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ludoryn — Speel bordspellen online",
    description: "Speel bordspellen online met vrienden — Grub, Kriskras, Carcassonne en meer.",
    images: ["/og-image.svg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ludoryn",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4efe6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <LangProvider>
          <AppThemeProvider>
            <OfflineDetector />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3500,
                style: {
                  background: "var(--card, #fffdf9)",
                  color: "var(--text, #1a1d2e)",
                  border: "1px solid var(--border, rgba(26,29,46,0.10))",
                  borderRadius: 14,
                  fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 14px",
                  boxShadow: "0 4px 20px rgba(26,29,46,0.10)",
                },
              }}
            />
            {children}
          </AppThemeProvider>
        </LangProvider>
      </body>
    </html>
  );
}

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "nl.ludoryn.app",
  appName: "Ludoryn",
  webDir: "out",

  // In productie (Capacitor build) verbindt de app met de live server.
  // Verwijder server.url om de statische build te gebruiken (na `npm run build:cap`).
  server: {
    url: "https://ludus-gh4z.onrender.com",
    allowNavigation: ["ludus-gh4z.onrender.com", "www.ludoryn.com", "ludoryn.com"],
    androidScheme: "https",
  },

  ios: {
    contentInset: "always",
    backgroundColor: "#f4efe6",
  },

  android: {
    backgroundColor: "#f4efe6",
  },
};

export default config;

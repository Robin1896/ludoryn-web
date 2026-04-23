export type LevelId = "piraten" | "gezellig" | "dojo" | "ruimte" | "natuur" | "magie";

export interface Level {
  id: LevelId;
  name: string;
  tagline: string;
  description: string;
  available: boolean;
  accent: string;
  accentDark: string;
  bg: string;
  icon: string;
  tags: string[];
}

export const LEVELS: Level[] = [
  {
    id: "piraten",
    name: "Piraten",
    tagline: "Scheepsdek · Oceaan · Lantaarns",
    description:
      "Speel op het dek van een piratenschip, omgeven door de nachtelijke oceaan. Goud, kanonnen en het geluid van de zee.",
    available: true,
    accent: "#F59E0B",
    accentDark: "#92400E",
    bg: "#050D1A",
    icon: "",
    tags: ["Nacht", "Zee", "Avontuur"],
  },
  {
    id: "gezellig",
    name: "Gezellig",
    tagline: "Kaarsen · Boeken · Houten tafel",
    description:
      "Een warme binnenkamer met kaarslicht, stapels boeken en een solide houten tafel. Comfortabel en vertrouwd.",
    available: true,
    accent: "#FF9A3C",
    accentDark: "#92400E",
    bg: "#080B24",
    icon: "",
    tags: ["Warm", "Knus", "Klassiek"],
  },
  {
    id: "dojo",
    name: "Dojo",
    tagline: "Bamboe · Steen · Stilte",
    description:
      "Een serene Japanse dojo met bamboematten en stenen muren. Minimalistisch en gefocust.",
    available: false,
    accent: "#20D9A0",
    accentDark: "#0A5A40",
    bg: "#080B24",
    icon: "",
    tags: ["Zen", "Minimaal", "Japan"],
  },
  {
    id: "ruimte",
    name: "Ruimtestation",
    tagline: "Orbit · Sterren · Aarde",
    description:
      "Speel in een orbitaal station met uitzicht op de rondwentelende aarde. Science fiction op zijn best.",
    available: false,
    accent: "#5B7FFF",
    accentDark: "#1E2E80",
    bg: "#080B24",
    icon: "",
    tags: ["Sci-fi", "Toekomst", "Ruimte"],
  },
  {
    id: "magie",
    name: "Magie",
    tagline: "Tovenaar · Kaarten · Duister",
    description:
      "Een donkere magiërsmarkt met zwevende spreuken, mystieke kaarten en gevaarlijke wezens. Voel de kracht van het arcaan.",
    available: true,
    accent: "#C084FC",
    accentDark: "#581C87",
    bg: "#0C0514",
    icon: "",
    tags: ["Fantasy", "Magie", "Duister"],
  },
  {
    id: "natuur",
    name: "Bos & Natuur",
    tagline: "Bomen · Bloemen · Stilte",
    description:
      "Een rustgevend bos met kleurrijke bloemen, knoestige bomen en zachte graspollen. Frisse lucht en eeuwige stilte.",
    available: true,
    accent: "#4ADE80",
    accentDark: "#166534",
    bg: "#0D1F0F",
    icon: "",
    tags: ["Natuur", "Bos", "Rustig"],
  },
];

export function getActiveLevel(): LevelId {
  if (typeof window === "undefined") return "piraten";
  return (localStorage.getItem("ludoryn-level") as LevelId) ?? "piraten";
}

export function setActiveLevel(id: LevelId): void {
  localStorage.setItem("ludoryn-level", id);
}

export function getLevelById(id: LevelId): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

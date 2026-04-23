export type GameTheme = {
  id: string;
  name: string;
  icon: string;
  available: boolean;
  primary: string;
  primaryDark: string;
  primaryText: string;
  bg: string;
  card: string;
  card2: string;
  border: string;
};

const LIGHT: Omit<GameTheme, "id" | "name" | "icon" | "available"> = {
  primary:     "#c14a1f",
  primaryDark: "#a03d18",
  primaryText: "#fff",
  bg:          "#f4efe6",
  card:        "#fffdf9",
  card2:       "#f0ebe2",
  border:      "rgba(26,29,46,0.10)",
};

export const THEMES: Record<string, GameTheme> = {
  catan:          { id: "catan",          name: "Catan",      icon: "",   available: true,  ...LIGHT },
  grub:           { id: "grub",           name: "Grub",       icon: "",   available: true,  ...LIGHT },
  "ticket-to-ride":{ id: "ticket-to-ride", name: "Treinreis", icon: "🚂", available: true,  ...LIGHT },
  carcassonne:    { id: "carcassonne",    name: "Carcassonne",icon: "",   available: true,  ...LIGHT },
  wingspan:       { id: "wingspan",       name: "Wingspan",   icon: "🦅", available: true,  ...LIGHT },
  beverbende:     { id: "beverbende",     name: "Beverbende", icon: "🦫", available: true,  ...LIGHT },
  qwixx:          { id: "qwixx",          name: "Kriskras",   icon: "",   available: true,  ...LIGHT },
};

export const DEFAULT_THEME = THEMES.grub;

export function getTheme(gameId?: string | null): GameTheme {
  const theme = gameId && THEMES[gameId] ? THEMES[gameId] : DEFAULT_THEME;
  return theme.available ? theme : DEFAULT_THEME;
}

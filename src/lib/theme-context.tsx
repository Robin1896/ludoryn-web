"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppTheme = "dark" | "light";

interface ThemeCtx {
  theme: AppTheme;
  toggle: () => void;
  isDark: boolean;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {}, isDark: false });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>("light");

  useEffect(() => {
    localStorage.setItem("ludoryn-theme", "light");
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ludoryn-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <Ctx.Provider value={{ theme, toggle, isDark: theme === "dark" }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAppTheme = () => useContext(Ctx);

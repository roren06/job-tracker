import { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "jobtracker_theme";

function getSystemTheme(): Theme {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved ?? "light"; // will be replaced in effect by system if no saved
  });

  // initial: system preference unless user has saved choice
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = saved ?? getSystemTheme();
    setTheme(initial);
  }, []);

  // apply to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // update live if system changes AND user didn't choose manually
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setTheme(getSystemTheme());
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const toggle = useMemo(
    () => () => {
      setTheme((prev) => {
        const next = prev === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, next);
        return next;
      });
    },
    []
  );

  const resetToSystem = useMemo(
    () => () => {
      localStorage.removeItem(STORAGE_KEY);
      setTheme(getSystemTheme());
    },
    []
  );

  return { theme, toggle, resetToSystem };
}

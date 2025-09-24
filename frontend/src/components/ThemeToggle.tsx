import React, { useEffect, useState } from "react";
import SunIcon from '@/assets/sun.svg?react';
import MoonIcon from '@/assets/moon.svg?react';

function applyTheme(next: "light" | "dark") {
  const root = document.documentElement;
  if (next === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem("theme", next);
}

const ThemeToggle: React.FC = () => {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ?? (systemDark ? "dark" : "light");
    setMode(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-lg px-3 py-2 hover:bg-[var(--muted)]"
    >
      {mode === "dark" ? <MoonIcon className="w-5 h-5 text-[var(--fg-muted)] hover:text-[var(--fg)]" /> : <SunIcon className="w-5 h-5 text-[var(--fg-muted)] hover:text-[var(--fg)]" />}
    </button>
  );
};

export default ThemeToggle;

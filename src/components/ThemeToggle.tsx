import { useEffect, useState } from "react";
import { IcSun, IcMoon } from "../lib/icons";

type Theme = "light" | "dark";

function current(): Theme {
  const stored = localStorage.getItem("pb-theme") as Theme | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(current);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pb-theme", theme);
  }, [theme]);

  return (
    <button className="iconbtn" title="Toggle theme" aria-label="Toggle colour theme"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
      {theme === "dark" ? <IcSun /> : <IcMoon />}
    </button>
  );
}

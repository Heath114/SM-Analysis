import { useEffect, useState } from "react";
import { IcSun, IcMoon } from "../lib/icons";
import { getTheme, toggleTheme, type Theme } from "../lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const onChange = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener("pb-theme", onChange);
    return () => window.removeEventListener("pb-theme", onChange);
  }, [theme]);

  return (
    <button className="iconbtn" title="Toggle theme (⌘K)" aria-label="Toggle colour theme"
      onClick={() => setTheme(toggleTheme())}>
      {theme === "dark" ? <IcSun /> : <IcMoon />}
    </button>
  );
}

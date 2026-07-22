export type Theme = "light" | "dark";

export function getTheme(): Theme {
  const stored = localStorage.getItem("pb-theme") as Theme | null;
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("pb-theme", t);
  window.dispatchEvent(new CustomEvent("pb-theme", { detail: t }));
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

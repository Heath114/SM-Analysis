export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return trim(n / 1e9) + "B";
  if (a >= 1e6) return trim(n / 1e6) + "M";
  if (a >= 1e3) return trim(n / 1e3, a >= 1e4 ? 0 : 1) + "K";
  return Math.round(n).toLocaleString("en-US");
}
function trim(n: number, d = 1): string {
  return n.toFixed(d).replace(/\.0+$/, "");
}
export function full(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
export function pct(n: number, digits = 1): string {
  return (n >= 0 ? "+" : "") + n.toFixed(digits) + "%";
}
export function pctPlain(n: number, digits = 1): string {
  return n.toFixed(digits) + "%";
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function shortDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${MON[x.getMonth()]} ${x.getDate()}`;
}
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

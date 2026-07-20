import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IcOverview = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IcContent = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v5" /></svg>
);
export const IcAudience = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M2.6 20a6.4 6.4 0 0 1 12.8 0M17 11a3 3 0 1 0-2-5M22 20a5 5 0 0 0-4-4.9" /></svg>
);
export const IcPlatforms = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></svg>
);
export const IcLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 6 6l-1 1M13.5 17.5l-1 1a4 4 0 0 1-6-6l1-1" /></svg>
);
export const IcSun = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IcMoon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const IcDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
);
export const IcRefresh = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg>
);
export const IcUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2.2}><path d="M7 14l5-5 5 5" /></svg>
);
export const IcDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2.2}><path d="M7 10l5 5 5-5" /></svg>
);
export const IcChevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>
);
export const IcCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)} strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></svg>
);
export const IcLogout = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
);
export const IcSpark = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
);
export const IcAlert = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" /></svg>
);
export const IcPlug = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5" /></svg>
);
export const IcInbox = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 13h5l2 3h4l2-3h5M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></svg>
);
export const IcClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

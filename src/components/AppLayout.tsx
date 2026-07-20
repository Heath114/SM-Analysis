import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDash } from "../context/DashboardContext";
import { PLATFORMS } from "../lib/platforms";
import { initials, compact, pctPlain } from "../lib/format";
import { seriesByDay, sum } from "../lib/api";
import ThemeToggle from "./ThemeToggle";
import {
  IcOverview, IcContent, IcAudience, IcPlatforms, IcLink,
  IcDownload, IcRefresh, IcChevron, IcLogout,
} from "../lib/icons";
import type { Range, Scope } from "../lib/types";

const NAV = [
  { to: "/", label: "Overview", Icon: IcOverview, end: true },
  { to: "/content", label: "Content", Icon: IcContent, end: false },
  { to: "/audience", label: "Audience", Icon: IcAudience, end: false },
  { to: "/platforms", label: "Platforms", Icon: IcPlatforms, end: false },
];
const TITLES: Record<string, string> = {
  "/": "Overview", "/content": "Content", "/audience": "Audience",
  "/platforms": "Platforms", "/connections": "Connections",
};

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const dash = useDash();
  const loc = useLocation();
  const nav = useNavigate();
  const [scopeOpen, setScopeOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);

  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "You";
  const title = TITLES[loc.pathname] ?? "Overview";

  const scopeLabel = dash.scope === "all" ? "All platforms" : PLATFORMS[dash.scope].name;

  function exportCsv() {
    const rows: string[] = [];
    rows.push("PulseBoard export");
    rows.push(`Window,${dash.range} days`);
    rows.push(`Scope,${scopeLabel}`);
    rows.push("");
    rows.push("Platform,Followers,Reach,Views,Engagements");
    for (const p of dash.connectedPlatforms) {
      const foll = seriesByDay(dash.metrics, p, "followers");
      const reach = sum(seriesByDay(dash.metrics, p, "reach"));
      const views = sum(seriesByDay(dash.metrics, p, "views"));
      const eng = sum(seriesByDay(dash.metrics, p, "engagements"));
      rows.push(`${PLATFORMS[p].name},${foll[foll.length - 1]?.value ?? 0},${reach},${views},${eng}`);
    }
    rows.push("");
    rows.push("Content,Platform,Views,Likes,Comments,Shares,Saves");
    for (const c of dash.content.slice(0, 50)) {
      rows.push(`"${c.title.replace(/"/g, "'")}",${PLATFORMS[c.platform].name},${c.views},${c.likes},${c.comments},${c.shares},${c.saves}`);
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pulseboard-export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__top">
          <span className="brandmark">
            <span className="glyph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2.5-7 4 15 3-9 2 3h4.5" /></svg></span>
            <b>PulseBoard</b>
          </span>
        </div>
        <nav className="side__nav">
          <div className="side__grouplabel">Analytics</div>
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => "side__link" + (isActive ? " active" : "")}>
              <Icon /> {label}
            </NavLink>
          ))}
          <div className="side__grouplabel">Setup</div>
          <NavLink to="/connections" className={({ isActive }) => "side__link" + (isActive ? " active" : "")}>
            <IcLink /> Connections
          </NavLink>
        </nav>
        <div className="side__foot menu-anchor">
          <button className="accountbtn" onClick={() => setAcctOpen((v) => !v)}>
            <span className="avatar">{initials(name)}</span>
            <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
              <span className="nm" style={{ display: "block" }}>{name}</span>
              <span className="em" style={{ display: "block" }}>{user?.email}</span>
            </span>
            <IcChevron style={{ width: 15, height: 15, color: "var(--muted)" }} />
          </button>
          {acctOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 55 }} onClick={() => setAcctOpen(false)} />
              <div className="pop" style={{ bottom: 60, left: 10, right: 10 }}>
                <button onClick={() => { setAcctOpen(false); nav("/connections"); }}><IcLink /> Connections</button>
                <hr />
                <button onClick={() => signOut()}><IcLogout /> Sign out</button>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="spacer" />

          <div className="seg" role="group" aria-label="Date range">
            {[7, 30, 90].map((r) => (
              <button key={r} aria-pressed={dash.range === r} onClick={() => dash.setRange(r as Range)}>{r}D</button>
            ))}
          </div>

          <div className="menu-anchor">
            <button className="btn btn--sm" onClick={() => setScopeOpen((v) => !v)}>
              {scopeLabel} <IcChevron style={{ width: 14, height: 14 }} />
            </button>
            {scopeOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 55 }} onClick={() => setScopeOpen(false)} />
                <div className="pop" style={{ top: 40, right: 0 }}>
                  <button onClick={() => { dash.setScope("all"); setScopeOpen(false); }}>
                    <span className="dot" style={{ background: "var(--text)" }} /> All platforms
                  </button>
                  {dash.connectedPlatforms.length > 0 && <hr />}
                  {dash.connectedPlatforms.map((p) => (
                    <button key={p} onClick={() => { dash.setScope(p as Scope); setScopeOpen(false); }}>
                      <span className="dot" style={{ background: PLATFORMS[p].color }} /> {PLATFORMS[p].name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button className="btn btn--sm" onClick={() => dash.sync()} disabled={dash.syncing || dash.connectedPlatforms.length === 0}>
            <IcRefresh className={dash.syncing ? "spin" : ""} /> {dash.syncing ? "Syncing" : "Sync"}
          </button>
          <button className="iconbtn" title="Export CSV" onClick={exportCsv} disabled={!dash.hasData}><IcDownload /></button>
          <ThemeToggle />
        </header>

        <main className="content">
          <div className="content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

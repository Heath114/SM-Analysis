import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchShare } from "../lib/api";
import { getTheme, applyTheme } from "../lib/theme";
import ReportSheet from "../components/ReportSheet";
import ThemeToggle from "../components/ThemeToggle";
import type { ReportSnapshot } from "../lib/snapshot";
import { IcFile } from "../lib/icons";

export default function SharedReport() {
  const { slug } = useParams();
  const [snap, setSnap] = useState<ReportSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    fetchShare(slug)
      .then((s) => { if (alive) setSnap(s as ReportSnapshot); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Not found."); });
    return () => { alive = false; };
  }, [slug]);

  return (
    <div className="shareview">
      <div className="shareview__bar">
        <span className="brandmark">
          <span className="glyph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2.5-7 4 15 3-9 2 3h4.5" /></svg></span>
          <b>PulseBoard</b>
        </span>
        <span className="badge">Read-only report</span>
        <span className="spacer" style={{ flex: 1 }} />
        {snap && <button className="btn btn--sm" onClick={() => window.print()}><IcFile style={{ width: 15, height: 15 }} /> Print / Save PDF</button>}
        <ThemeToggle />
      </div>

      <div className="shareview__body">
        {error && <div className="panel" style={{ maxWidth: 460, margin: "60px auto" }}>
          <div className="empty"><h3>Report unavailable</h3><p className="muted">{error}</p>
            <a className="btn btn--primary" href="/" style={{ marginTop: 12 }}>Go to PulseBoard</a></div>
        </div>}
        {!error && !snap && <div className="spin" style={{ margin: "80px auto" }} />}
        {snap && <ReportSheet snap={snap} />}
      </div>
    </div>
  );
}

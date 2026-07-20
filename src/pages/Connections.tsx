import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDash } from "../context/DashboardContext";
import { useToast } from "../context/ToastContext";
import { supabase, isConfigured } from "../lib/supabase";
import { PLATFORMS, PLATFORM_ORDER, PLATFORM_FILL } from "../lib/platforms";
import { formatDistanceToNow } from "date-fns";
import { IcCheck, IcRefresh, IcAlert, IcLink } from "../lib/icons";
import type { Platform } from "../lib/types";

export default function Connections() {
  const dash = useDash();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [connecting, setConnecting] = useState<Platform | null>(null);

  // Surface the OAuth callback result (?connected=instagram or ?error=...)
  useEffect(() => {
    const ok = params.get("connected");
    const error = params.get("error");
    if (ok) { toast(`${PLATFORMS[ok as Platform]?.name ?? ok} connected.`); void dash.refresh(); }
    if (error) toast(`Connection failed: ${error}`);
    if (ok || error) { params.delete("connected"); params.delete("error"); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect(platform: Platform) {
    if (!isConfigured) { toast("Configure Supabase first (see README)."); return; }
    setConnecting(platform);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast("Please sign in again."); setConnecting(null); return; }
    // Meta OAuth covers both Facebook Pages and their linked Instagram accounts.
    const fn = platform === "tiktok" ? "oauth-tiktok" : "oauth-meta";
    window.location.href = `/api/${fn}?token=${encodeURIComponent(session.access_token)}`;
  }

  async function disconnect(id: string, name: string) {
    if (!confirm(`Disconnect ${name}? Historical data is kept; syncing stops.`)) return;
    const { error } = await supabase.from("social_accounts").update({ status: "revoked" }).eq("id", id);
    if (error) toast(error.message);
    else { toast(`${name} disconnected.`); void dash.refresh(); }
  }

  const connectedByPlatform = (p: Platform) => dash.accounts.filter((a) => a.platform === p && a.status !== "revoked");

  return (
    <>
      <div className="banner" style={{ marginBottom: 4 }}>
        <IcAlert />
        <div className="bt">
          <b>Live data needs approved platform apps.</b>
          <p>Connections use official OAuth. Until your Meta and TikTok developer apps pass review and the backend keys are set, the connect buttons will return an auth error — that’s expected. See the README for the full setup.</p>
        </div>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {PLATFORM_ORDER.map((p) => {
          const accts = connectedByPlatform(p);
          return (
            <div className="conn" key={p}>
              <span className="pf" style={{ width: 40, height: 40, background: PLATFORM_FILL[p] }}>{PLATFORMS[p].icon}</span>
              <div className="meta">
                <div className="nm">{PLATFORMS[p].name}</div>
                {accts.length === 0 ? (
                  <div className="st">Not connected</div>
                ) : accts.map((a) => (
                  <div className="st" key={a.id}>
                    <span className={`chip ${a.status === "connected" ? "chip--ok" : "chip--warn"}`}>
                      {a.status === "connected" ? <IcCheck style={{ width: 12, height: 12 }} /> : <IcAlert style={{ width: 12, height: 12 }} />}
                      {a.status === "connected" ? "Connected" : a.status}
                    </span>
                    <span>@{a.username}</span>
                    {a.last_synced_at && <span className="muted">· synced {formatDistanceToNow(new Date(a.last_synced_at), { addSuffix: true })}</span>}
                    <button className="btn btn--sm btn--danger" style={{ marginLeft: 8, height: 24 }} onClick={() => disconnect(a.id, PLATFORMS[p].name)}>Disconnect</button>
                  </div>
                ))}
              </div>
              <button className="btn btn--primary btn--sm" onClick={() => connect(p)} disabled={connecting === p}>
                <IcLink /> {accts.length ? "Reconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Data refreshes on sync. Automatic daily sync runs server-side once deployed.</span>
        <button className="btn btn--sm" onClick={() => dash.sync()} disabled={dash.syncing || dash.connectedPlatforms.length === 0}>
          <IcRefresh className={dash.syncing ? "spin" : ""} /> Sync now
        </button>
      </div>
    </>
  );
}

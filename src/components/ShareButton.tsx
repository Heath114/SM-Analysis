import { useState } from "react";
import { useToast } from "../context/ToastContext";
import { createShare } from "../lib/api";
import { IcLink, IcCheck } from "../lib/icons";
import type { ReportSnapshot } from "../lib/snapshot";

export default function ShareButton({ snap }: { snap: ReportSnapshot }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const { url } = await createShare(snap);
      try {
        await navigator.clipboard.writeText(url);
        toast("Read-only link copied to clipboard.");
      } catch {
        toast(url);
      }
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create a share link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn--sm" onClick={share} disabled={busy}>
      {done ? <IcCheck style={{ width: 15, height: 15 }} /> : <IcLink style={{ width: 15, height: 15 }} />}
      {busy ? "Creating…" : done ? "Copied" : "Share link"}
    </button>
  );
}

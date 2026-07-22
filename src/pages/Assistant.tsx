import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDash } from "../context/DashboardContext";
import { askAI } from "../lib/api";
import { summarizeForAI } from "../lib/analytics";
import EmptyState from "../components/EmptyState";
import { IcMessage, IcSend, IcPlug, IcSpark } from "../lib/icons";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why did my reach change recently?",
  "What should I post next?",
  "When is the best time to post?",
  "Which platform is growing fastest?",
];

export default function Assistant() {
  const dash = useDash();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const summary = summarizeForAI({
        range: dash.range, scope: dash.scope, connectedPlatforms: dash.connectedPlatforms,
        metrics: dash.metrics, content: dash.content, audience: dash.audience,
      });
      const answer = await askAI(summary, next);
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  if (dash.connectedPlatforms.length === 0)
    return <div className="panel"><EmptyState icon={<IcPlug />} title="Connect an account first"
      action={<Link className="btn btn--primary" to="/connections">Go to Connections</Link>}>
      The assistant reads your real, synced numbers and answers questions about them. Connect a platform to start a conversation.
    </EmptyState></div>;

  return (
    <div className="panel chat">
      <div className="panel__head">
        <IcMessage style={{ width: 16, height: 16, color: "var(--ink)" }} />
        <h3>Assistant</h3>
        <span className="sub">grounded in your last {dash.range} days</span>
      </div>

      <div className="chat__log" ref={logRef}>
        {messages.length === 0 && (
          <div className="chat__intro">
            <div className="chat__intro-badge"><IcSpark style={{ width: 22, height: 22 }} /></div>
            <h4>Ask about your performance</h4>
            <p className="muted">I read the data behind your dashboard. Try one of these, or ask your own.</p>
            <div className="chat__suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role}`}>
            <div className="msg__bubble">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="msg msg--assistant">
            <div className="msg__bubble msg__typing"><i /><i /><i /></div>
          </div>
        )}
        {error && <div className="banner" style={{ borderColor: "var(--neg-weak)" }}><div className="bt"><b>Couldn't reach the assistant</b><p>{error}</p></div></div>}
      </div>

      <form className="chat__form" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <input
          className="input"
          placeholder="Ask anything about your metrics…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          aria-label="Message the assistant"
        />
        <button className="btn btn--primary" type="submit" disabled={busy || !input.trim()} aria-label="Send">
          <IcSend style={{ width: 16, height: 16 }} />
        </button>
      </form>
    </div>
  );
}

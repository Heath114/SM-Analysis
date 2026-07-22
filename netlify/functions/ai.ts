import type { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { userIdFromToken, json } from "./_lib";

/**
 * POST /api/ai   (Authorization: Bearer <supabase token>)
 * Body: { summary: string, messages: {role:"user"|"assistant", content:string}[] }
 *
 * A grounded analytics assistant. The browser computes a compact, numbers-only
 * summary of the signed-in user's real dashboard (no tokens, no PII) and sends
 * it with the conversation. Claude answers questions about the performance.
 */
const MODEL = "claude-opus-4-8";

type Msg = { role: "user" | "assistant"; content: string };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { message: "Use POST." });

  // Require a signed-in user — this endpoint spends the org's Anthropic budget.
  const uid = await userIdFromToken(event.headers.authorization);
  if (!uid) return json(401, { message: "Not signed in." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(503, { message: "The assistant isn't configured yet (missing ANTHROPIC_API_KEY)." });

  let body: { summary?: string; messages?: Msg[] };
  try { body = JSON.parse(event.body || "{}"); }
  catch { return json(400, { message: "Bad JSON." }); }

  const summary = (body.summary || "").slice(0, 8000);
  const history = Array.isArray(body.messages) ? body.messages : [];
  const messages = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!messages.length || messages[messages.length - 1].role !== "user")
    return json(400, { message: "Expected a trailing user message." });

  const system = [
    "You are PulseBoard's analytics assistant. You help the user understand their own social media performance across Facebook, Instagram and TikTok.",
    "You are given a factual snapshot of their current dashboard below. Answer using ONLY these numbers — cite the specific figures you rely on. If the snapshot doesn't contain what's needed to answer, say so plainly and suggest what to check or sync; never invent data.",
    "Be concise and direct: lead with the answer, then a short reason. Use plain prose and simple bullet points. Do not use em dashes. Keep responses under ~180 words unless the user asks for depth.",
    "When asked what to post next or when, ground it in the best posting windows and the top-performing content in the snapshot.",
    "",
    "=== DASHBOARD SNAPSHOT ===",
    summary || "(no data available yet — the user hasn't connected an account or synced.)",
  ].join("\n");

  try {
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system,
      thinking: { type: "disabled" }, // keep well under the function timeout
      messages,
    });
    const answer = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return json(200, { answer: answer || "I couldn't produce an answer for that." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed.";
    return json(502, { message: msg });
  }
};

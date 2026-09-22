import { SYSTEM_INSTRUCTION } from "./lib/knowledge.mjs";

const HUB_API = (
  process.env.COSGRAL_HUB_CHAT_API || "https://cosgralhub.netlify.app/api/site-chat"
).replace(/\/$/, "");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const AI_SOURCE = "cosgral-ai";
/** Invisible marker so Hub-mirrored AI replies are not treated as human takeover. */
const AI_BODY_PREFIX = "\u200Bcgai\u200B";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Visitor-Key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function ok(status, body) {
  return {
    statusCode: status,
    headers: CORS,
    body: JSON.stringify(body),
  };
}

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function hubGet(visitorKey) {
  const url = `${HUB_API}?visitor_key=${encodeURIComponent(visitorKey)}&_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("hub_get_failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

async function hubPostVisitor({ visitorKey, body, pageUrl }) {
  const res = await fetch(HUB_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitor_key: visitorKey,
      body,
      page_url: pageUrl || "",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("hub_post_failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

async function hubPostAgent({ visitorKey, body, pin }) {
  if (!pin) return null;
  const res = await fetch(HUB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Chat-Agent-Pin": pin,
      "X-Visitor-Key": visitorKey,
    },
    body: JSON.stringify({
      visitor_key: visitorKey,
      body: AI_BODY_PREFIX + body,
      role: "agent",
      source: AI_SOURCE,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const msg = data && data.message;
  if (!msg || msg.role !== "agent") return null;
  return Object.assign({}, msg, {
    body: stripAiPrefix(msg.body),
    source: AI_SOURCE,
  });
}

function stripAiPrefix(text) {
  const s = String(text || "");
  return s.indexOf(AI_BODY_PREFIX) === 0 ? s.slice(AI_BODY_PREFIX.length) : s;
}

function isAiAgentMessage(m) {
  if (!m || m.role !== "agent") return false;
  if (m.source === AI_SOURCE) return true;
  if (String(m.id || "").indexOf("ai-") === 0) return true;
  if (String(m.body || "").indexOf(AI_BODY_PREFIX) === 0) return true;
  return false;
}

function detectHumanTakeover(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list.some(function (m) {
    return m && m.role === "agent" && !isAiAgentMessage(m);
  });
}

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : []).map(function (m) {
    if (!m) return m;
    if (!isAiAgentMessage(m)) return m;
    return Object.assign({}, m, {
      body: stripAiPrefix(m.body),
      source: AI_SOURCE,
    });
  });
}

function toGeminiContents(history, latestUser) {
  const contents = [];
  const hist = Array.isArray(history) ? history.slice(-12) : [];
  const latest = String(latestUser).slice(0, 2000);
  for (const m of hist) {
    if (!m || !m.body) continue;
    const role = m.role === "agent" || m.role === "model" ? "model" : "user";
    contents.push({ role, parts: [{ text: String(m.body).slice(0, 2000) }] });
  }
  while (
    contents.length &&
    contents[contents.length - 1].role === "user" &&
    contents[contents.length - 1].parts[0].text === latest
  ) {
    contents.pop();
  }
  contents.push({ role: "user", parts: [{ text: latest }] });
  return contents;
}

async function generateGeminiReply({ history, latestUser, pageUrl }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error("missing_gemini_key");
    err.code = "missing_gemini_key";
    throw err;
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const pageNote = pageUrl ? `\nKlient jest na stronie: ${String(pageUrl).slice(0, 400)}` : "";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION + pageNote }],
      },
      contents: toGeminiContents(history, latestUser),
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 512,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("gemini_failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  const text =
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts
      ? data.candidates[0].content.parts
          .map(function (p) {
            return p && p.text ? p.text : "";
          })
          .join("")
          .trim()
      : "";

  if (!text) throw new Error("gemini_empty");
  return text.slice(0, 2000);
}

function fallbackAiText() {
  return (
    "Dzięki za wiadomość — zespół Cosgral właśnie ją widzi i odpisze tak szybko, jak to możliwe. " +
    "Tymczasem możesz napisać, czego potrzebujesz (strona, aplikacja, CRM, SEO albo wideo), " +
    "albo zadzwonić: Jakub +48 533 790 518 · Kacper +48 571 798 397."
  );
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return JSON.parse(raw);
}

export async function handler(event) {
  const method = (event.httpMethod || event.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (method === "GET") {
    const params = event.queryStringParameters || {};
    const visitorKey = String(params.visitor_key || "").trim();
    if (visitorKey.length < 8) return ok(400, { error: "visitor_key_required" });
    try {
      const data = await hubGet(visitorKey);
      const messages = normalizeMessages(data.messages);
      return ok(200, {
        thread_id: data.thread_id || null,
        messages,
        human_takeover: detectHumanTakeover(Array.isArray(data.messages) ? data.messages : []),
      });
    } catch (_) {
      return ok(502, { error: "hub_unavailable" });
    }
  }

  if (method !== "POST") return ok(405, { error: "method_not_allowed" });

  let payload;
  try {
    payload = parseBody(event);
  } catch (_) {
    return ok(400, { error: "invalid_json" });
  }

  const visitorKey = String((payload && payload.visitor_key) || "").trim();
  const body = String((payload && payload.body) || "").trim();
  const pageUrl = String((payload && payload.page_url) || "").slice(0, 500);
  const history = Array.isArray(payload && payload.history) ? payload.history : [];

  if (visitorKey.length < 8) return ok(400, { error: "visitor_key_required" });
  if (!body || body.length > 2000) return ok(400, { error: "body_invalid" });

  let hubResult;
  try {
    hubResult = await hubPostVisitor({ visitorKey, body, pageUrl });
  } catch (_) {
    return ok(502, { error: "hub_unavailable" });
  }

  const visitorMessage = hubResult.message || {
    id: uuid(),
    thread_id: hubResult.thread_id || null,
    role: "visitor",
    body,
    created_at: new Date().toISOString(),
  };

  let hubSnapshot = { messages: [] };
  try {
    hubSnapshot = await hubGet(visitorKey);
  } catch (_) {}

  const existing = Array.isArray(hubSnapshot.messages) ? hubSnapshot.messages : [];
  const humanTakeover = detectHumanTakeover(existing);

  if (humanTakeover) {
    return ok(201, {
      thread_id: hubResult.thread_id || hubSnapshot.thread_id || null,
      message: visitorMessage,
      ai_message: null,
      human_takeover: true,
    });
  }

  let replyText;
  try {
    replyText = await generateGeminiReply({
      history: history.length ? history : existing,
      latestUser: body,
      pageUrl,
    });
  } catch (_) {
    replyText = fallbackAiText();
  }

  const pin = (process.env.CHAT_HUB_AGENT_PIN || "").trim();
  let aiMessage = await hubPostAgent({ visitorKey, body: replyText, pin });

  if (!aiMessage) {
    aiMessage = {
      id: `ai-${uuid()}`,
      thread_id: hubResult.thread_id || null,
      role: "agent",
      body: replyText,
      source: AI_SOURCE,
      created_at: new Date().toISOString(),
    };
  }

  return ok(201, {
    thread_id: hubResult.thread_id || null,
    message: visitorMessage,
    ai_message: aiMessage,
    human_takeover: false,
  });
}

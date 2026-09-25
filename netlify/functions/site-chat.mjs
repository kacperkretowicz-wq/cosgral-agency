import { SYSTEM_INSTRUCTION } from "./lib/knowledge.mjs";

const HUB_API = (
  process.env.COSGRAL_HUB_CHAT_API || "https://cosgralhub.netlify.app/api/site-chat"
).replace(/\/$/, "");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
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

function isHubAutoReply(m) {
  if (!m || m.role !== "agent") return false;
  if (isAiAgentMessage(m)) return false;
  const author = String(m.author || "").toLowerCase();
  if (author === "ai" || author === "bot" || author === "system" || author === "auto") {
    return true;
  }
  const source = String(m.source || "").toLowerCase();
  if (
    source === "ai" ||
    source === "bot" ||
    source === "system" ||
    source === "auto" ||
    source === "auto-reply"
  ) {
    return true;
  }
  const body = stripAiPrefix(String(m.body || "")).trim();
  return /^dzięk\w*\s+za\s+wiadomość/i.test(body);
}

function detectHumanTakeover(messages) {
  const list = Array.isArray(messages) ? messages : [];
  return list.some(function (m) {
    return m && m.role === "agent" && !isAiAgentMessage(m) && !isHubAutoReply(m);
  });
}

function nestedString(m, path) {
  let cur = m;
  for (const part of String(path).split(".")) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return "";
    cur = cur[part];
  }
  return typeof cur === "string" ? cur.trim() : "";
}

function firstNonEmpty(values) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const AGENT_ALIASES = {
  jakub: "Jakub",
  jakubgral: "Jakub",
  jakubczupajlo: "Jakub",
  kuba: "Jakub",
  kacper: "Kacper",
  kacperkretowicz: "Kacper",
};

function resolveAgentName(m) {
  if (isAiAgentMessage(m)) return "Cosgral AI";
  const raw = firstNonEmpty([
    m.agent_name,
    m.sender_name,
    m.author_name,
    m.display_name,
    m.user_name,
    m.username,
    m.login,
    m.handle,
    m.name,
    nestedString(m, "agent.name"),
    nestedString(m, "agent.display_name"),
    nestedString(m, "agent.username"),
    nestedString(m, "user.name"),
    nestedString(m, "user.display_name"),
    nestedString(m, "user.username"),
    nestedString(m, "sender.name"),
    nestedString(m, "author.name"),
    nestedString(m, "meta.agent_name"),
    nestedString(m, "meta.name"),
    nestedString(m, "meta.username"),
  ]);
  const email = firstNonEmpty([
    m.agent_email,
    m.user_email,
    m.email,
    nestedString(m, "agent.email"),
    nestedString(m, "user.email"),
    nestedString(m, "sender.email"),
    nestedString(m, "meta.email"),
  ]);
  const hay = (raw + " " + email).toLowerCase();
  for (const [needle, label] of Object.entries(AGENT_ALIASES)) {
    if (needle && hay.indexOf(needle) !== -1) return label;
  }
  if (raw) {
    const first = raw.split(/\s+/)[0] || raw;
    const key = first.toLowerCase();
    if (AGENT_ALIASES[key]) return AGENT_ALIASES[key];
    if (/^(jakub|kacper)$/i.test(first)) {
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    }
    return first;
  }
  return "Konsultant";
}

function enrichAgentMessage(m) {
  if (!m || m.role !== "agent") return m;
  if (isAiAgentMessage(m)) {
    return Object.assign({}, m, {
      body: stripAiPrefix(m.body),
      source: AI_SOURCE,
      agent_kind: "ai",
      agent_name: "Cosgral AI",
    });
  }
  return Object.assign({}, m, {
    agent_kind: "human",
    agent_name: resolveAgentName(m),
  });
}

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : []).filter(function (m) {
    return !(m && m.role === "agent" && isHubAutoReply(m));
  }).map(function (m) {
    if (!m) return m;
    if (m.role === "agent") return enrichAgentMessage(m);
    return m;
  });
}

function resolveActiveAgent(messages, takeover) {
  if (!takeover) return { kind: "ai", name: "Cosgral AI" };
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m && m.role === "agent" && m.agent_kind === "human") {
      return { kind: "human", name: String(m.agent_name || "Konsultant") };
    }
  }
  return { kind: "human", name: "Konsultant" };
}

function toGeminiContents(history, latestUser) {
  const contents = [];
  const hist = Array.isArray(history) ? history.slice(-12) : [];
  const latest = String(latestUser).slice(0, 2000);
  for (const m of hist) {
    if (!m || !m.body) continue;
    if (isHubAutoReply(m)) continue;
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

  const pageNote = pageUrl ? `\nKlient jest na stronie: ${String(pageUrl).slice(0, 400)}` : "";
  const contents = toGeminiContents(history, latestUser);
  const configs = [
    {
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 },
    },
    {
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  ];
  const models = Array.from(
    new Set([GEMINI_MODEL || "gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"]),
  );

  let lastErr = new Error("gemini_failed");
  for (const tryModel of models) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(tryModel)}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;
    for (const generationConfig of configs) {
      let res;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION + pageNote }],
            },
            contents,
            generationConfig,
          }),
        });
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error("gemini_network");
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error("gemini_failed");
        err.status = res.status;
        err.data = data;
        lastErr = err;
        if (res.status === 400 || res.status === 429 || res.status === 503 || res.status === 500) {
          continue;
        }
        break;
      }
      const parts =
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts
          ? data.candidates[0].content.parts
          : [];
      const text = parts
        .map(function (p) {
          if (!p || p.thought) return "";
          return p.text ? p.text : "";
        })
        .join("")
        .trim();
      if (text) return text.slice(0, 2200);
      lastErr = new Error("gemini_empty");
    }
  }
  throw lastErr;
}

function fallbackAiText() {
  return (
    "Jasne — ogarniam temat. Napisz proszę 1–2 zdania więcej: co dokładnie chcesz wdrożyć " +
    "(np. sklep, strona firmowa, CRM, SEO) i na kiedy. " +
    "Na tej podstawie Jakub lub Kacper dopną wycenę: +48 533 790 518 / +48 571 798 397."
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
      const rawMessages = Array.isArray(data.messages) ? data.messages : [];
      const messages = normalizeMessages(rawMessages);
      const takeover = detectHumanTakeover(rawMessages);
      return ok(200, {
        thread_id: data.thread_id || null,
        messages,
        human_takeover: takeover,
        active_agent: resolveActiveAgent(messages, takeover),
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
    const normalizedExisting = normalizeMessages(existing);
    const active = resolveActiveAgent(normalizedExisting, true);
    return ok(201, {
      thread_id: hubResult.thread_id || hubSnapshot.thread_id || null,
      message: visitorMessage,
      ai_message: null,
      human_takeover: true,
      active_agent: active,
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
      agent_kind: "ai",
      agent_name: "Cosgral AI",
      created_at: new Date().toISOString(),
    };
  } else {
    aiMessage = enrichAgentMessage(aiMessage);
  }

  return ok(201, {
    thread_id: hubResult.thread_id || null,
    message: visitorMessage,
    ai_message: aiMessage,
    human_takeover: false,
    active_agent: { kind: "ai", name: "Cosgral AI" },
  });
}

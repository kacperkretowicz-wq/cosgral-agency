(function () {
  "use strict";

  var API = (window.COSGRAL_CHAT_API || "/api/site-chat").replace(/\/$/, "");
  var HUB_FALLBACK = "https://cosgralhub.netlify.app/api/site-chat";
  var STORAGE_KEY = "cg_chat_visitor_key";
  var AI_STORAGE_PREFIX = "cg_chat_ai_msgs_";
  var POLL_MS = 4000;
  var AI_SOURCE = "cosgral-ai";

  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  var ICON_CHAT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v7.5A2.25 2.25 0 0 1 17.25 16.5H9.3L5.4 19.2a.6.6 0 0 1-.9-.52V6.75Z"/></svg>';

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function getVisitorKey() {
    try {
      var existing = localStorage.getItem(STORAGE_KEY);
      if (existing && existing.length >= 8) return existing;
      var next = uuid();
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    } catch (_) {
      return uuid();
    }
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  var visitorKey = getVisitorKey();
  var open = false;
  var knownIds = Object.create(null);
  var unread = 0;
  var sending = false;
  var closeTimer = null;
  var humanTakeover = false;
  var conversation = [];
  var typingEl = null;
  var activeHumanName = "";
  var takeoverNoticeShown = false;

  function isAiMessage(m) {
    if (!m) return false;
    if (m.source === AI_SOURCE || m.agent_kind === "ai") return true;
    if (String(m.id || "").indexOf("ai-") === 0) return true;
    return false;
  }

  function resolveClientAgentName(m) {
    if (isAiMessage(m)) return "Cosgral AI";
    var raw = String(
      m.agent_name ||
        m.sender_name ||
        m.author_name ||
        m.display_name ||
        m.user_name ||
        m.username ||
        m.login ||
        m.handle ||
        (m.agent && (m.agent.name || m.agent.display_name || m.agent.username)) ||
        (m.user && (m.user.name || m.user.display_name || m.user.username)) ||
        (m.meta && (m.meta.agent_name || m.meta.name || m.meta.username)) ||
        "",
    ).trim();
    var email = String(
      m.agent_email ||
        m.user_email ||
        m.email ||
        (m.user && m.user.email) ||
        (m.agent && m.agent.email) ||
        (m.meta && m.meta.email) ||
        "",
    ).toLowerCase();
    var hay = (raw + " " + email).toLowerCase();
    if (hay.indexOf("kacper") !== -1) return "Kacper";
    if (hay.indexOf("jakub") !== -1 || hay.indexOf("kuba") !== -1) return "Jakub";
    if (raw) return raw.split(/\s+/)[0];
    return activeHumanName || "Konsultant";
  }

  function setEyebrow() {
    if (humanTakeover) {
      var who = activeHumanName || "Zespół";
      eyebrow.textContent = who;
      statusDot.title = who + " online";
    } else {
      eyebrow.textContent = "Cosgral AI";
      statusDot.title = "Asystent online";
    }
  }

  function showTakeoverNotice(name) {
    if (takeoverNoticeShown) return;
    takeoverNoticeShown = true;
    if (empty.parentNode) empty.remove();
    var notice = el("div", "cg-chat-notice", {
      text: name + " dołączył do rozmowy",
    });
    msgs.appendChild(notice);
    scrollBottom();
  }

  function aiStorageKey() {
    return AI_STORAGE_PREFIX + visitorKey;
  }

  function loadLocalAi() {
    try {
      var raw = localStorage.getItem(aiStorageKey());
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalAi(msg) {
    if (!msg || !msg.id) return;
    try {
      var list = loadLocalAi();
      if (list.some(function (m) { return m.id === msg.id; })) return;
      list.push({
        id: msg.id,
        role: "agent",
        body: msg.body,
        source: AI_SOURCE,
        agent_kind: "ai",
        agent_name: "Cosgral AI",
        created_at: msg.created_at || new Date().toISOString(),
      });
      if (list.length > 40) list = list.slice(-40);
      localStorage.setItem(aiStorageKey(), JSON.stringify(list));
    } catch (_) {}
  }

  var root = el("div", "cg-chat-root");
  root.setAttribute("data-cg-chat", "1");

  var panel = el("div", "cg-chat-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Czat z Cosgral");
  panel.setAttribute("aria-hidden", "true");

  var head = el("div", "cg-chat-head");
  var brand = el("div", "cg-chat-head__brand");
  var eyebrow = el("div", "cg-chat-head__eyebrow", { text: "Live" });
  brand.appendChild(eyebrow);
  brand.appendChild(el("strong", null, { text: "Cosgral" }));
  head.appendChild(brand);
  var statusDot = el("div", "cg-chat-status", { title: "Online" });
  head.appendChild(statusDot);

  var msgs = el("div", "cg-chat-msgs");
  var empty = el("div", "cg-chat-empty");
  empty.appendChild(
    el("div", "cg-chat-empty__mark", {
      html: ICON_CHAT,
    }),
  );
  empty.appendChild(el("div", "cg-chat-empty__label", { text: "Napisz do nas" }));
  empty.appendChild(
    el("div", "cg-chat-empty__text", {
      text: "Opisz, czego szukasz — Cosgral AI doradzi i poprowadzi rozmowę, aż dołączy Jakub albo Kacper.",
    }),
  );
  msgs.appendChild(empty);

  var form = el("form", "cg-chat-form");
  var input = el("input", null, {
    type: "text",
    name: "message",
    autocomplete: "off",
    maxlength: "2000",
    placeholder: "Twoja wiadomość…",
    "aria-label": "Wiadomość",
  });
  var submit = el("button", null, { type: "submit", text: "Wyślij" });
  form.appendChild(input);
  form.appendChild(submit);

  panel.appendChild(head);
  panel.appendChild(msgs);
  panel.appendChild(form);

  var launcher = el("button", "cg-chat-launcher", {
    type: "button",
    "aria-expanded": "false",
    "aria-label": "Otwórz czat",
  });
  var stage = el("span", "cg-chat-launcher__stage");
  var cubeCanvas = el("canvas", "cg-chat-cube-canvas");
  cubeCanvas.setAttribute("data-cg-chat-cube", "1");
  cubeCanvas.setAttribute("aria-hidden", "true");
  var iconClose = el("span", "cg-chat-launcher__icon cg-chat-launcher__icon--close", {
    html: ICON_CLOSE,
  });
  stage.appendChild(cubeCanvas);
  stage.appendChild(iconClose);
  var label = el("span", "cg-chat-label", { text: "LIVE CZAT" });
  launcher.appendChild(stage);
  launcher.appendChild(label);
  var badge = el("span", "cg-chat-badge");
  badge.hidden = true;
  launcher.appendChild(badge);

  root.appendChild(panel);
  root.appendChild(launcher);

  function setOpen(next) {
    next = !!next;
    if (next === open) return;
    open = next;

    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    launcher.setAttribute("aria-label", open ? "Zamknij czat" : "Otwórz czat");
    panel.setAttribute("aria-hidden", open ? "false" : "true");

    if (open) {
      panel.classList.add("is-open");
      unread = 0;
      updateBadge();
      window.requestAnimationFrame(function () {
        input.focus();
        scrollBottom();
      });
      setPolling(true);
    } else {
      panel.classList.remove("is-open");
      setPolling(false);
    }
  }

  function updateBadge() {
    if (unread > 0 && !open) {
      badge.hidden = false;
      badge.textContent = String(unread > 9 ? "9+" : unread);
    } else {
      badge.hidden = true;
    }
  }

  function scrollBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }

  function remember(m) {
    if (!m || !m.body) return;
    conversation.push({
      role: m.role === "agent" ? "agent" : "visitor",
      body: m.body,
    });
    if (conversation.length > 24) conversation = conversation.slice(-24);
  }

  function renderMessage(m, opts) {
    if (!m || !m.id || knownIds[m.id]) return;
    knownIds[m.id] = 1;
    if (empty.parentNode) empty.remove();

    if (m.role === "agent") {
      var ai = isAiMessage(m);
      var name = resolveClientAgentName(m);
      var row = el(
        "div",
        "cg-chat-row cg-chat-row--agent " + (ai ? "cg-chat-row--ai" : "cg-chat-row--human"),
      );
      var meta = el("div", "cg-chat-row__meta");
      meta.appendChild(el("span", "cg-chat-row__name", { text: name }));
      if (ai) {
        meta.appendChild(el("span", "cg-chat-row__tag", { text: "AI" }));
      }
      var bubble = el("div", "cg-chat-bubble cg-chat-bubble--agent", { text: m.body });
      if (ai) bubble.setAttribute("data-cg-ai", "1");
      row.appendChild(meta);
      row.appendChild(bubble);
      msgs.appendChild(row);

      if (!ai) {
        activeHumanName = name;
        if (!humanTakeover) {
          humanTakeover = true;
          showTakeoverNotice(name);
          setEyebrow();
        } else if (!takeoverNoticeShown) {
          showTakeoverNotice(name);
        }
        setEyebrow();
      }
    } else {
      msgs.appendChild(
        el("div", "cg-chat-bubble cg-chat-bubble--visitor", { text: m.body }),
      );
    }

    if (!(opts && opts.silentRemember)) remember(m);
    if (m.role === "agent" && !open) {
      unread += 1;
      updateBadge();
    }
    scrollBottom();
  }

  function showTyping(on) {
    if (on) {
      if (typingEl) return;
      if (empty.parentNode) empty.remove();
      typingEl = el("div", "cg-chat-typing-wrap");
      typingEl.appendChild(
        el("div", "cg-chat-row__meta", {
          html: '<span class="cg-chat-row__name">Cosgral AI</span><span class="cg-chat-row__tag">AI</span>',
        }),
      );
      var dots = el("div", "cg-chat-typing", { "aria-label": "Cosgral AI pisze…" });
      dots.appendChild(el("span"));
      dots.appendChild(el("span"));
      dots.appendChild(el("span"));
      typingEl.appendChild(dots);
      msgs.appendChild(typingEl);
      scrollBottom();
    } else if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  function applyActiveAgent(agent) {
    if (!agent || typeof agent !== "object") return;
    if (agent.kind === "human") {
      humanTakeover = true;
      activeHumanName = String(agent.name || "Konsultant");
      showTakeoverNotice(activeHumanName);
      setEyebrow();
    }
  }

  function mergeAndRender(serverMessages) {
    var list = Array.isArray(serverMessages) ? serverMessages.slice() : [];
    var localAi = loadLocalAi();
    var hubIds = Object.create(null);
    list.forEach(function (m) {
      if (m && m.id) hubIds[m.id] = 1;
    });

    if (!humanTakeover) {
      localAi.forEach(function (m) {
        if (m && m.id && !hubIds[m.id]) list.push(m);
      });
    }

    list.sort(function (a, b) {
      var ta = a && a.created_at ? Date.parse(a.created_at) : 0;
      var tb = b && b.created_at ? Date.parse(b.created_at) : 0;
      return ta - tb;
    });

    list.forEach(function (m) {
      if (!m) return;
      renderMessage(m);
    });
  }

  function poll() {
    fetch(
      API + "?visitor_key=" + encodeURIComponent(visitorKey) + "&_=" + Date.now(),
      { cache: "no-store", credentials: "omit" },
    )
      .then(function (r) {
        if (!r.ok) throw new Error("poll failed");
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        if (data.human_takeover) {
          humanTakeover = true;
        }
        applyActiveAgent(data.active_agent);
        setEyebrow();
        mergeAndRender(data.messages);
      })
      .catch(function () {
        if (API !== HUB_FALLBACK) {
          fetch(
            HUB_FALLBACK +
              "?visitor_key=" +
              encodeURIComponent(visitorKey) +
              "&_=" +
              Date.now(),
            { cache: "no-store", credentials: "omit" },
          )
            .then(function (r) {
              return r.json();
            })
            .then(function (data) {
              if (data && Array.isArray(data.messages)) mergeAndRender(data.messages);
            })
            .catch(function () {});
        }
      });
  }

  function postChat(body) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timedOut = false;
    var timer = window.setTimeout(function () {
      timedOut = true;
      if (ctrl) ctrl.abort();
    }, 22000);

    return fetch(API, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        visitor_key: visitorKey,
        body: body,
        page_url: location.href.slice(0, 500),
        history: conversation.slice(-12),
      }),
    })
      .then(function (r) {
        return r
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { ok: r.ok, data: data || {}, status: r.status };
          });
      })
      .catch(function (err) {
        if (timedOut) {
          return { ok: false, data: {}, status: 408, timedOut: true };
        }
        throw err;
      })
      .finally(function () {
        window.clearTimeout(timer);
      });
  }

  function localFallbackAi() {
    return {
      id: "ai-local-" + uuid(),
      role: "agent",
      body:
        "Chwilę trwało — zespół Cosgral dostał Twoją wiadomość i wróci, jak będzie wolny. " +
        "Możesz też napisać na kontakt@cosgral.pl albo zadzwonić: Jakub +48 533 790 518.",
      source: AI_SOURCE,
      agent_kind: "ai",
      agent_name: "Cosgral AI",
      created_at: new Date().toISOString(),
    };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = (input.value || "").trim();
    if (!body || sending) return;
    sending = true;
    submit.disabled = true;
    input.value = "";

    var optimisticId = "local-" + uuid();
    renderMessage({
      id: optimisticId,
      role: "visitor",
      body: body,
      created_at: new Date().toISOString(),
    });
    var optimisticBubble = msgs.lastElementChild;

    if (!humanTakeover) showTyping(true);

    postChat(body)
      .then(function (res) {
        if (!res.ok) throw new Error(res.timedOut ? "timeout" : "send failed");

        if (res.data && res.data.human_takeover) {
          humanTakeover = true;
        }
        applyActiveAgent(res.data && res.data.active_agent);
        setEyebrow();

        if (res.data && res.data.message && res.data.message.id) {
          knownIds[res.data.message.id] = 1;
        }

        if (res.data && res.data.ai_message && res.data.ai_message.body) {
          saveLocalAi(res.data.ai_message);
          renderMessage(res.data.ai_message);
        } else if (!humanTakeover) {
          var fb = localFallbackAi();
          saveLocalAi(fb);
          renderMessage(fb);
        }
      })
      .catch(function (err) {
        if (err && err.message === "timeout" && !humanTakeover) {
          var fb = localFallbackAi();
          saveLocalAi(fb);
          renderMessage(fb);
          return;
        }
        input.value = body;
        delete knownIds[optimisticId];
        if (optimisticBubble && optimisticBubble.parentNode === msgs) {
          optimisticBubble.remove();
        }
        if (conversation.length && conversation[conversation.length - 1].body === body) {
          conversation.pop();
        }
      })
      .finally(function () {
        showTyping(false);
        sending = false;
        submit.disabled = false;
        input.focus();
      });
  });

  launcher.addEventListener("click", function () {
    setOpen(!open);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) setOpen(false);
  });

  document.documentElement.appendChild(root);
  setEyebrow();

  /* Visible only between hero end and contact/footer — slide+fade from bottom */
  function heroEl() {
    return (
      document.querySelector("#top.home-hero, .home-hero") ||
      document.querySelector(".portfolio-hero, .about-hero, .gallery-hero, .service-hero") ||
      document.querySelector("#main > header, #main > section")
    );
  }

  function hideEl() {
    return (
      document.querySelector("#kontakt, .home-contact") ||
      document.querySelector(".site-footer")
    );
  }

  function shouldShowChat() {
    var vh = window.innerHeight || 1;
    var hero = heroEl();
    var pastHero = true;
    if (hero) {
      pastHero = hero.getBoundingClientRect().bottom < vh * 0.28;
    } else {
      pastHero = window.scrollY > vh * 0.55;
    }

    var stop = hideEl();
    var beforeContact = true;
    if (stop) {
      beforeContact = stop.getBoundingClientRect().top > vh * 0.62;
    }

    return pastHero && beforeContact;
  }

  var chatVisible = false;
  var visRaf = 0;

  function applyChatVisibility(force) {
    var next = shouldShowChat();
    if (!force && next === chatVisible) return;
    chatVisible = next;
    root.classList.toggle("is-chat-visible", chatVisible);
    if (!chatVisible && open) setOpen(false);
  }

  function queueVisibility() {
    if (visRaf) return;
    visRaf = window.requestAnimationFrame(function () {
      visRaf = 0;
      applyChatVisibility(false);
    });
  }

  window.addEventListener("scroll", queueVisibility, { passive: true });
  window.addEventListener("resize", queueVisibility, { passive: true });
  applyChatVisibility(true);
  window.setTimeout(function () {
    applyChatVisibility(true);
  }, 120);

  loadLocalAi().forEach(function (m) {
    renderMessage(m);
  });

  var pollTimer = null;
  function setPolling(on) {
    if (on) {
      if (pollTimer) return;
      poll();
      pollTimer = window.setInterval(poll, POLL_MS);
    } else if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  window.CosgralChat = {
    open: function () {
      setOpen(true);
    },
    close: function () {
      setOpen(false);
    },
  };
})();

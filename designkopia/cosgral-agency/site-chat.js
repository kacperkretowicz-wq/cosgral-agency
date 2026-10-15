(function () {
  "use strict";

  var API =
    (window.COSGRAL_CHAT_API || "https://cosgralhub.netlify.app/api/site-chat").replace(
      /\/$/,
      "",
    );
  var STORAGE_KEY = "cg_chat_visitor_key";
  var POLL_MS = 1800;

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
  var pollInFlight = false;

  var root = el("div", "cg-chat-root");
  root.setAttribute("data-cg-chat", "1");

  var panel = el("div", "cg-chat-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Czat z Cosgral");
  panel.setAttribute("aria-hidden", "true");

  var head = el("div", "cg-chat-head");
  var brand = el("div", "cg-chat-head__brand");
  brand.appendChild(el("div", "cg-chat-head__eyebrow", { text: "Live" }));
  brand.appendChild(el("strong", null, { text: "Cosgral" }));
  head.appendChild(brand);
  head.appendChild(el("div", "cg-chat-status", { title: "Online" }));

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
      text: "Powiedz, czego potrzebujesz — odpiszemy jak najszybciej.",
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
      poll();
    } else {
      panel.classList.remove("is-open");
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

  function renderMessage(m) {
    if (knownIds[m.id]) return;
    knownIds[m.id] = 1;
    if (empty.parentNode) empty.remove();
    var bubble = el(
      "div",
      "cg-chat-bubble cg-chat-bubble--" + (m.role === "agent" ? "agent" : "visitor"),
      { text: m.body },
    );
    msgs.appendChild(bubble);
    if (m.role === "agent" && !open) {
      unread += 1;
      updateBadge();
    }
    scrollBottom();
  }

  function poll() {
    if (document.hidden || pollInFlight) return;
    pollInFlight = true;
    fetch(
      API + "?visitor_key=" + encodeURIComponent(visitorKey) + "&_=" + Date.now(),
      { cache: "no-store", credentials: "omit" },
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.messages)) return;
        data.messages.forEach(renderMessage);
      })
      .catch(function () {})
      .finally(function () {
        pollInFlight = false;
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = (input.value || "").trim();
    if (!body || sending) return;
    sending = true;
    submit.disabled = true;
    fetch(API, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_key: visitorKey,
        body: body,
        page_url: location.href.slice(0, 500),
      }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error("send failed");
        input.value = "";
        if (res.data && res.data.message) renderMessage(res.data.message);
        else poll();
      })
      .catch(function () {
        input.value = body;
      })
      .finally(function () {
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

  poll();
  window.setInterval(poll, POLL_MS);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) poll();
  });

  window.CosgralChat = {
    open: function () {
      setOpen(true);
    },
    close: function () {
      setOpen(false);
    },
  };
})();

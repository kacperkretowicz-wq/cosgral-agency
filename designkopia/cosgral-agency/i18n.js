/**
 * COSGRAL V4 — PL/EN i18n (copy.json + data-i18n).
 */
(function () {
  "use strict";

  var STORAGE_KEY = "cosgral-lang";
  var copy = null;
  var lang = "pl";
  try { lang = localStorage.getItem(STORAGE_KEY) || "pl"; } catch (_) {}

  function copyJsonUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("i18n.js") !== -1) {
        return src.replace(/i18n\.js(\?.*)?$/, "i18n/copy.json$1");
      }
    }
    return "i18n/copy.json";
  }

  function get(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== "object") return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function t(key) {
    if (!copy) return null;
    var node = get(copy, key);
    if (!node) return null;
    return node[lang] || node.pl || null;
  }

  function applyLang(next) {
    lang = next === "en" ? "en" : "pl";
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    var layoutChanged = document.documentElement.lang !== lang;
    if (layoutChanged) document.documentElement.lang = lang;

    var metaKey = document.documentElement.getAttribute("data-i18n-meta") || "meta";
    if (copy && get(copy, metaKey)) {
      document.title = t(metaKey + ".title");
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", t(metaKey + ".description"));
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", t(metaKey + ".title"));
      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", t(metaKey + ".description"));
      var twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute("content", t(metaKey + ".title"));
      var twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute("content", t(metaKey + ".description"));
    }

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var val = t(key);
      if (val == null) return;
      if (el.hasAttribute("data-i18n-placeholder")) {
        if (el.placeholder !== val) el.placeholder = val;
      } else if (el.hasAttribute("data-i18n-html")) {
        if (el.innerHTML !== val) { el.innerHTML = val; layoutChanged = true; }
      } else if (el.hasAttribute("data-reveal-words")) {
        if (el.textContent !== val) {
          el.textContent = val; layoutChanged = true;
          delete el.dataset.wordsReady;
          if (window.cosgralRevealWords) window.cosgralRevealWords.build(el);
        }
      } else {
        if (el.textContent !== val) { el.textContent = val; layoutChanged = true; }
      }
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var ariaVal = t(el.getAttribute("data-i18n-aria-label"));
      if (ariaVal != null && el.getAttribute("aria-label") !== ariaVal) el.setAttribute("aria-label", ariaVal);
    });

    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var titleVal = t(el.getAttribute("data-i18n-title"));
      if (titleVal != null && el.getAttribute("title") !== titleVal) el.setAttribute("title", titleVal);
    });

    document.querySelectorAll("[data-i18n-lang-btn]").forEach(function (btn) {
      var btnLang = btn.getAttribute("data-i18n-lang-btn");
      btn.classList.toggle("is-active", btnLang === lang);
      var pressed = btnLang === lang ? "true" : "false";
      if (btn.getAttribute("aria-pressed") !== pressed) btn.setAttribute("aria-pressed", pressed);
    });

    window.dispatchEvent(new CustomEvent("cosgral:langchange", { detail: { lang: lang, layoutChanged: layoutChanged } }));
  }

  function bindSwitcher() {
    document.querySelectorAll("[data-i18n-lang-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLang(btn.getAttribute("data-i18n-lang-btn"));
      });
    });
  }

  fetch(copyJsonUrl())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      copy = data;
      bindSwitcher();
      applyLang(lang);
      window.dispatchEvent(new CustomEvent("cosgral:i18n-ready", { detail: { lang: lang } }));
    })
    .catch(function () {
      bindSwitcher();
      document.documentElement.lang = lang;
    });

  window.cosgralI18n = { t: t, getLang: function () { return lang; }, applyLang: applyLang };
})();

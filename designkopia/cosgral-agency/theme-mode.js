/**
 * Dark / light mode — domyślnie ciemny, przełącznik w nawigacji.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "cosgral-theme";
  var root = document.documentElement;

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStored(theme) {
    try {
      if (theme === "light") localStorage.setItem(STORAGE_KEY, "light");
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function themeLabel(isLight) {
    return (
      (window.cosgralI18n && window.cosgralI18n.t(isLight ? "theme.light" : "theme.dark")) ||
      (isLight ? "Tryb jasny" : "Tryb ciemny")
    );
  }

  function applyTheme(theme, persist) {
    var isLight = theme === "light";
    if (isLight) root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isLight ? "#f5f5f0" : "#050505");

    if (persist) setStored(isLight ? "light" : "dark");

    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) {
      btn.setAttribute("aria-pressed", isLight ? "true" : "false");
      btn.setAttribute("aria-label", themeLabel(isLight));
    }

    window.dispatchEvent(
      new CustomEvent("cosgral:themechange", { detail: { theme: isLight ? "light" : "dark" } })
    );
  }

  function toggleTheme() {
    applyTheme(currentTheme() === "light" ? "dark" : "light", true);
  }

  function ensureToggle() {
    var actions = document.querySelector(".site-nav__actions");
    if (!actions) return null;

    var btn = actions.querySelector("[data-theme-toggle]");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-switch";
    btn.setAttribute("data-theme-toggle", "");
    btn.setAttribute("data-no-transition", "");
    btn.innerHTML =
      '<span class="theme-switch__track" aria-hidden="true">' +
      '<span class="theme-switch__thumb"></span>' +
      "</span>" +
      '<span class="theme-switch__label" data-i18n="theme.toggle">Motyw</span>';

    var lang = actions.querySelector(".lang-switch");
    if (lang) actions.insertBefore(btn, lang);
    else actions.insertBefore(btn, actions.firstChild);

    return btn;
  }

  function bindToggle() {
    var btn = ensureToggle();
    if (!btn || btn.dataset.themeBound === "1") return;
    btn.dataset.themeBound = "1";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleTheme();
    });
  }

  function boot() {
    var stored = getStored();
    if (stored === "light") applyTheme("light", false);
    bindToggle();
  }

  window.cosgralTheme = {
    get: currentTheme,
    set: function (theme) {
      applyTheme(theme, true);
    },
    toggle: toggleTheme,
  };

  window.addEventListener("cosgral:langchange", function () {
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    btn.setAttribute("aria-label", themeLabel(currentTheme() === "light"));
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

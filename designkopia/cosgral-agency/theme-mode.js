/**
 * Motyw — tylko dark. Przełącznik light/dark usunięty.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "cosgral-theme";
  var root = document.documentElement;

  function forceDark() {
    root.removeAttribute("data-theme");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#050505");

    document.querySelectorAll("[data-theme-toggle], .theme-switch").forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  window.cosgralTheme = {
    get: function () {
      return "dark";
    },
    set: function () {
      forceDark();
    },
    toggle: function () {
      forceDark();
    },
  };

  forceDark();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", forceDark);
  }
})();

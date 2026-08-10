/**
 * Kolory, filmiki i motywy dla podstron usług + kafelków na homepage.
 */
(function () {
  "use strict";

  var THEMES = {
    blue: {
      bg: "#061018",
      accent: "#1e3f72",
      highlight: "#5a8fd4",
      ripple: "rgba(90, 143, 212, 0.55)",
      video: "../assets/stock/hero-abstract.mp4",
      videoHome: "assets/stock/hero-abstract.mp4",
    },
    purple: {
      bg: "#0c0816",
      accent: "#4a2f78",
      highlight: "#9b6fd4",
      ripple: "rgba(155, 111, 212, 0.5)",
      video: "../assets/services/aplikacje.mp4",
      videoHome: "assets/services/aplikacje.mp4",
    },
    gold: {
      bg: "#121008",
      accent: "#6b5520",
      highlight: "#c9a84a",
      ripple: "rgba(201, 168, 74, 0.45)",
      video: "../assets/services/pozycjonowanie-seo.mp4",
      videoHome: "assets/services/pozycjonowanie-seo.mp4",
    },
    orange: {
      bg: "#120c08",
      accent: "#7a4018",
      highlight: "#d47a3a",
      ripple: "rgba(212, 122, 58, 0.48)",
      video: "../assets/services/automatyzacje.mp4",
      videoHome: "assets/services/automatyzacje.mp4",
    },
    crimson: {
      bg: "#100608",
      accent: "#6e1e32",
      highlight: "#c44a62",
      ripple: "rgba(196, 74, 98, 0.48)",
      video: "../assets/services/crm.mp4",
      videoHome: "assets/services/crm.mp4",
    },
    green: {
      bg: "#061210",
      accent: "#1a4f42",
      highlight: "#4aaf8c",
      ripple: "rgba(74, 175, 140, 0.45)",
      video: "../assets/services/grafika-montaz.mp4",
      videoHome: "assets/services/grafika-montaz.mp4",
    },
  };

  var PATH_MAP = [
    { match: "tworzenie-stron-internetowych", theme: "blue" },
    { match: "projektowanie-aplikacji", theme: "purple" },
    { match: "pozycjonowanie-seo-geo", theme: "gold" },
    { match: "wdrazanie-automatyzacji", theme: "orange" },
    { match: "systemy-crm", theme: "crimson" },
    { match: "grafika-i-montaz-wideo", theme: "green" },
  ];

  function themeFromHref(href) {
    if (!href) return null;
    for (var i = 0; i < PATH_MAP.length; i++) {
      if (href.indexOf(PATH_MAP[i].match) !== -1) return PATH_MAP[i].theme;
    }
    return null;
  }

  function applyToBody(themeId) {
    var theme = THEMES[themeId];
    if (!theme || !document.body) return;
    document.body.setAttribute("data-service-theme", themeId);
    document.documentElement.style.setProperty("--service-bg", theme.bg);
    document.documentElement.style.setProperty("--service-accent", theme.accent);
    document.documentElement.style.setProperty("--service-highlight", theme.highlight);
    document.documentElement.style.setProperty("--service-ripple", theme.ripple);

    var video = document.querySelector(".service-page-video__media");
    if (video && theme.video && !video.getAttribute("src")) {
      video.setAttribute("src", theme.video);
    }
  }

  function boot() {
    var id = document.body && document.body.getAttribute("data-service-theme");
    if (id) applyToBody(id);
  }

  var early = document.body && document.body.getAttribute("data-service-theme");
  if (early) applyToBody(early);
  else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.cosgralServiceThemes = {
    themes: THEMES,
    fromHref: themeFromHref,
    apply: applyToBody,
  };
})();

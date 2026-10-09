/**
 * COSGRAL — Cookie Consent Banner
 * GDPR/RODO compliant. Vanilla JS, no deps.
 * Stores choice in localStorage under "cosgral-cookies".
 * Values: "all" | "necessary" | null (no choice yet)
 */
(function () {
  "use strict";

  var STORAGE_KEY = "cosgral-cookies";
  var BANNER_ID   = "cookie-banner";

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setChoice(val) {
    try { localStorage.setItem(STORAGE_KEY, val); } catch (e) {}
  }

  /* Resolve the privacy-policy URL relative to current page depth */
  function privacyUrl() {
    var depth = (location.pathname.match(/\//g) || []).length - 1;
    var prefix = depth > 0 ? "../" : "";
    return prefix + "privacy-policy.html";
  }

  function t(pl, en) {
    var lang = "pl";
    try { lang = localStorage.getItem("cosgral-lang") || "pl"; } catch (e) {}
    return lang === "en" ? en : pl;
  }

  function removeBanner() {
    var el = document.getElementById(BANNER_ID);
    if (el) el.remove();
  }

  function buildBanner() {
    var banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-label", t("Zgoda na pliki cookies", "Cookie consent"));

    var text = document.createElement("p");
    text.className = "cookie-banner__text";
    text.setAttribute("data-i18n", "cookie.banner_text");
    text.textContent = t(
      "Używamy plików cookies — niezbędnych do działania strony oraz, za Twoją zgodą, analitycznych i marketingowych.",
      "We use cookies — essential for the site to work and, with your consent, analytics and marketing cookies."
    );

    var link = document.createElement("a");
    link.className = "cookie-banner__link";
    link.href = privacyUrl();
    link.setAttribute("data-i18n", "cookie.policy_link");
    link.setAttribute("data-no-transition", "");
    link.textContent = t("Polityka prywatności", "Privacy policy");

    var actions = document.createElement("div");
    actions.className = "cookie-banner__actions";

    var btnAll = document.createElement("button");
    btnAll.type = "button";
    btnAll.className = "cookie-banner__btn cookie-banner__btn--accept";
    btnAll.setAttribute("data-i18n", "cookie.accept");
    btnAll.textContent = t("Zaakceptuj wszystkie", "Accept all");
    btnAll.addEventListener("click", function () {
      setChoice("all");
      removeBanner();
      window.dispatchEvent(new CustomEvent("cosgral:cookies-accepted", { detail: { level: "all" } }));
    });

    var btnNec = document.createElement("button");
    btnNec.type = "button";
    btnNec.className = "cookie-banner__btn cookie-banner__btn--reject";
    btnNec.setAttribute("data-i18n", "cookie.reject");
    btnNec.textContent = t("Tylko niezbędne", "Only necessary");
    btnNec.addEventListener("click", function () {
      setChoice("necessary");
      removeBanner();
      window.dispatchEvent(new CustomEvent("cosgral:cookies-accepted", { detail: { level: "necessary" } }));
    });

    actions.appendChild(btnAll);
    actions.appendChild(btnNec);
    actions.appendChild(link);
    banner.appendChild(text);
    banner.appendChild(actions);

    document.body.appendChild(banner);

    /* Update labels when i18n is ready */
    window.addEventListener("cosgral:langchange", function () {
      var keys = [
        [text,   "cookie.banner_text"],
        [link,   "cookie.policy_link"],
        [btnAll, "cookie.accept"],
        [btnNec, "cookie.reject"]
      ];
      keys.forEach(function (pair) {
        if (window.cosgralI18n && window.cosgralI18n.t) {
          var val = window.cosgralI18n.t(pair[1]);
          if (val) pair[0].textContent = val;
        }
      });
    });
  }

  function init() {
    if (getChoice() !== null) return; /* already decided */
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", buildBanner);
    } else {
      buildBanner();
    }
  }

  /* Public API */
  window.cosgralCookies = {
    getChoice: getChoice,
    hasConsent: function (level) {
      var c = getChoice();
      if (level === "all") return c === "all";
      return c === "all" || c === "necessary";
    }
  };

  init();
})();

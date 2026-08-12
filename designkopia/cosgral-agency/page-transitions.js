/**
 * Global page transitions — curtain wipe + cube mark (all internal pages).
 */
(function () {
  "use strict";

  var REDUCED =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SESSION_KEY = "cosgral-page-transition";
  var HASH_KEY = "cosgral-scroll-target";
  var SERVICE_KEY = "cosgral-service-open";
  var EXIT_MS = 680;
  var REVEAL_MS = 780;
  var navigating = false;

  function siteRoot() {
    var path = window.location.pathname || "";
    return path.indexOf("/uslugi/") !== -1 ? "../" : "";
  }

  function serviceThemeFromHref(href) {
    if (!href) return null;
    try {
      var parsed = new URL(href, window.location.href);
      var fromQuery = parsed.searchParams.get("service");
      if (fromQuery) return fromQuery;
    } catch (e) {}
    if (href.indexOf("uslugi/") === -1) return null;
    var match = href.match(/uslugi\/([^/?#]+)/);
    if (!match) return null;
    var slug = match[1].replace(/\.html$/, "");
    if (window.cosgralServicePanel?.themeFromSlug) {
      return window.cosgralServicePanel.themeFromSlug(slug);
    }
    var map = {
      "tworzenie-stron-internetowych": "blue",
      "projektowanie-aplikacji": "purple",
      "pozycjonowanie-seo-geo": "gold",
      "wdrazanie-automatyzacji": "orange",
      "systemy-crm": "crimson",
      "grafika-i-montaz-wideo": "green",
    };
    return map[slug] || null;
  }

  function serviceHomeUrl(themeId) {
    return siteRoot() + "index.html?service=" + themeId;
  }

  function navigateToService(themeId) {
    if (navigating || REDUCED) {
      window.location.href = serviceHomeUrl(themeId);
      return;
    }

    navigating = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    sessionStorage.setItem(SERVICE_KEY, themeId);
    sessionStorage.removeItem(HASH_KEY);

    playExit();
    window.setTimeout(function () {
      window.location.href = serviceHomeUrl(themeId);
    }, EXIT_MS);
  }

  function logoSrc() {
    return siteRoot() + "images/cosgral-agency/brand/cosgral-logo-cube-transparent.png";
  }

  function normalizePath(pathname) {
    var p = pathname || "/";
    if (p.endsWith("/index.html")) p = p.slice(0, -"/index.html".length) || "/";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }

  function isHomePath(pathname) {
    var p = normalizePath(pathname);
    return p === "/" || p.endsWith("/index.html");
  }

  function forceHomeStart() {
    if (!isHomePath(window.location.pathname)) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (window.cosgralSmoothScroll?.lenis) {
      window.cosgralSmoothScroll.lenis.scrollTo(0, { immediate: true });
    }
    if (window.cosgralSectionSnap?.goTo) {
      window.cosgralSectionSnap.goTo(0, 0, true);
    }
  }

  function ensureOverlay() {
    var el = document.getElementById("page-transition");
    if (el) return el;

    el = document.createElement("div");
    el.id = "page-transition";
    el.className = "page-transition";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="page-transition__veil" aria-hidden="true"></div>' +
      '<div class="page-transition__panel page-transition__panel--top" aria-hidden="true"></div>' +
      '<div class="page-transition__panel page-transition__panel--bottom" aria-hidden="true"></div>' +
      '<div class="page-transition__mark" aria-hidden="true">' +
      '<img src="' +
      logoSrc() +
      '" alt="" width="54" height="54" decoding="async" />' +
      "</div>";

    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function lockScroll(on) {
    document.documentElement.classList.toggle("is-page-transitioning", !!on);
  }

  function playExit() {
    var overlay = ensureOverlay();
    overlay.classList.add("is-active");
    lockScroll(true);
    requestAnimationFrame(function () {
      overlay.classList.add("is-covering");
    });
  }

  function playEnter() {
    if (window.cosgralServiceDive && window.cosgralServiceDive.playEnter()) return;

    if (!sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.removeItem(SESSION_KEY);

    var overlay = ensureOverlay();
    overlay.classList.add("is-active", "is-covering");
    lockScroll(true);
    document.documentElement.classList.remove("is-page-enter");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("is-revealing");
        window.setTimeout(function () {
          overlay.classList.remove("is-active", "is-covering", "is-revealing");
          lockScroll(false);
          scrollToStoredHash();
        }, REVEAL_MS);
      });
    });
  }

  function scrollToStoredHash() {
    if (sessionStorage.getItem(SERVICE_KEY)) return;
    if (new URLSearchParams(window.location.search).get("service")) return;

    var hash = sessionStorage.getItem(HASH_KEY);
    sessionStorage.removeItem(HASH_KEY);
    if (!hash) return;

    if (isHomePath(window.location.pathname)) {
      forceHomeStart();
      return;
    }

    window.setTimeout(function () {
      var id = hash.replace(/^#/, "");
      var homeSections = ["top", "uslugi", "realizacje", "proces", "faq", "kontakt"];
      var homeIdx = homeSections.indexOf(id);

      if (homeIdx >= 0 && window.cosgralSectionSnap) {
        if (window.cosgralSectionSnap.jumpTo) window.cosgralSectionSnap.jumpTo(homeIdx);
        else if (window.cosgralSectionSnap.goTo) window.cosgralSectionSnap.goTo(homeIdx);
        return;
      }

      var el = document.querySelector(hash);
      if (!el) return;

      var headerOffset = window.matchMedia("(max-width: 900px)").matches ? 72 : 96;
      var y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });

      if (window.cosgralSmoothScroll?.scrollTo) {
        window.cosgralSmoothScroll.scrollTo(y, { immediate: true });
      }

      if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
      window.dispatchEvent(new CustomEvent("cosgral:page-hash-scroll", { detail: { hash: hash } }));
    }, 360);
  }

  function shouldHandleLink(anchor) {
    if (!anchor || anchor.tagName !== "A") return false;
    if (anchor.hasAttribute("data-no-transition")) return false;
    if (anchor.target === "_blank") return false;
    if (anchor.hasAttribute("download")) return false;

    var href = anchor.getAttribute("href");
    if (!href || href === "#") return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return false;
    }

    var url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (e) {
      return false;
    }

    if (url.origin !== window.location.origin) return false;

    var samePath = normalizePath(url.pathname) === normalizePath(window.location.pathname);
    if (samePath && url.hash && !url.search) return false;
    if (samePath && !url.hash && !url.search) return false;

    if (
      anchor.classList.contains("services-fan__card") &&
      anchor.classList.contains("is-active") &&
      href.indexOf("uslugi/") !== -1
    ) {
      return false;
    }

    return true;
  }

  function navigateTo(url) {
    if (navigating || REDUCED) {
      window.location.href = url;
      return;
    }

    navigating = true;
    sessionStorage.setItem(SESSION_KEY, "1");

    try {
      var parsed = new URL(url, window.location.href);
      var service = parsed.searchParams.get("service");
      var homeDest = isHomePath(parsed.pathname);
      if (service) {
        sessionStorage.setItem(SERVICE_KEY, service);
        sessionStorage.removeItem(HASH_KEY);
      } else if (parsed.hash && !homeDest) {
        sessionStorage.setItem(HASH_KEY, parsed.hash);
      } else {
        sessionStorage.removeItem(HASH_KEY);
      }
    } catch (e) {
      sessionStorage.removeItem(HASH_KEY);
    }

    playExit();
    window.setTimeout(function () {
      window.location.href = url;
    }, EXIT_MS);
  }

  function bindLinks() {
    document.addEventListener(
      "click",
      function (e) {
        if (navigating || REDUCED) return;

        var anchor = e.target.closest("a[href]");
        if (!anchor) return;

        var serviceTheme = serviceThemeFromHref(anchor.getAttribute("href") || anchor.href);
        if (serviceTheme) {
          e.preventDefault();
          e.stopPropagation();
          navigateToService(serviceTheme);
          return;
        }

        if (!shouldHandleLink(anchor)) return;

        e.preventDefault();
        e.stopPropagation();
        navigateTo(anchor.href);
      },
      true
    );
  }

  window.cosgralPageTransition = {
    navigate: navigateTo,
    shouldHandle: shouldHandleLink,
  };

  if (REDUCED) return;

  if (document.body) {
    bindLinks();
    playEnter();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      bindLinks();
      playEnter();
    });
  }
})();

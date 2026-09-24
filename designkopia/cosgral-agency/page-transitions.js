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
  var SERVICE_PAGES = {
    blue: "tworzenie-stron-internetowych.html",
    purple: "projektowanie-aplikacji.html",
    gold: "pozycjonowanie-seo-geo.html",
    orange: "wdrazanie-automatyzacji.html",
    crimson: "systemy-crm.html",
    green: "grafika-i-montaz-wideo.html",
  };
  var EXIT_MS = 360;
  var REVEAL_MS = 500;
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

  function serviceThemeFromAnchor(anchor) {
    if (!anchor) return null;
    var fromAttr = anchor.getAttribute("data-open-service");
    if (fromAttr) return fromAttr;
    return serviceThemeFromHref(anchor.getAttribute("href") || anchor.href);
  }

  function isHomePage() {
    return isHomePath(window.location.pathname) && document.body.classList.contains("home-page");
  }

  function serviceHomeUrl(themeId) {
    return siteRoot() + "uslugi/" + (SERVICE_PAGES[themeId] || SERVICE_PAGES.blue);
  }

  function navigateToService(themeId) {
    if (!SERVICE_PAGES[themeId]) return;
    navigateTo(serviceHomeUrl(themeId));
  }

  function logoSrc() {
    /* 192 px = 4× DPR przy 48 px; oryginał 679×1024 (80 KB) zostaje dla większych użyć */
    return siteRoot() + "images/cosgral-agency/brand/cosgral-logo-cube-192.png";
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

  function resetFreshSubpageScroll() {
    if (isHomePath(window.location.pathname) || window.location.hash) return;
    var entry = performance.getEntriesByType?.("navigation")?.[0];
    if (entry && (entry.type === "reload" || entry.type === "back_forward")) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    requestAnimationFrame(function () {
      window.scrollTo(0, 0);
      window.cosgralSmoothScroll?.lenis?.scrollTo?.(0, { immediate: true });
    });
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

  function revealTransition(done) {
    var overlay = ensureOverlay();
    overlay.classList.add("is-active", "is-covering");
    lockScroll(true);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("is-revealing");
        window.setTimeout(function () {
          overlay.classList.remove("is-active", "is-covering", "is-revealing");
          lockScroll(false);
          if (typeof done === "function") done();
        }, REVEAL_MS);
      });
    });
  }

  function clearEnterLock() {
    document.documentElement.classList.remove("is-page-enter");
    var overlay = document.getElementById("page-transition");
    if (overlay && !overlay.classList.contains("is-active")) {
      overlay.classList.remove("is-covering", "is-revealing");
    }
  }

  function playEnter() {
    resetFreshSubpageScroll();
    if (window.cosgralServiceDive && window.cosgralServiceDive.playEnter()) {
      clearEnterLock();
      return;
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      clearEnterLock();
      return;
    }
    sessionStorage.removeItem(SESSION_KEY);
    clearEnterLock();
    revealTransition(scrollToStoredHash);
  }

  /* Safety: never leave a click-blocking enter veil */
  window.setTimeout(clearEnterLock, REVEAL_MS + 400);

  function scrollToStoredHash() {
    if (new URLSearchParams(window.location.search).get("service")) return;

    var hash = sessionStorage.getItem(HASH_KEY);
    sessionStorage.removeItem(HASH_KEY);
    if (!hash) return;

    if (isHomePath(window.location.pathname)) {
      // The home stepper reads location.hash; native anchors cover reduced motion.
      if (!window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search + hash);
      }
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
      if (id === "grafiki" && window.ScrollTrigger) {
        var graphicsPin = ScrollTrigger.getById("grafiki-pin");
        if (graphicsPin) y = graphicsPin.start + (graphicsPin.end - graphicsPin.start) * 0.82;
      }
      window.scrollTo({ top: Math.max(0, y), behavior: "auto" });

      if (window.cosgralSmoothScroll?.scrollTo) {
        window.cosgralSmoothScroll.scrollTo(y, { immediate: true });
      }

      if (window.cosgralPortfolioRail?.refresh) window.cosgralPortfolioRail.refresh();
      window.dispatchEvent(new CustomEvent("cosgral:page-hash-scroll", { detail: { hash: hash } }));
    }, 0);
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
      var homeDest = isHomePath(parsed.pathname);
      if (parsed.hash && !homeDest) {
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
        if (anchor.classList.contains("services-fan__card") && !anchor.classList.contains("is-active")) return;
        if (anchor.hasAttribute("data-nav-services-sub")) return;
        if (anchor.hasAttribute("data-nav-services-toggle")) return;

        var serviceTheme = serviceThemeFromAnchor(anchor);
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
    navigateService: navigateToService,
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

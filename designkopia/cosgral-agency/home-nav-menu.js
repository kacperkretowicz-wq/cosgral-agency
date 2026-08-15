/**
 * Menu hamburger — animacja overlay + sześcian z linkami na ścianie.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var nav = document.getElementById("site-nav");
  var toggle = document.getElementById("nav-toggle");
  var overlay = document.getElementById("nav-overlay");
  if (!nav || !toggle || !overlay) return;

  var links = overlay.querySelectorAll(".nav-overlay__list a");
  var stage = overlay.querySelector(".nav-overlay__stage");
  var backdrop = overlay.querySelector("[data-nav-backdrop], .nav-overlay__backdrop");
  var isOpen = false;
  var servicesExpanded = false;
  var menuTargetOpen = false;
  var menuDriveToken = 0;
  var syncRaf = null;
  var servicesLink = null;
  var servicesItem = null;
  var servicesSublist = null;
  var subLinks = [];

  var SERVICE_ITEMS = [
    { theme: "blue", i18n: "services.card1" },
    { theme: "purple", i18n: "services.card2" },
    { theme: "gold", i18n: "services.card3" },
    { theme: "orange", i18n: "services.card4" },
    { theme: "crimson", i18n: "services.card5" },
    { theme: "green", i18n: "services.card6" },
  ];

  function siteRoot() {
    var path = window.location.pathname || "";
    return path.indexOf("/uslugi/") !== -1 ? "../" : "";
  }

  function serviceHref(theme) {
    if (document.body.classList.contains("home-page")) return "?service=" + theme;
    return siteRoot() + "index.html?service=" + theme;
  }

  function findServicesLink() {
    return Array.from(overlay.querySelectorAll(".nav-overlay__list a")).find(function (a) {
      if (a.getAttribute("data-i18n") === "nav.services") return true;
      if (a.hasAttribute("data-nav-services-toggle")) return true;
      var href = a.getAttribute("href") || "";
      return href === "#uslugi" || /#uslugi(?:$|[?#])/.test(href);
    });
  }

  function setupServicesSubmenu() {
    servicesLink = findServicesLink();
    if (!servicesLink) return;

    servicesItem = servicesLink.closest("li");
    if (!servicesItem) return;

    servicesItem.classList.add("nav-overlay__item--services");
    servicesLink.setAttribute("data-nav-services-toggle", "");
    servicesLink.setAttribute("data-no-transition", "");
    servicesLink.setAttribute("aria-haspopup", "true");
    servicesLink.setAttribute("aria-expanded", "false");

    servicesSublist = document.createElement("ul");
    servicesSublist.className = "nav-overlay__sublist";
    servicesSublist.setAttribute("aria-hidden", "true");

    SERVICE_ITEMS.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = serviceHref(item.theme);
      a.setAttribute("data-service-theme", item.theme);
      a.setAttribute("data-i18n", item.i18n);
      a.setAttribute("data-nav-services-sub", "");
      li.appendChild(a);
      servicesSublist.appendChild(li);
      subLinks.push(a);
    });

    servicesItem.appendChild(servicesSublist);
    refreshServiceSubLabels();
  }

  function refreshServiceSubLabels() {
    subLinks.forEach(function (a) {
      var key = a.getAttribute("data-i18n");
      var text = key && window.cosgralI18n?.t ? window.cosgralI18n.t(key) : a.textContent;
      a.textContent = text;
      a.href = serviceHref(a.getAttribute("data-service-theme"));
    });
  }

  function refreshMainNavLinks() {
    links = overlay.querySelectorAll(
      ".nav-overlay__list > li:not(.nav-overlay__item--services) > a, .nav-overlay__item--services > a[data-nav-services-toggle]"
    );
  }

  function setServicesExpanded(open, animate) {
    servicesExpanded = open;
    overlay.classList.toggle("is-services-expanded", open);
    document.body.classList.toggle("is-nav-services-expanded", open);
    if (servicesSublist) servicesSublist.setAttribute("aria-hidden", open ? "false" : "true");
    if (servicesLink) {
      servicesLink.setAttribute("aria-expanded", open ? "true" : "false");
      servicesLink.classList.toggle("is-services-active", open);
    }

    if (REDUCED || !window.gsap || animate === false) return;

    var otherItems = overlay.querySelectorAll(".nav-overlay__list > li:not(.nav-overlay__item--services)");
    if (open) {
      gsap.killTweensOf(otherItems);
      gsap.killTweensOf(subLinks);
      gsap.to(otherItems, {
        opacity: 0,
        y: -8,
        duration: 0.24,
        stagger: 0.018,
        ease: "power2.in",
        overwrite: true,
      });
      gsap.fromTo(
        subLinks,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.04,
          delay: 0.1,
          ease: "power3.out",
          overwrite: true,
        }
      );
      if (backdrop) {
        gsap.to(backdrop, { opacity: 1, duration: 0.34, ease: "power2.out", overwrite: true });
      }
      return;
    }

    gsap.killTweensOf(subLinks);
    gsap.to(subLinks, {
      opacity: 0,
      y: 8,
      duration: 0.16,
      stagger: { each: 0.02, from: "end" },
      ease: "power2.in",
      overwrite: true,
    });
    gsap.to(otherItems, {
      opacity: 1,
      y: 0,
      duration: 0.28,
      stagger: 0.02,
      delay: 0.06,
      ease: "power3.out",
      overwrite: true,
    });
  }

  function toggleServicesSubmenu() {
    setServicesExpanded(!servicesExpanded, true);
  }

  function collapseServicesSubmenu(instant) {
    if (!servicesExpanded) return;
    setServicesExpanded(false, instant === true ? false : true);
  }

  setupServicesSubmenu();
  refreshMainNavLinks();

  var SECTION_INDEX = {
    top: 0,
    uslugi: 1,
    realizacje: 2,
    proces: 3,
    faq: 4,
    kontakt: 5,
  };

  function getLinkText(a) {
    var key = a.getAttribute("data-i18n");
    if (key && window.cosgralI18n && window.cosgralI18n.t) {
      var val = window.cosgralI18n.t(key);
      if (val) return val;
    }
    return (a.textContent || "").trim();
  }

  function prepareNavLabels() {
    links.forEach(function (a) {
      var text = getLinkText(a);
      a.textContent = "";
      var label = document.createElement("span");
      label.className = "nav-overlay__label";
      for (var i = 0; i < text.length; i++) {
        var ch = document.createElement("span");
        ch.className = "nav-overlay__char";
        ch.textContent = text.charAt(i) === " " ? "\u00a0" : text.charAt(i);
        label.appendChild(ch);
      }
      a.appendChild(label);
    });
  }

  function menuChars() {
    return overlay.querySelectorAll(".nav-overlay__char");
  }

  function syncStageToCube() {
    if (!isOpen || !stage) return;

    var rect =
      window.cosgralCube?.getMenuFaceAnchorRect?.() ||
      window.cosgralCube?.getMenuFaceRect?.();
    if (rect && rect.size > 40) {
      stage.style.left = rect.x + "px";
      stage.style.top = rect.y + "px";
      stage.style.width = rect.size + "px";
      stage.style.height = servicesExpanded ? "auto" : rect.size + "px";
      stage.style.setProperty("--menu-face-size", rect.size + "px");
      stage.style.transform = "translate(-50%, -50%)";
    }

    syncRaf = window.requestAnimationFrame(syncStageToCube);
  }

  function startStageSync() {
    if (syncRaf) window.cancelAnimationFrame(syncRaf);
    syncStageToCube();
  }

  function stopStageSync() {
    if (syncRaf) window.cancelAnimationFrame(syncRaf);
    syncRaf = null;
  }

  function setOpenState(open) {
    isOpen = open;
    nav.classList.toggle("is-open", open);
    overlay.classList.toggle("is-open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("is-nav-menu-open", open);
    document.documentElement.classList.toggle("is-nav-menu-open", open);
    if (open && backdrop && window.gsap) {
      gsap.set(backdrop, { opacity: 1 });
    }
    if (open) startStageSync();
    else {
      stopStageSync();
      overlay.classList.remove("is-services-expanded");
      document.body.classList.remove("is-nav-services-expanded");
      servicesExpanded = false;
      if (servicesLink) {
        servicesLink.classList.remove("is-services-active");
        servicesLink.setAttribute("aria-expanded", "false");
      }
      if (servicesSublist) servicesSublist.setAttribute("aria-hidden", "true");
    }
  }

  function bumpDriveToken() {
    menuDriveToken += 1;
    return menuDriveToken;
  }

  function linksDelayForBlend() {
    var openDur = window.cosgralCube?.getMenuOpenDuration?.() || 5.3;
    var fullDelay = window.cosgralCube?.getMenuLinksDelay?.() ?? openDur * 0.128;
    var blend = window.cosgralCube?.getMenuBlend?.() ?? 0;
    if (blend >= 0.98) return 0;
    var linksThreshold = fullDelay / openDur;
    if (blend >= linksThreshold) return 0;
    return Math.max(0, fullDelay - blend * openDur);
  }

  function animateLinksForOpen() {
    if (REDUCED || !window.gsap) return;
    var chars = menuChars();
    var delay = linksDelayForBlend();

    gsap.killTweensOf(links);
    gsap.killTweensOf(chars);
    gsap.set(links, { opacity: 0, clipPath: "inset(0 100% 0 0)" });
    if (chars.length) {
      gsap.set(chars, { opacity: 0, y: 12, filter: "blur(4px)" });
    }

    gsap.fromTo(
      links,
      { clipPath: "inset(0 100% 0 0)", opacity: 0 },
      {
        clipPath: "inset(0 0% 0 0)",
        opacity: 1,
        duration: 0.38,
        stagger: 0.045,
        ease: "power3.out",
        delay: delay,
        overwrite: true,
      }
    );

    gsap.fromTo(
      chars,
      {
        opacity: 0,
        y: 12,
        filter: "blur(4px)",
      },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.32,
        stagger: { each: 0.01, from: "start" },
        ease: "power3.out",
        delay: delay + 0.04,
        overwrite: true,
        clearProps: "filter,transform",
      }
    );
  }

  function bindLinkHover() {
    if (REDUCED) return;
    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () {
        a.classList.add("is-hovered");
      });
      a.addEventListener("mouseleave", function () {
        a.classList.remove("is-hovered");
      });
      a.addEventListener("focus", function () {
        a.classList.add("is-hovered");
      });
      a.addEventListener("blur", function () {
        a.classList.remove("is-hovered");
      });
    });
    subLinks.forEach(function (a) {
      a.addEventListener("mouseenter", function () {
        a.classList.add("is-hovered");
      });
      a.addEventListener("mouseleave", function () {
        a.classList.remove("is-hovered");
      });
      a.addEventListener("focus", function () {
        a.classList.add("is-hovered");
      });
      a.addEventListener("blur", function () {
        a.classList.remove("is-hovered");
      });
    });
  }

  function animateLinksOut() {
    if (REDUCED || !window.gsap) return;
    var chars = menuChars();
    gsap.killTweensOf(links);
    gsap.killTweensOf(chars);
    links.forEach(function (a) {
      a.classList.remove("is-hovered");
    });
    gsap.to(chars, {
      opacity: 0,
      y: -8,
      duration: 0.14,
      stagger: { each: 0.004, from: "end" },
      ease: "power2.in",
      overwrite: true,
    });
    gsap.to(links, {
      clipPath: "inset(0 0 0 100%)",
      duration: 0.16,
      stagger: 0.02,
      ease: "power2.in",
      overwrite: true,
    });
  }

  function navigateTo(href) {
    if (!href || href === "#") return;

    if (href.charAt(0) === "#") {
      var id = href.slice(1);
      var idx = SECTION_INDEX[id];
      if (idx != null && window.cosgralSectionSnap) {
        if (window.cosgralSectionSnap.jumpTo) {
          window.cosgralSectionSnap.jumpTo(idx);
        } else if (window.cosgralSectionSnap.goTo) {
          window.cosgralSectionSnap.goTo(idx);
        }
        return;
      }
      var target = document.getElementById(id);
      if (target && window.cosgralSmoothScroll?.scrollTo) {
        window.cosgralSmoothScroll.scrollTo(target, { duration: 1.1 });
      } else if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    var hashIdx = href.indexOf("#");
    if (hashIdx > 0) {
      var path = href.slice(0, hashIdx);
      var hash = href.slice(hashIdx);
      var id = hash.slice(1);
      var onHome =
        document.body.classList.contains("home-page") ||
        /(^|\/)index\.html?$/.test(window.location.pathname);
      var sameHomeTarget =
        onHome &&
        (!path || path === "index.html" || path === "./index.html" || path === "/" || path === ".");
      if (sameHomeTarget && SECTION_INDEX[id] != null && window.cosgralSectionSnap) {
        if (window.cosgralSectionSnap.jumpTo) {
          window.cosgralSectionSnap.jumpTo(SECTION_INDEX[id]);
        } else if (window.cosgralSectionSnap.goTo) {
          window.cosgralSectionSnap.goTo(SECTION_INDEX[id]);
        }
        return;
      }
    }

    if (window.cosgralPageTransition?.navigate) {
      window.cosgralPageTransition.navigate(href);
      return;
    }

    window.location.href = href;
  }

  function invokeCubeOpen() {
    if (window.cosgralCube && typeof window.cosgralCube.openMenu === "function") {
      return window.cosgralCube.openMenu();
    }
    return null;
  }

  function invokeCubeClose() {
    return window.cosgralCube?.closeMenu?.() || null;
  }

  function driveMenuOpen() {
    menuTargetOpen = true;
    bumpDriveToken();

    if (!isOpen) {
      prepareNavLabels();
      setOpenState(true);
    }

    if (backdrop && window.gsap) {
      gsap.killTweensOf(backdrop);
      gsap.to(backdrop, { opacity: 1, duration: 0.22, ease: "power2.out", overwrite: true });
    }

    animateLinksForOpen();

    var cubeTween = invokeCubeOpen();
    if (!cubeTween && !REDUCED) {
      window.addEventListener(
        "cosgral:cube-ready",
        function onCubeReady() {
          window.removeEventListener("cosgral:cube-ready", onCubeReady);
          if (!menuTargetOpen) return;
          invokeCubeOpen();
        },
        { once: true }
      );
    }
  }

  function driveMenuClose(onComplete) {
    menuTargetOpen = false;
    var token = bumpDriveToken();
    collapseServicesSubmenu(true);

    if (window.gsap) {
      gsap.killTweensOf(links);
      gsap.killTweensOf(menuChars());
    }

    animateLinksOut();
    if (backdrop && window.gsap && !REDUCED) {
      gsap.killTweensOf(backdrop);
      gsap.to(backdrop, { opacity: 0, duration: 0.26, ease: "power2.in", overwrite: true });
    }

    var cubeTween = invokeCubeClose();
    var overlayDone = false;

    var finishOverlay = function () {
      if (overlayDone) return;
      overlayDone = true;
      document.body.classList.remove("is-cube-menu-front", "is-cube-menu-passing");
    };

    var finishAll = function () {
      if (token !== menuDriveToken) return;
      if (menuTargetOpen) return;
      finishOverlay();
      setOpenState(false);
      if (onComplete) onComplete();
    };

    var closeDur = window.cosgralCube?.getMenuCloseDuration?.() || 2.85;
    var closeBlend = window.cosgralCube?.getMenuBlend?.() ?? (isOpen ? 1 : 0);
    var closeMs = Math.max(80, closeDur * closeBlend * 1000 + 80);
    if (cubeTween && cubeTween.eventCallback) {
      cubeTween.eventCallback("onComplete", finishAll);
    } else {
      window.setTimeout(finishAll, REDUCED ? 0 : closeMs);
    }
  }

  function openNav() {
    driveMenuOpen();
  }

  function closeNav(onComplete) {
    if (!isOpen && !menuTargetOpen) {
      if (onComplete) onComplete();
      return;
    }
    driveMenuClose(onComplete);
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    menuTargetOpen ? driveMenuClose() : driveMenuOpen();
  });

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (a.hasAttribute("data-nav-services-toggle")) {
        e.preventDefault();
        e.stopPropagation();
        toggleServicesSubmenu();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      var href = a.getAttribute("href");
      collapseServicesSubmenu(true);
      closeNav(function () {
        navigateTo(href);
      });
    });
  });

  subLinks.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var theme = a.getAttribute("data-service-theme");
      collapseServicesSubmenu(true);
      closeNav(function () {
        if (window.cosgralPageTransition?.navigateService) {
          window.cosgralPageTransition.navigateService(theme);
          return;
        }
        navigateTo(a.getAttribute("href"));
      });
    });
  });

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      closeNav();
    });
  }

  overlay.addEventListener("click", function (e) {
    if (!isOpen) return;
    if (toggle.contains(e.target)) return;
    if (stage && stage.contains(e.target)) return;
    closeNav();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      if (servicesExpanded) {
        collapseServicesSubmenu();
        return;
      }
      closeNav();
    }
  });

  window.addEventListener("cosgral:langchange", function () {
    refreshServiceSubLabels();
    if (!isOpen) return;
    prepareNavLabels();
    if (!REDUCED && window.gsap) {
      gsap.set(menuChars(), { opacity: 1, y: 0, rotateX: 0, filter: "none" });
      gsap.set(links, { opacity: 1, clipPath: "inset(0 0% 0 0)" });
      if (servicesExpanded) {
        gsap.set(subLinks, { opacity: 1, y: 0 });
      }
    }
  });

  document.querySelectorAll("a.site-nav__logo").forEach(function (logo) {
    logo.addEventListener("click", function (e) {
      e.preventDefault();
      if (isOpen) closeNav();
      if (window.cosgralSectionSnap?.jumpTo) {
        window.cosgralSectionSnap.jumpTo(0);
        return;
      }
      if (window.cosgralSmoothScroll?.scrollTo) {
        window.cosgralSmoothScroll.scrollTo(0, { duration: 2.2 });
        return;
      }
      var top = document.getElementById("top");
      if (top) top.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  window.cosgralNavMenu = { open: openNav, close: closeNav, isOpen: function () { return isOpen; } };
  bindLinkHover();
})();

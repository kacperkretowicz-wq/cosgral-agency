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
  var animating = false;
  var syncRaf = null;

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
    var rect = window.cosgralCube?.getMenuFaceRect?.();
    if (rect && rect.size > 40) {
      stage.style.left = rect.x + "px";
      stage.style.top = rect.y + "px";
      stage.style.width = rect.size + "px";
      stage.style.height = rect.size + "px";
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
    else stopStageSync();
  }

  function animateLinksIn() {
    if (REDUCED || !window.gsap) return;
    var side = window.cosgralCube?.isSideEntry?.();
    var chars = menuChars();
    var openDur = window.cosgralCube?.getMenuOpenDuration?.() || 5.3;
    var delay = side ? openDur * 0.187 : openDur * 0.128;

    gsap.killTweensOf(links);
    gsap.killTweensOf(chars);
    gsap.set(links, { opacity: 1, y: 0, scale: 1 });

    gsap.fromTo(
      links,
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
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

  function openNav() {
    if (isOpen) return;
    animating = true;
    prepareNavLabels();
    setOpenState(true);

    var cubeTween = invokeCubeOpen();
    if (!cubeTween && !REDUCED) {
      window.addEventListener(
        "cosgral:cube-ready",
        function onCubeReady() {
          window.removeEventListener("cosgral:cube-ready", onCubeReady);
          if (!isOpen) return;
          var retryTween = invokeCubeOpen();
          if (retryTween && retryTween.eventCallback) {
            retryTween.eventCallback("onComplete", function () {
              animating = false;
            });
          }
        },
        { once: true }
      );
    }
    animateLinksIn();

    var done = function () {
      animating = false;
    };
    if (cubeTween && cubeTween.eventCallback) {
      cubeTween.eventCallback("onComplete", done);
    } else {
      var openMs = (window.cosgralCube?.getMenuOpenDuration?.() || 5.3) * 1000 + 180;
      window.setTimeout(done, REDUCED ? 0 : openMs);
    }
  }

  function closeNav(onComplete) {
    if (!isOpen) {
      if (onComplete) onComplete();
      return;
    }

    animating = true;

    if (window.gsap) {
      gsap.killTweensOf(links);
      gsap.killTweensOf(menuChars());
    }

    animateLinksOut();
    if (backdrop && window.gsap && !REDUCED) {
      gsap.killTweensOf(backdrop);
      gsap.to(backdrop, { opacity: 0, duration: 0.26, ease: "power2.in", overwrite: true });
    }

    var cubeTween = window.cosgralCube?.closeMenu?.();
    var overlayDone = false;

    var finishOverlay = function () {
      if (overlayDone) return;
      overlayDone = true;
      setOpenState(false);
      document.body.classList.remove("is-cube-menu-front", "is-cube-menu-passing");
      document.documentElement.style.removeProperty("--menu-water-bend");
      document.documentElement.style.removeProperty("--menu-wave-x");
      document.documentElement.style.removeProperty("--menu-wave-y");
      document.documentElement.style.removeProperty("--menu-wave-progress");
      document.documentElement.style.removeProperty("--menu-wave-punch");
    };

    var finishAll = function () {
      finishOverlay();
      animating = false;
      if (onComplete) onComplete();
    };

    var closeMs = (window.cosgralCube?.getMenuCloseDuration?.() || 1.95) * 1000 + 80;
    if (cubeTween && cubeTween.eventCallback) {
      cubeTween.eventCallback("onUpdate", function () {
        if (cubeTween.progress() >= 0.48) finishOverlay();
      });
      cubeTween.eventCallback("onComplete", finishAll);
    } else {
      window.setTimeout(finishAll, REDUCED ? 0 : closeMs);
    }
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isOpen ? closeNav() : openNav();
  });

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var href = a.getAttribute("href");
      closeNav(function () {
        navigateTo(href);
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
    if (e.key === "Escape" && isOpen) closeNav();
  });

  window.addEventListener("cosgral:langchange", function () {
    if (!isOpen) return;
    prepareNavLabels();
    if (!REDUCED && window.gsap) {
      gsap.set(menuChars(), { opacity: 1, y: 0, rotateX: 0, filter: "none" });
      gsap.set(links, { opacity: 1, clipPath: "inset(0 0% 0 0)" });
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

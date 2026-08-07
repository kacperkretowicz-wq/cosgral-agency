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
  var backdrop = overlay.querySelector("[data-nav-backdrop]");
  var isOpen = false;
  var animating = false;
  var syncRaf = null;

  var SECTION_INDEX = {
    top: 0,
    uslugi: 1,
    proces: 2,
    faq: 3,
    kontakt: 4,
  };

  function syncStageToCube() {
    if (!isOpen || !stage) return;
    var rect = window.cosgralCube?.getMenuFaceRect?.();
    if (rect && rect.size > 40) {
      stage.style.left = rect.x + "px";
      stage.style.top = rect.y + "px";
      stage.style.width = rect.size + "px";
      stage.style.height = rect.size + "px";
      stage.style.setProperty("--menu-face-size", rect.size + "px");
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
    if (open) startStageSync();
    else stopStageSync();
  }

  function animateLinksIn() {
    if (REDUCED || !window.gsap) return;
    var side = window.cosgralCube?.isSideEntry?.();
    gsap.killTweensOf(links);
    gsap.fromTo(
      links,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.52,
        stagger: 0.055,
        ease: "power3.out",
        delay: side ? 1.24 : 0.92,
        overwrite: true,
        clearProps: "transform",
      }
    );
  }

  function animateLinksOut() {
    if (REDUCED || !window.gsap) return;
    gsap.killTweensOf(links);
    gsap.to(links, {
      opacity: 0,
      y: 18,
      duration: 0.28,
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

    window.location.href = href;
  }

  function openNav() {
    if (isOpen || animating) return;
    animating = true;
    setOpenState(true);

    var cubeTween = window.cosgralCube?.openMenu?.();
    animateLinksIn();

    var done = function () {
      animating = false;
    };
    if (cubeTween && cubeTween.eventCallback) {
      cubeTween.eventCallback("onComplete", done);
    } else {
      window.setTimeout(done, REDUCED ? 0 : 1840);
    }
  }

  function closeNav(onComplete) {
    if (!isOpen) {
      if (onComplete) onComplete();
      return;
    }
    if (animating && !onComplete) return;

    animating = true;
    animateLinksOut();
    window.cosgralCube?.closeMenu?.();

    window.setTimeout(
      function () {
        setOpenState(false);
        animating = false;
        if (onComplete) onComplete();
      },
      REDUCED ? 0 : 560
    );
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
})();

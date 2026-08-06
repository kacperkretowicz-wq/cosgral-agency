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
  var isOpen = false;
  var animating = false;
  var syncRaf = null;

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
        duration: 0.48,
        stagger: 0.045,
        ease: "power3.out",
        delay: side ? 0.62 : 0.46,
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
      window.setTimeout(done, REDUCED ? 0 : 920);
    }
  }

  function closeNav() {
    if (!isOpen || animating) return;
    animating = true;
    animateLinksOut();

    var cubeTween = window.cosgralCube?.closeMenu?.();
    window.setTimeout(
      function () {
        setOpenState(false);
        animating = false;
      },
      REDUCED ? 0 : 320
    );

    if (cubeTween && cubeTween.eventCallback) {
      cubeTween.eventCallback("onComplete", function () {
        if (!isOpen) animating = false;
      });
    }
  }

  toggle.addEventListener("click", function () {
    isOpen ? closeNav() : openNav();
  });

  overlay.querySelectorAll("[data-nav-close]").forEach(function (a) {
    a.addEventListener("click", function () {
      closeNav();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closeNav();
  });

  window.cosgralNavMenu = { open: openNav, close: closeNav, isOpen: function () { return isOpen; } };
})();

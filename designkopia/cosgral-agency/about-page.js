/**
 * O nas — dwie sekcje (intro + zespół) ze sticky depth stack
 * jak Proces → FAQ na homepage.
 */
(function () {
  "use strict";

  if (!document.body.classList.contains("about-page")) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var hero = document.getElementById("about-intro");
  var team = document.getElementById("about-team");
  var curtain = document.querySelector("[data-about-curtain]");

  if (!hero || !team) return;

  function dispatchStep(index, initial) {
    window.dispatchEvent(
      new CustomEvent("cosgral:section-step", {
        detail: {
          index: index,
          id: index === 0 ? "about-intro" : "about-team",
          initial: !!initial,
        },
      })
    );
  }

  function bootIndex() {
    var teamTop = team.getBoundingClientRect().top + window.scrollY;
    return window.scrollY + window.innerHeight * 0.42 < teamTop ? 0 : 1;
  }

  function boot() {
    dispatchStep(bootIndex(), true);
  }

  if (window.cosgralCube) boot();
  else window.addEventListener("cosgral:cube-ready", boot, { once: true });

  function panelOf(scene) {
    return scene.querySelector(".about-scene__panel") || scene;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function coverAmount(next) {
    if (!next) return 0;
    var top = next.getBoundingClientRect().top;
    var vh = window.innerHeight || 1;
    if (top <= 0) return 1;
    return 1 - Math.max(0, Math.min(1, top / vh));
  }

  function setCurtain(amount) {
    if (!curtain || !window.gsap) return;
    var a = Math.max(0, Math.min(0.72, amount));
    gsap.set(curtain, {
      autoAlpha: a,
      visibility: a > 0.01 ? "visible" : "hidden",
    });
    document.body.classList.toggle("is-about-scene-bridge", a > 0.08);
  }

  function wireDepth(scene, next, opts) {
    opts = opts || {};
    var panel = panelOf(scene);
    var fadeOut = opts.fadeOut !== false;
    var stackZ = opts.z || 20;
    var holdEnd = 0.04;
    var exitScale = MOBILE ? 0.8 : 0.7;
    var exitBlur = MOBILE ? 10 : 18;
    var exitY = MOBILE ? -4 : -8;

    scene.classList.add("about-depth");
    scene.style.setProperty("--depth-z", String(stackZ));
    scene.style.zIndex = String(stackZ);

    function applyPose(p) {
      p = Math.max(0, Math.min(1, p));
      if (!fadeOut || !window.gsap) {
        scene.classList.remove("is-depth-recessed", "is-depth-gone");
        return;
      }
      if (p <= holdEnd) {
        gsap.set(panel, {
          autoAlpha: 1,
          yPercent: 0,
          scale: 1,
          filter: "blur(0px)",
          force3D: true,
        });
        gsap.set(scene, { autoAlpha: 1 });
        scene.classList.remove("is-depth-recessed", "is-depth-gone");
        scene.style.pointerEvents = "";
        return;
      }
      var u = easeInOut((p - holdEnd) / Math.max(1 - holdEnd, 0.001));
      var fade = u * u;
      gsap.set(panel, {
        autoAlpha: 1 - fade,
        yPercent: exitY * u,
        scale: 1 - (1 - exitScale) * u,
        filter: "blur(" + (exitBlur * u).toFixed(2) + "px)",
        transformOrigin: "50% 42%",
        force3D: true,
      });
      scene.classList.add("is-depth-recessed");
      if (u >= 0.98) {
        scene.classList.add("is-depth-gone");
        scene.style.pointerEvents = "none";
        gsap.set(scene, { autoAlpha: 0 });
        gsap.set(panel, { autoAlpha: 0, filter: "blur(0px)" });
      } else {
        scene.classList.remove("is-depth-gone");
        gsap.set(scene, { autoAlpha: 1 });
        scene.style.pointerEvents = "";
      }
    }

    if (window.gsap) {
      gsap.set(panel, {
        autoAlpha: 1,
        yPercent: 0,
        scale: 1,
        filter: "blur(0px)",
        transformOrigin: "50% 42%",
        force3D: true,
      });
    }

    scene.classList.add("is-entered", "is-visible");

    if (REDUCED || !window.ScrollTrigger || !fadeOut || !next) {
      applyPose(0);
      return;
    }

    function syncCover() {
      var amt = coverAmount(next);
      applyPose(amt);
      var pulse = Math.sin(amt * Math.PI) * 0.65;
      setCurtain(pulse);
    }

    ScrollTrigger.create({
      id: (opts.id || scene.id) + "-cover",
      start: 0,
      end: "max",
      invalidateOnRefresh: true,
      onUpdate: syncCover,
      onRefresh: syncCover,
    });

    ScrollTrigger.create({
      trigger: scene,
      start: "top top",
      end: function () {
        return "bottom top+=" + (next ? next.offsetHeight : 0);
      },
      onLeave: function () {
        dispatchStep(1);
      },
      onEnterBack: function () {
        dispatchStep(0);
      },
    });
  }

  if (REDUCED) {
    hero.classList.add("is-entered", "is-visible");
    team.classList.add("is-entered", "is-visible");
    return;
  }

  wireDepth(hero, team, { id: "about-intro", z: 20 });
  wireDepth(team, null, { id: "about-team", z: 30, fadeOut: false });

  if (window.ScrollTrigger) {
    ScrollTrigger.refresh();
  }
})();

/**
 * Kinowe sceny: pin + fade przez ciemność + zoom. Nie zwykłe przewijanie.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var CYCLE = ["left", "right", "top", "bottom"];
  var curtain = document.querySelector("[data-scene-curtain]");

  document.querySelectorAll("[data-reveal-words]").forEach(function (el) {
    if (el.dataset.wordsReady) return;
    var text = el.textContent.trim();
    el.textContent = "";
    text.split(/\s+/).forEach(function (word, i) {
      var wrap = document.createElement("span");
      wrap.className = "reveal-word";
      wrap.setAttribute("data-enter", CYCLE[i % CYCLE.length]);
      var inner = document.createElement("span");
      inner.textContent = word;
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
    el.dataset.wordsReady = "1";
  });

  function panelOf(scene) {
    return scene.querySelector(".home-scene__panel") || scene;
  }

  function setCurtain(amount) {
    if (!curtain) return;
    gsap.set(curtain, { autoAlpha: amount });
  }

  /** Pinowana scena: ciemność → zoom in → pauza → ciemność */
  function wireScene(scene, opts) {
    if (!scene || REDUCED) {
      if (scene) scene.classList.add("is-entered", "is-visible");
      return;
    }

    opts = opts || {};
    var panel = panelOf(scene);
    var pinLen = opts.pin || (MOBILE ? "+=72%" : "+=88%");
    var fadeOut = opts.fadeOut !== false;

    gsap.set(panel, { autoAlpha: 0, scale: MOBILE ? 1.04 : 1.07, filter: "blur(14px)" });

    var tl = gsap.timeline({
      scrollTrigger: {
        id: opts.id || scene.id,
        trigger: scene,
        start: "top top",
        end: pinLen,
        pin: true,
        pinSpacing: true,
        scrub: MOBILE ? 1.05 : 1.25,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: opts.priority || 1,
        onEnter: function () {
          scene.classList.add("is-entered", "is-visible");
          if (opts.onEnter) opts.onEnter();
        },
        onEnterBack: function () {
          scene.classList.add("is-entered", "is-visible");
          if (opts.onEnterBack) opts.onEnterBack();
        },
        onLeave: function () {
          scene.classList.remove("is-visible");
          if (opts.onLeave) opts.onLeave();
        },
        onLeaveBack: function () {
          scene.classList.remove("is-visible");
          if (opts.onLeaveBack) opts.onLeaveBack();
        },
      },
    });

    // 0–22%: wjeżdża z ciemności
    tl.to(
      panel,
      {
        autoAlpha: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.22,
        ease: "power2.out",
      },
      0
    );

    if (curtain) {
      tl.to(curtain, { autoAlpha: 0.72, duration: 0.08, ease: "power1.in" }, 0)
        .to(curtain, { autoAlpha: 0, duration: 0.18, ease: "power2.out" }, 0.08);
    }

    // 22–72%: treść na ekranie (pauza)
    tl.to(panel, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "none" }, 0.22);

  if (fadeOut) {
      // 72–100%: zanik w ciemność
      tl.to(
        panel,
        {
          autoAlpha: 0,
          scale: MOBILE ? 0.96 : 0.94,
          filter: "blur(12px)",
          duration: 0.28,
          ease: "power2.in",
        },
        0.72
      );
      if (curtain) {
        tl.to(curtain, { autoAlpha: 0.85, duration: 0.2, ease: "power2.in" }, 0.78);
      }
    } else {
      tl.to(panel, { autoAlpha: 1, duration: 0.28, ease: "none" }, 0.72);
    }

    return tl;
  }

  (async function () {
    var main = document.querySelector("main.home-film");
    if (!main || !window.gsap) {
      if (main) {
        main.querySelectorAll(".home-scene").forEach(function (s) {
          s.classList.add("is-entered", "is-visible");
        });
      }
      return;
    }

    await window.cosgralSmoothScroll?.ready;

    if (curtain) gsap.set(curtain, { autoAlpha: 0 });

    var hero = document.getElementById("top");
    var shatter = document.getElementById("rozpad");
    var services = document.getElementById("uslugi");
    var process = document.getElementById("proces");
    var faq = document.getElementById("faq");
    var contact = document.getElementById("kontakt");

    if (REDUCED) {
      [hero, shatter, services, process, faq, contact].forEach(function (s) {
        if (s) s.classList.add("is-entered", "is-visible");
      });
      return;
    }

    // ——— 1. HERO ———
    if (hero) {
      var heroContent = hero.querySelector(".home-hero__content");
      var heroScroll = hero.querySelector(".home-hero__scroll");
      hero.classList.add("is-entered", "is-visible");
      gsap.set(panelOf(hero), { autoAlpha: 1 });

      gsap
        .timeline({
          scrollTrigger: {
            id: "hero-pin",
            trigger: hero,
            start: "top top",
            end: MOBILE ? "+=50%" : "+=65%",
            pin: true,
            pinSpacing: true,
            scrub: 1,
            anticipatePin: 1,
          },
        })
        .to(heroContent, { autoAlpha: 0, y: -48, filter: "blur(10px)", ease: "none", duration: 1 }, 0.25)
        .to(heroScroll, { autoAlpha: 0, duration: 0.3, ease: "none" }, 0.1)
        .to(curtain, { autoAlpha: 0.6, duration: 0.35, ease: "power2.in" }, 0.75);
    }

    // ——— 2. SHATTER ———
    if (shatter) {
      var shatterPanel = panelOf(shatter);
      var shatterCap = shatter.querySelector(".home-shatter__caption");
      gsap.set(shatterPanel, { autoAlpha: 1 });
      gsap.set(shatter, { autoAlpha: 1 });

      gsap.timeline({
        scrollTrigger: {
          id: "shatter-beat",
          trigger: shatter,
          start: "top top",
          end: MOBILE ? "+=120%" : "+=145%",
          pin: true,
          pinSpacing: true,
          scrub: 1.35,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 5,
          onEnter: function () {
            shatter.classList.add("is-active");
            document.documentElement.classList.add("is-shattering");
            document.documentElement.classList.remove("is-sand-stream");
            gsap.set(shatter, { autoAlpha: 1, visibility: "visible" });
            gsap.set(shatterPanel, { autoAlpha: 1, clearProps: "filter" });
            gsap.set(curtain, { autoAlpha: 0.55 });
          },
          onEnterBack: function () {
            shatter.classList.add("is-active");
            document.documentElement.classList.add("is-shattering");
            document.documentElement.classList.remove("is-sand-stream");
            gsap.set(shatter, { autoAlpha: 1, visibility: "visible" });
            gsap.set(shatterPanel, { autoAlpha: 1 });
          },
          onLeave: function () {
            shatter.classList.remove("is-active");
            document.documentElement.classList.remove("is-shattering");
            document.documentElement.classList.add("is-sand-stream");
            gsap.set(shatterPanel, { autoAlpha: 0 });
            gsap.set(shatter, { autoAlpha: 0, visibility: "hidden" });
          },
          onLeaveBack: function () {
            shatter.classList.add("is-active");
            document.documentElement.classList.remove("is-shattering");
            document.documentElement.classList.remove("is-sand-stream");
            gsap.set(shatter, { autoAlpha: 1, visibility: "visible" });
            gsap.set(shatterPanel, { autoAlpha: 1 });
          },
          onUpdate: function (self) {
            window.cosgralSand = window.cosgralSand || {};
            var p = self.progress;
            window.cosgralSand.break = Math.min(
              1,
              Math.pow(Math.min(1, Math.max(0, (p - 0.02) / 0.5)), 0.9)
            );
            window.cosgralSand.stream = Math.min(1, Math.max(0, (p - 0.08) / 0.45));

            if (shatterCap) {
              var capIn = Math.min(1, Math.max(0, (p - 0.08) / 0.2));
              var capOut = p > 0.55 ? (p - 0.55) / 0.25 : 0;
              gsap.set(shatterCap, {
                autoAlpha: Math.max(0, capIn * (1 - Math.min(1, capOut))),
                y: (1 - capIn) * 20 - capOut * 30,
              });
            }

            var out = p > 0.78 ? (p - 0.78) / 0.22 : 0;
            gsap.set(shatterPanel, {
              autoAlpha: 1 - out,
              filter: out ? "blur(" + out * 8 + "px)" : "blur(0px)",
            });

            if (curtain) {
              var c = p > 0.7 ? (p - 0.7) / 0.3 : 0.55 * (1 - p / 0.7);
              gsap.set(curtain, { autoAlpha: Math.min(0.9, c) });
            }
          },
        },
      });
    }

    // ——— 3–6: kinowe sceny (pin + fade) ———
    wireScene(services, {
      id: "scene-uslugi",
      pin: MOBILE ? "+=78%" : "+=92%",
      priority: 2,
      onEnter: function () {
        document.documentElement.classList.add("is-sand-stream");
      },
      onEnterBack: function () {
        document.documentElement.classList.add("is-sand-stream");
      },
      onLeave: function () {
        document.documentElement.classList.remove("is-sand-stream");
      },
      onLeaveBack: function () {
        document.documentElement.classList.add("is-sand-stream");
      },
    });

    wireScene(process, { id: "scene-proces", pin: MOBILE ? "+=68%" : "+=82%" });
    wireScene(faq, { id: "scene-faq", pin: MOBILE ? "+=62%" : "+=76%" });
    wireScene(contact, { id: "scene-kontakt", pin: MOBILE ? "+=70%" : "+=84%", fadeOut: false });

    gsap.utils.toArray(".site-footer [data-enter]").forEach(function (el) {
      gsap.from(el, {
        y: 20,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: ".site-footer",
          start: "top 92%",
          toggleActions: "play none none none",
          once: true,
        },
      });
    });

    ScrollTrigger.refresh();
  })();
})();

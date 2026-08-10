/**
 * COSGRAL V3 — zachowania sekcji contentowych (5-8) + nawigacja + formularz.
 * Marquee (akt "zaufali nam") jest czystym CSS (@keyframes) — nic tu nie robi.
 */
(function () {
  "use strict";

  const REDUCED_MOTION = false;

  // ─── nav overlay + sześcian menu ─────────────────────────────────────
  const nav = document.getElementById("site-nav");
  const toggle = document.getElementById("nav-toggle");
  const overlay = document.getElementById("nav-overlay");
  const REDUCED = document.documentElement.classList.contains("reduce-motion");

  let isOpen = false;
  let animating = false;
  let syncRaf = null;

  function closeNav() {
    nav?.classList.remove("is-open");
    overlay?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-nav-menu-open");
    document.documentElement.classList.remove("is-nav-menu-open");
    stopStageSync();
    isOpen = false;
  }

  function syncStageToCube() {
    if (!isOpen || !overlay) return;
    const stage = overlay.querySelector(".nav-overlay__stage");
    const rect = window.cosgralCube?.getMenuFaceRect?.();
    if (stage && rect && rect.size > 40) {
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

  function animateLinksIn() {
    if (!overlay || REDUCED || !window.gsap) return;
    const links = overlay.querySelectorAll(".nav-overlay__list a");
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
        delay: 1.24,
        overwrite: true,
        clearProps: "transform",
      }
    );
  }

  function animateLinksOut() {
    if (!overlay || REDUCED || !window.gsap) return;
    const links = overlay.querySelectorAll(".nav-overlay__list a");
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
    if (!nav || !overlay || !toggle || isOpen || animating) return;
    animating = true;
    nav.classList.add("is-open");
    overlay.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-nav-menu-open");
    document.documentElement.classList.add("is-nav-menu-open");
    isOpen = true;
    startStageSync();

    const cubeTween = window.cosgralCube?.openMenu?.();
    animateLinksIn();

    const done = () => {
      animating = false;
    };
    if (cubeTween?.eventCallback) {
      cubeTween.eventCallback("onComplete", done);
    } else {
      window.setTimeout(done, REDUCED ? 0 : 1840);
    }
  }

  function closeNavAnimated(onComplete) {
    if (!nav || !overlay || !toggle) {
      if (onComplete) onComplete();
      return;
    }
    if (!isOpen) {
      if (onComplete) onComplete();
      return;
    }
    if (animating && !onComplete) return;

    animating = true;
    animateLinksOut();
    window.cosgralCube?.closeMenu?.();

    window.setTimeout(
      () => {
        closeNav();
        animating = false;
        if (onComplete) onComplete();
      },
      REDUCED ? 0 : 560
    );
  }

  if (toggle && overlay) {
    toggle.addEventListener("click", () => {
      isOpen ? closeNavAnimated() : openNav();
    });
    overlay.querySelectorAll("[data-nav-close]").forEach((el) => {
      if (el.matches(".nav-overlay__list a")) return;
      el.addEventListener("click", () => closeNavAnimated());
    });

    overlay.querySelectorAll(".nav-overlay__list a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const href = a.getAttribute("href");
        closeNavAnimated(() => {
          if (window.cosgralPageTransition?.navigate) {
            window.cosgralPageTransition.navigate(href);
            return;
          }
          window.location.href = href;
        });
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closeNavAnimated();
    });
  }

  // Logo → początek homepage (bez przeładowania na stronie głównej)
  document.querySelectorAll("a.site-nav__logo").forEach((logo) => {
    logo.addEventListener("click", (e) => {
      const href = logo.getAttribute("href") || "";
      if (!href.includes("index") && href !== "#top") return;

      const path = window.location.pathname.split("/").pop() || "";
      const onHome =
        document.body.classList.contains("home-page") ||
        path === "" ||
        path === "index.html";

      if (!onHome) return;

      e.preventDefault();
      closeNavAnimated();

      if (window.cosgralSectionSnap?.jumpTo) {
        window.cosgralSectionSnap.jumpTo(0);
        return;
      }
      if (window.cosgralSmoothScroll?.scrollTo) {
        window.cosgralSmoothScroll.scrollTo(0, { duration: 2.2 });
        return;
      }
      const top = document.getElementById("top");
      if (top) {
        top.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  // ─── reveal-on-scroll (sekcje 5-8) ───────────────────────────────────
  const revealEls = document.querySelectorAll("[data-reveal]:not(.section-head)");
  if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // ─── Lusion-style scrub transitions (content) ────────────────────────
  (async function bootScrollMotion() {
    await window.cosgralSmoothScroll?.ready;
    if (REDUCED_MOTION || !window.gsap || !window.ScrollTrigger) return;

    const scrollSections = document.querySelector(".scroll-sections-wrapper");
    if (scrollSections) {
      gsap.fromTo(
        scrollSections,
        { opacity: 0.35, y: 64, filter: "blur(8px)" },
        {
          opacity: 1, y: 0, filter: "blur(0px)", ease: "none",
          scrollTrigger: { trigger: scrollSections, start: "top 98%", end: "top 72%", scrub: 1.45 },
        }
      );
    }

    document.querySelectorAll(".section-head[data-reveal]").forEach((head) => {
      gsap.fromTo(
        head,
        { y: 72, opacity: 0, filter: "blur(10px)" },
        {
          y: 0, opacity: 1, filter: "blur(0px)", ease: "none",
          scrollTrigger: { trigger: head, start: "top 90%", end: "top 62%", scrub: 1.2 },
        }
      );
    });

    document.querySelectorAll(".section").forEach((section) => {
      gsap.fromTo(
        section,
        { opacity: 0.92 },
        {
          opacity: 1, ease: "none",
          scrollTrigger: { trigger: section, start: "top 95%", end: "top 70%", scrub: 1.1 },
        }
      );
    });

    document.querySelectorAll("[data-heading-pillars]").forEach((head) => {
      gsap.fromTo(
        head,
        { yPercent: 110, filter: "blur(6px)" },
        {
          yPercent: 0, filter: "blur(0px)", ease: "none",
          scrollTrigger: { trigger: head, start: "top 92%", end: "top 68%", scrub: 1.25 },
        }
      );
    });
    document.querySelectorAll("[data-body-pillars] p").forEach((p) => {
      gsap.fromTo(
        p,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0, ease: "none",
          scrollTrigger: { trigger: p, start: "top 94%", end: "top 72%", scrub: 1.15 },
        }
      );
    });

    document.querySelectorAll("[data-team-card]").forEach((card) => {
      const isRight = card.classList.contains("is-right");
      const media = card.querySelector(".history_team_media");
      const info = card.querySelector(".history_team_info");
      const cardTl = gsap.timeline({
        scrollTrigger: { trigger: card, start: "top 88%", end: "top 55%", scrub: 1.2 },
      });
      if (media) cardTl.fromTo(media, { autoAlpha: 0, scale: 0.94, y: 40, filter: "blur(8px)" }, { autoAlpha: 1, scale: 1, y: 0, filter: "blur(0px)", ease: "none" }, 0);
      if (info) cardTl.fromTo(info, { autoAlpha: 0, x: isRight ? -48 : 48, filter: "blur(6px)" }, { autoAlpha: 1, x: 0, filter: "blur(0px)", ease: "none" }, 0.12);
    });

    ScrollTrigger.refresh();
  })();

  // ─── FAQ akordeon ────────────────────────────────────────────────────
  document.querySelectorAll("[data-faq-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-item__a");
      const isOpen = item.getAttribute("data-open") === "true";

      // zamknij pozostałe (jeden otwarty naraz)
      document.querySelectorAll(".faq-item[data-open='true']").forEach((other) => {
        if (other !== item) {
          other.setAttribute("data-open", "false");
          other.querySelector("[data-faq-toggle]").setAttribute("aria-expanded", "false");
          other.querySelector(".faq-item__a").style.maxHeight = "";
        }
      });

      const next = !isOpen;
      item.setAttribute("data-open", String(next));
      btn.setAttribute("aria-expanded", String(next));
      answer.style.maxHeight = next ? answer.scrollHeight + "px" : "";
    });
  });

  // ─── formularz audytu (akt 4) — mailto fallback, patrz TODO w HTML ────
  const form = document.querySelector("[data-audit-form]");
  const status = document.querySelector("[data-audit-status]");
  if (form && status) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const company = (data.get("company") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      if (!email) {
        status.dataset.state = "error";
        status.textContent = "Ups! Coś poszło nie tak przy wysyłce formularza.";
        return;
      }

      const subject = encodeURIComponent(`Bezpłatny audyt — ${name || "zapytanie ze strony"}`);
      const bodyLines = [
        `Imię: ${name || "-"}`,
        `Email: ${email}`,
        `Firma: ${company || "-"}`,
        "",
        message || "(brak wiadomości)",
      ];
      const body = encodeURIComponent(bodyLines.join("\n"));
      window.location.href = `mailto:kontakt@cosgral.pl?subject=${subject}&body=${body}`;

      status.dataset.state = "success";
      status.textContent = "Dziękujemy! Otworzyliśmy Twój program pocztowy z gotową wiadomością — wystarczy wysłać.";
      form.reset();
    });
  }
})();

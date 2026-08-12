/**
 * COSGRAL V3 — zachowania sekcji contentowych (5-8) + nawigacja + formularz.
 * Marquee (akt "zaufali nam") jest czystym CSS (@keyframes) — nic tu nie robi.
 */
(function () {
  "use strict";

  const REDUCED_MOTION = false;

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

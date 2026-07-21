/**
 * COSGRAL V3 — zachowania sekcji contentowych (5-8) + nawigacja + formularz.
 * Marquee (akt "zaufali nam") jest czystym CSS (@keyframes) — nic tu nie robi.
 */
(function () {
  "use strict";

  const REDUCED_MOTION = false;

  // ─── nav overlay ─────────────────────────────────────────────────────
  const nav = document.getElementById("site-nav");
  const toggle = document.getElementById("nav-toggle");
  const overlay = document.getElementById("nav-overlay");

  function closeNav() {
    nav.classList.remove("is-open");
    overlay.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  function openNav() {
    nav.classList.add("is-open");
    overlay.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }
  if (toggle && overlay) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.contains("is-open");
      isOpen ? closeNav() : openNav();
    });
    overlay.querySelectorAll("[data-nav-close]").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  // ─── reveal-on-scroll (sekcje 5-8) ───────────────────────────────────
  const revealEls = document.querySelectorAll("[data-reveal]");
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

  // ─── pillars — port animacji ze starej strony (inline script #10) ─────
  // Nagłówki: yPercent 100 -> 0 power4.inOut w overflow-hidden wrapperze;
  // opisy: fade-in. toggleActions 'play none none reverse' jak w oryginale.
  if (!REDUCED_MOTION && window.gsap && window.ScrollTrigger) {
    document.querySelectorAll("[data-heading-pillars]").forEach((head) => {
      gsap.fromTo(head,
        { yPercent: 100 },
        {
          yPercent: 0, duration: 1, ease: "power4.inOut",
          scrollTrigger: { trigger: head, start: "top 85%", toggleActions: "play none none reverse" },
        });
    });
    document.querySelectorAll("[data-body-pillars] p").forEach((p) => {
      gsap.fromTo(p,
        { opacity: 0 },
        {
          opacity: 1, duration: 1, ease: "power4.inOut",
          scrollTrigger: { trigger: p, start: "top 90%", toggleActions: "play none none reverse" },
        });
    });

    // ─── realizacje — echo cosgral-film-blur-reveal: clip-wipe + blur -> ostro ──
    document.querySelectorAll("[data-film-card]").forEach((card, i) => {
      const img = card.querySelector("img");
      if (!img) return;
      gsap.fromTo(img,
        { clipPath: "inset(0 0 100% 0)", filter: "blur(10px)", scale: 1.08 },
        {
          clipPath: "inset(0 0 0% 0)", filter: "blur(0px)", scale: 1,
          duration: 1.1, ease: "power3.out", delay: (i % 2) * 0.12,
          scrollTrigger: { trigger: card, start: "top 82%", once: true },
        });
    });

    // ─── zespół — port cosgral-team-reveal.js (reveal per karta, bez pina) ──
    document.querySelectorAll("[data-team-card]").forEach((card) => {
      const isRight = card.classList.contains("is-right");
      const media = card.querySelector(".history_team_media");
      const info = card.querySelector(".history_team_info");
      if (media) gsap.set(media, { autoAlpha: 0, scale: 0.95, y: 30 });
      if (info) gsap.set(info, { autoAlpha: 0, x: isRight ? -40 : 40 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: card, start: "top 82%", once: true },
      });
      if (media) tl.to(media, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.15);
      if (info) tl.to(info, { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, 0.3);
    });
  }

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
      window.location.href = `mailto:hello@cosgral.agency?subject=${subject}&body=${body}`;

      status.dataset.state = "success";
      status.textContent = "Dziękujemy! Otworzyliśmy Twój program pocztowy z gotową wiadomością — wystarczy wysłać.";
      form.reset();
    });
  }
})();

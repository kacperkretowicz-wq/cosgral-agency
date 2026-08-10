/**
 * Homepage director — UI, hero intro, process highlight, form.
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");

  document.querySelectorAll("[data-faq-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".faq-item");
      var answer = item.querySelector(".faq-item__a");
      var isOpen = item.getAttribute("data-open") === "true";
      document.querySelectorAll(".faq-item[data-open='true']").forEach(function (other) {
        if (other !== item) {
          other.setAttribute("data-open", "false");
          other.querySelector("[data-faq-toggle]").setAttribute("aria-expanded", "false");
          other.querySelector(".faq-item__a").style.maxHeight = "";
        }
      });
      var next = !isOpen;
      item.setAttribute("data-open", String(next));
      btn.setAttribute("aria-expanded", String(next));
      answer.style.maxHeight = next ? answer.scrollHeight + "px" : "";
    });
  });

  var form = document.querySelector("[data-audit-form]");
  var status = document.querySelector("[data-audit-status]");
  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  function scrollFieldIntoView(el) {
    if (!MOBILE || !el || typeof el.getBoundingClientRect !== "function") return;
    var run = function () {
      var vv = window.visualViewport;
      var viewH = vv ? vv.height : window.innerHeight;
      var viewTop = vv ? vv.offsetTop : 0;
      var rect = el.getBoundingClientRect();
      var margin = 20;
      var targetBottom = viewTop + viewH - margin;
      if (rect.bottom > targetBottom) {
        var offset = rect.bottom - targetBottom + 12;
        var lenis = window.cosgralSmoothScroll?.lenis;
        if (lenis) {
          lenis.scrollTo(lenis.scroll + offset, { immediate: true });
        } else {
          window.scrollBy(0, offset);
        }
      } else if (rect.top < viewTop + margin) {
        var up = rect.top - (viewTop + margin) - 8;
        var lenisUp = window.cosgralSmoothScroll?.lenis;
        if (lenisUp) {
          lenisUp.scrollTo(lenisUp.scroll + up, { immediate: true });
        } else {
          window.scrollBy(0, up);
        }
      }
    };
    requestAnimationFrame(function () {
      requestAnimationFrame(run);
    });
  }

  if (form) {
    form.addEventListener("focusin", function (e) {
      if (window.cosgralSectionSnap?.setFormFocusLock) {
        window.cosgralSectionSnap.setFormFocusLock(true);
      }
      scrollFieldIntoView(e.target);
    });

    form.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!form.contains(document.activeElement)) {
          if (window.cosgralSectionSnap?.setFormFocusLock) {
            window.cosgralSectionSnap.setFormFocusLock(false);
          }
        }
      }, 80);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () {
        var active = document.activeElement;
        if (form.contains(active)) scrollFieldIntoView(active);
      });
    }
  }

  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var company = (data.get("company") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();
      var i18n = window.cosgralI18n;
      if (!email) {
        status.dataset.state = "error";
        status.textContent = (i18n && i18n.t("form.error_email")) || "Podaj adres email.";
        return;
      }
      var subjectLabel = (i18n && i18n.t("form.mailto_subject")) || "Bezpłatny audyt";
      var inquiryLabel = (i18n && i18n.t("form.mailto_inquiry")) || "zapytanie";
      var subject = encodeURIComponent(subjectLabel + " — " + (name || inquiryLabel));
      var body = encodeURIComponent(["Imię: " + (name || "-"), "Email: " + email, "Firma: " + (company || "-"), "", message || "(brak wiadomości)"].join("\n"));
      window.location.href = "mailto:kontakt@cosgral.pl?subject=" + subject + "&body=" + body;
      status.dataset.state = "success";
      status.textContent = (i18n && i18n.t("form.success_mailto")) || "Otworzyliśmy program pocztowy — wyślij wiadomość.";
      form.reset();
    });
  }

  if (REDUCED || !window.gsap) return;

  (async function () {
    await window.cosgralSmoothScroll?.ready;

    function restoreHeroUi() {
      var hero = document.getElementById("top");
      if (!hero) return;
      var heroContent = hero.querySelector(".home-hero__content");
      var heroScroll = hero.querySelector(".home-hero__scroll");
      var title = hero.querySelector(".home-hero__title");
      var letters = gsap.utils.toArray(".home-hero__letter");

      gsap.set(heroContent, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
      gsap.set(heroScroll, { autoAlpha: 1, opacity: 1 });
      gsap.set(letters, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" });
      gsap.set(".home-hero__tagline", { opacity: 1, y: 0 });
      if (title) {
        title.classList.add("is-revealed");
        gsap.set(title, { letterSpacing: "0.16em" });
      }
    }

    window.cosgralRestoreHero = restoreHeroUi;

    window.addEventListener("cosgral:section-step", function (e) {
      if (e.detail && e.detail.index === 0) restoreHeroUi();
    });

    function heroIntro() {
      var title = document.querySelector(".home-hero__title");
      var letters = gsap.utils.toArray(".home-hero__letter");
      if (!letters.length) return;

      gsap.set(letters, {
        opacity: 0,
        y: 28,
        scale: 1.04,
        filter: "blur(14px)",
      });
      if (title) gsap.set(title, { letterSpacing: "0.3em" });
      gsap.set(".home-hero__tagline", { y: 14, opacity: 0 });

      var tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      tl.from(".home-cube-portal", { scale: 0.34, opacity: 0, duration: 1.65, ease: "power3.out" }, 0)
        .to(
          title,
          { letterSpacing: "0.16em", duration: 2.1, ease: "power2.out" },
          0.12
        )
        .to(
          letters,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.45,
            stagger: { each: 0.1, from: "start" },
            ease: "power3.out",
          },
          0.28
        )
        .to(
          letters,
          {
            color: "rgba(255,255,255,1)",
            textShadow: "0 0 28px rgba(255,255,255,0.12), 0 8px 30px rgba(0,0,0,0.5)",
            duration: 1.1,
            stagger: { each: 0.08, from: "start" },
            ease: "sine.out",
          },
          0.55
        )
        .to(".home-hero__tagline", { opacity: 1, y: 0, duration: 1, ease: "power2.out" }, 1.15)
        .to(".home-hero__scroll", { opacity: 1, duration: 0.75, ease: "power2.out" }, 1.35)
        .add(function () {
          if (title) title.classList.add("is-revealed");
        });
    }

    if (document.body.classList.contains("is-ready")) heroIntro();
    else {
      new MutationObserver(function (_, obs) {
        if (document.body.classList.contains("is-ready")) {
          obs.disconnect();
          heroIntro();
        }
      }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    document.querySelectorAll(".home-process__step").forEach(function (step) {
      ScrollTrigger.create({
        trigger: step,
        start: "top 72%",
        end: "bottom 28%",
        onEnter: function () { step.classList.add("is-active"); },
        onEnterBack: function () { step.classList.add("is-active"); },
        onLeave: function () { step.classList.remove("is-active"); },
        onLeaveBack: function () { step.classList.remove("is-active"); },
      });
    });

    ScrollTrigger.refresh();
  })();
})();

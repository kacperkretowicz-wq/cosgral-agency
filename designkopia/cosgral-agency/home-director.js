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
  var contactContent = document.querySelector("[data-contact-content]");
  var successPanel = document.querySelector("[data-audit-success]");
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

  function resetContactSection() {
    if (contactContent) contactContent.hidden = false;
    if (successPanel) successPanel.hidden = true;
    if (form) form.reset();
    if (status) {
      status.dataset.state = "";
      status.textContent = "";
    }
    var submitBtn = form && form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
  }

  function showContactSuccess() {
    if (contactContent) contactContent.hidden = true;
    if (successPanel) successPanel.hidden = false;
    if (status) {
      status.dataset.state = "";
      status.textContent = "";
    }
  }

  window.addEventListener("cosgral:section-step", function (e) {
    if (e.detail && e.detail.id !== "kontakt") resetContactSection();
  });

  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var email = (data.get("email") || "").toString().trim();
      var i18n = window.cosgralI18n;
      if (!email) {
        status.dataset.state = "error";
        status.textContent = (i18n && i18n.t("form.error_email")) || "Podaj adres email.";
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      status.dataset.state = "";
      status.textContent = "";

      var params = new URLSearchParams();
      params.append("form-name", "audit-contact");
      ["name", "email", "company", "message", "bot-field"].forEach(function (key) {
        params.append(key, (data.get(key) || "").toString());
      });

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("send failed");
          showContactSuccess();
        })
        .catch(function () {
          status.dataset.state = "error";
          status.textContent =
            (i18n && i18n.t("form.error_send")) ||
            "Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na kontakt@cosgral.pl.";
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  if (REDUCED || !window.gsap) return;

  (async function () {
    await window.cosgralSmoothScroll?.ready;

    var heroIntroComplete = false;

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
      document.body.classList.add("is-hero-intro-done");
      document.body.classList.remove("is-hero-intro-active");
    }

    window.cosgralRestoreHero = restoreHeroUi;

    window.addEventListener("cosgral:section-step", function (e) {
      if (!heroIntroComplete) return;
      if (e.detail && e.detail.index === 0) restoreHeroUi();
    });

    /* Kolor docelowy liter bierzemy z motywu. GSAP potrzebuje konkretnej
       wartosci — nie animuje do var(--...) — wiec odczytujemy ja tuz przed
       animacja. */
    function heroLetterInk() {
      var v = getComputedStyle(document.documentElement)
        .getPropertyValue("--hero-letter-ink")
        .trim();
      return v || "rgba(255,255,255,1)";
    }

    function heroIntro() {
      var title = document.querySelector(".home-hero__title");
      var letters = gsap.utils.toArray(".home-hero__letter");
      if (!letters.length) return;

      document.body.classList.add("is-hero-intro-active");
      document.body.classList.remove("is-hero-intro-done");

      gsap.set(letters, {
        opacity: 0,
        y: 28,
        scale: 1.04,
        filter: "blur(14px)",
      });
      if (title) {
        title.classList.remove("is-revealed");
        gsap.set(title, { letterSpacing: "0.3em" });
      }
      gsap.set(".home-hero__tagline", { y: 14, opacity: 0 });
      gsap.set(".home-hero__scroll", { opacity: 0 });

      var tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: function () {
          heroIntroComplete = true;
          document.body.classList.add("is-hero-intro-done");
          document.body.classList.remove("is-hero-intro-active");
        },
      });
      tl.to(
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
            color: heroLetterInk(),
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

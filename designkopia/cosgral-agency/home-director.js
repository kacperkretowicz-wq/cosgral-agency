/**
 * Homepage director — GSAP + UI (globe hero, services fan, process, FAQ, form).
 */
(function () {
  "use strict";

  var REDUCED = document.documentElement.classList.contains("reduce-motion");

  var nav = document.getElementById("site-nav");
  var toggle = document.getElementById("nav-toggle");
  var overlay = document.getElementById("nav-overlay");

  function closeNav() {
    if (!nav) return;
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
    toggle.addEventListener("click", function () {
      nav.classList.contains("is-open") ? closeNav() : openNav();
    });
    overlay.querySelectorAll("[data-nav-close]").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

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
  if (form && status) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var company = (data.get("company") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();
      if (!email) {
        status.dataset.state = "error";
        status.textContent = "Podaj adres email.";
        return;
      }
      var subject = encodeURIComponent("Bezpłatny audyt — " + (name || "zapytanie"));
      var body = encodeURIComponent(["Imię: " + (name || "-"), "Email: " + email, "Firma: " + (company || "-"), "", message || "(brak wiadomości)"].join("\n"));
      window.location.href = "mailto:hello@cosgral.agency?subject=" + subject + "&body=" + body;
      status.dataset.state = "success";
      status.textContent = "Otworzyliśmy program pocztowy — wyślij wiadomość.";
      form.reset();
    });
  }

  var revealEls = document.querySelectorAll("[data-reveal]");
  if (REDUCED) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else if (!window.gsap) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  if (REDUCED || !window.gsap) return;

  (async function () {
    await window.cosgralSmoothScroll?.ready;

    function heroIntro() {
      var tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(".home-hero__globe-wrap", { scale: 0.55, opacity: 0, rotateY: -0.8, duration: 1.4 }, 0)
        .to(".home-hero__letter", {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 1,
          stagger: { each: 0.05, from: "center" },
        }, 0.2)
        .to(".home-hero__tagline", { opacity: 1, y: 0, duration: 0.8 }, 0.75)
        .to(".home-hero__scroll", { opacity: 1, duration: 0.6 }, 1);
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
        start: "top 68%",
        end: "bottom 32%",
        onEnter: function () { step.classList.add("is-active"); },
        onEnterBack: function () { step.classList.add("is-active"); },
        onLeave: function () { step.classList.remove("is-active"); },
        onLeaveBack: function () { step.classList.remove("is-active"); },
      });
    });

    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 48, filter: "blur(8px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
          onComplete: function () {
            el.classList.add("is-visible");
            el.style.filter = "";
            el.style.willChange = "";
          },
        }
      );
    });

    ScrollTrigger.refresh();
  })();
})();

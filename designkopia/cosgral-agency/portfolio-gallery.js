/**
 * COSGRAL V4 — portfolio grid (8 projects).
 */
(function () {
  "use strict";

  var grid = document.getElementById("work-grid");
  if (!grid) return;

  var lang = "pl";

  function tag(project) {
    return lang === "en" ? project.tagEn : project.tagPl;
  }

  function visitLabel() {
    return window.cosgralI18n ? window.cosgralI18n.t("work.visit") : "Zobacz live";
  }

  function render(projects) {
    grid.innerHTML = projects.map(function (p, i) {
      return (
        '<a class="work-card" href="' + p.url + '" target="_blank" rel="noopener noreferrer" data-reveal style="--i:' + i + '">' +
          '<div class="work-card__media"><img src="' + p.cover + '" alt="" loading="lazy" /></div>' +
          '<div class="work-card__body">' +
            '<span class="work-card__tag">' + tag(p) + '</span>' +
            '<h3 class="work-card__title">' + p.name + '</h3>' +
            '<span class="work-card__link">' + visitLabel() + ' →</span>' +
          '</div>' +
        '</a>'
      );
    }).join("");

    if (window.gsap && typeof ScrollTrigger !== "undefined") {
      gsap.utils.toArray("#work-grid [data-reveal]").forEach(function (el) {
        gsap.fromTo(
          el,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
          }
        );
      });
    }
  }

  fetch("portfolio/portfolio.json")
    .then(function (r) { return r.json(); })
    .then(function (data) { render(data.projects || []); })
    .catch(function () {});

  window.addEventListener("cosgral:langchange", function (e) {
    lang = e.detail.lang;
    fetch("portfolio/portfolio.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { render(data.projects || []); })
      .catch(function () {});
  });
})();

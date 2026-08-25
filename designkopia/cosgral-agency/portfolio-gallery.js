/**
 * COSGRAL V4 — portfolio (realizacje klientów z materiałów agencyjnych).
 */
(function () {
  "use strict";

  var grid = document.getElementById("work-grid");
  var statsEl = document.getElementById("work-stats");
  if (!grid) return;

  var lang = "pl";
  var portfolioData = null;

  function t(key, fallback) {
    return window.cosgralI18n ? window.cosgralI18n.t(key) : fallback;
  }

  function pick(obj, plKey, enKey) {
    return lang === "en" ? obj[enKey] : obj[plKey];
  }

  function projectField(project, field) {
    return lang === "en" ? project[field + "En"] : project[field + "Pl"];
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function serviceChips(project) {
    var services = projectField(project, "services") || [];
    return services
      .slice(0, 3)
      .map(function (s) {
        return '<span class="work-card__chip">' + escapeHtml(s) + "</span>";
      })
      .join("");
  }

  function cardMedia(project) {
    if (project.mediaType === "gallery" && project.gallery && project.gallery.length) {
      var thumbs = project.gallery
        .slice(0, 4)
        .map(function (src, i) {
          return (
            '<img class="work-card__gallery-thumb" src="' +
            src +
            '" alt="" loading="lazy" style="--gi:' +
            i +
            '" />'
          );
        })
        .join("");
      return (
        '<div class="work-card__media work-card__media--gallery">' +
        '<img src="' +
        project.cover +
        '" alt="" loading="lazy" />' +
        '<div class="work-card__gallery-strip" aria-hidden="true">' +
        thumbs +
        "</div>" +
        "</div>"
      );
    }

    if (project.mediaType === "video" && project.previewVideo) {
      return (
        '<div class="work-card__media work-card__media--video">' +
        '<img src="' +
        project.cover +
        '" alt="" loading="lazy" />' +
        '<video class="work-card__preview" muted loop playsinline preload="metadata" poster="' +
        project.cover +
        '">' +
        '<source src="' +
        project.previewVideo +
        '" type="video/mp4" />' +
        "</video>" +
        '<span class="work-card__play" aria-hidden="true">▶</span>' +
        "</div>"
      );
    }

    if (project.mediaType === "typographic") {
      var accent = project.accent || "#444";
      var initial = (project.name || "?").charAt(0);
      return (
        '<div class="work-card__media work-card__media--type" style="--client-accent:' +
        accent +
        '">' +
        '<span class="work-card__initial">' +
        escapeHtml(initial) +
        "</span>" +
        '<span class="work-card__type-grid" aria-hidden="true"></span>' +
        "</div>"
      );
    }

    if (project.cover) {
      return (
        '<div class="work-card__media">' +
        '<img src="' +
        project.cover +
        '" alt="" loading="lazy" />' +
        "</div>"
      );
    }

    return "";
  }

  function cardBody(project, isFeatured) {
    var desc = projectField(project, "desc");
    var visit =
      project.url && project.url.length
        ? '<span class="work-card__link">' + t("work.visit", "Zobacz live") + " →</span>"
        : '<span class="work-card__link work-card__link--muted">' +
          t("work.caseStudy", "Case study") +
          "</span>";

    return (
      '<div class="work-card__body">' +
      '<div class="work-card__meta">' +
      '<span class="work-card__tag">' +
      escapeHtml(projectField(project, "tag")) +
      "</span>" +
      (isFeatured ? '<span class="work-card__badge">' + t("work.featured", "Wyróżnione") + "</span>" : "") +
      "</div>" +
      '<h3 class="work-card__title">' +
      escapeHtml(project.name) +
      "</h3>" +
      (desc ? '<p class="work-card__desc">' + escapeHtml(desc) + "</p>" : "") +
      '<div class="work-card__chips">' +
      serviceChips(project) +
      "</div>" +
      visit +
      "</div>"
    );
  }

  function renderCard(project, index) {
    var isFeatured = !!project.featured;
    var href = project.url && project.url.length ? project.url : "#";
    var external = project.url && project.url.length;
    var linkAttrs = external
      ? ' href="' + href + '" target="_blank" rel="noopener noreferrer"'
      : ' href="' + href + '" data-case-card data-case-id="' + project.id + '"';

    return (
      '<a class="work-card' +
      (isFeatured ? " work-card--featured" : "") +
      '"' +
      linkAttrs +
      ' data-reveal style="--i:' +
      index +
      '">' +
      cardMedia(project) +
      cardBody(project, isFeatured) +
      "</a>"
    );
  }

  function renderStats(data) {
    if (!statsEl || !data.stats) return;
    statsEl.innerHTML =
      '<div class="work-stats__item"><span class="work-stats__value">' +
      escapeHtml(pick(data.stats, "countPl", "countEn")) +
      '</span><span class="work-stats__label">' +
      t("work.statsLabel", "zaufali nam") +
      '</span></div><div class="work-stats__divider" aria-hidden="true"></div><div class="work-stats__item"><span class="work-stats__value work-stats__value--sm">' +
      escapeHtml(pick(data.stats, "scopePl", "scopeEn")) +
      "</span></div>";
  }

  function bindVideoHover() {
    grid.querySelectorAll(".work-card__media--video").forEach(function (media) {
      var card = media.closest(".work-card");
      var video = media.querySelector("video");
      if (!card || !video) return;
      card.addEventListener("mouseenter", function () {
        video.currentTime = 0;
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      });
      card.addEventListener("mouseleave", function () {
        video.pause();
      });
      card.addEventListener("focusin", function () {
        video.currentTime = 0;
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      });
      card.addEventListener("focusout", function () {
        video.pause();
      });
    });
  }

  function bindCaseCards() {
    grid.querySelectorAll("[data-case-card]").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (card.getAttribute("href") === "#") e.preventDefault();
      });
    });
  }

  function animateReveal() {
    if (!window.gsap || typeof ScrollTrigger === "undefined") return;
    gsap.utils.toArray("#work-grid [data-reveal]").forEach(function (el) {
      gsap.fromTo(
        el,
        { opacity: 0, y: 48 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" },
        }
      );
    });
  }

  function render(data) {
    portfolioData = data;
    var projects = data.projects || [];
    renderStats(data);
    grid.innerHTML = projects.map(renderCard).join("");
    bindVideoHover();
    bindCaseCards();
    animateReveal();
  }

  fetch("portfolio-media/portfolio.json")
    .then(function (r) {
      return r.json();
    })
    .then(render)
    .catch(function () {});

  window.addEventListener("cosgral:langchange", function (e) {
    lang = e.detail.lang;
    if (portfolioData) render(portfolioData);
  });
})();

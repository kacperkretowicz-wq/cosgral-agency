/**
 * Portfolio montaż — video tile grid + full gallery + lightbox.
 */
(function () {
  "use strict";

  var tilesRoot = document.getElementById("reels-tiles");
  var galleryRoot = document.getElementById("reels-gallery");
  var lightbox = document.getElementById("reels-lightbox");

  function openLightbox(item, alt) {
    if (!lightbox) return;
    var video = lightbox.querySelector(".reels-lightbox__video");
    if (!video) return;
    video.src = item.full || item.src;
    if (item.poster) video.poster = item.poster;
    video.hidden = false;
    video.currentTime = 0;
    var play = video.play();
    if (play && play.catch) play.catch(function () {});
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    var video = lightbox.querySelector(".reels-lightbox__video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.hidden = true;
    }
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-lightbox-open");
  }

  function parseItem(el) {
    return {
      type: "video",
      src: el.getAttribute("data-reel-src"),
      full: el.getAttribute("data-reel-full") || el.getAttribute("data-reel-src"),
      poster: el.getAttribute("data-reel-poster") || "",
    };
  }

  function bindLightboxTriggers(root) {
    if (!root) return;
    root.querySelectorAll("[data-reel-src]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openLightbox(parseItem(btn), btn.getAttribute("data-reel-alt") || "");
      });
    });
  }

  function tileMarkup(item, i, opts) {
    opts = opts || {};
    var cls = "reels-tiles__card" + (opts.size ? " reels-tiles__card--" + opts.size : "");
    return (
      '<button type="button" class="' +
      cls +
      '" style="--i:' +
      i +
      '" data-reel-src="' +
      item.src +
      '" data-reel-full="' +
      (item.full || item.src) +
      '" data-reel-poster="' +
      (item.poster || "") +
      '" data-reel-alt="' +
      (item.client || "Rolka") +
      '">' +
      '<video src="' +
      item.src +
      '" poster="' +
      (item.poster || "") +
      '" muted loop playsinline autoplay preload="metadata"></video>' +
      "</button>"
    );
  }

  function renderTiles(data) {
    if (!tilesRoot || !data.collage || !data.collage.length) return;
    var sizes = ["sm", "lg", "md", "lg", "sm", "md", "lg", "sm"];
    var html = '<div class="reels-tiles__grid">';
    data.collage.forEach(function (item, i) {
      html += tileMarkup(item, i, { size: sizes[i % sizes.length] });
    });
    html += "</div>";
    tilesRoot.innerHTML = html;
    bindLightboxTriggers(tilesRoot);
    initTilesEntrance();
  }

  function initTilesEntrance() {
    var section = document.getElementById("montaz");
    var reduced = document.documentElement.classList.contains("reduce-motion");
    if (!section || reduced) {
      tilesRoot.classList.add("is-ready");
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tilesRoot.classList.add("is-ready");
          io.disconnect();
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(section);
  }

  function renderGallery(data) {
    if (!galleryRoot || !data.groups) return;
    var html = "";
    data.groups.forEach(function (group) {
      if (!group.items || !group.items.length) return;
      html +=
        '<section class="reels-gallery__group" id="' +
        group.id +
        '">' +
        '<header class="reels-gallery__head container">' +
        '<h2 class="reels-gallery__title">' +
        group.name +
        "</h2>" +
        '<p class="reels-gallery__count">' +
        group.items.length +
        " " +
        (group.items.length === 1 ? "rolka" : "rolek") +
        "</p>" +
        "</header>" +
        '<div class="reels-masonry container">';

      group.items.forEach(function (item, idx) {
        html +=
          '<button type="button" class="reels-masonry__item" data-reel-src="' +
          item.src +
          '" data-reel-full="' +
          (item.full || item.src) +
          '" data-reel-poster="' +
          (item.poster || "") +
          '" data-reel-alt="' +
          group.name +
          " " +
          (idx + 1) +
          '" style="--ar:' +
          (item.h / item.w).toFixed(4) +
          '">' +
          '<video src="' +
          item.src +
          '" poster="' +
          (item.poster || "") +
          '" muted loop playsinline autoplay preload="metadata"></video>' +
          "</button>";
      });

      html += "</div></section>";
    });

    galleryRoot.innerHTML = html;
    bindLightboxTriggers(galleryRoot);
  }

  function bindLightboxUi() {
    if (!lightbox) return;
    lightbox.querySelectorAll("[data-reel-close]").forEach(function (el) {
      el.addEventListener("click", closeLightbox);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  bindLightboxUi();

  fetch("portfolio/reels/manifest.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      renderTiles(data);
      renderGallery(data);
    })
    .catch(function (err) {
      console.warn("[portfolio-montaz]", err);
    });
})();

/**
 * Portfolio graphics — circular collage + masonry gallery + lightbox.
 */
(function () {
  "use strict";

  var collageRoot = document.getElementById("graphics-collage");
  var galleryRoot = document.getElementById("graphics-gallery");
  var lightbox = document.getElementById("graphics-lightbox");

  function mediaMarkup(item, opts) {
    opts = opts || {};
    var alt = item.client || "Grafika";
    if (item.type === "video") {
      return (
        '<video class="' +
        (opts.videoClass || "") +
        '" src="' +
        item.src +
        '" poster="' +
        (item.poster || "") +
        '" muted loop playsinline autoplay preload="metadata"></video>'
      );
    }
    return (
      '<img class="' +
      (opts.imgClass || "") +
      '" src="' +
      item.src +
      '" alt="' +
      alt +
      '" loading="lazy" decoding="async" />'
    );
  }

  function openLightbox(item, alt) {
    if (!lightbox) return;
    var img = lightbox.querySelector(".graphics-lightbox__img");
    var video = lightbox.querySelector(".graphics-lightbox__video");
    if (!img || !video) return;

    img.hidden = true;
    video.hidden = true;
    img.removeAttribute("src");
    video.pause();
    video.removeAttribute("src");

    if (item.type === "video") {
      video.src = item.full || item.src;
      if (item.poster) video.poster = item.poster;
      video.hidden = false;
      video.currentTime = 0;
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    } else {
      img.src = item.full || item.src;
      img.alt = alt || "";
      img.hidden = false;
    }

    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-lightbox-open");
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    var img = lightbox.querySelector(".graphics-lightbox__img");
    var video = lightbox.querySelector(".graphics-lightbox__video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.hidden = true;
    }
    if (img) {
      img.removeAttribute("src");
      img.hidden = true;
    }
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-lightbox-open");
  }

  function parseItem(el) {
    return {
      type: el.getAttribute("data-lightbox-type") || "image",
      src: el.getAttribute("data-lightbox-src"),
      full: el.getAttribute("data-lightbox-full") || el.getAttribute("data-lightbox-src"),
      poster: el.getAttribute("data-lightbox-poster") || "",
    };
  }

  function bindLightboxTriggers(root) {
    if (!root) return;
    root.querySelectorAll("[data-lightbox-src]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openLightbox(parseItem(btn), btn.getAttribute("data-lightbox-alt") || "");
      });
    });
  }

  function renderCollage(data) {
    if (!collageRoot || !data.collage || !data.collage.length) return;
    var count = data.collage.length;
    var ring = document.createElement("div");
    ring.className = "graphics-collage__ring";
    ring.style.setProperty("--count", String(count));

    var orbit = document.createElement("div");
    orbit.className = "graphics-collage__orbit";

    data.collage.forEach(function (item, i) {
      var card = document.createElement("figure");
      card.className = "graphics-collage__card";
      card.style.setProperty("--i", String(i));
      card.innerHTML = mediaMarkup(item, { imgClass: "graphics-collage__media", videoClass: "graphics-collage__media" });
      orbit.appendChild(card);
    });

    ring.appendChild(orbit);
    collageRoot.appendChild(ring);
    initCollageEntrance(ring);
  }

  function initCollageEntrance(ring) {
    var section = document.getElementById("grafiki");
    var reduced = document.documentElement.classList.contains("reduce-motion");

    if (!section || reduced) {
      collageRoot.classList.add("is-ready", "is-spinning");
      return;
    }

    var cards = ring.querySelectorAll(".graphics-collage__card");
    var done = 0;

    function maybeSpin() {
      done += 1;
      if (done >= cards.length) {
        window.setTimeout(function () {
          collageRoot.classList.add("is-spinning");
        }, 120);
      }
    }

    cards.forEach(function (card) {
      card.addEventListener("transitionend", function (e) {
        if (e.propertyName === "transform") maybeSpin();
      });
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          collageRoot.classList.add("is-ready");
          io.disconnect();
          window.setTimeout(maybeSpin, 1400);
        });
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );

    io.observe(section);
  }

  function itemAttrs(item, groupName, idx) {
    return (
      ' data-lightbox-type="' +
      (item.type || "image") +
      '" data-lightbox-src="' +
      item.src +
      '" data-lightbox-full="' +
      (item.full || item.src) +
      '" data-lightbox-poster="' +
      (item.poster || "") +
      '" data-lightbox-alt="' +
      groupName +
      " " +
      (idx + 1) +
      '"'
    );
  }

  function renderGallery(data) {
    if (!galleryRoot || !data.groups) return;
    var html = "";

    data.groups.forEach(function (group) {
      if (!group.items || !group.items.length) return;
      html +=
        '<section class="graphics-gallery__group" id="' +
        group.id +
        '">' +
        '<header class="graphics-gallery__head container">' +
        '<h2 class="graphics-gallery__title">' +
        group.name +
        "</h2>" +
        '<p class="graphics-gallery__count">' +
        group.items.length +
        " " +
        (group.items.length === 1 ? "grafika" : "grafik") +
        "</p>" +
        "</header>" +
        '<div class="graphics-masonry container">';

      group.items.forEach(function (item, idx) {
        var media =
          item.type === "video"
            ? '<video src="' +
              item.src +
              '" poster="' +
              (item.poster || "") +
              '" muted loop playsinline autoplay preload="metadata"></video>'
            : '<img src="' + item.src + '" alt="" loading="lazy" decoding="async" />';

        html +=
          '<button type="button" class="graphics-masonry__item' +
          (item.type === "video" ? " is-video" : "") +
          '"' +
          itemAttrs(item, group.name, idx) +
          ' style="--ar:' +
          (item.h / item.w).toFixed(4) +
          '">' +
          media +
          "</button>";
      });

      html += "</div></section>";
    });

    galleryRoot.innerHTML = html;
    bindLightboxTriggers(galleryRoot);
  }

  function bindLightboxUi() {
    if (!lightbox) return;
    lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", closeLightbox);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLightbox();
    });
  }

  bindLightboxUi();

  fetch("portfolio/graphics/manifest.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      renderCollage(data);
      renderGallery(data);
    })
    .catch(function (err) {
      console.warn("[portfolio-graphics]", err);
    });
})();

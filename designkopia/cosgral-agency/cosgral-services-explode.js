/**
 * Services grid "explode" interaction: clicking a tile shrinks it toward its
 * nearest corner, scatters the rest outward from the click point (artistic,
 * asymmetric — not a uniform mirror), and writes that service's full content
 * into the vacated center. The tiles never navigate; clicking anywhere reverses it.
 */
(function () {
  "use strict";

  var grid = document.querySelector(".services-art-grid");
  if (!grid) return;

  var tiles = Array.prototype.slice.call(grid.querySelectorAll(".art-tile"));
  if (tiles.length < 2) return;

  var reduced = document.documentElement.classList.contains("reduce-motion");
  var SCALE = 0.52;
  var active = null;

  var desc = document.createElement("div");
  desc.className = "services-explode__desc";
  desc.setAttribute("aria-live", "polite");
  desc.innerHTML =
    '<div class="services-explode__desc-inner">' +
    '<span class="micro services-explode__tag" data-role="tag"></span>' +
    '<h3 class="services-explode__title" data-role="title"></h3>' +
    '<p class="services-explode__lead" data-role="lead"></p>' +
    '<ul class="services-explode__list" data-role="list"></ul>' +
    '<p class="services-explode__effect" data-role="effect"></p>' +
    '<a class="services-explode__cta" href="#kontakt" data-role="cta"></a>' +
    "</div>";
  grid.appendChild(desc);

  var slot = {
    tag: desc.querySelector('[data-role="tag"]'),
    title: desc.querySelector('[data-role="title"]'),
    lead: desc.querySelector('[data-role="lead"]'),
    list: desc.querySelector('[data-role="list"]'),
    effect: desc.querySelector('[data-role="effect"]'),
    cta: desc.querySelector('[data-role="cta"]')
  };

  function t(key) {
    var i18n = window.cosgralI18n;
    return (i18n && i18n.t("services." + key)) || null;
  }

  function renderDesc(tile) {
    var n = tiles.indexOf(tile) + 1;
    var titleEl = tile.querySelector(".art-tile__label span");
    var tagEl = tile.querySelector(".art-tile__top span:last-child");

    slot.tag.textContent = tagEl ? tagEl.textContent : "";
    slot.title.textContent = titleEl ? titleEl.textContent : "";
    slot.lead.textContent = t("card" + n + "_desc") || "";
    slot.effect.textContent = t("card" + n + "_effect") || "";
    slot.cta.textContent = t("explode_cta") || "Kontakt";

    slot.list.textContent = "";
    var items = t("card" + n + "_items");
    if (Array.isArray(items)) {
      items.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        slot.list.appendChild(li);
      });
    }
  }

  function computeLayout(clicked) {
    var containerRect = grid.getBoundingClientRect();
    var cw = containerRect.width, ch = containerRect.height;
    var cx0 = cw / 2, cy0 = ch / 2;
    var margin = Math.max(10, Math.min(28, cw * 0.022));
    var cr = clicked.getBoundingClientRect();
    var kx = (cr.left - containerRect.left) + cr.width / 2;
    var ky = (cr.top - containerRect.top) + cr.height / 2;

    tiles.forEach(function (tile) {
      var r = tile.getBoundingClientRect();
      var tx = (r.left - containerRect.left) + r.width / 2;
      var ty = (r.top - containerRect.top) + r.height / 2;
      var scaledW = r.width * SCALE, scaledH = r.height * SCALE;
      var qx, qy, edgeOnly = false;

      if (tile === clicked) {
        if (Math.abs(tx - cx0) < r.width * 0.15) {
          // Middle-column tile: no natural nearby corner — send it across to
          // the opposite edge instead of just tucking it in where it stands.
          edgeOnly = true;
          qy = ty < cy0 ? 1 : -1;
        } else {
          qx = tx < cx0 ? -1 : 1;
          qy = ty < cy0 ? -1 : 1;
        }
      } else {
        var dx = tx - kx, dy = ty - ky;
        qx = dx === 0 ? (tx < cx0 ? -1 : 1) : (dx < 0 ? -1 : 1);
        qy = dy === 0 ? (ty < cy0 ? -1 : 1) : (dy < 0 ? -1 : 1);
      }

      var targetX, targetY;
      if (edgeOnly) {
        targetX = cx0;
        targetY = qy < 0 ? (margin + scaledH / 2) : (ch - margin - scaledH / 2);
      } else {
        targetX = qx < 0 ? (margin + scaledW / 2) : (cw - margin - scaledW / 2);
        targetY = qy < 0 ? (margin + scaledH / 2) : (ch - margin - scaledH / 2);
      }

      tile.style.setProperty("--explode-x", (targetX - tx) + "px");
      tile.style.setProperty("--explode-y", (targetY - ty) + "px");
      tile.style.setProperty("--explode-scale", String(SCALE));
    });
  }

  function open(tile) {
    active = tile;
    renderDesc(tile);
    if (!reduced) computeLayout(tile);
    tiles.forEach(function (el) { el.classList.toggle("is-active", el === tile); });
    grid.classList.add("is-exploded");
    tile.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (!active) return;
    active.removeAttribute("aria-expanded");
    grid.classList.remove("is-exploded");
    tiles.forEach(function (el) { el.classList.remove("is-active"); });
    active = null;
  }

  tiles.forEach(function (tile) {
    tile.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      // The content lives here now — a tile never navigates to a subpage.
      e.preventDefault();
      if (active) return; // expanded: let it bubble to the document handler, which closes
      e.stopPropagation();
      open(tile);
    });
  });

  document.addEventListener("click", function () { if (active) close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && active) close();
  });
  window.addEventListener("resize", function () {
    if (active && !reduced) computeLayout(active);
  }, { passive: true });
  window.addEventListener("cosgral:langchange", function () {
    if (active) renderDesc(active);
  });
})();

/**
 * Homepage systems — one editorial card per system.
 * Scroll progress (via portfolio-tiles) crossfades the cards.
 * A tap opens the full rewritten description.
 */
(function () {
  "use strict";

  var FILES = {
    "tfo-crm": "crm-mapa",
    "tfo-code39": "code39",
    "tfo-forecast": "prognozy",
    "trove-panel": "ceny-trove",
    "crm-leady": "crm-leady",
    "chatbot": "chatbot",
    "trove-flow": "zamowienie-faktura",
    "ai-agent": "agent-ai",
    "shelf": "shelf-sync",
    "kpi": "kpi",
    "network": "workflow"
  };

  var mount = document.querySelector("[data-systems-editorial]");
  if (!mount || !window.CosgralSystemsFan) return;

  var TOTAL = 11;
  var shown = [-1, -1];
  var warmed = {};
  var masters = null;
  var masterWait = [];
  var open = false;
  var openIndex = 0;
  var current = 0;
  var hideTimer = 0;
  var returnFocus = null;

  function langEn() {
    return window.cosgralI18n && window.cosgralI18n.getLang && window.cosgralI18n.getLang() === "en";
  }

  function cases() {
    return window.CosgralSystemsFan.getCases();
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function isInitial(src, dot) {
    if (src.charAt(dot) !== ".") return false;
    var k = dot - 1;
    if (k < 0) return false;
    var ch = src.charAt(k);
    var letter = (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z");
    if (!letter) return false;
    var prev = k > 0 ? src.charAt(k - 1) : " ";
    return prev === " " || prev === ".";
  }

  function brief(text) {
    var src = String(text || "").replace(/\s+/g, " ").trim();
    var out = "";
    var i = 0;
    while (i < src.length) {
      var dot = -1;
      var j;
      for (j = i; j < src.length; j++) {
        var c = src.charAt(j);
        if ((c === "." || c === "?" || c === "!") && !isInitial(src, j)) {
          dot = j;
          break;
        }
      }
      if (dot < 0) return out || src;
      var sentence = src.slice(i, dot + 1).trim();
      var next = out ? out + " " + sentence : sentence;
      if (out && next.length > 210) break;
      out = next;
      if (out.length >= 120) break;
      i = dot + 1;
      while (src.charAt(i) === " ") i++;
    }
    return out || src;
  }

  function fileOf(id) {
    return FILES[id] || id;
  }

  function urls(id) {
    var slug = fileOf(id);
    var full = "assets/systems/" + slug + ".webp";
    return {
      full: full,
      set: "assets/systems/" + slug + "-800.webp 800w, " + full + " 1600w"
    };
  }

  function whenMasters(cb) {
    if (masters !== null) {
      cb(masters);
      return;
    }
    masterWait.push(cb);
    if (masterWait.length > 1) return;
    fetch(urls("tfo-crm").full, { method: "HEAD" }).then(function (r) {
      masters = !!r.ok;
    }, function () {
      masters = false;
    }).then(function () {
      var q = masterWait.splice(0);
      q.forEach(function (fn) { fn(masters); });
    });
  }

  function bindImg(img, id) {
    var u = urls(id);
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    img.sizes = "(max-width: 900px) 92vw, 1100px";
    img.setAttribute("data-id", id);
    whenMasters(function (ok) {
      if (img.getAttribute("data-id") !== id) return;
      if (!ok) {
        img.removeAttribute("src");
        img.removeAttribute("srcset");
        img.classList.add("is-missing");
        return;
      }
      img.classList.remove("is-missing");
      img.setAttribute("data-fellback", "0");
      img.srcset = u.set;
      img.src = u.full;
    });
  }

  function warm(index) {
    var list = cases();
    if (index < 0 || index >= list.length || warmed[index]) return;
    warmed[index] = true;
    whenMasters(function (ok) {
      if (!ok) return;
      var im = new Image();
      im.decoding = "async";
      im.src = urls(list[index].id).full;
    });
  }

  function fillPane(pane, index) {
    var list = cases();
    var item = list[index];
    if (!item || !pane) return;
    var story = window.CosgralSystemsFan.storyOf(item) || [];
    var indexEl = pane.querySelector("[data-edit-index]");
    var clientEl = pane.querySelector("[data-edit-client]");
    var titleEl = pane.querySelector("[data-edit-title]");
    var sumEl = pane.querySelector("[data-edit-sum]");
    var img = pane.querySelector("img");
    var btn = pane.querySelector("button");
    if (indexEl) indexEl.textContent = pad(index + 1) + " / " + pad(TOTAL);
    if (clientEl) clientEl.textContent = item.client || item.tag || "";
    if (titleEl) titleEl.textContent = item.title || "";
    if (sumEl) sumEl.textContent = brief(story[0] || item.desc || "");
    if (img && img.getAttribute("data-id") !== item.id) {
      img.setAttribute("data-id", item.id);
      img.loading = "lazy";
      bindImg(img, item.id);
    }
    if (btn) {
      btn.setAttribute("data-edit-open", String(index));
      var read = langEn() ? "Read the system" : "Czytaj system";
      btn.setAttribute("aria-label", read + ": " + (item.title || ""));
    }
  }

  var stack = document.createElement("div");
  stack.className = "sys-edit__stack";
  mount.appendChild(stack);

  var panes = [0, 1].map(function (slot) {
    var pane = document.createElement("div");
    pane.className = "sys-edit__pane";
    pane.innerHTML =
      '<button type="button" class="sys-edit__card" data-edit-open>' +
        '<figure class="sys-edit__photo"><img alt="" width="1600" height="900" decoding="async" /></figure>' +
        '<div class="sys-edit__kicker">' +
          '<span data-edit-index>01 / 11</span>' +
          '<span class="sys-edit__client" data-edit-client></span>' +
        "</div>" +
        '<h3 class="sys-edit__title" data-edit-title></h3>' +
        '<p class="sys-edit__sum" data-edit-sum></p>' +
      "</button>";
    stack.appendChild(pane);
    pane.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-edit-open]");
      if (!btn || btn.getAttribute("data-suppress") === "1") return;
      var idx = parseInt(btn.getAttribute("data-edit-open") || "0", 10);
      openStory(isNaN(idx) ? 0 : idx);
    });
    var moved = false;
    var sx = 0;
    var sy = 0;
    pane.addEventListener("pointerdown", function (e) {
      moved = false;
      sx = e.clientX;
      sy = e.clientY;
      var btn = pane.querySelector("[data-edit-open]");
      if (btn) btn.setAttribute("data-suppress", "0");
    });
    pane.addEventListener("pointermove", function (e) {
      if (Math.abs(e.clientX - sx) > 14 || Math.abs(e.clientY - sy) > 14) moved = true;
    });
    pane.addEventListener("pointerup", function () {
      var btn = pane.querySelector("[data-edit-open]");
      if (btn) btn.setAttribute("data-suppress", moved ? "1" : "0");
    });
    var img = pane.querySelector("img");
    img.addEventListener("error", function () {
      if (img.getAttribute("data-fellback") !== "1") {
        img.setAttribute("data-fellback", "1");
        img.removeAttribute("srcset");
        var id = img.getAttribute("data-id");
        if (id) img.src = urls(id).full;
        return;
      }
      img.classList.add("is-missing");
    });
    if (slot === 1) {
      pane.style.opacity = "0";
      pane.style.pointerEvents = "none";
    }
    return pane;
  });

  function paint(t) {
    if (t < 0) t = 0;
    if (t > TOTAL - 1) t = TOTAL - 1;
    current = t;
    var i0 = Math.floor(t + 1e-4);
    if (i0 > TOTAL - 1) i0 = TOTAL - 1;
    var i1 = Math.min(TOTAL - 1, i0 + 1);
    var f = i0 === i1 ? 0 : t - i0;
    if (f < 0) f = 0;
    if (shown[0] !== i0) {
      shown[0] = i0;
      fillPane(panes[0], i0);
    }
    if (f > 0.004 && shown[1] !== i1) {
      shown[1] = i1;
      fillPane(panes[1], i1);
    }
    panes[0].style.opacity = String(1 - f);
    panes[0].style.transform = "translate3d(" + (-f * 7).toFixed(2) + "%,0,0)";
    panes[0].style.pointerEvents = f < 0.5 ? "auto" : "none";
    panes[1].style.opacity = f < 0.004 ? "0" : String(f);
    panes[1].style.transform = "translate3d(" + ((1 - f) * 7).toFixed(2) + "%,0,0)";
    panes[1].style.pointerEvents = f >= 0.5 ? "auto" : "none";
    warm(i0);
    if (f > 0.02) warm(i1);
    else if (i0 + 1 < TOTAL) warm(i0 + 1);
    if (i0 > 0) warm(i0 - 1);
  }

  var overlay = document.createElement("div");
  overlay.className = "sys-edit-overlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="sys-edit-overlay__sheet" role="dialog" aria-modal="true" aria-labelledby="sys-edit-title">' +
      '<div class="sys-edit-overlay__bar">' +
        '<span data-overlay-index>01 / 11</span>' +
        '<button type="button" class="sys-edit-overlay__close" data-overlay-close>Zamknij</button>' +
      "</div>" +
      '<h2 class="sys-edit-overlay__title" id="sys-edit-title" data-overlay-title></h2>' +
      '<p class="sys-edit-overlay__client" data-overlay-client></p>' +
      '<figure class="sys-edit-overlay__photo"><img alt="" width="1600" height="900" decoding="async" /></figure>' +
      '<div class="sys-edit-overlay__body" data-overlay-body></div>' +
    "</div>";
  document.body.appendChild(overlay);

  var overlayImg = overlay.querySelector("img");
  overlayImg.addEventListener("error", function () {
    if (overlayImg.getAttribute("data-fellback") !== "1") {
      overlayImg.setAttribute("data-fellback", "1");
      overlayImg.removeAttribute("srcset");
      var id = overlayImg.getAttribute("data-id");
      if (id) overlayImg.src = urls(id).full;
      return;
    }
    overlayImg.classList.add("is-missing");
  });

  function lenis() {
    return window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
  }

  var lockedY = 0;
  function lockScroll(on) {
    var scroller = lenis();
    if (on) {
      lockedY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.classList.add("is-sys-story-open");
      if (scroller && scroller.stop) scroller.stop();
      return;
    }
    document.documentElement.classList.remove("is-sys-story-open");
    if (scroller && scroller.start) scroller.start();
    var now = window.scrollY || window.pageYOffset || 0;
    if (Math.abs(now - lockedY) > 2) {
      if (scroller && scroller.scrollTo) scroller.scrollTo(lockedY, { immediate: true });
      else window.scrollTo(0, lockedY);
    }
  }

  function fillOverlay(index) {
    var list = cases();
    var item = list[index];
    if (!item) return;
    var story = window.CosgralSystemsFan.storyOf(item) || [];
    overlay.querySelector("[data-overlay-index]").textContent = pad(index + 1) + " / " + pad(TOTAL);
    overlay.querySelector("[data-overlay-title]").textContent = item.title || "";
    overlay.querySelector("[data-overlay-client]").textContent = item.client || item.tag || "";
    overlay.querySelector("[data-overlay-close]").textContent = langEn() ? "Close" : "Zamknij";
    var body = overlay.querySelector("[data-overlay-body]");
    body.textContent = "";
    story.forEach(function (para) {
      var p = document.createElement("p");
      p.textContent = para;
      body.appendChild(p);
    });
    if (overlayImg.getAttribute("data-id") !== item.id) {
      overlayImg.setAttribute("data-id", item.id);
      bindImg(overlayImg, item.id);
    }
  }

  function openStory(index) {
    openIndex = index;
    open = true;
    returnFocus = document.activeElement;
    fillOverlay(index);
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    }
    overlay.hidden = false;
    overlay.scrollTop = 0;
    lockScroll(true);
    window.requestAnimationFrame(function () {
      overlay.classList.add("is-in");
    });
    var closeBtn = overlay.querySelector("[data-overlay-close]");
    if (closeBtn) closeBtn.focus();
  }

  function closeStory() {
    if (!open) return;
    open = false;
    overlay.classList.remove("is-in");
    lockScroll(false);
    var back = returnFocus;
    returnFocus = null;
    hideTimer = window.setTimeout(function () {
      hideTimer = 0;
      if (!open) overlay.hidden = true;
    }, 520);
    if (back && back.focus) back.focus();
  }

  overlay.querySelector("[data-overlay-close]").addEventListener("click", closeStory);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeStory();
  });
  window.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeStory();
    }
  });
  overlay.addEventListener(
    "wheel",
    function (e) {
      var max = overlay.scrollHeight - overlay.clientHeight;
      if (max <= 1) {
        e.preventDefault();
        return;
      }
      var next = overlay.scrollTop + e.deltaY;
      if (next <= 0 || next >= max - 1) e.preventDefault();
    },
    { passive: false }
  );

  function refreshCopy() {
    shown[0] = -1;
    shown[1] = -1;
    if (overlayImg) overlayImg.removeAttribute("data-id");
    paint(current);
    if (open) fillOverlay(openIndex);
  }

  window.addEventListener("cosgral:langchange", refreshCopy);
  window.addEventListener("cosgral:i18n-ready", refreshCopy);

  paint(0);

  window.CosgralSystemsEditorial = {
    paint: paint,
    isOpen: function () {
      return open;
    },
    close: closeStory
  };
})();

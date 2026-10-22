/**
 * Systemy i automatyzacje — one row, no overlay, no clones.
 *
 * The three tiles the closed section shows ARE the carousel. Opening does not
 * build a second set and hand over to it; it widens the same row from three
 * cards to eleven, stepping the existing ones back to make room. Because no
 * element is ever swapped, hidden or re-created, there is no seam to animate
 * around — open and close are the same CSS state read in both directions.
 */
(function () {
  "use strict";

  var ACC = "#ff482b";

  /* ——— Card art + long copy per case id ——— */
  var ARTS = {
    "tfo-crm": { bg: "#141619", type: "orbit", label: "Wszystko.<br>W jednym.", lw: "300", ls: "clamp(1.1rem,2.4vw,2.4rem)" },
    "tfo-code39": { bg: "#0c0f15", type: "barcode", label: "SKANUJ.<br>GOTOWE.", lw: "700", ls: "clamp(1.2rem,2.6vw,2.6rem)" },
    "tfo-forecast": { bg: "#0f1219", type: "bars", label: "DANE<br>NA ŻYWO.", lw: "700", ls: "clamp(1.1rem,2.4vw,2.4rem)" },
    "trove-panel": { bg: "#121018", type: "panel", label: "JEDEN<br>PANEL.", lw: "800", ls: "clamp(1.3rem,2.8vw,2.8rem)" },
    "crm-leady": { bg: "#0d1320", type: "funnel", label: "OD LEADA<br>DO DEALA.", lw: "700", ls: "clamp(0.95rem,2vw,2.1rem)" },
    "chatbot": { bg: ACC, type: "bubble", label: "24/7.", lw: "800", ls: "clamp(2.4rem,5.5vw,5rem)", dark: true },
    "trove-flow": { bg: "#0a0d13", type: "flow", label: "ZAMÓWIENIE<br>→ PACZKA.", lw: "700", ls: "clamp(0.85rem,1.9vw,1.9rem)" },
    "ai-agent": { bg: "#0e0f17", type: "network", label: "ŁĄCZYMY<br>KANAŁY.", lw: "700", ls: "clamp(1.1rem,2.4vw,2.4rem)" },
    "shelf": { bg: "#111419", type: "shelf", label: "SHELF<br>SYNC.", lw: "800", ls: "clamp(1.4rem,3.2vw,3rem)" },
    "kpi": { bg: "#0d1015", type: "gauge", label: "KPI<br>LIVE.", lw: "800", ls: "clamp(1.7rem,3.8vw,3.4rem)" },
    "network": { bg: "#0b0e17", type: "nodegraph", label: "GRAF<br>WORKFLOW.", lw: "700", ls: "clamp(1.1rem,2.4vw,2.4rem)" }
  };

  function svgFor(type) {
    switch (type) {
      case "orbit":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 400 400" fill="none" aria-hidden="true">'
          + '<ellipse cx="200" cy="200" rx="166" ry="65" transform="rotate(-38 200 200)" stroke="currentColor" stroke-opacity=".45"/>'
          + '<ellipse cx="200" cy="200" rx="168" ry="84" transform="rotate(34 200 200)" stroke="currentColor" stroke-opacity=".15"/>'
          + '<path d="M24 200H376M200 30V370" stroke="currentColor" stroke-opacity=".1"/>'
          + '<circle cx="75" cy="265" r="7" fill="' + ACC + '"/>'
          + '<circle cx="313" cy="137" r="3" fill="currentColor" opacity=".55"/>'
          + '<circle cx="214" cy="194" r="13" stroke="currentColor" stroke-opacity=".55"/>'
          + '</svg>';
      case "barcode": {
        var bars = [5,14,22,26,34,38,46,54,62,70,76,82,90,96,104,110,118,126,134,140,148,154,162,170,178,186,194,198];
        return '<svg class="sys-ed-art-svg" viewBox="0 0 210 200" fill="none" aria-hidden="true">'
          + bars.map(function (x, i) {
              return '<rect x="' + x + '" y="25" width="' + ((i % 3 === 1) ? 3 : 1.5) + '" height="150" fill="'
                + ((i % 5 === 0) ? ACC : "currentColor") + '" opacity="' + ((i % 3 === 2) ? 0.3 : 0.85) + '"/>';
            }).join("")
          + '</svg>';
      }
      case "bars":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + [[28,90],[55,65],[82,110],[109,45],[136,130],[163,55]].map(function (b, i) {
              return '<rect x="' + b[0] + '" y="' + (178 - b[1]) + '" width="18" height="' + b[1] + '" rx="2" fill="'
                + (i === 3 ? ACC : "currentColor") + '" opacity="' + (i === 3 ? 1 : 0.55) + '"/>';
            }).join("")
          + '<path d="M22 178H178" stroke="currentColor" stroke-opacity=".35"/></svg>';
      case "panel":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<rect x="18" y="28" width="164" height="144" rx="6" stroke="currentColor" stroke-opacity=".42"/>'
          + '<line x1="18" y1="55" x2="182" y2="55" stroke="currentColor" stroke-opacity=".35"/>'
          + '<rect x="28" y="66" width="55" height="7" rx="2" fill="currentColor" fill-opacity=".35"/>'
          + '<rect x="28" y="79" width="85" height="5" rx="2" fill="currentColor" fill-opacity=".2"/>'
          + '<rect x="28" y="90" width="65" height="5" rx="2" fill="currentColor" fill-opacity=".2"/>'
          + '<rect x="28" y="120" width="50" height="18" rx="3" fill="' + ACC + '" opacity=".55"/>'
          + '<circle cx="170" cy="41" r="4" fill="' + ACC + '"/></svg>';
      case "funnel":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<path d="M25 38H175L132 108H68Z" stroke="currentColor" stroke-opacity=".42" fill="currentColor" fill-opacity=".1"/>'
          + '<line x1="68" y1="108" x2="88" y2="162" stroke="currentColor" stroke-opacity=".42"/>'
          + '<line x1="132" y1="108" x2="112" y2="162" stroke="currentColor" stroke-opacity=".42"/>'
          + '<circle cx="100" cy="170" r="8" fill="' + ACC + '"/>'
          + '<circle cx="55" cy="46" r="4" fill="currentColor" fill-opacity=".5"/>'
          + '<circle cx="100" cy="46" r="4" fill="currentColor" fill-opacity=".5"/>'
          + '<circle cx="145" cy="46" r="4" fill="currentColor" fill-opacity=".5"/></svg>';
      case "bubble":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<rect x="16" y="24" width="115" height="58" rx="14" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".35"/>'
          + '<rect x="27" y="39" width="65" height="8" rx="2" fill="currentColor" fill-opacity=".28"/>'
          + '<rect x="27" y="53" width="45" height="6" rx="2" fill="currentColor" fill-opacity=".18"/>'
          + '<rect x="69" y="106" width="115" height="58" rx="14" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-opacity=".28"/>'
          + '<rect x="80" y="120" width="70" height="8" rx="2" fill="currentColor" fill-opacity=".22"/></svg>';
      case "flow":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<rect x="8" y="48" width="44" height="26" rx="4" stroke="currentColor" stroke-opacity=".42"/>'
          + '<rect x="78" y="48" width="44" height="26" rx="4" stroke="currentColor" stroke-opacity=".42"/>'
          + '<rect x="148" y="48" width="44" height="26" rx="4" stroke="' + ACC + '"/>'
          + '<path d="M52 61H78M122 61H148" stroke="currentColor" stroke-opacity=".42"/>'
          + '<path d="M170 74v18" stroke="' + ACC + '"/>'
          + '<circle cx="170" cy="100" r="5" fill="' + ACC + '" opacity=".7"/></svg>';
      case "network":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<circle cx="30" cy="100" r="8" stroke="currentColor" stroke-opacity=".42"/>'
          + '<circle cx="100" cy="45" r="8" fill="' + ACC + '" fill-opacity=".2" stroke="' + ACC + '"/>'
          + '<circle cx="100" cy="155" r="8" stroke="currentColor" stroke-opacity=".42"/>'
          + '<circle cx="170" cy="100" r="8" stroke="currentColor" stroke-opacity=".42"/>'
          + '<path d="M38 100L92 45M38 100L92 155M108 45L162 100M108 155L162 100" stroke="currentColor" stroke-opacity=".18"/>'
          + '<circle cx="100" cy="100" r="16" stroke="currentColor" stroke-opacity=".4"/>'
          + '<circle cx="100" cy="100" r="5" fill="' + ACC + '" opacity=".7"/></svg>';
      case "shelf":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<line x1="18" y1="58" x2="182" y2="58" stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>'
          + '<line x1="18" y1="108" x2="182" y2="108" stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>'
          + '<line x1="18" y1="158" x2="182" y2="158" stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>'
          + '<rect x="28" y="68" width="16" height="40" rx="2" fill="currentColor" fill-opacity=".28"/>'
          + '<rect x="67" y="64" width="20" height="44" rx="2" fill="' + ACC + '" opacity=".58"/>'
          + '<rect x="113" y="68" width="18" height="40" rx="2" fill="currentColor" fill-opacity=".22"/></svg>';
      case "gauge":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<path d="M28 142A86 86 0 0 1 172 142" stroke="currentColor" stroke-opacity=".18" stroke-width="14" stroke-linecap="round"/>'
          + '<path d="M28 142A86 86 0 0 1 148 68" stroke="' + ACC + '" stroke-width="14" stroke-linecap="round"/>'
          + '<line x1="100" y1="142" x2="144" y2="74" stroke="currentColor" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>'
          + '<circle cx="100" cy="142" r="4" fill="currentColor" fill-opacity=".65"/></svg>';
      case "nodegraph":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<circle cx="100" cy="100" r="14" stroke="' + ACC + '"/>'
          + '<circle cx="38" cy="58" r="7" stroke="currentColor" stroke-opacity=".42"/>'
          + '<circle cx="162" cy="58" r="7" stroke="currentColor" stroke-opacity=".42"/>'
          + '<circle cx="38" cy="142" r="7" stroke="currentColor" stroke-opacity=".42"/>'
          + '<circle cx="162" cy="142" r="7" stroke="currentColor" stroke-opacity=".42"/>'
          + '<path d="M45 62L88 90M155 62L112 90M45 138L88 110M155 138L112 110" stroke="currentColor" stroke-opacity=".18"/></svg>';
      default:
        return "";
    }
  }

  var row = document.querySelector(".sys-ed-showcase");
  var chapter = row && row.closest("[data-portfolio-tile]");
  var cases = window.CosgralSystemsFan && window.CosgralSystemsFan.cases;
  if (!row || !chapter || !cases || !cases.length) return;

  var LONG = {};
  cases.forEach(function (c) { LONG[c.id] = c.long || c.desc || ""; });

  /* The three the closed section shows sit in the middle of the row, so opening
     spreads the rest to both sides instead of pushing everything one way. */
  var lead = cases.slice(0, 3);
  var rest = cases.slice(3);
  var left = rest.slice(0, Math.floor(rest.length / 2));
  var ordered = left.concat(lead, rest.slice(left.length));
  var LEAD_START = left.length;
  var CENTER = LEAD_START + 1;

  function buildCard(item, caseIdx, pos) {
    var art = ARTS[item.id] || { bg: "#141619", type: "orbit", label: item.title, lw: "400", ls: "clamp(1rem,2.4vw,2.2rem)" };
    var num = (caseIdx + 1 < 10 ? "0" : "") + (caseIdx + 1);
    var tag = item.tag.split("/")[0].trim().toUpperCase();
    var isLead = pos >= LEAD_START && pos < LEAD_START + 3;

    var card = document.createElement("div");
    card.className = "sys-ed-tile" + (isLead ? " is-lead" : "");
    card.dataset.pos = String(pos);
    card.style.background = art.bg;
    if (art.dark) card.style.color = "#130b09";
    card.innerHTML =
      '<div class="sys-ed-tile__top"><span>' + num + ' / SYS</span><span>' + tag + '</span></div>'
      + '<div class="sys-ed-tile__art">' + svgFor(art.type)
      +   '<strong class="sys-ed-exp-type" style="font-weight:' + art.lw + ';font-size:' + art.ls + '">' + art.label + '</strong>'
      + '</div>'
      + '<div class="sys-ed-tile__foot">'
      +   '<div class="sys-ed-tile__label"><span>' + item.title + '</span><i aria-hidden="true">↗︎</i></div>'
      +   '<div class="sys-ed-tile__copy">'
      +     '<p class="sys-ed-tile__desc">' + item.desc + '</p>'
      +     '<span class="sys-ed-tile__more">Zobacz więcej ↓</span>'
      +   '</div>'
      + '</div>'
      + '<div class="sys-ed-tile__long"><div class="sys-ed-tile__long-inner"><p>' + LONG[item.id] + '</p></div></div>';
    return card;
  }

  row.textContent = "";
  var cards = ordered.map(function (item, pos) {
    var card = buildCard(item, cases.indexOf(item), pos);
    row.appendChild(card);
    return card;
  });

  var open = false;
  var readingPos = -1;

  /* Presence is a continuous function of distance from the row's centre, so
     dragging feels physical instead of snapping between two states. */
  var focusRaf = 0;
  function paintFocus() {
    focusRaf = 0;
    if (!open) {
      cards.forEach(function (c) { c.style.removeProperty("--focus"); });
      return;
    }
    var mid = row.scrollLeft + row.clientWidth / 2;
    cards.forEach(function (c) {
      var d = Math.abs((c.offsetLeft + c.offsetWidth / 2) - mid) / c.offsetWidth;
      c.style.setProperty("--focus", String(Math.max(0, 1 - d * 0.62).toFixed(3)));
    });
  }
  function queueFocus() {
    if (!focusRaf) focusRaf = requestAnimationFrame(paintFocus);
  }

  function centerOn(pos, smooth) {
    var c = cards[pos];
    if (!c) return;
    row.scrollTo({
      left: c.offsetLeft + c.offsetWidth / 2 - row.clientWidth / 2,
      behavior: smooth ? "smooth" : "auto"
    });
  }

  function setReading(pos) {
    if (readingPos === pos) return;
    if (readingPos > -1 && cards[readingPos]) cards[readingPos].classList.remove("is-reading");
    readingPos = pos;
    row.classList.toggle("is-reading", pos > -1);
    if (pos > -1) {
      cards[pos].classList.add("is-reading");
      centerOn(pos, true);
    } else {
      row.scrollTop = 0;
    }
  }

  function setOpen(next) {
    if (next === open) return;
    open = next;
    setReading(-1);
    row.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("is-systems-row-open", open);
    /* Reuses the catalogue's own contract so chapter nav + loops stand down */
    window.dispatchEvent(new CustomEvent(open ? "portfolio-expand-open" : "portfolio-expand-close", {
      detail: { key: "systems" }
    }));
    if (open) {
      /* Jump to the centre before the widening starts, so the three cards the
         section was already showing stay exactly where the eye left them. */
      void row.offsetWidth;
      centerOn(CENTER, false);
      paintFocus();
      requestAnimationFrame(function () {
        centerOn(CENTER, false);
        paintFocus();
      });
    } else {
      cards.forEach(function (c) { c.style.removeProperty("--focus"); });
    }
  }

  cards.forEach(function (card, pos) {
    card.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!open) { setOpen(true); return; }
      if (readingPos === pos) { setReading(-1); return; }
      setReading(pos);
    });
  });

  row.addEventListener("scroll", queueFocus, { passive: true });
  window.addEventListener("resize", function () {
    if (open) queueFocus();
  }, { passive: true });

  /* The section's own affordances open the row; Escape and the back control
     close it. Nothing else in the page needs to know about this state. */
  chapter.querySelectorAll("[data-systems-open]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    }, true);
  });

  document.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (readingPos > -1) setReading(-1);
      else setOpen(false);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      centerOn(Math.min(cards.length - 1, nearestPos() + 1), true);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      centerOn(Math.max(0, nearestPos() - 1), true);
    }
  });

  function nearestPos() {
    var mid = row.scrollLeft + row.clientWidth / 2;
    var best = 0, bestD = Infinity;
    cards.forEach(function (c, i) {
      var d = Math.abs((c.offsetLeft + c.offsetWidth / 2) - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  /* Leaving the chapter puts the row back without any exit choreography */
  new MutationObserver(function () {
    if (!chapter.classList.contains("is-active") && open) setOpen(false);
  }).observe(chapter, { attributes: true, attributeFilter: ["class"] });

  window.cosgralSystemsRow = {
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    isOpen: function () { return open; }
  };
})();

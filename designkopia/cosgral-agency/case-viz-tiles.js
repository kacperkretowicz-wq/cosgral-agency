/* Interactive visualization tiles for automation case subpages */
(() => {
  const reduce =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function initParallax(tile, stage) {
    if (reduce) return;
    const layer = stage.querySelector(".case-viz-layer");
    if (!layer) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tx = x * 14;
      ty = y * 10;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          layer.style.setProperty("--mx", tx.toFixed(2) + "px");
          layer.style.setProperty("--my", ty.toFixed(2) + "px");
          raf = 0;
        });
      }
    });
    stage.addEventListener("pointerleave", () => {
      layer.style.setProperty("--mx", "0px");
      layer.style.setProperty("--my", "0px");
    });
  }

  function initBars(root) {
    const cols = [...root.querySelectorAll(".viz-bars__col")];
    cols.forEach((col, i) => {
      const fill = col.querySelector(".viz-bars__fill");
      if (!fill) return;
      const base = Number(col.dataset.h || 40 + ((i * 17) % 50));
      fill.style.setProperty("--h", base + "%");
      col.addEventListener("pointerenter", () => {
        cols.forEach((c) => c.classList.remove("is-hot"));
        col.classList.add("is-hot");
        fill.style.setProperty("--h", Math.min(96, base + 18) + "%");
      });
      col.addEventListener("pointerleave", () => {
        fill.style.setProperty("--h", base + "%");
      });
      col.addEventListener("click", () => {
        fill.style.setProperty("--h", (30 + Math.random() * 65).toFixed(0) + "%");
      });
    });
  }

  function initPrices(root) {
    root.querySelectorAll(".viz-price-grid__cell").forEach((cell) => {
      cell.addEventListener("click", () => {
        cell.classList.toggle("is-alert");
        const strong = cell.querySelector("strong");
        if (!strong || !cell.dataset.price) return;
        const base = Number(cell.dataset.price);
        const drop = cell.classList.contains("is-alert");
        strong.textContent = (drop ? base * 0.92 : base).toFixed(2).replace(".", ",") + " zł";
      });
    });
  }

  function initAlerts(root) {
    const rows = [...root.querySelectorAll(".viz-alert-feed__row")];
    let i = 0;
    const tick = () => {
      rows.forEach((r, idx) => r.classList.toggle("is-on", idx <= i));
      i = (i + 1) % rows.length;
    };
    tick();
    if (!reduce) setInterval(tick, 1600);
    root.addEventListener("click", tick);
  }

  function initGauge(root) {
    const needle = root.querySelector(".viz-gauge__needle");
    const value = root.querySelector(".viz-gauge__value");
    if (!needle) return;
    const set = (p) => {
      const angle = -70 + p * 140;
      needle.style.setProperty("--angle", angle.toFixed(1) + "deg");
      if (value) value.textContent = Math.round(p * 100) + "%";
    };
    set(0.62);
    root.addEventListener("pointermove", (e) => {
      const r = root.getBoundingClientRect();
      set(clamp((e.clientX - r.left) / r.width, 0.05, 0.95));
    });
    root.addEventListener("click", () => set(0.35 + Math.random() * 0.55));
  }

  function initTimeline(root) {
    const track = root.querySelector(".viz-timeline__track");
    if (!track) return;
    const set = (p) => {
      const v = clamp(p, 0.02, 0.98);
      track.style.setProperty("--p", (v * 100).toFixed(1) + "%");
    };
    const fromEvent = (e) => {
      const r = track.getBoundingClientRect();
      set((e.clientX - r.left) / r.width);
    };
    track.addEventListener("pointerdown", (e) => {
      track.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    track.addEventListener("pointermove", (e) => {
      if (track.hasPointerCapture(e.pointerId)) fromEvent(e);
    });
  }

  function initSteps(root) {
    const nodes = [...root.querySelectorAll(".viz-steps__node")];
    let i = 0;
    const paint = () => nodes.forEach((n, idx) => n.classList.toggle("is-on", idx <= i));
    paint();
    nodes.forEach((n, idx) => n.addEventListener("click", () => { i = idx; paint(); }));
    root.addEventListener("click", (e) => {
      if (e.target.closest(".viz-steps__node")) return;
      i = (i + 1) % nodes.length;
      paint();
    });
  }

  function initPipe(root) {
    const cards = [...root.querySelectorAll(".viz-pipe__card")];
    const cols = [...root.querySelectorAll(".viz-pipe__col")];
    cards.forEach((card) => {
      card.draggable = true;
      card.addEventListener("dragstart", (e) => {
        card.classList.add("is-lift");
        e.dataTransfer.setData("text/plain", "card");
        e.dataTransfer.effectAllowed = "move";
        root._drag = card;
      });
      card.addEventListener("dragend", () => card.classList.remove("is-lift"));
      card.addEventListener("click", () => {
        const col = card.parentElement;
        const next = cols[(cols.indexOf(col) + 1) % cols.length];
        if (next) next.appendChild(card);
      });
    });
    cols.forEach((col) => {
      col.addEventListener("dragover", (e) => e.preventDefault());
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        if (root._drag) col.appendChild(root._drag);
      });
    });
  }

  function initChat(root) {
    const bubbles = [...root.querySelectorAll(".viz-chat__bubble")];
    const buttons = [...root.querySelectorAll("[data-chat-step]")];
    let step = 0;
    const show = () => {
      bubbles.forEach((b, i) => b.classList.toggle("is-on", i <= step));
    };
    show();
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        step = Math.min(bubbles.length - 1, Number(btn.dataset.chatStep) || step + 1);
        show();
      });
    });
    root.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      step = (step + 1) % bubbles.length;
      show();
    });
  }

  function initMap(root) {
    const pins = [...root.querySelectorAll(".viz-map__pin")];
    pins.forEach((pin) => {
      pin.addEventListener("click", () => {
        pins.forEach((p) => p.classList.remove("is-on"));
        pin.classList.add("is-on");
      });
    });
    if (pins[0]) pins[0].classList.add("is-on");
  }

  function initBarcode(root) {
    const input = root.querySelector(".viz-barcode__input");
    const bars = root.querySelector(".viz-barcode__bars");
    if (!input || !bars) return;
    const render = () => {
      const raw = (input.value || "COSGRAL").toUpperCase().replace(/[^A-Z0-9\- ]/g, "").slice(0, 14);
      input.value = raw;
      const seed = raw || "X";
      bars.innerHTML = "";
      for (let i = 0; i < 42; i++) {
        const code = seed.charCodeAt(i % seed.length);
        const w = 1 + (code + i * 3) % 4;
        const tall = (code + i) % 5 !== 0;
        const el = document.createElement("i");
        el.style.setProperty("--w", w + "px");
        el.style.opacity = tall ? "1" : "0";
        bars.appendChild(el);
      }
    };
    input.addEventListener("input", render);
    render();
  }

  function initChart(root) {
    const svg = root.querySelector("svg");
    const probe = root.querySelector(".viz-chart__probe");
    const line = root.querySelector(".viz-chart__line");
    if (!svg || !probe || !line) return;
    const points = (line.getAttribute("d") || "")
      .replace(/[MLHVCSQTAZmlhvcsqtaz,]/g, " ")
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    const pairs = [];
    for (let i = 0; i + 1 < points.length; i += 2) pairs.push([points[i], points[i + 1]]);
    if (!pairs.length) return;
    root.addEventListener("pointermove", (e) => {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 320;
      let best = pairs[0];
      let bestDist = Infinity;
      pairs.forEach((p) => {
        const d = Math.abs(p[0] - x);
        if (d < bestDist) {
          bestDist = d;
          best = p;
        }
      });
      probe.setAttribute("cx", best[0]);
      probe.setAttribute("cy", best[1]);
    });
  }

  function initKpi(root) {
    root.querySelectorAll(".viz-kpi__card b").forEach((el) => {
      const target = Number(el.dataset.to || el.textContent.replace(/\D/g, "")) || 0;
      const suffix = el.dataset.suffix || "";
      const prefix = el.dataset.prefix || "";
      if (reduce) {
        el.textContent = prefix + target + suffix;
        return;
      }
      let t0 = null;
      const dur = 900;
      const step = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          requestAnimationFrame(step);
          io.disconnect();
        }
      }, { threshold: 0.4 });
      io.observe(root);
    });
  }

  const booters = {
    bars: initBars,
    prices: initPrices,
    alerts: initAlerts,
    gauge: initGauge,
    timeline: initTimeline,
    steps: initSteps,
    pipe: initPipe,
    chat: initChat,
    map: initMap,
    barcode: initBarcode,
    chart: initChart,
    kpi: initKpi,
    orbit: () => {},
  };

  function enhanceTile(tile) {
    const stage = tile.querySelector(".case-viz-tile__stage");
    if (!stage) return;
    initParallax(tile, stage);
    const type = stage.dataset.viz;
    const widget = stage.querySelector(".viz-widget");
    if (type && booters[type] && widget) booters[type](widget);
  }

  const tiles = [...document.querySelectorAll(".case-viz-tile")];
  if (!tiles.length) return;

  tiles.forEach(enhanceTile);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const tile = entry.target;
        if (entry.isIntersecting) {
          tile.classList.add("is-entered", "is-active");
        } else {
          tile.classList.remove("is-active");
        }
      });
    },
    { threshold: 0.45, rootMargin: "-10% 0px -10% 0px" }
  );
  tiles.forEach((t) => io.observe(t));
})();

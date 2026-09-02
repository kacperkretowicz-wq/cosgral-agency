/**
 * Usługi — interaktywna karuzela (klik / swipe), bez zmiany kafelków scrollem.
 */
(function () {
  "use strict";

  var section = document.getElementById("uslugi");
  var fan = document.querySelector("[data-services-fan]");
  var stage = document.querySelector("[data-fan-stage]");
  if (!section || !fan || !stage) return;

  var cards = Array.prototype.slice.call(fan.querySelectorAll(".services-fan__card"));
  var counter = document.querySelector("[data-fan-counter]");
  var progressBar = document.querySelector("[data-fan-progress]");
  var hint = document.querySelector("[data-fan-hint]");
  var btnPrev = document.querySelector("[data-fan-prev]");
  var btnNext = document.querySelector("[data-fan-next]");
  var total = cards.length;
  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var index = 0;
  var targetPos = 0;
  var displayPos = 0;
  var LERP = REDUCED ? 1 : MOBILE ? 0.16 : 0.13;
  var CENTER_SCALE = MOBILE ? 1.05 : 1.1;
  var touchStartX = 0;
  var touchStartY = 0;
  var touchAxis = null;
  var touchTracking = false;
  var SWIPE_MIN_DX = MOBILE ? 36 : 40;
  var SWIPE_AXIS_LOCK = 10;
  var hintHidden = false;
  var tapHintTimer = null;
  var tapHintVisible = false;
  var TAP_HINT_MS = 3000;
  var wheelAccumX = 0;
  var wheelCooldown = false;
  var lastNavAt = 0;
  var NAV_COOLDOWN_MS = 620;
  var WHEEL_THRESHOLD = 165;
  var HORIZONTAL_RATIO = 2.4;
  var wheelDecayTimer = null;

  function isUslugiActive() {
    var snapIdx = window.cosgralSectionSnap?.getIndex?.();
    if (snapIdx === 1) return true;
    if (section.classList.contains("is-in-view")) return true;
    if (section.classList.contains("is-visible") || section.classList.contains("is-entered")) {
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < vh * 0.62 && rect.bottom > vh * 0.28;
    }
    return false;
  }

  function playActiveCardVideo() {
    var card = cards[index];
    var video = card && card.querySelector("video");
    if (!video) return;

    var pierwszePodpiecie = !video.getAttribute("src");
    ensureVideoSrc(video);

    function start() {
      video.play().catch(function () {});
    }
    // ensureVideoSrc() wola load(), ktore przerywa trwajace play(). Wczesniej nie
    // bylo to widoczne, bo layout() krecil sie w kolko i kolejny obrot ponawial
    // odtwarzanie; teraz wolamy to raz, wiec przy pierwszym podpieciu zrodla
    // czekamy, az element bedzie mial dane.
    if (pierwszePodpiecie) video.addEventListener("loadeddata", start, { once: true });
    start();
  }

  function setUslugiActive(active) {
    section.classList.toggle("is-in-view", !!active);
    if (active) {
      document.documentElement.classList.add("is-sand-stream");
      showTapHint();
      // layout() samo z siebie moze sie juz nie wykonac, a film ma ruszyc
      // dokladnie wtedy, gdy sekcja wchodzi w kadr.
      playActiveCardVideo();
    }
  }

  window.addEventListener("cosgral:section-step", function (e) {
    var id = e.detail && e.detail.id;
    setUslugiActive(id === "uslugi");
  });

  var HOMES = [
    { x: -0.72, y: 0.48, scale: 0.28, rot: -14 },
    { x: 0.74, y: -0.42, scale: 0.24, rot: 17 },
    { x: -0.58, y: -0.52, scale: 0.22, rot: -10 },
    { x: 0.62, y: 0.5, scale: 0.26, rot: 12 },
    { x: -0.8, y: 0.06, scale: 0.2, rot: -18 },
    { x: 0.82, y: 0.18, scale: 0.23, rot: 16 },
  ];

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function wrapPos(p) {
    var x = p % total;
    if (x < 0) x += total;
    return x;
  }

  function shortestDelta(from, to) {
    return ((to - from) % total + total * 1.5) % total - total * 0.5;
  }

  function wrapOffset(i, position) {
    var o = i - wrapPos(position);
    while (o > total / 2) o -= total;
    while (o < -total / 2) o += total;
    return o;
  }

  // stageSize() było czytane raz na kartę wewnątrz pętli, która w tym samym
  // przebiegu zapisuje card.style.transform — każdy odczyt po zapisie wymuszał
  // synchroniczny reflow. Trzymamy wynik w cache, unieważnianym przy resize.
  var stageCache = null;
  function stageSize() {
    if (!stageCache) {
      stageCache = {
        w: stage.clientWidth || window.innerWidth,
        h: stage.clientHeight || window.innerHeight * 0.55,
      };
    }
    return stageCache;
  }
  function invalidateStage() {
    stageCache = null;
  }
  window.addEventListener("resize", invalidateStage, { passive: true });
  if (typeof ResizeObserver === "function") {
    // Łapie też zmiany wysokości sceny bez resize okna (np. po doładowaniu fontów).
    new ResizeObserver(invalidateStage).observe(stage);
  } else {
    window.addEventListener("load", invalidateStage);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut(t) {
    return t * t * (3 - 2 * t);
  }

  function homePose(cardIndex) {
    var h = HOMES[cardIndex % HOMES.length];
    var s = stageSize();
    return {
      x: h.x * s.w * (MOBILE ? 0.42 : 0.46),
      y: h.y * s.h * (MOBILE ? 0.42 : 0.52),
      scale: h.scale * (MOBILE ? 0.92 : 1),
      rot: h.rot,
      opacity: MOBILE ? 0.45 : 0.58,
      z: 12 + (cardIndex % 6),
    };
  }

  function centerPose() {
    return { x: 0, y: 0, scale: CENTER_SCALE, rot: 0, opacity: 1, z: 100 };
  }

  function mixPose(a, b, t) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      scale: lerp(a.scale, b.scale, t),
      rot: lerp(a.rot, b.rot, t),
      opacity: lerp(a.opacity, b.opacity, t),
      z: Math.round(lerp(a.z, b.z, t)),
    };
  }

  function layoutForOffset(o, cardIndex) {
    var abs = Math.abs(o);
    var home = homePose(cardIndex);
    var center = centerPose();

    if (abs < 0.001) return center;
    if (abs < 1) {
      return mixPose(center, home, easeInOut(abs));
    }
    if (abs < 2.4) {
      var t2 = easeInOut((abs - 1) / 1.4);
      return mixPose(home, {
        x: home.x * 1.25,
        y: home.y * 1.2,
        scale: home.scale * 0.72,
        rot: home.rot * 1.15,
        opacity: home.opacity * 0.35,
        z: 4,
      }, t2);
    }
    return { x: home.x * 1.35, y: home.y * 1.3, scale: 0.1, rot: home.rot, opacity: 0, z: 1 };
  }

  function ensureVideoSrc(video) {
    if (!video || video.getAttribute("src")) return;
    var src = video.getAttribute("data-fan-video-src");
    if (!src) return;
    video.setAttribute("src", src);
    video.load();
  }

  function layout(position) {
    var activeIndex = ((Math.round(wrapPos(position)) % total) + total) % total;

    cards.forEach(function (card, i) {
      var o = wrapOffset(i, position);
      var t = layoutForOffset(o, i);

      card.style.left = "50%";
      card.style.top = "50%";
      card.style.zIndex = String(t.z);
      card.style.transform =
        "translate(-50%, -50%) translate3d(" +
        t.x.toFixed(1) + "px, " +
        t.y.toFixed(1) + "px, 0) rotate(" +
        t.rot.toFixed(2) + "deg) scale(" +
        t.scale.toFixed(3) + ")";
      card.style.opacity = String(clamp(t.opacity, 0, 1));
      card.style.filter = "";

      var isActive = i === activeIndex;
      card.classList.toggle("is-active", isActive);
      card.classList.toggle("is-back", !isActive);
      card.setAttribute("aria-hidden", isActive ? "false" : "true");
      card.tabIndex = isActive ? 0 : -1;
      card.style.pointerEvents = isActive ? "auto" : "none";

      var video = card.querySelector("video");
      if (video) {
        // Film aktywnej karty startowal juz przy inicjalizacji karuzeli, czyli
        // zanim ktokolwiek zobaczyl sekcje Uslugi (jest druga w kolejnosci).
        // Odtwarzanie przewaza preload="none" i sciaga caly plik — zmierzone
        // 3,9 MB przy samym wejsciu na strone.
        if (isActive && isUslugiActive()) {
          ensureVideoSrc(video);
          video.play().catch(function () {});
        } else video.pause();
      }
    });

    if (counter) {
      counter.textContent =
        String(activeIndex + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    }
    if (progressBar) {
      progressBar.style.width =
        ((activeIndex / Math.max(1, total - 1)) * 100).toFixed(1) + "%";
    }
    if (btnPrev) btnPrev.setAttribute("aria-hidden", tapHintVisible ? "false" : "true");
    if (btnNext) btnNext.setAttribute("aria-hidden", tapHintVisible ? "false" : "true");

    index = activeIndex;
  }

  function isPointerOverStage(e) {
    var rect = section.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }

  function decayWheelAccum() {
    wheelAccumX *= 0.55;
    if (Math.abs(wheelAccumX) < 4) wheelAccumX = 0;
  }

  function scheduleWheelDecay() {
    if (wheelDecayTimer) window.clearTimeout(wheelDecayTimer);
    wheelDecayTimer = window.setTimeout(decayWheelAccum, 120);
  }

  function canNavigate() {
    return Date.now() - lastNavAt >= NAV_COOLDOWN_MS && !wheelCooldown;
  }

  function navigate(dir) {
    if (!canNavigate()) return false;
    lastNavAt = Date.now();
    hideHint();
    hideTapHint();
    if (dir > 0) next();
    else prev();
    return true;
  }

  function hideHint() {
    if (hintHidden || !hint) return;
    hintHidden = true;
    hint.classList.add("is-hidden");
  }

  function hideTapHint() {
    if (!tapHintVisible) return;
    tapHintVisible = false;
    stage.classList.remove("is-tap-hint");
    if (tapHintTimer) {
      window.clearTimeout(tapHintTimer);
      tapHintTimer = null;
    }
    if (btnPrev) btnPrev.setAttribute("aria-hidden", "true");
    if (btnNext) btnNext.setAttribute("aria-hidden", "true");
  }

  function showTapHint() {
    if (REDUCED || tapHintVisible) return;
    tapHintVisible = true;
    stage.classList.add("is-tap-hint");
    if (btnPrev) btnPrev.setAttribute("aria-hidden", "false");
    if (btnNext) btnNext.setAttribute("aria-hidden", "false");
    if (tapHintTimer) window.clearTimeout(tapHintTimer);
    tapHintTimer = window.setTimeout(hideTapHint, TAP_HINT_MS);
  }

  function goTo(nextIndex) {
    var wrapped = ((nextIndex % total) + total) % total;
    if (wrapped === index && Math.abs(shortestDelta(displayPos, wrapped)) < 0.05) return;
    targetPos = wrapped;
    scheduleTick();
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  var ticking = false;
  function scheduleTick() {
    if (ticking || REDUCED) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  function tick() {
    ticking = false;
    var delta = shortestDelta(displayPos, targetPos);
    if (Math.abs(delta) > 0.01) {
      fan.classList.add("is-animating");
      displayPos = wrapPos(displayPos + delta * LERP);
      layout(displayPos);
      scheduleTick();
    } else if (Math.abs(delta) > 0.0005) {
      displayPos = targetPos;
      layout(displayPos);
      fan.classList.remove("is-animating");
    } else {
      fan.classList.remove("is-animating");
    }
  }

  // ——— Nawigacja: cała sekcja Usługi — lewa połowa = prev, prawa = next ———
  function sideFromEvent(e) {
    var rect = section.getBoundingClientRect();
    var x = e.clientX - rect.left;
    return x < rect.width * 0.5 ? -1 : 1;
  }

  section.addEventListener("click", function (e) {
    // Środkowy aktywny kafelek nadal otwiera panel usługi.
    if (e.target.closest(".services-fan__card.is-active")) return;
    if (e.target.closest("a")) return;
    hideHint();
    hideTapHint();
    if (sideFromEvent(e) < 0) prev();
    else next();
  });

  section.addEventListener(
    "touchstart",
    function (e) {
      if (!e.touches[0]) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchAxis = null;
      touchTracking = true;
    },
    { passive: true }
  );

  section.addEventListener(
    "touchmove",
    function (e) {
      if (!touchTracking || !e.touches[0]) return;
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      if (!touchAxis) {
        if (Math.abs(dx) < SWIPE_AXIS_LOCK && Math.abs(dy) < SWIPE_AXIS_LOCK) return;
        // Wyraźny poziom = kafelki; pion zostawiamy scrollowi sekcji.
        touchAxis = Math.abs(dx) > Math.abs(dy) * 1.35 ? "x" : "y";
      }
      if (touchAxis === "x") {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { passive: false }
  );

  section.addEventListener(
    "touchend",
    function (e) {
      if (!touchTracking || !e.changedTouches[0]) {
        touchTracking = false;
        touchAxis = null;
        return;
      }
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      var axis = touchAxis;
      var endX = e.changedTouches[0].clientX;
      var endY = e.changedTouches[0].clientY;
      touchTracking = false;
      touchAxis = null;

      // Krótki tap (bez swipe) — lewa/prawa połowa sekcji.
      if (!axis || (Math.abs(dx) < SWIPE_MIN_DX && Math.abs(dy) < SWIPE_MIN_DX)) {
        var active = section.querySelector(".services-fan__card.is-active");
        if (active) {
          var r = active.getBoundingClientRect();
          if (endX >= r.left && endX <= r.right && endY >= r.top && endY <= r.bottom) {
            return; // tap w kafelek → zostaw klikowi otwarcie panelu
          }
        }
        hideHint();
        hideTapHint();
        var rect = section.getBoundingClientRect();
        if (endX - rect.left < rect.width * 0.5) prev();
        else next();
        return;
      }

      if (axis === "y") return;
      if (Math.abs(dx) < SWIPE_MIN_DX) return;
      if (axis !== "x" && Math.abs(dx) < Math.abs(dy)) return;
      hideHint();
      hideTapHint();
      if (dx < 0) next();
      else prev();
    },
    { passive: true }
  );

  section.addEventListener(
    "touchcancel",
    function () {
      touchTracking = false;
      touchAxis = null;
    },
    { passive: true }
  );

  document.addEventListener("keydown", function (e) {
    if (!isUslugiActive()) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  });

  // ——— Touchpad: tylko wyraźny gest w lewo / prawo ———
  function onWheel(e) {
    if (!isUslugiActive()) return;
    if (!isPointerOverStage(e)) return;

    var dx = e.deltaX;
    var dy = e.deltaY;

    if (e.shiftKey && Math.abs(dy) > Math.abs(dx)) {
      dx = dy;
      dy = 0;
    }

    var absX = Math.abs(dx);
    var absY = Math.abs(dy);

    // Nie poziomo? Reset akumulatora — pionowy scroll = strona
    if (absX < 4 || absX < absY * HORIZONTAL_RATIO) {
      scheduleWheelDecay();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    wheelAccumX += dx;
    scheduleWheelDecay();

    if (Math.abs(wheelAccumX) >= WHEEL_THRESHOLD && canNavigate()) {
      var dir = wheelAccumX > 0 ? 1 : -1;
      if (navigate(dir)) {
        wheelAccumX = 0;
        wheelCooldown = true;
        window.setTimeout(function () {
          wheelCooldown = false;
        }, NAV_COOLDOWN_MS);
      }
    }
  }

  stage.addEventListener("wheel", onWheel, { passive: false });

  // Piasek tylko gdy sekcja w kadrze
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          section.classList.toggle("is-in-view", entry.isIntersecting);
          if (entry.isIntersecting) {
            document.documentElement.classList.add("is-sand-stream");
            showTapHint();
            playActiveCardVideo();
          } else {
            hideTapHint();
            if (!(window.cosgralSand && window.cosgralSand.locked)) {
              if (!document.getElementById("rozpad")?.classList.contains("is-active")) {
                document.documentElement.classList.remove("is-sand-stream");
              }
            }
          }
        });
      },
      { threshold: 0.35 }
    );
    io.observe(section);
  }

  layout(0);
  scheduleTick();

  // Warm video sources once Usługi is near the viewport
  if ("IntersectionObserver" in window) {
    var warmIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          cards.forEach(function (card) {
            ensureVideoSrc(card.querySelector("video"));
          });
          warmIo.disconnect();
        });
      },
      { rootMargin: "40% 0px", threshold: 0.01 }
    );
    warmIo.observe(section);
  }


  window.cosgralServicesFan = {
    goToIndex: function (nextIndex) {
      goTo(nextIndex);
    },
    /* Czy karuzela jest na krancu w danym kierunku — czyli czy kolejny gest
       kolkiem powinien juz wyprowadzic ze sekcji, zamiast przewijac karty.
       Klikniecie strzalka i swipe nadal zawijaja (goTo liczy modulo);
       to ograniczenie dotyczy wylacznie scrolla. */
    atEdge: function (dir) {
      if (!total) return true;
      return dir > 0 ? index >= total - 1 : index <= 0;
    },
    stepFromWheel: function (deltaY) {
      if (!isUslugiActive() || !canNavigate()) return false;
      // Licznik prowadzi stepper (to on zbiera zdarzenia kolka) — nie dokladamy
      // tu wlasnego. Wczesniej ta metoda dopisywala przekazana juz zsumowana
      // wartosc do wheelAccumX, czyli do akumulatora scrolla POZIOMEGO: gest
      // pionowy zaburzal prog nawigacji poziomej i odwrotnie.
      if (Math.abs(deltaY) < 32) return false;
      var dir = deltaY > 0 ? 1 : -1;
      if (dir > 0 ? index >= total - 1 : index <= 0) return false;
      lastNavAt = Date.now();
      hideHint();
      hideTapHint();
      if (dir > 0) next();
      else prev();
      return true;
    },
    goToTheme: function (themeId, done) {
      var idx = -1;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute("data-service-theme") === themeId) {
          idx = i;
          break;
        }
      }
      if (idx < 0) {
        if (done) done();
        return;
      }
      goTo(idx);
      if (REDUCED) {
        displayPos = idx;
        targetPos = idx;
        layout(idx);
        if (done) done();
        return;
      }
      var started = performance.now();
      function waitSettled() {
        if (Math.abs(shortestDelta(displayPos, targetPos)) < 0.02 || performance.now() - started > 1800) {
          displayPos = targetPos;
          layout(displayPos);
          if (done) done();
          return;
        }
        requestAnimationFrame(waitSettled);
      }
      requestAnimationFrame(waitSettled);
    },
  };

  window.addEventListener("resize", function () {
    MOBILE = window.matchMedia("(max-width: 900px)").matches;
    layout(displayPos);
  });
})();

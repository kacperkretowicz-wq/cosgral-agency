/**
 * COSGRAL — sterownik jakości (adaptive quality governor).
 *
 * Mierzy realny czas klatki i wystawia „tier" jakości, z którego korzystają
 * ciężkie sceny (hero 3D, tło ambient). Założenie: na maszynie, która wyrabia,
 * NIC się nie zmienia — pełna rozdzielczość i pełna liczba klatek. Dopiero gdy
 * klatki zaczynają się gubić, jakość schodzi stopniowo w dół, i wraca w górę,
 * gdy tylko pojawi się zapas mocy.
 *
 *   tier 0 — pełna jakość (domyślnie)
 *   tier 1 — lekkie cięcie (niższy DPR, rzadszy render poza kadrem)
 *   tier 2 — tryb ratunkowy (najniższy DPR, najrzadszy render)
 *
 * window.cosgralPerf = { tier, fps, subscribe(fn), sample(dtMs) }
 */
(function () {
  "use strict";

  var MAX_TIER = 2;
  var tier = 0;
  var ema = 16.7;
  var last = 0;
  var listeners = [];
  var lastChangeAt = 0;
  var badStreak = 0;
  var goodStreak = 0;

  // Progi w ms na klatkę. 22 ms ≈ 45 fps, 14 ms ≈ 71 fps.
  var DOWN_MS = 22;
  var UP_MS = 14;
  // Ile kolejnych klatek musi potwierdzić stan, zanim zmienimy poziom.
  var DOWN_STREAK = 45;
  var UP_STREAK = 240;
  // Minimalny odstęp między zmianami — chroni przed oscylacją.
  var COOLDOWN_MS = 2500;
  // Klatki dłuższe niż to są odrzucane jako artefakty (przełączenie karty, GC,
  // pauza debuggera) — nie chcemy z ich powodu ciąć jakości.
  var OUTLIER_MS = 200;

  function setTier(next) {
    if (next === tier) return;
    tier = next;
    lastChangeAt = performance.now();
    badStreak = 0;
    goodStreak = 0;
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](tier);
      } catch (e) {
        /* jeden zepsuty odbiorca nie może zatrzymać reszty */
      }
    }
  }

  function sample(dt) {
    if (!(dt > 0) || dt > OUTLIER_MS) return;
    ema += (dt - ema) * 0.05;

    var now = performance.now();
    if (now - lastChangeAt < COOLDOWN_MS) return;

    if (ema > DOWN_MS) {
      badStreak++;
      goodStreak = 0;
      if (badStreak >= DOWN_STREAK && tier < MAX_TIER) setTier(tier + 1);
    } else if (ema < UP_MS) {
      goodStreak++;
      badStreak = 0;
      if (goodStreak >= UP_STREAK && tier > 0) setTier(tier - 1);
    } else {
      badStreak = 0;
      goodStreak = 0;
    }
  }

  function tick(now) {
    if (last) sample(now - last);
    last = now;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  document.addEventListener("visibilitychange", function () {
    // Po powrocie do karty pierwsza klatka jest zawsze długa — nie licz jej.
    last = 0;
  });

  window.cosgralPerf = {
    get tier() {
      return tier;
    },
    get fps() {
      return ema > 0 ? Math.round(1000 / ema) : 0;
    },
    subscribe: function (fn) {
      if (typeof fn !== "function") return function () {};
      listeners.push(fn);
      fn(tier);
      return function () {
        var i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    sample: sample,
  };
})();

/**
 * Shared pointer field — CSS vars + global state for ambient / tiles / 3D.
 * Mobile: gyro tilt from device orientation (iOS needs a user gesture).
 * Desktop: mouse.
 * Works on home + all subpages that include this script.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var COARSE = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var GYRO_KEY = "cosgral-gyro";
  var root = document.documentElement;
  var state = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    nx: 0,
    ny: 0,
    tx: window.innerWidth * 0.5,
    ty: window.innerHeight * 0.5,
    tnx: 0,
    tny: 0,
    fromOrientation: false,
  };

  var orient = {
    listening: false,
    active: false,
    permission: "unknown",
    baseBeta: null,
    baseGamma: null,
    tnx: 0,
    tny: 0,
  };

  var ORIENT_GAMMA_RANGE = 22;
  var ORIENT_BETA_RANGE = 18;
  var gateEl = null;
  var needsIosPermission =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";

  window.cosgralPointer = state;
  window.cosgralOrientation = orient;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setTarget(clientX, clientY) {
    state.tx = clientX;
    state.ty = clientY;
    wake();
    if (!MOBILE && !orient.active) {
      state.tnx = (clientX / window.innerWidth) * 2 - 1;
      state.tny = -((clientY / window.innerHeight) * 2 - 1);
    }
    if (COARSE) {
      state.x = state.tx;
      state.y = state.ty;
      if (!MOBILE && !orient.active) {
        state.nx = state.tnx;
        state.ny = state.tny;
      }
      applyPointer();
    }
  }

  function onDeviceOrientation(e) {
    var gamma = e.gamma;
    var beta = e.beta;
    if (gamma == null || beta == null) return;
    if (orient.baseBeta == null) {
      orient.baseBeta = beta;
      orient.baseGamma = gamma;
    }
    var dg = gamma - orient.baseGamma;
    var db = beta - orient.baseBeta;
    orient.tnx = clamp(dg / ORIENT_GAMMA_RANGE, -1, 1);
    orient.tny = clamp(-db / ORIENT_BETA_RANGE, -1, 1);
    orient.active = true;
    state.fromOrientation = true;
    wake();
    try {
      sessionStorage.setItem(GYRO_KEY, "1");
    } catch (err) {}
    hideGate();
  }

  function enableOrientation() {
    if (orient.listening) return;
    orient.listening = true;
    wake();
    window.addEventListener("deviceorientation", onDeviceOrientation, true);
    window.addEventListener("deviceorientationabsolute", onDeviceOrientation, true);
  }

  function hideGate() {
    if (!gateEl) return;
    gateEl.classList.add("is-done");
    window.setTimeout(function () {
      if (gateEl && gateEl.parentNode) gateEl.parentNode.removeChild(gateEl);
      gateEl = null;
    }, 420);
  }

  function showGate() {
    if (!MOBILE || gateEl || orient.active) return;
    if (orient.permission === "denied") return;
    gateEl = document.createElement("button");
    gateEl.type = "button";
    gateEl.className = "gyro-enable";
    gateEl.setAttribute("data-no-transition", "");
    gateEl.setAttribute("aria-label", "TURN ON 3D");
    gateEl.textContent = "TURN ON 3D";
    gateEl.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      requestOrientationAccess(true);
    });
    document.body.appendChild(gateEl);
  }

  function requestOrientationAccess(fromGesture) {
    if (typeof DeviceOrientationEvent === "undefined") {
      orient.permission = "unsupported";
      hideGate();
      return;
    }

    if (needsIosPermission) {
      if (!fromGesture) {
        showGate();
        return;
      }
      DeviceOrientationEvent.requestPermission()
        .then(function (result) {
          orient.permission = result;
          if (result === "granted") {
            try {
              sessionStorage.setItem(GYRO_KEY, "1");
            } catch (err) {}
            enableOrientation();
            hideGate();
          } else {
            showGate();
          }
        })
        .catch(function () {
          orient.permission = "denied";
          showGate();
        });
      return;
    }

    // Android / browsers without permission API
    orient.permission = "granted";
    try {
      sessionStorage.setItem(GYRO_KEY, "1");
    } catch (err) {}
    enableOrientation();
    hideGate();
  }

  document.addEventListener(
    "mousemove",
    function (e) {
      setTarget(e.clientX, e.clientY);
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    function (e) {
      if (MOBILE || !e.touches[0]) return;
      setTarget(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true }
  );

  /* Warstwy welonu, ktore podazaja za kursorem. Zamiast pisac --pointer-x/y na
     <html> (co uniewaznia style CALEGO dokumentu przy kazdym ruchu myszy),
     ustawiamy przesuniecie bezposrednio na tych kilku elementach. Sam element
     ma juz transform: translate3d(...), wiec przegladarka tylko przesuwa gotowa
     warstwe na GPU. */
  var veils = null;

  function collectVeils() {
    veils = document.querySelectorAll(".home-ambient__blur, .subpage-ambient__blur");
  }

  var lastVeilX = null;
  var lastVeilY = null;

  function applyPointer() {
    if (veils === null) collectVeils();
    if (!veils.length) return;

    // Pol piksela to ponizej progu widocznosci — nie ma po co ruszac warstwa.
    var vx = Math.round(state.x);
    var vy = Math.round(state.y);
    if (vx === lastVeilX && vy === lastVeilY) return;
    lastVeilX = vx;
    lastVeilY = vy;

    for (var i = 0; i < veils.length; i++) {
      veils[i].style.setProperty("--veil-x", vx + "px");
      veils[i].style.setProperty("--veil-y", vy + "px");
    }
  }

  /* Petla chodzi tylko wtedy, gdy jest co animowac. Gdy kursor stoi, a wygladzanie
     doszlo do celu — usypiamy ja calkowicie (zero pracy przy nieruchomej myszy)
     i budzimy z powrotem przy najblizszym ruchu. */
  var running = false;

  function settled() {
    if (orient.active || orient.listening) return false;
    if (MOBILE) return true;
    return (
      Math.abs(state.tx - state.x) < 0.2 &&
      Math.abs(state.ty - state.y) < 0.2 &&
      Math.abs(state.tnx - state.nx) < 0.0005 &&
      Math.abs(state.tny - state.ny) < 0.0005
    );
  }

  function tick() {
    if (orient.active || orient.listening) {
      state.tnx += (orient.tnx - state.tnx) * 0.16;
      state.tny += (orient.tny - state.tny) * 0.16;
      state.nx += (state.tnx - state.nx) * 0.16;
      state.ny += (state.tny - state.ny) * 0.16;
      state.x = (state.nx * 0.5 + 0.5) * window.innerWidth;
      state.y = (-state.ny * 0.5 + 0.5) * window.innerHeight;
      state.fromOrientation = orient.active;
    } else if (!MOBILE) {
      state.x += (state.tx - state.x) * 0.08;
      state.y += (state.ty - state.y) * 0.08;
      state.nx += (state.tnx - state.nx) * 0.08;
      state.ny += (state.tny - state.ny) * 0.08;
    }
    applyPointer();

    if (settled()) {
      // Dociagnij do celu i zasnij.
      state.x = state.tx;
      state.y = state.ty;
      state.nx = state.tnx;
      state.ny = state.tny;
      applyPointer();
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  }

  function wake() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  function armMobileGyro() {
    if (!MOBILE) return;

    window.addEventListener("orientationchange", function () {
      orient.baseBeta = null;
      orient.baseGamma = null;
    });

    var remembered = false;
    try {
      remembered = sessionStorage.getItem(GYRO_KEY) === "1";
    } catch (err) {}

    if (remembered) {
      // Po wcześniejszym TURN ON 3D — od razu nasłuchuj na każdej podstronie.
      enableOrientation();
      window.setTimeout(function () {
        if (!orient.active && needsIosPermission) showGate();
      }, 2200);
      return;
    }

    if (needsIosPermission) {
      var reveal = function () {
        if (!orient.active) showGate();
      };
      if (document.body.classList.contains("is-ready")) reveal();
      else {
        window.addEventListener(
          "load",
          function () {
            window.setTimeout(reveal, 700);
          },
          { once: true }
        );
        window.setTimeout(reveal, 4200);
      }
    } else {
      requestOrientationAccess(false);
    }
  }

  armMobileGyro();

  function boot() {
    collectVeils();
    lastVeilX = null;
    lastVeilY = null;
    wake();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("resize", function () {
    // Welon jest wymiarowany w vmax — po zmianie okna wymus jedno odswiezenie.
    lastVeilX = null;
    lastVeilY = null;
    wake();
  });
})();

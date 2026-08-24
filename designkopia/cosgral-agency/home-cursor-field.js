/**
 * Shared pointer field — CSS vars + global state for ambient / tiles / 3D.
 * Mobile: gyro tilt from device orientation (iOS needs a user gesture).
 * Desktop: mouse.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var COARSE = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
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
    hideGate();
  }

  function enableOrientation() {
    if (orient.listening) return;
    orient.listening = true;
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
    gateEl.innerHTML =
      '<span class="gyro-enable__title">Włącz efekt 3D</span>' +
      '<span class="gyro-enable__sub">Żyroskop — ruch telefonu</span>';
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

  function applyPointer() {
    var px = (state.x / window.innerWidth) * 100;
    var py = (state.y / window.innerHeight) * 100;

    root.style.setProperty("--pointer-x", px.toFixed(2) + "%");
    root.style.setProperty("--pointer-y", py.toFixed(2) + "%");
    root.style.setProperty("--pointer-nx", state.nx.toFixed(4));
    root.style.setProperty("--pointer-ny", state.ny.toFixed(4));
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
    requestAnimationFrame(tick);
  }

  function armMobileGyro() {
    if (!MOBILE) return;

    window.addEventListener("orientationchange", function () {
      orient.baseBeta = null;
      orient.baseGamma = null;
    });

    if (needsIosPermission) {
      // iOS: dopiero po geście — pokazujemy przycisk po starcie strony.
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
      // Android: od razu nasłuchuj; jeśli brak eventów, i tak pokaż bramkę po chwili.
      requestOrientationAccess(false);
      window.setTimeout(function () {
        if (!orient.active) showGate();
      }, 2600);
    }
  }

  armMobileGyro();
  requestAnimationFrame(tick);
})();

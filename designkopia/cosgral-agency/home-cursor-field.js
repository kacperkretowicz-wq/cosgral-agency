/**
 * Shared pointer field — CSS vars + global state for ambient / tiles / 3D.
 * Mobile: gyro tilt from device orientation (not touch position). Desktop: mouse.
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
    baseBeta: null,
    baseGamma: null,
    tnx: 0,
    tny: 0,
  };

  var ORIENT_GAMMA_RANGE = 28;
  var ORIENT_BETA_RANGE = 22;

  window.cosgralPointer = state;

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
    if (e.gamma == null || e.beta == null) return;
    if (orient.baseBeta == null) {
      orient.baseBeta = e.beta;
      orient.baseGamma = e.gamma;
    }
    var dg = e.gamma - orient.baseGamma;
    var db = e.beta - orient.baseBeta;
    orient.tnx = clamp(dg / ORIENT_GAMMA_RANGE, -1, 1);
    orient.tny = clamp(-db / ORIENT_BETA_RANGE, -1, 1);
    orient.active = true;
    state.fromOrientation = true;
    state.tnx = orient.tnx;
    state.tny = orient.tny;
  }

  function enableOrientation() {
    if (orient.listening) return;
    orient.listening = true;
    window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
  }

  function requestOrientationAccess() {
    if (typeof DeviceOrientationEvent === "undefined") return;
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission()
        .then(function (result) {
          if (result === "granted") enableOrientation();
        })
        .catch(function () {});
      return;
    }
    enableOrientation();
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
    if (orient.active) {
      state.tnx += (orient.tnx - state.tnx) * 0.14;
      state.tny += (orient.tny - state.tny) * 0.14;
      state.nx += (state.tnx - state.nx) * 0.14;
      state.ny += (state.tny - state.ny) * 0.14;
      state.fromOrientation = true;
    } else if (!MOBILE) {
      state.x += (state.tx - state.x) * 0.08;
      state.y += (state.ty - state.y) * 0.08;
      state.nx += (state.tnx - state.nx) * 0.08;
      state.ny += (state.tny - state.ny) * 0.08;
    }
    applyPointer();
    requestAnimationFrame(tick);
  }

  if (MOBILE) {
    document.addEventListener("touchstart", requestOrientationAccess, { once: true, passive: true });
    requestOrientationAccess();
    window.addEventListener("orientationchange", function () {
      orient.baseBeta = null;
      orient.baseGamma = null;
    });
  }

  requestAnimationFrame(tick);
})();

/**
 * Shared pointer field — CSS vars + global state for ambient / tiles / 3D.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

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
  };

  window.cosgralPointer = state;

  function setTarget(clientX, clientY) {
    state.tx = clientX;
    state.ty = clientY;
    state.tnx = (clientX / window.innerWidth) * 2 - 1;
    state.tny = -((clientY / window.innerHeight) * 2 - 1);
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
      if (!e.touches[0]) return;
      setTarget(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true }
  );

  function tick() {
    state.x += (state.tx - state.x) * 0.08;
    state.y += (state.ty - state.y) * 0.08;
    state.nx += (state.tnx - state.nx) * 0.08;
    state.ny += (state.tny - state.ny) * 0.08;

    var px = (state.x / window.innerWidth) * 100;
    var py = (state.y / window.innerHeight) * 100;

    root.style.setProperty("--pointer-x", px.toFixed(2) + "%");
    root.style.setProperty("--pointer-y", py.toFixed(2) + "%");
    root.style.setProperty("--pointer-nx", state.nx.toFixed(4));
    root.style.setProperty("--pointer-ny", state.ny.toFixed(4));

    requestAnimationFrame(tick);
  }

  tick();
})();

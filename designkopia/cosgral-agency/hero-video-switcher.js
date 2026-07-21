(function () {
  "use strict";

  var TUNE_KEY = "cosgral-hero-overlay-tune";

  var PRESETS = {
    cubes: { blur: 2, bgBlur: 8, opacity: 90 },
    ice: { blur: 3.25, bgBlur: 12, opacity: 86 },
  };

  var MODES = [
    {
      id: "3d",
      className: "hero-mode--3d",
      label: "01 Model 3D",
      desc: "Obecny cube-director (GLB + scroll)",
      status: "Aktywne: model 3D (cube-director)",
    },
    {
      id: "cubes",
      className: "hero-mode--cubes",
      label: "02 Cubes Structure",
      desc: "Overlay screen — siatka na tle + blur",
      status: "Aktywne: Cubes overlay (screen + blur)",
      thumb: "images/cosgral-agency/hero-video-tests/cubes-src-frame.jpg",
    },
    {
      id: "ice",
      className: "hero-mode--ice",
      label: "03 Ice Cube Close-up",
      desc: "Overlay screen — lód na tle + blur",
      status: "Aktywne: Ice overlay (screen + blur)",
      thumb: "images/cosgral-agency/hero-video-tests/ice-src-frame.jpg",
    },
  ];

  var root = document.documentElement;
  var body = document.body;
  var panel = document.getElementById("hero-video-panel");
  var list = document.getElementById("hero-video-list");
  var status = document.getElementById("hero-video-status");
  var toggle = document.getElementById("hero-video-panel__toggle");
  var tuning = document.getElementById("hero-video-tuning");
  var videoCubes = document.getElementById("hero-video-cubes");
  var videoIce = document.getElementById("hero-video-ice");
  var activeId = "3d";

  var blurInput = document.getElementById("hero-tune-blur");
  var bgBlurInput = document.getElementById("hero-tune-bg-blur");
  var opacityInput = document.getElementById("hero-tune-opacity");
  var blurOut = document.getElementById("hero-tune-blur-out");
  var bgBlurOut = document.getElementById("hero-tune-bg-blur-out");
  var opacityOut = document.getElementById("hero-tune-opacity-out");

  function parseInitialMode() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get("hero");
    if (fromUrl && MODES.some(function (m) { return m.id === fromUrl; })) {
      return fromUrl;
    }
    try {
      var stored = localStorage.getItem("cosgral-hero-video-mode");
      if (stored && MODES.some(function (m) { return m.id === stored; })) {
        return stored;
      }
    } catch (e) { /* ignore */ }
    return "3d";
  }

  function loadTune() {
    try {
      var raw = localStorage.getItem(TUNE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function saveTune(values) {
    try {
      localStorage.setItem(TUNE_KEY, JSON.stringify(values));
    } catch (e) { /* ignore */ }
  }

  function applyTune(values) {
    root.style.setProperty("--hero-overlay-blur", values.blur + "px");
    root.style.setProperty("--hero-bg-blur", values.bgBlur + "px");
    root.style.setProperty("--hero-overlay-opacity", (values.opacity / 100).toFixed(2));

    if (blurOut) blurOut.textContent = values.blur + "px";
    if (bgBlurOut) bgBlurOut.textContent = values.bgBlur + "px";
    if (opacityOut) opacityOut.textContent = values.opacity + "%";
    if (blurInput) blurInput.value = String(values.blur);
    if (bgBlurInput) bgBlurInput.value = String(values.bgBlur);
    if (opacityInput) opacityInput.value = String(values.opacity);
  }

  function readTuneFromInputs() {
    return {
      blur: parseFloat(blurInput && blurInput.value) || 2.5,
      bgBlur: parseFloat(bgBlurInput && bgBlurInput.value) || 10,
      opacity: parseFloat(opacityInput && opacityInput.value) || 88,
    };
  }

  function applyPresetForMode(id) {
    var preset = PRESETS[id];
    if (!preset) return;
    var saved = loadTune();
    var perMode = saved && saved[id] ? saved[id] : preset;
    applyTune(perMode);
  }

  function persistCurrentTune() {
    if (activeId !== "cubes" && activeId !== "ice") return;
    var values = readTuneFromInputs();
    var all = loadTune() || {};
    all[activeId] = values;
    saveTune(all);
  }

  function pauseVideos() {
    [videoCubes, videoIce].forEach(function (v) {
      if (!v) return;
      v.pause();
    });
  }

  function playActiveVideo(id) {
    var video = id === "cubes" ? videoCubes : id === "ice" ? videoIce : null;
    if (!video) {
      pauseVideos();
      return;
    }
    pauseVideos();
    var p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () { /* autoplay policy */ });
    }
  }

  function setMode(id) {
    var mode = MODES.find(function (m) { return m.id === id; }) || MODES[0];
    activeId = mode.id;

    MODES.forEach(function (m) {
      body.classList.remove(m.className);
    });
    body.classList.add(mode.className);

    list.querySelectorAll(".hero-video-option").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-hero-mode") === mode.id);
    });

    if (status) status.textContent = mode.status;
    if (tuning) tuning.hidden = mode.id === "3d";

    if (mode.id === "cubes" || mode.id === "ice") {
      applyPresetForMode(mode.id);
    }

    playActiveVideo(mode.id);

    try {
      localStorage.setItem("cosgral-hero-video-mode", mode.id);
    } catch (e) { /* ignore */ }

    var url = new URL(window.location.href);
    if (mode.id === "3d") {
      url.searchParams.delete("hero");
    } else {
      url.searchParams.set("hero", mode.id);
    }
    window.history.replaceState({}, "", url);
  }

  function buildList() {
    if (!list) return;
    list.innerHTML = "";
    MODES.forEach(function (mode) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hero-video-option";
      btn.setAttribute("data-hero-mode", mode.id);
      btn.innerHTML =
        mode.label +
        "<small>" + mode.desc + "</small>" +
        (mode.thumb
          ? '<img class="hero-video-thumb" src="' + mode.thumb + '" alt="" loading="lazy" />'
          : "");
      btn.addEventListener("click", function () { setMode(mode.id); });
      list.appendChild(btn);
    });
  }

  function bindTuning() {
    [blurInput, bgBlurInput, opacityInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", function () {
        applyTune(readTuneFromInputs());
        persistCurrentTune();
      });
    });
  }

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  buildList();
  bindTuning();
  setMode(parseInitialMode());

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      pauseVideos();
    } else {
      playActiveVideo(activeId);
    }
  });
})();

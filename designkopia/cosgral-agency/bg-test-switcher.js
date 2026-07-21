(function () {
  "use strict";

  var BASE = "images/cosgral-agency/background-mockups/";
  var MOCKUP_W = 1440;
  var MOCKUP_H = 9600;

  var BACKGROUNDS = [
    {
      group: "Strona",
      items: [
        { id: "original", label: "Oryginał", desc: "Domyślne tła index-v3", url: null },
      ],
    },
    {
      group: "Designer flow (04–06)",
      items: [
        { id: "04", label: "04 Red Thread", desc: "Linia + haze", url: BASE + "scroll-mockup-04-thread-red.jpg" },
        { id: "05", label: "05 Chrome Ribbon", desc: "Chromowa wstęga", url: BASE + "scroll-mockup-05-chrome-ribbon.jpg" },
        { id: "06", label: "06 Haze Flow", desc: "Cinematic flow", url: BASE + "scroll-mockup-06-haze-flow.jpg" },
      ],
    },
    {
      group: "Pod stronę (10–12) — NOWE",
      items: [
        { id: "10", label: "10 Agency Signal", desc: "Abstrakcja COSGRAL, czerwony thread", url: BASE + "scroll-mockup-10-agency-signal.jpg" },
        { id: "11", label: "11 Editorial Current", desc: "Mesh + chrome, bez obiektów z inspo", url: BASE + "scroll-mockup-11-editorial-current.jpg" },
        { id: "12", label: "12 Glass Depth", desc: "Ribbed glass + sculptural blur", url: BASE + "scroll-mockup-12-glass-depth.jpg" },
      ],
    },
    {
      group: "Archiwum (01–03, 07–09)",
      items: [
        { id: "01", label: "01 Narrative", desc: "Kolaż sekcji", url: BASE + "scroll-mockup-01-narrative.jpg" },
        { id: "07", label: "07 Chrome Anatomy", desc: "archiwum — literalne inspo", url: BASE + "scroll-mockup-07-chrome-anatomy.jpg" },
        { id: "08", label: "08 Tech Objects", desc: "archiwum — literalne inspo", url: BASE + "scroll-mockup-08-tech-objects.jpg" },
      ],
    },
  ];

  var shell = document.getElementById("bg-test-shell");
  var canvas = document.getElementById("bg-test-canvas");
  var content = document.getElementById("bg-test-content");
  var panel = document.getElementById("bg-test-panel");
  var list = document.getElementById("bg-test-list");
  var status = document.getElementById("bg-test-status");
  var loading = document.getElementById("bg-test-loading");
  var toggle = document.getElementById("bg-test-panel__toggle");
  var activeId = "11";
  var currentUrl = null;
  var resizeTimer = null;

  function docHeight() {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      window.innerHeight
    );
  }

  function syncLayout() {
    if (!shell || !canvas || !content) return;
    var h = docHeight();
    shell.style.minHeight = h + "px";
    canvas.style.height = h + "px";
    if (currentUrl) {
      canvas.style.backgroundSize = "100% " + h + "px";
    }
  }

  function preload(url, cb) {
    var img = new Image();
    img.onload = function () { cb(null, img); };
    img.onerror = function () { cb(new Error("load failed")); };
    img.src = url + "?v=" + Date.now();
  }

  function setBackground(id, url) {
    activeId = id;
    list.querySelectorAll(".bg-option").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.id === id);
    });

    if (!url) {
      currentUrl = null;
      document.body.classList.remove("has-mockup-bg");
      canvas.style.backgroundImage = "";
      canvas.style.backgroundSize = "";
      status.textContent = "Aktywne: oryginalne tła strony";
      loading.textContent = "";
      try { localStorage.setItem("cosgral-bg-test", id); } catch (e) {}
      syncLayout();
      return;
    }

    loading.textContent = "Ładowanie mockupu…";
    preload(url, function (err) {
      if (err) {
        loading.textContent = "Błąd ładowania pliku.";
        return;
      }
      currentUrl = url;
      document.body.classList.add("has-mockup-bg");
      canvas.style.backgroundImage = "url('" + url + "')";
      syncLayout();
      status.textContent = "Aktywne: " + url.split("/").pop();
      loading.textContent = "Mockup " + MOCKUP_W + "×" + MOCKUP_H + " → rozciągnięty do " + docHeight() + "px wysokości strony";
      try { localStorage.setItem("cosgral-bg-test", id); } catch (e) {}
    });
  }

  function buildList() {
    BACKGROUNDS.forEach(function (group) {
      var wrap = document.createElement("div");
      wrap.className = "bg-group";
      var title = document.createElement("p");
      title.className = "bg-group-title";
      title.textContent = group.group;
      wrap.appendChild(title);

      group.items.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bg-option" + (item.id === activeId ? " is-active" : "");
        btn.dataset.id = item.id;
        btn.innerHTML = item.label + (item.desc ? "<small>" + item.desc + "</small>" : "");
        btn.addEventListener("click", function () {
          setBackground(item.id, item.url || null);
        });
        wrap.appendChild(btn);
      });
      list.appendChild(wrap);
    });
  }

  function restoreSaved() {
    var saved = null;
    try { saved = localStorage.getItem("cosgral-bg-test"); } catch (e) {}
    if (!saved) {
    setBackground("11", BASE + "scroll-mockup-11-editorial-current.jpg");
    return;
  }
    BACKGROUNDS.forEach(function (g) {
      g.items.forEach(function (item) {
        if (item.id === saved) setBackground(item.id, item.url || null);
      });
    });
  }

  function scheduleSync() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncLayout, 120);
  }

  toggle.addEventListener("click", function () {
    panel.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", panel.classList.contains("is-open") ? "true" : "false");
  });

  buildList();
  restoreSaved();
  syncLayout();

  window.addEventListener("resize", scheduleSync);
  window.addEventListener("load", scheduleSync);
  setTimeout(scheduleSync, 800);
  setTimeout(scheduleSync, 2500);
  setTimeout(scheduleSync, 5000);

  if (window.ResizeObserver && content) {
    new ResizeObserver(scheduleSync).observe(content);
  }

  if (window.ScrollTrigger) {
    ScrollTrigger.addEventListener("refresh", scheduleSync);
  }
})();

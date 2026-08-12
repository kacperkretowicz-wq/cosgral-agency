/**
 * Panel usługi — rozszerzany kafelek na pełny ekran (bez osobnych podstron).
 */
(function () {
  "use strict";

  var REDUCED =
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EXPAND_MS = REDUCED ? 0 : 760;
  var CONTENT_IN_MS = REDUCED ? 0 : 420;
  var CONTENT_OUT_MS = REDUCED ? 0 : 340;
  var CLOSE_MS = REDUCED ? 0 : 760;
  var SERVICE_KEY = "cosgral-service-open";
  var openPanel = null;
  var openCard = null;
  var closing = false;

  var SERVICE_SLUGS = {
    "tworzenie-stron-internetowych": "blue",
    "projektowanie-aplikacji": "purple",
    "pozycjonowanie-seo-geo": "gold",
    "wdrazanie-automatyzacji": "orange",
    "systemy-crm": "crimson",
    "grafika-i-montaz-wideo": "green",
  };

  function themeData(id) {
    return window.cosgralServiceThemes?.themes?.[id] || null;
  }

  function contentData(id) {
    var lang = window.cosgralI18n?.getLang?.() || "pl";
    return window.cosgralServicesContent?.get?.(id, lang) || null;
  }

  function panelT(key) {
    return (window.cosgralI18n && window.cosgralI18n.t(key)) || null;
  }

  function lockScroll(on) {
    document.body.classList.toggle("is-service-panel-open", !!on);
    document.documentElement.classList.toggle("is-service-panel-open", !!on);
  }

  function buildInner(data) {
    var itemsHtml = data.items
      .map(function (item) {
        return "<li>" + item + "</li>";
      })
      .join("");
    var parasHtml = data.paragraphs
      .map(function (p) {
        return "<p>" + p + "</p>";
      })
      .join("");
    var linksHtml = "";
    if (data.links && data.links.length) {
      linksHtml =
        '<div class="service-panel__links">' +
        data.links
          .map(function (l) {
            var label = l.i18n && panelT(l.i18n) ? panelT(l.i18n) : l.label;
            return '<a href="' + l.href + '" data-panel-link>' + label + " →</a>";
          })
          .join("") +
        "</div>";
    }

    var serviceLabel = panelT("panel.service_label") || "Usługa";
    var whatWeDo = panelT("panel.what_we_do") || "Co robimy";
    var forWho = panelT("panel.for_who") || "Dla kogo i jaki efekt";
    var cta = panelT("panel.cta") || "Zacznijmy od bezpłatnego audytu";

    return (
      '<header class="service-panel__head">' +
      '<p class="service-panel__num">' +
      data.num +
      " — " +
      serviceLabel +
      "</p>" +
      '<h2 class="service-panel__title" id="service-panel-title">' +
      data.title +
      "</h2>" +
      "</header>" +
      '<section class="service-panel__col service-panel__col--list">' +
      "<h3>" +
      whatWeDo +
      "</h3>" +
      "<ul>" +
      itemsHtml +
      "</ul>" +
      linksHtml +
      "</section>" +
      '<section class="service-panel__col service-panel__col--effect">' +
      "<h3>" +
      forWho +
      "</h3>" +
      '<div class="service-panel__copy">' +
      parasHtml +
      "</div>" +
      "</section>" +
      '<footer class="service-panel__foot">' +
      '<a class="service-panel__cta" href="#kontakt" data-panel-contact data-i18n="panel.cta">' +
      cta +
      "</a>" +
      "</footer>"
    );
  }

  function refreshOpenPanel() {
    if (!openPanel || !openCard) return;
    var themeId = openCard.getAttribute("data-service-theme");
    var data = contentData(themeId);
    if (!data) return;
    var inner = openPanel.querySelector(".service-panel__inner");
    if (inner) inner.innerHTML = buildInner(data);
    if (window.cosgralI18n?.applyLang) {
      window.cosgralI18n.applyLang(window.cosgralI18n.getLang());
    }
  }

  window.addEventListener("cosgral:langchange", refreshOpenPanel);

  function playShellVideo(shell) {
    shell.querySelectorAll("video").forEach(function (video) {
      video.play().catch(function () {});
    });
  }

  function setShellRect(shell, card, themeId) {
    var rect = card.getBoundingClientRect();
    var radius = window.getComputedStyle(card).borderRadius || "28px";
    shell.style.left = rect.left + "px";
    shell.style.top = rect.top + "px";
    shell.style.width = rect.width + "px";
    shell.style.height = rect.height + "px";
    shell.style.borderRadius = radius;
    if (themeId) shell.setAttribute("data-service-theme", themeId);
  }

  function setCardSourceHidden(card, hidden) {
    if (!card) return;
    card.classList.toggle("is-service-panel-source", !!hidden);
  }

  function openFromCard(card) {
    if (!card || openPanel || closing) return false;

    var themeId = card.getAttribute("data-service-theme");
    var data = contentData(themeId);
    var theme = themeData(themeId);
    if (!themeId || !data || !theme) return false;

    openCard = card;

    window.cosgralServiceThemes?.apply?.(themeId);

    var panel = document.createElement("div");
    panel.className = "service-panel";
    panel.setAttribute("data-service-theme", themeId);
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "service-panel-title");
    panel.style.setProperty("--service-bg", theme.bg);
    panel.style.setProperty("--service-accent", theme.accent);
    panel.style.setProperty("--service-highlight", theme.highlight);

    panel.innerHTML =
      '<div class="service-panel__shell">' +
      '<div class="service-panel__bg" aria-hidden="true"></div>' +
      '<div class="service-panel__scrim" aria-hidden="true"></div>' +
      '<div class="service-panel__inner">' +
      buildInner(data) +
      "</div></div>";

    var shell = panel.querySelector(".service-panel__shell");
    var bg = panel.querySelector(".service-panel__bg");
    var media = card.querySelector(".services-fan__card-media");

    if (media) {
      bg.appendChild(media.cloneNode(true));
    } else {
      bg.innerHTML =
        '<video class="service-panel__video" muted loop playsinline preload="metadata" src="' +
        (theme.videoHome || theme.video || "") +
        '"></video>' +
        '<div class="service-panel__tint" aria-hidden="true"></div>';
    }

    bg.insertAdjacentHTML(
      "beforeend",
      '<div class="service-panel__shade" aria-hidden="true"></div>' +
        '<div class="service-panel__tint service-panel__tint--panel" aria-hidden="true"></div>'
    );

    setShellRect(shell, card, themeId);
    setCardSourceHidden(card, true);

    document.body.appendChild(panel);
    openPanel = panel;
    lockScroll(true);
    playShellVideo(shell);

    panel.addEventListener("pointerup", onPanelDismiss);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.classList.add("is-open");
      });
    });

    window.setTimeout(function () {
      if (!openPanel || openPanel !== panel) return;
      panel.classList.add("is-content-ready");
    }, EXPAND_MS);

    return true;
  }

  function closePanel(onClosed) {
    if (!openPanel || closing) return;
    closing = true;

    var panel = openPanel;
    var card = openCard;
    panel.classList.remove("is-content-ready");

    panel.querySelectorAll("video").forEach(function (video) {
      video.pause();
    });

    window.setTimeout(function () {
      if (card) {
        setShellRect(panel.querySelector(".service-panel__shell"), card, panel.getAttribute("data-service-theme"));
      }
      panel.classList.remove("is-open");

      window.setTimeout(function () {
        setCardSourceHidden(card, false);
        panel.remove();
        openPanel = null;
        openCard = null;
        closing = false;
        lockScroll(false);
        if (typeof onClosed === "function") onClosed();
      }, CLOSE_MS);
    }, CONTENT_OUT_MS);
  }

  function goToContactSection() {
    if (window.cosgralSectionSnap?.jumpTo) {
      window.cosgralSectionSnap.jumpTo(5);
      return;
    }
    if (window.cosgralSectionSnap?.goTo) {
      window.cosgralSectionSnap.goTo(5);
      return;
    }
    var target = document.getElementById("kontakt");
    if (target && window.cosgralSmoothScroll?.scrollTo) {
      window.cosgralSmoothScroll.scrollTo(target, { duration: 1.1 });
    } else if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }

  function onContactCtaClick(e) {
    var cta = e.target.closest("[data-panel-contact]");
    if (!cta || !openPanel) return;
    e.preventDefault();
    e.stopPropagation();
    closePanel(goToContactSection);
  }

  function onPanelDismiss(e) {
    if (!openPanel || closing) return;
    if (!openPanel.classList.contains("is-content-ready")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest("a, button, input, textarea, select, label")) return;

    closePanel();
  }

  function onKeydown(e) {
    if (e.key === "Escape" && openPanel) {
      e.preventDefault();
      closePanel();
    }
  }

  function openByTheme(themeId) {
    var card = document.querySelector('.services-fan__card[data-service-theme="' + themeId + '"]');
    if (!card) return false;
    return openFromCard(card);
  }

  function pendingServiceId() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get("service");
    if (fromUrl) return fromUrl;
    return sessionStorage.getItem(SERVICE_KEY);
  }

  function clearServiceRoute() {
    sessionStorage.removeItem(SERVICE_KEY);
    if (!history.replaceState) return;
    var params = new URLSearchParams(window.location.search);
    if (!params.has("service")) return;
    params.delete("service");
    var next =
      window.location.pathname +
      (params.toString() ? "?" + params.toString() : "") +
      window.location.hash;
    history.replaceState(null, "", next);
  }

  function prepareAndOpen(themeId) {
    if (!themeId) return;

    function launch() {
      if (window.cosgralSectionSnap?.jumpTo) window.cosgralSectionSnap.jumpTo(1);
      else if (window.cosgralSectionSnap?.goTo) window.cosgralSectionSnap.goTo(1);

      function tryOpen() {
        if (openByTheme(themeId)) {
          clearServiceRoute();
          return;
        }
        window.setTimeout(tryOpen, REDUCED ? 0 : 120);
      }

      if (window.cosgralServicesFan?.goToTheme) {
        window.cosgralServicesFan.goToTheme(themeId, tryOpen);
      } else {
        window.setTimeout(tryOpen, REDUCED ? 0 : 320);
      }
    }

    if (document.body.classList.contains("is-ready")) launch();
    else {
      var obs = new MutationObserver(function () {
        if (!document.body.classList.contains("is-ready")) return;
        obs.disconnect();
        launch();
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }
  }

  function bootFromUrl() {
    if (!document.body.classList.contains("home-page")) return;
    var id = pendingServiceId();
    if (!id) return;
    prepareAndOpen(id);
  }

  function bindCards() {
    if (!document.body.classList.contains("home-page")) return;

    document.addEventListener(
      "click",
      function (e) {
        if (openPanel) return;
        var card = e.target.closest(".services-fan__card.is-active");
        if (!card) return;
        e.preventDefault();
        e.stopPropagation();
        openFromCard(card);
      },
      true
    );

    document.querySelectorAll("[data-open-service]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        var id = el.getAttribute("data-open-service");
        if (!id) return;
        e.preventDefault();
        e.stopPropagation();
        prepareAndOpen(id);
      });
    });
  }

  window.cosgralServicePanel = {
    open: openFromCard,
    openByTheme: openByTheme,
    prepareAndOpen: prepareAndOpen,
    close: closePanel,
    isOpen: function () {
      return !!openPanel;
    },
    themeFromSlug: function (slug) {
      return SERVICE_SLUGS[slug] || null;
    },
    serviceUrl: function (themeId) {
      return "index.html?service=" + themeId;
    },
    pendingServiceId: pendingServiceId,
    SERVICE_KEY: SERVICE_KEY,
  };

  document.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onContactCtaClick, true);

  function init() {
    bindCards();
    bootFromUrl();
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();

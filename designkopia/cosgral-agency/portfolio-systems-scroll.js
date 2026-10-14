/**
 * Systems editorial scroll — replaces arc fan detail view with
 * 11 horizontal editorial portrait cards + description panel below.
 * Injects into .expand-systems created by portfolio-expand.js.
 */
(function () {
  "use strict";

  /* ——— Card art + long descriptions per case id ——— */
  var ARTS = {
    "tfo-crm": {
      bg: "#141619", type: "orbit",
      label: "Wszystko.<br>W jednym.", lw: "300", ls: "clamp(1.3rem,3.5vw,3rem)",
      long: "Handlowcy TelForce pokrywają cały kraj — do tej pory koordynacja tras, raportowanie wizyt i zarządzanie relacjami z klientami odbywało się w Excelu i telefonie. Wdrożyliśmy CRM z interaktywną mapą handlowców. System automatycznie generuje optymalne trasy dzienne na podstawie lokalizacji klientów, priorytetów i okien czasowych, rejestruje czas wizyt z GPS i synchronizuje wszystko z centralą w czasie rzeczywistym. Managerowie widzą na mapie gdzie jest każdy handlowiec i jaki jest status ostatniej wizyty — bez telefonów i raportów. Czas planowania tras skrócił się o 70%, a raport dzienny zastąpił tygodniowy."
    },
    "tfo-code39": {
      bg: "#0c0f15", type: "barcode",
      label: "SKANUJ.<br>GOTOWE.", lw: "700", ls: "clamp(1.4rem,3.8vw,3.2rem)",
      long: "Towary TelForce wymagają etykiet Code 39 zgodnych z normą branżową — etykiety powstawały ręcznie w kilku różnych narzędziach, a część wracała ze skanera magazynowego jako błąd. Generator przyjmuje numery SKU z arkusza lub API systemu magazynowego, waliduje sumę kontrolną i generuje podgląd etykiety przed drukiem. Batch trafia bezpośrednio na drukarkę Zebra bez pośredniego pliku. Eliminacja błędów identyfikacji towaru — zero reklamacji z powodu złego kodu od dnia wdrożenia. Oszczędność: 2 godziny ręcznej pracy dziennie."
    },
    "tfo-forecast": {
      bg: "#0f1219", type: "bars",
      label: "DANE<br>NA ŻYWO.", lw: "700", ls: "clamp(1.3rem,3.5vw,3rem)",
      long: "Zamawianie towaru na podstawie przeczucia managera generowało braki w szczycie sprzedaży i kosztowne nadwyżki poza sezonem. Panel analityczny łączy historię sprzedaży z bieżącymi stanami magazynowymi i danymi z ERP. Model prognozowania na 30, 60 i 90 dni generuje automatyczne propozycje zamówień z uwzględnieniem lead time dostawcy i sezonowości. Alerty o zbliżającym się braku trafiają do działu zakupów zanim produkt zniknie z półki. Efekt: redukcja przepełnienia magazynu o 34% przy jednoczesnym spadku braków o 61%."
    },
    "trove-panel": {
      bg: "#121018", type: "panel",
      label: "JEDEN<br>PANEL.", lw: "800", ls: "clamp(1.5rem,4vw,3.4rem)",
      long: "Trove ręcznie porównywało ceny na Allegro i własnym sklepie co tydzień w arkuszu — reakcja na zmianę ceny przez konkurenta zajmowała nawet kilka dni. Panel integruje dane ze sklepu internetowego, Allegro i trzech największych konkurentów w jednym widoku aktualizowanym co godzinę. Automatyczny alert trafia do managera, gdy marża spada poniżej ustalonego progu lub gdy konkurent zmienia cenę kluczowego produktu. Reguły repricing pozwalają na automatyczną korektę ceny w zdefiniowanych granicach bez manualnej pracy. Czas reakcji: z 3 dni do 12 minut."
    },
    "crm-leady": {
      bg: "#0d1320", type: "funnel",
      label: "OD LEADA<br>DO DEALA.", lw: "700", ls: "clamp(1.1rem,3vw,2.6rem)",
      long: "Leady z formularzy kontaktowych, Facebooka i cold mailingu wpadały do różnych miejsc — część ginęła bez śladu, żadna nie miała ustalonego czasu odpowiedzi. Pipeline CRM zbiera wszystkie leady w jedno miejsce z automatyczną kategoryzacją źródła i intencji. Każdy nowy lead w ciągu 3 minut dostaje spersonalizowanego maila powitalnego i trafia do konkretnego handlowca z timeboxem odpowiedzi. Leady bez reakcji po 24h eskalują automatycznie do managera. Efekt: czas pierwszego kontaktu skrócił się z 2 dni do 18 minut średnio."
    },
    "chatbot": {
      bg: "#ff482b", type: "bubble",
      label: "24/7.", lw: "800", ls: "clamp(3rem,8vw,7rem)", dark: true,
      long: "Ponad 65% zapytań trafiających do biura obsługi dotyczyło statusu zamówienia, procedury zwrotu lub dostępności towaru — każde zajmowało konsultantowi 3–5 minut i nie wymagało żadnej wiedzy eksperckiej. Chatbot AI odpowiada na te pytania natychmiastowo, integrując się z systemem zamówień i stanami magazynowymi w czasie rzeczywistym. Rozumie język naturalny po polsku i angielsku, identyfikuje intencję klienta i eskaluje do człowieka wyłącznie sprawy wymagające decyzji. W pierwszym miesiącu bez udziału konsultanta obsłużył 84% zapytań. ROI zamyka się w ciągu 3 miesięcy przy ruchu 200+ wiadomości dziennie."
    },
    "trove-flow": {
      bg: "#0a0d13", type: "flow",
      label: "ZAMÓWIENIE<br>→ PACZKA.", lw: "700", ls: "clamp(1rem,2.8vw,2.4rem)",
      long: "Każde zamówienie Trove wymagało ręcznej weryfikacji stanów magazynowych, wygenerowania dokumentu WZ, wydruku etykiety kurierskiej i aktualizacji statusu w trzech systemach jednocześnie — przy dużym ruchu zaczęło brakować rąk. Workflow działa w pełni automatycznie: po potwierdzeniu płatności system rezerwuje towar, generuje WZ i etykietę kurierską, aktualizuje status we wszystkich kanałach i wysyła powiadomienie do klienta z numerem śledzenia — wszystko w 90 sekund. Czas manualnej obsługi zamówienia: z 12 minut do zera. Pojemność obsługi wzrosła czterokrotnie bez rozbudowy zespołu."
    },
    "ai-agent": {
      bg: "#0e0f17", type: "network",
      label: "ŁĄCZYMY<br>KANAŁY.", lw: "700", ls: "clamp(1.3rem,3.5vw,3rem)",
      long: "Sprzedaż równolegle na własnym sklepie, Allegro, Amazon i OLX oznaczała ręczne kopiowanie stanów między kanałami kilka razy dziennie — nadsprzedaż i konflikty stanów zdarzały się kilka razy w tygodniu, generując reklamacje i anulowania. Centralny hub synchronizuje stany we wszystkich kanałach w czasie rzeczywistym — zamówienie z Allegro natychmiast redukuje dostępność w sklepie i na Amazon. Jeden panel zarządza cenami, promocjami i asortymentem we wszystkich kanałach jednocześnie. Eliminacja nadsprzedaży od pierwszego tygodnia wdrożenia."
    },
    "shelf": {
      bg: "#111419", type: "shelf",
      label: "SHELF<br>SYNC.", lw: "800", ls: "clamp(1.7rem,4.5vw,3.8rem)",
      long: "Shelf zarządzał asortymentem przez arkusze synchronizowane raz na dobę — rozbieżności między rzeczywistym stanem magazynowym a tym widocznym w sklepie generowały zamówienia na towary których nie było, reklamacje i niezadowolonych klientów. Shelf-sync łączy skaner magazynowy, system ERP i sklep online w jeden strumień danych aktualizowany przy każdej operacji magazynowej, nie raz na dobę. Inwentaryzacja: z tygodnia do 4 godzin. Zero zamówień na towar którego nie ma od dnia wdrożenia. Obsługa zwrotu: towar z powrotem w puli dostępnej w 8 minut."
    },
    "kpi": {
      bg: "#0d1015", type: "gauge",
      label: "KPI<br>LIVE.", lw: "800", ls: "clamp(2rem,5vw,4.2rem)",
      long: "Zarząd otrzymywał tygodniowy raport z Excela — do poniedziałkowego spotkania był już nieaktualny o 7 dni. Dashboard KPI agreguje dane z ERP, CRM, sklepu internetowego i narzędzi marketingowych w jeden widok aktualizowany co 15 minut. Każdy szczebel zarządzania ma swoje widgety — CEO widzi marżę i cashflow, kierownik sprzedaży widzi pipeline i konwersję, logistyk widzi czas realizacji zamówień i liczbę zwrotów. Alerty push informują o przekroczeniu progów zanim problem urośnie do rozmiarów wymagających interwencji kryzysowej. Decyzje na podstawie danych, nie na podstawie przeczucia."
    },
    "network": {
      bg: "#0b0e17", type: "nodegraph",
      label: "GRAF<br>WORKFLOW.", lw: "700", ls: "clamp(1.3rem,3.5vw,3rem)",
      long: "Firma skalowała procesy ręcznie przez lata — nikt nie wiedział dokładnie, które systemy zależą od których i co się stanie, gdy jeden z nich zawiedzie. Graf workflow mapuje wszystkie integracje, automatyzacje i zależności między systemami w jednym interaktywnym widoku dostępnym dla całego zespołu. Każdy węzeł pokazuje status w czasie rzeczywistym, historię błędów z ostatnich 30 dni i łączny czas przestoju. Gdy któraś z integracji zawiedzie, system identyfikuje kaskadę zależności i powiadamia odpowiedni zespół zanim problem dotrze do klienta. Diagnoza awarii: z 2 godzin do 8 minut."
    }
  };

  var ACC = "#ff482b";

  /* ——— SVG art builder — uses currentColor so each tile's text color drives the palette ——— */
  function svgFor(type) {
    var A = "#ff482b"; /* accent always orange */
    switch (type) {
      case "orbit":
        /* Identical to catalog orbit tile SVG */
        return '<svg class="sys-ed-art-svg" viewBox="0 0 400 400" fill="none" aria-hidden="true">'
          + '<ellipse cx="200" cy="200" rx="166" ry="65" transform="rotate(-38 200 200)" stroke="currentColor" stroke-opacity=".45" stroke-width="1"/>'
          + '<ellipse cx="200" cy="200" rx="168" ry="84" transform="rotate(34 200 200)" stroke="currentColor" stroke-opacity=".15" stroke-width="1"/>'
          + '<path d="M24 200H376M200 30V370" stroke="currentColor" stroke-opacity=".1" stroke-width="1"/>'
          + '<circle cx="75" cy="265" r="7" fill="' + A + '"/>'
          + '<circle cx="313" cy="137" r="3" fill="currentColor" opacity=".55"/>'
          + '<circle cx="214" cy="194" r="13" stroke="currentColor" stroke-opacity=".55"/>'
          + '<path d="m210 194 3 3 5-6" stroke="currentColor" stroke-opacity=".55"/>'
          + '</svg>';
      case "barcode": {
        var bars = [5,14,22,26,34,38,46,54,62,70,76,82,90,96,104,110,118,126,134,140,148,154,162,170,178,186,194,198];
        return '<svg class="sys-ed-art-svg" viewBox="0 0 210 200" fill="none" aria-hidden="true">'
          + bars.map(function(x,i){
              var w = (i%3===1)?3:1.5;
              var col = (i%5===0) ? A : "currentColor";
              var op = (i%3===2) ? 0.3 : 0.85;
              return '<rect x="'+x+'" y="25" width="'+w+'" height="150" fill="'+col+'" opacity="'+op+'"/>';
            }).join("")
          + '</svg>';
      }
      case "bars": {
        var data = [[28,90],[55,65],[82,110],[109,45],[136,130],[163,55]];
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + data.map(function(b,i){
              var isA = (i===3);
              return '<rect x="'+b[0]+'" y="'+(178-b[1])+'" width="18" height="'+b[1]+'" rx="2" fill="'+(isA?A:"currentColor")+'" opacity="'+(isA?1:0.55)+'"/>';
            }).join("")
          + '<path d="M22 178H178" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/>'
          + '</svg>';
      }
      case "panel":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<rect x="18" y="28" width="164" height="144" rx="6" stroke="currentColor" stroke-opacity=".42" stroke-width="1.2"/>'
          + '<line x1="18" y1="55" x2="182" y2="55" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/>'
          + '<rect x="28" y="66" width="55" height="7" rx="2" fill="currentColor" fill-opacity=".35"/>'
          + '<rect x="28" y="79" width="85" height="5" rx="2" fill="currentColor" fill-opacity=".2"/>'
          + '<rect x="28" y="90" width="65" height="5" rx="2" fill="currentColor" fill-opacity=".2"/>'
          + '<rect x="28" y="104" width="100" height="5" rx="2" fill="currentColor" fill-opacity=".15"/>'
          + '<rect x="28" y="120" width="50" height="18" rx="3" fill="' + A + '" opacity=".55"/>'
          + '<circle cx="170" cy="41" r="4" fill="' + A + '"/>'
          + '</svg>';
      case "funnel":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<path d="M25 38H175L132 108H68Z" stroke="currentColor" stroke-opacity=".42" stroke-width="1.5" fill="currentColor" fill-opacity=".1"/>'
          + '<line x1="68" y1="108" x2="88" y2="162" stroke="currentColor" stroke-opacity=".42" stroke-width="1.5"/>'
          + '<line x1="132" y1="108" x2="112" y2="162" stroke="currentColor" stroke-opacity=".42" stroke-width="1.5"/>'
          + '<circle cx="100" cy="170" r="8" fill="' + A + '"/>'
          + '<circle cx="55" cy="46" r="4" fill="currentColor" fill-opacity=".5"/>'
          + '<circle cx="100" cy="46" r="4" fill="currentColor" fill-opacity=".5"/>'
          + '<circle cx="145" cy="46" r="4" fill="currentColor" fill-opacity=".5"/>'
          + '</svg>';
      case "bubble":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<rect x="16" y="24" width="115" height="58" rx="14" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>'
          + '<rect x="27" y="39" width="65" height="8" rx="2" fill="currentColor" fill-opacity=".28"/>'
          + '<rect x="27" y="53" width="45" height="6" rx="2" fill="currentColor" fill-opacity=".18"/>'
          + '<rect x="69" y="106" width="115" height="58" rx="14" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-opacity=".28" stroke-width="1.5"/>'
          + '<rect x="80" y="120" width="70" height="8" rx="2" fill="currentColor" fill-opacity=".22"/>'
          + '<rect x="80" y="134" width="50" height="6" rx="2" fill="currentColor" fill-opacity=".14"/>'
          + '</svg>';
      case "flow":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<rect x="8"  y="48" width="44" height="26" rx="4" stroke="currentColor" stroke-opacity=".42" stroke-width="1.2"/>'
          + '<rect x="78" y="48" width="44" height="26" rx="4" stroke="currentColor" stroke-opacity=".42" stroke-width="1.2"/>'
          + '<rect x="148" y="48" width="44" height="26" rx="4" stroke="' + A + '" stroke-width="1.2"/>'
          + '<path d="M52 61H78" stroke="currentColor" stroke-opacity=".42" stroke-width="1.2"/>'
          + '<path d="M122 61H148" stroke="currentColor" stroke-opacity=".42" stroke-width="1.2"/>'
          + '<path d="M170 74v18" stroke="' + A + '" stroke-width="1.2"/>'
          + '<circle cx="170" cy="100" r="5" fill="' + A + '" opacity=".7"/>'
          + '<path d="M30 74v18" stroke="currentColor" stroke-opacity=".45" stroke-width="1"/>'
          + '<path d="M100 74v18" stroke="currentColor" stroke-opacity=".45" stroke-width="1"/>'
          + '</svg>';
      case "network":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<circle cx="30" cy="100" r="8" stroke="currentColor" stroke-opacity=".42" stroke-width="1"/>'
          + '<circle cx="100" cy="45" r="8" fill="' + A + '" fill-opacity=".2" stroke="' + A + '" stroke-width="1"/>'
          + '<circle cx="100" cy="155" r="8" stroke="currentColor" stroke-opacity=".42" stroke-width="1"/>'
          + '<circle cx="170" cy="100" r="8" stroke="currentColor" stroke-opacity=".42" stroke-width="1"/>'
          + '<path d="M38 100L92 45M38 100L92 155M108 45L162 100M108 155L162 100" stroke="currentColor" stroke-opacity=".18" stroke-width="1"/>'
          + '<circle cx="100" cy="100" r="16" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5"/>'
          + '<circle cx="100" cy="100" r="5" fill="' + A + '" opacity=".7"/>'
          + '</svg>';
      case "shelf":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<line x1="18" y1="58"  x2="182" y2="58"  stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>'
          + '<line x1="18" y1="108" x2="182" y2="108" stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>'
          + '<line x1="18" y1="158" x2="182" y2="158" stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>'
          + '<rect x="28" y="68"  width="16" height="40" rx="2" fill="currentColor" fill-opacity=".28"/>'
          + '<rect x="50" y="72"  width="11" height="36" rx="2" fill="currentColor" fill-opacity=".28"/>'
          + '<rect x="67" y="64"  width="20" height="44" rx="2" fill="' + A + '" opacity=".58"/>'
          + '<rect x="93" y="70"  width="14" height="38" rx="2" fill="currentColor" fill-opacity=".28"/>'
          + '<rect x="113" y="68" width="18" height="40" rx="2" fill="currentColor" fill-opacity=".22"/>'
          + '<rect x="28" y="116" width="24" height="42" rx="2" fill="currentColor" fill-opacity=".22"/>'
          + '<rect x="58" y="118" width="16" height="40" rx="2" fill="currentColor" fill-opacity=".22"/>'
          + '</svg>';
      case "gauge":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<path d="M28 142A86 86 0 0 1 172 142" stroke="currentColor" stroke-opacity=".18" stroke-width="14" stroke-linecap="round"/>'
          + '<path d="M28 142A86 86 0 0 1 148 68"  stroke="' + A + '"  stroke-width="14" stroke-linecap="round"/>'
          + '<line x1="100" y1="142" x2="144" y2="74" stroke="currentColor" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>'
          + '<circle cx="100" cy="142" r="8" fill="currentColor" fill-opacity=".18"/>'
          + '<circle cx="100" cy="142" r="4" fill="currentColor" fill-opacity=".65"/>'
          + '</svg>';
      case "nodegraph":
        return '<svg class="sys-ed-art-svg" viewBox="0 0 200 200" fill="none" aria-hidden="true">'
          + '<circle cx="100" cy="100" r="14" stroke="' + A + '" stroke-width="1.5"/>'
          + '<circle cx="38"  cy="58"  r="7" stroke="currentColor" stroke-opacity=".42" stroke-width="1"/>'
          + '<circle cx="162" cy="58"  r="7" stroke="currentColor" stroke-opacity=".42" stroke-width="1"/>'
          + '<circle cx="38"  cy="142" r="7" stroke="currentColor" stroke-opacity=".42" stroke-width="1"/>'
          + '<circle cx="162" cy="142" r="7" stroke="currentColor" stroke-opacity=".42" stroke-width="1"/>'
          + '<circle cx="100" cy="168" r="7" stroke="' + A + '" stroke-opacity=".6" stroke-width="1"/>'
          + '<path d="M45 62L88 90M155 62L112 90M45 138L88 110M155 138L112 110M100 114L100 161" stroke="currentColor" stroke-opacity=".18" stroke-width="1"/>'
          + '</svg>';
      default:
        return "";
    }
  }

  /* ——— Build the scroll expand inside .expand-systems ——— */
  function buildScrollExpand(expandEl) {
    var cases = window.CosgralSystemsFan && window.CosgralSystemsFan.cases;
    if (!cases || !cases.length) return;

    var outer = document.createElement("div");
    outer.className = "scs-outer";

    var track = document.createElement("div");
    track.className = "scs-track";
    track.setAttribute("tabindex", "0");
    track.setAttribute("aria-label", "Kafelki systemów");

    /* Spacer before first card so card 0 can be centered */
    var sp1 = document.createElement("div");
    sp1.className = "scs-spacer";
    sp1.setAttribute("aria-hidden", "true");
    track.appendChild(sp1);

    cases.forEach(function (item, i) {
      var art = ARTS[item.id] || { bg: "#141619", type: "orbit", label: item.title, lw: "400", ls: "clamp(1rem,3vw,2.5rem)" };
      var isDark = !!art.dark;
      var num = (i + 1 < 10 ? "0" : "") + (i + 1);
      var tagShort = item.tag.split("/")[0].trim().toUpperCase();

      var slide = document.createElement("div");
      slide.className = "scs-slide" + (i === 0 ? " is-active" : "");
      slide.dataset.scsIdx = String(i);
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-label", item.title);

      /* Use the exact same sys-ed-tile structure as the catalog tiles */
      var tile = document.createElement("div");
      tile.className = "sys-ed-tile";
      tile.style.background = art.bg;
      if (isDark) tile.style.color = "#130b09";

      tile.innerHTML =
        '<div class="sys-ed-tile__top"><span>' + num + ' / SYS</span><span>' + tagShort + '</span></div>'
        + '<div class="sys-ed-tile__art">'
        +   svgFor(art.type)
        +   '<strong class="sys-ed-exp-type" style="font-weight:' + art.lw + ';font-size:' + art.ls + '">' + art.label + '</strong>'
        + '</div>'
        + '<div class="sys-ed-tile__label"><span>' + item.title + '</span><i aria-hidden="true">↗</i></div>';

      slide.appendChild(tile);
      track.appendChild(slide);
    });

    /* Spacer after last card so card 10 can be centered */
    var sp2 = document.createElement("div");
    sp2.className = "scs-spacer";
    sp2.setAttribute("aria-hidden", "true");
    track.appendChild(sp2);

    outer.appendChild(track);

    var descPanel = document.createElement("div");
    descPanel.className = "scs-desc";
    outer.appendChild(descPanel);

    expandEl.appendChild(outer);
    initScroll(track, descPanel, cases, expandEl, outer);
  }

  /* ——— Description panel renderer ——— */
  function renderDesc(descPanel, idx, cases) {
    var item = cases[idx];
    var art = ARTS[item.id] || {};
    var longText = art.long || "";

    descPanel.innerHTML =
      '<div class="scs-desc__inner">'
      + '<div class="scs-desc__meta">'
      +   '<span class="scs-desc__tag">' + item.tag + '</span>'
      +   (item.client ? '<span class="scs-desc__client">' + item.client + '</span>' : '')
      + '</div>'
      + '<h3 class="scs-desc__title">' + item.title + '</h3>'
      + '<p class="scs-desc__text">' + item.desc + '</p>'
      + (longText ? '<div class="scs-desc__long" hidden><p>' + longText + '</p></div>' : '')
      + '<div class="scs-desc__foot">'
      + (longText ? '<button class="scs-read-more" type="button" data-scs-read>Czytaj więcej ↓</button>' : '<span></span>')
      +   '<button class="scs-close-btn" type="button" data-scs-close>Zwiń ↑</button>'
      + '</div>'
      + '</div>';

    var closeBtn = descPanel.querySelector("[data-scs-close]");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        var back = document.querySelector("[data-expand-back]");
        if (back) back.click();
      });
    }

    var readBtn = descPanel.querySelector("[data-scs-read]");
    var longEl  = descPanel.querySelector(".scs-desc__long");
    if (readBtn && longEl) {
      readBtn.addEventListener("click", function () {
        var isOpen = !longEl.hidden;
        longEl.hidden = isOpen;
        readBtn.textContent = isOpen ? "Czytaj więcej ↓" : "Zwiń opis ↑";
        readBtn.classList.toggle("is-open", !isOpen);
      });
    }
  }

  /* ——— Scroll initializer ——— */
  function initScroll(track, descPanel, cases, expandEl, outer) {
    var slides = Array.from(track.querySelectorAll(".scs-slide"));
    var activeIdx = -1; /* -1 so first setActive(0) always fires */
    var descTimeout = null;
    var portfolioRoot = document.querySelector("[data-portfolio-tiles]");

    function setActive(idx) {
      if (idx === activeIdx) return;
      activeIdx = idx;
      slides.forEach(function (s, i) { s.classList.toggle("is-active", i === idx); });

      /* Fade desc out → swap → fade in */
      descPanel.classList.add("is-changing");
      clearTimeout(descTimeout);
      descTimeout = setTimeout(function () {
        renderDesc(descPanel, idx, cases);
        descPanel.classList.remove("is-changing");
      }, 180);
    }

    /* IntersectionObserver — rootMargin clips to center 25 vw of the track
       so only the snap-centered slide is "intersecting" (ratio > 0.5).
       Slides are 25 vw; the observation zone is 25 vw wide → perfect match. */
    var io = new IntersectionObserver(function (entries) {
      var best = null, bestRatio = 0;
      entries.forEach(function (entry) {
        if (entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          best = entry.target;
        }
      });
      if (best && bestRatio >= 0.5) {
        var idx = parseInt(best.dataset.scsIdx, 10);
        if (!isNaN(idx)) setActive(idx);
      }
    }, {
      root: track,
      rootMargin: "0px -37.5% 0px -37.5%", /* leaves 25 vw center zone */
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    slides.forEach(function (slide) { io.observe(slide); });

    /* Keyboard: arrow keys scroll to adjacent slide */
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        scrollToIdx(Math.min(activeIdx + 1, cases.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        scrollToIdx(Math.max(activeIdx - 1, 0));
      }
    });

    /* scrollLeft for slide i = i × slideWidth
       Spacer (37.5 vw) positions slide 0 so its center is at 50 vw → scrollLeft = 0. */
    function scrollToIdx(idx) {
      var sw = slides[0] ? slides[0].offsetWidth : window.innerWidth * 0.25;
      track.scrollTo({ left: idx * sw, behavior: "smooth" });
    }

    /* Close animation: fade overlay out when portfolio root gets is-systems-exiting */
    if (portfolioRoot) {
      var closeObs = new MutationObserver(function () {
        if (portfolioRoot.classList.contains("is-systems-exiting")) {
          outer.style.transition = "opacity 0.7s ease";
          outer.style.opacity = "0";
          closeObs.disconnect();
          io.disconnect();
        }
      });
      closeObs.observe(portfolioRoot, { attributes: true, attributeFilter: ["class"] });
    }

    setActive(0);
  }

  /* ——— Wire up MutationObserver on expand-body ——— */
  function boot() {
    var bodyEl = document.querySelector("[data-expand-body]");
    if (!bodyEl) return;

    var mo = new MutationObserver(function (muts) {
      for (var m = 0; m < muts.length; m++) {
        for (var n = 0; n < muts[m].addedNodes.length; n++) {
          var node = muts[m].addedNodes[n];
          if (node.nodeType === 1 && node.classList && node.classList.contains("expand-systems")) {
            buildScrollExpand(node);
          }
        }
      }
    });
    mo.observe(bodyEl, { childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

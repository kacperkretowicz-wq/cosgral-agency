/**
 * Systems fan (wachlarz) — arc carousel shared by catalog + expand.
 * Catalog: larger, slow auto-rotate.
 * Detail: manual drag + short copy; "Zobacz więcej" expands full case under the fan.
 */
(function () {
  "use strict";

  var STILL = "portfolio-media/showcase/chapter-stills/systems/bw/";

  var CASES_PL = [
    { id: "tfo-crm",      href: "#automatyzacje",     tag: "CRM / sprzedaż terenowa",  client: "TelForceOne S.A.", title: "CRM z mapą handlowców",          desc: "Handlowcy jeździli z Excelami i notatkami w telefonie — nikt nie wiedział, kto u kogo był. CRM z mapą zbiera klientów, trasy i raporty dnia w jednym miejscu, więc planowanie wizyt zajmuje minuty zamiast godziny.", img: STILL + "ui-crm-map-bw.jpg" },
    { id: "tfo-code39",   href: "#automatyzacje",   tag: "Narzędzie / identyfikacja", client: "TelForceOne S.A.", title: "Generator kodów Code 39",        desc: "Etykiety powstawały w kilku narzędziach i często wracały ze skanera jako błąd. Generator daje podgląd Code 39 i batch do druku — oznaczenie SKU w sekundach, bez poprawek na magazynie.", img: STILL + "ui-barcode-bw.jpg" },
    { id: "tfo-forecast", href: "#automatyzacje", tag: "Analityka / zapasy",        client: "TelForceOne S.A.", title: "Stany i prognozowanie",          desc: "Zakupy szły \u201ena wyczucie\u201f: braki na półce albo zamrożony towar. Panel łączy stany, rotację i prognozę z alertami — widać, co dokupić zanim sprzedaż stanie.", img: STILL + "ui-forecast-bw.jpg" },
    { id: "trove-panel",  href: "#automatyzacje",          tag: "Aplikacja",                 client: "Trove",            title: "Panel sklepu i monitoring cen",  desc: "Trove ręcznie porównywało ceny na Allegro i własnym sklepie w arkuszach. Panel zbiera stany i ceny kanałów z alertami przecen — reakcja na spadek marży tego samego dnia, nie po tygodniu.", img: STILL + "ui-price-monitor-bw.jpg" },
    { id: "crm-leady",    href: "#automatyzacje",            tag: "CRM",                       client: "",                 title: "CRM leadów i dealów",            desc: "Leady ginęły między skrzynką, czatem i karteczkami — follow-upy się spóźniały. CRM prowadzi od pierwszego kontaktu do deala: pipeline, notatki i przypomnienia w jednym lejku.", img: STILL + "ui-kanban-bw.jpg" },
    { id: "chatbot",      href: "#automatyzacje",           tag: "Automatyzacja",             client: "",                 title: "Chatbot AI dla klientów",        desc: "Po godzinach Instagram i Messenger zasypywały te same pytania, a zespół odpisywał rano z opóźnieniem. Bot zamyka FAQ 24/7, zbiera lead i oddaje rozmowę konsultantowi z kontekstem.", img: STILL + "ui-chatbot-bw.jpg" },
    { id: "trove-flow",   href: "#automatyzacje",       tag: "Automatyzacja",             client: "Trove",            title: "Zamówienie \u2192 faktura \u2192 paczka", desc: "Każde zamówienie Trove wymagało ręcznego klejenia faktury, statusu i maila do klienta. Workflow odpala cały łańcuch sam — mniej klikania, mniej pomyłek przy fulfillmentcie.", img: STILL + "ui-invoice-flow-bw.jpg" },
    { id: "ai-agent",     href: "#automatyzacje",           tag: "Automatyzacja",             client: "",                 title: "Agent AI i integracje",          desc: "Chat, mail i CRM żyły osobno — handoff to było kopiuj-wklej. Agent łączy kanały w jednym przepływie: klasyfikuje sprawę, uzupełnia kartę i przekazuje ją właściwej osobie.", img: STILL + "ui-ai-agent-bw.jpg" },
    { id: "shelf",        href: "#automatyzacje",          tag: "Aplikacja",                 client: "Trove",            title: "Shelf Sync",                     desc: "Produkt znikał z półki sprzedażowej, zanim magazyn zdążył zareagować. Shelf Sync pilnuje widoczności stanów i alarmuje, gdy oferta wypada z rynku.", img: STILL + "ui-shelf-sync-bw.jpg" },
    { id: "kpi",          href: "#automatyzacje", tag: "Analityka",                 client: "TelForceOne S.A.", title: "KPI board",                      desc: "Raporty tygodnia powstawały z kilku Exceli i zajmowały pół dnia. Board pokazuje sprzedaż i operacje na żywo — puls firmy bez budowania tabel od zera.", img: STILL + "ui-kpi-board-bw.jpg" },
    { id: "network",      href: "#automatyzacje",       tag: "Automatyzacja",             client: "",                 title: "Graf workflow",                  desc: "Automatyzacje siedziały w głowie jednej osoby albo w chaotycznych regułach. Graf pokazuje triggery, warunki i akcje — łatwiej utrzymać proces i dokładać kolejne kroki.", img: STILL + "ui-network-bw.jpg" },
  ];

  var CASES_EN = [
    { id: "tfo-crm",      href: "#automatyzacje",     tag: "CRM / field sales",        client: "TelForceOne S.A.", title: "Sales rep map CRM",              desc: "Sales reps drove around with Excel files and phone notes — no one knew who had visited whom. The map CRM gathers clients, routes and daily reports in one place, so trip planning takes minutes instead of hours.", img: STILL + "ui-crm-map-bw.jpg" },
    { id: "tfo-code39",   href: "#automatyzacje",   tag: "Tool / identification",    client: "TelForceOne S.A.", title: "Code 39 barcode generator",      desc: "Labels were created in multiple tools and often came back from the scanner as errors. The generator provides a Code 39 preview and batch print — SKU labelling in seconds, no warehouse corrections.", img: STILL + "ui-barcode-bw.jpg" },
    { id: "tfo-forecast", href: "#automatyzacje", tag: "Analytics / inventory",    client: "TelForceOne S.A.", title: "Stock levels & forecasting",     desc: "Purchases were made by gut feeling: empty shelves or frozen stock. The dashboard combines levels, turnover and forecast with alerts — see what to reorder before sales stop.", img: STILL + "ui-forecast-bw.jpg" },
    { id: "trove-panel",  href: "#automatyzacje",          tag: "Application",              client: "Trove",            title: "Store panel & price monitoring", desc: "Trove manually compared prices on Allegro and its own store using spreadsheets. The panel aggregates stock and channel prices with discount alerts — react to margin drops the same day, not after a week.", img: STILL + "ui-price-monitor-bw.jpg" },
    { id: "crm-leady",    href: "#automatyzacje",            tag: "CRM",                      client: "",                 title: "Leads & deals CRM",              desc: "Leads got lost between inbox, chat and sticky notes — follow-ups were late. The CRM guides from first contact to deal: pipeline, notes and reminders in one funnel.", img: STILL + "ui-kanban-bw.jpg" },
    { id: "chatbot",      href: "#automatyzacje",           tag: "Automation",               client: "",                 title: "AI chatbot for clients",         desc: "After hours Instagram and Messenger were flooded with the same questions, and the team replied in the morning with delays. The bot handles FAQ 24/7, captures leads and hands off conversations to consultants with context.", img: STILL + "ui-chatbot-bw.jpg" },
    { id: "trove-flow",   href: "#automatyzacje",       tag: "Automation",               client: "Trove",            title: "Order \u2192 invoice \u2192 parcel", desc: "Every Trove order required manually stitching together an invoice, status and customer email. The workflow fires the whole chain automatically — less clicking, fewer fulfilment errors.", img: STILL + "ui-invoice-flow-bw.jpg" },
    { id: "ai-agent",     href: "#automatyzacje",           tag: "Automation",               client: "",                 title: "AI agent & integrations",        desc: "Chat, email and CRM lived separately — handoff was copy-paste. The agent connects channels in one flow: classifies the issue, fills the card and routes it to the right person.", img: STILL + "ui-ai-agent-bw.jpg" },
    { id: "shelf",        href: "#automatyzacje",          tag: "Application",              client: "Trove",            title: "Shelf Sync",                     desc: "Products vanished from the sales shelf before the warehouse could react. Shelf Sync monitors stock visibility and alerts when a listing drops off the market.", img: STILL + "ui-shelf-sync-bw.jpg" },
    { id: "kpi",          href: "#automatyzacje", tag: "Analytics",                client: "TelForceOne S.A.", title: "KPI board",                      desc: "Weekly reports were built from multiple Excel files and took half a day. The board shows sales and operations live — company pulse without building tables from scratch.", img: STILL + "ui-kpi-board-bw.jpg" },
    { id: "network",      href: "#automatyzacje",       tag: "Automation",               client: "",                 title: "Workflow graph",                 desc: "Automations lived in one person's head or in chaotic rules. The graph shows triggers, conditions and actions — easier to maintain the process and add steps.", img: STILL + "ui-network-bw.jpg" },
  ];

  function getCases() {
    var lang = (window.cosgralI18n && window.cosgralI18n.getLang && window.cosgralI18n.getLang()) || "pl";
    return lang === "en" ? CASES_EN : CASES_PL;
  }

  /* Rewrites of the copy that opens with each system. Facts only — no new clients, figures or results. */
  var STORY = {
    "tfo-crm": {
      pl: [
        "Dla TelForceOne S.A. zbudowaliśmy aplikację CRM dla przedstawicieli w terenie. Handlowcy jeździli z listami w Excelu i notatkami w telefonie: szef sprzedaży nie widział na żywo, kto u kogo był, trasy się dublowały albo omijały ważnych klientów, a raport dnia ginął w skrzynce.",
        "Aplikacja łączy bazę klientów, mapę pinów, plan trasy i log wizyty. Handlowiec check-inuje się u klienta, dopisuje temat i follow-up, a wpis od razu trafia na kartę — bez drugiej aplikacji. Planowanie trasy schodzi z godzinnego układania arkusza do przeglądu mapy, a zespół ma jedną historię kontaktu i raport dnia bez ręcznego przepisywania."
      ],
      en: [
        "For TelForceOne S.A. we built a CRM for field reps. They worked from Excel lists and phone notes: sales leadership could not see who had visited whom, routes overlapped or skipped key accounts, and the day report disappeared in inboxes.",
        "The app keeps customer records, map pins, a route plan and a visit log together. A rep checks in, adds the topic and a follow-up, and it lands on the account at once, without a second app. Route planning drops from an hour in a spreadsheet to a short look at the map, and the team shares one contact history plus a day report that no longer has to be retyped."
      ]
    },
    "tfo-code39": {
      pl: [
        "Dla magazynu i produkcji TelForceOne S.A. zbudowaliśmy lekką aplikację kodów Code 39. Towary oznaczano w rozproszonych narzędziach: błędny kod wracał ze skanera, a przygotowanie paczki etykiet na nową dostawę zajmowało nieproporcjonalnie dużo czasu.",
        "Operator wpisuje wartość, widzi podgląd pasków na żywo, kontroluje parametry etykiety i wysyła kolejkę do druku bez przełączania programów. Pojedyncza etykieta powstaje w sekundach, a oznaczanie SKU jest tym samym procesem dla całego zespołu."
      ],
      en: [
        "For TelForceOne S.A. warehouse and production we built a light Code 39 app. Goods were labeled across scattered tools: a bad code bounced at the scanner, and preparing a label batch for a new delivery took far too long.",
        "The operator enters a value, sees a live preview of the bars, checks the label and sends a print queue without switching programs. A single label takes seconds, and SKU labeling is the same process for the whole team."
      ]
    },
    "tfo-forecast": {
      pl: [
        "Dla zakupów TelForceOne S.A. zbudowaliśmy panel stanów i prognoz. Decyzje opierały się na spóźnionych arkuszach: towaru brakowało w kluczowym momencie albo magazyn trzymał nadwyżkę „na wszelki wypadek”, bez wspólnego widoku ryzyka.",
        "Panel pokazuje bieżący stan, historię sprzedaży, prognozę na kolejne tygodnie i alerty poniżej minimum. Od sygnału braku do draftu zamówienia zakupowego jest jedna ścieżka, cotygodniowe planowanie zajmuje mniej czasu, a zespół rozmawia o tych samych liczbach."
      ],
      en: [
        "For TelForceOne S.A. purchasing we built an inventory and forecast panel. Decisions ran on stale spreadsheets: a key item ran out at the wrong moment, or the warehouse held “just in case” overstock, with no shared view of risk.",
        "The panel shows live stock, sales history, a forecast for the coming weeks and alerts below minimum. There is one path from a shortage signal to a purchase-order draft, weekly planning takes less time, and the team talks about the same numbers."
      ]
    },
    "trove-panel": {
      pl: [
        "Dla zespołu Trove zbudowaliśmy panel operacyjny sklepu. Stany i ceny marketplace’ów porównywano ręcznie, więc przecena konkurencji albo własna oferta poza rynkiem wychodziła z opóźnieniem — często dopiero gdy spadła sprzedaż.",
        "Panel zbiera stany oraz porównanie cen własnego sklepu, Allegro i konkurencji, razem z alertami przecen. Feed zdarzeń mówi, kiedy skorygować ofertę. Kontrola cen i dostępności zajmuje minuty dziennie, a na spadek marży da się zareagować tego samego dnia."
      ],
      en: [
        "For Trove’s team we built a store operations panel. Marketplace stock and prices were compared by hand, so a competitor markdown or their own off-market listing showed up late — often only after sales dipped.",
        "The panel gathers stock and a price comparison across their own shop, Allegro and competitors, with markdown alerts. The event feed says when a listing needs a correction. Price and availability checks take minutes a day, and a margin drop can be met the same day."
      ]
    },
    "crm-leady": {
      pl: [
        "Zbudowaliśmy CRM od leada do zamkniętego deala dla zespołu B2B. Zapytania z formularza, maila i poleceń ginęły między skrzynkami: nikt nie wiedział, który deal stoi, kto miał oddzwonić i co ustalono tydzień temu.",
        "System prowadzi kolejkę, kwalifikację, kanban pipeline, alerty braku follow-upu i oś historii kontaktu. Rozmowy i maile siedzą przy karcie, nie w prywatnej skrzynce. Pierwsza reakcja jest szybsza, a lejek widać na co dzień, nie dopiero na statusie miesięcznym."
      ],
      en: [
        "We built a CRM from lead to closed deal for a B2B team. Inquiries from forms, email and referrals were lost between inboxes: no one knew which deal was stuck, who should call back, or what was agreed a week ago.",
        "The system runs intake, qualification, a kanban pipeline, alerts when a follow-up is missing, and a contact timeline. Calls and emails sit on the card, not in a private inbox. The first response is faster, and the funnel is visible every day rather than only at the monthly status."
      ]
    },
    "chatbot": {
      pl: [
        "Zbudowaliśmy chatbota AI w jednym inboxie na social i stronę. Instagram, Facebook i formularz WWW zasypywały skrzynkę pytaniami o godziny, ofertę i wycenę. Po godzinach nikt nie odpowiadał, a rano kolejka rosła szybciej, niż zespół zdążył odpisać.",
        "Bot klasyfikuje sprawę, odpowiada na FAQ, zbiera zakres i budżet, a gdy pewność spada — przekazuje rozmowę konsultantowi z pełnym wątkiem. Pierwsza odpowiedź jest dostępna całą dobę, a człowiek wchodzi tam, gdzie jest potrzebny, z gotowym briefem."
      ],
      en: [
        "We built an AI chatbot in one inbox for social and the website. Instagram, Facebook and the site form flooded the inbox with questions about hours, the offer and pricing. After hours nobody answered, and by morning the queue grew faster than the team could reply.",
        "The bot classifies the case, answers FAQ, collects scope and budget, and when confidence drops it hands the thread to a consultant with the full conversation. A first reply is available around the clock, and a person steps in only where one is needed, with a ready brief."
      ]
    },
    "trove-flow": {
      pl: [
        "Dla Trove zbudowaliśmy automatyczny łańcuch od zamówienia do faktury i statusu paczki. Po każdym zamówieniu ktoś przepisywał dane do faktury, aktualizował status w drugim narzędziu i wysyłał wiadomość do klienta. Przy wzroście zamówień rosła też liczba pomyłek i opóźnień.",
        "Od checkoutu system sam przygotowuje eksport pod fakturę, przekazuje zamówienie do magazynu lub API kuriera, prowadzi track & trace i wysyła powiadomienie statusowe. Człowiek wkracza tylko przy wyjątkach, a klient dostaje spójny status."
      ],
      en: [
        "For Trove we built an automatic chain from order to invoice and parcel status. After every order someone retyped the data into an invoice, updated a status in a second tool and sent the customer a message. As orders grew, so did mistakes and delays.",
        "From checkout the system prepares the invoice export, passes the order to the warehouse or the courier API, follows track and trace and sends a status notice. A person steps in only for exceptions, and the customer gets one consistent status."
      ]
    },
    "ai-agent": {
      pl: [
        "Zbudowaliśmy agenta AI, który spina kanały w jednym przepływie. Chat, mail i CRM żyły osobno, a przekazanie sprawy było kopiowaniem między nimi.",
        "Agent klasyfikuje sprawę, uzupełnia kartę i przekazuje ją właściwej osobie."
      ],
      en: [
        "We built an AI agent that joins the channels in one flow. Chat, email and the CRM lived apart, and handing a case over meant copying between them.",
        "The agent classifies the case, fills in the card and passes it to the right person."
      ]
    },
    "shelf": {
      pl: [
        "Dla Trove zbudowaliśmy Shelf Sync. Produkt znikał z półki sprzedażowej, zanim magazyn zdążył zareagować.",
        "Narzędzie pilnuje widoczności stanów i alarmuje, gdy oferta wypada z rynku."
      ],
      en: [
        "For Trove we built Shelf Sync. A product disappeared from the sales shelf before the warehouse could react.",
        "The tool watches how visible the stock is and alerts when a listing drops off the market."
      ]
    },
    "kpi": {
      pl: [
        "Dla TelForceOne S.A. zbudowaliśmy board KPI. Raporty tygodnia powstawały z kilku Exceli i zajmowały pół dnia.",
        "Board pokazuje sprzedaż i operacje na żywo, bez budowania tabel od zera."
      ],
      en: [
        "For TelForceOne S.A. we built a KPI board. Weekly reports were assembled from several Excel files and took half a day.",
        "The board shows sales and operations live, without building the tables from scratch."
      ]
    },
    "network": {
      pl: [
        "Zbudowaliśmy graf workflow. Automatyzacje siedziały w głowie jednej osoby albo w chaotycznych regułach.",
        "Graf pokazuje triggery, warunki i akcje, więc proces da się utrzymać i dokładać do niego kolejne kroki."
      ],
      en: [
        "We built a workflow graph. Automations lived in one person’s head or in chaotic rules.",
        "The graph shows triggers, conditions and actions, so the process can be maintained and extended with further steps."
      ]
    }
  };

  function storyLang() {
    var lang = (window.cosgralI18n && window.cosgralI18n.getLang && window.cosgralI18n.getLang()) || "pl";
    return lang === "en" ? "en" : "pl";
  }

  function storyOf(item) {
    var pack = item && STORY[item.id];
    if (!pack) return [item && item.desc ? item.desc : ""];
    return pack[storyLang()] || pack.pl;
  }

  function systemPhoto(id) {
    return "assets/systems/" + id + ".webp";
  }

  function mountSystemPhoto(parent, id) {
    var img = document.createElement("img");
    img.className = "sys-illu__photo";
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.draggable = false;
    img.src = systemPhoto(id);
    parent.appendChild(img);
    return img;
  }

  function illuSvg(body) {
    return '<svg viewBox="0 0 120 78" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + "</svg>";
  }

  var INK = "#1c2b4a";
  var HEAT = "#e07a2f";
  var ILLU = {
    "tfo-crm": illuSvg('<rect x="10" y="8" width="100" height="62" rx="8" stroke="' + INK + '" stroke-width="1.6"/><path d="M20 54c10-14 18-6 26-16 8 12 16 4 24-8 8 10 12 16 16 24H20z" fill="' + INK + '" opacity=".1"/><circle cx="48" cy="34" r="3.4" fill="' + HEAT + '"/><circle cx="72" cy="26" r="2.8" fill="' + INK + '"/><circle cx="86" cy="42" r="2.8" fill="' + INK + '"/><path d="M48 34 L72 26 L86 42" stroke="' + INK + '" stroke-width="1.4"/>'),
    "tfo-code39": illuSvg('<rect x="16" y="14" width="88" height="50" rx="6" stroke="' + INK + '" stroke-width="1.6"/><path d="M26 24v30M32 24v30M36 24v30M44 24v30M48 24v30M56 24v30M64 24v30M70 24v30M78 24v30M86 24v30M92 24v30" stroke="' + INK + '" stroke-width="2"/><rect x="48" y="40" width="18" height="4" rx="1" fill="' + HEAT + '"/>'),
    "tfo-forecast": illuSvg('<rect x="14" y="12" width="92" height="54" rx="8" stroke="' + INK + '" stroke-width="1.6"/><path d="M24 50l16-10 14 6 18-16 16 8" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/><circle cx="88" cy="38" r="3.2" fill="' + HEAT + '"/><path d="M24 54h72" stroke="' + INK + '" stroke-width="1.2" opacity=".4"/>'),
    "trove-panel": illuSvg('<rect x="14" y="16" width="40" height="46" rx="6" stroke="' + INK + '" stroke-width="1.6"/><rect x="62" y="16" width="44" height="20" rx="6" stroke="' + INK + '" stroke-width="1.6"/><rect x="62" y="42" width="44" height="20" rx="6" stroke="' + INK + '" stroke-width="1.6"/><path d="M22 48h24M70 26h28M70 52h20" stroke="' + INK + '" stroke-width="1.4" opacity=".55"/><circle cx="78" cy="26" r="2.4" fill="' + HEAT + '"/>'),
    "crm-leady": illuSvg('<rect x="12" y="16" width="28" height="46" rx="6" stroke="' + INK + '" stroke-width="1.6"/><rect x="46" y="16" width="28" height="46" rx="6" stroke="' + INK + '" stroke-width="1.6"/><rect x="80" y="16" width="28" height="46" rx="6" stroke="' + INK + '" stroke-width="1.6"/><rect x="18" y="24" width="16" height="8" rx="2" fill="' + INK + '" opacity=".15"/><rect x="52" y="24" width="16" height="8" rx="2" fill="' + HEAT + '"/><rect x="86" y="24" width="16" height="8" rx="2" fill="' + INK + '" opacity=".15"/>'),
    "chatbot": illuSvg('<rect x="18" y="12" width="70" height="40" rx="10" stroke="' + INK + '" stroke-width="1.6"/><path d="M32 52l8 12 10-12" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/><circle cx="38" cy="32" r="2.4" fill="' + INK + '"/><circle cx="50" cy="32" r="2.4" fill="' + INK + '"/><circle cx="62" cy="32" r="2.4" fill="' + HEAT + '"/><rect x="78" y="36" width="26" height="22" rx="8" stroke="' + INK + '" stroke-width="1.4"/>'),
    "trove-flow": illuSvg('<rect x="8" y="26" width="28" height="26" rx="6" stroke="' + INK + '" stroke-width="1.6"/><rect x="46" y="26" width="28" height="26" rx="6" stroke="' + INK + '" stroke-width="1.6"/><rect x="84" y="26" width="28" height="26" rx="6" stroke="' + INK + '" stroke-width="1.6"/><path d="M36 39h10M74 39h10" stroke="' + HEAT + '" stroke-width="1.6"/><path d="M18 34h8M54 34h8M96 36h10" stroke="' + INK + '" stroke-width="1.3" opacity=".5"/>'),
    "ai-agent": illuSvg('<circle cx="60" cy="38" r="10" stroke="' + INK + '" stroke-width="1.6"/><circle cx="60" cy="38" r="3" fill="' + HEAT + '"/><circle cx="26" cy="22" r="6" stroke="' + INK + '" stroke-width="1.4"/><circle cx="96" cy="24" r="6" stroke="' + INK + '" stroke-width="1.4"/><circle cx="28" cy="58" r="6" stroke="' + INK + '" stroke-width="1.4"/><circle cx="94" cy="56" r="6" stroke="' + INK + '" stroke-width="1.4"/><path d="M32 26 L50 34M90 28 L70 34M34 54 L50 44M88 52 L70 44" stroke="' + INK + '" stroke-width="1.3"/>'),
    "shelf": illuSvg('<path d="M22 18h76M22 38h76M22 58h76" stroke="' + INK + '" stroke-width="1.6"/><rect x="30" y="22" width="14" height="16" rx="2" stroke="' + INK + '" stroke-width="1.4"/><rect x="50" y="24" width="14" height="14" rx="2" stroke="' + INK + '" stroke-width="1.4"/><rect x="70" y="42" width="14" height="16" rx="2" fill="' + HEAT + '" opacity=".9"/><rect x="36" y="44" width="16" height="14" rx="2" stroke="' + INK + '" stroke-width="1.4"/>'),
    "kpi": illuSvg('<rect x="14" y="12" width="92" height="54" rx="8" stroke="' + INK + '" stroke-width="1.6"/><rect x="24" y="36" width="12" height="20" rx="2" fill="' + INK + '" opacity=".2"/><rect x="42" y="28" width="12" height="28" rx="2" fill="' + INK + '" opacity=".45"/><rect x="60" y="22" width="12" height="34" rx="2" fill="' + HEAT + '"/><rect x="78" y="32" width="12" height="24" rx="2" fill="' + INK + '" opacity=".3"/>'),
    "network": illuSvg('<circle cx="28" cy="40" r="8" stroke="' + INK + '" stroke-width="1.6"/><circle cx="64" cy="22" r="8" stroke="' + INK + '" stroke-width="1.6"/><circle cx="66" cy="56" r="8" stroke="' + INK + '" stroke-width="1.6"/><circle cx="98" cy="38" r="8" fill="' + HEAT + '"/><path d="M36 36 L56 24M36 44 L58 52M72 26 L90 36M74 52 L90 42" stroke="' + INK + '" stroke-width="1.4"/>')
  };

  var CASES = getCases();

  var instances = [];
  var pageCache = {};

  function clampIndex(i, n) {
    var x = i % n;
    return x < 0 ? x + n : x;
  }

  function fetchCaseHtml(href) {
    if (pageCache[href]) return Promise.resolve(pageCache[href]);
    return fetch(href, { credentials: "same-origin" })
      .then(function (r) {
        return r.text();
      })
      .then(function (html) {
        pageCache[href] = html;
        return html;
      });
  }

  function extractCaseBody(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var article = doc.querySelector("article.case-study");
    if (!article) return null;
    var wrap = document.createElement("div");
    wrap.className = "sys-fan__case";
    var intro = article.querySelector(".case-viz-intro");
    var story = article.querySelector(".case-viz-close__copy");
    var rail = article.querySelector(".case-viz-rail");
    var aside = article.querySelector(".case-study__aside");
    if (intro) {
      var introClone = intro.cloneNode(true);
      var back = introClone.querySelector(".case-study__back");
      if (back && back.parentNode) back.parentNode.removeChild(back);
      wrap.appendChild(introClone);
    }
    /* Case narrative (problem → solution → result) before interactive viz tiles */
    if (story) {
      var storyWrap = document.createElement("div");
      storyWrap.className = "sys-fan__case-story case-viz-close__copy";
      storyWrap.innerHTML = story.innerHTML;
      wrap.appendChild(storyWrap);
    }
    if (rail) wrap.appendChild(rail.cloneNode(true));
    if (aside) wrap.appendChild(aside.cloneNode(true));
    if (!wrap.childNodes.length) {
      wrap.innerHTML = article.innerHTML;
      var b2 = wrap.querySelector(".case-study__back");
      if (b2 && b2.parentNode) b2.parentNode.removeChild(b2);
    }
    /* Case footer: keep CTA only — no "Wróć do realizacji" */
    wrap.querySelectorAll(".case-study__visit").forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    /* neutralize in-page hash jumps escaping the panel */
    wrap.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        var target = wrap.querySelector("#" + CSS.escape(id));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    return wrap;
  }

  function createFan(root, opts) {
    opts = opts || {};
    var mode = opts.mode || "catalog";
    var reduced =
      document.documentElement.classList.contains("reduce-motion") || !!opts.reduced;
    var currentCases = getCases();
    var n = currentCases.length;
    var index = typeof opts.index === "number" ? clampIndex(opts.index, currentCases.length) : 0;
    var painted = -1;
    var autoplay = mode === "catalog" && !reduced && opts.autoplay !== false;
    var allowDrag = opts.drag !== false;
    var allowWheel = opts.wheel !== false;
    var dragAxis = opts.dragAxis === "x" ? "x" : "free";
    var circle = !!opts.circle;
    var pendingDrag = null;
    var destroyed = false;
    var dragging = false;
    var didDrag = false;
    var lastX = 0;
    var vel = 0;
    var dragOrigin = 0;
    var raf = 0;
    var autoTimer = 0;
    var copyEl = null;
    var articleEl = null;
    var articleOpen = false;
    var articleLoading = false;
    var scrollParent = null;
    var fanWheelLock = 0;
    var FAN_WHEEL_MS = 780;

    root.classList.add("sys-fan");
    root.classList.toggle("sys-fan--catalog", mode === "catalog");
    root.classList.toggle("sys-fan--detail", mode === "detail");
    root.classList.toggle("sys-fan--circle", circle);
    root.innerHTML =
      '<div class="sys-fan__head" data-sys-fan-head>' +
      '<div class="sys-fan__stage" data-sys-fan-stage>' +
      '<div class="sys-fan__arc" data-sys-fan-arc></div>' +
      (circle ? '<button type="button" class="sys-fan__pill is-in" data-sys-fan-pill></button>' : "") +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__copy" data-sys-fan-copy aria-live="polite"></div>'
        : "") +
      "</div>" +
      (mode === "detail"
        ? '<div class="sys-fan__article" data-sys-fan-article hidden></div>'
        : "") +
      '<div class="sys-fan__nav" data-sys-fan-nav>' +
      (circle
        ? '<svg class="sys-fan__goo-svg" aria-hidden="true"><filter id="sys-fan-goo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></svg>' +
          '<div class="sys-fan__nav-goo"><div class="sys-fan__semi" aria-hidden="true"></div><div class="sys-fan__ring" data-sys-fan-dots role="tablist" data-i18n-aria-label="portfolio.systems_dots"></div></div>'
        : "") +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-prev data-i18n-aria-label="portfolio.systems_prev">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M10.2 2.6L5.4 8l4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      (circle ? "" : '<div class="sys-fan__dots" data-sys-fan-dots role="tablist" data-i18n-aria-label="portfolio.systems_dots"></div>') +
      '<button type="button" class="sys-fan__arrow" data-sys-fan-next data-i18n-aria-label="portfolio.systems_next">' +
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M5.8 2.6L10.6 8l-4.8 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      "</div>";

    var arc = root.querySelector("[data-sys-fan-arc]");
    var stage = root.querySelector("[data-sys-fan-stage]");
    copyEl = root.querySelector("[data-sys-fan-copy]");
    articleEl = root.querySelector("[data-sys-fan-article]");
    var navEl = root.querySelector("[data-sys-fan-nav]");
    var dotsEl = root.querySelector("[data-sys-fan-dots]");
    var pill = root.querySelector("[data-sys-fan-pill]");
    var irisEl = null;
    var irisOpen = false;
    var cards = [];
    var dotButtons = [];

    currentCases.forEach(function (item, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "sys-fan__dot" + (i === index ? " is-active" : "");
      dot.setAttribute("data-sys-fan-dot", String(i));
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", item.title);
      if (i === index) dot.setAttribute("aria-current", "true");
      dot.addEventListener("click", function (e) {
        e.stopPropagation();
        stopAuto();
        setIndex(i, true);
        if (autoplay) startAuto();
      });
      dotsEl.appendChild(dot);
      dotButtons.push(dot);
    });

    currentCases.forEach(function (item, i) {
      var fig = document.createElement("figure");
      fig.className = "sys-fan__card";
      fig.setAttribute("data-sys-fan-card", String(i));
      fig.setAttribute("data-case-id", item.id);
      if (circle) {
        var disc = document.createElement("span");
        disc.className = "sys-fan__disc";
        var img = document.createElement("img");
        img.src = item.img;
        img.alt = item.title;
        img.decoding = "async";
        img.draggable = false;
        disc.appendChild(img);
        fig.appendChild(disc);
        fig.setAttribute("aria-label", item.title || "");
      } else {
        var fanImg = document.createElement("img");
        fanImg.src = systemPhoto(item.id);
        fanImg.alt = item.title;
        fanImg.decoding = "async";
        fanImg.draggable = false;
        fig.appendChild(fanImg);
        var cap = document.createElement("figcaption");
        cap.className = "sys-fan__cap";
        cap.textContent = item.tag;
        fig.appendChild(cap);
      }
      fig.addEventListener("click", function () {
        if (Math.abs(vel) > 0.08 || didDrag) return;
        if (circle && i === clampIndex(Math.round(index), n)) {
          playIris();
          return;
        }
        setIndex(i, true);
      });
      arc.appendChild(fig);
      cards.push(fig);
    });

    function getScrollParent() {
      if (scrollParent && scrollParent.isConnected) return scrollParent;
      scrollParent = root.closest(".expand-systems") || root;
      return scrollParent;
    }

    function restoreNav() {
      if (!navEl || !root) return;
      if (navEl.parentNode !== root) root.appendChild(navEl);
      navEl.classList.remove("is-in-case");
    }

    function placeNavInCaseAside(caseRoot) {
      if (!navEl || !caseRoot) return;
      var aside = caseRoot.querySelector(".case-study__aside");
      if (!aside) return;
      var cta = aside.querySelector(".case-study__cta");
      navEl.classList.add("is-in-case");
      if (cta && cta.parentNode === aside) aside.insertBefore(navEl, cta);
      else aside.appendChild(navEl);
    }

    function collapseArticle(immediate) {
      if (!articleEl) return;
      articleOpen = false;
      articleLoading = false;
      root.classList.remove("is-article-open");
      articleEl.classList.remove("is-open");
      restoreNav();
      if (immediate) {
        articleEl.hidden = true;
        articleEl.innerHTML = "";
        return;
      }
      articleEl.style.maxHeight = articleEl.scrollHeight + "px";
      void articleEl.offsetHeight;
      articleEl.style.maxHeight = "0px";
      window.setTimeout(function () {
        if (articleOpen) return;
        articleEl.hidden = true;
        articleEl.innerHTML = "";
        articleEl.style.maxHeight = "";
      }, reduced ? 0 : 1000);
    }

    function paintStoryArticle(item) {
      var paras = storyOf(item);
      articleEl.classList.remove("is-loading");
      articleEl.hidden = false;
      articleEl.innerHTML = "";
      var body = document.createElement("article");
      body.className = "case-study case-study--inline";
      var h = document.createElement("h2");
      h.className = "case-study__title";
      h.textContent = item.title || "";
      body.appendChild(h);
      if (item.client) {
        var client = document.createElement("p");
        client.className = "case-study__lede";
        client.textContent = item.client;
        body.appendChild(client);
      }
      var copy = document.createElement("div");
      copy.className = "case-study__copy";
      paras.forEach(function (text) {
        var p = document.createElement("p");
        p.textContent = text;
        copy.appendChild(p);
      });
      body.appendChild(copy);
      articleEl.appendChild(body);
      articleOpen = true;
      articleLoading = false;
      root.classList.add("is-article-open");
      articleEl.classList.add("is-open");
      articleEl.style.maxHeight = "none";
    }

    function expandArticle(item) {
      if (!articleEl || articleLoading) return;
      if (!item || !item.href || item.href.charAt(0) === "#") {
        paintStoryArticle(item || {});
        return;
      }
      articleLoading = true;
      articleEl.hidden = false;
      articleEl.classList.add("is-loading");
      articleEl.innerHTML = '<p class="sys-fan__article-loading">' + ((window.cosgralI18n && window.cosgralI18n.t("portfolio.loading")) || "Loading…") + '</p>';
      articleEl.style.maxHeight = "4rem";
      fetchCaseHtml(item.href)
        .then(function (html) {
          if (destroyed || clampIndex(Math.round(index), n) !== CASES.indexOf(item) && CASES[clampIndex(Math.round(index), n)].href !== item.href) {
            /* index moved — abort */
            articleLoading = false;
            return;
          }
          var nearest = CASES[clampIndex(Math.round(index), n)];
          if (nearest.id !== item.id && nearest.href !== item.href) {
            articleLoading = false;
            return;
          }
          var body = extractCaseBody(html);
          articleEl.classList.remove("is-loading");
          articleEl.innerHTML = "";
          if (!body) {
            articleEl.innerHTML = '<p class="sys-fan__article-fallback">' + (function(){ var i = window.cosgralI18n; return (i&&i.t('portfolio.case_fallback')||'Could not load description.') + ' <a href="' + item.href + '">' + (i&&i.t('portfolio.open_case_link')||'Open case study →') + '</a>'; })() + '</p>';
          } else {
            articleEl.appendChild(body);
            enhanceInjectedCase(body);
            placeNavInCaseAside(body);
          }
          articleOpen = true;
          root.classList.add("is-article-open");
          articleEl.classList.add("is-open");
          articleEl.style.maxHeight = "0px";
          void articleEl.offsetHeight;
          var full = articleEl.scrollHeight;
          articleEl.style.maxHeight = full + "px";
          /* Stay at top — forced scroll was clipping the sticky head / first tiles */
          var scroller = getScrollParent();
          if (scroller) scroller.scrollTop = 0;
          articleLoading = false;
          window.setTimeout(function () {
            if (articleOpen) articleEl.style.maxHeight = "none";
          }, reduced ? 0 : 1400);
        })
        .catch(function () {
          articleLoading = false;
          articleEl.classList.remove("is-loading");
          articleEl.innerHTML = '<p class="sys-fan__article-fallback">' + (function(){ var i = window.cosgralI18n; return (i&&i.t('portfolio.case_fallback')||'Could not load description.') + ' <a href="' + item.href + '">' + (i&&i.t('portfolio.open_case_link')||'Open case study →') + '</a>'; })() + '</p>';
          articleOpen = true;
          root.classList.add("is-article-open");
          articleEl.classList.add("is-open");
          articleEl.style.maxHeight = "12rem";
        });
    }

    function applyI18nToNode(rootEl) {
      if (!rootEl) return;
      var i18n = window.cosgralI18n;
      if (!i18n || !i18n.t) return;
      var lang = i18n.getLang ? i18n.getLang() : "pl";
      rootEl.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.getAttribute("data-i18n");
        var val = i18n.t(key);
        if (val == null) return;
        if (el.hasAttribute("data-i18n-html")) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      });
      rootEl.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
        var v = i18n.t(el.getAttribute("data-i18n-aria-label"));
        if (v != null) el.setAttribute("aria-label", v);
      });
      rootEl.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        var v = i18n.t(el.getAttribute("data-i18n-title"));
        if (v != null) el.setAttribute("title", v);
      });
    }

    function pillLabel() {
      var t = window.cosgralI18n && window.cosgralI18n.t && window.cosgralI18n.t("portfolio.view_more");
      return String(t || (storyLang() === "en" ? "See more" : "Zobacz więcej")).replace(/\s*→\s*$/, "");
    }
    if (pill) {
      pill.textContent = pillLabel();
      pill.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        didDrag = false;
      });
      pill.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        playIris();
      });
    }

    function wrapRaw(i) {
      var raw = i - index;
      if (raw > n / 2) raw -= n;
      if (raw < -n / 2) raw += n;
      return raw;
    }

    /* Spec-a ease: cubic-bezier(0.25, 1, 0.5, 1) via Newton. */
    function swipeEase(t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      var u = t;
      var k;
      for (k = 0; k < 5; k++) {
        var x =
          3 * (1 - u) * (1 - u) * u * 0.25 +
          3 * (1 - u) * u * u * 0.5 +
          u * u * u;
        var dx =
          3 * (1 - u) * (1 - u) * 0.25 +
          6 * (1 - u) * u * (0.5 - 0.25) +
          3 * u * u * (1 - 0.5);
        if (Math.abs(dx) < 1e-5) break;
        u -= (x - t) / dx;
        if (u < 0) u = 0;
        if (u > 1) u = 1;
      }
      return 3 * u - 3 * u * u + u * u * u;
    }

    function circlePose(raw) {
      var vw = window.innerWidth || 480;
      var vh = window.innerHeight || 600;
      var mobile = vw < 760;
      var ad = Math.abs(raw);
      var x = vw * (0.5 + raw * (mobile ? 0.58 : 0.5));
      var y = ad < 1
        ? vh * (0.4075 + (0.515 - 0.4075) * ad)
        : vh * 0.515;
      var o = ad > 1.05 ? Math.max(0, 1 - (ad - 1.05) / 0.4) : 1;
      return { x: x, y: y, s: 1, o: o, ad: ad };
    }

    var pillTimer = 0;
    function pillOut() {
      if (!pill) return;
      pill.classList.remove("is-in");
      pill.classList.add("is-out");
    }
    function pillIn() {
      if (!pill || root.classList.contains("is-iris-open")) return;
      pill.classList.remove("is-out");
      pill.classList.add("is-in");
    }

    function layoutCircle() {
      if (destroyed) return;
      var casesNow = getCases();
      var nearest = clampIndex(Math.round(index), n);
      var stageRect = stage.getBoundingClientRect();
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;
      var mobile = vw < 760;
      cards.forEach(function (card, i) {
        var raw = wrapRaw(i);
        var pose = circlePose(raw);
        var ad = Math.abs(raw);
        card.style.left = pose.x - stageRect.left + "px";
        card.style.top = pose.y - stageRect.top + "px";
        card.style.transform = "translate(-50%, -50%) scale(" + pose.s.toFixed(4) + ")";
        card.style.opacity = String(Math.max(0, Math.min(1, pose.o)));
        card.style.visibility = pose.o < 0.04 ? "hidden" : "visible";
        card.style.pointerEvents = pose.o < 0.12 ? "none" : "auto";
        card.style.zIndex = String(Math.round(30 - ad * 8));
        card.classList.toggle("is-front", i === nearest);
        card.classList.toggle("is-side", ad > 0.55);
      });
      if (pill && !root.classList.contains("is-iris-open")) {
        var slot = circlePose(0);
        pill.style.left = slot.x - stageRect.left + "px";
        pill.style.top = slot.y - stageRect.top + vw * 0.045 + "px";
      }
      if (navEl && dotsEl) {
        var navRect = navEl.getBoundingClientRect();
        var arcCx = vw * 0.5;
        var arcCy = mobile ? navRect.bottom - 4 : vh * 0.989;
        var arcR = vw * (mobile ? 0.34 : 0.2925);
        var stepAng = mobile ? 36 : 47.5;
        dotButtons.forEach(function (dot, i) {
          var raw = wrapRaw(i);
          var ang = raw * stepAng * (Math.PI / 180);
          var x = arcCx + Math.sin(ang) * arcR;
          var y = arcCy - Math.cos(ang) * arcR;
          var on = i === nearest;
          var show = Math.abs(raw) < 2.35 && y < vh + 4;
          if (mobile) show = show && y > navRect.top + 2;
          dot.style.left = x - navRect.left + "px";
          dot.style.top = y - navRect.top + "px";
          dot.style.opacity = show ? "1" : "0";
          dot.style.pointerEvents = show ? "auto" : "none";
          dot.classList.toggle("is-active", on);
          if (on) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }
      if (typeof opts.onChange === "function") opts.onChange(nearest, casesNow[nearest]);
    }

    function scrollWord() {
      var t = window.cosgralI18n && window.cosgralI18n.t && window.cosgralI18n.t("hero.scroll");
      return t || (storyLang() === "en" ? "Scroll" : "Przewiń");
    }

    function fillIris(el, item) {
      var paras = storyOf(item);
      el.querySelector(".sys-iris__kicker").textContent = item.tag || item.client || "";
      el.querySelector(".sys-iris__h").textContent = item.title || "";
      var copy = el.querySelector(".sys-iris__copy");
      if (!copy) return;
      Array.prototype.slice.call(copy.querySelectorAll(".sys-iris__p")).forEach(function (node) {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
      var more = copy.querySelector(".sys-iris__more");
      paras.forEach(function (text) {
        var p = document.createElement("p");
        p.className = "sys-iris__p";
        p.textContent = text;
        if (more) copy.insertBefore(p, more);
        else copy.appendChild(p);
      });
      if (more) more.textContent = pillLabel();
      var hint = el.querySelector("[data-iris-scroll]");
      if (hint) hint.textContent = scrollWord();
    }

    function buildIris(item, prev, next, rect) {
      var el = document.createElement("div");
      el.className = "sys-iris";
      el.innerHTML =
        '<svg class="sys-fan__goo-svg" aria-hidden="true"><filter id="sys-iris-goo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></svg>' +
        '<div class="sys-iris__disc"></div>' +
        '<div class="sys-iris__sat sys-iris__sat--a"><img alt=""></div>' +
        '<div class="sys-iris__sat sys-iris__sat--b"><img alt=""></div>' +
        '<div class="sys-iris__sat sys-iris__sat--c"><img alt=""></div>' +
        '<div class="sys-iris__hint"><span data-iris-scroll></span><div class="sys-iris__dots" aria-hidden="true"><i></i><i></i><i></i></div></div>' +
        '<div class="sys-iris__copy"><p class="sys-iris__kicker"></p><h3 class="sys-iris__h"></h3><button type="button" class="sys-iris__more"></button></div>' +
        '<div class="sys-iris__nav"><div class="sys-iris__nav-goo"><div class="sys-iris__semi"></div><div class="sys-iris__neck"></div></div></div>';
      var sats = el.querySelectorAll(".sys-iris__sat");
      var trio = [item, prev, next];
      for (var s = 0; s < sats.length; s++) {
        var satImg = sats[s].querySelector("img");
        if (!satImg || !trio[s]) continue;
        satImg.src = trio[s].img;
        satImg.alt = trio[s].title || "";
      }
      fillIris(el, item);
      var moreBtn = el.querySelector(".sys-iris__more");
      if (moreBtn) {
        moreBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          closeIris();
        });
      }
      var disc = el.querySelector(".sys-iris__disc");
      disc.style.left = rect.left + "px";
      disc.style.top = rect.top + "px";
      disc.style.width = rect.width + "px";
      disc.style.height = rect.height + "px";
      return el;
    }

    function placeSats(el, cx, cy, open) {
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;
      var targets = open
        ? [
            { x: vw * 0.506, y: vh * 0.513 },
            { x: vw * 0.41, y: vh * 0.329 },
            { x: vw * 0.636, y: vh * 0.36 },
          ]
        : [
            { x: cx, y: cy },
            { x: cx, y: cy },
            { x: cx, y: cy },
          ];
      if (vw < 760 && open) {
        targets = [
          { x: vw * 0.34, y: vh * 0.28 },
          { x: vw * 0.68, y: vh * 0.2 },
          { x: vw * 0.78, y: vh * 0.38 },
        ];
      }
      var sats = el.querySelectorAll(".sys-iris__sat");
      for (var s = 0; s < sats.length; s++) {
        sats[s].style.left = targets[s].x + "px";
        sats[s].style.top = targets[s].y + "px";
      }
    }

    function playIris() {
      if (destroyed || !circle || irisOpen) return;
      stopAuto();
      var casesNow = getCases();
      var i = clampIndex(Math.round(index), casesNow.length);
      var item = casesNow[i];
      var prev = casesNow[(i - 1 + casesNow.length) % casesNow.length];
      var next = casesNow[(i + 1) % casesNow.length];
      var rect = cards[i].getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      pillOut();
      root.classList.add("is-iris-open");
      var el = buildIris(item, prev, next, rect);
      placeSats(el, cx, cy, false);
      el.querySelectorAll(".sys-iris__sat").forEach(function (sat) {
        sat.style.transition = "none";
      });
      document.body.appendChild(el);
      irisEl = el;
      irisOpen = true;
      el.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".sys-iris__more")) return;
        closeIris();
      });
      if (reduced) {
        el.classList.add("is-open");
        placeSats(el, cx, cy, true);
        return;
      }
      requestAnimationFrame(function () {
        if (!irisEl) return;
        el.querySelectorAll(".sys-iris__sat").forEach(function (sat) {
          sat.style.transition = "";
        });
        requestAnimationFrame(function () {
          if (!irisEl) return;
          placeSats(el, cx, cy, true);
          el.classList.add("is-open");
        });
      });
    }

    function closeIris(done) {
      if (!irisEl) {
        irisOpen = false;
        if (done) done();
        return;
      }
      var el = irisEl;
      var disc = el.querySelector(".sys-iris__disc");
      var cx = (parseFloat(disc.style.left) || 0) + (parseFloat(disc.style.width) || 0) / 2;
      var cy = (parseFloat(disc.style.top) || 0) + (parseFloat(disc.style.height) || 0) / 2;
      el.classList.remove("is-open");
      el.classList.add("is-closing");
      placeSats(el, cx, cy, false);
      root.classList.remove("is-iris-open");
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (irisEl === el) {
          irisEl = null;
          irisOpen = false;
        }
        pillIn();
        if (autoplay) startAuto();
        if (done) done();
      }, reduced ? 0 : 900);
    }

    function onIrisKey(e) {
      if (!irisOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeIris();
      }
    }
    if (circle) window.addEventListener("keydown", onIrisKey);

    function enhanceInjectedCase(rootEl) {
      if (!rootEl) return;
      rootEl.querySelectorAll(".case-viz-tile").forEach(function (tile) {
        tile.classList.add("is-entered");
      });
      /* Translate any data-i18n nodes fetched from raw HTML */
      applyI18nToNode(rootEl);
    }

    function layout() {
      if (destroyed) return;
      if (circle) {
        layoutCircle();
        return;
      }
      var nearest = clampIndex(Math.round(index), n);
      /* Same geometry in catalog + detail — click only pulls the camera back */
      var span = 172;
      var step = span / Math.max(8, n - 1);
      var radiusX = 78;
      var radiusY = 12;
      var baseScale = 1;

      cards.forEach(function (card, i) {
        var raw = i - index;
        if (raw > n / 2) raw -= n;
        if (raw < -n / 2) raw += n;
        var angDeg = raw * step;
        var ang = (angDeg * Math.PI) / 180;
        var x = Math.sin(ang) * radiusX;
        var y = (1 - Math.cos(ang)) * radiusY;
        var depth = Math.cos(ang);
        var s = baseScale * (0.58 + 0.42 * depth);
        var o = Math.max(0, 0.18 + 0.82 * Math.pow(Math.max(0, depth), 1.05));
        var rot = angDeg * 0.92;
        card.style.transform =
          "translate3d(calc(-50% + " +
          x.toFixed(3) +
          "vw), calc(-50% + " +
          y.toFixed(3) +
          "vh), 0) rotate(" +
          rot.toFixed(2) +
          "deg) scale(" +
          s.toFixed(3) +
          ")";
        card.style.opacity = String(Math.max(0, Math.min(1, o)));
        card.style.visibility = o < 0.04 ? "hidden" : "visible";
        card.style.pointerEvents = o < 0.12 ? "none" : "auto";
        card.style.zIndex = String(Math.round(20 + depth * 30));
        card.classList.toggle("is-front", i === nearest);
        card.classList.toggle("is-side", Math.abs(raw) > 0.55);
      });

      dotButtons.forEach(function (dot, i) {
        var on = i === nearest;
        dot.classList.toggle("is-active", on);
        if (on) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });

      if (copyEl && nearest !== painted) {
        if (articleOpen || articleLoading) collapseArticle(false);
        paintCopy(nearest);
        painted = nearest;
        var scroller = getScrollParent();
        if (scroller.scrollTop > 8) {
          if (reduced) scroller.scrollTop = 0;
          else {
            var from = scroller.scrollTop;
            var t0 = performance.now();
            function tick(now) {
              var p = Math.min(1, (now - t0) / 840);
              var e = 1 - Math.pow(1 - p, 4);
              scroller.scrollTop = from * (1 - e);
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          }
        }
      }
      if (typeof opts.onChange === "function") opts.onChange(nearest, CASES[nearest]);
    }

    function paintCopy(i) {
      if (!copyEl) return;
      var currentCases = getCases();
      var item = currentCases[i] || currentCases[0];
      if (!item) return;
      copyEl.classList.add("is-swapping");
      copyEl.innerHTML =
        '<p class="sys-fan__tag"></p>' +
        (item.client ? '<p class="sys-fan__client"></p>' : "") +
        '<h3 class="sys-fan__title"></h3>' +
        '<p class="sys-fan__desc"></p>' +
        '<button type="button" class="sys-fan__more" data-sys-fan-more></button>';
      copyEl.querySelector(".sys-fan__tag").textContent = item.tag;
      if (item.client) copyEl.querySelector(".sys-fan__client").textContent = item.client;
      copyEl.querySelector(".sys-fan__title").textContent = item.title;
      copyEl.querySelector(".sys-fan__desc").textContent = item.desc;
      var more = copyEl.querySelector("[data-sys-fan-more]");
      more.textContent = (window.cosgralI18n && window.cosgralI18n.t("portfolio.view_more_aria")) || (getCases() === CASES_EN ? "See more" : "Zobacz więcej");
      more.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (articleOpen && !articleLoading) {
          /* already open for this case — soft scroll to it */
          var scroller = getScrollParent();
          var targetTop = Math.min(
            160,
            Math.max(48, Math.round(window.innerHeight * 0.12))
          );
          scroller.scrollTo({ top: targetTop, behavior: reduced ? "auto" : "smooth" });
          return;
        }
        expandArticle(item);
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          copyEl.classList.remove("is-swapping");
        });
      });
    }

    function setIndex(next, animate) {
      var from = index;
      var to = typeof next === "number" ? next : Math.round(index);
      if (!animate || reduced) {
        index = clampIndex(Math.round(to), n);
        layout();
        if (circle) pillIn();
        return;
      }
      var delta = to - from;
      while (delta > n / 2) delta -= n;
      while (delta < -n / 2) delta += n;
      if (Math.abs(delta) < 0.001) {
        index = clampIndex(Math.round(from), n);
        layout();
        if (circle) pillIn();
        return;
      }
      to = from + delta;
      if (circle) {
        pillOut();
        if (pillTimer) window.clearTimeout(pillTimer);
      }
      var t0 = performance.now();
      var dur = circle ? 800 : 1040;
      if (raf) cancelAnimationFrame(raf);
      function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = circle ? swipeEase(p) : 1 - Math.pow(1 - p, 3);
        index = from + (to - from) * e;
        layout();
        if (p < 1) raf = requestAnimationFrame(tick);
        else {
          index = clampIndex(Math.round(to), n);
          layout();
          raf = 0;
          if (circle) pillTimer = window.setTimeout(pillIn, 0);
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function nudge(dir) {
      stopAuto();
      setIndex(index + dir, true);
      if (autoplay) startAuto(2400);
    }

    function startAuto() {
      stopAuto();
      if (!autoplay || destroyed) return;
      if (circle) {
        autoTimer = window.setInterval(function () {
          if (dragging || destroyed || irisOpen || document.hidden) return;
          nudge(1);
        }, 6400);
        return;
      }
      autoTimer = window.setInterval(function () {
        if (dragging || destroyed) return;
        index += 0.014;
        if (index >= n) index -= n;
        layout();
      }, 40);
    }

    function stopAuto() {
      if (autoTimer) {
        window.clearInterval(autoTimer);
        autoTimer = 0;
      }
    }

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      var x = e.clientX != null ? e.clientX : 0;
      var y = e.clientY != null ? e.clientY : 0;
      if (dragAxis === "x") {
        pendingDrag = { x: x, y: y, id: e.pointerId };
        didDrag = false;
        vel = 0;
        return;
      }
      dragging = true;
      didDrag = false;
      vel = 0;
      dragOrigin = index;
      lastX = x;
      if (circle) pillOut();
      stopAuto();
      stage.classList.add("is-dragging");
      document.body.classList.add("is-sys-fan-dragging");
    }
    function onPointerMove(e) {
      if (pendingDrag && !dragging) {
        if (e.pointerId != null && pendingDrag.id != null && e.pointerId !== pendingDrag.id) return;
        var px = e.clientX != null ? e.clientX : pendingDrag.x;
        var py = e.clientY != null ? e.clientY : pendingDrag.y;
        var adx = px - pendingDrag.x;
        var ady = py - pendingDrag.y;
        if (Math.abs(adx) < 8 && Math.abs(ady) < 8) return;
        var originX = pendingDrag.x;
        pendingDrag = null;
        if (Math.abs(ady) >= Math.abs(adx)) return;
        dragging = true;
        didDrag = true;
        vel = 0;
        dragOrigin = index;
        lastX = originX;
        if (circle) pillOut();
        stopAuto();
        stage.classList.add("is-dragging");
        document.body.classList.add("is-sys-fan-dragging");
      }
      if (!dragging) return;
      var x = e.clientX != null ? e.clientX : e.touches && e.touches[0].clientX;
      if (x == null) return;
      var dx = x - lastX;
      lastX = x;
      if (Math.abs(dx) > 2) didDrag = true;
      var w = stage.clientWidth || window.innerWidth || 360;
      var pxPer = circle
        ? Math.max(88, w * (w < 760 ? 0.34 : 0.22))
        : 1 / 0.006;
      vel = dx / pxPer;
      index -= dx / pxPer;
      while (index < 0) index += n;
      while (index >= n) index -= n;
      layout();
      if (e.cancelable) e.preventDefault();
    }
    function onPointerUp() {
      pendingDrag = null;
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      if (dragAxis === "x") {
        var stepped = Math.round(dragOrigin);
        var travel = index - dragOrigin;
        if (Math.abs(travel) > 0.12) stepped += travel > 0 ? 1 : -1;
        setIndex(stepped, true);
      } else {
        setIndex(index - vel * 8, true);
      }
      if (autoplay) startAuto();
      if (didDrag) {
        var swallow = function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          document.removeEventListener("click", swallow, true);
        };
        document.addEventListener("click", swallow, true);
        window.setTimeout(function () {
          document.removeEventListener("click", swallow, true);
          document.body.classList.remove("is-sys-fan-dragging");
        }, 80);
      } else {
        document.body.classList.remove("is-sys-fan-dragging");
      }
    }

    root.querySelector("[data-sys-fan-prev]").addEventListener("click", function (e) {
      e.stopPropagation();
      nudge(-1);
    });
    root.querySelector("[data-sys-fan-next]").addEventListener("click", function (e) {
      e.stopPropagation();
      nudge(1);
    });

    if (allowDrag) {
      stage.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    }

    function onWheel(e) {
      if (destroyed || irisOpen) return;
      /* Homepage circle: vertical wheel stays with the five-board pin. */
      var dominantX = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.15;
      if (dragAxis === "x" && !dominantX) return;
      /* Detail + article open: vertical outside stage scrolls the case slowly */
      if (
        mode === "detail" &&
        articleOpen &&
        !dominantX &&
        !(e.target && e.target.closest && e.target.closest("[data-sys-fan-stage]"))
      ) {
        return;
      }
      var delta = dominantX ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 4) return;
      e.preventDefault();
      e.stopPropagation();
      /* Jeden scroll = jeden kafelek systemu / automatyzacji */
      var now = Date.now();
      if (now - fanWheelLock < FAN_WHEEL_MS) return;
      fanWheelLock = now;
      nudge(delta > 0 ? 1 : -1);
    }
    if (allowWheel) root.addEventListener("wheel", onWheel, { passive: false });

    layout();
    if (circle) {
      window.addEventListener("resize", layout);
      requestAnimationFrame(function () {
        if (destroyed) return;
        layout();
        pillIn();
      });
    }
    if (autoplay) startAuto();

    var api = {
      root: root,
      mode: mode,
      cases: CASES,
      getIndex: function () {
        return clampIndex(Math.round(index), n);
      },
      setIndex: function (i) {
        setIndex(i, true);
      },
      pause: stopAuto,
      resume: function () {
        if (autoplay) startAuto();
      },
      collapseArticle: function () {
        collapseArticle(true);
      },
      refresh: function () {
        /* Re-paint current card with updated language data */
        var currentCases = getCases();
        n = currentCases.length;
        api.cases = currentCases;
        /* Update i18n aria-labels for prev/next/dots via cosgralI18n.t */
        var t = window.cosgralI18n && window.cosgralI18n.t;
        var prevEl = root.querySelector("[data-sys-fan-prev]");
        if (prevEl && t) prevEl.setAttribute("aria-label", t("portfolio.systems_prev"));
        var nextEl = root.querySelector("[data-sys-fan-next]");
        if (nextEl && t) nextEl.setAttribute("aria-label", t("portfolio.systems_next"));
        var dotsEl = root.querySelector("[data-sys-fan-dots]");
        if (dotsEl) {
          if (t) dotsEl.setAttribute("aria-label", t("portfolio.systems_dots"));
          /* Redraw dots with new aria-labels */
          Array.prototype.forEach.call(dotsEl.querySelectorAll("button"), function (dot, di) {
            dot.setAttribute("aria-label", currentCases[di] ? currentCases[di].title : "");
          });
        }
        cards.forEach(function (card, di) {
          if (!currentCases[di]) return;
          if (circle) {
            card.setAttribute("aria-label", currentCases[di].title || "");
            var discImg = card.querySelector(".sys-fan__disc img");
            if (discImg) {
              discImg.src = currentCases[di].img;
              discImg.alt = currentCases[di].title || "";
            }
          }
        });
        if (pill) pill.textContent = pillLabel();
        if (irisEl && irisOpen) {
          var openItem = currentCases[clampIndex(Math.round(index), currentCases.length)];
          if (openItem) fillIris(irisEl, openItem);
        }
        /* Repaint current card copy */
        var idx = clampIndex(Math.round(index), n);
        paintCopy(idx);
      },
      destroy: function () {
        destroyed = true;
        stopAuto();
        if (raf) cancelAnimationFrame(raf);
        if (circle) {
          window.removeEventListener("keydown", onIrisKey);
          window.removeEventListener("resize", layout);
        }
        if (irisEl && irisEl.parentNode) irisEl.parentNode.removeChild(irisEl);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        root.removeEventListener("wheel", onWheel);
        document.body.classList.remove("is-sys-fan-dragging");
        instances = instances.filter(function (x) {
          return x !== api;
        });
      },
    };
    instances.push(api);
    return api;
  }

  window.CosgralSystemsFan = {
    cases: CASES,
    create: createFan,
    getCases: getCases,
    storyOf: storyOf,
    getCatalog: function () {
      for (var i = 0; i < instances.length; i++) {
        if (instances[i].mode === "catalog") return instances[i];
      }
      return null;
    },
  };

  /* Re-render all fans when language changes or i18n becomes ready */
  function refreshAllFans() {
    CASES = getCases();
    window.CosgralSystemsFan.cases = CASES;
    instances.forEach(function (inst) {
      if (inst && inst.refresh) inst.refresh();
    });
  }
  window.addEventListener("cosgral:langchange", refreshAllFans);
  window.addEventListener("cosgral:i18n-ready", refreshAllFans);
})();

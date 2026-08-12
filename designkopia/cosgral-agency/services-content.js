/**
 * Treści usług — panel fullscreen (PL/EN).
 */
(function () {
  "use strict";

  var DATA = {
    blue: {
      pl: {
        num: "01",
        title: "Tworzenie stron internetowych",
        items: [
          "Strony wizytówkowe i landing page pod konkretne kampanie",
          "Rozbudowane serwisy firmowe z panelem CMS",
          "Sklepy e-commerce (od prostych po zintegrowane z ERP/CRM)",
          "Animacje i interakcje scroll-driven, gdy marka na to zasługuje",
          "Optymalizacja SEO, szybkości ładowania i Core Web Vitals",
        ],
        paragraphs: [
          "Dla firm, które chcą wyróżnić się wizualnie i technicznie — nie kolejnym szablonem, tylko stroną zbudowaną pod ich konkretny model biznesowy i grupę odbiorców.",
          "Efektem jest strona, która realnie konwertuje — ładuje się szybko, prowadzi użytkownika do działania i wygląda na tyle dobrze, że staje się argumentem sprzedażowym samym w sobie.",
        ],
      },
      en: {
        num: "01",
        title: "Website development",
        items: [
          "Business card sites and landing pages for specific campaigns",
          "Full company websites with a CMS panel",
          "E-commerce stores (from simple to ERP/CRM-integrated)",
          "Scroll-driven animations and interactions when the brand calls for it",
          "SEO, loading speed and Core Web Vitals optimization",
        ],
        paragraphs: [
          "For companies that want to stand out visually and technically — not another template, but a site built for their business model and audience.",
          "The result is a site that actually converts — loads fast, guides users to action and looks good enough to be a sales argument on its own.",
        ],
      },
    },
    purple: {
      pl: {
        num: "02",
        title: "Projektowanie aplikacji",
        items: [
          "Panele klienckie i portale B2B",
          "Narzędzia wewnętrzne usprawniające pracę zespołu",
          "Integracje z zewnętrznymi API i systemami firmy",
          "Progressive Web Apps (PWA) dostępne jak natywna aplikacja",
          "Projektowanie UX pod konkretny proces, nie generyczny wzorzec",
        ],
        paragraphs: [
          "Dla firm, które wyrosły z arkuszy kalkulacyjnych i maili, a ich proces wymaga własnego narzędzia — nie kolejnej subskrypcji uniwersalnego SaaS-u.",
          "Efektem jest aplikacja skrojona pod Twój realny przepływ pracy — zespół pracuje szybciej, mniej rzeczy robi się ręcznie, a dane nie giną między systemami.",
        ],
      },
      en: {
        num: "02",
        title: "Application design",
        items: [
          "Client panels and B2B portals",
          "Internal tools that streamline team workflows",
          "Integrations with external APIs and company systems",
          "Progressive Web Apps (PWA) that feel native",
          "UX design for your process, not a generic pattern",
        ],
        paragraphs: [
          "For companies that have outgrown spreadsheets and email threads and need their own tool — not another generic SaaS subscription.",
          "The result is an app tailored to your real workflow — the team works faster, less is done manually, and data doesn't get lost between systems.",
        ],
      },
    },
    gold: {
      pl: {
        num: "03",
        title: "Pozycjonowanie SEO i GEO",
        items: [
          "Audyt techniczny SEO — indeksowanie, szybkość, Core Web Vitals",
          "Strategia słów kluczowych i treści pod realne zapytania klientów",
          "GEO — widoczność marki w odpowiedziach ChatGPT, Gemini i Perplexity",
          "Dane strukturalne (schema.org) dla wyszukiwarek i modeli AI",
          "SEO lokalne i miesięczne raportowanie bez lania wody",
        ],
        paragraphs: [
          "Dla firm, które chcą stabilnego dopływu klientów z wyszukiwarki zamiast płacenia za każde kliknięcie — klasyczne SEO i GEO jednocześnie.",
          "Efektem jest rosnąca widoczność na zapytania, które faktycznie przynoszą pieniądze — mierzona pozycjami, ruchem organicznym i leadami.",
        ],
      },
      en: {
        num: "03",
        title: "SEO & GEO positioning",
        items: [
          "Technical SEO audit — indexing, speed, Core Web Vitals",
          "Keyword and content strategy for real customer queries",
          "GEO — brand visibility in ChatGPT, Gemini and Perplexity answers",
          "Structured data (schema.org) for search engines and AI models",
          "Local SEO and monthly reporting without the fluff",
        ],
        paragraphs: [
          "For companies that want a steady flow of search clients instead of paying for every click — classic SEO and GEO together.",
          "The result is growing visibility for queries that actually bring revenue — measured in rankings, organic traffic and leads.",
        ],
      },
    },
    orange: {
      pl: {
        num: "04",
        title: "Wdrażanie automatyzacji",
        items: [
          "Automatyzacja procesów sprzedażowych i marketingowych",
          "Integracje narzędzi (Zapier, Make, n8n i inne)",
          "Automatyczne raportowanie i powiadomienia",
          "Chatboty i asystenci AI obsługujący pierwszy kontakt",
          "Audyt procesów pod kątem tego, co warto zautomatyzować",
        ],
        paragraphs: [
          "Dla firm, w których te same czynności powtarzają się codziennie i pochłaniają czas, który powinien iść w rozwój biznesu.",
          "Efektem jest odzyskany czas zespołu i mniej błędów — zaczynamy od audytu, który pokazuje, co faktycznie opłaca się zautomatyzować.",
        ],
      },
      en: {
        num: "04",
        title: "Automation implementation",
        items: [
          "Sales and marketing process automation",
          "Tool integrations (Zapier, Make, n8n and more)",
          "Automated reporting and notifications",
          "Chatbots and AI assistants for first contact",
          "Process audit to identify what’s worth automating",
        ],
        paragraphs: [
          "For companies where the same tasks repeat daily and eat time that should go into growing the business.",
          "The result is reclaimed team time and fewer errors — we start with an audit that shows what’s actually worth automating.",
        ],
      },
    },
    crimson: {
      pl: {
        num: "05",
        title: "Systemy CRM",
        items: [
          "Wdrożenie i konfiguracja CRM (HubSpot, Pipedrive, rozwiązania dedykowane)",
          "Migracja danych z arkuszy i starych systemów",
          "Automatyzacja lejka sprzedaży i follow-upów",
          "Integracja CRM z formularzami, mailingiem i stroną",
          "Szkolenie zespołu i wsparcie po wdrożeniu",
        ],
        paragraphs: [
          "Dla firm, w których informacje o klientach żyją w mailach, arkuszach i głowach handlowców.",
          "Efektem jest jedno źródło prawdy o kliencie — widać etap każdej rozmowy, nic nie umyka, a raportowanie przestaje być ręczną pracą.",
        ],
      },
      en: {
        num: "05",
        title: "CRM systems",
        items: [
          "CRM implementation and setup (HubSpot, Pipedrive, custom solutions)",
          "Data migration from spreadsheets and legacy systems",
          "Sales funnel and follow-up automation",
          "CRM integration with forms, email and website",
          "Team training and post-launch support",
        ],
        paragraphs: [
          "For companies where client information lives in emails, spreadsheets and salespeople’s heads.",
          "The result is a single source of truth about each client — every conversation stage is visible, nothing slips through, and reporting stops being manual work.",
        ],
      },
    },
    green: {
      pl: {
        num: "06",
        title: "Grafika i montaż wideo",
        items: [
          "Identyfikacja wizualna i systemy graficzne marki",
          "Grafika na social media — spójna z resztą komunikacji",
          "Montaż wideo produktowego, reklamowego i reels",
          "Motion design pod stronę internetową i kampanie",
          "AI photoshooty produktów — editorial, nie generyczny stock",
        ],
        paragraphs: [
          "Dla marek, którym zależy na spójności — strona, social media i wideo wyglądają, jakby robiło je jedno studio z jedną wizją.",
          "Efektem jest oprawa wizualna budująca rozpoznawalność marki niezależnie od nośnika.",
        ],
        links: [
          { label: "Montaż wideo", href: "portfolio.html#montaz", i18n: "bento.montaz" },
          { label: "Grafiki i social", href: "portfolio.html#grafiki", i18n: "bento.grafiki" },
        ],
      },
      en: {
        num: "06",
        title: "Graphics & video editing",
        items: [
          "Visual identity and brand graphic systems",
          "Social media graphics — consistent with your communication",
          "Product, ad and reel video editing",
          "Motion design for websites and campaigns",
          "AI product photoshoots — editorial, not generic stock",
        ],
        paragraphs: [
          "For brands that care about consistency — website, social and video look like one studio with one vision.",
          "The result is visual language that builds brand recognition across every channel.",
        ],
        links: [
          { label: "Video editing", href: "portfolio.html#montaz", i18n: "bento.montaz" },
          { label: "Graphics & social", href: "portfolio.html#grafiki", i18n: "bento.grafiki" },
        ],
      },
    },
  };

  window.cosgralServicesContent = {
    get: function (id, lang) {
      var node = DATA[id];
      if (!node) return null;
      var pick = lang === "en" ? "en" : "pl";
      return node[pick] || node.pl;
    },
  };
})();

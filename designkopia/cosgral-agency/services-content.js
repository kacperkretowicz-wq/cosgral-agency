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
          "Strony firmowe i landing page pod konkretne kampanie",
          "Serwisy z panelem CMS i strukturą treści pod SEO",
          "Sklepy e-commerce — od prostych po zintegrowane z ERP/CRM",
          "Interakcje i animacje scroll-driven dopasowane do marki",
          "Optymalizacja SEO, szybkości ładowania i Core Web Vitals",
        ],
        paragraphs: [
          "Dla firm, które potrzebują strony spójnej z modelem biznesowym i grupą odbiorców — nie kolejnego szablonu.",
          "Efektem jest szybka, czytelna witryna prowadząca użytkownika do kontaktu lub zakupu i wspierająca sprzedaż.",
        ],
      },
      en: {
        num: "01",
        title: "Website development",
        items: [
          "Company websites and landing pages for specific campaigns",
          "CMS-driven sites with SEO-ready content structure",
          "E-commerce stores — from simple to ERP/CRM-integrated",
          "Scroll-driven interactions tailored to the brand",
          "SEO, loading speed and Core Web Vitals optimization",
        ],
        paragraphs: [
          "For companies that need a website aligned with their business model and audience — not another template.",
          "The result is a fast, clear site that guides users to contact or purchase and supports sales.",
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
          "Integracje z API i systemami firmy",
          "Progressive Web Apps (PWA)",
          "Projektowanie UX pod konkretny proces biznesowy",
        ],
        paragraphs: [
          "Dla firm, które potrzebują własnego narzędzia pod realny przepływ pracy — zamiast dopasowywać procesy do uniwersalnego SaaS.",
          "Efektem jest aplikacja skrojona pod operacje klienta: mniej pracy ręcznej, spójne dane i szybsza realizacja zadań.",
        ],
      },
      en: {
        num: "02",
        title: "Application design",
        items: [
          "Client panels and B2B portals",
          "Internal tools that streamline team workflows",
          "Integrations with APIs and company systems",
          "Progressive Web Apps (PWA)",
          "UX design for a specific business process",
        ],
        paragraphs: [
          "For companies that need their own tool for a real workflow — instead of forcing processes into generic SaaS.",
          "The result is an application tailored to operations: less manual work, consistent data and faster task execution.",
        ],
      },
    },
    gold: {
      pl: {
        num: "03",
        title: "Pozycjonowanie SEO i GEO",
        items: [
          "Audyt techniczny SEO — indeksowanie, szybkość, Core Web Vitals",
          "Strategia słów kluczowych i treści pod zapytania klientów",
          "GEO — widoczność marki w odpowiedziach ChatGPT, Gemini i Perplexity",
          "Dane strukturalne (schema.org) dla wyszukiwarek i modeli AI",
          "SEO lokalne oraz raportowanie wyników co miesiąc",
        ],
        paragraphs: [
          "Dla firm, które chcą stabilnego dopływu klientów z wyszukiwarki i odpowiedzi AI — SEO klasyczne oraz GEO.",
          "Efektem jest rosnąca widoczność na zapytania biznesowe, mierzona pozycjami, ruchem organicznym i leadami.",
        ],
      },
      en: {
        num: "03",
        title: "SEO & GEO positioning",
        items: [
          "Technical SEO audit — indexing, speed, Core Web Vitals",
          "Keyword and content strategy for customer queries",
          "GEO — brand visibility in ChatGPT, Gemini and Perplexity answers",
          "Structured data (schema.org) for search engines and AI models",
          "Local SEO and monthly performance reporting",
        ],
        paragraphs: [
          "For companies that want a steady flow of clients from search and AI answers — classic SEO plus GEO.",
          "The result is growing visibility for commercial queries, measured in rankings, organic traffic and leads.",
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
          "Chatboty i asystenci AI do pierwszego kontaktu",
          "Audyt procesów pod kątem automatyzacji",
        ],
        paragraphs: [
          "Dla firm, w których powtarzalne czynności pochłaniają czas zespołu i spowalniają rozwój.",
          "Efektem jest mniej pracy ręcznej i mniej błędów operacyjnych — zaczynamy od audytu, który wskazuje, co warto zautomatyzować.",
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
          "Process audit for automation opportunities",
        ],
        paragraphs: [
          "For companies where repetitive tasks consume team time and slow growth.",
          "The result is less manual work and fewer operational errors — we start with an audit that shows what is worth automating.",
        ],
      },
    },
    crimson: {
      pl: {
        num: "05",
        title: "Systemy CRM",
        items: [
          "Wdrożenie i konfiguracja CRM (HubSpot, Pipedrive, rozwiązania dedykowane)",
          "Migracja danych z arkuszy i starszych systemów",
          "Automatyzacja lejka sprzedaży i follow-upów",
          "Integracja CRM z formularzami, mailingiem i stroną",
          "Szkolenie zespołu i wsparcie po wdrożeniu",
        ],
        paragraphs: [
          "Dla firm, w których dane o klientach są rozproszone między mailami, arkuszami i narzędziami sprzedażowymi.",
          "Efektem jest jedno spójne źródło informacji o kliencie: etap rozmowy, historia kontaktu i raporty bez ręcznego zbierania danych.",
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
          "For companies where client data is scattered across email, spreadsheets and sales tools.",
          "The result is one consistent source of client information: conversation stage, contact history and reports without manual data gathering.",
        ],
      },
    },
    green: {
      pl: {
        num: "06",
        title: "Grafika i montaż wideo",
        items: [
          "Identyfikacja wizualna i systemy graficzne marki",
          "Grafika na social media spójna z komunikacją marki",
          "Montaż wideo produktowego, reklamowego i reels",
          "Motion design pod stronę internetową i kampanie",
          "Sesje produktowe AI — materiały editorial, nie generyczny stock",
        ],
        paragraphs: [
          "Dla marek, którym zależy na spójności wizualnej między stroną, social mediami i materiałami wideo.",
          "Efektem jest rozpoznawalna oprawa wizualna wspierająca komunikację marki na każdym kanale.",
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
          "Social media graphics consistent with brand communication",
          "Product, advertising and reel video editing",
          "Motion design for websites and campaigns",
          "AI product shoots — editorial assets, not generic stock",
        ],
        paragraphs: [
          "For brands that need visual consistency across website, social and video.",
          "The result is a recognizable visual language that supports brand communication on every channel.",
        ],
        links: [
          { label: "Video editing", href: "portfolio.html#montaz", i18n: "bento.montaz" },
          { label: "Graphics & social", href: "portfolio.html#grafiki", i18n: "bento.grafiki" },
        ],
      },
    },
  };

  function getContent(id, lang) {
    var entry = DATA[id];
    if (!entry) return null;
    return entry[lang] || entry.pl || null;
  }

  window.cosgralServicesContent = {
    get: getContent,
    all: DATA,
  };

  window.COSGRAL_SERVICES = DATA;
})();

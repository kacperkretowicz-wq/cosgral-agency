#!/usr/bin/env python3
"""Write fresh subpages that share the glass stage."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SERVICES = [
    ("uslugi/tworzenie-stron-internetowych.html", "prism", "orange", "Strony internetowe", "Websites",
     "Firmowe, landing page i CMS — szybka witryna, która prowadzi do kontaktu albo zakupu.",
     "Company sites, landing pages and a CMS — a fast site that leads to contact or a purchase.",
     ["Strony firmowe i landing page pod konkretne kampanie", "Serwisy z panelem CMS i strukturą treści pod SEO", "Optymalizacja szybkości i Core Web Vitals", "Interakcje scroll-driven dopasowane do marki"],
     ["Company websites and landing pages for campaigns", "CMS sites with an SEO-ready content structure", "Speed and Core Web Vitals", "Scroll-driven interactions fitted to the brand"],
     "Dla firm, które potrzebują strony spójnej z modelem biznesowym — nie kolejnego szablonu.",
     "For companies that need a site aligned with the business — not another template."),
    ("uslugi/sklepy.html", "cart", "navy", "Sklepy", "Stores",
     "E-commerce, który wygląda jak marka i sprzedaje bez tarcia.",
     "E-commerce that looks like the brand and sells without friction.",
     ["Katalog, karta produktu i checkout w jednym rytmie", "Integracje z ERP i CRM", "Editorial na wierzchu, sprzedaż pod spodem"],
     ["Catalog, product page and checkout in one rhythm", "ERP and CRM integrations", "Editorial on the surface, sales underneath"],
     "Dla marek, które nie chcą wyglądać jak typowy marketplace.",
     "For brands that refuse to look like a typical marketplace."),
    ("uslugi/projektowanie-aplikacji.html", "phone", "orange", "Aplikacje", "Applications",
     "Narzędzie pod realny przepływ pracy, zamiast dopasowywać firmę do SaaS.",
     "A tool for a real workflow, instead of bending the company around SaaS.",
     ["Narzędzia wewnętrzne usprawniające pracę zespołu", "Integracje z API i systemami firmy", "Progressive Web Apps", "UX pod konkretny proces biznesowy"],
     ["Internal tools that streamline the team", "Integrations with APIs and company systems", "Progressive Web Apps", "UX for a specific business process"],
     "Efektem jest mniej pracy ręcznej, spójne dane i szybsza realizacja zadań.",
     "The result is less manual work, consistent data and faster execution."),
    ("uslugi/portale-b2b.html", "arch", "navy", "Portale B2B", "B2B portals",
     "Panele klienckie, zamówienia i statusy w jednym wejściu.",
     "Client panels, orders and statuses behind one login.",
     ["Panele klienckie i portale partnerów", "Zamówienia, statusy, dokumenty", "Role i uprawnienia zespołu"],
     ["Client panels and partner portals", "Orders, statuses, documents", "Roles and team permissions"],
     "Dla firm, w których klient i handlowiec nie powinni pisać o to samo w mailu.",
     "For companies where the client and sales should not chase the same fact by email."),
    ("uslugi/seo.html", "lens", "orange", "SEO", "SEO",
     "Audyt techniczny, treści i widoczność na zapytania, które sprzedają.",
     "A technical audit, content and visibility on queries that sell.",
     ["Audyt indeksowania, szybkości i struktury", "Strategia słów i treści pod realne zapytania", "SEO lokalne i raport, który da się czytać"],
     ["Audit of indexing, speed and structure", "Keyword and content strategy for real queries", "Local SEO and a report you can read"],
     "Dla firm, które chcą stabilnego dopływu klientów z wyszukiwarki.",
     "For companies that want a steady flow of clients from search."),
    ("uslugi/geo.html", "shards", "navy", "GEO", "GEO",
     "Widoczność marki w odpowiedziach modeli, nie tylko w klasycznej liście linków.",
     "Brand visibility in model answers, not only in a classic list of links.",
     ["Obecność w odpowiedziach ChatGPT, Gemini i Perplexity", "Dane strukturalne schema.org", "Treści, które modele potrafią zacytować"],
     ["Presence in ChatGPT, Gemini and Perplexity answers", "schema.org structured data", "Copy that models can cite"],
     "Dla firm, których klienci pytają już asystenta, zanim otworzą Google.",
     "For companies whose clients ask an assistant before they open Google."),
    ("uslugi/pozycjonowanie-seo-geo.html", "lens", "orange", "SEO i GEO", "SEO and GEO",
     "Klasyczna wyszukiwarka i odpowiedzi AI w jednym programie.",
     "Classic search and AI answers in one programme.",
     ["Audyt techniczny SEO", "Treści pod zapytania klientów", "GEO: ChatGPT, Gemini, Perplexity", "Schema.org i SEO lokalne"],
     ["Technical SEO audit", "Content for customer queries", "GEO: ChatGPT, Gemini, Perplexity", "Schema.org and local SEO"],
     "Dla firm, które chcą być znajdowane tam, gdzie klient naprawdę pyta.",
     "For companies that want to be found where the client actually asks."),
    ("uslugi/wdrazanie-automatyzacji.html", "knot", "navy", "Automatyzacje", "Automation",
     "Powtarzalna praca schodzi z zespołu. Zostają decyzje.",
     "Repetitive work leaves the team. Decisions stay.",
     ["Procesy sprzedaży i marketingu", "Integracje Zapier, Make, n8n", "Raporty i powiadomienia", "Audyt tego, co w ogóle warto automatyzować"],
     ["Sales and marketing processes", "Zapier, Make and n8n integrations", "Reports and notifications", "An audit of what is worth automating"],
     "Zaczynamy od audytu, który wskazuje, co oddać maszynie.",
     "We start with an audit that shows what to hand to a machine."),
    ("uslugi/systemy-crm.html", "chart", "orange", "Systemy CRM", "CRM systems",
     "Jedno źródło informacji o kliencie zamiast arkuszy i wątków w mailu.",
     "One source of client truth instead of sheets and email threads.",
     ["HubSpot, Pipedrive albo rozwiązanie dedykowane", "Migracja z arkuszy i starych systemów", "Lejek, follow-up, formularze i mailing", "Szkolenie zespołu po wdrożeniu"],
     ["HubSpot, Pipedrive or a custom build", "Migration from sheets and legacy systems", "Funnel, follow-up, forms and email", "Team training after launch"],
     "Dla firm, w których lead ginie między handlowcami.",
     "For companies where a lead disappears between salespeople."),
    ("uslugi/chatboty.html", "bubble", "navy", "Chatboty", "Chatbots",
     "Pierwsza odpowiedź na Instagramie, Facebooku i stronie, z przekazaniem do człowieka.",
     "A first reply on Instagram, Facebook and the site, with a handoff to a person.",
     ["FAQ, godziny, wstępna rozmowa", "Przekazanie do konsultanta", "Reguły, czego bot nie obiecuje"],
     ["FAQ, hours, a first conversation", "Handoff to a consultant", "Rules for what the bot must not promise"],
     "Dla marek, które dostają pytania wtedy, gdy zespół śpi.",
     "For brands that receive questions while the team is asleep."),
    ("uslugi/grafika.html", "ribbon", "orange", "Grafika", "Graphics",
     "Identyfikacja i social, które wyglądają jak jedno studio.",
     "Identity and social that look like one studio.",
     ["Identyfikacja wizualna i system graficzny", "Posty i stories spójne z marką", "Sesje produktowe AI — editorial, nie stock"],
     ["Visual identity and a graphic system", "Posts and stories consistent with the brand", "AI product shoots — editorial, not stock"],
     "Dla marek, którym zależy, żeby strona i Instagram mówiły tym samym głosem.",
     "For brands that need the site and Instagram to speak in one voice."),
    ("uslugi/montaz-wideo.html", "clapper", "navy", "Montaż wideo", "Video editing",
     "Reels, reklamy i BTS — od surowego footage do formatu, który idzie w publikację.",
     "Reels, ads and BTS — from raw footage to a file that can publish.",
     ["Montaż produktowy, reklamowy i reels", "Tempo, napisy, format pod kanał", "Materiały BTS i kampanijne"],
     ["Product, ad and reel editing", "Pace, captions, a format for the channel", "BTS and campaign films"],
     "Dla marek, które mają materiał i potrzebują z niego rolki, nie archiwum.",
     "For brands that have footage and need reels, not an archive."),
    ("uslugi/grafika-i-montaz-wideo.html", "clapper", "orange", "Grafika i montaż", "Graphics and edit",
     "Obraz i ruch w jednym systemie wizualnym.",
     "Image and motion in one visual system.",
     ["Identyfikacja i social", "Montaż reels i reklam", "Motion pod stronę i kampanię"],
     ["Identity and social", "Reel and ad editing", "Motion for the site and the campaign"],
     "Dla marek, które nie chcą składać wizerunku z kilku nieskoordynowanych freelancerów.",
     "For brands that do not want an image assembled from uncoordinated freelancers."),
    ("uslugi/motion.html", "pill", "navy", "Motion", "Motion",
     "Ruch, który niesie markę, a nie ozdabia szablon.",
     "Motion that carries the brand instead of decorating a template.",
     ["Animacje pod stronę", "Key visuale w ruchu", "Formaty kampanijne"],
     ["Motion for the website", "Key visuals in motion", "Campaign formats"],
     "Dla premier, w których pierwsze sekundy mają zostać w głowie.",
     "For launches where the first seconds have to stay in the head."),
    ("uslugi/social.html", "fan", "orange", "Social", "Social",
     "Spójny język posta, stories i rolki.",
     "One language for the post, the story and the reel.",
     ["Serie pod sezon i kampanię", "Grafika i montaż w jednym planie", "Format, który działa na telefonie"],
     ["Series for a season and a campaign", "Graphics and edit in one plan", "A format that works on a phone"],
     "Dla marek, które publikują często i nie chcą tracić charakteru.",
     "For brands that publish often and refuse to lose their character."),
    ("uslugi/interakcje.html", "gamepad", "navy", "Interakcje", "Interactions",
     "Scroll, maski i ruch zaprojektowane pod konkretną markę.",
     "Scroll, masks and motion designed for a specific brand.",
     ["Wejścia sekcji i przejścia", "Interakcje na stronie i w kampanii", "Ruch, który nie dusi treści"],
     ["Section entrances and transitions", "Interactions on the site and in the campaign", "Motion that does not smother the content"],
     "Dla stron, które mają być zapamiętane, a nie tylko przeczytane.",
     "For sites that should be remembered, not only read."),
]

CASES = [
    ("portfolio-telforceone-crm.html", "chart", "CRM z mapą", "CRM with a map", "TelForceOne S.A.",
     "Dla TelForceOne S.A. powstała aplikacja CRM dla zespołu przedstawicieli handlowych. Łączy bazę klientów z widokiem mapy, dzięki czemu informacje do pracy w terenie są w jednym miejscu. Mapa nadaje danym kontekst: gdzie są klienci i jak układać kolejne wizyty."),
    ("portfolio-telforceone-code39.html", "prism", "Kody Code 39", "Code 39 barcodes", "TelForceOne S.A.",
     "Generator kodów kreskowych Code 39 pod operacje magazynowe TelForceOne S.A. Narzędzie skraca ręczną pracę przy oznaczaniu i porządkuje powtarzalny fragment procesu."),
    ("portfolio-telforceone-forecast.html", "chart", "Stany i prognoza", "Stock and forecast", "TelForceOne S.A.",
     "Aplikacja skupia się na kontroli stanów i prognozowaniu. Łączy bieżący widok zapasów z perspektywą zapotrzebowania, żeby zespół widział ryzyko braków zanim zrobi się z niego problem."),
]


def shell(prefix, title, accent, obj, body, extra_head=""):
    p = prefix
    return f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} — COSGRAL</title>
  <link rel="icon" href="{p}favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="{p}fresh.css" />
  {extra_head}
</head>
<body data-page="sub" data-base="{p}" data-object="{obj}" data-accent="{accent}">
  <a class="skip" href="#main">Przejdź do treści</a>
  <div class="grain" aria-hidden="true"></div>
  <canvas class="stage" data-stage aria-hidden="true"></canvas>
  <div class="cursor" data-cursor aria-hidden="true"></div>
  <div class="leave" aria-hidden="true"><i></i><i></i></div>
  <header class="nav">
    <a class="nav__logo" href="{p}index.html">COSGRAL</a>
    <div class="nav__right">
      <button type="button" data-lang>EN</button>
      <button type="button" data-menu aria-expanded="false">Menu</button>
    </div>
  </header>
  <nav class="menu" aria-label="Menu">
    <button class="menu__close meta" type="button" data-menu-close>Zamknij</button>
    <div class="menu__links">
      <a href="{p}index.html" data-preview="{p}portfolio-media/showcase/web/juicy-events-poster.jpg">Start</a>
      <a href="{p}index.html#uslugi" data-services="1" data-preview="{p}portfolio-media/clients/far-east/cover.jpg">Usługi</a>
      <a href="{p}portfolio.html" data-preview="{p}portfolio-media/showcase/web/trove-archive-poster.jpg">Realizacje</a>
      <a href="{p}o-nas.html" data-preview="{p}images/cosgral-agency/team/jakub-gral.png">O nas</a>
      <a href="{p}kontakt.html" data-preview="{p}images/cosgral-agency/team/kacper-kosikowski.jpg">Kontakt</a>
      <button type="button" data-sound>Dźwięk</button>
    </div>
    <div class="menu__side">
      <img class="menu__preview" data-menu-preview alt="" />
      <div class="menu__services" data-menu-services>
        <a href="{p}uslugi/tworzenie-stron-internetowych.html">Strony</a>
        <a href="{p}uslugi/sklepy.html">Sklepy</a>
        <a href="{p}uslugi/projektowanie-aplikacji.html">Aplikacje</a>
        <a href="{p}uslugi/portale-b2b.html">Portale B2B</a>
        <a href="{p}uslugi/seo.html">SEO</a>
        <a href="{p}uslugi/geo.html">GEO</a>
        <a href="{p}uslugi/wdrazanie-automatyzacji.html">Automatyzacje</a>
        <a href="{p}uslugi/systemy-crm.html">CRM</a>
        <a href="{p}uslugi/chatboty.html">Chatboty</a>
        <a href="{p}uslugi/grafika.html">Grafika</a>
        <a href="{p}uslugi/montaz-wideo.html">Montaż</a>
        <a href="{p}uslugi/motion.html">Motion</a>
        <a href="{p}uslugi/social.html">Social</a>
        <a href="{p}uslugi/interakcje.html">Interakcje</a>
      </div>
    </div>
  </nav>
  <button class="gyro" type="button" data-gyro>Włącz pochylenie</button>
  <main id="main">
  {body}
  </main>
  <footer class="site-foot" data-chat-stop>
    <div class="foot-grid">
      <div><p class="meta">COSGRAL</p><p>Agencja cyfrowa.</p></div>
      <div>
        <p><a href="tel:+48533790518">Jakub · +48 533 790 518</a></p>
        <p><a href="tel:+48571798397">Kacper · +48 571 798 397</a></p>
        <p><a href="mailto:kontakt@cosgral.pl">kontakt@cosgral.pl</a></p>
      </div>
      <div>
        <p><a href="{p}portfolio.html">Portfolio</a></p>
        <p><a href="{p}kontakt.html">Kontakt</a></p>
        <p><a href="{p}privacy-policy.html">Polityka prywatności</a></p>
      </div>
    </div>
    <p class="display">COSGRAL</p>
  </footer>
  <div class="cg-chat-root" data-cg-chat>
    <div class="cg-chat-panel" role="dialog" aria-label="Czat z Cosgral">
      <div class="cg-chat-head"><strong>COSGRAL</strong><i class="cg-chat-status"></i></div>
      <div class="cg-chat-msgs"><div class="cg-chat-empty"><p>Napisz do nas. Odpiszemy.</p></div></div>
      <form class="cg-chat-form">
        <input type="text" maxlength="2000" autocomplete="off" aria-label="Wiadomość" placeholder="Twoja wiadomość" />
        <button type="submit">Wyślij</button>
      </form>
    </div>
    <button class="cg-chat-launcher" type="button" aria-expanded="false" aria-label="Otwórz czat"><span class="cg-chat-label">Live czat</span><span class="cg-chat-badge" hidden>0</span></button>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
  <script src="https://unpkg.com/lenis@1.1.20/dist/lenis.min.js"></script>
  <script type="importmap">{{"imports":{{"three":"https://unpkg.com/three@0.170.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.170.0/examples/jsm/"}}}}</script>
  <script type="module" src="{p}fresh-app.js"></script>
</body>
</html>
"""


def lis(items):
    return "".join(f"<li>{i}</li>" for i in items)


def service_page(path, obj, accent, pl, en, lead_pl, lead_en, items_pl, items_en, pull_pl, pull_en):
    prefix = "../" if path.startswith("uslugi/") else ""
    body = f"""
    <section class="page-hero" data-subhero>
      <div>
        <p class="meta" data-pl="Usługa" data-en="Service">Usługa</p>
        <h1 class="display" data-pl="{pl}" data-en="{en}">{pl}</h1>
        <p class="lede" data-pl="{lead_pl}" data-en="{lead_en}">{lead_pl}</p>
        <a class="btn" href="{prefix}kontakt.html" data-pl="Wyceń projekt" data-en="Price the project">Wyceń projekt</a>
      </div>
      <div class="slot" data-object-slot></div>
    </section>
    <section class="page-main">
      <div class="split">
        <h2 data-pl="Co robimy" data-en="What we do">Co robimy</h2>
        <ul>{lis(items_pl)}</ul>
      </div>
      <div class="split">
        <h2 data-pl="Dla kogo" data-en="Who it's for">Dla kogo</h2>
        <p class="pull" data-pl="{pull_pl}" data-en="{pull_en}">{pull_pl}</p>
      </div>
    </section>
    """
    html = shell(prefix, pl, accent, obj, body)
    (ROOT / path).write_text(html, encoding="utf-8")


def main():
    for row in SERVICES:
        service_page(*row)

    about = """
    <section class="page-hero" data-subhero>
      <div>
        <p class="meta">Studio</p>
        <h1 class="display" data-pl="O nas" data-en="About">O nas</h1>
        <p class="lede" data-pl="Jesteśmy dwuosobowym zespołem programistów. Łączymy inżynierię z designem i kreacją — od architektury po wdrożenie." data-en="We are a two-person team of engineers. We join software with design and creative — from architecture through launch.">Jesteśmy dwuosobowym zespołem programistów. Łączymy inżynierię z designem i kreacją — od architektury po wdrożenie.</p>
      </div>
      <div class="slot"></div>
    </section>
    <section class="page-main">
      <div class="people">
        <article>
          <img src="images/cosgral-agency/team/jakub-gral.png" alt="Jakub Gral" />
          <h3>Jakub Gral</h3>
          <p class="meta">CEO &amp; Founder</p>
          <p>Frontend, design, kreacja, montaż, grafika, aplikacje i automatyzacje. Wcześniej kierował działem w firmie IT — zautomatyzował łańcuch dostaw i rozwijał CRM oraz intranet.</p>
        </article>
        <article>
          <img src="images/cosgral-agency/team/kacper-kosikowski.jpg" alt="Kacper Kosikowski" />
          <h3>Kacper Kosikowski</h3>
          <p class="meta">COO &amp; Founder</p>
          <p>Aplikacje i systemy. Projektuje i wdraża rozwiązania dopasowane do procesów klienta.</p>
        </article>
      </div>
      <p><a class="btn" href="kontakt.html">Porozmawiajmy</a></p>
    </section>
    """
    (ROOT / "o-nas.html").write_text(shell("", "O nas", "orange", "knot", about), encoding="utf-8")

    contact = """
    <section class="page-hero" data-subhero>
      <div>
        <p class="meta">Kontakt</p>
        <h1 class="display" data-pl="Napisz" data-en="Write">Napisz</h1>
        <p class="lede">Jakub · +48 533 790 518<br />Kacper · +48 571 798 397<br /><a href="mailto:kontakt@cosgral.pl">kontakt@cosgral.pl</a></p>
      </div>
      <div class="slot"></div>
    </section>
    <section class="page-main">
      <form class="form" data-contact>
        <input class="hp" type="text" name="bot-field" tabindex="-1" autocomplete="off" />
        <label>Imię<input name="name" autocomplete="name" /></label>
        <label>Email<input name="email" type="email" required autocomplete="email" /></label>
        <label>Firma<input name="company" autocomplete="organization" /></label>
        <label>Wiadomość<textarea name="message" rows="5" required></textarea></label>
        <button class="btn" type="submit">Wyślij</button>
        <p class="note" data-note></p>
      </form>
    </section>
    """
    (ROOT / "kontakt.html").write_text(shell("", "Kontakt", "navy", "orb", contact), encoding="utf-8")

    # orb is not a built object — contact should use lens or bubble. Use "lens".
    contact_html = (ROOT / "kontakt.html").read_text(encoding="utf-8").replace('data-object="orb"', 'data-object="lens"')
    (ROOT / "kontakt.html").write_text(contact_html, encoding="utf-8")

    portfolio = """
    <section class="page-hero" data-subhero>
      <div>
        <p class="meta">Portfolio</p>
        <h1 class="display" data-pl="Realizacje" data-en="Work">Realizacje</h1>
        <p class="lede" data-pl="Strony, rolki, grafika i systemy." data-en="Sites, reels, graphics and systems.">Strony, rolki, grafika i systemy.</p>
      </div>
      <div class="slot"></div>
    </section>
    <section class="page-main" id="strony">
      <h2>Strony</h2>
      <div class="port-grid">
        <a class="port-card" href="https://juicyevents.pl/" target="_blank" rel="noopener" data-no-transition><img src="portfolio-media/showcase/web/juicy-events-poster.jpg" alt="Juicy Events" /><span>Juicy Events</span></a>
        <a class="port-card" href="https://trovearchive.com/" target="_blank" rel="noopener" data-no-transition><img src="portfolio-media/showcase/web/trove-archive-poster.jpg" alt="Trove Archive" /><span>Trove</span></a>
        <a class="port-card" href="https://mjsocialmedia.netlify.app/" target="_blank" rel="noopener" data-no-transition><img src="portfolio-media/showcase/web/mj-social-media-poster.jpg" alt="MJ Social Media" /><span>MJ</span></a>
        <a class="port-card" href="portfolio-strona-juicy-events.html"><img src="portfolio-media/clients/juicy-events/cover.jpg" alt="Juicy Events kadr" /><span>Juicy — opis</span></a>
      </div>
    </section>
    <section class="page-main" id="wideo" style="background:#0a0a0b;color:#f2f1ee">
      <h2>Rolki</h2>
      <div class="reel-row">
        <figure class="reel"><video data-src="portfolio-media/reels/orlincy/006.mp4" poster="portfolio-media/reels/orlincy/006-poster.jpg" muted loop playsinline preload="none"></video><figcaption>Wiktoria</figcaption></figure>
        <figure class="reel"><video data-src="portfolio-media/reels/reklamy/001.mp4" poster="portfolio-media/reels/reklamy/001-poster.jpg" muted loop playsinline preload="none"></video><figcaption>Trove</figcaption></figure>
        <figure class="reel"><video data-src="portfolio-media/reels/far-east/001.mp4" poster="portfolio-media/reels/far-east/001-poster.jpg" muted loop playsinline preload="none"></video><figcaption>Far East</figcaption></figure>
        <figure class="reel"><video data-src="portfolio-media/reels/anna-jarosik/001.mp4" poster="portfolio-media/reels/anna-jarosik/001-poster.jpg" muted loop playsinline preload="none"></video><figcaption>Anna Jarosik</figcaption></figure>
        <figure class="reel"><video data-src="portfolio-media/reels/bts/001.mp4" poster="portfolio-media/reels/bts/001-poster.jpg" muted loop playsinline preload="none"></video><figcaption>BTS</figcaption></figure>
      </div>
    </section>
    <section class="page-main" id="grafiki">
      <h2>Grafiki</h2>
      <div class="port-grid">
        <a class="port-card" href="portfolio-grafiki.html"><img src="portfolio-media/graphics/far-east/001-poster.jpg" alt="Far East grafika" /><span>Far East</span></a>
        <a class="port-card" href="portfolio-grafiki.html"><img src="portfolio-media/clients/juicy-events/gallery/1.jpg" alt="Juicy Events grafika" /><span>Juicy</span></a>
      </div>
    </section>
    <section class="page-main" id="systemy">
      <h2>Systemy</h2>
      <div class="port-grid">
        <a class="port-card" href="portfolio-telforceone-crm.html"><img src="assets/cases/telforceone-crm.svg" alt="TelForceOne CRM" /><span>TelForceOne</span></a>
        <a class="port-card" href="portfolio-telforceone-forecast.html"><img src="assets/cases/shelfsync.svg" alt="ShelfSync" /><span>ShelfSync</span></a>
      </div>
    </section>
    """
    (ROOT / "portfolio.html").write_text(shell("", "Portfolio", "orange", "ribbon", portfolio), encoding="utf-8")

    privacy = """
    <section class="page-hero" data-subhero>
      <div>
        <p class="meta">Dokument</p>
        <h1 class="display">Prywatność</h1>
        <p class="lede">Ostatnia aktualizacja: sierpień 2026</p>
      </div>
      <div class="slot"></div>
    </section>
    <section class="page-main">
      <div class="split"><h2>Administrator</h2><p>Administratorem danych jest cosgral.agency (kontakt: kontakt@cosgral.pl).</p></div>
      <div class="split"><h2>Jakie dane zbieramy</h2><p>Przez formularz lub e-mail możemy otrzymać imię, adres e-mail, nazwę firmy oraz treść wiadomości. Telefony na stronie służą do kontaktu biznesowego.</p></div>
      <div class="split"><h2>Cel i podstawa</h2><p>Dane przetwarzamy, aby odpowiedzieć na zapytanie i prowadzić rozmowę o współpracy (art. 6 ust. 1 lit. b lub f RODO).</p></div>
      <div class="split"><h2>Jak długo przechowujemy</h2><p>Korespondencję trzymamy tak długo, jak jest potrzebna do obsługi zapytania i ewentualnej współpracy, a potem usuwamy lub archiwizujemy zgodnie z przepisami.</p></div>
      <div class="split"><h2>Twoje prawa</h2><p>Masz prawo dostępu, sprostowania, usunięcia, ograniczenia, sprzeciwu oraz skargi do Prezesa UODO. Napisz na kontakt@cosgral.pl.</p></div>
    </section>
    """
    (ROOT / "privacy-policy.html").write_text(shell("", "Polityka prywatności", "navy", "shards", privacy), encoding="utf-8")

    for path, obj, title, en, client, text in CASES:
        body = f"""
        <section class="page-hero" data-subhero>
          <div>
            <p class="meta">{client}</p>
            <h1 class="display">{title}</h1>
            <p class="lede">{text}</p>
            <a class="btn" href="kontakt.html">Wyceń podobny projekt</a>
          </div>
          <div class="slot"></div>
        </section>
        <section class="page-main"><p><a href="portfolio.html">Wróć do portfolio</a></p></section>
        """
        (ROOT / path).write_text(shell("", title, "orange", obj, body), encoding="utf-8")

    for name, title, img in [
        ("portfolio-strona-juicy-events.html", "Juicy Events", "portfolio-media/showcase/web/juicy-events-poster.jpg"),
        ("portfolio-strona-trove.html", "Trove Archive", "portfolio-media/showcase/web/trove-archive-poster.jpg"),
        ("portfolio-strona-mj.html", "MJ Social Media", "portfolio-media/showcase/web/mj-social-media-poster.jpg"),
    ]:
        link = {
            "Juicy Events": "https://juicyevents.pl/",
            "Trove Archive": "https://trovearchive.com/",
            "MJ Social Media": "https://mjsocialmedia.netlify.app/",
        }[title]
        body = f"""
        <section class="page-hero" data-subhero>
          <div>
            <p class="meta">Strona</p>
            <h1 class="display">{title}</h1>
            <p><a class="btn" href="{link}" target="_blank" rel="noopener" data-no-transition>Odwiedź stronę</a></p>
          </div>
          <div class="slot"></div>
        </section>
        <section class="page-main"><img src="{img}" alt="{title}" /><p><a href="portfolio.html">Wróć do portfolio</a></p></section>
        """
        (ROOT / name).write_text(shell("", title, "navy", "prism", body), encoding="utf-8")

    gallery = """
    <section class="page-hero" data-subhero>
      <div>
        <p class="meta">Grafiki</p>
        <h1 class="display">Grafiki</h1>
        <p class="lede">Juicy Events, Far East, BTS i social.</p>
      </div>
      <div class="slot"></div>
    </section>
    <section class="page-main">
      <div class="port-grid">
        <article class="port-card"><img src="portfolio-media/clients/juicy-events/gallery/1.jpg" alt="Juicy Events" /><span>Juicy</span></article>
        <article class="port-card"><img src="portfolio-media/graphics/far-east/001-poster.jpg" alt="Far East" /><span>Far East</span></article>
        <article class="port-card"><img src="portfolio-media/graphics/bts/001-poster.jpg" alt="BTS" /><span>BTS</span></article>
        <article class="port-card"><img src="portfolio-media/clients/juicy-events/cover.jpg" alt="Juicy cover" /><span>Okładka</span></article>
      </div>
    </section>
    """
    (ROOT / "portfolio-grafiki.html").write_text(shell("", "Grafiki", "orange", "ribbon", gallery), encoding="utf-8")
    montaz = """
    <section class="page-hero" data-subhero>
      <div>
        <p class="meta">Montaż</p>
        <h1 class="display">Montaż</h1>
      </div>
      <div class="slot"></div>
    </section>
    <section class="page-main" style="background:#0a0a0b;color:#f2f1ee">
      <div class="reel-row">
        <figure class="reel"><video data-src="portfolio-media/reels/far-east/002.mp4" poster="portfolio-media/reels/far-east/002-poster.jpg" muted loop playsinline preload="none"></video><figcaption>Far East</figcaption></figure>
        <figure class="reel"><video data-src="portfolio-media/reels/bts/002.mp4" poster="portfolio-media/reels/bts/002-poster.jpg" muted loop playsinline preload="none"></video><figcaption>BTS</figcaption></figure>
        <figure class="reel"><video data-src="portfolio-media/reels/anna-jarosik/003.mp4" poster="portfolio-media/reels/anna-jarosik/003-poster.jpg" muted loop playsinline preload="none"></video><figcaption>Anna Jarosik</figcaption></figure>
      </div>
    </section>
    """
    (ROOT / "portfolio-montaz.html").write_text(shell("", "Montaż", "navy", "clapper", montaz), encoding="utf-8")
    print("wrote", len(SERVICES), "services + core pages")


if __name__ == "__main__":
    main()

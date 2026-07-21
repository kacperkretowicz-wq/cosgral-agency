# PLAN-PRZEBUDOWY-V3 — cosgral.agency: narracja sześcianu + clean content (styl parhouse)

> **Adresat: model AI-wykonawca** (Claude / Cursor / inny agent) pracujący w tym repo.
> Plan jest wykonywalny krok po kroku. Nie pomijaj etapów, nie zmieniaj kolejności.
> Autor planu: audyt 2026-07-20 (kod + DOM + parhouse.agency na żywo).
> Katalog roboczy: `designkopia/cosgral-agency/`.

---

## 0. CEL — co budujemy

Przebudowa one-page'a cosgral.agency na **narrację scroll-driven z sześcianem 3D**
(logo COSGRAL) jako bohaterem sekcji 1–4, po której następuje **czysta, contentowa
część strony w duchu parhouse.agency** (klient ma od razu wiedzieć, czym się
zajmujemy: usługi → proces → FAQ → zespół → stopka).

### 0.1 Co ZOSTAJE z obecnej strony (`index.html`)

| Element | Gdzie jest teraz | Gdzie trafia w V3 |
|---|---|---|
| **Efekt pojawiającego się napisu** (root-line rysujący litery + reveal `classic`; signature moment) | `.hero_stack_wrapper`, inline skrypt #10 w `index.html` | Sekcja 1 (hero) — wejście nagłówka |
| **Sekcja kategorii** Web / AI / Motion / Stack (`.section_pillars`) | `index.html` | Po sekcji 5 (usługi), jako „filary kompetencji" |
| **Sekcja kontakt** (formularz: Email, Message, Submit + komunikaty) | `.section_footer` w `index.html` | Sekcja 4 (cel morfu sześcianu) + skrócone dane kontaktowe w stopce |

### 0.2 Co ZNIKA

Cały pozostały układ klonu voyeurverite: `section_vv` (konwergencja COSGRAL/agency
jako osobna sekcja), `section_films` (maski filmowe), `section_about`,
`featured_project`, sekcja parhouse-splice, `section_history` w obecnej formie
(treść zespołu przechodzi do nowej sekcji 8). Switcher 16 trybów efektów
(`#design-switcher`) — usunąć z produkcji (tryb `classic` zostaje na stałe).

### 0.3 Referencja layoutu: parhouse.agency

Zweryfikowane na żywo 2026-07-20 + pełna forensyka:
`../references/site-dna/parhouse-agency/REBUILD-BLUEPRINT.md`. Z parhouse bierzemy
**klarowność treści i rytm sekcji** (hero-manifest → usługi → case → numerowany
WORKFLOW 01–04 → opinie → kontakt), NIE skórę. Tokeny podobne do naszych:
tło `#090909`, biała typografia, brak krzykliwych kolorów. Nasz akcent `#e82323` zostaje.

---

## 1. DECYZJA ARCHITEKTONICZNA (twarda)

**Budujemy NOWY plik `index-v3.html` od zera** — czysty, sformatowany HTML — i
**portujemy** do niego trzy zachowane elementy. NIE edytujemy monolitu `index.html`.

Powody (z audytu — patrz `HERO-EFFECTS-BLUEPRINT.md` §1 i pamięć projektu):
- body `index.html` to JEDNA zminifikowana linia (~355) — edycja grep/sed zawodzi;
- logika hero to inline skrypt ~47 kB spleciony z timeline'em masek filmowych,
  które usuwamy — łatwiej wyciąć i przenieść potrzebny fragment niż operować na monolicie;
- `styles.css` w tym folderze NIE jest podlinkowany w `index.html` (pułapka) —
  w V3 robimy jeden świeży `cosgral-v3.css` zamiast czterech warstw po splice.

**Stack V3 (bez zmiany technologii):** vanilla HTML + CSS + GSAP 3 (ScrollTrigger,
ScrollSmoother, SplitText — te same CDN co w `index.html`) + **Three.js** (nowość,
CDN, wersja ≥ r160, import mapą modułów) dla sześcianu. **NIE przenosimy strony na
React/Next** — komponent z `efekty.txt` (React/R3F) adaptujemy do vanilla (patrz §5.3).

`index.html` i `index_stable.html` zostają nietknięte jako punkt odniesienia.
Po akceptacji V3 (decyzja człowieka, nie agenta) `index-v3.html` → `index.html`.

---

## 2. ZASOBY DO WYKORZYSTANIA

| Zasób | Ścieżka | Rola |
|---|---|---|
| Model sześcianu-logo 3D | `assets/cosgral-cube.glb` | Bohater sekcji 1–4. Najpierw ZWERYFIKUJ, że się ładuje (GLTFLoader; sprawdź czy nie wymaga DRACO). Fallback: `BoxGeometry` z fazowanymi krawędziami + logo jako tekstura na ścianach. |
| Wideo referencyjne animacji logo | `White_cube_logo_animation_1080p_202607080918.mp4` | REFERENCJA ruchu (jak sześcian „siada" w logo) — obejrzyj przed implementacją stanu `LOGO`. Nie wstawiać jako `<video>` w hero. |
| Shader tła | `efekty.txt` | Koncepcja MeshGradient (kolory `#000/#1a1a1a/#333/#fff`) — adaptacja do vanilla WebGL jako tło sekcji 5 (§5.3). |
| Moodboard kierunku | `index-v2.html` | Kierunki: grain, liquid metal, bionic, cinematic haze. Do V3 bierzemy: **grain overlay** na całej stronie + **cinematic haze** (miękka winieta/poświata) w sekcjach narracyjnych. Bez dosłownego kopiowania pinów. |
| Blueprint efektu napisu | `HERO-EFFECTS-BLUEPRINT.md` | §1–§3: mapa gdzie w inline skrypcie #10 siedzi root-line + tryb `classic`; §7: twarde zasady. |
| Blueprint parhouse | `../references/site-dna/parhouse-agency/REBUILD-BLUEPRINT.md` | Wartości scrubów, growing-header, marquee, rytm treści. |
| Brand CSS | `cosgral-brand.css` | Źródło tokenów: akcent `#e82323`, fonty, style `.hero_root_line`. Przepisać potrzebne reguły do `cosgral-v3.css`. |
| Formularz | `index.html` → `.section_footer` | Markup formularza (pola, komunikaty success/error) do portu w sekcji 4. |
| Pillars | `index.html` → `.section_pillars` | Markup + copy kategorii do portu. |

---

## 3. ARCHITEKTURA SZEŚCIANU — `cube-director.js`

Jeden moduł, jedna scena Three.js, jeden `<canvas id="cube-stage">`:
`position: fixed; inset: 0; z-index: 1; pointer-events: none;` — treść sekcji
(teksty, formularz) leży NAD nim (`z-index: 2`), tło strony POD nim.

### 3.1 Stany sześcianu (maszyna stanów sterowana progressem scrolla)

```
DARKNESS   — materiał emisja/opacity ≈ 0, scena czarna
EMERGE     — fade-in + rotacja malejąca (obrót zwalnia)
LOGO       — quaternion slerp do orientacji logo (frontalnej), bezruch
DISSOLVE   — fade-out z powrotem w mrok
PARTICLES  — sześcian ukryty; ~1200 drobin (instancing) leci z rozsypki do
             pozycji na powierzchni sześcianu (pozycje próbkowane z geometrii glb)
ASSEMBLED  — drobiny znikają / crossfade do pełnego sześcianu; start powolnej rotacji
ORBIT_R    — rotacja + puls (scale 1 ± 0.04 sinusoidalnie) + pozycja x → +28vw
RETURN     — x → 0 (środek), puls wygasa
BLUR_MORPH — rozmycie (patrz 3.4) + scale 1 → 1.35 + opacity → 0; równolegle
             DOM formularza fade-in
RELEASED   — canvas `display:none`, rAF zatrzymany; strona scrolluje normalnie
```

### 3.2 Sterowanie scrollem

Sekcje 1–4 żyją w jednym wrapperze `#act-wrapper` (4 akty × 100vh treści),
**pin całego wrappera**: `ScrollTrigger { trigger:'#act-wrapper', start:'top top',
end:'+=400%', pin:true, scrub:1.2 }`. Master-timeline GSAP z labelami; progi
(wartości startowe do tuningu):

| Progress | Stan | Tekst na ekranie |
|---|---|---|
| 0.00–0.10 | EMERGE | — |
| 0.10–0.20 | LOGO | Tekst aktu 1 (reveal — patrz §4.1) |
| 0.20–0.26 | DISSOLVE | tekst 1 fade-out |
| 0.26–0.36 | PARTICLES | Tekst aktu 2 wchodzi przy ~0.30 |
| 0.36–0.42 | ASSEMBLED | tekst 2 trzyma |
| 0.42–0.54 | ORBIT_R | Tekst aktu 3 (lewa połowa ekranu) |
| 0.54–0.60 | RETURN | tekst 3 fade-out |
| 0.60–0.74 | BLUR_MORPH | Nagłówek aktu 4 + formularz fade-in |
| 0.74–1.00 | hold → RELEASED | formularz aktywny (`pointer-events:auto`) |

Timeline musi być **deterministyczny przy scrubie w obie strony** — ZERO
`Math.random()` w onUpdate (lekcja z trybu `decode`, patrz blueprint §3/13).
Rozsypka drobin: pozycje startowe generowane RAZ przy inicie (seedowany PRNG,
np. mulberry32 z seedem stałym), potem tylko lerp po progressie.

### 3.3 Drobiny „szklane" (akt 2) — budżet wydajności

- InstancedMesh, geometria: tetrahedron/okruch low-poly, ~1200 instancji desktop,
  ~500 mobile. Materiał: `MeshPhysicalMaterial` z `transmission` TYLKO jeśli
  utrzymane 60 fps na desktopie; w przeciwnym razie `MeshStandardMaterial`
  z `envMap` + opacity — wygląda szklano przy ułamku kosztu. Decyzję podejmij
  po pomiarze (etap E2, checkpoint perf).
- Ścieżka lotu: start (rozsypka w sferze r≈6) → cel (punkt na powierzchni
  sześcianu) z lekkim łukiem (bezier przez punkt pośredni), stagger po indeksie.

### 3.4 Rozmycie (akt 4)

Najtańsza droga: **CSS `filter: blur(0→24px)` na samym `#cube-stage`** (canvas),
sterowane z timeline przez `gsap.to(canvas.style, ...)` / quickSetter. NIE
wdrażaj postprocessingu (EffectComposer/BokehPass), chyba że CSS blur na canvasie
tnie fps — wtedy dopiero composer. Crossfade: canvas opacity 1→0, kontener
formularza `#audit-form` opacity 0→1 + `scale 0.96→1` w tym samym oknie progressu.

### 3.5 Pętla renderu

rAF startuje po wejściu `#act-wrapper` w viewport i **zatrzymuje się** w stanie
RELEASED oraz gdy wrapper poza viewportem (scroll w dół strony). Uwaga na pułapkę
z pamięci projektu: w podglądzie agentowym karta bywa `document.hidden === true`
→ rAF nie tyka; testy robić na widocznej karcie.

---

## 4. SPECYFIKACJA SEKCJI — markup, copy, animacje

Wszystkie teksty poniżej są OSTATECZNE (od klienta) — wstawiaj 1:1, nie parafrazuj.
Język strony: polski (`lang="pl"`). Nawigacja stała (logo + menu overlay jak
w parhouse: Usługi / Proces / FAQ / Zespół / Kontakt — anchor-linki + podstrony).

### 4.1 SEKCJA 1 — Hero (akt 1: EMERGE → LOGO → DISSOLVE)

- **Przed:** z mroku pojawia się kręcący sześcian, zwalnia i „siada" w orientacji
  logo (referencja ruchu: mp4 z §2).
- **Tekst** (wchodzi efektem pojawiającego się napisu — patrz niżej):

  > Przekształcamy śmiałe wizje w precyzyjne rozwiązania cyfrowe. Budujemy Twoją
  > przewagę dzięki innowacyjnym technologiom, automatyzacji i bezkompromisowemu
  > designowi.

  Do tego krótki nagłówek-brand nad tekstem: **COSGRAL** (wordmark) — to na nim
  gra efekt root-line; lead wchodzi klasycznym revealem (clip-path wipe).
- **Efekt napisu (PORT — ŹRÓDŁO ZWERYFIKOWANE 2026-07-20):** UWAGA — stara notatka
  pamięci projektu i `HERO-EFFECTS-BLUEPRINT.md` (audyt 07-17) mówiły o inline
  skrypcie #10 w `index.html`. Kod od tego czasu ewoluował: cała logika hero
  siedzi teraz w osobnym pliku **`cosgral-hero-effects.js`** (962 linie, linkowany
  jako `<script src="cosgral-hero-effects.js">`), nie inline. To STĄD portujemy.
  Realny zakres do wzięcia jest MNIEJSZY niż zakładał stary blueprint, bo strona
  ma teraz TYLKO jeden wordmark do zbudowania („COSGRAL”), nie dwa konwergujące
  słowa:
  - `buildRootLinePath()` (linie 297–404 pliku źródłowego) — budowa ścieżki SVG
    z realnych konturów liter (JSON `#root-line-glyphs`, fontTools) na bazie
    `getBoundingClientRect()` nagłówka. Weź TYLKO segment `rl-lead` (linia wjazdu)
    + `rl-w1` (litery słowa) — pomiń `rl-mid`/`rl-w2`/`rl-tail` (służyły drugiemu
    słowu „agency” i konwergencji, w V3 nieobecnej).
  - Glify: **NIE kopiuj całego 15 kB JSON-a** — potrzebne tylko litery
    C,O,S,G,R,A,L. Wyekstrahowany, gotowy podzbiór (6.5 kB) już leży w
    [`hero-glyphs.json`](hero-glyphs.json) w tym katalogu (wygenerowany Pythonem
    z `index.html` inline script #5, `json.loads` → filter po literach → dump).
  - Reveal: bierzemy WYŁĄCZNIE gałąź fallback z `applyWordReveal()` (linie
    646–653 źródła) — `tl.to(headingEl, {clipPath:'inset(0 0% 0 0)', duration:0.3})`.
    **Pomiń całkowicie** obiekt `WORD_REVEALS` (16 trybów, linie 536–642) i całą
    logikę `bgTransitionMode` (`liquid-chromatic`/`portal-zoom`/`color-wipes`/
    `blob-expand`/`strips`/`slash`/`grid-reveal`, linie 689–895) — to był fejd
    zdjęcia `hero_bg`, w V3 nie ma zdjęcia tła, tłem zarządza `cube-director.js`.
  - **Pomiń też:** `splitLetters`/`lockHeading`/`char-span` (potrzebne tylko dla
    16 trybów custom), `getVvMeetTargets`/konwergencję, `updateFilmFocusability`,
    maski filmowe, `#design-switcher`, `updateScrambleGlobal`/`Math.random`-owy
    tryb `decode`.
  - Zachowaj wzorzec `REDUCED_MOTION` (fallback: pomiń dekoracyjny wjazd/retract
    `rl-lead`, ustaw `opacity:0` od razu — patrz źródło linie 904–908) oraz
    debounced `ResizeObserver` na nagłówku + `buildWord()` do przeliczenia
    ścieżki po resize.
  - **Zmiana integracji względem starego blueprintu:** hero-text-reveal w V3
    NIE tworzy własnego `ScrollTrigger`+`pin` — to by kolidowało z pinem
    `#act-wrapper` z §3.2. Zamiast tego `hero-text-reveal.js` eksportuje funkcję
    budującą, którą `cube-director.js` wywołuje i wkleja jej tweeny do WSPÓLNEGO
    master-timeline w oknie progressu 0.10–0.20 (stan LOGO). Sygnatura:
    `buildHeroWordReveal(masterTl, { at, headingEl })`.
  - Style `.hero_root_line` (stroke `#e82323`, 2.5px) przenieś z `cosgral-brand.css`
    do `cosgral-v3.css`.
- **Po:** przy dalszym scrollu tekst gaśnie, sześcian rozpływa się w mrok (DISSOLVE).

### 4.2 SEKCJA 2 — Ekosystemy (akt 2: PARTICLES → ASSEMBLED)

- **Przed:** drobinki szklanych cząsteczek zlatują się i szybko składają w sześcian.
- **Tekst** (duży, centralny lub lekko z lewej; SplitText reveal per linia):

  > Nie tworzymy tylko stron. Budujemy kompletne ekosystemy.

- **Po:** złożony sześcian zaczyna się powoli obracać.

### 4.3 SEKCJA 3 — Korzyści (akt 3: ORBIT_R → RETURN)

- **Przed/w trakcie:** sześcian obraca się, pulsuje, odpływa na prawą stronę
  ekranu i tam powoli rotuje w nieskończoność (do momentu wyjścia z aktu).
- **Tekst** (lewa połowa ekranu, trzy krótkie linie — stagger):

  > Odzyskaj czas. Zwiększ konwersję. Skaluj bez limitów.

  Zdanie wspierające (mniejszy stopień, muted):

  > Pozwól technologii pracować za Ciebie, podczas gdy Ty skupisz się na biznesie.

- **Po:** sześcian wraca na środek ekranu (RETURN).
- **Mobile:** brak przesunięcia w prawo — sześcian zostaje w centrum, mniejszy
  (scale 0.7), tekst nad/pod nim.

### 4.4 SEKCJA 4 — Kontakt / audyt (akt 4: BLUR_MORPH → RELEASED)

- **Przed:** sześcian rozmazuje się (blur + scale + fade) i „przeobraża"
  w formularz kontaktowy (crossfade DOM, §3.4).
- **Nagłówek:**

  > Zacznijmy od bezpłatnego audytu.

- **Formularz:** PORT z `.section_footer` obecnego `index.html` — pola Email*
  i Message, przycisk Submit, komunikaty:
  success „Thank you! We have received your message…" / error „Oops! Something
  went wrong…" → **przetłumacz na polski** („Dziękujemy! Otrzymaliśmy Twoją
  wiadomość i odpowiemy mailowo najszybciej jak to możliwe." / „Ups! Coś poszło
  nie tak przy wysyłce formularza."). Dodaj pole „Imię" i (opcjonalnie) „Firma".
  Zachowaj istniejący endpoint/handler wysyłki, jeśli jest; jeśli formularz był
  atrapą Webflow — podepnij `mailto:`-fallback i zostaw TODO dla człowieka
  (integracja z realną skrzynką).
- **Po:** koniec pinowania — dalej normalny scroll (stan RELEASED).

### 4.5 SEKCJA 5 — Zaufali nam + usługi

Normalny scroll. Dwa bloki:

1. **Pasek logotypów „Zaufali nam"** — marquee (duplikacja contentu ×2,
   translateX −50% loop, pauza na hover — wartości z blueprintu parhouse §6.4).
   Logotypy: placeholder `images/` — jeśli brak plików logo klientów, wstaw
   6–8 szarych wordmarków placeholderowych i zostaw TODO dla człowieka.
2. **„Sprawdź, co może Cię zainteresować"** — nagłówek sekcji + lista 5 usług.
   Forma: duże wiersze-listy (jak parhouse „Kampanie Ads / AI Fashion Visuals /
   e-Commerce") — pełna szerokość, numeracja 01–05, hover: wiersz rozjaśnia się,
   strzałka/`→` wjeżdża; każdy wiersz to `<a>` do podstrony:

   | # | Usługa | Link |
   |---|---|---|
   | 01 | Tworzenie stron internetowych | `uslugi/tworzenie-stron-internetowych.html` |
   | 02 | Projektowanie aplikacji | `uslugi/projektowanie-aplikacji.html` |
   | 03 | Wdrażanie automatyzacji | `uslugi/wdrazanie-automatyzacji.html` |
   | 04 | Systemy CRM | `uslugi/systemy-crm.html` |
   | 05 | Grafika i montaż wideo | `uslugi/grafika-i-montaz-wideo.html` |

   **Tło bloku:** shader „mesh gradient" adaptowany z `efekty.txt` (§5.3) —
   subtelny, ciemny (kolory `#000 #1a1a1a #333` + biel śladowo), pod treścią.

**Za listą usług: PORT `.section_pillars`** (kategorie Web 01 / Motion 02 /
AI 03 / Stack 04 z obecnej strony) — markup i copy 1:1, reveal przy scrollu
(`start:'top 65%', scrub:1` — wartości parhouse).

### 4.6 SEKCJA 6 — Transparentny proces („Jak pracujemy?")

Wzór: parhouse WORKFLOW (numerowane 01–04, growing-header: nagłówek kroku rośnie
do 100vh i „oddycha" ze scrollem — `start:'center center', end:'90% top', scrub`,
wyjście treści `yPercent:25→50` + fade; spec w blueprintcie parhouse §3.4/§6.4).
Jeśli growing-header okaże się zbyt ciężki — fallback: sticky numer po lewej,
treść kroków przewija się po prawej. Copy (1:1):

Lead sekcji: **Klient B2B chce wiedzieć, co dokładnie wydarzy się po kliknięciu
„Zróbmy to". Oto uporządkowany proces.**

1. **Krok 1: Discovery (Audyt i Analiza)** — Diagnozujemy wąskie gardła w Twojej firmie.
2. **Krok 2: Strategia i Architektura** — Dobieramy narzędzia i projektujemy przepływ pracy.
3. **Krok 3: Wdrożenie i Development** — Budujemy, kodujemy i integrujemy ekosystem.
4. **Krok 4: Optymalizacja i Wsparcie** — Szkolimy i dbamy o bezawaryjne działanie.

### 4.7 SEKCJA 7 — FAQ (rozbijanie obiekcji)

Akordeon (details/summary z animacją wysokości GSAP lub własny — dostępny
z klawiatury, aria-expanded). Pytania (odpowiedzi rozwiń zgodnie ze wskazówkami
klienta, ton szczery i konkretny):

1. **Ile kosztuje wdrożenie CRM / nowej strony?** — odpowiedź w duchu:
   „Zależy od skali. Projekty zaczynamy od X PLN…" (kwotę zostaw jako
   `[X 000] PLN` — TODO dla człowieka).
2. **Ile potrwa realizacja?** — podaj widełki per typ projektu (landing / strona /
   wdrożenie CRM), zaznacz że harmonogram powstaje w kroku Discovery.
3. **Czy muszę znać się na technologii, żeby z Wami współpracować?** —
   „Nie — technikalia bierzemy na siebie." + 2 zdania rozwinięcia.

### 4.8 SEKCJA 8 — Zespół

Baza: treść z obecnej `section_history` („Zespół cosgral.agency — kod, kadr
i motion w jednym studio"; osoby 01/02 z opisami ról). Layout: dwie karty
(zdjęcie + imię + rola + opis), zdjęcia placeholder jeśli brak plików
(TODO dla człowieka). Reveal przy scrollu.

### 4.9 STOPKA

- Kolumny linków: **Sekcje** (anchor: Start / Usługi / Proces / FAQ / Zespół /
  Kontakt) · **Usługi** (5 podstron z §4.5) · **Kontakt** (email, telefon —
  placeholdery jeśli brak) · **Social** (Instagram + pozostałe — placeholder href).
- CTA „Start a project" → scroll do sekcji 4 (formularz).
- Dół: „© 2026 cosgral agency" + Privacy Policy.
- Usuń z portu listę „PREVIEW EFFECTS: 1. Classic 2. Liquid…" (pozostałość
  switchera — nie może trafić do V3).

---

## 5. PLIKI V3

```
cosgral-agency/
  index-v3.html            # cała strona (markup czytelny, WCIĘTY, nie minifikowany)
  cosgral-v3.css           # jedyny arkusz: tokeny, layout, sekcje, stopka
  cube-director.js         # scena Three.js + maszyna stanów + master timeline (§3)
  hero-text-reveal.js      # PORT efektu napisu (root-line + classic) — wycięty z inline #10
  mesh-gradient-bg.js      # vanilla WebGL shader tła sekcji 5 (§5.3)
  sections.js              # marquee, listy usług, growing-header/proces, FAQ, revealy
  uslugi/
    _template.html         # szablon podstrony usługi
    tworzenie-stron-internetowych.html
    projektowanie-aplikacji.html
    wdrazanie-automatyzacji.html
    systemy-crm.html
    grafika-i-montaz-wideo.html
```

### 5.1 Tokeny (do `cosgral-v3.css`)

Z `cosgral-brand.css` + parhouse: bg `#0a0a0a` (spójnie z obecnym), ink `#fff`,
muted `#808080`, akcent `#e82323` (root-line, hovery, numeracja), overlay
`#00000099`. Grain overlay: pseudo-element `body::after` z SVG turbulence/noise
PNG, `opacity ~0.05`, `pointer-events:none` (kierunek „grain" z `index-v2.html`).

**Typografia (ZWERYFIKOWANE 2026-07-20):** obecna strona NIE ma lokalnych plików
fontów — ciągnie je ze zdalnego arkusza Webflow
(`voyeur-verite-w.webflow.shared.9dcf350f3.css`, 7300+ linii, głównie martwe
klasy Webflow). Dwa realne brand-fonty w `@font-face`:
```css
@font-face {
  font-family: "Feature Display";
  src: url("https://cdn.prod.website-files.com/69e215f9fedabd75baf3721f/69e21c7259bb7bd4de54fbde_FeatureDisplay-Regular.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: block;
}
@font-face {
  font-family: "Review";
  src: url("https://cdn.prod.website-files.com/69e215f9fedabd75baf3721f/69e21c156fa48d0613efdc81_Review-Regular.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: block;
}
@font-face {
  font-family: "Review";
  src: url("https://cdn.prod.website-files.com/69e215f9fedabd75baf3721f/69e21bb40124495b746fd3b6_Review-Light.woff2") format("woff2");
  font-weight: 300; font-style: normal; font-display: block;
}
@font-face {
  font-family: "Review";
  src: url("https://cdn.prod.website-files.com/69e215f9fedabd75baf3721f/69e21c2ad42bd18c6c79794f_ReviewWide-Black.woff2") format("woff2");
  font-weight: 900; font-style: normal; font-display: block;
}
```
W `cosgral-v3.css` deklarujemy TYLKO te 4 `@font-face` (bez ciągnięcia całego
7300-liniowego arkusza Webflow — czysty zysk wagi/perf). „Feature Display" —
nagłówki/wordmark; „Review" (300/400/900) — body/lead/labelki numeryczne.
Fallback stack: `"Feature Display", Arial, sans-serif` / `"Review", Arial, sans-serif`.

### 5.2 Kolejność ładowania w `index-v3.html`

```
cosgral-v3.css
gsap.min.js → ScrollTrigger → ScrollSmoother → SplitText   (te same CDN co index.html)
<script type="importmap"> three + three/addons </script>
hero-text-reveal.js → cube-director.js (module) → mesh-gradient-bg.js → sections.js
```

ScrollSmoother: `smooth: 0.45` (wartość z tuningu obecnej strony —
`cosgral-tuning.js`). Wszystkie ScrollTriggery tworzone PO inicie smoothera.

### 5.3 Adaptacja shadera z `efekty.txt`

`efekty.txt` to komponent React (`@paper-design/shaders-react` MeshGradient +
custom shader R3F). Strona jest vanilla — **przepisz koncepcję na goły WebGL**:
fullscreen quad + fragment shader animowanego gradientu siatkowego (paleta
`#000000 / #1a1a1a / #333333` + biel do 5%), `requestAnimationFrame` z pauzą,
gdy sekcja 5 poza viewportem (IntersectionObserver). Canvas absolutny pod
treścią bloku usług, `opacity ~0.6`. NIE instaluj Reacta/three-fibera dla tego
tła. Fragment-shader możesz oprzeć na noise z `efekty.txt` (sin/cos mix).

### 5.4 Podstrony usług (`uslugi/*.html`)

Jeden `_template.html`: nav (powrót do `../index-v3.html` + menu), hero podstrony
(numer 0X + nazwa usługi, mega-typografia), 3 bloki: **Co robimy** (lista
zakresu), **Dla kogo / efekt** (2–3 akapity), **CTA** „Zacznijmy od bezpłatnego
audytu" → link do `../index-v3.html#kontakt`. Stopka wspólna. Copy podstron:
napisz rzeczowe, B2B, po polsku (po 150–250 słów; bez lania wody, bez
AI-frazesów typu „w dzisiejszych czasach"). Bez sześcianu 3D na podstronach —
tylko grain + revealy (szybkie ładowanie).

---

## 6. ETAPY WYKONANIA (kolejność obowiązkowa)

### ETAP 0 — Baseline (bez zmian w kodzie)
1. Przeczytaj: `HERO-EFFECTS-BLUEPRINT.md` (§1–§3, §7), blueprint parhouse,
   ten plan w całości.
2. Serwuj podgląd z katalogu `cosgral-main` (obrazy chodzą po `/images/...`):
   `python -m http.server` w `cosgral-main`, strona pod
   `/designkopia/cosgral-agency/index-v3.html`. Przed każdym testem hero:
   `sessionStorage.clear()` (preloader liczy hasVisited — dotyczy portowanych skryptów).
3. Zweryfikuj `assets/cosgral-cube.glb` (wczytaj w minimalnym snippecie
   GLTFLoader, zrzuć do konsoli liczbę meshy/materiałów). Obejrzyj mp4 referencyjne.

### ETAP 1 — Szkielet + port zachowanych elementów
1. `index-v3.html`: pełny statyczny markup WSZYSTKICH sekcji (§4) z finalnym
   copy, bez animacji. `#act-wrapper` z 4 aktami (każdy 100vh, teksty widoczne
   statycznie jeden pod drugim — na razie bez pinowania).
2. `cosgral-v3.css`: tokeny, typografia, layout wszystkich sekcji, stopka, grain.
3. Port formularza (sekcja 4) i pillars (za sekcją 5) z `index.html` —
   wycinaj Pythonem (`re`), NIE grep/sed (body = 1 linia).
4. Port efektu napisu: wytnij z inline #10 minimum opisane w §4.1 do
   `hero-text-reveal.js`; efekt na razie odpalany na load (bez scrolla).
5. **Checkpoint:** strona czytelna od góry do dołu bez JS-błędów w konsoli;
   efekt napisu działa na wordmarku.

### ETAP 2 — Cube-director bez scrolla
1. Scena, światła, ładowanie glb, stany z §3.1 jako metody
   (`setState(name, progress)`).
2. Panel deweloperski (tymczasowy, usuwany w E6): przyciski stanów + slider
   progressu — ręczne przełączanie do weryfikacji wizualnej każdego stanu.
3. Drobiny: seedowany PRNG, instancing, pomiar fps (desktop i emulacja mobile).
   Decyzja transmission vs standard+envMap (§3.3) — zapisz wynik pomiaru w komentarzu.
4. **Checkpoint:** każdy stan wygląda poprawnie z panelu; 60 fps desktop,
   ≥ 40 fps mobile-emulacja przy PARTICLES.

### ETAP 3 — Spięcie narracji ze scrollem
1. Pin `#act-wrapper` + master timeline z progami §3.2; teksty aktów wchodzą/
   schodzą wg §4.1–4.4; efekt napisu przepięty ze scrubem (deterministycznie!).
2. Crossfade sześcian→formularz (§3.4); po RELEASED normalny scroll i stop rAF.
3. Test scrub w OBIE strony ×5 (góra-dół-góra): brak skoków, brak rozjazdu
   stanów, identyczny obraz przy tym samym progressie.
4. **Checkpoint:** pełna narracja aktów 1–4 płynna; scroll za wrapperem normalny.

### ETAP 4 — Sekcje contentowe + tła
1. `sections.js`: marquee, hover listy usług, growing-header procesu (lub
   fallback sticky), akordeon FAQ, revealy (pillars, zespół, stopka).
2. `mesh-gradient-bg.js` pod blokiem usług (§5.3) + IntersectionObserver pauza.
3. **Checkpoint:** wszystkie sekcje 5–8 + stopka działają; brak długu
   w konsoli; scroll przez całość bez jank.

### ETAP 5 — Podstrony usług
1. `_template.html` + 5 podstron z copy (§5.4); linki z sekcji 5 i stopki działają
   w obie strony.
2. **Checkpoint:** klik w każdą usługę → podstrona → powrót → CTA do #kontakt.

### ETAP 6 — Tuning, dostępność, wydajność, sprzątanie
1. **Mobile:** progi §3.2 przetestować na 390×844; akt 3 wg §4.3; drobiny 500;
   fonty/rozmiary typografii responsywne (clamp()).
2. **`prefers-reduced-motion: reduce`:** brak pinowania i canvasu — zamiast
   aktów statyczna kolumna: logo (render PNG sześcianu) + teksty aktów + formularz;
   brak marquee-autoplay; revealy → zwykłe pojawienie.
3. **Dostępność:** kontrast AA (muted `#808080` na `#0a0a0a` — sprawdź, w razie
   czego rozjaśnij do `#9a9a9a`), focus-visible na listach usług/FAQ/formularzu,
   `aria-expanded` w FAQ, alt-y, jeden `h1` (hero), hierarchia h2/h3.
4. **Wydajność:** LCP < 2.5 s (hero tekst, nie canvas — canvas nie może być LCP),
   JS łącznie < 450 kB (budżet `profiles/performance-budget.yaml`), three.js
   ładowany `type="module"` bez blokowania renderu, glb < 1 MB (jeśli większy —
   skompresuj Draco/meshopt), poster/lazy dla mediów.
5. Usuń panel deweloperski, martwy kod, console.logi.
6. **Checkpoint końcowy — Definition of Done (§7).**

Po każdym etapie: commit-punkt (kopia robocza), zapis krótkiej notki co zrobione
w `PLAN-PRZEBUDOWY-V3.md` pod sekcją „LOG" (dopisz ją na końcu pliku).

---

## 7. DEFINITION OF DONE (kryteria akceptacji)

- [ ] Akt 1: sześcian wyłania się z mroku, siada w logo, tekst hero wchodzi
      efektem napisu (root-line + classic), przy scrollu znika w mroku.
- [ ] Akt 2: drobiny składają się w sześcian, tekst „Nie tworzymy tylko stron…",
      sześcian zaczyna rotację.
- [ ] Akt 3: rotacja + puls + odjazd w prawo (desktop), tekst korzyści z lewej,
      powrót na środek.
- [ ] Akt 4: blur-morf w formularz „Zacznijmy od bezpłatnego audytu",
      dalej normalny scroll.
- [ ] Scrub w obie strony w 100% deterministyczny (5× góra-dół bez rozjazdu).
- [ ] Sekcja 5: marquee „Zaufali nam", 5 usług z linkami do działających
      podstron, pillars przeniesione, shader-tło subtelne.
- [ ] Sekcja 6: proces 01–04 z copy 1:1; Sekcja 7: FAQ 3 pytania z klawiaturą;
      Sekcja 8: zespół; stopka z pełnym linkowaniem (bez listy PREVIEW EFFECTS).
- [ ] `prefers-reduced-motion` daje w pełni czytelną statyczną wersję.
- [ ] 60 fps desktop w całej narracji; mobile bez jank; Lighthouse perf ≥ 80 mobile.
- [ ] Zero błędów w konsoli; `index.html` i `index_stable.html` NIETKNIĘTE.
- [ ] TODO dla człowieka zebrane na końcu pliku w sekcji „LOG": kwota w FAQ,
      logotypy klientów, zdjęcia zespołu, endpoint formularza, socials.

## 8. TWARDE ZASADY

1. Nie edytuj `index.html` / `index_stable.html` — tylko czytasz i portujesz.
2. Copy klienta z §4 wstawiasz 1:1 (bez parafraz); brakujące treści piszesz
   po polsku, rzeczowo, bez AI-frazesów.
3. Zero `Math.random()` w callbackach scrubowanych — tylko seedowany PRNG na init.
4. Sześcian to JEDYNY element 3D strony; podstrony bez WebGL.
5. Mockupy/referencje = szkielet i rytm, nie skóra — nie kopiuj wyglądu parhouse,
   kopiuj klarowność.
6. Każdy checkpoint z §6 musi przejść, zanim ruszysz dalej; jeśli 2× nie
   przechodzi — STOP i raport do człowieka (zasada max_iterations z pipeline).

---

## LOG

### 2026-07-20 — pierwsza pełna implementacja (ETAP 0-6)

Zbudowano i zweryfikowano wszystkie pliki z §5: `index-v3.html`, `cosgral-v3.css`,
`hero-text-reveal.js`, `cube-director.js`, `mesh-gradient-bg.js`, `sections.js`,
`hero-glyphs.json`, `uslugi/_template.html` + 5 podstron. `index.html` /
`index_stable.html` nietknięte.

**Zweryfikowane działanie (nie tylko "napisane"):**
- Cała maszyna stanów sześcianu (EMERGE→LOGO→DISSOLVE→PARTICLES→ASSEMBLED→
  ORBIT_R→RETURN→BLUR_MORPH→RELEASED) przetestowana punkt-po-punkcie przez
  bezpośrednie sterowanie `tl.progress()` — światła/skala/pozycja/drobiny dają
  dokładnie oczekiwane wartości na każdym progu z tabeli w §3.2.
- Determinizm scrubu w obie strony potwierdzony (te same wartości po
  wielokrotnym przeskoku tam i z powrotem) dla wszystkiego OPRÓCZ ciągłej
  rotacji `spin` (celowo — żywa pętla, patrz komentarz w kodzie).
- Efekt napisu (root-line + clip-path reveal) kończy się w pełni w oknie LOGO
  (t=1.85, przed startem DISSOLVE t=2.0) — pierwsza wersja kończyła się 0.05
  jednostki ZA późno (nachodziła na DISSOLVE), poprawione przesunięciem `at`
  z 1.05 na 0.85 w `cube-director.js`.
- Reduced-motion (`html.reduce-motion`, sterowane wczesnym inline-skryptem w
  `<head>`, NIE surowym `@media`) daje pełny, czytelny, statyczny fallback —
  zweryfikowane przez `get_page_text` (cała treść obecna) i computed styles.
  Po drodze znaleziony i naprawiony bug: `hero-text-reveal.js` ustawiał inline
  `clip-path` niezależnie od reduced-motion, co nadpisywało CSS-owy fallback.
- Link integrity: wszystkie `href`/`src` w `index-v3.html` + 5 podstronach
  usług rozwiązują się do 200 OK (sprawdzone `urllib` przeciw lokalnemu
  serwerowi, nie ręcznym klikaniem).
- FAQ akordeon, nav overlay, formularz (mailto fallback) — przetestowane
  programowo (`.click()`, sprawdzenie `aria-expanded`/`data-open`/`maxHeight`).
- Kontrast WCAG AA policzony dla wszystkich par tekst/tło z tokenów; znaleziono
  i naprawiono 2 realne niedociągnięcia: `--accent` (#e82323) na `--bg` to
  4.43:1 (poniżej progu 4.5 dla małego tekstu) — dodano `--accent-text`
  (#ee3333, 4.86:1) do użycia na małym tekście (eyebrow, status błędu
  formularza); `.marquee__item` miał dodatkowe `opacity:0.7` na już-i-tak
  `--muted`, zjeżdżając realny kontrast do ~3.9:1 — usunięte.
- Perf: `three.js` (~600 kB) ładowany DYNAMICZNIE (`await import()` wewnątrz
  `initCubeDirector`) — w trybie reduced-motion w ogóle się nie pobiera
  (zweryfikowane przez `performance.getEntriesByType('resource')`).

**Bug CSS znaleziony przy okazji (realny, nie artefakt testów):** `<canvas>`
jest "replaced element" — `position:absolute; inset:0` go NIE rozciąga tak jak
`<div>`; `.services-bg` (tło-shader sekcji usług) zostawało przy domyślnym
300×150px, dopóki nie dopisano jawnego `width:100%; height:100%`. Sprawdź inne
canvasy w projekcie pod tym kątem, jeśli się pojawią.

**Ograniczenie środowiska testowego (nie strony):** przeglądarka w tej sesji
zgłasza `document.hidden === true` i zawsze `prefers-reduced-motion: reduce`
— rAF-owe renderowanie (Three.js, WebGL shader) nigdy realnie nie rysuje
pikseli w tym podglądzie, a `computer{screenshot}` konsekwentnie się
timeoutuje na stronach z żywym canvasem. Weryfikacja wizualna (czy sześcian
faktycznie ładnie wygląda, czy world-space `orbitX` w akcie 3 to sensowne
przesunięcie w prawo, czy blur na morfie wygląda dobrze) NIE została zrobiona
— tylko logika/dane/DOM. **Człowiek powinien obejrzeć stronę w prawdziwej
przeglądarce przed akceptacją**, zwłaszcza akt 3 (`orbitX = innerWidth*0.0016`
to szacunkowa wartość, nie kalibrowana wizualnie) i ogólny "wow" efekt.
Dodano `?forceMotion=1&debug=1` jako pomoc deweloperską (patrz kod) — usunąć
`window.__cubeDebug`/panel w ramach dalszego porządkowania, jeśli niepotrzebny
na produkcji (jest już zabezpieczony za `?debug=1`, więc nieszkodliwy).

**Świadome uproszczenia względem pierwszej wersji planu (udokumentowane w
kodzie/komentarzach, nie ukryte):**
- ScrollSmoother POMINIĘTY (wymagałby `#smooth-wrapper`/`#smooth-content`
  wokół całej strony + koliduje z prostymi anchor-linkami) — sama pin-owana
  narracja działa na natywnym scrollu + `ScrollTrigger`. TODO dla kolejnej
  iteracji, jeśli inercyjny scroll okaże się pożądany.
- `rl-mid`/`rl-w2`/`rl-tail`/konwergencja z oryginalnego efektu NIE zostały
  przeniesione (V3 ma jeden wordmark, nie dwa konwergujące słowa) — zgodnie
  z planem.

**TODO dla człowieka (zebrane też inline jako komentarze w kodzie):**
- Kwota startowa w FAQ (`[X 000] PLN`).
- Realne logotypy klientów w marquee (obecnie tekstowe nazwy).
- Zdjęcia zespołu (obecnie placeholder z numerem).
- Realny endpoint formularza kontaktowego (obecnie `mailto:` fallback w
  `sections.js`).
- Realne linki social media w stopce.
- Wizualna kalibracja `orbitX` w akcie 3 i ogólny przegląd sceny 3D na żywo.
- Lokalny serwer testowy: `python -m http.server 8123` z katalogu
  `cosgral-main`, strona pod `/designkopia/cosgral-agency/index-v3.html`.

### 2026-07-20 (iteracja 2) — feedback klienta: efekty i media z powrotem

Klient zgłosił: (1) sekcja usług została błędnie rozbita na dwie sekcje mówiące
to samo, a miała być JEDNĄ sekcją w stylu starych pillars (Web/AI…) z ich
efektem podświetlenia; (2) brak teł/zdjęć/wideo z folderów projektu; (3) sekcja
zespołu „zmieniona strasznie” względem oryginału. Wykonane:

- **Usługi = pillars (jedna sekcja).** Usunięto listę `.service-row` i
  uproszczone pillars; sekcja „Sprawdź, co może Cię zainteresować” to teraz
  wierny port `.section_pillars`: nagłówki Review 900 uppercase w czerwieni
  (styl wyciągnięty z arkusza Webflow `voyeur-verite-w.webflow.shared`, reguły
  `.heading-h2-review`/`.pillar_heading_rectangle`), **hover-wipe czerwonego
  prostokąta** (width 0→100%, cubic-bezier(.86,0,.07,1)) z flipem koloru
  nagłówka na off-white, **przygaszanie contentu pozostałych pillarów do 0.5**
  (`:has()` — dokładnie jak w oryginalnym embedzie), reveal nagłówków
  yPercent 100→0 power4.inOut w overflow-hidden wrapperze + fade opisów
  (port animacji z inline script #10 starej strony, bez SplitText — nagłówki
  jednowierszowe). 5 pillarów = 5 usług, każdy jest linkiem do podstrony.
- **Media wróciły:** akt 1 dostał stare tło hero `cosgral-hero-back.jpg`
  (opacity .28, maska gradientowa, fade'uje razem z aktem — jest dzieckiem
  `.act--1`); nowa sekcja „Realizacje / Zobacz nasze kadry” z 4 kadrami
  (slot-02-man-glasses, slot-03-bw-walking — te same co stara sekcja films —
  + approved-editorial, approved-web) z clip-wipe + blur→ostro revealem
  (echo `cosgral-film-blur-reveal.js`, trigger-based zamiast pinned) i linkami
  do podstron; **mp4 `White_cube_logo_animation`** podpięty jako `#cube-fallback`
  — pokazywany w układzie statycznym reduce-motion (akt 1, bez autoplay) i przy
  twardej awarii WebGL (wtedy z autoplay; cube-director dodaje wtedy klasę
  `reduce-motion` na `<html>` i strona degraduje się do czytelnego układu
  statycznego zamiast zostać z niewidocznymi aktami).
- **Zespół = port 1:1** `.section_history`/`.history_team` (markup ze starej
  strony + style z `cosgral-brand.css`): jasna sekcja #f5f0ee, nagłówek
  „Zespół cosgral.agency” + decor „Kod, kadr / i motion w jednym studio”,
  dwie karty portretowe (placeholdery 01/02 jak w oryginale), czerwone
  nazwiska Feature Display (#ee3335), okrągłe CTA ze strzałką (hover: skala,
  czerwone wypełnienie, rotacja strzałki), shade-gradient na medium, pełny
  responsywny zestaw breakpointów z brand.css; reveal per karta = port
  `cosgral-team-reveal.js` (media scale+y, info x-slide, once:true).
- **Stopka = jasna jak w oryginale:** #f5f0eb + rozmyte
  `cosgral-approved-footer.jpg` (blur 2px, brightness 1.08, opacity .92),
  czerwony lowercase wordmark, ciemny tekst kolumn.
- Wszystkie ścieżki obrazów LOKALNE (`images/cosgral-agency/...` wewnątrz
  cosgral-agency) — strona jest samowystarczalna niezależnie od root serwera.

### 2026-07-20 (iteracja 3) — realne wdrożenie kierunków z `inspo.html`

Klient wskazał `inspo.html` (7-pinowy moodboard: grain, glitch lo-fi, liquid
metal, bionic, ribbed glass, cinematic haze, editorial — identyczna treść co
`index-v2.html`, którego użyłem w iteracji 1 tylko jako luźnej inspiracji) i
`efekty.txt` jako pliki z konkretnymi wytycznymi do WDROŻENIA, nie tylko do
przeczytania. Zaimplementowane 5 kierunków, każdy z realnym miejscem na stronie:

- **grain_field** (pin C/F/G) — grain wzmocniony (0.045→0.065 opacity) +
  NOWA warstwa `body::before`: diagonalny "light falloff" (linear-gradient
  128deg, biel→cień, `mix-blend-mode:soft-light`, z-index 998 — nad treścią,
  nie za opaque tłami sekcji, żeby było w ogóle widoczne).
- **cinematic_haze** (pin D/E) — `.act-wrapper::before`: dwie ciepłe plamy
  radial-gradient (bursztyn 28%/30%, czerwień 74%/78%, oba ~0.1 alpha) POD
  `#cube-stage` (z-index 0 < 1) — nigdy nie przykrywają sześcianu, dają
  „filmowy klimat, ciepła mgła" zamiast płaskiej czerni za narracją.
- **liquid_metal** (pin B) — DRUGA instancja WebGL shadera za sekcją Proces:
  `mesh-gradient-bg.js` przepisany na fabrykę `mountMeshCanvas(canvas, mode)`
  z auto-initem po `[data-mesh-canvas]`; nowy fragment shader
  `FRAG_LIQUID_METAL` — 4-warstwowe płynące fale zagęszczane do metalicznych
  grzbietów (`pow(sin,6)`), czarno-srebrne, deterministyczne (bez
  `Math.random`). Usługi używają trybu `"mesh"` (dawny jedyny shader),
  Proces trybu `"liquid-metal"` (opacity 0.32, przygaszony mocniej niż mesh
  usług, żeby nie bił po oczach za tekstem kroków).
- **ribbed_glass** (pin G) — `.marquee` (pas „Zaufali nam") dostał
  `repeating-linear-gradient` pionowych żłobień (1px linia / 8px odstęp,
  opacity 0.035) — subtelna faktura zamiast płaskiego tła.
- **bionic_manifesto** (pin A) — krótki błysk chromatic-aberration
  (`text-shadow` cyan/czerwień, `@keyframes pillar-chromatic-flash`, 0.35s)
  na wejściu hovera w nagłówki pillarów usług — "digital ecology" akcent,
  gaśnie zanim czerwony prostokąt dojedzie do końca. Neutralizowany przez
  istniejący blok `html.reduce-motion *{animation-duration:0.001ms}`.

**Świadoma decyzja:** miniatury z Pinterest w `inspo.html`/`index-v2.html` to
zewnętrzny CDN (i.pinimg.com) — potraktowane WYŁĄCZNIE jako mood-referencja,
NIE hotlinkowane na produkcję (ryzyko martwych linków, wątpliwa licencja do
redystrybucji na cudzej stronie). Wszystkie 5 efektów to własne
shadery/gradienty inspirowane tym klimatem, nie kopie zdjęć. Jeśli klient chce
dosłownie te zdjęcia (nie tylko klimat) — potrzebne własne, zakupione/
wygenerowane odpowiedniki.

**Weryfikacja:** oba canvasy (`mesh`, `liquid-metal`) montują się, poprawny
rozmiar bufora = clientWidth/Height (bug z iteracji 1 nie wrócił), zero
błędów kompilacji/linkowania w konsoli, `mix-blend-mode`/`z-index` warstw
potwierdzone przez `getComputedStyle`, oba canvasy poprawnie znikają pod
`html.reduce-motion`. Wizualna ocena mocy/tonu efektów (czy poświata nie jest
za mocna/za słaba, czy liquid-metal nie odciąga uwagi od treści procesu)
nadal czeka na człowieka — patrz ograniczenie środowiska w iteracji 1.

**Weryfikacja (programowa, jak w iteracji 1):** 17 ScrollTriggerów (1 master +
5 nagłówków + 5 opisów + 4 filmy + 2 karty zespołu); rectangle width 0 + red +
transition:width; Review/900/uppercase na nagłówkach; wrapper overflow:hidden;
wideo ukryte w full-motion, widoczne w reduce-motion; wszystkie media 200 OK;
master timeline nadal deterministyczny; reveal pillarów potwierdzony w ruchu
(stIsActive=true, yPercent 100→89.6 z upływem realnego czasu — rAF środowiska
zamrożony, w realnej przeglądarce dobiegnie do 0). Zero błędów w konsoli.
Ocena wizualna nadal wymaga człowieka (ograniczenie środowiska bez zmian).

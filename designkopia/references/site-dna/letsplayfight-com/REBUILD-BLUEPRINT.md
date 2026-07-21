# REBUILD BLUEPRINT — https://www.letsplayfight.com

> Wygenerowane przez `/site-dna` (2026-07-05). Dowody: `capture/`, raport maszynowy: `site-dna.json`.
> Instrukcja w §6 jest wykonywalna bez oglądania oryginału.

## 1. Czym jest ta strona

Portfolio niezależnego studia kreatywno-produkcyjnego (Playfight). Vibe: **zadziorny,
fizyczny, monochromatyczny** — biało-czarna baza, brutalne mega-typo („Different is
Everything."), dużo ruchu sterowanego scrollem i kursorem. Strona one-page z overlayem menu.

**Signature moment:** hero — mega-nagłówek z typewriterem, który przy scrollu jest
scrubowany (`data-anim-hero-scroll`), a obrazy w tle reagują dystorsją WebGL
(`data-gl-img`) i zostawiają ślad za kursorem (`data-stacked-trail-item`).

## 2. Wykryty stack

| Warstwa | Technologia | Pewność | Dowód |
|---|---|---|---|
| Builder | Webflow | 100% | `data-wf-page`, `webflow.schunk.*.js` |
| Custom JS | własny bundle na Vercelu | 100% | `main.js` wstrzykiwany dynamicznie (`playfight-2k26.vercel.app/main.js`) |
| Animacje | GSAP 3 + ScrollTrigger, ScrollSmoother, SplitText, MorphSVG, CustomEase | 100% | `capture/dyn00-main.js` |
| Smooth scroll | Lenis + ScrollSmoother | wysoka | marker `lenis` w bundlu |
| WebGL | three.js (dystorsja obrazów; uniformy `u_nav`, `u_top`) | wysoka | shader w `dyn00-main.js` |
| Ikony/animacje wektorowe | Lottie | średnia | marker w chunku Webflow |
| Baza | jQuery 3.5.1 (bagaż Webflow) | 100% | `<script src>` |

## 3. Anatomia layoutu (6 × `<section>`, bez `<header>/<footer>` — nav jako overlay)

1. **Preloader** (`data-loader`) — pełnoekranowy loader przed odsłonięciem hero.
2. **Hero** — mega-typo „Different is Everything." + typewriter (`data-typewrite`);
   scrub przy scrollu (`data-anim-hero-scroll`), obrazy z trailem kursora.
3. **What we do** — lista usług z hover-reveal mediów (`data-service-hover`).
4. **Recent work** — siatka projektów, 5 × `<video>` inline, parallax akapitów (`data-anim-parallax`).
5. **Originals / Playground** — moduły dodatkowe (lightbox wideo: `.original_lightbox_video_portal`).
6. **Contact** — „Let's chat" + telefon + formularz (4 × `<form>` łącznie z newsletterem).

Nav: 2 × `<nav>` — pasek + fullscreen menu (`data-menu`), chowanie przy scrollu w dół.

## 4. Design tokens

- **Paleta:** `#ffffff` (bg) / `#000000` (ink) / szarości `#dddddd #cccccc #999999`
  (bordery, wyciszone) / `#fafafa` (tło alternatywne). Monochrom — kolor robią MEDIA.
- **Typografia:** `FKGrotesk` (@font-face, własny — zamiennik open: *Space Grotesk*)
  + `Newsreader` (serif, akcenty italic). Skala: hero ~10vw, tight leading.
- **CSS:** mix-blend-mode, clip-path, backdrop-filter, mask-image, sticky, blur,
  grid, aspect-ratio, custom properties (pełna lista: `site-dna.json: css_features`).

## 5. Efekty (mapowanie na nasz stack)

| technique_id | Co robi | Oryginał | U nas |
|---|---|---|---|
| smooth-scroll | inercyjny scroll | Lenis/ScrollSmoother | `web/lib/effects/SmoothScroll.tsx` |
| preloader-counter | loader przed hero | GSAP timeline, `data-loader` | wzór `voyeur-preloader-001` |
| text-split-reveal | nagłówki literka po literce | SplitText, stagger `{amount:.1}`, `power3.out` | `SplitText.tsx` |
| typewriter | maszyna do pisania w hero | JS, `data-typewrite` | `TextScramble.tsx` (wariant) |
| pinned-scroll-sequence + scroll-scrub | pin + scrub sekcji (`pin:1`, `scrub:1`) | ScrollTrigger | `PinnedSequence.tsx` |
| parallax-layers | parallax akapitów `data-anim-parallax` | ScrollTrigger scrub | `ParallaxLayer.tsx` |
| webgl-image-distortion | bulge/dystorsja obrazów `data-gl-img` | three.js shader (`u_nav`, `u_top`) | `WebGLImageDistortion.tsx` (OGL) |
| image-trail ⚠️ | ślad obrazów za kursorem | GSAP, `data-stacked-trail-item` | `playfight-stacked-trail` — **caution: laggy**, wyłącz na mobile |
| masked-image-reveal | odsłony przez clip-path | GSAP + clip-path | `MaskedReveal.tsx` |
| sticky-collapse-nav | nav chowa się przy scrollu | ScrollTrigger | `playfight-nav-hide` |
| scroll-reveal-stagger | kaskadowe wejścia | GSAP stagger `.1` | `Reveal.tsx` |

Easingi oryginału (do wiernego feelu): `power3.out` (wejścia), `power4.out` (hero),
`expo.out`/`expo.inOut` (menu/maski), `none` (scruby), stagger `.1` lub `{amount:.1}`.

## 6. INSTRUKCJA DLA AGENTA — zbuduj 1:1

### 6.1 Setup

```bash
# wariant A: w tym repo (zalecane) — stack już skonfigurowany
cd web && npm i gsap @gsap/react lenis split-type three @react-three/fiber @react-three/drei lottie-react

# wariant B: od zera
npx create-next-app@latest playfight-clone --ts --tailwind --app
cd playfight-clone && npm i gsap @gsap/react lenis split-type ogl lottie-react
```

Fonty: `next/font` → Space Grotesk (zamiennik FKGrotesk) + Newsreader (Google Fonts).

### 6.2 Struktura plików

```
app/page.tsx                 # kompozycja 6 sekcji
components/Preloader.tsx     # (1) loader
components/Hero.tsx          # (2) mega-typo + typewriter + trail
components/Services.tsx      # (3) hover-reveal
components/RecentWork.tsx    # (4) grid + video inline + parallax
components/Originals.tsx     # (5) lightbox wideo
components/Contact.tsx       # (6) formularz
components/NavOverlay.tsx    # nav + fullscreen menu
lib/effects/*                # z web/lib/effects/ (SmoothScroll, SplitText, PinnedSequence,
                             #  ParallaxLayer, WebGLImageDistortion, MaskedReveal, Reveal)
```

### 6.3 Kolejność implementacji

1. Fundament: layout + fonty + SmoothScroll (Lenis) + tokeny kolorów.
2. Statyczny markup wszystkich 6 sekcji (siatki, typografia, media placeholder).
3. Motion warstwa 1: Reveal/SplitText na wejściach (stagger `.1`, `power3.out`).
4. Motion warstwa 2: hero scrub (pin + `scrub:1`), parallax, nav-hide, preloader.
5. Motion warstwa 3 (ciężka): WebGL distortion na obrazach; image-trail **na końcu,
   za flagą** (desktop only, `prefers-reduced-motion` → off).
6. Tuning: przelicz `end:` po realnych treściach; sprawdź 60 fps na scrollu.

### 6.4 Spec per sekcja (wartości z oryginału)

- **Hero:** h1 ~10vw uppercase; typewriter cyklicznie podmienia końcówkę frazy;
  ScrollTrigger `{ pin: true, scrub: 1 }` — hero konsumuje ~150–200vh scrolla,
  typo skaluje się w dół i wyjeżdża maską (`clip-path: inset()`).
- **Services:** hover na item → media reveal (opacity+scale z `expo.out`, ~0.6 s);
  kursor niestandardowy opcjonalny (⚠️ caution).
- **Recent work:** wideo `muted autoplay loop playsinline`; akapity z `data-speed`
  0.85–1.15 (ParallaxLayer).
- **Menu:** fullscreen overlay, wejście `expo.inOut` ~0.8 s, linki staggerowane.

### 6.5 Kryteria akceptacji

- [ ] Scroll ma inercję (Lenis), zero natywnego "skoku".
- [ ] Hero: pin + scrub działa; typo animowane per-litera; typewriter cyklicznie.
- [ ] Obrazy reagują na hover dystorsją WebGL; na mobile fallback statyczny.
- [ ] Nav chowa się przy scrollu w dół, wraca przy scrollu w górę.
- [ ] Monochrom: jedyny kolor pochodzi z mediów; fonty Grotesk+Newsreader.
- [ ] `prefers-reduced-motion` wyłącza smooth-scroll, trail i distortion.
- [ ] Lighthouse perf ≥ 80 mobile (limit z `profiles/performance-budget.yaml`).

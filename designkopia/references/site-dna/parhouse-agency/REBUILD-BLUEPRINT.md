# REBUILD BLUEPRINT — https://parhouse.agency

> Wygenerowane przez `/site-dna` (2026-07-05). Dowody: `capture/`, raport maszynowy: `site-dna.json`.
> Instrukcja w §6 jest wykonywalna bez oglądania oryginału.

## 1. Czym jest ta strona

Portfolio polskiej agencji kreatywnej PAR HOUSE (kampanie Ads, AI fashion visuals,
e-commerce). Vibe: **ciemny, premium, techniczny** — tło `#090909`, biała typografia
Geomanist, poziome szyny case studies, pinowana siatka masonry, marquee. Dużo scrolla,
zero krzykliwych kolorów — barwy wnoszą wyłącznie zdjęcia klientów (LE POSSÉ, SEMPRE,
HEWKO Cars…).

**Signature moment:** **kursor-preloader** — na load kropka własnego kursora
(`#parhouse-custom-cursor`) skaluje się ×60 na cały ekran (1.6 s, `power3`),
wyświetla licznik 0→100 (0.8 s), po czym kurczy się z powrotem do kursora,
odsłaniając stronę. Preloader i kursor to JEDEN element — rzadki, zapamiętywalny patent.

## 2. Wykryty stack

| Warstwa | Technologia | Pewność | Dowód |
|---|---|---|---|
| Builder | WordPress (custom theme `parhouse-agency` + LiteSpeed cache) | 100% | `wp-content/themes/parhouse-agency`, bundle litespeed |
| Styling | Tailwind CSS (custom tokeny `bg-ph-gray-500`, `text-footer`) | 100% | klasy w HTML, `--tw-` w CSS |
| Animacje | GSAP 3 + ScrollTrigger, ScrollSmoother, Flip | 100% | `capture/01-a6974…js` |
| Smooth scroll | Lenis + ScrollSmoother | wysoka | markery w bundlu |
| Karuzele | Swiper (szyny case studies) | 100% | `swiper-slide`, swiper-icons |
| Siatka | Masonry (case studies) | wysoka | marker masonry + `.case-study-image-masonry-container` |
| Font | Geomanist (@font-face, self-hosted, kilka wag) | 100% | `@font-face` w CSS motywu |

Brak WebGL/canvas — cała "premium" robota to GSAP + CSS (mix-blend-mode, clip-path,
backdrop-filter, scroll-snap, sticky).

## 3. Anatomia layoutu (6 sekcji + header + footer, nav ×3)

1. **Hero** — `100svh` (`.h-screen-hero`), h1 "Koncentrujemy kreatywność w spójności,
   osiągając niemożliwe.", wideo w tle (2 × `<video>` na stronie), przycisk scroll.
2. **Usługi** — trzy filary: Kampanie Ads / AI Fashion Visuals / e-Commerce,
   reveal przy scrollu (`start:"top 65%", end:"+=100", scrub:1`).
3. **Portfolio / case studies** — poziome szyny Swiper (klienci: LE POSSÉ, Natalia
   Kutyła, 1011 Clinic, SEMPRE, PAT ARROW, iOLA, Digitall Concept, HEWKO Cars)
   + **pinowana siatka masonry** ze scrubem (`.case-study-image-masonry-container`,
   `start:"top-=30% center", end:"bottom-=20% center", scrub:.5`).
4. **Growing headers** — "Odkrywamy potencjał" / "Nadajemy formę wizji":
   `.special-growing-header` dostaje `height: 100vh` z JS i rośnie/trzyma ekran
   przy scrollu (`start:"center center", end:"90% top", scrub`), po czym treść
   odjeżdża `yPercent: 25 → 50` z fade-out.
5. **Marquee** — pas logotypów/tekstu (`.marquee-wrapper`, `.marquee-box`).
6. **Footer/kontakt** — "Prześlij Brief", mix-blend na tle, linki Behance/Instagram.

Menu: pełne drzewo usług (Portfolio / Co robimy / O nas / Blog / Kontakt), overlay `bg-[#00000099]` + backdrop-filter.

## 4. Design tokens

- **Paleta:** bg `#090909` (near-black), powierzchnie `#3a3a3a` / `bg-ph-gray-500`,
  ink `#ffffff`, muted `#808080` / `#626262`. Overlay `#00000099`.
  (Hexy `#cf2e2e #ff6900 #fcb900 #abb8c3 #f78da7` = domyślna paleta Gutenberga — szum, ignoruj.)
- **Typografia:** Geomanist (self-hosted, kilka wag; zamiennik open: *Poppins* lub
  *Montserrat* — geometryczny grotesk). Skala presetów WP: 13/16/20/36/42 px,
  hero i growing-headers większe (Tailwind arbitrary, rząd 6–10vw).
- **CSS:** mix-blend-mode, clip-path, backdrop-filter, sticky, scroll-snap, grid, blur.

## 5. Efekty (mapowanie na nasz stack)

| technique_id | Co robi | Oryginał | U nas |
|---|---|---|---|
| smooth-scroll | inercyjny scroll | Lenis + ScrollSmoother | `web/lib/effects/SmoothScroll.tsx` |
| **parhouse-cursor-preloader** ★ | kursor = preloader (scale ×60 → licznik 0→100 → zwężenie) | GSAP timeline + counter | **brak — kandydat dla effect-smith** |
| parhouse-custom-cursor ⚠️ | własny kursor (18 zaczepów w JS) | GSAP `xPercent:-50` follow | `CustomCursor.tsx`; caution: laggy |
| parhouse-growing-header | nagłówek rośnie do 100vh i trzyma ekran przy scrollu | ScrollTrigger scrub | `PinnedSequence.tsx` (wariant) |
| parhouse-masonry-pin | pinowana siatka masonry ze scrubem `.5` | ScrollTrigger + Masonry | `HorizontalScrollPin.tsx` / grid CSS |
| parhouse-swiper-rails | poziome szyny case studies | Swiper free-mode | Embla Carousel (`effects-stack.yaml: carousel`) |
| marquee-logos | pas logotypów | CSS/GSAP | `Marquee.tsx` |
| scroll-reveal-stagger | wejścia sekcji | GSAP `start:"top 65%"` | `Reveal.tsx` |
| masked-image-reveal | odsłony clip-path | GSAP + clip-path | `MaskedReveal.tsx` |
| parhouse-mix-blend-hero | mix-blend na warstwach hero/footer | CSS | CSS w layoutcie |

Wartości scrubów oryginału: sekcje `scrub:1`, masonry `scrub:.5`, growing-header `scrub:true`.

## 6. INSTRUKCJA DLA AGENTA — zbuduj 1:1

### 6.1 Setup

```bash
# wariant A: w tym repo (zalecane)
cd web && npm i gsap @gsap/react lenis embla-carousel-react

# wariant B: od zera
npx create-next-app@latest parhouse-clone --ts --tailwind --app
cd parhouse-clone && npm i gsap @gsap/react lenis embla-carousel-react
```

Font: `next/font/local` z Geomanist (jeśli brak licencji → Google Fonts: Poppins).
Tailwind config: `colors: { ph: { bg: '#090909', surface: '#3a3a3a', muted: '#808080' } }`.

### 6.2 Struktura plików

```
app/page.tsx
components/CursorPreloader.tsx   # ★ signature: kursor+preloader w jednym
components/Hero.tsx              # 100svh, wideo bg, scroll btn
components/Services.tsx          # 3 filary z reveal
components/CaseRails.tsx         # Embla free-mode momentum
components/MasonryPin.tsx        # pinowana siatka ze scrubem
components/GrowingHeader.tsx     # nagłówek 100vh scrub
components/Footer.tsx            # brief CTA + mix-blend
lib/effects/*                    # SmoothScroll, Reveal, Marquee, MaskedReveal z web/lib/effects/
```

### 6.3 Kolejność implementacji

1. Fundament: dark theme + Geomanist + SmoothScroll (Lenis) + tokeny `ph-*`.
2. Statyczny markup: hero → usługi → rails → masonry → growing headers → marquee → footer.
3. Motion: Reveal (scrub 1), masonry pin (scrub .5), growing header (scrub true).
4. **Signature na końcu, osobno:** CursorPreloader — timeline:
   `set(cursor, {xPercent:-50, yPercent:-50})` → `to(cursor, {scaleX:60, scaleY:60, duration:1.6, ease:"power3"})`
   → `set('#counter', {display:'block'})` → licznik 0→100 (`duration:.8`)
   → reverse scale + fade licznika → kursor przechodzi w tryb follow.
5. Tuning: kursor desktop-only (`pointer: fine`), `prefers-reduced-motion` → skip preloadera.

### 6.4 Spec per sekcja (wartości z oryginału)

- **Hero:** `height:100svh`; h1 wchodzi po preloaderze; wideo `muted autoplay loop`.
- **Usługi:** trigger `top 65%`, `end:"+=100"`, `scrub:1` — subtelny scrub, nie snap.
- **Masonry:** kontener pinowany `top-=30% center → bottom-=20% center`, `scrub:.5`;
  kolumny przesuwają się z różną prędkością (odwrotne yPercent na kolumnach).
- **Growing header:** `gsap.set(el, {height: window.innerHeight})`; timeline
  `center center → 90% top`, scrub; wyjście treści `yPercent:25 → 50` + `opacity:0`.
- **Rails:** Embla `dragFree: true` + momentum; slajd ~60vw desktop / 85vw mobile.
- **Marquee:** duplikacja contentu ×2, translateX -50% loop, pauza na hover.

### 6.5 Kryteria akceptacji

- [ ] Load: kropka rośnie na pełny ekran, licznik 0→100, zwęża się do kursora — bez flasha treści.
- [ ] Kursor follow płynny 60 fps; na touch urządzeniach wyłączony (natywny kursor/preloader prosty fade).
- [ ] Masonry pinuje się i scrubuje; szyny mają momentum po puszczeniu.
- [ ] Growing headers zajmują pełny ekran i "oddychają" ze scrollem.
- [ ] Dark theme: jedyne kolory pochodzą ze zdjęć case studies.
- [ ] `prefers-reduced-motion`: bez smooth-scroll, bez preloadera, wszystko czytelne.
- [ ] Lighthouse perf ≥ 80 mobile (`profiles/performance-budget.yaml`).

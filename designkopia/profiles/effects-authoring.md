# Effects Authoring — protokół rozwoju biblioteki efektów

> „Twórzcie tak samo jakościowe efekty, a nawet lepsze, i dodawajcie do biblioteki."
> Czyta: **effect-smith**. Biblioteka: `web/lib/effects/*.tsx`. Rejestr technik: `profiles/effects-stack.yaml`.
> Kopalnia gotowego kodu: `efekty.txt` (snippety component.tsx). Most z bazy Webflow: `profiles/site-clone-registry.yaml`.

## Kiedy tworzyć nowy efekt
1. `art-director` wskazał signature moment, którego nie pokrywa żadna z istniejących technik.
2. `framer-effects-researcher` / `site-extractor` wykrył technikę z referencji bez `react_equiv`.
3. Chcemy **pobić** referencję — lepsza wersja istniejącego efektu (nowy wariant, nie nadpisanie).

## Quality bar (musi spełnić KAŻDY punkt — inaczej nie wchodzi do biblioteki)
- **Konwencja pliku:** `"use client"`, nagłówek-komentarz `// effects-stack.yaml → technique: <id>`,
  typowane `Props`, czytelne nazwy. Wzór: `web/lib/effects/Reveal.tsx`, `WebGLImageDistortion.tsx`.
- **Reduced motion:** `usePrefersReducedMotion()` z `@/lib/motion` → sensowny statyczny fallback.
- **Perf:** 60fps; RAF/`useInView`/IntersectionObserver zamiast ciągłych listenerów; cleanup w `useEffect`;
  brak CLS; lazy dla ciężkich (WebGL/3D). Mobile-safe (ukryj/uprość na touch gdy trzeba).
- **Zależności:** preferuj to co jest w `web/package.json` (framer-motion, gsap, lenis, ogl). Cięższe
  (three/@react-three/*, embla, split-type) = opcjonalne tiery — oznacz w komentarzu.
- **SSR-safe:** żadnego `window`/`document` w trakcie renderu — tylko w `useEffect`.
- **A11y:** `aria-label` gdy efekt zaciemnia treść (np. scramble), focus/keyboard nienaruszone.

## Kroki rejestracji (wszystkie 4 — inaczej dryf)
1. Dodaj `web/lib/effects/<Name>.tsx`.
2. Eksport w `web/lib/effects/index.ts` z komentarzem `// <technique-id>`.
3. Wpis techniki w `profiles/effects-stack.yaml` (`what`, `implement` ze ścieżką pliku, `reference`,
   `complexity`, `perf`, `notes` z datą + „Dodany przez effect-smith").
4. Jeśli to `react_equiv` dla techniki z `site-clone-registry.yaml` — uzupełnij tam pole.

## Weryfikacja (obowiązkowa przed delivery)
```bash
cd web && npx tsc --noEmit        # musi przejść (exit 0)
cd web && npm run dev             # podgląd; wepnij efekt w page-spec /g/<job> i sprawdź render + brak błędów konsoli
```

## Dedupe
Przed pisaniem sprawdź 18+ istniejących w `index.ts`. Nie duplikuj — rozszerzaj (nowy wariant/props)
albo twórz wyraźnie inny efekt. „Lepszy" = mierzalnie (płynniejszy, tańszy, bogatszy), nie kosmetyka.

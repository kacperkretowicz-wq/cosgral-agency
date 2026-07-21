# CLAUDE.md — kompleks agentów do budowy stron

> Wieloagentowy system generowania stron (layout + grafika + motion) w stylu
> referencyjnych witryn (voyeurverite, jackandai, letsplayfight, Readymag, Framer).
> Ten plik = **przejrzysta mapa architektury** + jak orkiestrować w Claude Code.
> Kanon przepływu (wykonywalny): `profiles/pipeline.yaml`. Mapa agentów: `profiles/AGENT-MAP.md`.

## Model orkiestracji w Claude Code

W Claude Code **główny wątek (Ty) jest orchestratorem**. Subagenci z `.claude/agents/`
to wyspecjalizowani wykonawcy faz — wołasz ich narzędziem `Task`/`Agent`. Subagent nie
woła kolejnego subagenta, więc to wątek główny prowadzi pętlę pipeline i deleguje fazę
po fazie.

Pętla pracy (egzekwowana przez sędziego `scripts/run-pipeline.py`):

```bash
python scripts/run-pipeline.py init <job> --prompt "<opis marki / brief>"
python scripts/run-pipeline.py next <job>     # która faza + którzy agenci teraz
#   → deleguj fazę do właściwego subagenta (Task), aż powstaną `produces`
python scripts/run-pipeline.py check <job>    # waliduje produces+gates → advance / FAIL+retry
python scripts/run-pipeline.py status <job>   # tablica faz
python scripts/run-pipeline.py audit-all      # pokrycie bramkami wszystkich jobów
```

**Zasada twarda:** faza nie domyka się, dopóki jej artefakty (`produces`) nie istnieją
i wszystkie `gates` nie przejdą. `max_iterations: 2` → po 2 nieudanych retry tej samej
fazy twardy STOP (interwencja człowieka). Nie obchodź bramek — napraw artefakt.

## Fazy i przypisani agenci (z pipeline.yaml)

```
intake → research* → strategy → structure → design_tokens* → layout_assembly → media → coherence → build → qa
         (równolegle)                       (równolegle)
```

| Faza | Subagenci (`.claude/agents/`) | Główny artefakt |
|------|-------------------------------|-----------------|
| intake | design-orchestrator | job-type-lock.json |
| research | web-researcher, inspiration-harvester, typography-researcher, visual-researcher, layout-screenshot-analyst, style-sense-agent, framer-effects-researcher, inspiration-curator | research-manifest.json, style-brief.json |
| strategy | concept-ideation (Gate 0), domain-strategist / agency-strategist | domain-brief.json |
| structure | structure-planner, copy-writer | structure-plan.json, copy-draft.json |
| design_tokens | motion-director, color-palette-guardian, palette-extractor, typography-selector | palette-lock.json, typography-lock.json, motion-plan.json |
| layout_assembly | template-mixer, layout-assembler | layout-plan.json |
| media | shot-planner, media-producer, image-generator, (video-producer) | outputs/images/<job>/*.png |
| coherence | coherence-reviewer | coherence-report.json |
| build | html-assembler, snippet-integrator, motion-implementer | build.json / index.html |
| qa | style-qa, concept-guardian, variability-guardian | variability-report.json, concept-guardian-report.md |
| optional | layout-composer (Figma) | frame w Figma |

Faza oznaczona `*` w pipeline = agenci pracują równolegle (możesz odpalić kilka `Task` naraz).

## Drugi tryb: lane KLONOWANIA / SPLICE (przerób istniejącą stronę)

Obok generacji-od-zera system potrafi **wyciągnąć realną stronę, rozłożyć jej technologie
na nazwany słownik i wsplice'ować moduły na nową markę** (jak Cursor zrobił z `cosgral-agency/`).
Kanon: `profiles/site-clone-registry.yaml`. Golden example: [cosgral-agency/](cosgral-agency).

Przepływ (uruchamiany bezpośrednio, poza `pipeline.yaml`):

```
site-extractor → reskin-stylist → splice-composer → layout-doctor (fix + tuning)
   clone-source   <brand>-brand    <brand>-splice    <brand>-layout-fix / -hero-fix / -tuning
```

Kolejność ładowania warstw: `base styles → brand → splice → layout-fix → effect reimpl → tuning (ostatni)`.
Słownik wyekstrahowanych technik (`voyeur-*` / `playfight-*` / `parhouse-*`) z mapowaniem na biblioteki
i komponenty `web/lib/effects/` jest w `site-clone-registry.yaml: techniques`.

**Wejście do lane'u z dowolnego URL: skill `/site-dna <url>`** — forensyka strony
(`scripts/site-dna.py`: stack, biblioteki, fonty, kolory, efekty — łącznie z bundlami
wstrzykiwanymi dynamicznie), potem pogłębiony opis + `REBUILD-BLUEPRINT.md` (wykonywalna
instrukcja 1:1 dla agenta AI) i zasilenie rosnącej biblioteki wyuczonych efektów
`references/site-dna/effects-library.yaml`. Output: `references/site-dna/<slug>/`.

## Craft & biblioteka (agenci-mózg jakości)

Trzej agenci cross-phase dbają o to, by strony były niepowtarzalne i rosły w zasoby:

- **art-director** → JEDEN signature moment „wow" per projekt (unikalny dla marki, najwyższy kunszt).
  Kanon/rubryka: `profiles/signature-craft.yaml`. Output: `signature-spec.json`.
- **effect-smith** → autoruje NOWE efekty do `web/lib/effects/` i rejestruje je (samorosnąca biblioteka).
  Protokół + quality bar: `profiles/effects-authoring.md`. Przykład świeżo dodany: `TextScramble.tsx`.
- **mockup-curator** → dobiera układ-mockup wg marki/stylu/przedmiotu/zamysłu i rośnie indeks.
  Indeks: `references/layout-screenshots/catalog.yaml` (86 mockupów). Output: `mockup-pick.json`.

Przepływ jakości w jobie: `mockup-curator` (układ) → `art-director` (moment wow) → `effect-smith`
(nowy efekt jeśli trzeba) → `motion-implementer` (realizacja) → `concept-guardian` (ocena wg rubryki).

## Strażnicy jakości zaawansowanej (faza QA / po buildzie)

- **performance-warden** → Core Web Vitals + wagi + perf-safe efekty. Budżet: `profiles/performance-budget.yaml`.
  Output: `perf-report.json`. FAIL gdy metryka > próg (LCP>4s, CLS>0.25, JS>450kb…).
- **awwwards-juror** → surowa ocena „Site of the Day / wow" przed delivery. Rubryka: `profiles/jury-rubric.yaml`.
  Output: `jury-verdict.json`. Celuj ≥ 7.5/10; instant-fail na AI-default / brak signature / janky.
- **3d-scene-director** → hero R3F/Spline (kierunek spatial_3d). Output: `scene-spec.json`; build zleca `effect-smith`.
  Deps three/@react-three/* są opcjonalne (`web/package.json`) — wymagają `npm i`.
- **accessibility-steward** → reduced-motion, kontrast, klawiatura, ARIA (WCAG AA). Output: `a11y-report.json`.

Pełna brama delivery (zalecana): `style-qa` + `concept-guardian` + `variability-guardian`
+ `performance-warden` + `accessibility-steward` + `awwwards-juror` (werdykt ≥ Site of the Day).

## Zasoby (biblioteka „wytrenowanych funkcji")

- **Arsenał efektów/technologii:** `profiles/effects-stack.yaml` — tiery (minimal / content /
  editorial_motion / experimental), technique_id → biblioteka w stacku docelowym
  (Next.js + Framer + Lenis + GSAP + R3F + OGL). Referencje: voyeurverite, jackandai, letsplayfight.
- **Komponenty React efektów:** `web/lib/effects/*.tsx` (18 gotowych — Reveal, SplitText,
  MagneticButton, HorizontalScrollPin, ShaderGradientBg, WebGLImageDistortion, SmoothScroll…).
  `motion-implementer` mapuje technique_id z planu na te komponenty.
- **Rejestr klonowania (mózg trybu splice):** `profiles/site-clone-registry.yaml` — nazwany słownik
  technik wyekstrahowanych z voyeurverite/letsplayfight/parhouse + worked example `cosgral-agency/`.
- **Snippety vanilla:** `references/interactions/snippets/` (+ `manifest.yaml`) — `snippet-integrator`
  składa je przez `scripts/compose-interactions.py`.
- **Szablony layoutu:** `profiles/templates/*.yaml` (17). Mix ≥3 robi `template-mixer`.
- **Archetypy layoutu:** `profiles/layout-archetypes.yaml` (8). Jeden per job.
- **Mockupy (inspiracja szkieletu, NIE klon skóry):** `references/layout-screenshots/inbox/` →
  `layout-screenshot-analyst` → `analysis/*.yaml`. Reguły: `profiles/mockup-inspiration-rules.yaml`.
- **Style DNA / subject lanes:** `references/style-dna/`, `references/subject-lanes/`,
  `references/agency-content/`.
- **Cel build (runtime):** `web/` (Next.js App Router). `html-assembler` woła
  `scripts/build-page.py <job>` → `web/generated/<job>.json` (page-spec) →
  podgląd `cd web && npm run dev` → `http://localhost:3000/g/<job>`.

## Reguły jakości (skrót — pełne w generation-process.yaml)

- **Product lock:** najpierw JEDEN anchor packshot (`00-anchor-packshot.png`), STOP do akceptacji,
  każdy kolejny shot dziedziczy `product_visual_spec` + referencję anchora.
- **Mockup = szkielet, nie skóra:** plan musi mieć `layout_ref`, `skeleton_elements`,
  `adaptation_notes`, `vision_note`. `concept-guardian` FAIL na klonie skóry mockupu.
- **Anty-AI:** żadnego domyślnego recipe (hero→manifesto→grid→founder→cta), bez wszechobecnego
  uppercase-label/letter-spacing, bez auto Cormorant+Inter bez uzasadnienia. Preferuj numerowane
  sekcje (01)(02), asymetrię, mega-type / tight mono.
- **Wariancja:** rotuj archetyp, template_mix, interaction_set, paletę, typografię vs poprzednie
  joby — pilnują `check-variability.py` i `variability-guardian`.

## Anti-drift (transparentność)

Spójność plików agentów ↔ AGENT-MAP ↔ pipeline pilnuje:

```bash
python scripts/check-agents.py        # pliki .claude/agents/ == mapa == agenci pipeline
python scripts/validate-profiles.py   # spójność profili
```

Dodając/zmieniając agenta: zaktualizuj `.claude/agents/<name>.md`, `profiles/AGENT-MAP.md`
i (jeśli zmienia przepływ) `profiles/pipeline.yaml`, potem uruchom `check-agents.py`.

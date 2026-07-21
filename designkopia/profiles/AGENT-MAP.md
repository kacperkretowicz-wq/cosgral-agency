# AGENT-MAP — jedyna mapa-prawda agentów

> Kanon przepływu: **`profiles/pipeline.yaml`** (wykonywalny, egzekwowany przez `scripts/run-pipeline.py`).
> Ta mapa = co istnieje w `.claude/agents/` (natywne subagenty Claude Code; legacy `.cursor/agents/`
> też akceptowane) i jaki ma status. Walidacja drży: `python scripts/check-agents.py`.
> Aktualizacja: 2026-06-26. Materializacja agentów do `.claude/agents/`: 43 pliki
> (30 pipeline-active + 3 craft/biblioteka + 4 strażnicy jakości + 2 optional + 4 lane klonowania).
> Aliasy (DEPRECATED) NIE są materializowane jako pliki.

## Fazy (z pipeline.yaml)

```
intake → research* → strategy → structure → design_tokens* → layout_assembly → media → coherence → build → qa
         (równolegle)            (równolegle)
```

## Status legendy
- **active** — używany w kanonie
- **alias** — DEPRECATED, plik-stub przekierowujący do kanonu (zostawiony dla starych odwołań)
- **optional** — używany warunkowo (Figma / wideo)

## Agenci wg fazy (active)

| Faza | Agent | Output / rola |
|------|-------|---------------|
| intake | design-orchestrator | kolejka, job_type, gates (prowadzi przez run-pipeline.py) |
| research | web-researcher | research-web.json (audyt URL — wchłonął reference-auditor) |
| research | inspiration-harvester | crawl domeny → inspiration-registry |
| research | typography-researcher | research-typography.json |
| research | visual-researcher | research-visual.json (subject+style per lane) |
| research | layout-screenshot-analyst | analysis/*.yaml — skeleton_signature z mockupów |
| research | style-sense-agent | style-brief.json (mood/density/contrast) |
| research | framer-effects-researcher | framer-effects-research.json (mapuje na effects-stack.yaml) |
| research | inspiration-curator | research-manifest.json |
| strategy | concept-ideation | Gate 0 — 3 koncepcje (portfolio/agency/produkt) |
| strategy | domain-strategist | domain-brief.json (product/auto/fashion/shop/SaaS) |
| strategy | agency-strategist | agency-brief.json (wariant agencyjny) |
| structure | structure-planner | structure-plan.json (szkielet + vision_note) |
| structure | copy-writer | copy-draft.json |
| design_tokens | motion-director | motion-plan.json (tier + technique_id z effects-stack.yaml) |
| design_tokens | color-palette-guardian | palette-decision.json (rotacja rodzin) |
| design_tokens | palette-extractor | palette-lock.json (hex z obrazów) |
| design_tokens | typography-selector | typography-lock.json |
| layout_assembly | template-mixer | template-mix.json (≥3 templatki) |
| layout_assembly | layout-assembler | layout-plan.json (merge → plan) |
| media | shot-planner | shot-plan.json (lista ujęć przed GenerateImage) |
| media | media-producer | orchestracja generacji + bramki obrazów |
| media | image-generator | pojedyncze kadry PNG |
| coherence | coherence-reviewer | coherence-report.json (spójność w jobie) |
| build | html-assembler | struktura strony / komponenty |
| build | snippet-integrator | biblioteka efektów (compose-interactions / komponenty) |
| build | motion-implementer | custom motion wg effects-stack.yaml (Framer/GSAP/R3F/OGL) |
| qa | style-qa | qa.md — proces (footer, manifest, bramki) |
| qa | concept-guardian | concept-guardian-report.md — wizja, Gate A/B/C, scoring tier_s |
| qa | variability-guardian | variability-report.json — różnica między jobami |

## Optional

| Agent | Kiedy |
|-------|-------|
| layout-composer | Faza 2 — eksport do Figma (gdy figma.config.yaml ma fileKey) |
| video-producer | hero loop / poster (opcjonalnie, faza media) |

## Lane klonowania / splice (opcjonalny — poza pipeline.yaml)

Tryb „przerób istniejącą stronę" zamiast generacji od zera. Kanon: `profiles/site-clone-registry.yaml`.
Golden example: `cosgral-agency/`. Przepływ: extract → reskin → splice → fix → tune.

| Agent | Rola / output |
|-------|---------------|
| site-extractor | clone-source.json — przechwyć stronę, wykryj stack, rozłóż na techniki |
| reskin-stylist | `<brand>-brand.css` — wordmark/paleta/footer (re-brand) |
| splice-composer | `<brand>-splice.css/js` — doklej moduły z innych stron + init bibliotek |
| layout-doctor | `<brand>-layout-fix.css` + `-hero-fix.js` + `-tuning.js` — fix + tuning (ostatni) |

## Craft & biblioteka (active, poza pętlą pipeline.yaml — wołane na żądanie/przez orchestratora)

| Agent | Rola / output | Kanon |
|-------|---------------|-------|
| art-director | signature-spec.json — JEDEN niepowtarzalny moment „wow" per projekt | `profiles/signature-craft.yaml` |
| effect-smith | nowy efekt w `web/lib/effects/` + rejestracja (samorosnąca biblioteka) | `profiles/effects-authoring.md` |
| mockup-curator | mockup-pick.json + rośnie `catalog.yaml`; dobór układu wg marki/stylu/przedmiotu | `references/layout-screenshots/catalog.yaml` |

## Strażnicy jakości zaawansowanej (active, faza QA / po buildzie)

| Agent | Rola / output | Kanon |
|-------|---------------|-------|
| performance-warden | perf-report.json — Core Web Vitals, wagi, perf-safe efekty | `profiles/performance-budget.yaml` |
| awwwards-juror | jury-verdict.json — surowa ocena „SOTD / wow" przed delivery | `profiles/jury-rubric.yaml` |
| 3d-scene-director | scene-spec.json — hero R3F/Spline (spatial_3d); build zleca effect-smith | `profiles/effects-stack.yaml` |
| accessibility-steward | a11y-report.json — reduced-motion, kontrast, klawiatura, ARIA (WCAG AA) | (checklista w agencie) |

## Alias (DEPRECATED — stuby przekierowujące)

| Stary plik | → Kanon |
|-----------|---------|
| layout-planner | template-mixer + layout-assembler |
| page-exporter | html-assembler |
| interaction-composer | snippet-integrator + motion-implementer |
| reference-auditor | web-researcher |
| vision-scorer | concept-guardian |
| process-validator | style-qa |
| style-analyst | visual-researcher + style-sense-agent |
| template-analyst | layout-screenshot-analyst + template-mixer |

## Liczby
- 43 pliki w `.claude/agents/` = 30 pipeline-active + 3 craft/biblioteka + 4 strażnicy jakości + 2 optional + 4 lane klonowania. (8 aliasów = DEPRECATED, niematerializowane.)
- Źródło prawdy przepływu: `profiles/pipeline.yaml`. Szczegóły reguł/bramek: `profiles/generation-process.yaml`.
- Pliki opisowe `agent-pipeline.yaml` (v2) i `agent-pipeline-v3.yaml` = referencja historyczna; przy konflikcie wygrywa `pipeline.yaml`.
- Orkiestracja w Claude Code: wątek główny prowadzi `run-pipeline.py` i deleguje fazy do subagentów (patrz `CLAUDE.md`).

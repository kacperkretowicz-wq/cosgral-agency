# Co zrobić po swojej stronie — checklist

System v3 + harvester są w repo. Ty dostarczasz **materiał i decyzje** — agenci robią resztę.

## 1. Referencje obrazów (najważniejsze)

### Styl (JAK) — już posegregowane
Folder: `references/style-dna/`

### Mockupy layoutów (UI + paleta + typografia w jednym PNG)

Wrzucaj pełne screeny / mocki do:
```
references/layout-screenshots/inbox/
```

Potem (lub poproś agenta):
```bash
python scripts/ingest-layout-screenshot.py --process-inbox
```

Agent **layout-screenshot-analyst** uzupełni analizę sekcji; **color-palette-guardian** wybierze rodzinę kolorów (pomarańcz, żółć, zielenie, róż…).

### Temat (CO) — zdjęcia produktowe / branżowe

| Typ strony | Gdzie wrzucać zdjęcia |
|------------|----------------------|
| Agencja marketingowa | `references/agency-content/campaigns/`, `branding-systems/`, `team-studio/` |
| Samochód / auto | `references/subject-lanes/automotive/` |
| Fashion / retail | `references/subject-lanes/fashion/` |
| Sklep | `references/subject-lanes/retail/` |
| Produkt FMCG / food | `references/subject-lanes/food-beverage/` |
| SaaS | `references/subject-lanes/saas/` |
| Fotograf | `references/subject-lanes/photography/` |

**Zasada:** zdjęcie inspiruje **temat lub styl** — nie wrzucaj wszystkiego do jednego folderu.

Opcjonalnie dopisz wpis w odpowiednim `manifest.yaml` (wzoruj się na `agency-content/manifest.yaml`).

---

## 2. Strony inspiracji (URL) — harvester

Podaj domenę lub sekcję z templateami. Możesz sam uruchomić:

```bash
# Przykład: cała domena lub sekcja templates
python scripts/crawl-inspiration-site.py https://willvint.com/ --max-pages 30 --job forma-agency

# Framer / showcase — seed często = /templates lub /gallery
python scripts/crawl-inspiration-site.py https://www.framer.com/templates/ --max-pages 25 --incremental

# Później dokładaj bez kasowania
python scripts/crawl-inspiration-site.py https://example.com/work --incremental
```

Wynik: `references/inspiration-registry/<domena>/registry.yaml`

**Ty:** przejrzyj `registry.yaml` — popraw kategorie jeśli coś źle (np. `portfolio_example` vs `template_showcase`).

---

## 3. Przy starcie nowego joba — podaj

1. **Typ** — np. „agencja”, „samochód elektryczny”, „sklep fashion”  
   (albo: `python scripts/classify-job.py "twój prompt" --product slug`)
2. **1–3 URL** stron referencyjnych (layout + typografia + motion)
3. **Język copy** — PL / EN
4. **Opcja Gate 0** — czy chcesz 3 koncepcje kolorów przed budową (tak/nie)
5. **Stack** — vanilla HTML (domyślnie) lub React (wtedy Framer Motion OK)

---

## 4. Czego NIE musisz robić

- Nie ręcznie pisz `layout-plan.json` — robi `layout-assembler`
- Nie kopiuj PNG z `references/` do `outputs/` — generujemy nowe
- Nie committuj `outputs/images/_orphan/` — to śmietnik po sprzątaniu

---

## 5. Chrome / pełny audyt (opcjonalnie, lepsze fonty + scroll)

Jeśli chcesz głębszy audyt niż HTTP fallback:

```powershell
cd references/web-audits/_audit-tmp
npx puppeteer browsers install chrome
cd ../../..
python scripts/audit-site.py https://twoja-strona.pl/ --job nazwa-job
```

---

## 6. Kolejność gdy prosisz o generację

Napisz np.:

> `/design-generate` agencja **forma**, EN, experimental, URL: willvint.com + crawl framer templates pod index motion

Orchestrator powinien:

1. `classify-job` → `inspiration-harvester` (crawl)
2. `web-researcher` + `typography-researcher` + `visual-researcher`
3. `style-sense-agent` + `framer-effects-researcher`
4. `inspiration-curator` → dalej pipeline v3

---

## 7. Szybki test systemu

```bash
python scripts/classify-job.py "marketing agency portfolio" --json
python scripts/crawl-inspiration-site.py https://willvint.com/ --max-pages 15 --job forma-agency
python scripts/extract-palette.py outputs/pages/forma-agency/palette-lock.json \
  --job forma-agency \
  --from references/style-dna/palette/warm-orange-terracotta-still.png
```

---

Pytania / poprawki segregacji → napisz który plik lub URL jest źle przypisany.

# Wrzucaj tutaj pełne mockupy / screeny stron (PNG, JPG, WebP)

## Jak

1. Zapisz plik tutaj (np. `nazwa-marki-mockup.png`)
2. Uruchom:
   ```bash
   python scripts/ingest-layout-screenshot.py --process-inbox
   ```
3. Agent **layout-screenshot-analyst** uzupełni `analysis/<id>.yaml`

## Co system wyciąga automatycznie

- dominujące **kolory** → `palette_family` (pomarańcz, żółć, zielenie, róż…)
- tagi z nazwy pliku + heurystyki
- routing: layout UI vs paleta vs subject

## Przykład

`rare-beauty-dtc-mockup.png` → `dusty_rose_mauve`, sekcje hero/grid/typography

Nie musisz segregować ręcznie — agent rozpoznaje i segreguje po ingest.

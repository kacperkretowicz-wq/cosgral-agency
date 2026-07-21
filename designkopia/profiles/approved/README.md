# Approved style examples

Zdjęcia zaakceptowane przez użytkownika — agent używa ich jako dodatkowych referencji przy generacji.

Format pliku `approved.yaml`:

```yaml
- id: "01"
  source_job: style-test-01
  file: profiles/approved/01-bold-red-packshot.png
  palette_family: bold_monochrome
  shot_type: packshot
  approved_at: "2026-06-22"
  notes: "Użytkownik: idealny red-on-red editorial"
```

Po akceptacji agent kopiuje obrazy tutaj i aktualizuje ten plik + `style-profile.yaml` (sekcja `approved_examples`).

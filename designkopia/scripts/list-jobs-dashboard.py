#!/usr/bin/env python3
"""Dashboard: all page jobs — archetype, fonts, templates, plan status.

Usage: python scripts/list-jobs-dashboard.py
"""

from __future__ import annotations

import json
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"
LEGACY = ROOT / "profiles" / "legacy-jobs.yaml"


def legacy_slugs() -> set[str]:
    if not yaml or not LEGACY.is_file():
        return set()
    data = yaml.safe_load(LEGACY.read_text(encoding="utf-8")) or {}
    slugs: set[str] = set()
    for item in (data.get("legacy") or []) + (data.get("planned") or []):
        if isinstance(item, dict) and item.get("slug"):
            slugs.add(str(item["slug"]))
    return slugs


def main() -> None:
    legacy = legacy_slugs()
    rows: list[dict] = []

    for job_dir in sorted(PAGES.iterdir()):
        if not job_dir.is_dir():
            continue
        slug = job_dir.name
        plan_path = job_dir / "layout-plan.json"
        has_plan = plan_path.is_file()
        row = {
            "slug": slug,
            "plan": "yes" if has_plan else "NO",
            "legacy": slug in legacy,
            "archetype": "-",
            "scroll": "-",
            "templates": "-",
            "typography": "-",
            "snippets": "-",
            "sections": "-",
        }
        if has_plan:
            plan = json.loads(plan_path.read_text(encoding="utf-8"))
            row["archetype"] = plan.get("layout_archetype") or plan.get("layout_mode") or "-"
            row["scroll"] = plan.get("scroll_mode") or "-"
            mix = plan.get("template_mix") or []
            row["templates"] = ", ".join(mix) if mix else "-"
            t = plan.get("typography_map") or {}
            row["typography"] = t.get("pairing_id") or f"{t.get('heading_font','?')}+{t.get('body_font','?')}"
            sn = plan.get("snippet_ids") or []
            row["snippets"] = ", ".join(sn) if sn else "-"
            sp = plan.get("section_plan") or []
            row["sections"] = str(len(sp))
        rows.append(row)

    print(f"{'SLUG':<22} {'PLAN':<4} {'LEG':<4} {'ARCHETYPE':<20} {'SCROLL':<18} {'SEC':<4} TYPOGRAPHY")
    print("-" * 110)
    for r in rows:
        leg = "L" if r["legacy"] else ""
        print(
            f"{r['slug']:<22} {r['plan']:<4} {leg:<4} {r['archetype']:<20} {r['scroll']:<18} {r['sections']:<4} {r['typography']}"
        )
        if r["templates"] != "-":
            print(f"  templates: {r['templates']}")
            print(f"  snippets:  {r['snippets']}")


if __name__ == "__main__":
    main()

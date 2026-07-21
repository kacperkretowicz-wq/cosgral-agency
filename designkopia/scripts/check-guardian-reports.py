#!/usr/bin/env python3
"""Hard gate: require guardian artifacts before delivery.

Usage:
  python scripts/check-guardian-reports.py <job-slug>
  python scripts/check-guardian-reports.py outputs/pages/<job-slug>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"


def resolve_page_dir(arg: str) -> Path | None:
    p = Path(arg)
    if p.is_dir():
        return p.resolve()
    candidate = PAGES / arg.strip().strip("/")
    if candidate.is_dir():
        return candidate
    print(f"ERROR: page directory not found for '{arg}'")
    return None


def read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-guardian-reports.py <job-slug|outputs/pages/<job>>")
        return 1

    page_dir = resolve_page_dir(sys.argv[1])
    if not page_dir:
        return 1

    required = [
        page_dir / "coherence-report.json",
        page_dir / "concept-guardian-report.md",
        page_dir / "variability-report.json",
    ]

    missing = [p.name for p in required if not p.is_file()]
    if missing:
        print(f"GUARDIAN REPORTS FAILED: {page_dir.name}")
        for item in missing:
            print(f"  - missing {item}")
        return 1

    coherence = read_json(page_dir / "coherence-report.json") or {}
    variability = read_json(page_dir / "variability-report.json") or {}

    errors: list[str] = []
    if coherence.get("pass") is False:
        errors.append("coherence-report.json pass=false")
    if variability.get("pass") is False:
        errors.append("variability-report.json pass=false")

    concept_text = (page_dir / "concept-guardian-report.md").read_text(encoding="utf-8").lower()
    if "**status:** fail" in concept_text or "status: fail" in concept_text:
        errors.append("concept-guardian-report.md status FAIL")

    if errors:
        print(f"GUARDIAN REPORTS FAILED: {page_dir.name}")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(f"GUARDIAN REPORTS OK: {page_dir.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

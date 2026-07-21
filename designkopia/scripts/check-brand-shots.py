#!/usr/bin/env python3
"""Validate brand atmosphere shots in manifest for product jobs.

Usage:
  python scripts/check-brand-shots.py <job-slug>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "outputs" / "images"
PAGES = ROOT / "outputs" / "pages"
ROLES_YAML = ROOT / "profiles" / "job-types" / "brand-atmosphere-shots.yaml"


def load_manifest(slug: str) -> dict | None:
    path = IMAGES / slug / "manifest.json"
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def extract_shots(data: dict) -> list[dict]:
    shots = data.get("images") or data.get("shots") or []
    return [s for s in shots if isinstance(s, dict)]


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-brand-shots.py <job-slug>")
        return 1

    slug = sys.argv[1].strip()
    manifest = load_manifest(slug)
    if not manifest:
        print(f"ERROR: manifest not found: outputs/images/{slug}/manifest.json")
        return 1

    min_atmo = 2
    if yaml and ROLES_YAML.is_file():
        cfg = yaml.safe_load(ROLES_YAML.read_text(encoding="utf-8")) or {}
        min_atmo = int((cfg.get("required_per_product_job") or {}).get("min_atmosphere_shots", 2))

    shots = extract_shots(manifest)
    atmo = [
        s
        for s in shots
        if s.get("shot_type") == "atmosphere"
        or s.get("role") in {
            "section_background",
            "brand_tile",
            "lifestyle_scene",
            "texture_mood",
            "editorial_context",
        }
    ]
    product_lock_shots = [s for s in shots if s.get("role") in {"anchor", "packshot"} or "anchor" in str(s.get("file", ""))]

    errors: list[str] = []
    if len(product_lock_shots) < 1:
        errors.append("missing anchor/packshot (product lock)")
    if len(atmo) < min_atmo:
        errors.append(f"need >= {min_atmo} atmosphere shots, got {len(atmo)}")

    atmo_roles = {str(s.get("role")) for s in atmo}
    if len(atmo_roles) < 2 and len(atmo) >= min_atmo:
        errors.append("atmosphere shots should use >= 2 distinct roles")

    for s in atmo:
        if not s.get("photo_grade_ref") and not s.get("style_ref"):
            errors.append(f"atmosphere shot {s.get('file')} missing photo_grade_ref/style_ref")
        if s.get("derived_from_anchor") is True and s.get("product_presence") == "none":
            errors.append(f"atmosphere shot {s.get('file')} should not be derived_from_anchor when no product")

    plan_path = PAGES / slug / "brand-atmosphere-plan.json"
    if not plan_path.is_file() and len(atmo) < min_atmo:
        errors.append("missing brand-atmosphere-plan.json — run plan-brand-shots.py")

    if errors:
        print(f"BRAND SHOTS CHECK FAILED: {slug}")
        for e in errors:
            print(f"  - {e}")
        return 1

    print(f"BRAND SHOTS CHECK OK: {slug} ({len(atmo)} atmosphere, {len(product_lock_shots)} product lock)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

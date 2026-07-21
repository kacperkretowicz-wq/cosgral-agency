#!/usr/bin/env python3
"""Check image variability against recent jobs.

Usage:
  python scripts/check-image-variability.py <job-slug>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "outputs" / "images"


def load_manifest(slug: str) -> dict | None:
    path = IMAGES / slug / "manifest.json"
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def extract_shots(data: dict) -> list[dict]:
    shots = data.get("images")
    if isinstance(shots, list):
        return [s for s in shots if isinstance(s, dict)]
    shots = data.get("shots")
    if isinstance(shots, list):
        return [s for s in shots if isinstance(s, dict)]
    return []


def recent_manifests(exclude_slug: str, limit: int = 3) -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    for path in sorted(IMAGES.glob("*/manifest.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        slug = path.parent.name
        if slug == exclude_slug:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        out.append((slug, data))
        if len(out) >= limit:
            break
    return out


def ratio_overlap(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / max(1, min(len(a), len(b)))


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-image-variability.py <job-slug>")
        return 1

    slug = sys.argv[1].strip()
    current = load_manifest(slug)
    if not current:
        print(f"ERROR: manifest not found or invalid: outputs/images/{slug}/manifest.json")
        return 1

    cur_shots = extract_shots(current)
    cur_style_refs = {str(s.get("style_ref", "")).replace("\\", "/") for s in cur_shots if s.get("style_ref")}
    cur_photo_refs = {str(s.get("photo_grade_ref", "")).replace("\\", "/") for s in cur_shots if s.get("photo_grade_ref")}
    cur_palette = current.get("job_palette") or current.get("palette_family")
    cur_palettes = {
        str(s.get("palette_family")) for s in cur_shots if s.get("palette_family")
    }
    if cur_palette:
        cur_palettes.add(str(cur_palette))

    errors: list[str] = []
    warns: list[str] = []

    recent = recent_manifests(slug, limit=3)
    if recent:
        prev_slug, prev_data = recent[0]
        prev_shots = extract_shots(prev_data)
        prev_style_refs = {
            str(s.get("style_ref", "")).replace("\\", "/") for s in prev_shots if s.get("style_ref")
        }
        ov = ratio_overlap(cur_style_refs, prev_style_refs)
        if ov >= 0.5 and cur_style_refs:
            errors.append(f"style_ref overlap {ov:.0%} with previous job '{prev_slug}'")

        prev_photo_refs = {
            str(s.get("photo_grade_ref", "")).replace("\\", "/") for s in prev_shots if s.get("photo_grade_ref")
        }
        if cur_photo_refs and prev_photo_refs and ratio_overlap(cur_photo_refs, prev_photo_refs) >= 0.5:
            errors.append(f"photo_grade_ref overlap >=50% with previous job '{prev_slug}'")

    recent_palettes: list[str] = []
    for _, data in recent:
        p = data.get("job_palette") or data.get("palette_family")
        if p:
            recent_palettes.append(str(p))
    if cur_palette and len(recent_palettes) >= 2 and cur_palette == recent_palettes[0] == recent_palettes[1]:
        errors.append(f"palette_family '{cur_palette}' repeated in 3 consecutive jobs")
    elif cur_palette and recent_palettes and cur_palette == recent_palettes[0]:
        warns.append(f"palette_family '{cur_palette}' same as previous job")

    if errors:
        print(f"IMAGE VARIABILITY FAILED: {slug}")
        for e in errors:
            print(f"  - {e}")
        for w in warns:
            print(f"  WARN: {w}")
        return 1

    print(f"IMAGE VARIABILITY OK: {slug}")
    for w in warns:
        print(f"  WARN: {w}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


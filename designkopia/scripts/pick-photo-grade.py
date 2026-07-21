#!/usr/bin/env python3
"""Pick photo grade reference from layout mockups with lookback rotation.

Usage:
  python scripts/pick-photo-grade.py --job <slug> --json
  python scripts/pick-photo-grade.py --job <slug> --prefer northbureau --json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "references" / "layout-screenshots" / "inbox"
IMAGES = ROOT / "outputs" / "images"
PAGES = ROOT / "outputs" / "pages"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
LOOKBACK = 5


def recent_style_refs(lookback: int = LOOKBACK) -> list[str]:
    refs: list[str] = []
    manifests = sorted(IMAGES.glob("*/manifest.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in manifests:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        shots = data.get("images") or data.get("shots") or []
        if isinstance(shots, list):
            for shot in shots:
                if isinstance(shot, dict):
                    ref = shot.get("style_ref") or shot.get("photo_grade_ref")
                    if ref:
                        refs.append(str(ref).replace("\\", "/"))
        if len(refs) >= lookback:
            return refs[:lookback]
    return refs[:lookback]


def recent_palettes(lookback: int = 3) -> list[str]:
    pals: list[str] = []
    locks = sorted(PAGES.glob("*/palette-lock.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in locks[:lookback]:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        fam = data.get("palette_family")
        if fam:
            pals.append(str(fam))
    return pals


def candidates() -> list[Path]:
    out: list[Path] = []
    if not INBOX.is_dir():
        return out
    for p in sorted(INBOX.iterdir()):
        if p.suffix.lower() in IMAGE_EXT:
            out.append(p)
    return out


def score(path: Path, used_refs: list[str], prefer: str | None, recent_pals: list[str]) -> float:
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    low = path.name.lower()
    s = 0.0
    if rel not in used_refs:
        s += 8.0
    else:
        s -= 8.0
    if prefer and prefer.lower() in low:
        s += 4.0

    # De-prioritize recurring red/BW if recent palettes already sit there.
    if any(k in low for k in ("northbureau", "designsake")):
        # keep eligible, but not always first.
        s += 0.5
    if any(k in low for k in ("readymag",)):
        s += 0.25

    if recent_pals and recent_pals[0] in {"bold_monochrome", "bw_editorial"}:
        if any(k in low for k in ("northbureau", "designsake")):
            s -= 1.0
    return s


def pick(job: str, prefer: str | None) -> dict:
    used_refs = recent_style_refs()
    recent_pals = recent_palettes()
    cands = candidates()
    if not cands:
        return {"error": "no mockup images in inbox"}
    ranked = sorted(cands, key=lambda p: score(p, used_refs, prefer, recent_pals), reverse=True)
    best = ranked[0]
    best_ref = str(best.relative_to(ROOT)).replace("\\", "/")
    alternatives = [str(p.relative_to(ROOT)).replace("\\", "/") for p in ranked[1:4]]
    return {
        "job_slug": job,
        "photo_grade_ref": best_ref,
        "style_ref": best_ref,
        "source": "layout-screenshot-mockup",
        "recent_style_refs": used_refs,
        "recent_palette_families": recent_pals,
        "alternatives": alternatives,
        "rules": "profiles/mockup-photo-inspiration-rules.yaml",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", required=True)
    parser.add_argument("--prefer", default="")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = pick(args.job, args.prefer or None)
    out = PAGES / args.job / "photo-grade-ref.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"photo_grade_ref: {result.get('photo_grade_ref')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


#!/usr/bin/env python3
"""Classify palette_family from hex list or image; check rotation vs recent jobs.

Usage:
  python scripts/classify-palette-family.py --from-hex "#E8B4B8,#C9A0A8,#8B5A6B"
  python scripts/classify-palette-family.py --from-image references/layout-screenshots/inbox/mock.png
  python scripts/classify-palette-family.py --job forma-agency --check-rotation
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
FAMILIES = ROOT / "profiles" / "palette-families.yaml"
PAGES = ROOT / "outputs" / "pages"


def load_families() -> dict:
    return yaml.safe_load(FAMILIES.read_text(encoding="utf-8")) or {}


def hex_to_hsv(hex_c: str) -> tuple[float, float, float]:
    h = hex_c.lstrip("#")
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        hue = 0.0
    elif mx == r:
        hue = (60 * ((g - b) / d) + 360) % 360
    elif mx == g:
        hue = (60 * ((b - r) / d) + 120) % 360
    else:
        hue = (60 * ((r - g) / d) + 240) % 360
    sat = 0 if mx == 0 else d / mx
    val = mx
    return hue, sat, val


def score_family(hue: float, sat: float, val: float, fam: dict) -> float:
    hr = fam.get("hue_ranges") or {}
    if not hr:
        return 0.0
    h_min = float(hr.get("h_min", 0))
    h_max = float(hr.get("h_max", 360))
    score = 0.0
    if h_min <= h_max:
        if h_min <= hue <= h_max:
            score += 2.0
    else:  # wrap e.g. 330-20
        if hue >= h_min or hue <= h_max:
            score += 2.0
    if hr.get("s_low") and sat < 0.35:
        score += 1.0
    if hr.get("s_high") and sat > 0.45:
        score += 1.0
    if hr.get("s_moderate") and 0.2 <= sat <= 0.55:
        score += 0.5
    if hr.get("l_high") and val > 0.65:
        score += 0.5
    return score


def classify_hexes(hexes: list[str]) -> list[tuple[str, float]]:
    data = load_families()
    families = data.get("families") or {}
    totals: dict[str, float] = {k: 0.0 for k in families}
    for hx in hexes:
        hue, sat, val = hex_to_hsv(hx)
        for fid, fam in families.items():
            totals[fid] += score_family(hue, sat, val, fam)
    ranked = sorted(totals.items(), key=lambda x: -x[1])
    return [(k, v) for k, v in ranked if v > 0][:5]


def recent_job_families(lookback: int = 3) -> list[str]:
    out: list[str] = []
    plans = sorted(PAGES.glob("*/palette-lock.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for p in plans[:lookback]:
        try:
            lock = json.loads(p.read_text(encoding="utf-8"))
            fam = lock.get("palette_family")
            if fam:
                out.append(str(fam))
        except Exception:
            pass
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-hex", default="", help="comma-separated hex")
    parser.add_argument("--from-image", default="")
    parser.add_argument("--job", default="")
    parser.add_argument("--check-rotation", action="store_true")
    args = parser.parse_args()

    hexes: list[str] = []
    if args.from_hex:
        hexes = [h.strip() for h in args.from_hex.split(",") if h.strip().startswith("#")]
    elif args.from_image:
        img = Path(args.from_image)
        if not img.is_absolute():
            img = ROOT / img
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "extract_palette", ROOT / "scripts" / "extract-palette.py"
        )
        mod = importlib.util.module_from_spec(spec)
        assert spec.loader
        spec.loader.exec_module(mod)
        dom = mod.extract_dominant(img)
        hexes = [d["hex"] for d in dom]

    if not hexes:
        print("Provide --from-hex or --from-image")
        return 1

    ranked = classify_hexes(hexes)
    best = ranked[0][0] if ranked else "warm_organic"
    result = {
        "input_hex": hexes,
        "palette_family": best,
        "ranked": [{"family": k, "score": round(v, 2)} for k, v in ranked],
    }

    if args.check_rotation or args.job:
        recent = recent_job_families()
        result["recent_families"] = recent
        if recent and best == recent[0]:
            result["rotation_warning"] = f"same family as last job: {best}"
            result["suggest_alternatives"] = [
                f for f, _ in ranked[1:4]
            ]

    if args.job:
        out = PAGES / args.job / "palette-family-suggestion.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {out.relative_to(ROOT)}")

    print(f"palette_family: {best}")
    for k, v in ranked[:3]:
        print(f"  {k}: {v:.1f}")
    if result.get("rotation_warning"):
        print(f"WARN: {result['rotation_warning']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

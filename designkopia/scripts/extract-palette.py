#!/usr/bin/env python3
"""Extract dominant palette from reference images → palette-lock.json

Usage:
  python scripts/extract-palette.py outputs/pages/forma-agency/palette-lock.json \\
    --from references/style-dna/grade/bw-serene-profile-grade.png \\
    --from references/style-dna/palette/warm-orange-terracotta-still.png \\
    --job forma-agency

Requires: pip install pillow
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

try:
    from PIL import Image
except ImportError:
    print("ERROR: pillow required. pip install pillow")
    sys.exit(1)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def extract_dominant(path: Path, buckets: int = 24) -> list[dict]:
    img = Image.open(path).convert("RGB")
    img = img.resize((120, 120), Image.Resampling.LANCZOS)
    pixels = list(img.getdata())
    counts: dict[tuple[int, int, int], int] = {}
    for r, g, b in pixels:
        # quantize to reduce noise
        key = (r // buckets * buckets, g // buckets * buckets, b // buckets * buckets)
        counts[key] = counts.get(key, 0) + 1
    ranked = sorted(counts.items(), key=lambda x: -x[1])
    out: list[dict] = []
    for (r, g, b), weight in ranked[:6]:
        out.append({"hex": rgb_to_hex(r, g, b), "weight": round(weight / len(pixels), 4)})
    return out


def pick_ui_tokens(colors: list[dict]) -> dict[str, str]:
    """Heuristic: lightest → bg, darkest → text, saturated mid → accent."""
    if not colors:
        return {"--bg": "#f4f1ea", "--text": "#1a1a1a", "--accent": "#c67b5c", "--muted": "#6b6560"}

    def luminance(hex_c: str) -> float:
        h = hex_c.lstrip("#")
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    def saturation(hex_c: str) -> float:
        h = hex_c.lstrip("#")
        r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
        mx, mn = max(r, g, b), min(r, g, b)
        if mx == 0:
            return 0
        return (mx - mn) / mx

    hexes = [c["hex"] for c in colors]
    by_lum = sorted(hexes, key=luminance)
    bg = by_lum[-1] if luminance(by_lum[-1]) > 180 else "#f4f1ea"
    text = by_lum[0] if luminance(by_lum[0]) < 80 else "#1a1a1a"
    accent_candidates = sorted(hexes, key=saturation, reverse=True)
    accent = accent_candidates[0] if saturation(accent_candidates[0]) > 0.25 else "#c67b5c"
    muted = by_lum[len(by_lum) // 2]

    return {"--bg": bg, "--text": text, "--accent": accent, "--muted": muted}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", help="path to palette-lock.json")
    parser.add_argument("--job", default="")
    parser.add_argument("--from", dest="sources", action="append", default=[])
    parser.add_argument("--palette-family", default="")
    args = parser.parse_args()

    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = ROOT / out_path

    all_colors: list[dict] = []
    source_images: list[dict] = []

    for src in args.sources:
        p = Path(src)
        if not p.is_absolute():
            p = ROOT / p
        if not p.is_file():
            print(f"WARN: missing {p}")
            continue
        dom = extract_dominant(p)
        source_images.append({"file": str(p.relative_to(ROOT)).replace("\\", "/"), "dominant": dom})
        all_colors.extend(dom)

    # merge by hex, sum weights
    merged: dict[str, float] = {}
    for c in all_colors:
        merged[c["hex"]] = merged.get(c["hex"], 0) + c["weight"]
    palette = [{"hex": h, "weight": round(w, 4)} for h, w in sorted(merged.items(), key=lambda x: -x[1])][:8]

    css_vars = pick_ui_tokens(palette)
    payload = {
        "job_slug": args.job or out_path.parent.name,
        "version": "1",
        "source_images": source_images,
        "extracted_hex": palette,
        "css_vars": css_vars,
        "palette_family": args.palette_family or "extracted_from_refs",
        "accent_rules": "accent = most saturated dominant; bg/text = luminance extremes with contrast fallback",
        "note": "Colors derived from images — do not override without user approval",
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out_path.relative_to(ROOT)}")
    print(f"  css_vars: {css_vars}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

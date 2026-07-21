#!/usr/bin/env python3
"""Pick layout mockup for a job — rotate inbox, avoid recent layout_ref reuse.

Usage:
  python scripts/pick-layout-mockup.py --job <slug> --json
  python scripts/pick-layout-mockup.py --list
  python scripts/pick-layout-mockup.py --job <slug> --prefer northbureau

Reads:
  references/layout-screenshots/inbox/*.{png,jpg,webp}
  references/layout-screenshots/analysis/*.yaml
  outputs/pages/*/layout-plan.json (lookback)

Output JSON:
  layout_ref, id, skeleton_hint, recently_used, alternatives
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "references" / "layout-screenshots" / "inbox"
ANALYSIS = ROOT / "references" / "layout-screenshots" / "analysis"
PAGES = ROOT / "outputs" / "pages"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}
LOOKBACK = 5


def slugify(name: str) -> str:
    base = Path(name).stem.lower()
    return re.sub(r"[^a-z0-9]+", "-", base).strip("-") or "screenshot"


def recent_layout_refs(exclude_slug: str | None = None) -> list[str]:
    refs: list[str] = []
    if not PAGES.is_dir():
        return refs
    plans = sorted(PAGES.glob("*/layout-plan.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for plan in plans:
        slug = plan.parent.name
        if exclude_slug and slug == exclude_slug:
            continue
        try:
            data = json.loads(plan.read_text(encoding="utf-8"))
        except Exception:
            continue
        ref = data.get("layout_ref") or data.get("mockup_inspiration", {}).get("ref")
        if ref:
            refs.append(str(ref).replace("\\", "/"))
        if len(refs) >= LOOKBACK:
            break
    return refs


def list_mockups() -> list[dict]:
    items: list[dict] = []
    if not INBOX.is_dir():
        return items
    for p in sorted(INBOX.iterdir()):
        if p.suffix.lower() not in IMAGE_EXT:
            continue
        rel = str(p.relative_to(ROOT)).replace("\\", "/")
        sid = slugify(p.name)
        entry: dict = {"id": sid, "layout_ref": rel, "file": p.name}
        analysis_path = ANALYSIS / f"{sid}.yaml"
        if yaml and analysis_path.is_file():
            try:
                ad = yaml.safe_load(analysis_path.read_text(encoding="utf-8")) or {}
                entry["skeleton_signature"] = ad.get("skeleton_signature", [])
                entry["job_type_suggested"] = ad.get("job_type_suggested")
            except Exception:
                pass
        items.append(entry)
    return items


def score_mockup(item: dict, recent: list[str], prefer: str | None) -> float:
    ref = item["layout_ref"]
    score = 0.0
    if ref not in recent:
        score += 10.0
    else:
        score -= 20.0
    if prefer and prefer.lower() in item.get("file", "").lower():
        score += 5.0
    if item.get("skeleton_signature"):
        score += 2.0
    # deprioritize known broken patterns in filename heuristics
    if "bruustudios" in item.get("file", "") and item.get("file", "").endswith(".png"):
        score -= 15.0
    return score


def pick(job: str | None, prefer: str | None) -> dict:
    recent = recent_layout_refs(exclude_slug=job)
    mockups = list_mockups()
    if not mockups:
        return {"error": "no mockups in inbox", "inbox": str(INBOX)}

    ranked = sorted(mockups, key=lambda m: score_mockup(m, recent, prefer), reverse=True)
    best = ranked[0]
    alts = ranked[1:4]

    skeleton_hint = best.get("skeleton_signature") or _guess_skeleton(best.get("file", ""))

    return {
        "job_slug": job,
        "layout_ref": best["layout_ref"],
        "mockup_id": best["id"],
        "skeleton_hint": skeleton_hint,
        "recently_used_refs": recent,
        "picked_because": "highest score after lookback rotation",
        "alternatives": [
            {"layout_ref": a["layout_ref"], "id": a["id"], "skeleton_hint": a.get("skeleton_signature")}
            for a in alts
        ],
        "rules": "profiles/mockup-inspiration-rules.yaml — skeleton only, adapt skin+vision",
    }


def _guess_skeleton(filename: str) -> list[str]:
    low = filename.lower()
    if "northbureau" in low:
        return ["neo_brutalist_cards", "stats_bar", "thick_borders", "playful_shapes"]
    if "designsake" in low:
        return ["staggered_index", "horizontal_text_band", "extreme_whitespace"]
    if "mashachern" in low:
        return ["modular_blocks", "mixed_grid_rhythm", "editorial_sections"]
    if "readymag" in low:
        return ["viewport_sections", "display_hero", "editorial_scroll"]
    return ["full_page_layout", "needs_agent_review"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", help="Job slug for lookback exclusion")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--prefer", help="Substring to boost in filename")
    args = parser.parse_args()

    if args.list:
        out = list_mockups()
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return 0

    result = pick(args.job, args.prefer)
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"layout_ref: {result.get('layout_ref')}")
        print(f"skeleton_hint: {result.get('skeleton_hint')}")
        print(f"recently_used: {result.get('recently_used_refs')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

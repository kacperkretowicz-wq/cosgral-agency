#!/usr/bin/env python3
"""Pick template_mix for a job — respects mixable_with, archetype, variability history.

Usage:
  python scripts/pick-template-mix.py --archetype readymag-slides --job my-agency
  python scripts/pick-template-mix.py --archetype masonry-portfolio --count 4 --json

Outputs recommended template IDs for layout-planner (min 3, prefer unused templates).
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT / "profiles" / "templates"
ARCHETYPES = ROOT / "profiles" / "layout-archetypes.yaml"
PAGES = ROOT / "outputs" / "pages"

ORPHAN_PRIORITY = ["ordina", "zentry", "astra", "fabrica", "majd", "vidhub"]
BANNED_TRIPLET = {"spector", "kirk", "portfolite"}
LOOKBACK = 3


def load_templates() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for path in TEMPLATES_DIR.glob("*.yaml"):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        tid = str(data.get("id") or path.stem)
        out[tid] = data
    return out


def archetype_suggested(archetype: str) -> list[str]:
    data = yaml.safe_load(ARCHETYPES.read_text(encoding="utf-8")) or {}
    arch = (data.get("archetypes") or {}).get(archetype) or {}
    return list(arch.get("suggested_templates") or [])


def recent_template_usage(exclude_job: str, n: int) -> tuple[set[str], list[set[str]]]:
    items: list[tuple[float, str, set[str]]] = []
    for path in PAGES.glob("*/layout-plan.json"):
        plan = json.loads(path.read_text(encoding="utf-8"))
        slug = plan.get("job_slug") or path.parent.name
        if slug == exclude_job:
            continue
        mix = {str(t) for t in (plan.get("template_mix") or [])}
        items.append((path.stat().st_mtime, slug, mix))
    items.sort(key=lambda x: x[0], reverse=True)
    recent = items[:n]
    all_used: set[str] = set()
    per_job: list[set[str]] = []
    for _, _, mix in recent:
        all_used |= mix
        per_job.append(mix)
    return all_used, per_job


def compatible_with(pick: set[str], candidate: str, templates: dict[str, dict]) -> bool:
    if not pick:
        return True
    for existing in pick:
        mixable = set(templates.get(existing, {}).get("mixable_with") or [])
        if mixable and candidate not in mixable and existing not in set(
            templates.get(candidate, {}).get("mixable_with") or []
        ):
            if candidate != existing:
                return False
    return True


def triplet_overused(per_job: list[set[str]], pick: set[str]) -> bool:
    count = sum(1 for mix in per_job if BANNED_TRIPLET.issubset(mix))
    if BANNED_TRIPLET.issubset(pick):
        count += 1
    return count >= 2


def pick_mix(
    archetype: str,
    job_slug: str,
    count: int,
    templates: dict[str, dict],
    seed: int | None = None,
) -> dict:
    rng = random.Random(seed)
    suggested = archetype_suggested(archetype)
    all_ids = set(templates.keys())
    recently_used, per_job = recent_template_usage(job_slug, LOOKBACK)

    pool = [t for t in suggested if t in all_ids]
    if len(pool) < count:
        pool = list(all_ids)

    orphans = [t for t in ORPHAN_PRIORITY if t in all_ids and t not in recently_used]
    fresh = [t for t in pool if t not in recently_used]

    pick: list[str] = []

    if orphans:
        pick.append(rng.choice(orphans))

    candidates = fresh or [t for t in pool if t not in pick]
    rng.shuffle(candidates)

    for cand in candidates:
        if len(pick) >= count:
            break
        if cand in pick:
            continue
        trial = set(pick + [cand])
        if not compatible_with(set(pick), cand, templates):
            continue
        if triplet_overused(per_job, trial):
            if BANNED_TRIPLET.issubset(trial):
                continue
        pick.append(cand)

    for cand in pool:
        if len(pick) >= count:
            break
        if cand in pick:
            continue
        if compatible_with(set(pick), cand, templates):
            trial = set(pick + [cand])
            if triplet_overused(per_job, trial) and BANNED_TRIPLET.issubset(trial):
                continue
            pick.append(cand)

    while len(pick) < 3 and len(pick) < count:
        for tid in sorted(all_ids):
            if tid not in pick:
                pick.append(tid)
                break
        else:
            break

    new_vs_recent = set(pick) - recently_used
    return {
        "job_slug": job_slug,
        "layout_archetype": archetype,
        "template_mix": pick[: max(3, count)],
        "rationale": {
            "suggested_from_archetype": suggested,
            "recently_used": sorted(recently_used),
            "orphan_injected": pick[0] if pick and pick[0] in ORPHAN_PRIORITY else None,
            "new_templates_vs_recent": sorted(new_vs_recent),
            "triplet_avoided": not BANNED_TRIPLET.issubset(set(pick)),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archetype", required=True)
    parser.add_argument("--job", default="new-job")
    parser.add_argument("--count", type=int, default=4)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    templates = load_templates()
    if args.archetype not in (yaml.safe_load(ARCHETYPES.read_text(encoding="utf-8")) or {}).get(
        "archetypes", {}
    ):
        print(f"WARN: unknown archetype '{args.archetype}'", file=sys.stderr)

    result = pick_mix(args.archetype, args.job, args.count, templates, args.seed)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"template_mix for {args.job} ({args.archetype}):")
        print("  " + ", ".join(result["template_mix"]))
        r = result["rationale"]
        print(f"  new vs recent: {', '.join(r['new_templates_vs_recent']) or '(none)'}")
        if r.get("orphan_injected"):
            print(f"  orphan priority: {r['orphan_injected']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

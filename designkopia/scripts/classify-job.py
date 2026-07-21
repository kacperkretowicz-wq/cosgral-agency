#!/usr/bin/env python3
"""Classify job_type from user prompt or product.yaml.

Usage:
  python scripts/classify-job.py "strona agencji marketingowej portfolio"
  python scripts/classify-job.py --product forma-agency
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
INDEX = ROOT / "profiles" / "job-types" / "index.yaml"


def load_index() -> dict:
    return yaml.safe_load(INDEX.read_text(encoding="utf-8")) or {}


def score_text(text: str, hints: list[str]) -> int:
    low = text.lower()
    return sum(1 for h in hints if h.lower() in low)


def classify(text: str) -> tuple[str, dict]:
    data = load_index()
    types = data.get("types") or {}
    hints_map = data.get("classification_hints") or {}

    scores: list[tuple[str, int]] = []
    for job_type, hints in hints_map.items():
        s = score_text(text, hints if isinstance(hints, list) else [])
        if job_type in types:
            scores.append((job_type, s))

    scores.sort(key=lambda x: -x[1])
    best = scores[0][0] if scores and scores[0][1] > 0 else "product_brand"
    meta = types.get(best) or {}
    return best, {
        "job_type": best,
        "confidence": scores[0][1] if scores else 0,
        "all_scores": scores[:5],
        "pipeline": (data.get("pipelines") or {}).get(best, "standard_full_v3"),
        "research_lane": meta.get("research_lane"),
        "strategist": meta.get("strategist"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt", nargs="?", default="")
    parser.add_argument("--product", default="", help="products/<slug> slug")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    text = args.prompt
    if args.product:
        p = ROOT / "products" / args.product.strip("/") / "product.yaml"
        if p.is_file():
            prod = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
            text = " ".join(
                filter(
                    None,
                    [
                        text,
                        str(prod.get("type")),
                        str(prod.get("job_type")),
                        str(prod.get("positioning")),
                        str(prod.get("brand")),
                    ],
                )
            )

    if not text.strip():
        print("Usage: classify-job.py <prompt> OR --product <slug>")
        return 1

    job_type, result = classify(text)
    out_path = None
    if args.product:
        out_path = ROOT / "outputs" / "pages" / args.product / "job-type-lock.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"job_type: {job_type} (confidence signals: {result['confidence']})")
        print(f"pipeline: {result['pipeline']}")
        if out_path:
            print(f"wrote: {out_path.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

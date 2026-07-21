#!/usr/bin/env python3
"""Ingest layout screenshot from inbox → segregate paths + analysis YAML.

User drops PNG/JPG into references/layout-screenshots/inbox/
Agent or script processes → processed/ + manifest entries.

Usage:
  python scripts/ingest-layout-screenshot.py references/layout-screenshots/inbox/my-mock.png
  python scripts/ingest-layout-screenshot.py --process-inbox
  python scripts/ingest-layout-screenshot.py --process-inbox --analyze-only

Requires: pillow for palette extract
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "references" / "layout-screenshots" / "inbox"
PROCESSED = ROOT / "references" / "layout-screenshots" / "processed"
ANALYSIS = ROOT / "references" / "layout-screenshots" / "analysis"
MANIFEST = ROOT / "references" / "layout-screenshots" / "manifest.yaml"

# Heuristic tags from filename (agent overrides in analysis yaml)
FILENAME_HINTS: list[tuple[str, list[str]]] = [
    ("rare-beauty|beauty|skincare|cosmetic", ["dtc_beauty", "product_page", "dusty_rose"]),
    ("agency|portfolio|studio", ["agency_portfolio", "layout_ui"]),
    ("auto|car|ev|automotive", ["automotive", "campaign"]),
    ("fashion|lookbook|retail", ["fashion_retail"]),
    ("shop|ecommerce|store", ["ecommerce_shop"]),
    ("framer|template", ["template_showcase", "framer"]),
]


def slugify(name: str) -> str:
    base = Path(name).stem.lower()
    return re.sub(r"[^a-z0-9]+", "-", base).strip("-") or "screenshot"


def guess_from_filename(filename: str) -> dict:
    low = filename.lower()
    tags: list[str] = []
    job_hints: list[str] = []
    for pattern, tgs in FILENAME_HINTS:
        if re.search(pattern, low):
            tags.extend(tgs)
    if not tags:
        tags = ["layout_ui", "needs_agent_review"]
    return {"tags": sorted(set(tags)), "job_type_hints": job_hints}


def extract_palette(path: Path) -> list[str]:
    try:
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "extract_palette", ROOT / "scripts" / "extract-palette.py"
        )
        mod = importlib.util.module_from_spec(spec)
        assert spec.loader
        spec.loader.exec_module(mod)
        return [d["hex"] for d in mod.extract_dominant(path)[:6]]
    except Exception:
        return []


def classify_palette(hexes: list[str]) -> str:
    if not hexes:
        return "unknown"
    try:
        import subprocess

        proc = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts" / "classify-palette-family.py"),
                "--from-hex",
                ",".join(hexes),
            ],
            capture_output=True,
            text=True,
            cwd=str(ROOT),
        )
        for line in proc.stdout.splitlines():
            if line.startswith("palette_family:"):
                return line.split(":", 1)[1].strip()
    except Exception:
        pass
    return "unknown"


def routing(tags: list[str], palette_family: str) -> dict:
    """Where copies/splits should go — agent completes in analysis yaml."""
    routes: dict[str, str] = {}
    routes["layout_ui"] = "references/moodboards-ui/"
    routes["palette_style"] = "references/style-dna/palette/"
    if "dtc_beauty" in tags or palette_family == "dusty_rose_mauve":
        routes["subject_hint"] = "references/subject-lanes/retail/ or product DTC"
    if "agency_portfolio" in tags:
        routes["subject_hint"] = "references/agency-content/"
    if "automotive" in tags:
        routes["subject_hint"] = "references/subject-lanes/automotive/"
    return routes


def process_file(src: Path, analyze_only: bool = False) -> dict:
    slug = slugify(src.name)
    dst = PROCESSED / f"{slug}{src.suffix.lower()}"
    hints = guess_from_filename(src.name)
    hexes = extract_palette(src)
    palette_family = classify_palette(hexes)

    entry = {
        "id": slug,
        "source_inbox": str(src.relative_to(ROOT)).replace("\\", "/"),
        "processed_file": str(dst.relative_to(ROOT)).replace("\\", "/"),
        "ingested_at": date.today().isoformat(),
        "auto_tags": hints["tags"],
        "extracted_hex": hexes,
        "palette_family_suggested": palette_family,
        "routing": routing(hints["tags"], palette_family),
        "agent_tasks": [
            "layout-screenshot-analyst: confirm sections (hero, grid, typography)",
            "style-sense-agent: mood keywords",
            "color-palette-guardian: lock palette_family vs rotation",
            "optional: crop sub-regions to style-dna/grade/",
        ],
        "contains":
            {
                "full_page_layout": True,
                "embedded_photography": True,
                "typography_specimen": "possible — script/cursive in mock",
                "ui_chrome": True,
            },
        "status": "pending_agent_review",
    }

    analysis_path = ANALYSIS / f"{slug}.yaml"
    analysis_path.parent.mkdir(parents=True, exist_ok=True)
    analysis_path.write_text(
        yaml.safe_dump(entry, allow_unicode=True, sort_keys=False) if yaml else json.dumps(entry, indent=2),
        encoding="utf-8",
    )

    if not analyze_only:
        PROCESSED.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        if src.parent.resolve() == INBOX.resolve():
            src.unlink()

    return entry


def update_manifest(entry: dict) -> None:
    if not yaml:
        return
    data = {"version": "1", "images": []}
    if MANIFEST.is_file():
        data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8")) or data
    images = data.get("images") or []
    images = [i for i in images if i.get("id") != entry["id"]]
    images.append(
        {
            "id": entry["id"],
            "file": entry["processed_file"],
            "analysis": f"references/layout-screenshots/analysis/{entry['id']}.yaml",
            "palette_family": entry.get("palette_family_suggested"),
            "tags": entry.get("auto_tags"),
            "use_for": ["layout_planner", "style-sense-agent", "palette-extractor"],
        }
    )
    data["images"] = images
    data["updated_at"] = date.today().isoformat()
    MANIFEST.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", nargs="?", help="Path to screenshot")
    parser.add_argument("--process-inbox", action="store_true")
    parser.add_argument("--analyze-only", action="store_true")
    args = parser.parse_args()

    INBOX.mkdir(parents=True, exist_ok=True)

    files: list[Path] = []
    if args.process_inbox:
        files = sorted(INBOX.glob("*.*"))
        files = [f for f in files if f.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
    elif args.file:
        p = Path(args.file)
        if not p.is_absolute():
            p = ROOT / p
        files = [p]
    else:
        print("Usage: ingest-layout-screenshot.py <file> | --process-inbox")
        return 1

    for f in files:
        print(f"Processing {f.name}...")
        entry = process_file(f, analyze_only=args.analyze_only)
        update_manifest(entry)
        print(f"  palette_family: {entry['palette_family_suggested']}")
        print(f"  tags: {entry['auto_tags']}")
        print(f"  analysis: references/layout-screenshots/analysis/{entry['id']}.yaml")

    return 0


if __name__ == "__main__":
    sys.exit(main())

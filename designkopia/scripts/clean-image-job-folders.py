#!/usr/bin/env python3
"""Move misplaced PNGs in outputs/images/<job>/ back to owning job folders.

Usage:
  python scripts/clean-image-job-folders.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "outputs" / "images"
ORPHAN = IMAGES / "_orphan"


def job_file_owners() -> dict[str, str]:
    owners: dict[str, str] = {}
    for manifest_path in IMAGES.glob("*/manifest.json"):
        job = manifest_path.parent.name
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for img in data.get("images") or []:
            if isinstance(img, dict) and img.get("file"):
                owners[str(img["file"])] = job
        anchor = data.get("anchor_image")
        if anchor:
            owners[str(anchor)] = job
    return owners


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    owners = job_file_owners()
    moved = 0
    orphaned = 0

    for job_dir in sorted(IMAGES.iterdir()):
        if not job_dir.is_dir() or job_dir.name.startswith("_"):
            continue
        for png in job_dir.glob("*.png"):
            owner = owners.get(png.name)
            if owner is None:
                dst = ORPHAN / png.name
                if args.dry_run:
                    print(f"ORPHAN {png} -> {dst}")
                else:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(png), str(dst))
                orphaned += 1
                continue
            if owner != job_dir.name:
                dst_dir = IMAGES / owner
                dst = dst_dir / png.name
                if args.dry_run:
                    print(f"MOVE {png} -> {dst}")
                else:
                    dst_dir.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(png), str(dst))
                moved += 1

    print(f"Done. moved={moved} orphaned={orphaned}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

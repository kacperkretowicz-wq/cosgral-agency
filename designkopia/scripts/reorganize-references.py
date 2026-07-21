#!/usr/bin/env python3
"""Reorganize reference images into style-dna / agency-content / moodboards-ui.

Usage:
  python scripts/reorganize-references.py [--dry-run]
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
MAP_FILE = ROOT / "references" / "_migration-map.yaml"


def load_map() -> dict:
    with MAP_FILE.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def move_file(src: Path, dst: Path, dry_run: bool) -> bool:
    if not src.is_file():
        print(f"  SKIP missing: {src.relative_to(ROOT)}")
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        print(f"  SKIP exists: {dst.relative_to(ROOT)}")
        return False
    if dry_run:
        print(f"  WOULD MOVE {src.relative_to(ROOT)} -> {dst.relative_to(ROOT)}")
    else:
        shutil.move(str(src), str(dst))
        print(f"  MOVED {src.relative_to(ROOT)} -> {dst.relative_to(ROOT)}")
    return True


def archive_duplicates(folder_rel: str, dry_run: bool) -> int:
    src_dir = ROOT / folder_rel
    if not src_dir.is_dir():
        return 0
    archive = ROOT / "references" / "_archive" / "duplicates" / src_dir.name
    count = 0
    for f in sorted(src_dir.glob("*")):
        if not f.is_file():
            continue
        dst = archive / f.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dry_run:
            print(f"  WOULD ARCHIVE {f.relative_to(ROOT)} -> {dst.relative_to(ROOT)}")
        else:
            shutil.move(str(f), str(dst))
            print(f"  ARCHIVED {f.relative_to(ROOT)}")
        count += 1
    if not dry_run and src_dir.is_dir() and not any(src_dir.iterdir()):
        src_dir.rmdir()
        print(f"  REMOVED empty {src_dir.relative_to(ROOT)}")
    return count


def remove_empty_dirs(paths: list[str], dry_run: bool) -> None:
    for rel in paths:
        p = ROOT / rel
        if not p.is_dir():
            continue
        if any(p.rglob("*")):
            remaining = list(p.rglob("*"))
            files = [x for x in remaining if x.is_file()]
            if files:
                print(f"  NOT EMPTY {rel} ({len(files)} files remain)")
                continue
        if dry_run:
            print(f"  WOULD REMOVE DIR {rel}")
        else:
            shutil.rmtree(p, ignore_errors=True)
            print(f"  REMOVED DIR {rel}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    data = load_map()
    moved = 0
    seen_from: set[str] = set()

    print("=== Moving reference files ===")
    for entry in data.get("moves") or []:
        if not isinstance(entry, dict):
            continue
        src_rel = str(entry.get("from", "")).replace("\\", "/")
        dst_rel = str(entry.get("to", "")).replace("\\", "/")
        if not src_rel or not dst_rel:
            continue
        if src_rel in seen_from:
            print(f"  SKIP duplicate map entry: {src_rel}")
            continue
        seen_from.add(src_rel)
        if move_file(ROOT / src_rel, ROOT / dst_rel, args.dry_run):
            moved += 1

    print("\n=== Archiving duplicates ===")
    for folder in data.get("archive_duplicates") or []:
        archive_duplicates(str(folder).replace("\\", "/"), args.dry_run)

    print("\n=== Cleaning empty legacy folders ===")
    remove_empty_dirs(
        [str(x).replace("\\", "/") for x in (data.get("legacy_inspiration_folders_remove_when_empty") or [])],
        args.dry_run,
    )
    # style folder if empty
    style_dir = ROOT / "references" / "style"
    if style_dir.is_dir() and not list(style_dir.glob("*")):
        remove_empty_dirs(["references/style"], args.dry_run)

    print(f"\nDone. Moved {moved} files.")
    if args.dry_run:
        print("(dry-run — no changes written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

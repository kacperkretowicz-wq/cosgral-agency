#!/usr/bin/env python3
"""Check image manifest does not reuse assets from profiles/used-assets.yaml.

Usage:
  python scripts/check-used-assets.py <job-slug>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
USED_ASSETS = ROOT / "profiles" / "used-assets.yaml"
IMAGES = ROOT / "outputs" / "images"


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-used-assets.py <job-slug>")
        return 1

    slug = sys.argv[1].strip()
    manifest_path = IMAGES / slug / "manifest.json"
    if not manifest_path.is_file():
        print(f"ERROR: manifest not found: {manifest_path}")
        return 1

    used_data = yaml.safe_load(USED_ASSETS.read_text(encoding="utf-8")) or {}
    blocked: dict[str, list[str]] = {}
    for entry in used_data.get("used_in_ui") or []:
        if not isinstance(entry, dict):
            continue
        f = entry.get("file", "")
        jobs = entry.get("jobs") or []
        if slug in jobs:
            continue
        blocked[f] = jobs

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors: list[str] = []

    for img in manifest.get("images") or []:
        if not isinstance(img, dict):
            continue
        fname = img.get("file", "")
        resolved = img.get("resolved_from") or ""
        for path in (fname, resolved):
            if not path:
                continue
            norm = str(path).replace("\\", "/")
            for blocked_path, jobs in blocked.items():
                if norm.endswith(Path(blocked_path).name) or norm == blocked_path:
                    errors.append(
                        f"reuses asset '{blocked_path}' (already in jobs: {jobs})"
                    )

    if errors:
        print(f"USED ASSETS CHECK FAILED: {slug}")
        for e in errors:
            print(f"  - {e}")
        return 1

    print(f"USED ASSETS CHECK OK: {slug}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

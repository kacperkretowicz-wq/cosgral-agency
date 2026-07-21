#!/usr/bin/env python3
"""Fail if same image file used more than once on a landing page.

Usage:
  python scripts/check-page-image-reuse.py <job-slug>
  python scripts/check-page-image-reuse.py <job-slug> --max 1
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/check-page-image-reuse.py <job-slug> [--max N]")
        return 1

    slug = sys.argv[1].strip()
    max_uses = 1
    if "--max" in sys.argv:
        i = sys.argv.index("--max")
        if i + 1 < len(sys.argv):
            max_uses = int(sys.argv[i + 1])

    html_path = PAGES / slug / "index.html"
    if not html_path.is_file():
        print(f"ERROR: {html_path} not found")
        return 1

    text = html_path.read_text(encoding="utf-8")
    # images/foo.png or ../../images/job/foo.png
    paths = re.findall(r'src=["\'](?:\.\./)*(?:images/[^"\']+)["\']', text)
    files = [p.split("images/")[-1].rstrip('"\'') for p in paths]
    counts = Counter(files)

    errors = [f"{f} used {n}× (max {max_uses})" for f, n in counts.items() if n > max_uses]

    if errors:
        print(f"PAGE IMAGE REUSE FAILED: {slug}")
        for e in errors:
            print(f"  - {e}")
        print(f"  total slots: {len(files)}, unique: {len(counts)}")
        return 1

    print(f"PAGE IMAGE REUSE OK: {slug} ({len(files)} slots, {len(counts)} unique)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

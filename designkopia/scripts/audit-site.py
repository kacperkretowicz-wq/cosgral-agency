#!/usr/bin/env python3
"""Audit reference URL and save reference-audit.json for layout-planner.

Usage:
  python scripts/audit-site.py https://travelagency.agency/
  python scripts/audit-site.py https://willvint.com/ --job sioo-agency-v2

Requires (full audit): node + puppeteer + Chrome in references/web-audits/_audit-tmp
Fallback: lightweight HTML fetch when puppeteer unavailable
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
AUDIT_MJS = ROOT / "scripts" / "audit-site.mjs"
PATTERNS = ROOT / "profiles" / "reference-patterns.yaml"
UA = "Mozilla/5.0 (compatible; design-audit/1.0)"


def hostname(url: str) -> str:
    return urlparse(url).netloc.replace("www.", "")


def lookup_pattern(host: str) -> dict | None:
    try:
        import yaml
    except ImportError:
        return None
    if not PATTERNS.is_file():
        return None
    data = yaml.safe_load(PATTERNS.read_text(encoding="utf-8")) or {}
    patterns = data.get("patterns") or {}
    for key, pat in patterns.items():
        if host in key or key in host:
            return {"pattern_key": key, **pat}
    return None


def run_puppeteer_audit(url: str, out_path: Path) -> dict:
    cmd = ["node", str(AUDIT_MJS), url, str(out_path)]
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT))
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout or "audit failed").strip())
    return json.loads(out_path.read_text(encoding="utf-8"))


def fetch_fallback_audit(url: str) -> dict:
    """Basic audit without headless browser — pattern lookup + HTML heuristics."""
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=30) as resp:
        html = resp.read(500_000).decode("utf-8", errors="replace")

    platform = "custom"
    if "readymag" in html.lower():
        platform = "readymag"
    elif "wp-content" in html:
        platform = "wordpress"
    elif "framer" in html.lower():
        platform = "framer"

    title_m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
    title = title_m.group(1).strip() if title_m else ""

    links = re.findall(r">([^<]{2,50})</a>", html)[:20]
    script_hints = re.findall(
        r'src=["\']([^"\']*(?:lenis|gsap|framer|readymag|swiper|three)[^"\']*)["\']',
        html,
        re.I,
    )

    scroll_mode = "viewport-sections" if platform == "readymag" else "vertical"
    pat = lookup_pattern(hostname(url))

    return {
        "url": url,
        "ok": True,
        "audit_mode": "fetch_fallback",
        "audited_at": date.today().isoformat(),
        "title": title,
        "platform": platform,
        "links": [t.strip() for t in links if t.strip()][:15],
        "scriptHints": script_hints[:10],
        "scrollScreens": 1.0 if platform == "readymag" else None,
        "inferred": {
            "scroll_mode": pat.get("scroll_mode") if pat else scroll_mode,
            "lane": "editorial_readymag" if platform == "readymag" else "commercial_vertical",
        },
        "note": "Puppeteer unavailable — install Chrome: cd references/web-audits/_audit-tmp && npx puppeteer browsers install chrome",
    }


def enrich(audit: dict) -> dict:
    host = hostname(audit.get("url", ""))
    pat = lookup_pattern(host)
    if pat:
        audit["reference_pattern"] = {
            "key": pat.get("pattern_key"),
            "layout_archetype": pat.get("layout_archetype"),
            "scroll_mode": pat.get("scroll_mode"),
            "snippet_ids": pat.get("snippet_ids"),
            "typography_pairing": pat.get("typography_pairing"),
            "notes": pat.get("notes"),
        }
    audit["recommendations_for_layout_planner"] = []
    inf = audit.get("inferred") or {}
    if inf.get("scroll_mode"):
        audit["recommendations_for_layout_planner"].append(
            f"scroll_mode: {inf['scroll_mode']}"
        )
    if audit.get("videos", 0) > 0:
        audit["recommendations_for_layout_planner"].append("include video-hero snippet")
    if audit.get("canvas", 0) > 0:
        audit["recommendations_for_layout_planner"].append(
            "consider webgl-noise-ambient or shader bg"
        )
    if pat:
        audit["recommendations_for_layout_planner"].append(
            f"archetype from patterns: {pat.get('layout_archetype')}"
        )
    return audit


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/audit-site.py <url> [--job <slug>]")
        return 1

    url = sys.argv[1]
    job = None
    if "--job" in sys.argv:
        i = sys.argv.index("--job")
        if i + 1 < len(sys.argv):
            job = sys.argv[i + 1]

    host = hostname(url)
    if job:
        out_dir = ROOT / "outputs" / "pages" / job
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "reference-audit.json"
    else:
        audits_dir = ROOT / "outputs" / "reference-audits"
        audits_dir.mkdir(parents=True, exist_ok=True)
        safe = host.replace(".", "-")
        out_path = audits_dir / f"{safe}-{date.today().isoformat()}.json"

    try:
        audit = run_puppeteer_audit(url, out_path)
    except RuntimeError:
        print("WARN: puppeteer audit failed — using fetch fallback", file=sys.stderr)
        audit = fetch_fallback_audit(url)
        audit = enrich(audit)
        out_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"AUDIT OK: {url}")
    print(f"  saved: {out_path.relative_to(ROOT)}")
    if audit.get("inferred"):
        print(f"  scroll_mode: {audit['inferred'].get('scroll_mode')}")
        print(f"  platform: {audit.get('platform')}")
    if audit.get("reference_pattern"):
        rp = audit["reference_pattern"]
        print(f"  pattern: {rp.get('key')} -> {rp.get('layout_archetype')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Crawl a site for inspiration URLs — incremental registry per domain.

Usage:
  python scripts/crawl-inspiration-site.py https://framer.com/templates/ --max-pages 40
  python scripts/crawl-inspiration-site.py https://example.com --incremental
  python scripts/crawl-inspiration-site.py https://example.com --job my-agency

Writes:
  references/inspiration-registry/<domain-slug>/registry.yaml
  references/inspiration-registry/<domain-slug>/pages/<hash>.json per page (light audit)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from collections import deque
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_ROOT = ROOT / "references" / "inspiration-registry"
UA = "Mozilla/5.0 (compatible; design-inspiration-crawler/1.0)"
SKIP_EXT = {
    ".pdf", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".mp4", ".webm", ".css", ".js", ".woff", ".woff2", ".ico",
}


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = {k: (v or "") for k, v in attrs}
        if tag == "a" and ad.get("href"):
            self.links.append((ad["href"], ad.get("title", "")))
        if tag == "title":
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data


def normalize_url(url: str) -> str:
    p = urlparse(url)
    path = p.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return urlunparse((p.scheme, p.netloc.lower(), path, "", p.query, ""))


def same_site(base: str, url: str) -> bool:
    b = urlparse(base)
    u = urlparse(url)
    return u.netloc.lower().replace("www.", "") == b.netloc.lower().replace("www.", "")


def slugify_domain(url: str) -> str:
    host = urlparse(url).netloc.replace("www.", "")
    return re.sub(r"[^a-z0-9.-]+", "-", host.lower())


def url_hash(url: str) -> str:
    return hashlib.sha1(url.encode()).hexdigest()[:12]


def fetch_page(url: str) -> tuple[str, LinkParser]:
    last_err: Exception | None = None
    candidates = [url]
    p = urlparse(url)
    if not p.netloc.startswith("www."):
        candidates.append(urlunparse((p.scheme, "www." + p.netloc, p.path or "/", "", p.query, "")))

    for attempt in candidates:
        try:
            req = Request(attempt, headers={"User-Agent": UA})
            with urlopen(req, timeout=25) as resp:
                raw = resp.read(800_000)
            html = raw.decode("utf-8", errors="replace")
            parser = LinkParser()
            parser.feed(html)
            return html, parser
        except Exception as exc:
            last_err = exc
            continue
    raise last_err or RuntimeError("fetch failed")


def detect_platform(html: str) -> str:
    low = html.lower()
    if "framerusercontent.com" in low or "data-framer" in low or "framer.com" in low:
        return "framer"
    if "readymag" in low:
        return "readymag"
    if "webflow" in low:
        return "webflow"
    if "wp-content" in low:
        return "wordpress"
    return "custom"


def detect_motion_hints(html: str) -> list[str]:
    hints: list[str] = []
    low = html.lower()
    for key in ("gsap", "lenis", "framer-motion", "motion.dev", "three", "spline", "swiper"):
        if key in low:
            hints.append(key)
    return hints


def categorize(url: str, title: str, platform: str) -> tuple[str, list[str]]:
    path = urlparse(url).path.lower()
    title_l = (title or "").lower()
    tags: list[str] = []

    rules: list[tuple[str, list[str], list[str]]] = [
        ("template_showcase", ["template", "templates", "theme", "themes", "kit", "ui-kit"], ["template", "showcase"]),
        ("portfolio_example", ["work", "project", "case", "portfolio", "cases", "showcase"], ["portfolio", "case-study"]),
        ("interaction_demo", ["demo", "interaction", "motion", "experiment", "playground"], ["motion", "demo"]),
        ("product_page", ["product", "shop", "store", "collection", "item"], ["commerce", "product"]),
        ("landing_marketing", ["landing", "campaign", "launch", "pricing"], ["marketing"]),
        ("about_team", ["about", "team", "studio", "agency", "contact"], ["about"]),
        ("blog_editorial", ["blog", "journal", "news", "article", "stories"], ["editorial"]),
        ("documentation", ["docs", "documentation", "help", "guide"], ["docs"]),
    ]

    category = "general"
    for cat, keywords, cat_tags in rules:
        if any(k in path for k in keywords) or any(k in title_l for k in keywords):
            category = cat
            tags.extend(cat_tags)
            break

    if platform == "framer":
        tags.append("framer")
    if path in ("/", ""):
        category = "site_home"
        tags.append("home")

    return category, sorted(set(tags))


def light_audit(url: str, html: str, parser: LinkParser) -> dict:
    platform = detect_platform(html)
    category, tags = categorize(url, parser.title.strip(), platform)
    fonts = list(
        dict.fromkeys(
            re.findall(
                r'font-family:\s*["\']?([^;"\'\d][^;"\']+)["\']?',
                html,
                re.I,
            )
        )
    )[:12]
    google_fonts = re.findall(
        r'fonts\.googleapis\.com/css2?\?family=([^"\'&]+)',
        html,
        re.I,
    )

    return {
        "url": url,
        "title": parser.title.strip()[:200],
        "platform": platform,
        "category": category,
        "tags": tags,
        "motion_hints": detect_motion_hints(html),
        "fonts_css": fonts[:8],
        "google_fonts": [g.replace("+", " ") for g in google_fonts[:5]],
        "link_count": len(parser.links),
        "audited_at": date.today().isoformat(),
    }


def load_registry(reg_dir: Path) -> dict:
    path = reg_dir / "registry.yaml"
    if path.is_file():
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return {
        "version": "1",
        "domain": "",
        "seed_url": "",
        "updated_at": "",
        "pages": [],
        "categories_index": {},
    }


def save_registry(reg_dir: Path, data: dict) -> None:
    reg_dir.mkdir(parents=True, exist_ok=True)
    pages = data.get("pages") or []
    idx: dict[str, list[str]] = {}
    for p in pages:
        cat = p.get("category", "general")
        idx.setdefault(cat, []).append(p.get("url", ""))
    data["categories_index"] = idx
    data["updated_at"] = date.today().isoformat()
    data["page_count"] = len(pages)
    (reg_dir / "registry.yaml").write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )


def crawl(seed: str, max_pages: int, max_depth: int, delay: float, incremental: bool) -> Path:
    seed = normalize_url(seed)
    reg_dir = REGISTRY_ROOT / slugify_domain(seed)
    reg = load_registry(reg_dir)
    known = {p["url"] for p in reg.get("pages") or [] if p.get("url")}

    if not reg.get("seed_url"):
        reg["seed_url"] = seed
        reg["domain"] = urlparse(seed).netloc

    queue: deque[tuple[str, int]] = deque([(seed, 0)])
    visited: set[str] = set(known) if incremental else set()
    new_pages: list[dict] = []

    while queue and len(new_pages) + len(known) < max_pages:
        url, depth = queue.popleft()
        if url in visited:
            continue
        visited.add(url)

        try:
            html, parser = fetch_page(url)
        except Exception as exc:
            print(f"  FAIL {url}: {exc}")
            continue

        audit = light_audit(url, html, parser)
        page_file = reg_dir / "pages" / f"{url_hash(url)}.json"
        page_file.parent.mkdir(parents=True, exist_ok=True)
        page_file.write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        entry = {
            "url": url,
            "title": audit["title"],
            "category": audit["category"],
            "tags": audit["tags"],
            "platform": audit["platform"],
            "audit_file": str(page_file.relative_to(ROOT)).replace("\\", "/"),
        }
        if url not in known:
            new_pages.append(entry)
            reg.setdefault("pages", []).append(entry)
            known.add(url)
            print(f"  + [{audit['category']}] {audit['title'][:50] or url}")

        if depth < max_depth:
            for href, _ in parser.links:
                if href.startswith(("#", "mailto:", "tel:", "javascript:")):
                    continue
                abs_url = normalize_url(urljoin(url, href))
                p = urlparse(abs_url)
                if p.scheme not in ("http", "https"):
                    continue
                if any(p.path.lower().endswith(ext) for ext in SKIP_EXT):
                    continue
                if same_site(seed, abs_url) and abs_url not in visited:
                    queue.append((abs_url, depth + 1))

        if delay > 0:
            time.sleep(delay)

    save_registry(reg_dir, reg)
    print(f"\nRegistry: {reg_dir / 'registry.yaml'} (+{len(new_pages)} new, total {reg.get('page_count', 0)})")
    return reg_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="Crawl inspiration URLs into registry")
    parser.add_argument("url", help="Seed URL (homepage or templates section)")
    parser.add_argument("--max-pages", type=int, default=35)
    parser.add_argument("--max-depth", type=int, default=2)
    parser.add_argument("--delay", type=float, default=0.4, help="Seconds between requests")
    parser.add_argument("--incremental", action="store_true", help="Skip re-fetch known URLs")
    parser.add_argument("--job", default="", help="Also copy summary to outputs/pages/<job>/inspiration-registry-ref.json")
    args = parser.parse_args()

    print(f"Crawling {args.url} (max {args.max_pages} pages, depth {args.max_depth})...")
    reg_dir = crawl(args.url, args.max_pages, args.max_depth, args.delay, args.incremental)

    if args.job:
        job_dir = ROOT / "outputs" / "pages" / args.job.strip().strip("/")
        job_dir.mkdir(parents=True, exist_ok=True)
        reg = yaml.safe_load((reg_dir / "registry.yaml").read_text(encoding="utf-8"))
        ref = {
            "registry_path": str(reg_dir.relative_to(ROOT)).replace("\\", "/"),
            "domain": reg.get("domain"),
            "page_count": reg.get("page_count"),
            "categories_index": reg.get("categories_index"),
        }
        out = job_dir / "inspiration-registry-ref.json"
        out.write_text(json.dumps(ref, indent=2) + "\n", encoding="utf-8")
        print(f"Job ref: {out.relative_to(ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

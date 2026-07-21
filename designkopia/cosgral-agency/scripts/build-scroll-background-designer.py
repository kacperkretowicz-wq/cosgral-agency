#!/usr/bin/env python3
"""
COSGRAL V3 — designerskie scroll mockupy tła.

Jedno długie zdjęcie z:
  - ciągłą, zblurowaną linią przewodnią (sinuzyjna, czasem podwójna),
  - inspo jako atmosfera (niska opacity, blur), nie kolaż sekcji,
  - subtelnymi akcentami brandu (#e82323, warm haze),
  - delikatnymi zmianami intensywności pod sekcje landingu.
"""

from __future__ import annotations

import math
import random
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INSPO = ROOT / "inspo"
OUT = ROOT / "images" / "cosgral-agency" / "background-mockups"
W, H = 1440, 9600

BG = (10, 10, 10)
INK = (245, 240, 235)
ACCENT = (232, 35, 35)
WARM = (232, 140, 66)

# Strefy landingu — tylko do subtelnych wzmocnień, nie osobnych zdjęć
ZONES = [
    ("hero", 0.00, 0.38),
    ("uslugi", 0.38, 0.58),
    ("proces", 0.58, 0.73),
    ("faq", 0.73, 0.84),
    ("zespol", 0.84, 0.94),
    ("footer", 0.94, 1.00),
]


def load(path: str | Path, fallback_glob: str = "") -> Image.Image:
    p = INSPO / path if not str(path).startswith("__") else path
    if isinstance(path, str) and path.startswith("__"):
        return extract_video_frame(VIDEO_MAP[path])
    if not Path(p).exists() and fallback_glob:
        p = next(INSPO.glob(fallback_glob))
    return Image.open(p).convert("RGB")


VIDEO_MAP = {
    "__waves__": INSPO
    / "Cinematic_Colored_Wavy_Shapes_Moving_On_Black_Background__Looped_Animation_preview_3328454.mp4",
}


def extract_video_frame(video_path: Path) -> Image.Image:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        out = Path(tmp.name)
    subprocess.run(
        ["ffmpeg", "-y", "-ss", "00:00:02", "-i", str(video_path), "-frames:v", "1", "-q:v", "2", str(out)],
        capture_output=True,
        check=True,
    )
    img = Image.open(out).convert("RGB")
    out.unlink(missing_ok=True)
    return img


def cover(img: Image.Image, w: int, h: int) -> Image.Image:
    return ImageOps.fit(img, (w, h), Image.Resampling.LANCZOS)


def atmospheric_layer(
    img: Image.Image,
    w: int,
    h: int,
    opacity: float,
    blur: int = 0,
    darken: float = 0.55,
) -> Image.Image:
    layer = cover(img, w, h)
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    layer = ImageEnhance.Brightness(layer).enhance(darken)
    layer = layer.convert("RGBA")
    layer.putalpha(int(255 * opacity))
    return layer


def radial_glow(w: int, h: int, cx: float, cy: float, rx: float, ry: float, color: tuple, peak: float) -> Image.Image:
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        a = int(255 * peak * (t**2))
        draw.ellipse(
            [cx - rx * t, cy - ry * t, cx + rx * t, cy + ry * t],
            fill=(*color, a),
        )
    return layer.filter(ImageFilter.GaussianBlur(28))


def thread_path(
    w: int,
    h: int,
    seed: int,
    amp: float,
    freq: float,
    x_center: float = 0.52,
    phase: float = 0.0,
) -> list[tuple[float, float]]:
    rng = random.Random(seed)
    drift = [rng.uniform(-0.08, 0.08) for _ in range(5)]
    pts: list[tuple[float, float]] = []
    for y in range(0, h, 3):
        t = y / h
        # zakręcona sinusoida + delikatny drift
        wave = math.sin((t * freq + phase) * math.pi * 2)
        wave2 = math.sin((t * freq * 2.3 + phase * 1.7) * math.pi * 2) * 0.35
        di = int(t * (len(drift) - 1))
        d = drift[di] * (1 - abs(t - di / (len(drift) - 1)))
        x = w * (x_center + d) + wave * amp + wave2 * amp * 0.45
        pts.append((x, y))
    return pts


def draw_thread(
    w: int,
    h: int,
    pts: list[tuple[float, float]],
    color: tuple,
    width: int,
    blur: int,
    opacity: float,
    double: bool = False,
    offset: int = 14,
) -> Image.Image:
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if double:
        off_pts = [(x + offset, y) for x, y in pts]
        draw.line(off_pts, fill=(*color, int(255 * opacity * 0.55)), width=width, joint="curve")
    draw.line(pts, fill=(*color, int(255 * opacity)), width=width, joint="curve")
    if double:
        # biały rdzeń między liniami
        core = [(x + offset * 0.45, y) for x, y in pts]
        draw.line(core, fill=(*INK, int(255 * opacity * 0.22)), width=max(2, width // 4), joint="curve")
    return layer.filter(ImageFilter.GaussianBlur(blur))


def ribbed_overlay(w: int, h: int, opacity: float = 0.04) -> Image.Image:
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for x in range(0, w, 10):
        draw.line([(x, 0), (x, h)], fill=(*INK, int(255 * opacity)), width=1)
    return layer


def grain_overlay(w: int, h: int, opacity: float = 0.07) -> Image.Image:
    rng = random.Random(42)
    noise = Image.new("L", (w, h))
    px = noise.load()
    for y in range(h):
        for x in range(0, w, 2):
            v = rng.randint(0, 255)
            px[x, y] = v
            if x + 1 < w:
                px[x + 1, y] = v
    noise = noise.filter(ImageFilter.GaussianBlur(0.6))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer.putalpha(noise.point(lambda p: int(p * opacity)))
    return layer


def diagonal_falloff(w: int, h: int) -> Image.Image:
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # jak body::before w cosgral-v3.css
    for i in range(0, 255, 4):
        a = int(i * 0.18)
        draw.polygon([(0, 0), (w * 0.55, 0), (0, h * 0.42)], fill=(255, 255, 255, a))
        draw.polygon([(w, h), (w * 0.35, h), (w, h * 0.55)], fill=(0, 0, 0, a))
    return layer.filter(ImageFilter.GaussianBlur(40))


def zone_mask(h: int, y0: float, y1: float, feather: float = 0.04) -> Image.Image:
    mask = Image.new("L", (1, h), 0)
    px = mask.load()
    f = int(h * feather)
    y_start = int(h * y0)
    y_end = int(h * y1)
    for y in range(h):
        if y < y_start - f or y > y_end + f:
            px[0, y] = 0
        elif y < y_start:
            px[0, y] = int(255 * (y - (y_start - f)) / f)
        elif y > y_end:
            px[0, y] = int(255 * ((y_end + f) - y) / f)
        else:
            px[0, y] = 255
    return mask.resize((W, h), Image.Resampling.BILINEAR)


def composite_atmosphere(
    base: Image.Image,
    layer: Image.Image,
    zone: tuple[float, float] | None = None,
    boost: float = 1.0,
) -> Image.Image:
    if zone:
        mask = zone_mask(H, *zone)
        if boost != 1.0:
            mask = mask.point(lambda p: min(255, int(p * boost)))
        masked = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        masked.paste(layer, (0, 0), layer.split()[3])
        # apply zone mask to alpha
        la = masked.split()[3]
        la = ImageChops.multiply(la, mask)
        masked.putalpha(la)
        return Image.alpha_composite(base, masked)
    return Image.alpha_composite(base, layer)


def build_variant(cfg: dict) -> tuple[Path, Path]:
    random.seed(cfg["seed"])
    canvas = Image.new("RGBA", (W, H), (*BG, 255))

    # --- baza atmosferyczna (ciągła, nie sekcje) ---
    tex_a = atmospheric_layer(load(cfg["tex_a"]), W, H, cfg["tex_a_op"], blur=cfg.get("tex_a_blur", 48))
    tex_b = atmospheric_layer(load(cfg["tex_b"]), W, H, cfg["tex_b_op"], blur=cfg.get("tex_b_blur", 64))
    canvas = Image.alpha_composite(canvas, tex_a)
    canvas = Image.alpha_composite(canvas, tex_b)

    # opcjonalna trzecia warstwa (mesh / metal) — subtelna na całości
    if cfg.get("tex_c"):
        tex_c = atmospheric_layer(load(cfg["tex_c"]), W, H, cfg["tex_c_op"], blur=80, darken=0.4)
        canvas = Image.alpha_composite(canvas, tex_c)

    # --- cinematic haze hero + kontakt (jak strona) ---
    canvas = Image.alpha_composite(canvas, radial_glow(W, H, W * 0.28, H * 0.12, W * 0.42, H * 0.18, WARM, 0.14))
    canvas = Image.alpha_composite(canvas, radial_glow(W, H, W * 0.74, H * 0.30, W * 0.35, H * 0.14, ACCENT, 0.09))
    canvas = Image.alpha_composite(canvas, radial_glow(W, H, W * 0.62, H * 0.88, W * 0.38, H * 0.16, ACCENT, 0.11))

    # --- wzmocnienia stref (delikatne, nie osobne zdjęcia) ---
    if cfg.get("zone_boost"):
        boost_layer = atmospheric_layer(load(cfg["zone_boost"]), W, H, 0.12, blur=90, darken=0.45)
        canvas = composite_atmosphere(canvas, boost_layer, ZONES[1][1:])  # uslugi
        canvas = composite_atmosphere(canvas, boost_layer, ZONES[2][1:], boost=0.8)  # proces

    # --- linia przewodnia ---
    pts = thread_path(W, H, cfg["seed"], cfg["thread_amp"], cfg["thread_freq"], cfg.get("thread_x", 0.5), cfg.get("thread_phase", 0))
    thread = draw_thread(
        W, H, pts, cfg.get("thread_color", ACCENT), cfg["thread_w"], cfg["thread_blur"],
        cfg["thread_op"], double=cfg.get("thread_double", True), offset=cfg.get("thread_offset", 16),
    )
    canvas = Image.alpha_composite(canvas, thread)

    # druga linia pomocnicza (cieńsza, biała) — designerski dodatek
    if cfg.get("secondary_thread"):
        pts2 = thread_path(W, H, cfg["seed"] + 7, cfg["thread_amp"] * 0.55, cfg["thread_freq"] * 1.4, 0.38, 0.6)
        thread2 = draw_thread(W, H, pts2, INK, max(2, cfg["thread_w"] // 3), cfg["thread_blur"] + 12, 0.08, double=False)
        canvas = Image.alpha_composite(canvas, thread2)

    # --- akcenty designerskie: węzły na linii ---
    if cfg.get("nodes"):
        nodes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        nd = ImageDraw.Draw(nodes)
        for t in cfg["nodes"]:
            y = int(H * t)
            x = pts[min(len(pts) - 1, y // 3)][0]
            r = cfg.get("node_r", 28)
            nd.ellipse([x - r, y - r, x + r, y + r], fill=(*ACCENT, 40))
            nd.ellipse([x - r * 0.35, y - r * 0.35, x + r * 0.35, y + r * 0.35], fill=(*INK, 55))
        nodes = nodes.filter(ImageFilter.GaussianBlur(10))
        canvas = Image.alpha_composite(canvas, nodes)

    # --- overlays globalne (jak na stronie) ---
    canvas = Image.alpha_composite(canvas, diagonal_falloff(W, H))
    canvas = Image.alpha_composite(canvas, ribbed_overlay(W, H, cfg.get("rib_op", 0.035)))
    canvas = Image.alpha_composite(canvas, grain_overlay(W, H, cfg.get("grain_op", 0.08)))

    # vignette góra/dół
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i in range(120):
        a = int(i * 1.4)
        vd.rectangle([0, i * 8, W, i * 8 + 8], fill=(0, 0, 0, min(255, a)))
        y = H - i * 8
        vd.rectangle([0, y, W, y + 8], fill=(0, 0, 0, min(255, a)))
    canvas = Image.alpha_composite(canvas, vig)

    rgb = canvas.convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    clean = OUT / f"{cfg['name']}.jpg"
    preview = OUT / f"{cfg['name']}-preview.jpg"
    rgb.save(clean, quality=93, optimize=True)

    # preview z etykietami stref
    pv = rgb.copy()
    pd = ImageDraw.Draw(pv)
    for label, y0, y1 in [
        ("HERO", 0, 0.38),
        ("USŁUGI", 0.38, 0.58),
        ("PROCES", 0.58, 0.73),
        ("FAQ", 0.73, 0.84),
        ("ZESPÓŁ", 0.84, 0.94),
        ("STOPKA", 0.94, 1),
    ]:
        y = int(H * y0)
        pd.line([(0, y), (W, y)], fill=ACCENT, width=1)
        pd.text((20, y + 8), label, fill=INK)
    pv.save(preview, quality=88, optimize=True)
    return clean, preview


VARIANTS = [
    {
        "name": "scroll-mockup-04-thread-red",
        "label": "04 Red Thread",
        "seed": 11,
        "tex_a": "pobrane (10).jfif",
        "tex_b": "pobrane (7).jfif",
        "tex_a_op": 0.22,
        "tex_b_op": 0.16,
        "tex_a_blur": 42,
        "tex_b_blur": 56,
        "thread_amp": 210,
        "thread_freq": 2.6,
        "thread_w": 7,
        "thread_blur": 22,
        "thread_op": 0.55,
        "thread_double": True,
        "thread_offset": 18,
        "secondary_thread": True,
        "nodes": [0.12, 0.38, 0.58, 0.78, 0.92],
        "rib_op": 0.03,
        "grain_op": 0.09,
    },
    {
        "name": "scroll-mockup-05-chrome-ribbon",
        "label": "05 Chrome Ribbon",
        "seed": 24,
        "tex_a": "pobrane (11).jfif",
        "tex_b": "pobrane (1).jfif",
        "tex_c": "pobrane (5).jfif",
        "tex_a_op": 0.18,
        "tex_b_op": 0.10,
        "tex_c_op": 0.08,
        "tex_a_blur": 70,
        "tex_b_blur": 55,
        "thread_amp": 260,
        "thread_freq": 2.1,
        "thread_x": 0.48,
        "thread_w": 9,
        "thread_blur": 28,
        "thread_op": 0.42,
        "thread_color": (200, 200, 210),
        "thread_double": True,
        "thread_offset": 22,
        "secondary_thread": True,
        "nodes": [0.22, 0.50, 0.72],
        "zone_boost": "pobrane (5).jfif",
        "rib_op": 0.045,
        "grain_op": 0.07,
    },
    {
        "name": "scroll-mockup-06-haze-flow",
        "label": "06 Haze Flow",
        "seed": 37,
        "tex_a": "__waves__",
        "tex_b": "Oppo Reno 14 wallpaper.jfif",
        "tex_a_op": 0.14,
        "tex_b_op": 0.11,
        "tex_a_blur": 95,
        "tex_b_blur": 80,
        "thread_amp": 175,
        "thread_freq": 3.2,
        "thread_phase": 0.35,
        "thread_w": 6,
        "thread_blur": 32,
        "thread_op": 0.48,
        "thread_double": True,
        "thread_offset": 14,
        "secondary_thread": False,
        "nodes": [0.08, 0.45, 0.85],
        "rib_op": 0.05,
        "grain_op": 0.1,
    },
]


def main() -> None:
    print(f"Designer scroll mockupy ({W}x{H})...")
    for cfg in VARIANTS:
        clean, preview = build_variant(cfg)
        print(f"  OK {cfg['label']}")
        print(f"    {clean.relative_to(ROOT)}")
        print(f"    {preview.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

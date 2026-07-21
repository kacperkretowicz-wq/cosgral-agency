#!/usr/bin/env python3
"""
Buduje długi, scrollowalny mockup tła landingu COSGRAL V3 —
jedno zdjęcie = kompilacja stref dopasowanych do sekcji strony.
Źródła: folder inspo/ (+ klatki z filmów).
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INSPO = ROOT / "inspo"
OUT = ROOT / "images" / "cosgral-agency" / "background-mockups"
WIDTH = 1440
TOTAL_H = 9600  # ~6.7× viewport 1440 — realny scroll landingu

# Wysokości stref wg struktury index-v3.html (suma = 1.0)
SECTIONS = [
    ("hero-act1", "Hero · Akt 1", 0.11, "cinematic_haze"),
    ("hero-act2", "Hero · Akt 2", 0.08, "cube_void"),
    ("hero-act3", "Hero · Akt 3", 0.09, "grain_dunes"),
    ("hero-act4", "Hero · Audyt", 0.12, "cinematic_waves"),
    ("uslugi", "Usługi", 0.20, "halftone_mesh"),
    ("proces", "Proces", 0.15, "liquid_metal"),
    ("faq", "FAQ", 0.11, "ribbed_glass"),
    ("zespol", "Zespół", 0.14, "sculptural"),
    ("footer", "Stopka", 0.10, "dark_silk"),
]

# Mapowanie kierunków → pliki inspo
ASSET_MAP = {
    "cinematic_haze": ["pobrane (10).jfif", "pobrane (12).jfif"],
    "cube_void": ["pobrane (1).jfif", "pobrane (2).jfif"],
    "grain_dunes": ["pobrane (7).jfif", "pobrane (8).jfif"],
    "cinematic_waves": ["__video__cinematic_waves", "pobrane (11).jfif"],
    "halftone_mesh": ["pobrane (5).jfif", "pobrane (6).jfif"],
    "liquid_metal": ["pobrane (11).jfif", "__video__scifi_box", "pobrane (1).jfif"],
    "ribbed_glass": ["Diffusion ᴬᴿᵀ  ɱαʂƚҽɾ Screensavers 『R®.jfif", "pobrane (4).jfif"],
    "sculptural": ["Oppo Reno 14 wallpaper.jfif", "pobrane (3).jfif"],
    "dark_silk": ["pobrane (10).jfif", "pobrane (9).jfif"],
}

VIDEO_FRAMES = {
    "__video__cinematic_waves": INSPO
    / "Cinematic_Colored_Wavy_Shapes_Moving_On_Black_Background__Looped_Animation_preview_3328454.mp4",
    "__video__scifi_box": INSPO / "Flashing_Sci-Fi_Box_VJ_Loop_preview_1561737.mp4",
}

VARIANTS = {
    "scroll-mockup-01-narrative": {
        "label": "01 Narrative Flow",
        "overrides": {},
        "tint": None,
    },
    "scroll-mockup-02-chrome": {
        "label": "02 Chrome Editorial",
        "overrides": {
            "hero-act1": "cube_void",
            "hero-act3": "liquid_metal",
            "uslugi": "ribbed_glass",
            "proces": "cinematic_waves",
            "zespol": "cube_void",
        },
        "tint": (232, 35, 35, 12),
    },
    "scroll-mockup-03-texture": {
        "label": "03 Texture Stack",
        "overrides": {
            "hero-act1": "grain_dunes",
            "hero-act2": "halftone_mesh",
            "hero-act4": "liquid_metal",
            "uslugi": "grain_dunes",
            "faq": "halftone_mesh",
            "footer": "ribbed_glass",
        },
        "tint": None,
    },
}


def extract_video_frame(video_path: Path) -> Image.Image:
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        out = Path(tmp.name)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-ss",
            "00:00:01.5",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(out),
        ],
        capture_output=True,
        check=True,
    )
    img = Image.open(out).convert("RGB")
    out.unlink(missing_ok=True)
    return img


def load_asset(key: str) -> Image.Image:
    if key.startswith("__video__"):
        return extract_video_frame(VIDEO_FRAMES[key])
    path = INSPO / key
    if not path.exists():
        matches = list(INSPO.glob(key.split(".")[0][:8] + "*"))
        if not matches:
            raise FileNotFoundError(key)
        path = matches[0]
    return Image.open(path).convert("RGB")


def cover_crop(img: Image.Image, w: int, h: int) -> Image.Image:
    return ImageOps.fit(img, (w, h), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def soften_edges(img: Image.Image, feather: int = 80) -> Image.Image:
    mask = Image.new("L", img.size, 255)
    draw = ImageDraw.Draw(mask)
    draw.rectangle([0, 0, img.width, feather], fill=0)
    draw.rectangle([0, img.height - feather, img.width, img.height], fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=feather // 2))
    black = Image.new("RGB", img.size, (10, 10, 10))
    return Image.composite(img, black, mask)


def tone(img: Image.Image, brightness: float = 1.0, contrast: float = 1.0) -> Image.Image:
    if brightness != 1.0:
        img = ImageEnhance.Brightness(img).enhance(brightness)
    if contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(contrast)
    return img


def build_zone(direction: str, w: int, h: int, variant_idx: int) -> Image.Image:
    assets = ASSET_MAP[direction]
    key = assets[variant_idx % len(assets)]
    img = load_asset(key)
    zone = cover_crop(img, w, h)

    # Per-kierunek grading — dopasowanie do sekcji landingu
    grades = {
        "cinematic_haze": (0.55, 0.95),
        "cube_void": (0.35, 1.15),
        "grain_dunes": (0.45, 1.05),
        "cinematic_waves": (0.40, 1.1),
        "halftone_mesh": (0.50, 1.2),
        "liquid_metal": (0.42, 1.25),
        "ribbed_glass": (0.38, 1.1),
        "sculptural": (0.48, 0.9),
        "dark_silk": (0.30, 1.0),
    }
    b, c = grades.get(direction, (0.45, 1.0))
    zone = tone(zone, b, c)
    zone = soften_edges(zone, feather=max(60, h // 8))
    return zone


def blend_zones(zones: list[Image.Image], overlap: int) -> Image.Image:
    if not zones:
        raise ValueError("brak stref")
    w, h0 = zones[0].size
    total_h = sum(z.height for z in zones) - overlap * (len(zones) - 1)
    canvas = Image.new("RGB", (w, total_h), (10, 10, 10))
    y = 0
    for i, zone in enumerate(zones):
        if i == 0:
            canvas.paste(zone, (0, 0))
            y = zone.height - overlap
        else:
            # feather blend na overlap
            top = zone.crop((0, 0, w, overlap))
            bottom_existing = canvas.crop((0, y, w, y + overlap))
            mask = Image.linear_gradient("L").resize((w, overlap))
            blended = Image.composite(top, bottom_existing, mask)
            canvas.paste(blended, (0, y))
            canvas.paste(zone.crop((0, overlap, w, zone.height)), (0, y + overlap))
            y += zone.height - overlap
    return canvas


def add_section_guides(img: Image.Image, heights: list[int], labels: list[str]) -> Image.Image:
    """Opcjonalne cienkie linie + etykiety sekcji (tylko w wersji preview)."""
    out = img.copy()
    draw = ImageDraw.Draw(out)
    y = 0
    for h, label in zip(heights, labels):
        draw.line([(0, y), (img.width, y)], fill=(232, 35, 35), width=2)
        draw.text((24, y + 12), label, fill=(245, 240, 235))
        y += h
    return out


def build_variant(name: str, cfg: dict) -> tuple[Path, Path]:
    overrides = cfg.get("overrides", {})
    zones: list[Image.Image] = []
    labels: list[str] = []
    heights: list[int] = []

    for idx, (sid, label, ratio, default_dir) in enumerate(SECTIONS):
        direction = overrides.get(sid, default_dir)
        h = int(TOTAL_H * ratio)
        zone = build_zone(direction, WIDTH, h, idx)
        zones.append(zone)
        labels.append(f"{label}  →  {direction}")
        heights.append(h)

    overlap = 120
    composite = blend_zones(zones, overlap)

    # dopasuj do docelowej wysokości
    if composite.height != TOTAL_H:
        composite = composite.resize((WIDTH, TOTAL_H), Image.Resampling.LANCZOS)

    if cfg.get("tint"):
        tint_layer = Image.new("RGBA", composite.size, cfg["tint"])
        composite = Image.alpha_composite(composite.convert("RGBA"), tint_layer).convert("RGB")

    OUT.mkdir(parents=True, exist_ok=True)
    clean_path = OUT / f"{name}.jpg"
    preview_path = OUT / f"{name}-preview.jpg"

    composite.save(clean_path, quality=92, optimize=True)

    preview = add_section_guides(composite, heights, labels)
    preview.save(preview_path, quality=88, optimize=True)
    return clean_path, preview_path


def main() -> None:
    print(f"Buduję mockupy scroll ({WIDTH}×{TOTAL_H}px)…")
    for name, cfg in VARIANTS.items():
        clean, preview = build_variant(name, cfg)
        print(f"  OK {cfg['label']}")
        print(f"    clean:   {clean.relative_to(ROOT)}")
        print(f"    preview: {preview.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

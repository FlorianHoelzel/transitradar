from pathlib import Path

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "web" / "assets" / "icons"

BACKGROUND = "#08090d"
RADAR = "#5dd3ff"


def create_icon(size: int) -> Image.Image:
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    def point(value: float) -> int:
        return round(value * size / 64 * scale)

    draw.rounded_rectangle(
        (0, 0, canvas_size - 1, canvas_size - 1),
        radius=point(14),
        fill=BACKGROUND,
    )

    halo = Image.new("RGBA", image.size, (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo)
    halo_radius = point(14)
    halo_draw.ellipse(
        (
            point(32) - halo_radius,
            point(32) - halo_radius,
            point(32) + halo_radius,
            point(32) + halo_radius,
        ),
        fill=(93, 211, 255, 33),
    )
    image = Image.alpha_composite(image, halo)
    draw = ImageDraw.Draw(image)

    dot_radius = point(7)
    draw.ellipse(
        (
            point(32) - dot_radius,
            point(32) - dot_radius,
            point(32) + dot_radius,
            point(32) + dot_radius,
        ),
        fill=RADAR,
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    icons = {
        "favicon-32.png": 32,
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }

    rendered = {}
    for filename, size in icons.items():
        rendered[size] = create_icon(size)
        rendered[size].save(OUTPUT_DIR / filename, optimize=True)

    create_icon(256).save(
        OUTPUT_DIR / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )


if __name__ == "__main__":
    main()

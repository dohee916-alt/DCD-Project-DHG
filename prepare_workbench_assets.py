"""Restore transparency to 2x Figma exports and precompute doll outlines."""

from base64 import b64encode
from pathlib import Path
from struct import pack

from PIL import Image


ROOT = Path(__file__).parent
RENDERS = ROOT / "assets" / "figma-render"
FIGURES = ROOT / "assets" / "figures"
CANVAS = (346, 873)

for name in ("tray", "pack-workbench", "bottle-orange", "bottle-purple", "syringe-empty"):
    source = Image.open(RENDERS / f"{name}@2x.png").convert("RGBA")
    mask = Image.open(RENDERS / f"{name}.webp").convert("RGBA").getchannel("A")
    mask = mask.resize(source.size, Image.BILINEAR)
    source.putalpha(mask)
    source.save(RENDERS / f"{name}@2x-transparent.png", optimize=True)

bounds = {}
for kind in range(1, 5):
    for state in range(5):
        image = Image.open(FIGURES / f"figure-{kind}-{state:02d}.webp").convert("RGBA")
        scale = min(CANVAS[0] / image.width, CANVAS[1] / image.height)
        width, height = round(image.width * scale), round(image.height * scale)
        image = image.resize((width, height), Image.BILINEAR)
        canvas = Image.new("RGBA", CANVAS)
        canvas.paste(image, ((CANVAS[0] - width) // 2, (CANVAS[1] - height) // 2))
        alpha = canvas.getchannel("A")
        rows = bytearray()
        for y in range(CANVAS[1]):
            line = [x for x in range(CANVAS[0]) if alpha.getpixel((x, y)) > 24]
            left, right = (line[0], line[-1] + 1) if line else (CANVAS[0] // 2,) * 2
            rows.extend(pack("<HH", left, right))
        bounds[f"{kind}-{state}"] = b64encode(rows).decode("ascii")

body = ",\n".join(f'  "{key}": "{value}"' for key, value in bounds.items())
(ROOT / "figure-bounds.js").write_text(
    "// Precomputed from the current figure images so local file previews need no pixel read.\n"
    f"window.DCD_FIGURE_BOUNDS = Object.freeze({{\n{body}\n}});\n",
    encoding="utf-8",
)

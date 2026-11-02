"""Copy the supplied front/back doll references into stable web asset names.

The files in Downloads are read only. Each consecutive pair is one body level;
doll 1 has back/front order while dolls 2–4 have front/back order.
"""
from pathlib import Path
import base64
import json
import shutil
import unicodedata
from PIL import Image

SOURCE = Path('/Users/gweondohee/Downloads/인형')
DEST = Path(__file__).parent / 'assets' / 'figures-v2'
CANVAS = (346, 873)


def silhouette_bounds(path):
    image = Image.open(path).convert('RGBA')
    scale = min(CANVAS[0] / image.width, CANVAS[1] / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    image = image.resize(size, Image.LANCZOS)
    canvas = Image.new('RGBA', CANVAS)
    canvas.paste(image, ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2))
    alpha = canvas.getchannel('A')
    data = bytearray()
    for y in range(CANVAS[1]):
        row = [x for x in range(CANVAS[0]) if alpha.getpixel((x, y)) > 32]
        left, right = (row[0], row[-1]) if row else (CANVAS[0], 0)
        data.extend((left & 255, left >> 8, right & 255, right >> 8))
    return base64.b64encode(data).decode('ascii')


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    entries = []
    bounds = {}
    for doll in range(1, 5):
        prefix = f'인형{doll}_' if doll <= 2 else f'doll{doll}_'
        files = sorted(p for p in SOURCE.glob('*.png')
                       if unicodedata.normalize('NFC', p.name).startswith(prefix))
        if len(files) != 8:
            raise RuntimeError(f'Doll {doll}: expected 8 front/back references, found {len(files)}')
        for index, source in enumerate(files):
            level = index // 2
            side = ('back' if index % 2 == 0 else 'front') if doll == 1 else (
                'front' if index % 2 == 0 else 'back')
            name = f'doll-{doll:02d}-level-{level:02d}-{side}.png'
            shutil.copy2(source, DEST / name)
            bounds[f'{doll}-{level}-{side}'] = silhouette_bounds(DEST / name)
            entries.append({'doll': doll, 'level': level, 'side': side,
                            'file': name, 'source': source.name})
    (DEST / 'manifest.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
    (Path(__file__).parent / 'figure-bounds-v2.js').write_text(
        'window.DCD_FIGURE_BOUNDS=Object.freeze(' + json.dumps(bounds, separators=(',', ':')) + ');\n')
    print(f'Copied {len(entries)} doll references into {DEST}')


if __name__ == '__main__':
    main()

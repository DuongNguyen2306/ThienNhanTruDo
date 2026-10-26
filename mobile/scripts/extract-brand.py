"""Extract brand artwork from the approved design references into transparent PNGs.

The references are the official design source. The mockup canvas colour is
removed by a flood fill from the edges, so the artwork keeps its own
outlines but sits on any app background.
"""
import os
import sys
from collections import deque

from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]

CANVAS = (0xEE, 0xEF, 0xE9)
SCREEN = (0xF4, 0xF5, 0xEF)
TOL = 16


def is_bg(p):
    return (
        abs(p[0] - CANVAS[0]) <= TOL
        and abs(p[1] - CANVAS[1]) <= TOL
        and abs(p[2] - CANVAS[2]) <= TOL
    ) or (
        abs(p[0] - SCREEN[0]) <= TOL
        and abs(p[1] - SCREEN[1]) <= TOL
        and abs(p[2] - SCREEN[2]) <= TOL
    )


def extract(im, box, name):
    crop = im.crop(box).convert("RGBA")
    w, h = crop.size
    px = crop.load()
    seen = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        if not is_bg((r, g, b)):
            continue
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                seen[ny][nx] = True
                q.append((nx, ny))
    path = os.path.join(OUT, name)
    crop.save(path)
    print(f"wrote {path} {w}x{h}")


im = Image.open(SRC).convert("RGB")
for spec in sys.argv[3:]:
    name, box = spec.split(":")
    x0, y0, x1, y1 = (int(v) for v in box.split(","))
    extract(im, (x0, y0, x1, y1), name)
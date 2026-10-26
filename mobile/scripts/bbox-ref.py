"""Report bounding boxes of ink and yellow elements inside a region."""
import sys
from PIL import Image

path = sys.argv[1]
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
min_area = int(sys.argv[6]) if len(sys.argv) > 6 else 120

im = Image.open(path).convert("RGB")
crop = im.crop((x0, y0, x1, y1))
cw, ch = crop.size
px = crop.load()


def kind(p):
    r, g, b = p
    if r > 185 and g > 160 and b < 150 and (r - b) > 60:
        return 1  # yellow
    if r < 95 and g < 95 and b < 95:
        return 2  # ink
    return 0


for target, name in ((1, "YELLOW"), (2, "INK")):
    seen = [[False] * cw for _ in range(ch)]
    boxes = []
    for yy in range(ch):
        for xx in range(cw):
            if seen[yy][xx] or kind(px[xx, yy]) != target:
                continue
            stack = [(xx, yy)]
            seen[yy][xx] = True
            minx = maxx = xx
            miny = maxy = yy
            n = 0
            while stack:
                cx, cy = stack.pop()
                n += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < cw and 0 <= ny < ch and not seen[ny][nx] and kind(px[nx, ny]) == target:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if n >= min_area:
                boxes.append((miny, minx, maxx - minx + 1, maxy - miny + 1, n))
    boxes.sort()
    print(f"\n=== {name} blocks (abs coords) ===")
    for b in boxes:
        print(
            f"  x={x0 + b[1]:4d}..{x0 + b[1] + b[2]:4d}  y={y0 + b[0]:4d}..{y0 + b[0] + b[3]:4d}"
            f"  w={b[2]:3d} h={b[3]:3d} area={b[4]}"
        )

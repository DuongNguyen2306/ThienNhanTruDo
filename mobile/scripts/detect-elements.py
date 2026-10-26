"""Detect discrete UI elements (dots, pills, boxes) inside a horizontal band."""
import sys
from PIL import Image

path = sys.argv[1]
y0, y1 = int(sys.argv[2]), int(sys.argv[3])
x0, x1 = int(sys.argv[4]), int(sys.argv[5])

im = Image.open(path).convert("RGB")


def yellowish(p):
    r, g, b = p
    return r > 175 and g > 145 and b < 160 and (r - b) > 55


def inkish(p):
    r, g, b = p
    return r < 150 and g < 150 and b < 150


mask = []
for x in range(x0, x1):
    yel = sum(1 for y in range(y0, y1) if yellowish(im.getpixel((x, y))))
    ink = sum(1 for y in range(y0, y1) if inkish(im.getpixel((x, y))))
    mask.append((x, yel, ink))

# Group contiguous columns that have any ink (element outline) into elements.
groups = []
cur = None
for x, yel, ink in mask:
    if ink > 0:
        if cur is None:
            cur = [x, x, yel]
        else:
            cur[1] = x
            cur[2] += yel
    else:
        if cur is not None:
            groups.append(cur)
            cur = None
if cur:
    groups.append(cur)

print(f"elements in band y{y0}..{y1}, x{x0}..{x1}:")
for g in groups:
    w = g[1] - g[0] + 1
    filled = "YELLOW-FILLED" if g[2] > w * 2 else "outline"
    print(f"  x={g[0]}..{g[1]} width={w:3d} yellow_px={g[2]:4d}  {filled}")

"""Fine ASCII pixel map of a small region — for reproducing vector marks."""
import sys
from PIL import Image

path = sys.argv[1]
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
step = int(sys.argv[6]) if len(sys.argv) > 6 else 2

im = Image.open(path).convert("RGB")
crop = im.crop((x0, y0, x1, y1)).resize(
    ((x1 - x0) // step, (y1 - y0) // step), Image.LANCZOS
)
px = crop.load()
print(f"region x{x0}..{x1} y{y0}..{y1} step={step}  -> {crop.width}x{crop.height}")
for yy in range(crop.height):
    row = ""
    for xx in range(crop.width):
        r, g, b = px[xx, yy]
        if r > 185 and g > 160 and b < 150 and (r - b) > 60:
            row += "Y"
        elif r < 95 and g < 95 and b < 95:
            row += "#"
        elif r > 246 and g > 246 and b > 246:
            row += "W"
        elif abs(r - 0xF5) < 12 and abs(g - 0xF5) < 12 and abs(b - 0xF0) < 14:
            row += "."
        else:
            row += "o"
    print(f"  y{y0 + yy * step:4d} {row}")

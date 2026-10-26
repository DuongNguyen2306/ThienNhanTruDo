"""Map the visual structure of a reference: colour masks and element bounding boxes."""
import sys
from PIL import Image
from collections import Counter

path = sys.argv[1]
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])

im = Image.open(path).convert("RGB")
W, H = im.size
print(f"{path} {W}x{H}  region x{x0}..{x1} y{y0}..{y1}")

crop = im.crop((x0, y0, x1, y1))
cw, ch = crop.size


def classify(p):
    r, g, b = p
    if r > 185 and g > 160 and b < 150 and (r - b) > 60:
        return "YELLOW"
    if r < 90 and g < 90 and b < 90:
        return "INK"
    if r > 246 and g > 246 and b > 246:
        return "WHITE"
    if abs(r - 0xF5) < 10 and abs(g - 0xF5) < 10 and abs(b - 0xF0) < 12:
        return "OFFWHITE"
    return "OTHER"


print("\ncolour map (each cell = 16x16 px of the region):")
print("      " + "".join(str((x0 + cx * 16) // 100 % 10) for cx in range((cw + 15) // 16)))
for cy in range((ch + 15) // 16):
    row = ""
    for cx in range((cw + 15) // 16):
        cell = crop.crop((cx * 16, cy * 16, min(cx * 16 + 16, cw), min(cy * 16 + 16, ch)))
        cc = Counter(classify(p) for p in cell.getdata())
        top, n = cc.most_common(1)[0]
        total = sum(cc.values())
        row += {"YELLOW": "Y", "INK": "#", "WHITE": "W", "OFFWHITE": ".", "OTHER": " "}[
            top
        ] if n / total > 0.55 else "?"
    print(f"  y{y0 + cy * 16:4d} {row}")

print("\nregion colour histogram:")
cnt = Counter(classify(p) for p in crop.getdata())
for k, v in cnt.most_common():
    print(f"  {k}: {v} ({100*v/(cw*ch):.1f}%)")

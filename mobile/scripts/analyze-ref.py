"""Analyse a design reference: colours, and the centred phone frame region."""
import sys
from PIL import Image
from collections import Counter

path = sys.argv[1]
im = Image.open(path).convert("RGB")
W, H = im.size
print(f"FILE {path}  {W}x{H}")

counts = Counter(im.resize((W // 4, H // 4)).getdata())
print("top colours:")
for c, n in counts.most_common(10):
    print(f"  #{c[0]:02X}{c[1]:02X}{c[2]:02X}  {100*n/((W//4)*(H//4)):5.2f}%")

# Find the phone screen region: columns whose colours are "screen-like"
# (not the page background of the mockup canvas).
print("\ncolumn profile (every 20px): dominant colour + ink% + yellow%")
for x in range(0, W, 20):
    col = [im.getpixel((x, y)) for y in range(0, H, 3)]
    n = len(col)
    c = Counter(col).most_common(1)[0][0]
    ink = sum(1 for p in col if sum(p) < 220) / n
    yel = sum(1 for p in col if p[0] > 190 and p[1] > 165 and p[2] < 150) / n
    print(f"  x={x:4d} #{c[0]:02X}{c[1]:02X}{c[2]:02X} ink={ink:5.1%} yel={yel:5.1%}")

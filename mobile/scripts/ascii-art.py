"""Print an ASCII rendering of a PNG so the artwork can be read directly."""
import sys
from PIL import Image

path = sys.argv[1]
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 60

im = Image.open(path).convert("RGBA")
scale = cols / im.width
rows = max(1, int(im.height * scale / 2.1))
im2 = im.resize((cols, rows), Image.LANCZOS)
px = im2.load()
print(f"{path} {im.size} -> {cols}x{rows}")
for y in range(rows):
    line = ""
    for x in range(cols):
        r, g, b, a = px[x, y]
        if a < 60:
            line += " "
        elif r > 185 and g > 160 and b < 150 and (r - b) > 55:
            line += "Y"
        elif r < 100 and g < 100 and b < 100:
            line += "#"
        elif r > 238 and g > 238 and b > 235:
            line += "W"
        elif g > 120 and g < 190 and b < 130 and r < 90:
            line += "G"
        else:
            line += "o"
    print(f"|{line}|")
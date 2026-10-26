"""Detect the phone display rectangle inside a wide mockup reference.

The mockup canvas is a flat colour; the device bezel is dark. The display
area is the bright rectangle bounded by the bezel.
"""
import sys

from PIL import Image

path = sys.argv[1]
im = Image.open(path).convert("RGB")
W, H = im.size


def row_profile(y):
    return [im.getpixel((x, y)) for x in range(W)]


# A display pixel is bright and neutral (not the flat canvas, not the bezel).
def is_display(p):
    r, g, b = p
    return r > 215 and g > 215 and b > 205 and (max(r, g, b) - min(r, g, b)) < 22


for y in (int(H * 0.25), int(H * 0.5), int(H * 0.75)):
    xs = [x for x in range(W) if is_display(im.getpixel((x, y)))]
    if xs:
        # take the widest contiguous run
        best = (0, 0)
        start = prev = xs[0]
        for x in xs[1:] + [10 ** 9]:
            if x != prev + 1:
                if prev - start > best[1] - best[0]:
                    best = (start, prev)
                start = x
            prev = x
        print(f"y={y:4d}  display x={best[0]}..{best[1]}  width={best[1]-best[0]+1}")

for x in (int(W * 0.4), int(W * 0.5), int(W * 0.6)):
    ys = [y for y in range(H) if is_display(im.getpixel((x, y)))]
    if ys:
        print(f"x={x:4d}  display y={ys[0]}..{ys[-1]}  height={ys[-1]-ys[0]+1}")

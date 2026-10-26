"""Find the phone-screen rectangle inside a design reference and report it."""
import sys
from PIL import Image

path = sys.argv[1]
im = Image.open(path).convert("RGB")
W, H = im.size


def is_canvas(p):
    return abs(p[0] - 0xEE) < 6 and abs(p[1] - 0xEF) < 6 and abs(p[2] - 0xE9) < 8


def col_noncanvas(x):
    n = 0
    for y in range(0, H, 2):
        if not is_canvas(im.getpixel((x, y))):
            n += 1
    return n


H2 = H // 2
xs = [x for x in range(W) if col_noncanvas(x) > H2 * 0.25]
if xs:
    print(f"{path} {W}x{H}  screen x = {min(xs)}..{max(xs)}  width={max(xs)-min(xs)+1}")
else:
    print(f"{path} {W}x{H}  screen x = not found")

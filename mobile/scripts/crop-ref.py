"""Crop a region from a design reference and upscale it for sharper OCR."""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
scale = int(sys.argv[7]) if len(sys.argv) > 7 else 3

im = Image.open(src).convert("RGB")
if x1 < 0:
    x1 = im.width + x1
if y1 < 0:
    y1 = im.height + y1
crop = im.crop((x0, y0, x1, y1))
crop = crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS)
crop.save(dst, quality=95)
print(f"cropped {src} [{x0},{y0},{x1},{y1}] -> {dst} {crop.width}x{crop.height}")

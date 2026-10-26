"""OCR a text strip word-by-word: split at ink gaps, then OCR each word."""
import sys

from PIL import Image
import easyocr

src = sys.argv[1]
out = sys.argv[2]
y0, y1 = int(sys.argv[3]), int(sys.argv[4])
x0, x1 = int(sys.argv[5]), int(sys.argv[6])

im = Image.open(src).convert("RGB")
strip = im.crop((x0, y0, x1, y1))
w, h = strip.size
px = strip.load()

ink = []
for x in range(w):
    ink.append(sum(1 for y in range(h) if sum(px[x, y]) < 500))

words = []
start = None
gap = 0
for x, v in enumerate(ink):
    if v > 0:
        if start is None:
            start = x
        gap = 0
    else:
        if start is not None:
            gap += 1
            if gap >= 4:
                words.append((start, x - gap + 1))
                start = None
if start is not None:
    words.append((start, w - 1))

reader = easyocr.Reader(["vi", "en"], gpu=False, verbose=False)
lines = [f"strip x{x0}..{x1} y{y0}..{y1}  ({len(words)} groups)"]
for a, b in words:
    if b - a < 3:
        continue
    pad = 2
    crop = strip.crop((max(0, a - pad), 0, min(w, b + pad), h))
    scale = 10
    crop = crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS)
    tmp = f"{out}.word.png"
    crop.save(tmp)
    res = reader.readtext(tmp, detail=1, paragraph=False)
    text = " ".join(t for _, t, _ in res)
    lines.append(f"  x={x0 + a}..{x0 + b} (w={b - a + 1:3d})  ->  {text}")

with open(out, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))
print("wrote", out)
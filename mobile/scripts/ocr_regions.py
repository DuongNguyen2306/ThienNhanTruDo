"""Crop several regions of a reference and OCR them all in one easyocr session."""
import sys
from PIL import Image
import easyocr

src = sys.argv[1]
out = sys.argv[2]
regions = sys.argv[3:]

reader = easyocr.Reader(["vi", "en"], gpu=False, verbose=False)

lines = []
for region in regions:
    # region format: name:x0,y0,x1,y1
    name, box = region.split(":")
    x0, y0, x1, y1 = (int(v) for v in box.split(","))
    im = Image.open(src).convert("RGB")
    crop = im.crop((x0, y0, x1, y1))
    scale = 6
    crop = crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS)
    tmp = f"{out}.{name}.png"
    crop.save(tmp)
    res = reader.readtext(tmp, detail=1, paragraph=False)
    lines.append(f"\n### {name} [{x0},{y0},{x1},{y1}] -> {crop.width}x{crop.height}")
    for box2, text, conf in res:
        lines.append(f"   {text}   [{conf:.2f}]")

with open(out, "w", encoding="utf-8") as fh:
    fh.write("\n".join(lines))
print("wrote", out)

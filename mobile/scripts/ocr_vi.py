"""Vietnamese-capable OCR of design references using easyocr. Writes UTF-8."""
import os
import sys
import easyocr

src = sys.argv[1]
out = sys.argv[2]
lang = sys.argv[2 + 1] if len(sys.argv) > 3 else "vi"
gpu = len(sys.argv) > 4 and sys.argv[4] == "gpu"

reader = easyocr.Reader([lang, "en"], gpu=gpu, verbose=False)
results = reader.readtext(src, detail=1, paragraph=False)

rows = []
for box, text, conf in results:
    xs = [p[0] for p in box]
    ys = [p[1] for p in box]
    rows.append((int(min(ys)), int(min(xs)), f"({int(min(xs))},{int(min(ys))}) {text}   [{conf:.2f}]"))

rows.sort()
with open(out, "w", encoding="utf-8") as fh:
    fh.write(f"--- easyocr {src} ---\n")
    for _, _, line in rows:
        fh.write(line + "\n")
print("wrote", out, len(rows), "lines")

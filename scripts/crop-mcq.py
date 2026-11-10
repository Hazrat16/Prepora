"""Crop each MCQ (question .. stated answer line) out of a LiveMCQ solution PDF.

usage: python3 -I scripts/crop-mcq.py file.pdf FIRST LAST OUTDIR [PER_SHEET]
Writes OUTDIR/sheet-XX.png, each a vertical stack of question crops.
"""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw

pdf, first, last, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), Path(sys.argv[4])
per_sheet = int(sys.argv[5]) if len(sys.argv) > 5 else 6
out.mkdir(parents=True, exist_ok=True)
DPI = 160
S = DPI / 72
BN = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

xml = subprocess.run(["pdftotext", "-bbox", pdf, "-"], capture_output=True, text=True).stdout
xml = re.sub(r"<!DOCTYPE[^>]*>", "", xml).replace('xmlns="http://www.w3.org/1999/xhtml"', "")
root = ET.fromstring(xml)
words = []  # (page, x0, y0, x1, y1, text)
pages = []
for pi, page in enumerate(root.iter("page"), start=1):
    pages.append((float(page.get("width")), float(page.get("height"))))
    for w in page.iter("word"):
        words.append((pi, float(w.get("xMin")), float(w.get("yMin")), float(w.get("xMax")), float(w.get("yMax")), w.text or ""))

# Questions are numbered "প্রশ্ন ১." (BCS) or "১)" (NTRCA). Each must come after
# the previous one in reading order, so stray numbers in explanations are skipped.
def number_at(i):
    w = words[i][5]
    if w == "প্রশ্ন" and i + 1 < len(words) and re.fullmatch(r"[০-৯0-9]+\.", words[i + 1][5]):
        return int(words[i + 1][5].rstrip(".").translate(BN))
    if re.fullmatch(r"[০-৯]+\)", w):
        return int(w.rstrip(")").translate(BN))
    return None

def pos(i):  # reading position: page, then column, then height
    w = words[i]
    return (w[0], w[1] >= pages[w[0] - 1][0] / 2, w[2])

found = {}
for i in range(len(words)):
    n = number_at(i)
    if n is not None and first <= n <= last:
        found.setdefault(n, []).append(i)
starts = {}
prev = (0, False, 0.0)
for n in range(first, last + 1):
    after = [i for i in found.get(n, []) if pos(i) > prev]
    if after:
        starts[n] = min(after, key=pos)
        prev = pos(starts[n])

rendered = {}
def page_img(p):
    if p not in rendered:
        base = out / f"_p{p}"
        subprocess.run(["pdftoppm", "-r", str(DPI), "-f", str(p), "-l", str(p), "-png", "-singlefile", pdf, str(base)], check=True)
        rendered[p] = Image.open(f"{base}.png")
    return rendered[p]

def col(page, x):
    w = pages[page - 1][0]
    return (0, w / 2 + 2) if x < w / 2 else (w / 2 - 6, w)

ANSWER = re.compile(r"^উ\S{0,4}র\s*[:ঃ]")  # "উত্তর:" also when the font garbles it
answer_keys = [(pos(j), j) for j, w in enumerate(words) if ANSWER.match(w[5])]

crops, missing = [], []
for n in range(first, last + 1):
    if n not in starts:
        missing.append(n)
        continue
    i = starts[n]
    p0, x0, y0 = words[i][0], words[i][1], words[i][2]
    # The stated answer is the next "উত্তর:" below the question in column
    # reading order (page, column, y), whatever order the text stream uses.
    key0 = pos(i)
    later = [k for k in answer_keys if k[0] > key0]
    if not later:
        missing.append(n)
        continue
    j = min(later)[1]
    p1, x1, y1b = words[j][0], words[j][1], words[j][4]
    c0, c1 = col(p0, x0), col(p1, x1)
    parts = []
    if p0 == p1 and c0 == c1:
        parts.append((p0, c0, y0 - 4, y1b + 5))
    else:  # runs into the next column or page
        parts.append((p0, c0, y0 - 4, pages[p0 - 1][1] - 40))
        parts.append((p1, c1, 40, y1b + 5))
    imgs = [page_img(p).crop((int(a * S), int(t * S), int(b * S), int(btm * S))) for p, (a, b), t, btm in parts]
    crops.append((n, imgs))

for k in range(0, len(crops), per_sheet):
    group = crops[k:k + per_sheet]
    pieces = []
    for n, imgs in group:
        tag = Image.new("RGB", (max(i.width for i in imgs), 26), "yellow")
        ImageDraw.Draw(tag).text((6, 6), f"Q{n}", fill="black")
        pieces += [tag] + imgs
    W = max(p.width for p in pieces)
    H = sum(p.height for p in pieces)
    sheet = Image.new("RGB", (W, H), "white")
    y = 0
    for p in pieces:
        sheet.paste(p, (0, y))
        y += p.height
    sheet.save(out / f"sheet-{k // per_sheet + 1:02d}.png")
print("cropped", [n for n, _ in crops], "missing", missing)

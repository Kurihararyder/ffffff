#!/usr/bin/env python3
"""產生《紫蝶奇遇記》自己畫的圖片（原創插畫，無外部素材）的 SVG。
用法：
  python3 tools/make_art.py <svg輸出資料夾>
  node tools/render_art.js <svg輸出資料夾> Assets/PurpleButterfly/Art
（q1~q3_banner.png、ans_o.png、ans_x.png 是使用者提供的圖片，不在這裡產生。）
"""
import json
import os
import sys

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
manifest = []

DEFS = '''
<linearGradient id="btnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f72ee"/><stop offset="1" stop-color="#5a3fb4"/></linearGradient>
<linearGradient id="btnN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fd8b6"/><stop offset="1" stop-color="#2a9d84"/></linearGradient>
<linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0820" stop-opacity="0.72"/><stop offset="0.6" stop-color="#0a0820" stop-opacity="0.35"/><stop offset="1" stop-color="#0a0820" stop-opacity="0"/></linearGradient>
<radialGradient id="wingP" cx="0.5" cy="0.5" r="0.75"><stop offset="0" stop-color="#5b33a8"/><stop offset="0.7" stop-color="#7d4fd0"/><stop offset="1" stop-color="#a77cf0"/></radialGradient>
<radialGradient id="wingQ" cx="0.4" cy="0.4" r="0.8"><stop offset="0" stop-color="#4a2a92"/><stop offset="0.7" stop-color="#6e44bd"/><stop offset="1" stop-color="#9468e0"/></radialGradient>
<linearGradient id="dungA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8713a"/><stop offset="1" stop-color="#6e4420"/></linearGradient>
<linearGradient id="dungB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9824a"/><stop offset="1" stop-color="#7d4e26"/></linearGradient>
<filter id="blur6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/></filter>
'''


def save(name, w, h, body, fmt="png"):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
           f'<defs>{DEFS}</defs>{body}</svg>')
    open(os.path.join(out, name + ".svg"), "w", encoding="utf8").write(svg)
    manifest.append({"name": name, "w": w, "h": h, "fmt": fmt})


BROWN = "#4a2a1c"
CREAM = "#fff6e5"

# ───────────── 變成蝴蝶：貼紙風紫斑蝶 ─────────────
FORE = "M4,-6 C20,-52 78,-90 120,-72 C136,-62 130,-28 112,-6 C94,12 48,16 4,6 Z"
HIND = "M4,6 C50,12 106,22 110,54 C112,82 72,98 44,80 C22,66 8,38 4,6 Z"


def butterfly_shapes(fill_fore, fill_hind, stroke, sw):
    s = ""
    for sx in (1, -1):
        s += (f'<g transform="scale({sx},1)">'
              f'<path d="{FORE}" fill="{fill_fore}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
              f'<path d="{HIND}" fill="{fill_hind}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/></g>')
    s += f'<ellipse cx="0" cy="8" rx="8" ry="48" fill="{stroke if stroke != CREAM else CREAM}" stroke="{stroke}" stroke-width="{sw}"/>'
    s += f'<circle cx="0" cy="-44" r="10" fill="{stroke if stroke != CREAM else CREAM}" stroke="{stroke}" stroke-width="{sw}"/>'
    s += (f'<path d="M-3,-50 C-14,-76 -32,-90 -46,-94" fill="none" stroke="{stroke}" stroke-width="{max(sw,3)}" stroke-linecap="round"/>'
          f'<path d="M3,-50 C14,-76 32,-90 46,-94" fill="none" stroke="{stroke}" stroke-width="{max(sw,3)}" stroke-linecap="round"/>')
    return s


def butterfly_details():
    s = ""
    for sx in (1, -1):
        s += f'<g transform="scale({sx},1)">'
        s += ('<ellipse cx="78" cy="-40" rx="30" ry="14" fill="#c9a6ff" opacity="0.55" transform="rotate(-28 78 -40)" filter="url(#blur6)"/>'
              '<ellipse cx="70" cy="42" rx="22" ry="12" fill="#c9a6ff" opacity="0.5" transform="rotate(35 70 42)" filter="url(#blur6)"/>')
        s += '<g stroke="#e6d6ff" stroke-opacity="0.35" stroke-width="1.6" fill="none">'
        s += '<path d="M8,-2 C40,-30 80,-50 112,-58"/><path d="M8,0 C50,-12 90,-26 124,-42"/><path d="M8,6 C44,22 78,38 98,66"/></g>'
        s += '<g fill="#ffffff">'
        for (x, y, r) in [(100, -58, 5.2), (114, -46, 4.4), (122, -32, 3.8), (112, -16, 4), (92, -6, 3.2), (84, -66, 4),
                          (96, 44, 4.6), (88, 64, 3.8), (68, 78, 3.2), (102, 28, 3), (60, -62, 3), (72, -72, 2.6)]:
            s += f'<circle cx="{x}" cy="{y}" r="{r}"/>'
        s += '</g>'
        s += '<g fill="#fff">' + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="7" ry="4.5" transform="rotate(-30 {x} {y})" opacity="0.9"/>' for x, y in [(60, -34), (74, -22), (50, -20)]) + '</g>'
        s += '</g>'
    s += '<g fill="#fff" opacity="0.8"><circle cx="-3" cy="-46" r="2"/><circle cx="3" cy="-46" r="2"/></g>'
    return s


sparkle = ''.join(
    f'<g transform="translate({x},{y}) scale({s})"><path d="M0,-30 L7,-7 L30,0 L7,7 L0,30 L-7,7 L-30,0 L-7,-7Z" fill="#ffe27a" stroke="{BROWN}" stroke-width="3" stroke-linejoin="round"/></g>'
    for x, y, s in [(120, 160, 1.1), (900, 220, 0.9), (150, 860, 0.7), (890, 840, 1.0)])

bf = (f'<g transform="translate(512,540) scale(3.45)" filter="url(#shadow)">{butterfly_shapes(CREAM, CREAM, CREAM, 17)}</g>'
      f'<g transform="translate(512,540) scale(3.45)">{butterfly_shapes("url(#wingP)", "url(#wingQ)", BROWN, 3.2)}{butterfly_details()}</g>')
save("img_butterfly", 1024, 1024, bf + sparkle)

# ───────────── 變成牛糞：貼紙風 ─────────────
def dung_shapes(f1, f2, f3, f4, stroke, sw):
    return (
        f'<path d="M170,770 C140,700 220,640 330,632 L700,632 C820,642 890,700 860,770 C838,846 700,876 512,876 C322,876 192,846 170,770Z" fill="{f1}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
        f'<path d="M250,632 C226,572 290,512 380,502 L650,502 C742,512 800,572 776,632 C752,676 650,686 512,686 C372,686 272,676 250,632Z" fill="{f2}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
        f'<path d="M336,512 C316,456 380,402 452,392 L580,392 C650,402 706,456 686,512 C664,548 600,558 512,558 C424,558 356,548 336,512Z" fill="{f3}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'
        f'<path d="M440,402 C428,336 470,296 524,226 C548,292 610,322 588,402Z" fill="{f4}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>')


def fly(x, y, flip=1):
    return (f'<g transform="translate({x},{y}) scale({flip},1)">'
            f'<ellipse cx="-14" cy="-18" rx="20" ry="12" fill="#fff" fill-opacity="0.75" stroke="#6b6b7a" stroke-width="3" transform="rotate(-30 -14 -18)"/>'
            f'<ellipse cx="10" cy="-20" rx="20" ry="12" fill="#fff" fill-opacity="0.75" stroke="#6b6b7a" stroke-width="3" transform="rotate(25 10 -20)"/>'
            f'<ellipse cx="0" cy="0" rx="22" ry="15" fill="#2c2430" stroke="{BROWN}" stroke-width="4"/>'
            f'<circle cx="-18" cy="-3" r="9" fill="#d94a4a" stroke="{BROWN}" stroke-width="3"/></g>')


stink = ''.join(
    f'<path d="{d}" fill="none" stroke="#7bc96f" stroke-width="15" stroke-linecap="round" opacity="0.9"/>'
    for d in ["M360,200 C326,160 396,138 362,92", "M520,150 C486,110 556,88 522,42", "M690,210 C656,170 726,148 692,102"])

face = (
    f'<ellipse cx="430" cy="728" rx="34" ry="38" fill="#fff" stroke="{BROWN}" stroke-width="6"/><circle cx="438" cy="734" r="17" fill="{BROWN}"/><circle cx="444" cy="727" r="6" fill="#fff"/>'
    f'<ellipse cx="594" cy="728" rx="34" ry="38" fill="#fff" stroke="{BROWN}" stroke-width="6"/><circle cx="586" cy="734" r="17" fill="{BROWN}"/><circle cx="592" cy="727" r="6" fill="#fff"/>'
    f'<path d="M452,790 Q512,846 572,790" fill="#8a2d2d" stroke="{BROWN}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
    '<path d="M478,806 Q512,826 546,806 Q512,800 478,806Z" fill="#ff8a8a"/>'
    '<circle cx="372" cy="782" r="22" fill="#ff9aa2" opacity="0.7"/><circle cx="652" cy="782" r="22" fill="#ff9aa2" opacity="0.7"/>')

shine = ('<path d="M270,640 C262,600 300,560 350,548" fill="none" stroke="#e0b07a" stroke-width="14" stroke-linecap="round" opacity="0.8"/>'
         '<path d="M370,520 C366,486 396,452 440,444" fill="none" stroke="#e0b07a" stroke-width="12" stroke-linecap="round" opacity="0.8"/>'
         '<path d="M204,760 C198,732 214,708 240,696" fill="none" stroke="#d29a62" stroke-width="12" stroke-linecap="round" opacity="0.7"/>')

dung = (f'<g filter="url(#shadow)">{dung_shapes(CREAM, CREAM, CREAM, CREAM, CREAM, 34)}</g>'
        + dung_shapes("url(#dungA)", "url(#dungB)", "url(#dungA)", "url(#dungB)", BROWN, 6)
        + shine + face + stink + fly(170, 360) + fly(860, 330, -1)
        + '<path d="M210,400 C260,430 300,380 340,420" fill="none" stroke="#555" stroke-width="4" stroke-dasharray="3 12" stroke-linecap="round"/>')
save("img_dung", 1024, 1024, dung)

# ───────────── UI 元件 ─────────────
save("ui_card", 640, 340,
     '<rect x="4" y="4" width="632" height="332" rx="40" fill="#14103a" fill-opacity="0.82" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/>')
save("ui_btn", 640, 150,
     '<rect x="4" y="8" width="632" height="136" rx="68" fill="#000" opacity="0.28"/>'
     '<rect x="4" y="2" width="632" height="136" rx="68" fill="url(#btnG)" stroke="#ffffff" stroke-opacity="0.45" stroke-width="3"/>'
     '<rect x="26" y="12" width="588" height="46" rx="23" fill="#fff" opacity="0.12"/>')
save("ui_btn_next", 640, 150,
     '<rect x="4" y="8" width="632" height="136" rx="68" fill="#000" opacity="0.28"/>'
     '<rect x="4" y="2" width="632" height="136" rx="68" fill="url(#btnN)" stroke="#ffffff" stroke-opacity="0.55" stroke-width="3"/>'
     '<rect x="26" y="12" width="588" height="46" rx="23" fill="#fff" opacity="0.16"/>')
save("ui_plate", 360, 360,
     '<circle cx="180" cy="186" r="164" fill="#000" opacity="0.25" filter="url(#blur6)"/>'
     '<circle cx="180" cy="180" r="164" fill="#fffaf0" fill-opacity="0.9" stroke="#ffffff" stroke-width="6"/>')
save("ui_topbar", 720, 240, '<rect width="720" height="240" fill="url(#top)"/>')


def badge(inner, c1, c2):
    return (f'<defs><radialGradient id="bg" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="{c1}"/>'
            f'<stop offset="1" stop-color="{c2}"/></radialGradient></defs>'
            '<circle cx="256" cy="256" r="236" fill="url(#bg)" stroke="#ffffff" stroke-opacity="0.9" stroke-width="10"/>' + inner)


save("icon_good", 512, 512, badge('<path d="M130,270 L218,356 L388,170" stroke="#fff" stroke-width="44" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', "#7ee8a8", "#1f9d62"))
save("icon_bad", 512, 512, badge('<path d="M256,110 L256,300" stroke="#fff" stroke-width="48" stroke-linecap="round"/><circle cx="256" cy="378" r="30" fill="#fff"/>', "#ffb066", "#d9453a"))

json.dump(manifest, open(os.path.join(out, "manifest.json"), "w"))
print(len(manifest), "images")

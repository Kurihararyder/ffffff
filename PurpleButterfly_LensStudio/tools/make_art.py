#!/usr/bin/env python3
"""產生《紫蝶奇遇記》全部圖片的 SVG（原創插畫，無外部素材）。
用法：python3 tools/make_art.py <輸出資料夾>   然後執行 node tools/render_art.js <輸出資料夾> <圖片資料夾>
"""
import math, random, sys, os, json

W, H = 720, 1560
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
manifest = []


def save(name, w, h, body, defs="", fmt="png", bg=None):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
           f'width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{DEFS}{defs}</defs>{body}</svg>')
    open(os.path.join(out, name + ".svg"), "w", encoding="utf8").write(svg)
    manifest.append({"name": name, "w": w, "h": h, "fmt": fmt})


# ───────────── 共用元件 ─────────────
DEFS = '''
<linearGradient id="wingA" x1="0" y1="0" x2="1" y2="0.2">
  <stop offset="0" stop-color="#0f0b1f"/><stop offset="0.55" stop-color="#241848"/><stop offset="1" stop-color="#4b3a92"/>
</linearGradient>
<linearGradient id="wingB" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#0f0b1f"/><stop offset="0.6" stop-color="#2a1d55"/><stop offset="1" stop-color="#3d2f7a"/>
</linearGradient>
<radialGradient id="sheen" cx="0.7" cy="0.3" r="0.6">
  <stop offset="0" stop-color="#9b82ff" stop-opacity="0.75"/><stop offset="1" stop-color="#9b82ff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="fadeDark" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#0a0820" stop-opacity="0"/><stop offset="0.38" stop-color="#0a0820" stop-opacity="0.15"/>
  <stop offset="0.62" stop-color="#0a0820" stop-opacity="0.72"/><stop offset="1" stop-color="#0a0820" stop-opacity="0.88"/>
</linearGradient>
<linearGradient id="leafG" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#8fd36a"/><stop offset="1" stop-color="#2f8a4a"/>
</linearGradient>
<linearGradient id="leafD" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#4fae5c"/><stop offset="1" stop-color="#1c5f3a"/>
</linearGradient>
<linearGradient id="btnG" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#8f72ee"/><stop offset="1" stop-color="#5a3fb4"/>
</linearGradient>
<linearGradient id="btnN" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#5fd8b6"/><stop offset="1" stop-color="#2a9d84"/>
</linearGradient>
<linearGradient id="barG" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#b48cff"/><stop offset="1" stop-color="#7ee8c8"/>
</linearGradient>
<linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#0a0820" stop-opacity="0.62"/><stop offset="0.11" stop-color="#0a0820" stop-opacity="0.32"/><stop offset="0.2" stop-color="#0a0820" stop-opacity="0"/>
</linearGradient>
<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur20"><feGaussianBlur stdDeviation="20"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
'''

BUTTERFLY = '''
<g id="wingR">
  <path d="M4,-6 C20,-52 78,-90 120,-72 C136,-62 130,-28 112,-6 C94,12 48,16 4,6 Z" fill="url(#wingA)"/>
  <path d="M4,6 C50,12 106,22 110,54 C112,82 72,98 44,80 C22,66 8,38 4,6 Z" fill="url(#wingB)"/>
  <path d="M4,-6 C20,-52 78,-90 120,-72 C136,-62 130,-28 112,-6 C94,12 48,16 4,6 Z" fill="url(#sheen)"/>
  <path d="M4,6 C50,12 106,22 110,54 C112,82 72,98 44,80 C22,66 8,38 4,6 Z" fill="url(#sheen)" opacity="0.55"/>
  <g stroke="#b9a8ff" stroke-opacity="0.22" stroke-width="1.4" fill="none">
    <path d="M6,-2 C40,-30 80,-50 112,-60"/><path d="M6,0 C50,-12 90,-26 124,-44"/><path d="M6,4 C50,6 90,0 116,-14"/>
    <path d="M6,8 C40,24 76,40 98,70"/><path d="M6,10 C36,30 60,50 62,78"/>
  </g>
  <g fill="#ffffff">
    <circle cx="100" cy="-58" r="4.2"/><circle cx="114" cy="-46" r="3.4"/><circle cx="122" cy="-32" r="3"/>
    <circle cx="112" cy="-16" r="3.2"/><circle cx="92" cy="-6" r="2.6"/><circle cx="84" cy="-66" r="3.2"/>
    <circle cx="96" cy="44" r="3.6"/><circle cx="88" cy="64" r="3"/><circle cx="68" cy="78" r="2.6"/><circle cx="102" cy="28" r="2.4"/>
  </g>
</g>
<use xlink:href="#wingR" transform="scale(-1,1)"/>
<ellipse cx="0" cy="8" rx="7" ry="46" fill="#120e22"/>
<circle cx="0" cy="-42" r="8" fill="#120e22"/>
<g fill="none" stroke="#120e22" stroke-width="2.4" stroke-linecap="round">
  <path d="M-3,-48 C-14,-74 -30,-86 -42,-90"/><path d="M3,-48 C14,-74 30,-86 42,-90"/>
</g>
<g fill="#fff" opacity="0.85"><circle cx="-3" cy="-44" r="1.6"/><circle cx="3" cy="-44" r="1.6"/><circle cx="0" cy="-20" r="1.6"/><circle cx="0" cy="-6" r="1.6"/></g>
'''


def bf(x, y, s=1.0, rot=0, op=1.0, flap=1.0):
    return (f'<g transform="translate({x},{y}) rotate({rot}) scale({s*flap},{s})" opacity="{op}">'
            f'{BUTTERFLY}</g>')


def bf_flat(x, y, s=1.0, rot=0, op=1.0, col="#0c0a1a"):
    """遷徙群的剪影版"""
    return (f'<g transform="translate({x},{y}) rotate({rot}) scale({s})" opacity="{op}" fill="{col}">'
            '<path d="M0,0 C10,-40 60,-60 92,-46 C100,-30 80,-8 60,2 C80,10 88,36 64,52 C40,56 14,30 0,0Z"/>'
            '<path d="M0,0 C-10,-40 -60,-60 -92,-46 C-100,-30 -80,-8 -60,2 C-80,10 -88,36 -64,52 C-40,56 -14,30 0,0Z"/>'
            '<ellipse cx="0" cy="6" rx="5" ry="26"/></g>')


def bokeh(rng, n, cols, rmin=10, rmax=44, y0=0, y1=H, op=(0.06, 0.2)):
    s = ""
    for _ in range(n):
        s += (f'<circle cx="{rng.uniform(0,W):.0f}" cy="{rng.uniform(y0,y1):.0f}" r="{rng.uniform(rmin,rmax):.0f}" '
              f'fill="{rng.choice(cols)}" opacity="{rng.uniform(*op):.2f}"/>')
    return s


def leaf(x, y, ang, s=1.0, g="leafG"):
    return (f'<g transform="translate({x:.0f},{y:.0f}) rotate({ang}) scale({s})">'
            f'<path d="M0,0 C20,-34 84,-40 128,0 C84,40 20,34 0,0Z" fill="url(#{g})"/>'
            '<path d="M4,0 L120,0" stroke="#e8ffd0" stroke-opacity="0.45" stroke-width="2.5"/>'
            '<path d="M30,0 L60,-16 M30,0 L60,16 M64,0 L92,-14 M64,0 L92,14" stroke="#e8ffd0" stroke-opacity="0.28" stroke-width="2"/></g>')


def flower(x, y, r, petals=7, col="#ffd1e8", ctr="#ffb347", rot=0):
    s = f'<g transform="translate({x},{y}) rotate({rot})">'
    for i in range(petals):
        a = 360 / petals * i
        s += f'<ellipse cx="0" cy="{-r*0.62:.1f}" rx="{r*0.34:.1f}" ry="{r*0.62:.1f}" fill="{col}" transform="rotate({a:.1f})"/>'
    s += f'<circle r="{r*0.28:.1f}" fill="{ctr}"/></g>'
    return s


def fluffy(x, y, h, col="#f4f7ff"):
    """白色團狀花序（呼應 PDF 封面）"""
    s = f'<g transform="translate({x},{y})">'
    s += f'<path d="M0,0 C-4,{h*0.5:.0f} 6,{h*0.7:.0f} 0,{h:.0f}" stroke="#355b3a" stroke-width="5" fill="none"/>'
    rng = random.Random(int(x + y))
    for _ in range(26):
        s += (f'<circle cx="{rng.uniform(-34,34):.0f}" cy="{rng.uniform(-30,26):.0f}" r="{rng.uniform(7,15):.0f}" '
              f'fill="{col}" opacity="{rng.uniform(0.55,0.95):.2f}"/>')
    return s + '</g>'


def sky_rect(c1, c2, h=H):
    return (f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/>'
            f'<stop offset="1" stop-color="{c2}"/></linearGradient>'), f'<rect width="{W}" height="{h}" fill="url(#sky)"/>'


FADE = (f'<rect width="{W}" height="{H}" fill="url(#fadeDark)"/>'
        f'<rect width="{W}" height="{H}" fill="url(#fadeTop)"/>')

# ───────────── 背景 ─────────────
rng = random.Random(7)
d, r = sky_rect("#2b4a5a", "#141a3a")
b = r + '<g transform="translate(0,-170)">' + bokeh(rng, 26, ["#d9f2a0", "#a8e6cf", "#ffffff"], 14, 60, 0, 900, (0.05, 0.16))
b += f'<ellipse cx="520" cy="420" rx="260" ry="320" fill="#cfe9a0" opacity="0.10" filter="url(#blur20)"/>'
b += fluffy(110, 640, 220) + fluffy(220, 700, 200) + fluffy(610, 660, 230)
b += bf(380, 430, 1.95, -14)
b += "</g>" + FADE
save("bg_title", W, H, b, d, "jpg")

# 第 1 關：幼蟲與盤龍木（藤蔓）
rng = random.Random(11)
d, r = sky_rect("#bfe3a2", "#2c6a45")
b = r + '<g transform="translate(0,-170)">' + bokeh(rng, 18, ["#f6ffd0", "#ffffff"], 20, 70, 0, 800, (0.08, 0.22))
b += '<path d="M-20,-20 C120,120 40,260 180,380 C300,480 330,360 460,430 C560,490 660,420 760,520" stroke="#3b5d2e" stroke-width="16" fill="none" stroke-linecap="round"/>'
b += '<path d="M-20,-20 C120,120 40,260 180,380 C300,480 330,360 460,430 C560,490 660,420 760,520" stroke="#6da04a" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.6"/>'
for (x, y, a, s, g) in [(60, 90, 40, 0.9, "leafD"), (110, 190, 130, 1.0, "leafG"), (70, 300, 20, 0.9, "leafG"),
                         (200, 390, 150, 1.1, "leafD"), (290, 440, 35, 1.0, "leafG"), (380, 395, -30, 0.8, "leafD"),
                         (480, 440, 40, 1.1, "leafG"), (590, 440, -20, 1.0, "leafD"), (640, 500, 60, 0.8, "leafG")]:
    b += leaf(x, y, a, s, g)
# 毛毛蟲（站在大葉子上）
b += leaf(250, 560, -8, 2.0, "leafG")
cat = '<g transform="translate(330,540)">'
segs = [(0, 0, 26), (36, 4, 27), (72, 6, 27), (108, 4, 26), (142, 0, 24), (174, -6, 22)]
for (x, y, rr) in segs:
    cat += f'<circle cx="{x}" cy="{y}" r="{rr}" fill="#5a4234"/><circle cx="{x}" cy="{y}" r="{rr}" fill="none" stroke="#f3e4a8" stroke-width="3.5" opacity="0.85"/>'
    cat += f'<circle cx="{x}" cy="{y-8}" r="4.5" fill="#fff6c8"/>'
cat += '<circle cx="-30" cy="-6" r="24" fill="#2e2018"/><circle cx="-40" cy="-12" r="5" fill="#fff"/><circle cx="-41" cy="-12" r="2.2" fill="#111"/>'
cat += '<path d="M-24,-26 C-30,-60 -52,-76 -70,-70" stroke="#2e2018" stroke-width="4" fill="none" stroke-linecap="round"/>'
cat += '<path d="M172,-26 C180,-60 200,-74 216,-68" stroke="#2e2018" stroke-width="4" fill="none" stroke-linecap="round"/>'
cat += '</g>'
b += cat + "</g>" + FADE
save("bg_l1", W, H, b, d, "jpg")

# 第 2 關：花與林緣
rng = random.Random(21)
d, r = sky_rect("#ffd9a0", "#3d8f6a")
b = r + '<g transform="translate(0,-170)">' + f'<circle cx="560" cy="170" r="90" fill="#fff3c4" opacity="0.8" filter="url(#blur8)"/>'
b += bokeh(rng, 16, ["#fff6d6", "#ffffff"], 16, 54, 0, 700, (0.08, 0.2))
b += '<path d="M0,520 C120,380 220,420 320,360 C440,290 560,360 720,300 L720,1800 L0,1800Z" fill="#2f7a55"/>'
b += '<path d="M0,600 C140,500 260,540 380,480 C500,430 620,500 720,450 L720,1800 L0,1800Z" fill="#256a49"/>'
for (cx, cy, rr) in [(70, 420, 70), (160, 460, 60), (560, 400, 74), (650, 440, 62)]:
    b += f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="#2d8a58" opacity="0.9"/>'
for (x, y, rr, col, rot) in [(90, 640, 46, "#ff9ec7", 10), (200, 690, 36, "#ffd1e8", 40), (300, 630, 52, "#ff7ab5", 0),
                              (430, 700, 40, "#ffe6f2", 22), (540, 650, 50, "#ff9ec7", 33), (640, 700, 38, "#ffd1e8", 5),
                              (150, 560, 30, "#ffe6f2", 12), (470, 590, 30, "#ff7ab5", 20)]:
    b += f'<path d="M{x},{y} C{x-6},{y+80} {x+8},{y+150} {x},{y+210}" stroke="#2c6b3c" stroke-width="6" fill="none"/>'
    b += flower(x, y, rr, 7, col, "#ffb347", rot)
b += bf(400, 360, 1.35, 18)
b += "</g>" + FADE
save("bg_l2", W, H, b, d, "jpg")

# 第 3 關：暴雨與強風
rng = random.Random(31)
d, r = sky_rect("#3a4561", "#161a30")
b = r + '<g transform="translate(0,-170)">'
for (cx, cy, rx, ry, op) in [(120, 120, 220, 110, 0.95), (360, 80, 260, 120, 0.9), (600, 140, 240, 110, 0.95),
                             (240, 230, 220, 90, 0.8), (500, 260, 240, 95, 0.8)]:
    b += f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#586280" opacity="{op}" filter="url(#blur20)"/>'
for _ in range(90):
    x = rng.uniform(-40, W); y = rng.uniform(120, 900); l = rng.uniform(30, 80)
    b += f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x-l*0.35:.0f}" y2="{y+l:.0f}" stroke="#bcd0ff" stroke-width="{rng.uniform(1.5,3):.1f}" opacity="{rng.uniform(0.25,0.6):.2f}"/>'
for y in (420, 520, 610):
    b += f'<path d="M-20,{y} C140,{y-40} 260,{y+40} 400,{y} S620,{y-30} 760,{y+10}" stroke="#e5ecff" stroke-width="3" fill="none" opacity="0.28" stroke-linecap="round"/>'
b += leaf(90, 360, 160, 0.8, "leafD") + leaf(520, 480, 200, 0.7, "leafG") + leaf(300, 560, 120, 0.6, "leafD")
b += bf(380, 420, 1.25, -28, 0.95)
b += "</g>" + FADE
save("bg_l3", W, H, b, d, "jpg")

# 第 4 關：遷徙山谷
rng = random.Random(41)
d, r = sky_rect("#ffb36b", "#2a1f4d")
b = r + '<g transform="translate(0,-170)">' + '<circle cx="360" cy="300" r="150" fill="#ffe2a8" opacity="0.55" filter="url(#blur20)"/>'
b += '<path d="M0,500 L120,380 L230,470 L360,330 L500,470 L610,390 L720,480 L720,1800 L0,1800Z" fill="#6a4a86" opacity="0.8"/>'
b += '<path d="M0,580 L140,470 L260,560 L400,440 L540,560 L650,500 L720,560 L720,1800 L0,1800Z" fill="#46336e"/>'
b += '<path d="M0,680 C160,600 260,660 380,620 C520,570 620,640 720,600 L720,1800 L0,1800Z" fill="#2c2250"/>'
b += '<ellipse cx="360" cy="640" rx="420" ry="70" fill="#d9c8ff" opacity="0.18" filter="url(#blur20)"/>'
for i in range(26):
    t = i / 25
    x = 40 + t * 600 + rng.uniform(-40, 40)
    y = 160 + t * 380 + rng.uniform(-60, 60)
    b += bf_flat(x, y, rng.uniform(0.22, 0.5), rng.uniform(-30, 50), rng.uniform(0.6, 0.95))
b += bf(300, 330, 1.2, 25)
b += "</g>" + FADE
save("bg_l4", W, H, b, d, "jpg")

# 前後測
rng = random.Random(51)
d, r = sky_rect("#3a2a78", "#0f0c2a")
b = r + '<g transform="translate(0,-170)">'
for _ in range(70):
    b += f'<circle cx="{rng.uniform(0,W):.0f}" cy="{rng.uniform(0,900):.0f}" r="{rng.uniform(1,3.2):.1f}" fill="#fff" opacity="{rng.uniform(0.3,0.9):.2f}"/>'
b += bokeh(rng, 14, ["#b99cff", "#7ee8c8"], 20, 70, 0, 800, (0.05, 0.12))
b += bf(150, 280, 0.8, -20, 0.5) + bf(580, 220, 0.6, 18, 0.45) + bf(520, 520, 0.7, 8, 0.55)
b += f'<text x="360" y="470" font-family="sans-serif" font-weight="700" font-size="300" fill="#ffffff" opacity="0.12" text-anchor="middle">?</text>'
b += "</g>" + FADE
save("bg_test", W, H, b, d, "jpg")

# 結果
rng = random.Random(61)
d, r = sky_rect("#ff9fb8", "#3b2a78")
b = r + '<g transform="translate(0,-170)">' + '<circle cx="360" cy="520" r="240" fill="#fff0c8" opacity="0.5" filter="url(#blur20)"/>'
for _ in range(40):
    b += f'<circle cx="{rng.uniform(0,W):.0f}" cy="{rng.uniform(0,820):.0f}" r="{rng.uniform(1.5,4):.1f}" fill="#fff" opacity="{rng.uniform(0.4,1):.2f}"/>'
b += '<path d="M0,760 C140,700 260,740 380,700 C520,650 620,720 720,690 L720,1800 L0,1800Z" fill="#2c2250"/>'
b += bf(360, 380, 2.0, 0) + bf(120, 250, 0.55, -25, 0.8) + bf(610, 300, 0.5, 20, 0.8)
b += "</g>" + FADE
save("bg_result", W, H, b, d, "jpg")

# ───────────── 圓形圖示 512×512 ─────────────
def badge(inner, c1, c2):
    return (f'<defs><radialGradient id="bg" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="{c1}"/>'
            f'<stop offset="1" stop-color="{c2}"/></radialGradient></defs>'
            '<circle cx="256" cy="256" r="236" fill="url(#bg)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="10"/>'
            '<circle cx="256" cy="256" r="236" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>' + inner)

cat_icon = ('<g transform="translate(70,300)">'
            + ''.join(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="#5a4234" stroke="#f3e4a8" stroke-width="5"/>' for x, y, rr in
                      [(30, 0, 32), (84, 4, 33), (140, 6, 33), (194, 2, 30), (240, -6, 26), (280, -16, 22)])
            + '<circle cx="-18" cy="-8" r="30" fill="#2e2018"/><circle cx="-30" cy="-16" r="7" fill="#fff"/><circle cx="-31" cy="-16" r="3" fill="#111"/>'
            + '<path d="M-6,-34 C-12,-76 -40,-96 -64,-90" stroke="#2e2018" stroke-width="6" fill="none" stroke-linecap="round"/></g>')
save("icon_l1", 512, 512, badge('<g transform="translate(0,-30)">' + leaf(120, 270, -6, 2.1, "leafG") + '</g>' + cat_icon.replace('translate(70,300)', 'translate(150,270) scale(0.62)'), "#a8e08a", "#2f8a4a"), "", "png")
save("icon_l2", 512, 512, badge(flower(256, 250, 130, 8, "#ffd1e8", "#ffb347", 8) + bf(350, 150, 0.55, 20), "#ffd9a0", "#e0709e"), "", "png")
rain = ''.join(f'<line x1="{x}" y1="330" x2="{x-18}" y2="{390+(i%2)*28}" stroke="#d6e4ff" stroke-width="12" stroke-linecap="round"/>' for i, x in enumerate([170, 230, 290, 350]))
save("icon_l3", 512, 512, badge('<g fill="#e6ecff"><circle cx="190" cy="230" r="58"/><circle cx="262" cy="196" r="74"/><circle cx="340" cy="238" r="56"/><rect x="150" y="226" width="236" height="60" rx="30"/></g>' + rain, "#7f8fb8", "#2a3150"), "", "png")
save("icon_l4", 512, 512, badge('<path d="M110,340 C190,230 280,330 400,170" stroke="#fff" stroke-width="14" fill="none" stroke-dasharray="4 26" stroke-linecap="round"/>'
                               + bf_flat(150, 300, 0.7, 20, 1, "#ffffff") + bf_flat(280, 250, 0.55, 30, 0.9, "#ffffff") + bf_flat(380, 190, 0.45, 40, 0.85, "#ffffff"), "#ffb36b", "#5a3f9a"), "", "png")
save("icon_test", 512, 512, badge('<text x="256" y="350" font-family="sans-serif" font-weight="800" font-size="290" fill="#fff" text-anchor="middle">?</text>', "#8a70ee", "#2a1d66"), "", "png")
save("icon_hero", 512, 512, badge(bf(256, 270, 1.15, 0), "#7a6cf0", "#1e1550"), "", "png")
save("icon_good", 512, 512, badge('<path d="M130,270 L218,356 L388,170" stroke="#fff" stroke-width="44" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', "#7ee8a8", "#1f9d62"), "", "png")
save("icon_bad", 512, 512, badge('<path d="M256,110 L256,300" stroke="#fff" stroke-width="48" stroke-linecap="round"/><circle cx="256" cy="378" r="30" fill="#fff"/>', "#ffb066", "#d9453a"), "", "png")
save("mascot", 256, 256, '<g transform="scale(0.5)">' + badge(bf(256, 270, 1.15, 0), "#7a6cf0", "#1e1550") + '</g>', "", "png")

# ───────────── UI 元件 ─────────────
save("ui_card", 640, 340, '<rect x="4" y="4" width="632" height="332" rx="40" fill="#14103a" fill-opacity="0.78" stroke="#ffffff" stroke-opacity="0.22" stroke-width="3"/>'
     '<rect x="4" y="4" width="632" height="332" rx="40" fill="none" stroke="#b9a3f0" stroke-opacity="0.18" stroke-width="10" transform="translate(0,0)"/>', "", "png")
save("ui_btn", 640, 150, '<rect x="4" y="8" width="632" height="136" rx="68" fill="#000" opacity="0.28"/>'
     '<rect x="4" y="2" width="632" height="136" rx="68" fill="url(#btnG)" stroke="#ffffff" stroke-opacity="0.45" stroke-width="3"/>'
     '<rect x="26" y="12" width="588" height="46" rx="23" fill="#fff" opacity="0.12"/>', "", "png")
save("ui_btn_next", 640, 150, '<rect x="4" y="8" width="632" height="136" rx="68" fill="#000" opacity="0.28"/>'
     '<rect x="4" y="2" width="632" height="136" rx="68" fill="url(#btnN)" stroke="#ffffff" stroke-opacity="0.55" stroke-width="3"/>'
     '<rect x="26" y="12" width="588" height="46" rx="23" fill="#fff" opacity="0.16"/>', "", "png")
save("ui_bar_track", 384, 40, '<rect x="2" y="2" width="380" height="36" rx="18" fill="#ffffff" fill-opacity="0.16" stroke="#fff" stroke-opacity="0.4" stroke-width="2"/>', "", "png")
save("ui_bar_fill", 384, 40, '<rect x="2" y="2" width="380" height="36" rx="18" fill="url(#barG)"/><rect x="14" y="7" width="356" height="10" rx="5" fill="#fff" opacity="0.35"/>', "", "png")

json.dump(manifest, open(os.path.join(out, "manifest.json"), "w"))
print(len(manifest), "images")

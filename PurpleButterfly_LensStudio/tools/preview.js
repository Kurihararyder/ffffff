// 用瀏覽器大致模擬 Lens Studio 裡的版面，輸出預覽圖（只是示意，字級與換行以 Lens Studio 為準）
// 用法：node tools/preview.js <輸出png>
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "../Assets/PurpleButterfly");
const DATA = require(path.join(ROOT, "Scripts/QuizData.js"));
const { createGame } = require(path.join(ROOT, "Scripts/GameLogic.js"));

const R = {
  icon: [0.05, 0.035, 0.155, 0.092], header: [0.17, 0.042, 0.64, 0.086], progress: [0.62, 0.042, 0.94, 0.086],
  mascot: [0.05, 0.098, 0.155, 0.152], barTrack: [0.17, 0.112, 0.64, 0.138], energyText: [0.65, 0.098, 0.95, 0.152],
  badge: [0.36, 0.145, 0.64, 0.275], title: [0.07, 0.305, 0.93, 0.372],
  cardShort: [0.06, 0.385, 0.94, 0.60], cardTall: [0.06, 0.385, 0.94, 0.835],
  bodyShort: [0.11, 0.395, 0.89, 0.59], bodyTall: [0.11, 0.397, 0.89, 0.825],
  bodySplitTop: [0.11, 0.393, 0.89, 0.47], feedbackSplit: [0.11, 0.475, 0.89, 0.826],
  choices: [[0.06, 0.625, 0.94, 0.725], [0.06, 0.74, 0.94, 0.84], [0.06, 0.855, 0.94, 0.955]],
  next: [0.20, 0.865, 0.80, 0.945]
};
const img = (f) => "file://" + path.join(ROOT, "Art", f);
const box = (r) => `left:${r[0] * 100}%;top:${r[1] * 100}%;width:${(r[2] - r[0]) * 100}%;height:${(r[3] - r[1]) * 100}%`;

function screen(v) {
  const bg = v.phase === "intro" ? "title" : v.phase.startsWith("test") ? "test" : v.phase === "result" ? "result" : "l" + v.levelId;
  const icon = (v.phase === "intro" || v.phase === "result") ? "hero" : v.phase.startsWith("test") ? "test" : "l" + v.levelId;
  const badge = (v.phase === "feedback" || v.phase === "testFeedback") ? (v.feedbackGood ? "good" : "bad") : null;
  const hasC = v.choices.length > 0, hasF = !!v.feedback;
  let h = `<div class="s"><img class="a" style="left:0;top:0;width:100%;height:100%" src="${img("bg_" + bg + ".jpg")}">`;
  h += `<div class="t l o" style="${box(R.header)};color:#d1c2ff">${v.header}</div><div class="t r o" style="${box(R.progress)};color:#d1c2ff">${v.progress}</div>`;
  if (v.showEnergy) {
    const d = v.energyDelta;
    h += `<img class="a f" style="${box(R.mascot)}" src="${img("mascot.png")}"><img class="a" style="${box(R.barTrack)}" src="${img("ui_bar_track.png")}">`;
    const r = R.barTrack; h += `<img class="a" style="${box([r[0], r[1], r[0] + (r[2] - r[0]) * v.energyPct, r[3]])}" src="${img("ui_bar_fill.png")}">`;
    h += `<div class="t r o" style="${box(R.energyText)}">能量 ${v.energy}${d > 0 ? " (+" + d + ")" : d < 0 ? " (" + d + ")" : ""}</div>`;
  }
  h += `<img class="a f" style="${box(R.icon)}" src="${img("icon_" + icon + ".png")}">`;
  if (badge) h += `<img class="a f" style="${box(R.badge)}" src="${img("icon_" + badge + ".png")}">`;
  h += `<div class="t c big o" style="${box(R.title)}">${v.title}</div>`;
  h += `<img class="a" style="${box(hasC ? R.cardShort : R.cardTall)}" src="${img("ui_card.png")}">`;
  h += `<div class="t l" style="${box(hasC ? R.bodyShort : hasF ? R.bodySplitTop : R.bodyTall)}">${v.body.replace(/\n/g, "<br>")}</div>`;
  if (!hasC && hasF) h += `<div class="t l" style="${box(R.feedbackSplit)};color:${v.feedbackGood ? "#99f5bd" : "#ffb885"}">${v.feedback}</div>`;
  v.choices.forEach((c, i) => {
    h += `<img class="a" style="${box(R.choices[i])}" src="${img("ui_btn.png")}"><div class="t l" style="left:${(R.choices[i][0] + 0.05) * 100}%;top:${(R.choices[i][1] + 0.008) * 100}%;width:${(R.choices[i][2] - R.choices[i][0] - 0.1) * 100}%;height:${(R.choices[i][3] - R.choices[i][1] - 0.016) * 100}%">${String.fromCharCode(65 + i)}.  ${c}</div>`;
  });
  if (v.nextLabel) h += `<img class="a" style="${box(R.next)}" src="${img("ui_btn_next.png")}"><div class="t c" style="${box(R.next)}">${v.nextLabel}</div>`;
  return h + "</div>";
}

(async () => {
  const g = createGame(DATA, { shuffleChoices: false });
  const views = [];
  views.push(g.getView()); g.next();                       // 開場
  views.push(g.getView());                                 // 前測
  for (let i = 0; i < 3; i++) g.choose(DATA.tests[i].answer);
  g.next();                                                // 第1關開始
  views.push(g.getView()); g.choose(0);                    // 第1關題目
  views.push(g.getView()); g.next();                       // 回饋
  // 快轉到第3關
  let guard = 0;
  while (guard++ < 200 && !(g.getView().levelId === 3 && g.getView().phase === "question")) {
    const v = g.getView();
    if (v.phase === "question") g.choose(0 === 0 ? v.choices.findIndex((c) => DATA.levels.some((l) => l.steps.some((s) => s.choices.some((x) => x.good && x.text === c)))) : 0);
    else g.next();
  }
  views.push(g.getView());
  const html = `<html><head><style>
@font-face{font-family:NT;src:url("file://${path.join(ROOT, "Fonts/NotoSansTC-Medium-subset.ttf")}")}
body{margin:0;background:#222;display:flex;gap:16px;padding:16px;font-family:NT}
.s{position:relative;width:360px;height:780px;overflow:hidden;border-radius:28px;flex:none;background:#000}
.a{position:absolute}.f{object-fit:contain}.a:not(.f){object-fit:fill}
.o{text-shadow:0 0 3px #0d0826,0 0 3px #0d0826,0 0 2px #0d0826}
.t{position:absolute;display:flex;align-items:center;color:#fff;line-height:1.25;overflow:hidden;font-size:22px}
.t.l{justify-content:flex-start;text-align:left}.t.r{justify-content:flex-end;text-align:right}.t.c{justify-content:center;text-align:center}
.big{font-size:30px}
</style></head><body>${views.map(screen).join("")}</body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 16 + views.length * 376, height: 812 }, deviceScaleFactor: 1 });
  fs.writeFileSync("/tmp/preview.html", html);
  await page.goto("file:///tmp/preview.html");
  await page.evaluate(async () => {
    await document.fonts.ready;
    // 模擬 Lens Studio 的「縮小至符合」：字太大就逐步縮小
    document.querySelectorAll(".t").forEach((el) => {
      let s = parseFloat(getComputedStyle(el).fontSize);
      while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && s > 8) { s -= 1; el.style.fontSize = s + "px"; }
    });
  });
  await page.screenshot({ path: process.argv[2] || "preview.png" });
  await browser.close();
})();

// 用瀏覽器大致模擬 Lens Studio 裡的版面，輸出預覽圖（相機畫面用剪影代替；只是示意，字級與換行以 Lens Studio 為準）
// 用法：node tools/preview.js <輸出png>
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "../Assets/PurpleButterfly");
const DATA = require(path.join(ROOT, "Scripts/QuizData.js"));
const { createGame } = require(path.join(ROOT, "Scripts/GameLogic.js"));

const R = {
  topbar: [0, 0, 1, 0.14], title: [0.06, 0.03, 0.58, 0.075], progress: [0.58, 0.03, 0.94, 0.075],
  banner: [0.03, 0.085, 0.97, 0.25],
  plateO: [0.08, 0.70, 0.48, 0.885], plateX: [0.52, 0.70, 0.92, 0.885],
  labelO: [0.08, 0.89, 0.48, 0.935], labelX: [0.52, 0.89, 0.92, 0.935],
  badge: [0.38, 0.495, 0.62, 0.60], next: [0.20, 0.87, 0.80, 0.95],
  cardIntro: [0.06, 0.47, 0.94, 0.83], introTitle: [0.10, 0.48, 0.90, 0.55], introBody: [0.10, 0.56, 0.90, 0.82],
  cardFeedback: [0.06, 0.60, 0.94, 0.84], fbTitle: [0.10, 0.608, 0.90, 0.67], fbBody: [0.10, 0.675, 0.90, 0.832],
  cardResult: [0.06, 0.64, 0.94, 0.85], resTitle: [0.10, 0.648, 0.90, 0.72], resBody: [0.10, 0.725, 0.90, 0.842],
  overlay: [0.18, 0.22, 0.82, 0.55] // 示意「臉」的位置
};
const inset = (r, fx, fy) => { const w = r[2] - r[0], h = r[3] - r[1]; return [r[0] + w * fx, r[1] + h * fy, r[2] - w * fx, r[3] - h * fy]; };
const img = (f) => "file://" + path.join(ROOT, "Art", f);
const box = (r) => `left:${r[0] * 100}%;top:${r[1] * 100}%;width:${(r[2] - r[0]) * 100}%;height:${(r[3] - r[1]) * 100}%`;
const I = (r, f, extra = "") => `<img class="a f" style="${box(r)}${extra}" src="${img(f)}">`;
const Tx = (r, cls, txt, color) => `<div class="t ${cls}" style="${box(r)}${color ? ";color:" + color : ""}">${String(txt).replace(/\n/g, "<br>")}</div>`;

const camera = `<svg class="cam" viewBox="0 0 360 780" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ea6a0"/><stop offset="1" stop-color="#4c5d63"/></linearGradient></defs>
<rect width="360" height="780" fill="url(#g)"/><rect x="0" y="560" width="360" height="220" fill="#3a4448" opacity=".6"/>
<ellipse cx="180" cy="520" rx="150" ry="120" fill="#2e3a40"/><ellipse cx="180" cy="300" rx="62" ry="76" fill="#d9b59b"/><path d="M118 285 C120 215 240 215 242 285 C220 250 140 250 118 285Z" fill="#2b2420"/>
<circle cx="158" cy="305" r="5" fill="#2b2420"/><circle cx="202" cy="305" r="5" fill="#2b2420"/><path d="M162 340 Q180 352 198 340" stroke="#8a5a4a" stroke-width="4" fill="none" stroke-linecap="round"/>
<text x="180" y="770" font-size="12" fill="#fff" opacity=".6" text-anchor="middle" font-family="sans-serif">（示意：相機畫面）</text></svg>`;

function screen(v) {
  let h = `<div class="s">${camera}`;
  h += I(R.topbar, "ui_topbar.png", ";object-fit:fill");
  h += Tx(R.title, "l o", DATA.title) + Tx(R.progress, "r o sm", v.progress, "#dccdff");
  if (v.questionIndex >= 0) h += I(R.banner, DATA.questions[v.questionIndex].banner);
  if (v.resultImage) h += I(R.overlay, v.resultImage);
  const hasCard = ["intro", "feedback", "result"].includes(v.phase);
  const cardR = v.phase === "intro" ? R.cardIntro : v.phase === "feedback" ? R.cardFeedback : R.cardResult;
  const tR = v.phase === "intro" ? R.introTitle : v.phase === "feedback" ? R.fbTitle : R.resTitle;
  const bR = v.phase === "intro" ? R.introBody : v.phase === "feedback" ? R.fbBody : R.resBody;
  if (hasCard) {
    h += `<img class="a" style="${box(cardR)};object-fit:fill" src="${img("ui_card.png")}">`;
    const col = v.phase === "intro" ? "#ffe680" : v.phase === "feedback" ? (v.feedbackGood ? "#99f5bd" : "#ffb885") : (v.win ? "#ffe680" : "#ffb885");
    h += Tx(tR, "c big", v.title, col) + Tx(bR, "l", v.body);
  }
  if (v.showAnswers) {
    h += I(R.plateO, "ui_plate.png") + I(R.plateX, "ui_plate.png");
    h += I(inset(R.plateO, 0.12, 0.12), "ans_o.png") + I(inset(R.plateX, 0.12, 0.12), "ans_x.png");
    h += Tx(R.labelO, "c o", "正確") + Tx(R.labelX, "c o", "錯誤");
  }
  if (v.phase === "feedback") h += I(R.badge, v.feedbackGood ? "icon_good.png" : "icon_bad.png");
  if (v.nextLabel) h += `<img class="a" style="${box(R.next)};object-fit:fill" src="${img("ui_btn_next.png")}">` + Tx(inset(R.next, 0.06, 0.1), "c", v.nextLabel);
  return h + "</div>";
}

(async () => {
  const views = [];
  let g = createGame(DATA);
  views.push(g.getView());                         // 開場
  g.next(); views.push(g.getView());               // 第 1 題
  g.choose(0); views.push(g.getView());            // 回饋（答對）
  g.next(); g.choose(0); views.push(g.getView());  // 第 2 題答錯的回饋
  g.next(); g.choose(0); g.next(); views.push(g.getView()); // 結果（牛糞）
  g = createGame(DATA); g.next();
  [0, 1, 0].forEach((c) => { g.choose(c); g.next(); });
  views.push(g.getView());                         // 結果（紫斑蝶）
  const html = `<html><head><style>
@font-face{font-family:NT;src:url("file://${path.join(ROOT, "Fonts/NotoSansTC-Medium-subset.ttf")}")}
body{margin:0;background:#222;display:flex;gap:16px;padding:16px;font-family:NT}
.s{position:relative;width:360px;height:780px;overflow:hidden;border-radius:28px;flex:none;background:#000}
.cam{position:absolute;inset:0;width:100%;height:100%}
.a{position:absolute}.f{object-fit:contain}
.o{text-shadow:0 0 3px #0d0826,0 0 3px #0d0826,0 0 2px #0d0826}
.t{position:absolute;display:flex;align-items:center;color:#fff;line-height:1.25;overflow:hidden;font-size:22px}
.t.l{justify-content:flex-start;text-align:left}.t.r{justify-content:flex-end;text-align:right}.t.c{justify-content:center;text-align:center}
.big{font-size:30px}.sm{font-size:18px}
</style></head><body>${views.map(screen).join("")}</body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 16 + views.length * 376, height: 812 } });
  const tmp = path.join(require("os").tmpdir(), "pb_preview.html");
  fs.writeFileSync(tmp, html);
  await page.goto("file://" + tmp);
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll(".t").forEach((el) => {
      let s = parseFloat(getComputedStyle(el).fontSize);
      while ((el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) && s > 8) { s -= 1; el.style.fontSize = s + "px"; }
    });
  });
  await page.screenshot({ path: process.argv[2] || "preview.png" });
  await browser.close();
})();

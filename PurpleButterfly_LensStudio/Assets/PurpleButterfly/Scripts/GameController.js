// 紫蝶奇遇記 — Lens Studio 5.x 控制腳本
// 這個腳本會在執行時自動建立整個介面（背景、圖示、按鈕、文字、能量條），
// 圖片與字型用 requireAsset 從 ../Art 與 ../Fonts 載入。
//
// 你只需要做一件事：把場景裡任一個 Screen Image 拖到下面的 Template Image 欄位。
// 腳本會複製它的材質來顯示所有圖片，然後把它隱藏起來。

//@input Component.Image templateImage {"label":"Template Image (任一個 Screen Image)"}
//@input bool includeBonusLevel = true {"label":"包含第 4 關（遷徙）"}
//@input bool shuffleChoices = true {"label":"隨機排列選項"}
//@input Asset.Font fontOverride {"label":"字型（選填，不填就用內建的 Noto Sans TC）"}

var DATA = require("./QuizData.js");
var Logic = require("./GameLogic.js");

var ART_DIR = "../Art/";
var FONT_PATH = "../Fonts/NotoSansTC-Medium-subset.ttf";

var LOG = "[紫蝶奇遇記] ";

if (!script.templateImage) {
  print(LOG + "請先把任一個 Screen Image 拖到 GameController 的 Template Image 欄位。");
  return;
}

var game = Logic.createGame(DATA, {
  includeBonusLevel: script.includeBonusLevel,
  shuffleChoices: script.shuffleChoices
});

// ───────────── 工具 ─────────────
function loadAsset(path) {
  try {
    return requireAsset(path);
  } catch (e) {
    print(LOG + "找不到資源：" + path + "（" + e + "）");
    return null;
  }
}

// 以「螢幕比例（左上為 0,0）」描述位置 → ScreenTransform 的 anchors（-1..1，y 向上）
function rectToAnchors(r) {
  var left = r[0] * 2 - 1;
  var right = r[2] * 2 - 1;
  var top = 1 - r[1] * 2;
  var bottom = 1 - r[3] * 2;
  return Rect.create(left, right, bottom, top);
}

var tplImage = script.templateImage;
var tplObject = tplImage.getSceneObject();
var baseMaterial = tplImage.mainMaterial;
var renderLayer = tplObject.layer;

var font = script.fontOverride || loadAsset(FONT_PATH);

var root = global.scene.createSceneObject("PurpleButterfly UI");
if (tplObject.getParent()) root.setParent(tplObject.getParent());
root.layer = renderLayer;
var rootTransform = root.createComponent("Component.ScreenTransform");
rootTransform.anchors = Rect.create(-1, 1, -1, 1);

var textures = {};
function getTexture(name) {
  if (textures[name] === undefined) {
    textures[name] = loadAsset(ART_DIR + name);
  }
  return textures[name];
}

// 元素：{ obj, transform, rect, image?, text? }
function makeObject(name, rect) {
  var obj = global.scene.createSceneObject(name);
  obj.setParent(root);
  obj.layer = renderLayer;
  var st = obj.createComponent("Component.ScreenTransform");
  st.anchors = rectToAnchors(rect);
  return { obj: obj, transform: st, rect: rect };
}

function makeImage(name, rect, file, fit) {
  var el = makeObject(name, rect);
  var img = el.obj.createComponent("Component.Image");
  var mat = baseMaterial.clone();
  img.addMaterial(mat);
  mat.mainPass.baseTex = getTexture(file);
  img.stretchMode = fit ? StretchMode.Fit : StretchMode.Stretch;
  el.image = img;
  return el;
}

var WHITE = new vec4(1, 1, 1, 1);
var LAVENDER = new vec4(0.82, 0.76, 1, 1);
var GOOD = new vec4(0.6, 0.96, 0.74, 1);
var BAD = new vec4(1, 0.72, 0.52, 1);

function makeText(name, rect, size, hAlign, color, outline) {
  var el = makeObject(name, rect);
  var t = el.obj.createComponent("Component.Text");
  if (font) t.font = font;
  t.size = size;
  try { t.horizontalOverflow = HorizontalOverflow.Wrap; } catch (e) {}
  try { t.verticalOverflow = VerticalOverflow.Shrink; } catch (e) {}
  try { t.verticalAlignment = VerticalAlignment.Center; } catch (e) {}
  try {
    t.horizontalAlignment = hAlign === "left" ? HorizontalAlignment.Left
      : hAlign === "right" ? HorizontalAlignment.Right
      : HorizontalAlignment.Center;
  } catch (e) {}
  try { t.textFill.color = color || WHITE; } catch (e) {}
  if (outline) {
    try {
      t.outlineSettings.enabled = true;
      t.outlineSettings.size = 0.2;
      t.outlineSettings.fill.color = new vec4(0.05, 0.03, 0.15, 0.95);
    } catch (e) {}
  }
  el.text = t;
  return el;
}

function setRect(el, rect) {
  el.rect = rect;
  el.transform.anchors = rectToAnchors(rect);
}

function setColor(el, color) {
  try { el.text.textFill.color = color; } catch (e) {}
}

function show(el, on) {
  el.obj.enabled = !!on;
}

// ───────────── 版面（螢幕比例）─────────────
var R = {
  icon: [0.05, 0.035, 0.155, 0.092],
  header: [0.17, 0.042, 0.64, 0.086],
  progress: [0.62, 0.042, 0.94, 0.086],
  mascot: [0.05, 0.098, 0.155, 0.152],
  barTrack: [0.17, 0.112, 0.64, 0.138],
  energyText: [0.65, 0.098, 0.95, 0.152],
  badge: [0.36, 0.145, 0.64, 0.275],
  title: [0.07, 0.305, 0.93, 0.372],
  cardShort: [0.06, 0.385, 0.94, 0.60],
  cardTall: [0.06, 0.385, 0.94, 0.835],
  bodyShort: [0.11, 0.395, 0.89, 0.59],
  bodyTall: [0.11, 0.397, 0.89, 0.825],
  bodySplitTop: [0.11, 0.393, 0.89, 0.47],
  feedbackSplit: [0.11, 0.475, 0.89, 0.826],
  choices: [
    [0.06, 0.625, 0.94, 0.725],
    [0.06, 0.74, 0.94, 0.84],
    [0.06, 0.855, 0.94, 0.955]
  ],
  next: [0.20, 0.865, 0.80, 0.945]
};

// ───────────── 建立介面（越後面建立的越在上層）─────────────
var BG_FILES = {
  title: "bg_title.jpg", test: "bg_test.jpg", result: "bg_result.jpg",
  l1: "bg_l1.jpg", l2: "bg_l2.jpg", l3: "bg_l3.jpg", l4: "bg_l4.jpg"
};
var ICON_FILES = {
  hero: "icon_hero.png", test: "icon_test.png",
  l1: "icon_l1.png", l2: "icon_l2.png", l3: "icon_l3.png", l4: "icon_l4.png"
};

var bgs = {};
var icons = {};
var key;
for (key in BG_FILES) bgs[key] = makeImage("bg_" + key, [0, 0, 1, 1], BG_FILES[key], false);

var headerText = makeText("Header", R.header, 40, "left", LAVENDER, true);
var progressText = makeText("Progress", R.progress, 40, "right", LAVENDER, true);

var mascot = makeImage("Mascot", R.mascot, "mascot.png", true);
var barTrack = makeImage("EnergyTrack", R.barTrack, "ui_bar_track.png", false);
var barFill = makeImage("EnergyFill", R.barTrack, "ui_bar_fill.png", false);
var energyText = makeText("EnergyText", R.energyText, 44, "right", WHITE, true);

for (key in ICON_FILES) icons[key] = makeImage("icon_" + key, R.icon, ICON_FILES[key], true);
var badges = {
  good: makeImage("badge_good", R.badge, "icon_good.png", true),
  bad: makeImage("badge_bad", R.badge, "icon_bad.png", true)
};

var titleText = makeText("Title", R.title, 72, "center", WHITE, true);
var card = makeImage("Card", R.cardShort, "ui_card.png", false);
var bodyText = makeText("Body", R.bodyShort, 52, "left", WHITE);
var feedbackText = makeText("Feedback", R.feedbackSplit, 52, "left", WHITE);

var choiceButtons = [];
var choiceLabels = [];
for (var i = 0; i < 3; i++) {
  choiceButtons.push(makeImage("ChoiceButton" + i, R.choices[i], "ui_btn.png", false));
  var inner = [R.choices[i][0] + 0.05, R.choices[i][1] + 0.008, R.choices[i][2] - 0.05, R.choices[i][3] - 0.008];
  choiceLabels.push(makeText("ChoiceLabel" + i, inner, 48, "left", WHITE));
}
var nextButton = makeImage("NextButton", R.next, "ui_btn_next.png", false);
var nextLabel = makeText("NextLabel", [R.next[0] + 0.04, R.next[1] + 0.006, R.next[2] - 0.04, R.next[3] - 0.006], 52, "center", WHITE);

// 能量條填滿比例
function setEnergyBar(pct) {
  var r = R.barTrack;
  var right = r[0] + (r[2] - r[0]) * Math.max(0, Math.min(1, pct));
  setRect(barFill, [r[0], r[1], Math.max(right, r[0] + 0.001), r[3]]);
  show(barFill, pct > 0.015);
}

// ───────────── 畫面更新 ─────────────
function chooseBackground(v) {
  if (v.phase === "intro") return "title";
  if (v.phase === "test" || v.phase === "testFeedback") return "test";
  if (v.phase === "result") return "result";
  return "l" + v.levelId;
}

function chooseIcon(v) {
  if (v.phase === "intro" || v.phase === "result") return "hero";
  if (v.phase === "test" || v.phase === "testFeedback") return "test";
  return "l" + v.levelId;
}

// 答對 / 答錯的大徽章（只在回饋畫面顯示）
function chooseBadge(v) {
  if (v.phase === "feedback" || v.phase === "testFeedback") return v.feedbackGood ? "good" : "bad";
  return null;
}

var currentView = null;

function render() {
  var v = game.getView();
  currentView = v;

  var bgKey = chooseBackground(v);
  var iconKey = chooseIcon(v);
  for (var k in bgs) show(bgs[k], k === bgKey);
  for (var k2 in icons) show(icons[k2], k2 === iconKey);
  var badgeKey = chooseBadge(v);
  show(badges.good, badgeKey === "good");
  show(badges.bad, badgeKey === "bad");

  headerText.text.text = v.header;
  progressText.text.text = v.progress;
  titleText.text.text = v.title;

  // 能量
  show(mascot, v.showEnergy);
  show(barTrack, v.showEnergy);
  show(energyText, v.showEnergy);
  if (v.showEnergy) {
    var d = v.energyDelta;
    energyText.text.text = "能量 " + v.energy + (d > 0 ? " (+" + d + ")" : d < 0 ? " (" + d + ")" : "");
    setEnergyBar(v.energyPct);
  } else {
    show(barFill, false);
  }

  // 版面：有選項 → 短卡片；沒有選項 → 高卡片
  var hasChoices = v.choices.length > 0;
  var hasFeedback = v.feedback && v.feedback.length > 0;
  setRect(card, hasChoices ? R.cardShort : R.cardTall);

  if (hasChoices) {
    setRect(bodyText, R.bodyShort);
    bodyText.text.text = v.body;
    show(feedbackText, false);
  } else if (hasFeedback) {
    setRect(bodyText, R.bodySplitTop);
    bodyText.text.text = v.body;
    feedbackText.text.text = v.feedback;
    setColor(feedbackText, v.feedbackGood ? GOOD : BAD);
    show(feedbackText, true);
  } else {
    setRect(bodyText, R.bodyTall);
    bodyText.text.text = v.body;
    show(feedbackText, false);
  }

  for (var i = 0; i < 3; i++) {
    var on = i < v.choices.length;
    show(choiceButtons[i], on);
    show(choiceLabels[i], on);
    if (on) choiceLabels[i].text.text = String.fromCharCode(65 + i) + ".  " + v.choices[i];
  }

  var hasNext = v.nextLabel !== null && v.nextLabel !== undefined;
  show(nextButton, hasNext);
  show(nextLabel, hasNext);
  if (hasNext) nextLabel.text.text = v.nextLabel;
}

// ───────────── 觸控 ─────────────
function hit(el, p) {
  if (!el.obj.enabled) return false;
  try {
    if (typeof el.transform.containsScreenPoint === "function") {
      return el.transform.containsScreenPoint(p);
    }
  } catch (e) {}
  var r = el.rect;
  return p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3];
}

function onTouch(eventData) {
  if (!currentView) return;
  var p = eventData.getTouchPosition();
  var n = currentView.choices.length;
  for (var i = 0; i < n; i++) {
    if (hit(choiceButtons[i], p)) {
      if (game.choose(i)) render();
      return;
    }
  }
  if (currentView.nextLabel !== null && hit(nextButton, p)) {
    if (game.next()) render();
  }
}

script.createEvent("TouchStartEvent").bind(onTouch);

// 範本圖片只是用來借材質，隱藏起來
tplObject.enabled = false;
render();

// 其他腳本可讀取成績（完成率、前後測等）
script.api.getStats = function () {
  return game.getStats();
};
script.api.restart = function () {
  game.restart();
  render();
};

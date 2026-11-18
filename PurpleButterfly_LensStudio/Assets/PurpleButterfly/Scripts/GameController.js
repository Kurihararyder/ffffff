// 紫蝶奇遇記 — Lens Studio 5.x 控制腳本（三題是非題 + 視訊變身）
// 腳本會在執行時自動建立整個介面：題目圖、O / X 按鈕、回饋、變身圖片。
// 相機畫面（視訊）保持顯示在最底下，答完三題後，臉上會出現「紫斑蝶」或「牛糞」。
//
// 你只需要把場景裡任一個 Screen Image 拖到下面的 Template Image 欄位。
// 腳本會複製它的材質來顯示所有圖片，然後把它隱藏起來。

//@input Component.Image templateImage {"label":"Template Image (任一個 Screen Image)"}
//@input bool followFace = true {"label":"變身圖片跟著臉移動（找不到臉就放畫面中間）"}
//@input Asset.Font fontOverride {"label":"字型（選填，不填就用內建的 Noto Sans TC）"}
//@input Asset.Texture[] textures {"label":"圖片（選填：圖片變成粉紅格子時，把 Art 資料夾裡全部圖片拖進來）"}
//@input bool showDebug = true {"label":"顯示除錯資訊（畫面最下方）"}

var DATA = require("./QuizData.js");
var Logic = require("./GameLogic.js");

var ART_DIR = "../Art/";
var FONT_PATH = "../Fonts/NotoSansTC-Medium-subset.ttf";
var LOG = "[紫蝶奇遇記] ";

if (!script.templateImage) {
  print(LOG + "請先把任一個 Screen Image 拖到 GameController 的 Template Image 欄位。");
  return;
}

var game = Logic.createGame(DATA);

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
  return Rect.create(r[0] * 2 - 1, r[2] * 2 - 1, 1 - r[3] * 2, 1 - r[1] * 2);
}

function inset(r, fx, fy) {
  var w = r[2] - r[0], h = r[3] - r[1];
  return [r[0] + w * fx, r[1] + h * fy, r[2] - w * fx, r[3] - h * fy];
}

var tplImage = script.templateImage;
var tplObject = tplImage.getSceneObject();
var baseMaterial = tplImage.mainMaterial;
var renderLayer = tplObject.layer;
var font = script.fontOverride || loadAsset(FONT_PATH);

// UI 要掛在「相機」底下才會是全螢幕；如果直接掛在範本圖片的父物件，父物件的大小會讓整個介面縮小
function findCameraAncestor(obj) {
  var p = obj.getParent();
  while (p) {
    if (p.getComponent("Component.Camera")) return p;
    p = p.getParent();
  }
  return null;
}
var uiParent = findCameraAncestor(tplObject) || tplObject.getParent();
var chain = [];
for (var cp = tplObject.getParent(); cp; cp = cp.getParent()) chain.push(cp.name);
print(LOG + "範本圖片的父物件鏈：" + (chain.join(" < ") || "（無）") + "；UI 掛在：" + (uiParent ? uiParent.name : "（根）"));

var root = global.scene.createSceneObject("PurpleButterfly UI");
if (uiParent) root.setParent(uiParent);
root.layer = renderLayer;
var rootTransform = root.createComponent("Component.ScreenTransform");
rootTransform.anchors = Rect.create(-1, 1, -1, 1);
try { rootTransform.offsets = Rect.create(0, 0, 0, 0); } catch (e) {}

// 圖片來源：1) Inspector 的 Textures 欄位（依檔名比對） 2) requireAsset
var givenTextures = {};
if (script.textures) {
  for (var ti = 0; ti < script.textures.length; ti++) {
    var gt = script.textures[ti];
    if (gt && gt.name) givenTextures[String(gt.name).replace(/\.(png|jpe?g)$/i, "")] = gt;
  }
}
var textures = {};
var missingTextures = [];
function getTexture(name) {
  if (textures[name] === undefined) {
    var tex = givenTextures[name.replace(/\.(png|jpe?g)$/i, "")] || loadAsset(ART_DIR + name);
    textures[name] = tex || null;
    if (!tex) missingTextures.push(name);
  }
  return textures[name];
}

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
var LAVENDER = new vec4(0.86, 0.8, 1, 1);
var GOOD = new vec4(0.6, 0.96, 0.74, 1);
var BAD = new vec4(1, 0.72, 0.52, 1);
var GOLD = new vec4(1, 0.9, 0.5, 1);

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
  topbar: [0, 0, 1, 0.14],
  title: [0.06, 0.03, 0.58, 0.075],
  progress: [0.58, 0.03, 0.94, 0.075],
  banner: [0.03, 0.085, 0.97, 0.25],
  plateO: [0.08, 0.70, 0.48, 0.885],
  plateX: [0.52, 0.70, 0.92, 0.885],
  labelO: [0.08, 0.89, 0.48, 0.935],
  labelX: [0.52, 0.89, 0.92, 0.935],
  badge: [0.38, 0.495, 0.62, 0.60],
  next: [0.20, 0.87, 0.80, 0.95],
  // 說明卡片（三種高度）
  cardIntro: [0.06, 0.47, 0.94, 0.83],
  introTitle: [0.10, 0.48, 0.90, 0.55],
  introBody: [0.10, 0.56, 0.90, 0.82],
  cardFeedback: [0.06, 0.60, 0.94, 0.84],
  fbTitle: [0.10, 0.608, 0.90, 0.67],
  fbBody: [0.10, 0.675, 0.90, 0.832],
  cardResult: [0.06, 0.64, 0.94, 0.85],
  resTitle: [0.10, 0.648, 0.90, 0.72],
  resBody: [0.10, 0.725, 0.90, 0.842],
  // 變身圖片在找不到臉時的位置
  overlayFallback: [0.05, 0.22, 0.95, 0.62]
};

// ───────────── 建立介面（越後面建立的越在上層）─────────────
var topbar = makeImage("TopBar", R.topbar, "ui_topbar.png", false);
var titleText = makeText("GameTitle", R.title, 44, "left", WHITE, true);
var progressText = makeText("Progress", R.progress, 40, "right", LAVENDER, true);

var banners = [];
for (var qi = 0; qi < DATA.questions.length; qi++) {
  banners.push(makeImage("Banner" + (qi + 1), R.banner, DATA.questions[qi].banner, true));
}

// 變身圖片（紫斑蝶 / 牛糞）
var overlays = {
  "img_butterfly.png": makeImage("Overlay_Butterfly", R.overlayFallback, "img_butterfly.png", true),
  "img_dung.png": makeImage("Overlay_Dung", R.overlayFallback, "img_dung.png", true)
};

var card = makeImage("Card", R.cardIntro, "ui_card.png", false);
var cardTitle = makeText("CardTitle", R.introTitle, 60, "center", WHITE);
var cardBody = makeText("CardBody", R.introBody, 48, "left", WHITE);

var plateO = makeImage("PlateO", R.plateO, "ui_plate.png", true);
var plateX = makeImage("PlateX", R.plateX, "ui_plate.png", true);
var ansO = makeImage("AnswerO", inset(R.plateO, 0.12, 0.12), "ans_o.png", true);
var ansX = makeImage("AnswerX", inset(R.plateX, 0.12, 0.12), "ans_x.png", true);
var labelO = makeText("LabelO", R.labelO, 44, "center", WHITE, true);
var labelX = makeText("LabelX", R.labelX, 44, "center", WHITE, true);
labelO.text.text = "正確";
labelX.text.text = "錯誤";

var badges = {
  good: makeImage("Badge_Good", R.badge, "icon_good.png", true),
  bad: makeImage("Badge_Bad", R.badge, "icon_bad.png", true)
};

var nextButton = makeImage("NextButton", R.next, "ui_btn_next.png", false);
var nextLabel = makeText("NextLabel", inset(R.next, 0.06, 0.1), 52, "center", WHITE);

var statusText = makeText("Status", [0.03, 0.952, 0.97, 0.997], 30, "left", new vec4(1, 0.95, 0.4, 1), true);
var lastTouchInfo = "";

function updateStatus() {
  var lines = [];
  if (missingTextures.length > 0) {
    lines.push("找不到 " + missingTextures.length + " 張圖片：請選取 Art 資料夾內全部圖片，拖到 GameController 的 Textures 欄位");
  }
  if (!font) lines.push("字型未載入");
  if (script.showDebug && lastTouchInfo) lines.push(lastTouchInfo);
  statusText.text.text = lines.join("\n");
  show(statusText, lines.length > 0);
}

// ───────────── 臉部追蹤（找不到就用固定位置）─────────────
var perspCam = null;
var headObj = null;
var faceFound = false;
var faceBroken = false;
var overlayActive = null; // 目前顯示中的變身圖片

function findPerspectiveCamera() {
  try {
    var stack = [];
    var n = global.scene.getRootObjectsCount();
    for (var i = 0; i < n; i++) stack.push(global.scene.getRootObject(i));
    while (stack.length) {
      var o = stack.pop();
      var cam = o.getComponent("Component.Camera");
      if (cam && cam.type === Camera.Type.Perspective) return cam;
      for (var c = 0; c < o.getChildrenCount(); c++) stack.push(o.getChild(c));
    }
  } catch (e) {}
  return null;
}

if (script.followFace) {
  perspCam = findPerspectiveCamera();
  if (perspCam) {
    try {
      headObj = global.scene.createSceneObject("PurpleButterfly Head");
      var head = headObj.createComponent("Component.Head");
      head.faceIndex = 0;
    } catch (e) {
      headObj = null;
    }
  }
  if (!perspCam || !headObj) print(LOG + "找不到透視相機或無法建立臉部追蹤，變身圖片會放在畫面中間。");
}

script.createEvent("FaceFoundEvent").bind(function () { faceFound = true; });
script.createEvent("FaceLostEvent").bind(function () { faceFound = false; });

// 以臉的位置與大小算出變身圖片的螢幕位置（比例）
function faceRect() {
  var pos = headObj.getTransform().getWorldPosition();
  var camT = perspCam.getTransform();
  var p0 = perspCam.worldSpaceToScreenSpace(pos);
  var p1 = perspCam.worldSpaceToScreenSpace(pos.add(camT.right.uniformScale(15)));
  var w = Math.abs(p1.x - p0.x) * 2.6; // 臉寬約 15 公分，圖片約為臉的 2.6 倍
  var aspect = perspCam.aspect > 0 ? perspCam.aspect : 0.5;
  w = Math.max(0.25, Math.min(1.1, w));
  var h = w / aspect;
  if (!isFinite(p0.x) || !isFinite(p0.y) || !isFinite(w)) return null;
  return [p0.x - w / 2, p0.y - h / 2, p0.x + w / 2, p0.y + h / 2];
}

script.createEvent("UpdateEvent").bind(function () {
  if (!overlayActive || !headObj || !faceFound || faceBroken) return;
  try {
    var r = faceRect();
    if (r) setRect(overlayActive, r);
  } catch (e) {
    faceBroken = true;
    setRect(overlayActive, R.overlayFallback);
  }
});

// ───────────── 畫面更新 ─────────────
var currentView = null;

function render() {
  var v = game.getView();
  currentView = v;
  var phase = v.phase;

  titleText.text.text = DATA.title;
  progressText.text.text = v.progress;

  // 題目圖
  for (var i = 0; i < banners.length; i++) show(banners[i], i === v.questionIndex);

  // O / X
  show(plateO, v.showAnswers); show(plateX, v.showAnswers);
  show(ansO, v.showAnswers); show(ansX, v.showAnswers);
  show(labelO, v.showAnswers); show(labelX, v.showAnswers);

  // 答對 / 答錯徽章
  show(badges.good, phase === "feedback" && v.feedbackGood === true);
  show(badges.bad, phase === "feedback" && v.feedbackGood === false);

  // 變身圖片
  overlayActive = null;
  for (var key in overlays) {
    var on = phase === "result" && v.resultImage === key;
    show(overlays[key], on);
    if (on) {
      overlayActive = overlays[key];
      setRect(overlayActive, R.overlayFallback);
    }
  }

  // 說明卡片
  var hasCard = phase === "intro" || phase === "feedback" || phase === "result";
  show(card, hasCard);
  show(cardTitle, hasCard);
  show(cardBody, hasCard);
  if (phase === "intro") {
    setRect(card, R.cardIntro);
    setRect(cardTitle, R.introTitle);
    setRect(cardBody, R.introBody);
    setColor(cardTitle, GOLD);
  } else if (phase === "feedback") {
    setRect(card, R.cardFeedback);
    setRect(cardTitle, R.fbTitle);
    setRect(cardBody, R.fbBody);
    setColor(cardTitle, v.feedbackGood ? GOOD : BAD);
  } else if (phase === "result") {
    setRect(card, R.cardResult);
    setRect(cardTitle, R.resTitle);
    setRect(cardBody, R.resBody);
    setColor(cardTitle, v.win ? GOLD : BAD);
  }
  if (hasCard) {
    cardTitle.text.text = v.title;
    cardBody.text.text = v.body;
  }

  // 下一步按鈕
  var hasNext = v.nextLabel !== null && v.nextLabel !== undefined;
  show(nextButton, hasNext);
  show(nextLabel, hasNext);
  if (hasNext) nextLabel.text.text = v.nextLabel;
  updateStatus();
}

// ───────────── 觸控 ─────────────
function hit(el, p) {
  if (!el.obj.enabled) return false;
  try {
    if (el.transform.containsScreenPoint(p)) return true;
  } catch (e) {}
  var r = el.rect;
  return p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3];
}

script.createEvent("TouchStartEvent").bind(function (eventData) {
  if (!currentView) return;
  var p = eventData.getTouchPosition();
  var action = "沒點到按鈕";
  var acted = false;
  if (currentView.showAnswers) {
    if (hit(plateO, p)) { acted = game.choose(0); action = "選 O"; }
    else if (hit(plateX, p)) { acted = game.choose(1); action = "選 X"; }
  }
  if (!acted && currentView.nextLabel !== null && hit(nextButton, p)) {
    acted = game.next();
    action = "下一步";
  }
  lastTouchInfo = "點擊 (" + p.x.toFixed(2) + ", " + p.y.toFixed(2) + ") → " + action;
  if (acted) render(); else updateStatus();
});

// 範本圖片只是用來借材質，隱藏起來
tplObject.enabled = false;
render();

// 其他腳本可讀取成績
script.api.getStats = function () {
  return game.getStats();
};
script.api.restart = function () {
  game.restart();
  render();
};

// 執行：node tests/run-tests.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ASSET_ROOT = path.join(__dirname, "../Assets/PurpleButterfly");
const DATA = require(path.join(ASSET_ROOT, "Scripts/QuizData.js"));
const { createGame } = require(path.join(ASSET_ROOT, "Scripts/GameLogic.js"));

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("ok  " + name);
}

// ───────────── 資料 ─────────────
test("資料：三題是非題，答案依序為 O、X、O，題目圖與變身圖存在", () => {
  assert.strictEqual(DATA.questions.length, 3);
  assert.deepStrictEqual(DATA.questions.map((q) => q.answer), [true, false, true]);
  DATA.questions.forEach((q) => {
    assert(q.statement && q.explain, q.id);
    assert(fs.existsSync(path.join(ASSET_ROOT, "Art", q.banner)), "缺題目圖 " + q.banner);
  });
  [DATA.win.image, DATA.lose.image].forEach((f) => assert(fs.existsSync(path.join(ASSET_ROOT, "Art", f)), "缺變身圖 " + f));
});

// ───────────── 遊戲邏輯 ─────────────
function playAll(game, choices) {
  game.next(); // 開始
  choices.forEach((c) => { assert.strictEqual(game.getView().phase, "question"); game.choose(c); game.next(); });
  return game.getView();
}

test("流程：intro → 題目 → 回饋 → … → result", () => {
  const g = createGame(DATA);
  const phases = [g.getView().phase];
  g.next(); phases.push(g.getView().phase);
  for (let i = 0; i < 3; i++) { g.choose(0); phases.push(g.getView().phase); g.next(); phases.push(g.getView().phase); }
  assert.deepStrictEqual(phases, ["intro", "question", "feedback", "question", "feedback", "question", "feedback", "result"]);
});

test("全對（O、X、O）→ 變成紫斑蝶", () => {
  const v = playAll(createGame(DATA), [0, 1, 0]);
  assert.strictEqual(v.phase, "result");
  assert.strictEqual(v.win, true);
  assert.strictEqual(v.resultImage, "img_butterfly.png");
  assert(v.title.includes("紫斑蝶"));
});

test("只要錯一題 → 變成牛糞，並顯示答對題數", () => {
  [[1, 1, 0], [0, 0, 0], [0, 1, 1], [1, 0, 1]].forEach((c) => {
    const v = playAll(createGame(DATA), c);
    assert.strictEqual(v.win, false, c.join());
    assert.strictEqual(v.resultImage, "img_dung.png");
    assert(v.title.includes("牛糞"));
    assert(/答對 \d \/ 3/.test(v.body), v.body);
  });
  const v = playAll(createGame(DATA), [0, 0, 0]);
  assert(v.body.includes("答對 2 / 3"), v.body);
});

test("回饋：對錯與解說正確，最後一題的按鈕是「看結果」", () => {
  const g = createGame(DATA);
  g.next(); g.choose(1); // Q1 答 X（錯）
  let v = g.getView();
  assert.strictEqual(v.feedbackGood, false);
  assert.strictEqual(v.title, "答錯了");
  assert.strictEqual(v.body, DATA.questions[0].explain);
  assert.strictEqual(v.nextLabel, "下一題");
  g.next(); g.choose(1); g.next(); g.choose(0);
  assert.strictEqual(g.getView().nextLabel, "看結果");
});

test("題目圖依序顯示 0、1、2；回饋時仍顯示同一題", () => {
  const g = createGame(DATA);
  g.next();
  const idx = [];
  for (let i = 0; i < 3; i++) { idx.push(g.getView().questionIndex); g.choose(0); idx.push(g.getView().questionIndex); g.next(); }
  assert.deepStrictEqual(idx, [0, 0, 1, 1, 2, 2]);
  assert.strictEqual(g.getView().questionIndex, -1);
});

test("不能亂按：非題目階段 choose 無效；超出範圍的選項無效", () => {
  const g = createGame(DATA);
  assert.strictEqual(g.choose(0), false); // intro
  g.next();
  assert.strictEqual(g.choose(2), false);
  assert.strictEqual(g.choose(-1), false);
  assert.strictEqual(g.choose(0), true);
  assert.strictEqual(g.choose(0), false); // 已在回饋
});

test("再玩一次：result → intro，成績歸零", () => {
  const g = createGame(DATA);
  playAll(g, [0, 1, 0]);
  g.next();
  assert.strictEqual(g.getView().phase, "intro");
  assert.strictEqual(g.getStats().score, 0);
  const v = playAll(g, [1, 1, 1]);
  assert.strictEqual(v.win, false);
});

// ───────────── 素材 ─────────────
test("素材：腳本用到的每張圖與字型都存在、題目圖是透明 PNG", () => {
  const src = fs.readFileSync(path.join(ASSET_ROOT, "Scripts/GameController.js"), "utf8");
  const names = new Set();
  for (const m of src.matchAll(/"((?:ui|ans|icon|img)_[a-z_]+\.png)"/g)) names.add(m[1]);
  assert(names.size >= 8, "找到的圖片數 " + names.size);
  names.forEach((n) => assert(fs.existsSync(path.join(ASSET_ROOT, "Art", n)), "缺圖 " + n));
  assert(fs.existsSync(path.join(ASSET_ROOT, "Fonts/NotoSansTC-Medium-subset.ttf")));
  ["q1_banner.png", "q2_banner.png", "q3_banner.png", "ans_o.png", "ans_x.png"].forEach((n) => {
    const buf = fs.readFileSync(path.join(ASSET_ROOT, "Art", n));
    assert.strictEqual(buf.slice(1, 4).toString(), "PNG", n);
    assert.strictEqual(buf[25], 6, n + " 應為 RGBA（有透明）"); // IHDR color type 6
  });
});

// ───────────── 模擬 Lens Studio 環境 ─────────────
function makeLensEnv(opts) {
  opts = opts || {};
  const created = [];
  const events = {};
  function makeObj(name) {
    const obj = {
      name, enabled: true, layer: 7, parent: null, children: [], comps: {},
      setParent(p) { obj.parent = p; p.children.push(obj); },
      getParent() { return obj.parent; },
      getChildrenCount() { return obj.children.length; },
      getChild(i) { return obj.children[i]; },
      getTransform() { return obj.transform || (obj.transform = { right: { uniformScale: (n) => ({ n }) }, getWorldPosition: () => obj.worldPos || { add: (v) => ({ add: 0, v }) } }); },
      createComponent(type) {
        let c;
        if (type === "Component.ScreenTransform") {
          c = { anchors: null, containsScreenPoint(p) {
            const a = c.anchors; const x = p.x * 2 - 1, y = 1 - p.y * 2;
            return x >= a.left && x <= a.right && y >= a.bottom && y <= a.top; } };
        } else if (type === "Component.Image") {
          c = { mats: [], stretchMode: null, getSceneObject() { return obj; }, addMaterial(m) { c.mats.push(m); }, get mainMaterial() { return c.mats[0]; } };
        } else if (type === "Component.Text") {
          c = { text: "", size: 0, font: null, textFill: { color: null }, outlineSettings: { enabled: false, size: 0, fill: { color: null } } };
        } else if (type === "Component.Head") {
          if (opts.noHead) throw new Error("no head");
          c = { faceIndex: -1 };
        } else throw new Error("unknown " + type);
        obj.comps[type] = c;
        return c;
      },
      getComponent(type) { return obj.comps[type] || null; }
    };
    created.push(obj);
    return obj;
  }
  const makeMat = () => ({ mainPass: { baseTex: null }, clone() { return makeMat(); } });
  const roots = [];
  const sceneObj = (n) => { const o = makeObj(n); roots.push(o); return o; };

  const orthoCam = sceneObj("Orthographic Camera");
  const tplObj = makeObj("Template");
  tplObj.setParent(orthoCam);
  const tplImg = tplObj.createComponent("Component.Image");
  tplImg.addMaterial(makeMat());

  // 透視相機（相機畫面）
  let perspCam = null;
  if (!opts.noPerspective) {
    const camObj = sceneObj("Camera Object");
    perspCam = {
      type: "Perspective", aspect: 0.5, getTransform: () => camObj.getTransform(),
      // 簡單的投影：世界座標 x,y → 螢幕比例
      worldSpaceToScreenSpace: (p) => ({ x: 0.5 + p.x / 100, y: 0.4 - p.y / 100 })
    };
    camObj.comps["Component.Camera"] = perspCam;
    camObj.getTransform().right = { uniformScale: (n) => ({ x: n, y: 0, isRight: true }) };
  }

  const sandbox = {
    script: {
      templateImage: tplImg, followFace: opts.followFace !== false, fontOverride: null, api: {},
      createEvent: (n) => ({ bind: (f) => (events[n] = f) })
    },
    global: { scene: {
      createSceneObject: (n) => makeObj(n),
      getRootObjectsCount: () => roots.length,
      getRootObject: (i) => roots[i]
    } },
    Camera: { Type: { Perspective: "Perspective", Orthographic: "Orthographic" } },
    Rect: { create: (l, r, b, t) => ({ left: l, right: r, bottom: b, top: t }) },
    vec4: function (x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; },
    StretchMode: { Fit: "Fit", Stretch: "Stretch" },
    HorizontalOverflow: { Wrap: "Wrap" }, VerticalOverflow: { Shrink: "Shrink" },
    VerticalAlignment: { Center: "C" }, HorizontalAlignment: { Left: "L", Right: "R", Center: "C" },
    requireAsset: (p) => {
      const full = path.join(ASSET_ROOT, "Scripts", p);
      if (!fs.existsSync(full)) throw new Error("not found " + p);
      return { asset: p };
    },
    print: (m) => (opts.logs || []).push(m)
  };
  const file = path.join(ASSET_ROOT, "Scripts/GameController.js");
  const src = fs.readFileSync(file, "utf8");
  const fn = new Function(...Object.keys(sandbox), "require", src);
  fn(...Object.values(sandbox), (p) => require(path.join(path.dirname(file), p)));
  return { sandbox, created, events, tplObj, orthoCam, perspCam };
}

const byName = (env, name) => env.created.find((o) => o.name === name);
const T = (env, name) => byName(env, name).comps["Component.Text"].text;
const A = (env, name) => byName(env, name).comps["Component.ScreenTransform"].anchors;
function tap(env, x, y) { env.events.TouchStartEvent({ getTouchPosition: () => ({ x, y }) }); }
function center(env, name) {
  const a = A(env, name);
  return { x: ((a.left + a.right) / 2 + 1) / 2, y: (1 - (a.bottom + a.top) / 2) / 2 };
}
function tapOn(env, name) { const c = center(env, name); tap(env, c.x, c.y); }

test("介面：建立完成、範本圖片被隱藏、UI 掛在範本的父物件下", () => {
  const env = makeLensEnv();
  assert.strictEqual(env.tplObj.enabled, false);
  const root = byName(env, "PurpleButterfly UI");
  assert.strictEqual(root.parent, env.orthoCam);
  root.children.forEach((c) => assert.strictEqual(c.layer, 7, c.name + " layer"));
  // 開場：沒有背景圖遮住相機（沒有全螢幕不透明圖片）
  assert.strictEqual(byName(env, "Card").enabled, true);
  assert.strictEqual(T(env, "CardTitle"), "你能變成紫斑蝶嗎？");
  assert.strictEqual(T(env, "NextLabel"), "開始");
  assert.strictEqual(byName(env, "PlateO").enabled, false);
  assert.strictEqual(byName(env, "Banner1").enabled, false);
});

test("介面：沒有全螢幕的圖片，相機畫面不會被蓋住", () => {
  const env = makeLensEnv();
  const root = byName(env, "PurpleButterfly UI");
  const full = root.children.filter((c) => {
    const a = c.comps["Component.ScreenTransform"].anchors;
    return c.comps["Component.Image"] && (a.right - a.left) >= 1.9 && (a.top - a.bottom) >= 1.9;
  });
  assert.strictEqual(full.length, 0, full.map((f) => f.name).join());
});

test("介面：點 O / X 作答，依序顯示三張題目圖，答對顯示綠色徽章", () => {
  const env = makeLensEnv();
  tapOn(env, "NextButton"); // 開始
  assert.strictEqual(byName(env, "Banner1").enabled, true);
  assert.strictEqual(byName(env, "Banner2").enabled, false);
  assert.strictEqual(byName(env, "PlateO").enabled, true);
  assert.strictEqual(T(env, "Progress"), "第 1 / 3 題");
  assert.strictEqual(byName(env, "NextButton").enabled, false);
  tapOn(env, "PlateO"); // Q1 = O → 對
  assert.strictEqual(byName(env, "Badge_Good").enabled, true);
  assert.strictEqual(byName(env, "Badge_Bad").enabled, false);
  assert.strictEqual(byName(env, "PlateO").enabled, false);
  assert.strictEqual(T(env, "CardTitle"), "答對了！");
  assert.strictEqual(byName(env, "Banner1").enabled, true);
  tapOn(env, "NextButton");
  assert.strictEqual(byName(env, "Banner2").enabled, true);
  tapOn(env, "PlateO"); // Q2 答 O → 錯
  assert.strictEqual(byName(env, "Badge_Bad").enabled, true);
  assert.strictEqual(T(env, "CardTitle"), "答錯了");
});

test("介面：點在空白處沒有反應", () => {
  const env = makeLensEnv();
  tapOn(env, "NextButton");
  tap(env, 0.5, 0.45);
  assert.strictEqual(T(env, "Progress"), "第 1 / 3 題");
  assert.strictEqual(byName(env, "PlateO").enabled, true);
});

function playTaps(env, answers) {
  tapOn(env, "NextButton");
  answers.forEach((a) => { tapOn(env, a === 0 ? "PlateO" : "PlateX"); tapOn(env, "NextButton"); });
}

test("結果：全對 → 紫斑蝶圖片，卡片顯示勝利文字；錯 → 牛糞圖片", () => {
  let env = makeLensEnv({ followFace: false });
  playTaps(env, [0, 1, 0]);
  assert.strictEqual(byName(env, "Overlay_Butterfly").enabled, true);
  assert.strictEqual(byName(env, "Overlay_Dung").enabled, false);
  assert.strictEqual(T(env, "CardTitle"), "你變成紫斑蝶了！");
  assert.strictEqual(T(env, "NextLabel"), "再玩一次");
  env = makeLensEnv({ followFace: false });
  playTaps(env, [0, 0, 0]);
  assert.strictEqual(byName(env, "Overlay_Dung").enabled, true);
  assert.strictEqual(byName(env, "Overlay_Butterfly").enabled, false);
  assert(T(env, "CardTitle").includes("牛糞"));
  assert(T(env, "CardBody").includes("答對 2 / 3"));
  tapOn(env, "NextButton"); // 再玩一次
  assert.strictEqual(T(env, "CardTitle"), "你能變成紫斑蝶嗎？");
  assert.strictEqual(byName(env, "Overlay_Dung").enabled, false);
});

test("臉部追蹤：找到臉時，變身圖片跟著臉；沒找到臉時放畫面中間", () => {
  const env = makeLensEnv();
  playTaps(env, [0, 1, 0]);
  const fb = JSON.stringify(A(env, "Overlay_Butterfly"));
  // 沒有 FaceFound → 仍是預設位置
  env.events.UpdateEvent();
  assert.strictEqual(JSON.stringify(A(env, "Overlay_Butterfly")), fb);
  // 臉出現在 (0.6, 0.3)：頭的世界座標 x=10,y=10（模擬投影：x=0.5+x/100, y=0.4-y/100）
  const head = byName(env, "PurpleButterfly Head");
  head.getTransform().getWorldPosition = () => ({ x: 10, y: 10, add: (v) => ({ x: 10 + v.x, y: 10, add: 0 }) });
  env.events.FaceFoundEvent();
  env.events.UpdateEvent();
  const c = center(env, "Overlay_Butterfly");
  assert(Math.abs(c.x - 0.6) < 0.01 && Math.abs(c.y - 0.3) < 0.01, JSON.stringify(c));
  // 臉消失 → 停止更新（保持上一個位置，不會出錯）
  env.events.FaceLostEvent();
  env.events.UpdateEvent();
});

test("臉部追蹤：找不到透視相機或無法建立 Head 時不會當機，改用預設位置", () => {
  [{ noPerspective: true }, { noHead: true }].forEach((o) => {
    const logs = [];
    const env = makeLensEnv(Object.assign({ logs }, o));
    playTaps(env, [0, 1, 0]);
    env.events.FaceFoundEvent();
    env.events.UpdateEvent();
    assert.strictEqual(byName(env, "Overlay_Butterfly").enabled, true);
    assert(logs.some((l) => l.includes("變身圖片會放在畫面中間")), JSON.stringify(logs));
  });
});

test("沒有接 Template Image 時只印提示，不會當機", () => {
  const src = fs.readFileSync(path.join(ASSET_ROOT, "Scripts/GameController.js"), "utf8");
  const msgs = [];
  const fn = new Function("script", "print", "require", src);
  fn({ templateImage: null, api: {} }, (m) => msgs.push(m), () => ({ createGame: () => ({}) }));
  assert(msgs[0].includes("Template Image"));
});

console.log("\n全部 " + passed + " 項測試通過");

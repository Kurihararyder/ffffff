// 執行：node tests/run-tests.js
const assert = require("assert");
const path = require("path");
const Module = require("module");
const DATA = require("../Assets/PurpleButterfly/Scripts/QuizData");
const { createGame } = require("../Assets/PurpleButterfly/Scripts/GameLogic");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("ok  " + name);
}

// 讓腳本永遠選「最佳」或「最差」選項
function pickIndex(view, game, mode) {
  // 以文字比對題庫，找出最佳/最差選項在畫面上的位置
  const pools = [];
  DATA.levels.forEach((l) => l.steps.forEach((s) => pools.push(s.choices)));
  const pool = pools.find((c) => view.choices.every((t) => c.some((x) => x.text === t)) && c.length === view.choices.length);
  if (!pool) throw new Error("找不到題目: " + view.choices.join("|"));
  const scored = view.choices.map((t, i) => ({ i, d: pool.find((x) => x.text === t).delta }));
  scored.sort((a, b) => (mode === "best" ? b.d - a.d : a.d - b.d));
  return scored[0].i;
}

function testIndex(view, mode) {
  const t = DATA.tests.find((x) => view.body === x.question);
  const correctText = t.options[t.answer];
  const ci = view.choices.indexOf(correctText);
  if (mode === "best") return ci;
  return ci === 0 ? 1 : 0;
}

function play(game, qMode, tMode, opts) {
  opts = opts || {};
  let guard = 0;
  const seen = [];
  while (guard++ < 500) {
    const v = game.getView();
    seen.push(v.phase);
    if (v.phase === "result") return { view: v, seen };
    if (v.phase === "question") game.choose(pickIndex(v, game, qMode));
    else if (v.phase === "test") game.choose(testIndex(v, tMode));
    else game.next();
    if (opts.stopAtGameOver && game.getView().phase === "gameOver") return { view: game.getView(), seen };
  }
  throw new Error("死循環");
}

test("資料：每題恰好一個最佳選項、選項 2~3 個、題文不為空", () => {
  DATA.levels.forEach((l) =>
    l.steps.forEach((s) => {
      assert(s.choices.length >= 2 && s.choices.length <= 3, s.id);
      assert.strictEqual(s.choices.filter((c) => c.good).length, 1, s.id + " 最佳選項數");
      s.choices.forEach((c) => {
        assert(c.text && c.feedback, s.id);
        assert(c.good ? c.delta > 0 : c.delta < 0, s.id + " good/delta 不一致");
      });
    })
  );
  assert.strictEqual(DATA.tests.length, 3);
  DATA.tests.forEach((t) => assert(t.options.length === 3 && t.answer >= 0 && t.answer < 3));
});

test("PDF 範例：開花蜜源 60→75，無花草地 60→50", () => {
  const g = createGame(DATA, { shuffleChoices: false, includeBonusLevel: false });
  // 跳到第 2 關第 1 題：用前測與第 1 關最佳選項 +30 會超出，所以直接檢查資料
  const s = DATA.levels[1].steps[0];
  assert.strictEqual(DATA.meta.startEnergy + s.choices[0].delta, 75);
  assert.strictEqual(DATA.meta.startEnergy + s.choices[1].delta, 50);
  assert(g);
});

test("全選最佳：到結果頁、能量 >= 80、後測滿分、第4關出現", () => {
  const g = createGame(DATA, { shuffleChoices: true });
  const { view, seen } = play(g, "best", "best");
  assert.strictEqual(view.title, "紫蝶生存高手");
  assert(view.body.includes("前測 3 / 3"));
  assert(view.body.includes("後測 3 / 3"));
  assert(seen.indexOf("test") < seen.indexOf("levelIntro"), "前測先於關卡");
  assert.strictEqual(g.getStats().log.filter((x) => x.step.startsWith("4-")).length, 2);
});

test("includeBonusLevel=false：沒有第 4 關", () => {
  const g = createGame(DATA, { includeBonusLevel: false });
  play(g, "best", "best");
  assert.strictEqual(g.getStats().log.filter((x) => x.step.startsWith("4-")).length, 0);
});

test("分支：能量 >= 70 走 2-2a；< 70 走 2-2b", () => {
  // 高能量路徑
  let g = createGame(DATA, { shuffleChoices: false, includeBonusLevel: false });
  play(g, "best", "best");
  let ids = g.getStats().log.map((x) => x.step);
  assert(ids.includes("2-2a") && !ids.includes("2-2b"), ids.join());
  // 低能量：第 1 關全對 → 75，2-1 選壞選項 -10 → 65 < 70 走 2b；
  // 
  g = createGame(DATA, { shuffleChoices: false, includeBonusLevel: false });
  let flagged = false;
  let guard = 0;
  while (guard++ < 300) {
    const v = g.getView();
    if (v.phase === "result") break;
    if (v.phase === "question") {
      const isStep21 = v.body === DATA.levels[1].steps[0].scenario;
      g.choose(pickIndex(v, g, isStep21 ? "worst" : "best"));
      if (isStep21) flagged = true;
    } else if (v.phase === "test") g.choose(testIndex(v, "best"));
    else g.next();
  }
  assert(flagged);
  ids = g.getStats().log.map((x) => x.step);
  assert(ids.includes("2-2b") && !ids.includes("2-2a"), ids.join());
});

test("全選最差：會在某關能量耗盡 → gameOver → 重來回到本關開頭", () => {
  const g = createGame(DATA, { shuffleChoices: true });
  const { view } = play(g, "worst", "worst", { stopAtGameOver: true });
  assert.strictEqual(view.phase, "gameOver");
  assert.strictEqual(g.getStats().energy, 0);
  g.next();
  assert.strictEqual(g.getView().phase, "levelIntro");
  assert(g.getStats().energy > 0, "重來後能量應回復到進入本關時");
});

test("前測不顯示解說；後測顯示解說", () => {
  const g = createGame(DATA, { shuffleChoices: false });
  g.next(); // intro → 前測
  assert.strictEqual(g.getView().phase, "test");
  g.choose(0);
  assert.strictEqual(g.getView().phase, "test"); // 直接下一題，沒有 testFeedback
  g.choose(0);
  g.choose(0);
  assert.strictEqual(g.getView().phase, "levelIntro");
});

test("前後測可比較：前測全錯、後測全對 → 進步 3 題", () => {
  const g = createGame(DATA, { includeBonusLevel: false });
  // 前測故意答錯
  g.next();
  for (let i = 0; i < 3; i++) g.choose(testIndex(g.getView(), "worst"));
  let guard = 0;
  while (g.getView().phase !== "test" || g.getStats().pre === undefined) {
    const v = g.getView();
    if (guard++ > 300) throw new Error("loop");
    if (v.phase === "question") g.choose(pickIndex(v, g, "best"));
    else if (v.phase === "test") break;
    else g.next();
  }
  for (let i = 0; i < 3; i++) {
    g.choose(testIndex(g.getView(), "best"));
    g.next();
  }
  const v = g.getView();
  assert.strictEqual(v.phase, "result");
  assert(v.body.includes("前測 0 / 3") && v.body.includes("後測 3 / 3") && v.body.includes("進步 3 題"), v.body);
});

test("洗牌：最佳選項不會總是在同一個位置", () => {
  const positions = new Set();
  for (let k = 0; k < 40; k++) {
    const g = createGame(DATA, { includeBonusLevel: false });
    g.next();
    for (let i = 0; i < 3; i++) g.choose(0);
    g.next(); // levelIntro → 第 1 題
    const v = g.getView();
    positions.add(v.choices.indexOf("盤龍木的葉子"));
  }
  assert(positions.size >= 2, "位置沒有變化");
});

test("畫面文字長度合理（單一字串 <= 120 字）", () => {
  const g = createGame(DATA, { shuffleChoices: false });
  const lens = [];
  let guard = 0;
  while (guard++ < 500) {
    const v = g.getView();
    [v.title, v.body, v.feedback, ...v.choices].forEach((s) => lens.push(s.length));
    if (v.phase === "result") break;
    if (v.phase === "question") g.choose(pickIndex(v, g, "best"));
    else if (v.phase === "test") g.choose(testIndex(v, "best"));
    else g.next();
  }
  assert(Math.max.apply(null, lens) <= 120, "最長 " + Math.max.apply(null, lens));
});

// ── 模擬 Lens Studio 環境，載入 GameController ──
const fs = require("fs");
const ASSET_ROOT = path.join(__dirname, "../Assets/PurpleButterfly");

function makeLensEnv(opts) {
  opts = opts || {};
  const created = [];
  const events = {};
  function makeObj(name) {
    const obj = {
      name, enabled: true, layer: 7, parent: null, children: [], comps: {},
      setParent(p) { obj.parent = p; p.children.push(obj); },
      getParent() { return obj.parent; },
      createComponent(type) {
        let c;
        if (type === "Component.ScreenTransform") {
          c = { anchors: null, containsScreenPoint(p) {
            const a = c.anchors; const x = p.x * 2 - 1, y = 1 - p.y * 2;
            return x >= a.left && x <= a.right && y >= a.bottom && y <= a.top; } };
        } else if (type === "Component.Image") {
          c = { mats: [], stretchMode: null, getSceneObject() { return obj; }, addMaterial(m) { c.mats.push(m); }, get mainMaterial() { return c.mats[0]; } };
        } else if (type === "Component.Text") {
          c = { text: "", size: 0, font: null, textFill: { color: null },
            outlineSettings: { enabled: false, size: 0, fill: { color: null } } };
        } else throw new Error("unknown " + type);
        obj.comps[type] = c;
        return c;
      },
      getComponent(type) { return obj.comps[type]; }
    };
    created.push(obj);
    return obj;
  }
  const makeMat = () => ({ mainPass: { baseTex: null }, clone() { return makeMat(); } });
  const tplObj = makeObj("Template");
  const camera = makeObj("Orthographic Camera");
  tplObj.setParent(camera);
  const tplImg = tplObj.createComponent("Component.Image");
  tplImg.addMaterial(makeMat());

  const loaded = [];
  const sandbox = {
    script: {
      templateImage: tplImg, includeBonusLevel: true, shuffleChoices: false, fontOverride: null, api: {},
      createEvent: (n) => ({ bind: (f) => (events[n] = f) })
    },
    global: { scene: { createSceneObject: (n) => makeObj(n) } },
    Rect: { create: (l, r, b, t) => ({ left: l, right: r, bottom: b, top: t }) },
    vec4: function (x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; },
    StretchMode: { Fit: "Fit", Stretch: "Stretch" },
    HorizontalOverflow: { Wrap: "Wrap" }, VerticalOverflow: { Shrink: "Shrink" },
    VerticalAlignment: { Center: "C" }, HorizontalAlignment: { Left: "L", Right: "R", Center: "C" },
    requireAsset: (p) => {
      const full = path.join(ASSET_ROOT, "Scripts", p);
      if (!fs.existsSync(full)) throw new Error("not found " + p);
      loaded.push(p);
      return { asset: p };
    },
    print: () => {}
  };
  const file = path.join(ASSET_ROOT, "Scripts/GameController.js");
  const src = fs.readFileSync(file, "utf8");
  const fn = new Function(...Object.keys(sandbox), "require", src);
  fn(...Object.values(sandbox), (p) => require(path.join(path.dirname(file), p)));
  return { sandbox, created, events, tplObj, loaded, camera };
}

function byName(env, name) { return env.created.find((o) => o.name === name); }
function tap(env, x, y) { env.events.TouchStartEvent({ getTouchPosition: () => ({ x, y }) }); }
function center(obj) {
  const a = obj.comps["Component.ScreenTransform"].anchors;
  return { x: ((a.left + a.right) / 2 + 1) / 2, y: (1 - (a.bottom + a.top) / 2) / 2 };
}

test("素材：腳本用到的每張圖與字型都存在", () => {
  const src = fs.readFileSync(path.join(ASSET_ROOT, "Scripts/GameController.js"), "utf8");
  const names = new Set();
  for (const m of src.matchAll(/"((?:bg|icon|ui|mascot)[a-z0-9_]*\.(?:png|jpg))"/g)) names.add(m[1]);
  for (const m of src.matchAll(/(?:bg|icon)_[a-z0-9]+\.(?:png|jpg)/g)) names.add(m[0]);
  assert(names.size >= 15, "找到的圖片數 " + names.size);
  names.forEach((n) => assert(fs.existsSync(path.join(ASSET_ROOT, "Art", n)), "缺圖 " + n));
  assert(fs.existsSync(path.join(ASSET_ROOT, "Fonts/NotoSansTC-Medium-subset.ttf")));
});

test("GameController：建立介面、隱藏範本、載入圖片與字型", () => {
  const env = makeLensEnv();
  assert.strictEqual(env.tplObj.enabled, false, "範本圖片應被隱藏");
  const root = byName(env, "PurpleButterfly UI");
  assert.strictEqual(root.parent, env.camera, "UI 應掛在範本的父物件下");
  assert(root.children.length >= 30);
  root.children.forEach((c) => assert.strictEqual(c.layer, 7, c.name + " layer"));
  assert(env.loaded.includes("../Fonts/NotoSansTC-Medium-subset.ttf"));
  assert(env.loaded.filter((p) => p.startsWith("../Art/")).length >= 21);
  // 開場畫面：標題背景 + 英雄圖示，沒有選項，有「開始」按鈕
  assert.strictEqual(byName(env, "bg_title").enabled, true);
  assert.strictEqual(byName(env, "bg_l1").enabled, false);
  assert.strictEqual(byName(env, "icon_hero").enabled, true);
  assert.strictEqual(byName(env, "badge_good").enabled, false);
  assert.strictEqual(byName(env, "ChoiceButton0").enabled, false);
  assert.strictEqual(byName(env, "NextLabel").comps["Component.Text"].text, "開始");
  assert.strictEqual(byName(env, "Title").comps["Component.Text"].text, "紫蝶奇遇記");
  assert.strictEqual(byName(env, "EnergyText").enabled, false);
});

test("GameController：點擊流程（開始 → 前測 → 第1關 → 回饋 → 下一步）", () => {
  const env = makeLensEnv();
  const T = (n) => byName(env, n).comps["Component.Text"].text;
  tap(env, 0.5, 0.9); // 開始
  assert.strictEqual(T("Header"), "前測");
  assert.strictEqual(byName(env, "bg_test").enabled, true);
  assert.strictEqual(byName(env, "ChoiceButton2").enabled, true);
  assert(T("ChoiceLabel0").startsWith("A.  "));
  for (let i = 0; i < 3; i++) { const c = center(byName(env, "ChoiceButton0")); tap(env, c.x, c.y); }
  assert.strictEqual(T("Title"), "第 1 關　生命的開始");
  tap(env, 0.5, 0.9); // 出發
  assert.strictEqual(byName(env, "bg_l1").enabled, true);
  assert.strictEqual(byName(env, "icon_l1").enabled, true);
  assert.strictEqual(byName(env, "EnergyText").enabled, true);
  assert.strictEqual(T("EnergyText"), "能量 60");
  // 點第一個選項（未洗牌 → 盤龍木，+5）
  const c0 = center(byName(env, "ChoiceButton0")); tap(env, c0.x, c0.y);
  assert.strictEqual(T("EnergyText"), "能量 65 (+5)");
  assert.strictEqual(byName(env, "badge_good").enabled, true);
  assert.strictEqual(byName(env, "Feedback").enabled, true);
  assert.strictEqual(byName(env, "ChoiceButton0").enabled, false);
  assert(T("Feedback").length > 10);
  // 能量條：65% 的寬度
  const track = byName(env, "EnergyTrack").comps["Component.ScreenTransform"].anchors;
  const fill = byName(env, "EnergyFill").comps["Component.ScreenTransform"].anchors;
  assert(Math.abs((fill.right - fill.left) / (track.right - track.left) - 0.65) < 1e-6);
  tap(env, 0.5, 0.9); // 下一步
  assert.strictEqual(byName(env, "Feedback").enabled, false);
  assert.strictEqual(byName(env, "ChoiceButton0").enabled, true);
});

test("GameController：點在空白處不會有反應", () => {
  const env = makeLensEnv();
  tap(env, 0.5, 0.9); // 開始 → 前測
  const before = byName(env, "Body").comps["Component.Text"].text;
  tap(env, 0.5, 0.2); // 圖示區
  assert.strictEqual(byName(env, "Body").comps["Component.Text"].text, before);
});

test("GameController：沒有接 Template Image 時不會當機", () => {
  const file = path.join(ASSET_ROOT, "Scripts/GameController.js");
  const src = fs.readFileSync(file, "utf8");
  const msgs = [];
  const fn = new Function("script", "print", "require", src);
  fn({ templateImage: null, api: {} }, (m) => msgs.push(m), () => ({ createGame: () => ({}) }));
  assert(msgs[0].includes("Template Image"));
});

test("全遊戲：用模擬環境把整局玩完（含全部 4 關與後測），每個畫面都有文字", () => {
  const env = makeLensEnv();
  const T = (n) => byName(env, n).comps["Component.Text"].text;
  const g = (name) => byName(env, name);
  let guard = 0;
  const seen = new Set();
  while (guard++ < 400) {
    if (T("Title").includes("紫蝶生存") || T("Title") === "順利生存" || T("Title") === "驚險過關") break;
    assert(T("Body").length > 0, "空白 Body");
    seen.add(g("bg_title").enabled ? "title" : g("bg_test").enabled ? "test" : g("bg_result").enabled ? "result" :
      g("bg_l1").enabled ? "l1" : g("bg_l2").enabled ? "l2" : g("bg_l3").enabled ? "l3" : "l4");
    if (g("ChoiceButton0").enabled) {
      // 找最佳選項（比對題庫文字）
      const labels = [0, 1, 2].filter((i) => g("ChoiceButton" + i).enabled).map((i) => T("ChoiceLabel" + i).slice(4));
      let idx = 0;
      for (const l of DATA.levels) for (const s of l.steps) {
        const best = s.choices.find((c) => c.good);
        if (labels.includes(best.text)) idx = labels.indexOf(best.text);
      }
      for (const t of DATA.tests) { if (t.question === T("Body")) idx = labels.indexOf(t.options[t.answer]); }
      const c = center(g("ChoiceButton" + idx)); tap(env, c.x, c.y);
    } else tap(env, 0.5, 0.9);
  }
  ["title", "test", "l1", "l2", "l3", "l4"].forEach((k) => assert(seen.has(k), "沒看過畫面 " + k));
  assert(T("Body").includes("後測 3 / 3"), T("Body"));
});

console.log("\n全部 " + passed + " 項測試通過");

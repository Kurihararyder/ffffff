// 執行：node tests/run-tests.js
const assert = require("assert");
const path = require("path");
const Module = require("module");
const DATA = require("../Assets/Scripts/QuizData");
const { createGame } = require("../Assets/Scripts/GameLogic");

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
test("GameController 在模擬的 Lens Studio 環境中可載入、渲染、處理按鈕", () => {
  const makeText = () => ({ text: "", enabled: true, textFill: { color: null } });
  const makeBtn = () => {
    const handlers = [];
    const obj = { enabled: true };
    return { onTap: { add: (f) => handlers.push(f) }, getSceneObject: () => obj, fire: () => handlers.forEach((f) => f()), obj };
  };
  const startHandlers = [];
  const choiceObjects = [{ enabled: true }, { enabled: true }, { enabled: true }];
  const bar = {
    enabled: true,
    _st: { anchors: { left: -1, right: 1 } },
    getComponent: function () { return this._st; }
  };
  const script = {
    headerText: makeText(), titleText: makeText(), bodyText: makeText(), feedbackText: makeText(),
    progressText: makeText(), energyText: makeText(), energyBarFill: bar,
    choiceObjects, choiceLabels: [makeText(), makeText(), makeText()],
    choiceButtons: [makeBtn(), makeBtn(), makeBtn()], nextButton: makeBtn(), nextLabel: makeText(),
    includeBonusLevel: true, shuffleChoices: false,
    goodColor: "G", badColor: "B", api: {},
    createEvent: () => ({ bind: (f) => startHandlers.push(f) })
  };
  const file = path.join(__dirname, "../Assets/Scripts/GameController.js");
  const src = require("fs").readFileSync(file, "utf8");
  const m = new Module(file);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const fn = new Function("script", "require", "module", src);
  fn(script, (p) => require(path.join(path.dirname(file), p)), m);
  startHandlers.forEach((f) => f());

  assert.strictEqual(script.titleText.text, "紫蝶奇遇記");
  assert.strictEqual(script.nextLabel.text, "開始");
  assert.strictEqual(choiceObjects[0].enabled, false);
  script.nextButton.fire(); // → 前測 T1
  assert.strictEqual(script.progressText.text, "第 1 / 3 題");
  assert.strictEqual(choiceObjects.every((o) => o.enabled), true);
  assert(script.choiceLabels[0].text.startsWith("A.  "));
  assert.strictEqual(script.nextButton.obj.enabled, false);
  script.choiceButtons[0].fire(); script.choiceButtons[0].fire(); script.choiceButtons[0].fire();
  script.nextButton.fire(); // 第 1 關 intro → 第 1 題
  script.choiceButtons[0].fire(); // 盤龍木（未洗牌，第 1 項）
  assert.strictEqual(script.energyText.text, "能量 65  (+5)");
  assert.strictEqual(script.feedbackText.textFill.color, "G");
  assert.strictEqual(bar._st.anchors.right, -1 + 2 * 0.65);
  assert.strictEqual(typeof script.api.getStats().energy, "number");
});

console.log("\n全部 " + passed + " 項測試通過");

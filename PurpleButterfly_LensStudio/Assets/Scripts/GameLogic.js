// 紫蝶奇遇記 — 遊戲邏輯（純 JavaScript，不依賴 Lens Studio API，可直接用 Node 測試）
//
// 流程：intro → 前測 → 各關(levelIntro → 題目/回饋 → levelEnd) → 後測 → result
// 使用方式：
//   var game = createGame(DATA, { includeBonusLevel: true, shuffleChoices: true, rng: Math.random });
//   var view = game.getView();
//   game.choose(i);   // 選擇第 i 個選項
//   game.next();      // 按「下一步」
//   game.getView() 取得畫面要顯示的內容。

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function shuffleIndexes(n, rng) {
  var a = [];
  var i;
  for (i = 0; i < n; i++) a.push(i);
  for (i = n - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function createGame(data, options) {
  options = options || {};
  var rng = options.rng || Math.random;
  var shuffle = options.shuffleChoices !== false;
  var includeBonus = options.includeBonusLevel !== false;

  var levels = data.levels.filter(function (l) {
    return includeBonus || !l.bonus;
  });
  var maxEnergy = data.meta.maxEnergy;
  var startEnergy = data.meta.startEnergy;

  var state = {
    phase: "intro",
    energy: startEnergy,
    levelIndex: 0,
    stepIndex: -1,
    levelStartEnergy: startEnergy,
    testMode: null, // "pre" | "post"
    testIndex: 0,
    preAnswers: [],
    postAnswers: [],
    order: null, // 目前題目的選項順序（打亂後）
    last: null, // 最近一次回答的結果
    log: []
  };

  // ── 工具 ──
  function identityOrder(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    return a;
  }

  function orderFor(n) {
    return shuffle ? shuffleIndexes(n, rng) : identityOrder(n);
  }

  function currentLevel() {
    return levels[state.levelIndex];
  }

  function currentStep() {
    return currentLevel().steps[state.stepIndex];
  }

  function currentTest() {
    return data.tests[state.testIndex];
  }

  function stepAllowed(step) {
    var c = step.condition;
    if (!c) return true;
    if (c.minEnergy !== undefined && state.energy < c.minEnergy) return false;
    if (c.maxEnergy !== undefined && state.energy > c.maxEnergy) return false;
    return true;
  }

  function energyView() {
    return {
      energy: state.energy,
      energyPct: clamp(state.energy / maxEnergy, 0, 1)
    };
  }

  // 前進到目前關卡的下一個可用題目；沒有題目就進入 levelEnd。
  function advanceStep() {
    var level = currentLevel();
    state.stepIndex++;
    while (state.stepIndex < level.steps.length && !stepAllowed(level.steps[state.stepIndex])) {
      state.stepIndex++;
    }
    if (state.stepIndex >= level.steps.length) {
      state.phase = "levelEnd";
      return;
    }
    state.phase = "question";
    state.order = orderFor(level.steps[state.stepIndex].choices.length);
    state.last = null;
  }

  function startLevel() {
    state.phase = "levelIntro";
    state.stepIndex = -1;
    state.levelStartEnergy = state.energy;
    state.last = null;
  }

  function startTest(mode) {
    state.testMode = mode;
    state.testIndex = 0;
    state.phase = "test";
    state.order = orderFor(currentTest().options.length);
    state.last = null;
  }

  function nextTestOrFinish() {
    state.testIndex++;
    if (state.testIndex >= data.tests.length) {
      if (state.testMode === "pre") {
        state.levelIndex = 0;
        startLevel();
      } else {
        state.phase = "result";
      }
      return;
    }
    state.phase = "test";
    state.order = orderFor(currentTest().options.length);
    state.last = null;
  }

  function score(answers) {
    var s = 0;
    for (var i = 0; i < answers.length; i++) if (answers[i]) s++;
    return s;
  }

  function endingFor(energy) {
    for (var i = 0; i < data.endings.length; i++) {
      if (energy >= data.endings[i].minEnergy) return data.endings[i];
    }
    return data.endings[data.endings.length - 1];
  }

  // ── 對外操作 ──
  function choose(displayIndex) {
    var origIndex;
    if (state.phase === "question") {
      if (displayIndex < 0 || displayIndex >= state.order.length) return false;
      origIndex = state.order[displayIndex];
      var choice = currentStep().choices[origIndex];
      var before = state.energy;
      state.energy = clamp(state.energy + choice.delta, 0, maxEnergy);
      state.last = {
        good: !!choice.good,
        feedback: choice.feedback,
        delta: state.energy - before,
        chosenText: choice.text
      };
      state.log.push({ step: currentStep().id, choice: choice.text, good: !!choice.good, delta: state.energy - before });
      state.phase = "feedback";
      return true;
    }
    if (state.phase === "test") {
      var t = currentTest();
      if (displayIndex < 0 || displayIndex >= state.order.length) return false;
      origIndex = state.order[displayIndex];
      var correct = origIndex === t.answer;
      if (state.testMode === "pre") {
        state.preAnswers[state.testIndex] = correct;
        nextTestOrFinish(); // 前測不顯示解說，避免影響後測比較
      } else {
        state.postAnswers[state.testIndex] = correct;
        state.last = { good: correct, feedback: t.explain, delta: 0, chosenText: t.options[origIndex] };
        state.phase = "testFeedback";
      }
      return true;
    }
    return false;
  }

  function next() {
    switch (state.phase) {
      case "intro":
        startTest("pre");
        return true;
      case "levelIntro":
        advanceStep();
        return true;
      case "feedback":
        if (state.energy <= 0) {
          state.phase = "gameOver";
        } else {
          advanceStep();
        }
        return true;
      case "gameOver":
        // 從本關開頭、用進入本關時的能量重來（前測成績保留）
        state.energy = state.levelStartEnergy;
        startLevel();
        return true;
      case "levelEnd":
        state.levelIndex++;
        if (state.levelIndex >= levels.length) {
          startTest("post");
        } else {
          startLevel();
        }
        return true;
      case "testFeedback":
        nextTestOrFinish();
        return true;
      case "result":
        restart();
        return true;
    }
    return false;
  }

  function restart() {
    state.phase = "intro";
    state.energy = startEnergy;
    state.levelIndex = 0;
    state.stepIndex = -1;
    state.levelStartEnergy = startEnergy;
    state.testMode = null;
    state.testIndex = 0;
    state.preAnswers = [];
    state.postAnswers = [];
    state.order = null;
    state.last = null;
    state.log = [];
  }

  // ── 畫面資料 ──
  function getView() {
    var v = {
      phase: state.phase,
      header: "",
      title: "",
      body: "",
      feedback: "",
      feedbackGood: null,
      choices: [],
      progress: "",
      nextLabel: null,
      showEnergy: state.phase !== "intro" && state.phase !== "test" && state.phase !== "testFeedback" && state.phase !== "result",
      energy: state.energy,
      energyPct: clamp(state.energy / maxEnergy, 0, 1),
      energyDelta: state.last ? state.last.delta : 0
    };
    var i, level, step, t;

    switch (state.phase) {
      case "intro":
        v.title = data.meta.title;
        v.header = data.meta.subtitle;
        v.body = data.meta.intro;
        v.nextLabel = "開始";
        break;

      case "test":
        t = currentTest();
        v.header = state.testMode === "pre" ? "前測" : "後測";
        v.progress = "第 " + (state.testIndex + 1) + " / " + data.tests.length + " 題";
        v.title = state.testMode === "pre" ? "出發前，先來想想看" : "旅程結束，再想一次";
        v.body = t.question;
        for (i = 0; i < state.order.length; i++) v.choices.push(t.options[state.order[i]]);
        break;

      case "testFeedback":
        t = currentTest();
        v.header = "後測";
        v.progress = "第 " + (state.testIndex + 1) + " / " + data.tests.length + " 題";
        v.title = state.last.good ? "答對了" : "再想想看";
        v.body = t.question;
        v.feedback = t.explain;
        v.feedbackGood = state.last.good;
        v.nextLabel = state.testIndex + 1 >= data.tests.length ? "看結果" : "下一題";
        break;

      case "levelIntro":
        level = currentLevel();
        v.header = level.subtitle;
        v.title = level.name;
        v.body = level.intro;
        v.nextLabel = "出發";
        break;

      case "question":
        level = currentLevel();
        step = currentStep();
        v.header = level.name;
        v.title = level.subtitle;
        v.body = step.scenario;
        for (i = 0; i < state.order.length; i++) v.choices.push(step.choices[state.order[i]].text);
        break;

      case "feedback":
        level = currentLevel();
        v.header = level.name;
        v.title = state.last.good ? "好選擇！" : "這個選擇有風險";
        v.body = "你選了：" + state.last.chosenText;
        v.feedback = state.last.feedback;
        v.feedbackGood = state.last.good;
        v.nextLabel = state.energy <= 0 ? "繼續" : "下一步";
        break;

      case "gameOver":
        level = currentLevel();
        v.header = level.name;
        v.title = "能量耗盡了";
        v.body = "你飛不動了。回到本關開頭，再試一次吧。\n想想看：哪些選擇消耗了最多能量？";
        v.nextLabel = "再試一次";
        break;

      case "levelEnd":
        level = currentLevel();
        v.header = level.name;
        v.title = "過關！";
        v.body = level.summary + "\n" + level.bringBack;
        v.nextLabel = state.levelIndex + 1 >= levels.length ? "進入後測" : "下一關";
        break;

      case "result":
        var ending = endingFor(state.energy);
        var pre = score(state.preAnswers);
        var post = score(state.postAnswers);
        var diff = post - pre;
        v.header = "旅程結束";
        v.title = ending.title;
        v.body =
          ending.body +
          "\n最後能量：" + state.energy +
          "\n三題生態知識：前測 " + pre + " / " + data.tests.length +
          "　→　後測 " + post + " / " + data.tests.length +
          (diff > 0 ? "（進步 " + diff + " 題）" : diff < 0 ? "（退步 " + (-diff) + " 題）" : "（持平）");
        v.nextLabel = "再玩一次";
        break;
    }
    return v;
  }

  function getStats() {
    return {
      phase: state.phase,
      energy: state.energy,
      pre: score(state.preAnswers),
      post: score(state.postAnswers),
      log: state.log.slice()
    };
  }

  return {
    choose: choose,
    next: next,
    restart: restart,
    getView: getView,
    getStats: getStats
  };
}

module.exports = { createGame: createGame };

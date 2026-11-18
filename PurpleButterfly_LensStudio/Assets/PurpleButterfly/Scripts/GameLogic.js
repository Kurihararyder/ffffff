// 紫蝶奇遇記 — 遊戲邏輯（純 JavaScript，不依賴 Lens Studio API，可用 Node 測試）
//
// 流程：intro → 第 1 題 → 回饋 → 第 2 題 → 回饋 → 第 3 題 → 回饋 → result
// 三題全對 → win（變成紫斑蝶）；只要有一題錯 → lose（變成牛糞）
//
// 用法：
//   var game = createGame(DATA);
//   game.getView();   // 取得畫面內容
//   game.choose(0);   // 0 = O，1 = X（只在 phase 為 "question" 時有效）
//   game.next();      // 按「開始 / 下一題 / 再玩一次」

function createGame(data) {
  var total = data.questions.length;
  var state;

  function reset() {
    state = { phase: "intro", index: 0, answers: [], last: null };
  }
  reset();

  function score() {
    var s = 0;
    for (var i = 0; i < state.answers.length; i++) if (state.answers[i].correct) s++;
    return s;
  }

  function choose(choice) {
    if (state.phase !== "question") return false;
    if (choice !== 0 && choice !== 1) return false;
    var q = data.questions[state.index];
    var said = choice === 0; // O = true
    var correct = said === q.answer;
    state.answers.push({ id: q.id, said: said, correct: correct });
    state.last = { correct: correct, explain: q.explain };
    state.phase = "feedback";
    return true;
  }

  function next() {
    switch (state.phase) {
      case "intro":
        state.phase = "question";
        state.index = 0;
        return true;
      case "feedback":
        state.index++;
        state.phase = state.index >= total ? "result" : "question";
        state.last = null;
        return true;
      case "result":
        reset();
        return true;
    }
    return false;
  }

  function getView() {
    var v = {
      phase: state.phase,
      questionIndex: -1, // 目前要顯示哪一張題目圖（0 起算）
      progress: "",
      title: "",
      body: "",
      feedbackGood: null,
      showAnswers: false,
      nextLabel: null,
      win: null,
      resultImage: null,
      score: score(),
      total: total
    };
    switch (state.phase) {
      case "intro":
        v.title = data.intro.heading;
        v.body = data.intro.body;
        v.nextLabel = "開始";
        break;
      case "question":
        v.questionIndex = state.index;
        v.progress = "第 " + (state.index + 1) + " / " + total + " 題";
        v.showAnswers = true;
        break;
      case "feedback":
        v.questionIndex = state.index;
        v.progress = "第 " + (state.index + 1) + " / " + total + " 題";
        v.feedbackGood = state.last.correct;
        v.title = state.last.correct ? "答對了！" : "答錯了";
        v.body = state.last.explain;
        v.nextLabel = state.index + 1 >= total ? "看結果" : "下一題";
        break;
      case "result":
        var win = score() === total;
        var r = win ? data.win : data.lose;
        v.win = win;
        v.resultImage = r.image;
        v.title = r.title;
        v.body = r.body.replace("{score}", String(score())).replace("{total}", String(total));
        v.progress = "答對 " + score() + " / " + total;
        v.nextLabel = "再玩一次";
        break;
    }
    return v;
  }

  function getStats() {
    return { phase: state.phase, score: score(), total: total, answers: state.answers.slice(), win: state.phase === "result" ? score() === total : null };
  }

  return { choose: choose, next: next, restart: reset, getView: getView, getStats: getStats };
}

module.exports = { createGame: createGame };

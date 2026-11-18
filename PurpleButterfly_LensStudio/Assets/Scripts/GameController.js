// 紫蝶奇遇記 — Lens Studio 控制腳本（建議 Lens Studio 5.x）
// 把這個腳本掛在一個空物件上，在 Inspector 把下面的欄位接到場景裡的 Text / 按鈕。
// 欄位要不要接都可以：沒接的欄位會被略過。

//@input Component.Text headerText
//@input Component.Text titleText
//@input Component.Text bodyText
//@input Component.Text feedbackText
//@input Component.Text progressText
//@input Component.Text energyText
//@input SceneObject energyBarFill
//@input SceneObject[] choiceObjects
//@input Component.Text[] choiceLabels
//@input Component.InteractionComponent[] choiceButtons
//@input Component.InteractionComponent nextButton
//@input Component.Text nextLabel
//@input bool includeBonusLevel = true
//@input bool shuffleChoices = true
//@input vec4 goodColor = {0.35, 0.8, 0.45, 1} {"widget":"color"}
//@input vec4 badColor = {0.95, 0.45, 0.4, 1} {"widget":"color"}

var DATA = require("./QuizData");
var Logic = require("./GameLogic");

var game = Logic.createGame(DATA, {
  includeBonusLevel: script.includeBonusLevel,
  shuffleChoices: script.shuffleChoices
});

// 能量條：用 ScreenTransform 的右邊界來縮放，先記住原本寬度
var barAnchors = null;
var barTransform = null;
if (script.energyBarFill) {
  barTransform = script.energyBarFill.getComponent("Component.ScreenTransform");
  if (barTransform) {
    barAnchors = { left: barTransform.anchors.left, right: barTransform.anchors.right };
  }
}

function setText(textComp, value) {
  if (textComp) textComp.text = value;
}

function setColor(textComp, color) {
  if (!textComp || !color) return;
  try {
    textComp.textFill.color = color;
  } catch (e) {
    // 舊版沒有 textFill 時略過
  }
}

function setEnergyBar(pct) {
  if (!barTransform || !barAnchors) return;
  var a = barTransform.anchors;
  a.left = barAnchors.left;
  a.right = barAnchors.left + (barAnchors.right - barAnchors.left) * pct;
  barTransform.anchors = a;
}

function render() {
  var v = game.getView();

  setText(script.headerText, v.header);
  setText(script.titleText, v.title);
  setText(script.bodyText, v.body);
  setText(script.progressText, v.progress);
  setText(script.feedbackText, v.feedback);

  if (v.feedbackGood === true) {
    setColor(script.feedbackText, script.goodColor);
  } else if (v.feedbackGood === false) {
    setColor(script.feedbackText, script.badColor);
  }

  // 能量
  if (script.energyText) {
    var delta = v.energyDelta;
    var deltaStr = delta > 0 ? "  (+" + delta + ")" : delta < 0 ? "  (" + delta + ")" : "";
    script.energyText.text = v.showEnergy ? "能量 " + v.energy + deltaStr : "";
    script.energyText.enabled = v.showEnergy;
  }
  if (script.energyBarFill) {
    script.energyBarFill.enabled = v.showEnergy;
    if (v.showEnergy) setEnergyBar(v.energyPct);
  }

  // 選項按鈕
  var n = script.choiceObjects ? script.choiceObjects.length : 0;
  for (var i = 0; i < n; i++) {
    var visible = i < v.choices.length;
    script.choiceObjects[i].enabled = visible;
    if (visible && script.choiceLabels && script.choiceLabels[i]) {
      script.choiceLabels[i].text = String.fromCharCode(65 + i) + ".  " + v.choices[i];
    }
  }

  // 下一步按鈕
  if (script.nextButton) {
    script.nextButton.getSceneObject().enabled = v.nextLabel !== null;
  }
  if (v.nextLabel !== null) setText(script.nextLabel, v.nextLabel);
}

function bindButtons() {
  var i;
  if (script.choiceButtons) {
    for (i = 0; i < script.choiceButtons.length; i++) {
      (function (index) {
        script.choiceButtons[index].onTap.add(function () {
          if (game.choose(index)) render();
        });
      })(i);
    }
  }
  if (script.nextButton) {
    script.nextButton.onTap.add(function () {
      if (game.next()) render();
    });
  }
}

script.createEvent("OnStartEvent").bind(function () {
  bindButtons();
  render();
});

// 其他腳本可以讀取成績（例如要記錄完成率、前後測）
script.api.getStats = function () {
  return game.getStats();
};
script.api.restart = function () {
  game.restart();
  render();
};

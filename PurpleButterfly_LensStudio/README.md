# 紫蝶奇遇記 — Lens Studio 套件

依《紫蝶奇遇記｜企劃強化版》製作：小紫斑蝶情境決策，能量會隨選擇改變，每次回饋都說明「為什麼」。

## 內容
| 檔案 | 說明 |
|---|---|
| `Assets/Scripts/QuizData.js` | 全部題目、選項、能量數值、解說、前後測、結局 |
| `Assets/Scripts/GameLogic.js` | 遊戲流程與規則（不依賴 Lens Studio，可用 Node 測試） |
| `Assets/Scripts/GameController.js` | Lens Studio 腳本：把畫面文字與按鈕接到遊戲邏輯 |
| `tests/run-tests.js` | 自動測試，執行 `node tests/run-tests.js` |

## 遊戲流程
介紹 → **前測 3 題**（不顯示解說）→ 第 1 關 幼蟲（3 題）→ 第 2 關 成蝶（3 題，依能量分支）→ 第 3 關 生存危機（3 題）→ 第 4 關 遷徙（2 題，可關閉）→ **後測 3 題**（顯示解說）→ 結果（前後測比較）

- 起始能量 60，上限 100。
- 第 2 關第 1 題：開花蜜源 60→75；無花草地 60→50（與 PDF 一致）。
- 第 2 關第 2 題依能量分支：能量 ≥ 70 探索下一處棲地；< 70 先找替代蜜源。
- 能量歸零 → 回到本關開頭重來（前測成績保留）。
- 選項順序每次隨機，避免正確答案總在同一個位置。

## 在 Lens Studio 5.x 建立場景
1. 新建專案（Lens Studio 5.x）。把整個 `Assets/Scripts` 資料夾拖進 Asset Browser。
2. 設定字型：Lens Studio 預設字型可能不含中文。匯入一個繁體中文字型（例如 Noto Sans TC 的 `.ttf`），並在每個 Text 的 Font 欄位選它。**沒做這步，中文會顯示成方框。**
3. 建立 UI（Objects 面板 → `+` → Screen Text / Screen Image，放在 Orthographic Camera 下）：
   - Text：`Header`、`Title`、`Body`、`Feedback`、`Progress`、`Energy`
   - 能量條：一個 Screen Image 作為 `EnergyBarFill`（建議在它後面再放一個深色底條）
   - 3 個選項按鈕：每個是一個 Screen Image（按鈕底）＋ 子物件 Screen Text（標籤）
   - 1 個下一步按鈕：Screen Image ＋ 子物件 Screen Text
   - Text 的 Overflow 選 Wrap，並設好寬度，長句才會自動換行。
4. 每個按鈕底的 Screen Image 上加 **Interaction Component**（Add Component → Interaction），Camera 選你的 Orthographic Camera。
5. 建立一個空物件 `GameController`，加 Script Component，選 `GameController.js`，在 Inspector 接線：

| 欄位 | 接到哪裡 |
|---|---|
| Header Text / Title Text / Body Text / Feedback Text / Progress Text / Energy Text | 對應的 Text |
| Energy Bar Fill | 能量條的 Screen Image 物件 |
| Choice Objects（3 個） | 三個選項按鈕的**最外層物件** |
| Choice Labels（3 個） | 三個按鈕裡的 Text |
| Choice Buttons（3 個） | 三個按鈕底上的 Interaction Component |
| Next Button / Next Label | 下一步按鈕的 Interaction Component／裡面的 Text |
| Include Bonus Level | 勾選 = 包含第 4 關 |
| Shuffle Choices | 勾選 = 隨機排列選項 |

6. 按 Preview，用滑鼠點選項測試。

欄位可以不接（腳本會略過），但至少要接 `Body Text`、`Choice *`、`Next Button` 才能玩。

## 修改題目
只要改 `QuizData.js`。每題一個 `steps` 項目，每個選項有 `delta`（能量變化）與 `feedback`（解說）。可用 `condition: { minEnergy, maxEnergy }` 做分支。改完用 `node tests/run-tests.js` 檢查格式。

## 需要你確認的地方
- **題目文字是我依 PDF 的重點延伸撰寫的。** PDF 只有關卡主題、能量機制和「幼蟲取食盤龍木；成蝶訪花吸蜜，偏好闊葉林與海岸林等棲地」，沒有逐題內容。第 3、4 關（天候、農藥、遷徙、公路）的解說更是延伸，請找生態專家或飛牛導覽人員查證。
- 第 4 關在 PDF 中標示為「後續保育擴充」，不在 4 週 MVP 內，所以做成可勾選關閉。
- 「回到現場」的提示文字是通用寫法，沒有指定飛牛場域裡的實際植物，請依現場補充。
- 這個套件沒有圖片。PDF 內的蝴蝶照片有 CC 授權要求（來源與授權在 PDF 的附件，但附件不在這份檔案裡），所以我沒有直接放進去。

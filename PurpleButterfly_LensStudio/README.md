# 紫蝶奇遇記 — Lens Studio 套件

依《紫蝶奇遇記｜企劃強化版》製作的小紫斑蝶情境決策遊戲：選擇會改變能量，每次回饋都說明「為什麼」。
包含全部題目、原創插畫（背景、圖示、按鈕、能量條）和繁體中文字型，匯入後只要接一條線就能玩。

![預覽](docs/preview.png)
（預覽圖是用瀏覽器依同一份版面模擬的，實際字級與換行以 Lens Studio 為準。）

## 為什麼不是 .esproj
`.esproj` 專案檔裡的圖片要綁「材質」，材質又要綁 Lens Studio 才能產生的著色器檔，沒有 Lens Studio 就無法做出可靠的專案檔。
所以這個套件改成由腳本在執行時自動建立整個介面（圖片、文字、按鈕全部自動生成），你只要在新專案裡做下面 4 步。

## 使用方式（Lens Studio 5.x）
1. 新建一個專案。
2. 把整個 `Assets/PurpleButterfly` 資料夾拖進 Asset Browser（**保持資料夾結構**，腳本用相對路徑找圖片和字型）。
3. Objects 面板按 `+` → **Screen Image**（會自動建立 Orthographic Camera 和一張圖片）。
4. 再按 `+` → **Scene Object**，改名 `Game`；在 Inspector 按 **Add Component → Script**，選 `GameController.js`；
   把第 3 步的 Screen Image 從 Objects 面板**拖到 Template Image 欄位**。
5. 在 Preview 用手機直式比例（例如 iPhone）點擊測試。

Template Image 只是用來借它的材質，腳本會把它隱藏。

## 包含什麼
| 路徑 | 說明 |
|---|---|
| `Assets/PurpleButterfly/Scripts/QuizData.js` | 全部題目、選項、能量數值、解說、前後測、結局 |
| `Assets/PurpleButterfly/Scripts/GameLogic.js` | 遊戲流程與規則（純 JavaScript，可用 Node 測試） |
| `Assets/PurpleButterfly/Scripts/GameController.js` | 自動建立介面、處理點擊 |
| `Assets/PurpleButterfly/Art/` | 7 張背景（`.jpg`）、圖示、按鈕、能量條（`.png`），全部是原創插畫 |
| `Assets/PurpleButterfly/Fonts/` | Noto Sans TC Medium 子集字型（SIL OFL 1.1，授權文字在同資料夾） |
| `tools/` | 圖片產生程式（`make_art.py` + `render_art.js`）與預覽程式 |
| `tests/run-tests.js` | 自動測試：`node tests/run-tests.js` |

## 遊戲流程
介紹 → **前測 3 題**（不顯示解說）→ 第 1 關 幼蟲（3 題）→ 第 2 關 成蝶（3 題，依能量分支）→ 第 3 關 生存危機（3 題）→ 第 4 關 遷徙（2 題，可關閉）→ **後測 3 題**（顯示解說）→ 結果（前後測比較）

- 起始能量 60，上限 100。第 2 關第 1 題照 PDF：開花蜜源 60→75；無花草地 60→50。
- 第 2 關第 2 題依能量分支：≥ 70 探索下一處棲地；< 70 先找替代蜜源。
- 能量歸零 → 回到本關開頭重來（前測成績保留）。
- 選項順序每次隨機。
- Inspector 可關閉「包含第 4 關」與「隨機排列選項」。

## 修改
- 題目：只改 `QuizData.js`。改完執行 `node tests/run-tests.js` 檢查格式。
- 字型只含常用繁體字（Big5 常用字 + 題庫用字）。加了生僻字會顯示成方框，請換成完整字型，拖到 GameController 的「字型」欄位。
- 圖片：改 `tools/make_art.py` 後重新產生，或直接用同檔名取代 `Art/` 裡的檔案（背景 720×1560）。
- 版面：`GameController.js` 的 `R` 物件，數字是螢幕比例（左上為 0,0）。

## 還沒在 Lens Studio 裡實測的地方
我沒有 Lens Studio 可以測試，腳本用的 API 都參照 Snap 官方範例的寫法，邏輯與點擊流程用模擬環境測過，但沒有在真正的 Lens Studio 跑過。如果遇到問題：

| 狀況 | 處理 |
|---|---|
| Console 顯示「找不到資源」 | 確認有拖整個資料夾進去，且資料夾名稱沒改 |
| 中文變成方框 | 把 `Fonts/NotoSansTC-Medium-subset.ttf` 拖到 GameController 的「字型」欄位 |
| 文字沒有自動換行或縮小 | 這是 Text 的 Overflow 設定；到 Objects 面板找 `PurpleButterfly UI` 底下的 Text，把 Overflow 設成 Wrap / Shrink |
| 圖片沒顯示或有黑邊 | 在 Asset Browser 選圖片，Inspector 確認是 Texture；Template Image 的材質要支援透明（預設 Screen Image 就可以） |
| 點了沒反應 | 確認 Preview 是手機直式，Template Image 在 Orthographic Camera 底下 |

## 內容要查證
- 題目與解說是依 PDF 的生態重點（幼蟲取食盤龍木；成蝶訪花吸蜜，偏好闊葉林與海岸林）延伸撰寫，PDF 沒有逐題的題目文字。第 3、4 關（天候、農藥、遷徙、公路）的說法請生態專家或導覽人員查證。
- 「回到現場」提示是通用寫法，請依飛牛場域的實際植物補充。
- 蝴蝶插畫是示意用的原創圖，不是物種繪圖。

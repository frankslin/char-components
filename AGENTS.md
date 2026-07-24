# AGENTS.md

指引在本 repo 工作的 AI coding agent。人類可讀的完整規劃見 `doc/05-重構計畫.md`；本檔只放 agent 執行時必須遵守的規則與任務拆解。

## 專案現狀

- **`legacy/部件檢索.htm`**：原作者 WFG 的單一 HTML 檔存檔版本，內含全部漢字拆分資料(`dt`/`rt`/`vt` 三個巨型陣列)與比對演算法(`Eliminate`/`GetMatch`/`Arrayalize`/`Exhaust`/`GetTree`)。**已封存，不再修改**，只做為行為對照的黃金參考版本保留（仍可離線雙擊開啟）。
- **`web/`**：新實作，取代 `legacy/部件檢索.htm` 做為往後開發的主線。純 ES module + `fetch()`，無 bundler，讀取 `web/data/` 底下抽離出來的資料，演算法(`web/core.js`)是逐句對照 `legacy/部件檢索.htm` 翻譯而成。細節、已驗證行為、目前刻意先不做的功能見 `web/README.md`。
- **`web/data/`**：從 `legacy/部件檢索.htm` 抽離出來的 `dt`/`rt`/`vt` 三張表(`dt.jsonl`/`rt.jsonl`/`vt.json`)，`web/data/extract.py` 可從 `legacy/部件檢索.htm` 重新產生，`web/data/README.md` 有完整 schema 說明(含 legacy 之外的人工增補清單——重跑 extract.py 後需手動補回)。放在 `web/` 底下是刻意的，讓 `web/` 目錄可以獨立部署。
- 背景與演算法原理見 `doc/blog/`(原作者部落格文章逐字備份，01~13)與 `doc/04`。**動手改演算法前必讀 `doc/04-開發理解與重構指引.md`**，尤其是「拆分樹比對法」與「異體映射」章節——這兩塊最容易改錯。
- `LICENSE` 是原作者的公開授權條款，禁止商業使用；任何衍生產出物需保留來源標示。

## 不可破壞的約束(Definition of Done 的一部分)

1. **`legacy/部件檢索.htm` 保持原封不動，做為黃金參考版本。** 不要「順手」修它；新功能一律加在 `web/`。`web/` 本身**不需要**支援 `file://` 雙擊開啟——目標是「整體部署到 http(s) 靜態空間後，開啟就能用」，這是刻意放寬的約束（比較舊版「必須可離線雙擊」的設計目標），別誤以為是遺漏。
2. **保留「客製化修改區」邊界的精神，即使不再是同一個檔案。** `legacy/部件檢索.htm` 用 `<!-- 客製化修改區起始/結束 -->` 劃出 UI 與核心的界線；`web/` 延續同樣的分層原則，落實為實際的檔案切分：`web/core.js`(演算法，純函式、無 DOM 依賴) vs. `web/app.js`+`web/index.html`+`web/style.css`(UI)。修改時不要讓兩邊混在一起。
3. **`vt`(異體映射表)只能單向替換。** 新增或修改映射前，先用 `doc/blog/02` 的 ab/aB/Ab/AB 分類法判斷方向是否安全；`Ab`、部分 `AB` 型映射目前無解，硬加會導致某些字查不到。
4. **`web/core.js` 的 `eliminate()`(對應原本的 `Eliminate()`)是全專案正確性風險最高的函式。** 任何觸碰它的重構，必須先用下面的黃金測試案例跑過一遍，確認結果不變。
5. **顯示正確性依賴「全宋體」字型，不是通用中文字型，也不是「台灣全字庫正宋體」。** `dt`/`rt` 裡有大量私有造字區(PUA)碼位的「補充字」，只有搭配作者發行的「全宋體」才能正確顯示；換裝別的字型不只是缺字，還可能因 PUA 碼位衝突顯示成完全不相干的字。字型檔已存放於 `deps/fonts/`(來源、各檔用途見 `doc/04` 第 5 節)，必須與當時的 `dt`/`rt` 資料版本互相對應，不可混搭不同時期的字型與資料表；字型本身另有非商業授權限制，不可用於商業用途。

## 黃金回歸測試案例

以查詢輸入 → 預期命中數/字集，至少要能重現以下幾組（`日月`/`明`/`日日月`/`日明` 四組出自 `doc/blog/01`、作者本人驗證過；後面幾組是 `web/core.js` 開發時新增的驗證，直接對照原始 `legacy/部件檢索.htm` 的行為）：

| 輸入/操作 | 預期 |
|---|---|
| `日月`／`明`／`日日月`／`日明` | 見 `doc/blog/01` 的實測比較表 |
| `明`（精確查詢自己） | 命中狀態應為「精確命中」(`hit === 0`) |
| `日明` 的結果 | 應是 `日日月` 結果的子集，不應等於 `明` 的結果 |
| `\主`，同字異拆選項關閉 | 只展開「丶王」等第一種拆法（現行 UI 已無 `\字` 語法：點結果字塊開右側「字詳情」面板，拆分樹只畫第一種並提示另有幾種；此案例對 `core.getTree()` 依然成立） |
| `\主`，同字異拆選項開啟 | 展開全部「丶王」「亠土」等同字異拆分支（現行 UI：字詳情面板全部拆法左右並排） |
| `咅邑`，包容異體關閉 | 查不到「部」 |
| `咅邑`，包容異體開啟 | 查得到「部」(`⻏→邑` 映射生效) |

注意：現行程式跑的是「拆分樹比對法」而非 `doc/blog/01` 文中的「完拆比對法」，數字可能因拆分表版本更新而略有出入(現在的 `dt` 已是 Unicode 17.0 版，非 2015 年的舊表)，但**同一批輸入彼此之間的相對關係**必須維持，這才是回歸測試真正要保護的不變量，而非死板的絕對數字。目前這些案例只有臨時的 Node/Playwright 腳本驗證過，**還沒有寫成可重跑的自動化測試**——這是待補的技術債，見給 agent 的提醒。

## 任務拆解與優先順序

### Phase 1 — 資料抽離 ✅ 已完成

- `dt`/`rt`/`vt`/`kt` 已抽成 `web/data/dt.jsonl`、`web/data/rt.jsonl`、`web/data/vt.json`、`web/data/kt.json`(原在 repo 根目錄的 `data/`，後為讓 `web/` 可獨立部署而移入)，`web/data/extract.py` 可重新從 `legacy/部件檢索.htm` 產生，抽離當時已用逐項比對驗證完全等價；其後的人工增補見 `web/data/README.md`。
- `GetBlock`/`GetIndex` 手刻的 Unicode 區塊偏移量**尚未**生成式化，仍是原樣搬進 `web/core.js`(見 Phase 4 待辦)。

### Phase 2 — 新前端實作(no-build) ✅ 已完成部件鍵盤／即時查詢／字源圖例，見 `web/README.md` 的待補清單

- 沒有走原計畫的「建置腳本組裝回單一 htm」路線——改成 `web/` 這個免建置的多檔案靜態實作，直接用 `<script type="module">` + `fetch()` 讀取 `web/data/`。決策原因：使用者只需要「部署後點開能用」，不需要保留單一 htm 產出。
- `web/core.js` 的演算法已用 Node 腳本（比對「日月/明/日日月/日明」等黃金案例）與 Playwright 驅動真實瀏覽器（載入頁面、輸入查詢、點字複製、`\字` 解構、包容異體勾選、側邊鍵盤插入、字源圖例篩選）雙重驗證過，行為與 `legacy/部件檢索.htm` 一致。
- 側邊部件鍵盤(`web/keypad.js`)、即時查詢(自動完成，debounce + IME 感知)、字源圖例(`web/blocks.js`，14 分類、可點擊插入篩選符號、結果依字源上色、補充字 PUA 提示與正式編碼字分開顯示)都已實作完成。
- 尚未搬過來的功能列在 `web/README.md`(異體檢索 UI、選項記憶、外部字典跳轉、資料按需分片)——之後要加功能前先看那份清單，避免重複造輪子或誤以為是遺漏而重新分析。

### Phase 3 — UI 現代化(可與 Phase 2 後續功能穿插進行)

- `web/` 已經是 `localStorage`-友善的乾淨 DOM 組裝（無 cookie、無字串拼接 HTML），這部分不用再做。
- 深色模式(`prefers-color-scheme`)、側邊鍵盤面板的響應式排版(窄螢幕自動收合)都已完成。
- **不要引入 React/Vue 等框架**——no-build、零依賴是 `web/` 的核心約束，不是技術債。

### Phase 4 — 尚未排期

- `GetBlock`/`GetIndex` 的 Unicode 區塊偏移量生成式化(見 Phase 1 備註)。
- `web/data/` 三個檔案目前一次整包 `fetch()`(共約 4MB)，還沒做成 `webfonts/wfg-fsung` 那種按 Unicode 區塊分片、按需載入。

## 給 agent 的具體提醒

- 改動 `dt`/`rt`/`vt` 資料前，先確認是資料錯誤還是演算法錯誤——多數「查不到某字」的回報，根源在 `vt` 映射方向錯誤(見上面約束 3)，不要急著去改 `eliminate()`。
- 這個 repo 沒有 CI、沒有正式測試框架。**待補技術債**：上面「黃金回歸測試案例」目前只用臨時腳本手動驗證過，應該補成 `web/core.test.mjs` 之類、用 Node 內建 `node:test` + `assert` 的可重跑測試，不要為了跑測試而引入額外相依套件，這與 `web/` 的 no-build/零依賴精神一致。
- `web/` 需要透過 http(s) 開啟才能測試(`fetch()` 讀 `web/data/` 在 `file://` 下會被擋)，本機驗證可用 `python3 -m http.server` 之類的靜態伺服器，開發時在 repo 根目錄起服務、瀏覽 `/web/index.html` 即可(字型的相對路徑 `../webfonts/` 才會正確解析；資料已在 `web/data/` 內)。
- 提交訊息、程式碼註解一律使用繁體中文或英文皆可，但不要新增簡體中文內容(維持與現有原文/文件一致的用字)。

## `webfonts/wfg-fsung/`：全宋體的 webfont 切片版

- 這是 `deps/fonts/FSung-*.ttf` 的 256 碼位 WOFF2 切片版本，做法比照鄰近的 `jigmo-webfonts`/`free-fonts` 專案慣例。建置腳本：`webfonts/build-wfg-fsung.py`。細節與已知的資料特性(`FSung-p` 排除、U+0000–00FF 分片的超集處理)見 `doc/04` 第 5.5 節與 package 自己的 `README.md`。
- npm 套件名稱是 `wfg-fsung-webfonts`(不掛在 `@free-fonts` scope 下——那個 scope 現有字型都是 OFL/MIT/CC0 等允許商業散布的授權，跟這套字型的非商業限制性質不同)。**發布到 npm 由使用者本人處理，不要代為執行 `npm publish`**。
- 這套字型仍是非商業授權(`LicenseRef-WFG-NonCommercial`)，改動 `package.json`/`LICENSE` 時不要移除這個標示，也不要把它加進 `../free-fonts` 的 README/index.html 展示頁(那邊的授權模式不同)。
- 若 `deps/fonts/` 的字型檔案更新(隨 Unicode 新版本)，需要重跑 `build-wfg-fsung.py` 重新產生切片，不可只更新其中幾個分片檔案，避免新舊版本混雜。
- **`web/webfonts/wfg-fsung/` 是這裡的 vendored 副本**，`build-wfg-fsung.py` 結尾的 `sync_vendor_copy()` 會自動同步這兩份，**不要手動只改其中一份**——兩邊版本不一致會導致難以追查的顯示問題。`web/style.css` 目前是 `@import` jsDelivr 上鎖死版號的 `wfg-fsung-webfonts`(1.0.x 的分片是假 woff2、整包 169MB 超過 jsDelivr 的 150MB 上限，1.1.0 修好後才改過去；更早試過 unpkg，代理 npm registry 的延遲不穩定)；vendored 副本保留做為離線/內網部署的選項，把那行 `@import` 換回相對路徑即可，**改版號時記得兩邊對應的資料版本要一致**。

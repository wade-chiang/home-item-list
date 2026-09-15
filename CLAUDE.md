# home-item-list

家庭耗材更換提醒器。記錄每樣耗材「上次什麼時候換的」「多久該換一次」，到期前提醒。
單人自用，跑在家裡的機器上；未來以 Capacitor 包成手機 app。

詳細產品規格見 [docs/PRODUCT.md](docs/PRODUCT.md)，開發進度與 task 見 [docs/TASKS.md](docs/TASKS.md)，確認過的畫面見 [docs/prototype/p0.html](docs/prototype/p0.html)、[docs/prototype/p3.html](docs/prototype/p3.html)。

---

## 這份文件怎麼維護

**推導出決定、或發現文件裡既有的判斷有誤，要在當下就提案寫入，不要停在對話裡。** 提案內容包含放在哪一節、確切措辭。

**提案是義務，寫不寫、怎麼寫由使用者決定。** 沒有明確同意的內容不進檔案。

**推翻自己先前寫進文件的斷言時，修正提案要跟更正一起提出。** 文件裡留著一句錯的斷言，比完全沒有記錄更危險 —— 下一個 session 會照著它走，甚至重新反對一次已經推翻過的結論。

*實例*：`date` 欄位那條原本寫成「不要用」的禁令，實際上是取捨。更正在對話中完成，但沒有立刻提案改文件，直到使用者問「有記錄嗎」才補上。

---

## 原型關卡

**每個階段開工前，該階段會出現的所有畫面與互動，都要先在原型中呈現並經使用者確認。** 只影響資料、不影響畫面的規則，可以只寫規格。

- **P0** 涵蓋 P1、P2 的所有畫面
- **P3、P4** 的畫面在各自開工前另外補原型，不在 P0 做
- 原型驗證不了的事，例如相機與拍照辨識的準確度、通知實際樣式、拖曳手感、大量資料下的表現，不在原型階段判斷，留到實作時用手機實測

---

## 明確不做

這幾項討論過並且**刻意排除**。要重新納入請先跟使用者確認，不要因為「順手就做了」而加進來。

- **庫存推算**（買了 3 捲、用掉 1 捲、還剩 2 捲）— Purchase 的資料結構有留下未來可算的空間，但不實作
- **季節性週期**（「每年 3 月和 9 月」）— 用「暫停」功能替代
- **批次打卡**（一次換完五台冷氣）— 先觀察是否真的困擾
- **多人共用與登入** — 資料保留 `householdId` 欄位但不實作 auth
- **以圖搜圖** — 照片辨識只做「讀出包裝上的品牌型號」，不做反向圖片搜尋
- **Telegram / Email / Web Push 推播** — 提醒改由 Capacitor 化後的本地通知負責

---

## 術語

程式碼、UI 文案、討論一律用這組詞，不要出現同義詞飄移（例如不要混用 item/product/thing）。

| 英文 | 中文 | 說明 |
|---|---|---|
| `Location` | 位置 | 物品放在哪裡，例如「主臥」。有自己的 icon 與排序 |
| `Category` | 類別 | 物品的分類，例如「冷氣濾網」。負責分組與 icon |
| `Item` | 物品 | 要被管理的東西。顯示名稱 ＝ 位置 ＋ 類別 ＋ 補充名稱，例如「主臥 · 冷氣濾網」 |
| `label` | 補充名稱 | 選填。同位置、同類別有兩個以上時用來區分，例如「水槽」 |
| `Log` | 更換紀錄 | 一次更換事件，記錄日期、品牌、型號、週期。每個物品至少一筆 |
| `Purchase` | 採購紀錄 | 一次購買事件。一筆採購可對應多次更換 |
| `cycleDays` | 週期 | 多少天該換一次，**單位一律是天**。記在更換紀錄上 |
| `leadDays` | 提前提醒天數 | 到期前幾天開始警示。記在物品上 |
| `due` | 到期日 | **推導值**，不是欄位 |
| `status` | 狀態 | `ok` / `soon` / `overdue` / `paused` |

---

## 技術棧

| 層 | 選擇 |
|---|---|
| 前端 | Vite + React + TypeScript（嚴格模式）+ React Router + TanStack Query |
| 樣式 | Tailwind CSS |
| icon | Lucide（`lucide-react`，P1 開工時另外提案安裝）。已查證 1.44.0 可用；`Home`、`Trash2` 是舊名稱的別名，改用 `House`、`Trash` |
| 測試 | Vitest |
| 程式碼風格 | oxlint + Prettier。oxlint 開 type-aware（需 `oxlint-tsgolint`） |
| 資料驗證 | zod。進出 `src/repo/` 的資料都要通過驗證（見紀律 3） |
| 拖曳排序 | `@dnd-kit/react`（0.x，版本範圍 `^0.5.0`，不主動升級）。拖曳程式集中在 `src/pages/LocationReorderList.tsx` |
| zip 打包 | `fflate`（0.x，版本範圍 `^0.8.3`，不主動升級）。壓縮程式集中在 `src/backup/zipFile.ts` |
| 後端 | **PocketBase（暫定，見決策紀錄）**，內嵌 SQLite |
| 部署 | Docker Compose，單一 container，PocketBase 版本 pin 死（見紀律 3）。前端 build 產物放進 `pb_public/`，由 PocketBase 一併 serve |
| 未來 app | Capacitor（Android/iOS），資料換成裝置上的 SQLite（`@capacitor-community/sqlite`），提醒換成本地通知 |

**表中列的是規劃，不代表已同意安裝。** 任何依賴安裝前都要先提出理由並等使用者確認，不要自行安裝。

---

## 目錄結構

```
src/
  repo/              唯一允許 import PocketBase SDK 的地方
  shared/
    brandModel.ts    品牌型號比較前的字串整理（唯一實作，見「品牌型號的比較只能有一份字串整理」）
    date.ts          純日期計算（加減天數、相差天數、依裝置時區取得今天）
    due.ts           到期與狀態計算（唯一實作）
    types.ts         領域型別（手寫維護，見「型別要自己顧」）
  pages/
  components/
  preferences.ts     這支手機自己的偏好（外觀、物品 icon 顯示），存在 localStorage，不是資料庫的資料，所以不在 repo/
  photoFile.ts       上傳前把照片縮小並轉成 JPEG（瀏覽器 canvas，不是資料存取，所以不在 repo/）
  backup/            匯出與還原備份：格式、zip、存檔（存檔在 P3 要換成 Capacitor 外掛）
pb_migrations/       PocketBase collection 定義（**進 git**）
pb_public/           前端 build 產物（不進 git）
pb_data/             PocketBase 資料與照片（volume，不進 git）
docs/
  prototype/p0.html  P0 確認過的原型
  prototype/p3.html  P3 確認過的原型
```

---

## 紀律

### 1. 資料存取一律走 repo 層

**`src/pages/`、`src/components/`、`src/shared/` 都不得 import PocketBase SDK。** 所有資料存取集中在 `src/repo/`。

*為什麼*：未來 Capacitor 化時，資料會從「PocketBase 伺服器」換成「裝置上的 SQLite」。只要 UI 沒有直接碰 SDK，那次搬遷只需要換掉 `src/repo/` 的實作，**UI 一行都不用改**。這是我們選 Capacitor 而不是 Flutter 的整個理由，破壞這條紀律等於放棄那個好處。

**這條紀律同時也是 PocketBase 的退場保險** —— 如果之後決定換掉 PocketBase，要重寫的一樣只有這個目錄。

### 2. 前端必須能純靜態運作

前端不得依賴任何 server-only 行為。`vite build` 的產物必須能被 Capacitor 直接打包並離線開啟。

*為什麼*：同上。Capacitor 只吃靜態檔。

### 3. PocketBase 的三個配套（不可省）

1. **版本 pin 死**。docker compose 指定確切版本，不用 `latest`，不自動升級
2. **`pb_migrations/` 進 git**。collection 改動會自動產生 migration 檔，那是我們的 schema 唯一的版本化紀錄
3. **repo 層邊界用 zod 驗證**。進出 `src/repo/` 的資料都要通過 schema 驗證再轉成 `src/shared/types.ts` 的領域型別

*為什麼*：PocketBase 是 pre-1.0，官方明說「not recommended for production critical applications」，且 v0.23.0 曾是需要「一小時到一整個週末」才能升完的破壞性改版。前兩點讓我們不會被動被升級波及，第三點補回 ORM 產生型別所提供的安全網（見下方「型別要自己顧」）。

---

## 已知的坑

這些是設計時想清楚才決定的，**不是隨手寫的**。改動前請先確認你理解為什麼。

### 日期只存日期（欄位型別用 `text`，P1-6 定案）

**不變的紀律**：`src/shared/` 與 UI 看到的日期永遠是 `YYYY-MM-DD` 字串，不帶時區。「今天」依使用者裝置的時區決定（`src/shared/date.ts` 的 `getToday()`），不寫死特定時區。repo 層負責在邊界轉換。**這條跟欄位型別無關，不要一起推翻。**

*為什麼*：「今天換的」是一個日期概念，不是一個瞬間。把它當成瞬間處理，晚上打卡的紀錄就可能顯示成前一天或隔天——這種 bug 很難被發現，因為只在特定時段出現。領域層統一用純日期字串就完全繞開這件事。

**欄位型別用 `text`（2026-09-11 P1-6 實測後定案）**，存 `YYYY-MM-DD`，migration 以 `pattern` 檢查格式（格式錯誤回 400，已實測）。

這是取捨，不是 `date` 欄位不能用。評估過 `date` + UTC 午夜約定：

- **從 API 寫入沒問題**：寫入 `2026-09-10` 存成 `2026-09-10 00:00:00.000Z`（UTC，日期與時間之間是空格、帶毫秒），取前 10 個字元就是原日期
- **在後台手動改資料會差一天**：後台的日期輸入框用瀏覽器本地時區。在台北把日期改成 `2026-09-10 00:00:00` 存檔，實際存成 `2026-09-09 16:00:00.000Z`，取前 10 個字元變成前一天。要改對得輸入早上 8 點，不是直覺會做的事
- `text` 原本的代價「PocketBase 不驗格式」已由 `pattern` 補上。剩下的代價是後台要手打日期字串，而且 `pattern` 擋不住 `2026-02-30` 這種不存在的日期，要由 repo 層的 zod 把關

> ⚠️ **不要為了後台有日期選擇器而改用 `date`**。上面那個差一天的問題不會報錯，只會讓到期日悄悄提早一天。

例外：`created` / `updated` 這種系統時間戳用 PocketBase 的 `autodate`，它們不面向使用者。

### 型別要自己顧：PocketBase 存不了空值

PocketBase 沒有 ORM 產生的型別，`src/shared/types.ts` 是**手寫維護**的，schema 與型別之間沒有編譯器把關。這就是紀律 3 第三點存在的理由。

**PocketBase 的欄位一律 `NOT NULL`，沒給值就存零值**（v0.40.3 原始碼確認）：number 存 `0`、text 存 `""`、bool 存 `false`、單選 relation 存 `""`。資料庫層分不出「沒填」和「零值」。API 回傳的 JSON 也是零值，不會出現 `null`（P1-6 實測：`leadDays` 回 `0`、`label` 回 `""`、`paused` 回 `false`、`photos` 回 `[]`、`purchase` 回 `""`）。

因此：

- **number 欄位的「必填」意思是「不能是 0」，不是「一定要填」**。只在 0 沒有意義的欄位設必填（`cycleDays`、`quantity`，最小 1）；0 有意義的欄位（`leadDays` 表示到期當天才提醒、`unitPrice` 表示贈品）設為非必填、最小 0，「一定要有值」由 repo 層的 zod 把關
- P3 換成裝置 SQLite 時，同一條業務規則可以直接寫成 `NOT NULL CHECK (lead_days >= 0)`，不受這個限制影響

**選填欄位在領域型別中一律用 `null` 表示沒填**，不用空字串。repo 層負責把 PocketBase 回傳的零值轉成 `null`：

- **更換紀錄的日期**：選了「不知道上次更換日」時留空，不能被當成某個日期
- **預計到期日**：有更換日期時為空
- **預計恢復日**：沒有暫停時為空
- **品牌、型號**：沒填時是空字串，畫面上留空
- **補充名稱、備註、採購單位**：沒填時是空字串
- **更換紀錄的採購關聯**：這次沒買新的時為空

> ⚠️ **定案後不要改回空字串**。TypeScript 抓不到舊的判斷：把 `label: string | null` 改成 `label: string` 後，`label === null`、`label ?? "（無）"` 都不會報錯，只會悄悄失效（P1-7 以 TS 7.0.2 實測）。

**寫入紀錄時不要帶 `photos`**：PocketBase 更新時帶了 `photos`，沒列在裡面的檔案會被刪掉。`toItemRecord`、`toLogRecord` 刻意不寫出照片，照片只經過 repo 的 `addPhoto`、`removePhoto` 增減；建立紀錄時才把檔案一起帶上。

### 到期日是推導值，唯一實作在 `src/shared/due.ts`

```
due = 最近一筆更換紀錄的日期 + 該筆的週期
若最近一筆的日期未記錄（使用者選了「不知道上次更換日」）→ due = 該筆的預計到期日
```

「最近一筆」的判定：依日期由新到舊，日期未記錄的排最後，同一天較晚建立的為較新。**排序規則同樣只能有一份實作。**

**不得把 due 存成資料庫欄位，不得在別的檔案重算一次。** 前端顯示、排序、未來的本地通知排程都必須呼叫同一支函式。

*為什麼*：這個值會出現在首頁、列表、詳情、通知四個地方。一旦有第二份實作，遲早會出現「首頁說逾期 3 天、詳情說還有 2 天」這種沒人信任得起來的畫面。

補充：因為 due 是推導值，**排序必須在前端做**，不能靠 PocketBase 的 `sort` 參數。物品數量是幾十筆等級，全部撈回來排序完全沒問題。

### 下次到期用「這次填的週期」，不是「實際間隔」

打卡後的下次到期日一律是 `打卡日 + 這次更換所填的週期`，**不要拿「上次到這次實際隔了幾天」去更新週期**。

*為什麼*：如果用實際間隔，使用者的拖延會被系統學起來變成新標準 —— 拖到 120 天就變成 120 天週期，下次拖到 150 天又再被學一次，週期會單向膨脹到這個 app 不再提醒任何事。

實際間隔改成**顯示給使用者看**（物品詳情頁），讓他自己決定要不要調週期。只提示，不自動改。

### 暫停會靜默失效，所以必須有防呆

暫停冷氣濾網之後，如果使用者忘了恢復，這個 app 會**永遠不再提醒**，而且不會出錯、不會變紅、沒有任何異狀。這比誤報危險得多。

兩個防呆都要做，不要省：

1. 暫停時**必須**填 `pausedUntil`（預計恢復日），到日期自動恢復。由 `src/shared/due.ts` 的 `isPaused()` 推導，不寫回資料庫；資料庫裡可能留著日期已過的 `paused = true`，**畫面與判斷一律呼叫 `isPaused()`，不要直接看 `item.paused`**（P2-1 決定）
2. 首頁最下方**常駐**顯示「N 項已暫停」，讓它不會從視野裡消失

### 首頁篩選不要記住

首頁的快速篩選**離開首頁就清除**，不要存起來、不要在下次開啟時還原。

*為什麼*：停在「正常」篩選時逾期的東西會被藏起來，跟暫停的靜默失效是同一種風險。

### 照片存 JPEG，不是 WebP

前端上傳前縮到長邊 1600px、**轉 JPEG**（品質約 0.8），目標一張約 200KB。

*為什麼*：手機直拍是 3–5MB，一個物品五張就 25MB，這件事一開始不做之後很難補。而**格式選 JPEG 而不是 WebP，是因為 PocketBase 的 on-demand 縮圖只支援 jpg / png / gif 與「部分」webp** —— 上傳 WebP 會讓我們用不到它的縮圖功能，那正是選 PocketBase 想省下的工作之一。

照片用 PocketBase 的 `file` 欄位，分兩處：**物品上**（機身、型號貼紙，`Max Files` 5）、**更換紀錄上**（耗材包裝、型號標籤，`Max Files` 2）。不需要自建 Photo 表，也不需要自己管檔案路徑。

### 品牌型號的比較只能有一份字串整理

「型號變更」標示與成本統計的品牌分組，比較前都要先整理字串：去頭尾空白、連續空白合一、全形轉半形（NFKC）、英文不分大小寫。**兩處共用 `src/shared/` 裡同一個函式。**

*為什麼*：各寫一份，遲早會出現「更換歷史說沒換型號，統計卻分成 3M 和 3m 兩組」。

### PocketBase 的 API rules 與對外暴露

v0.40.3 原始碼確認：rule 為 `null` 時只有管理員能存取（其他請求回 403），空字串 `""` 則任何人都能存取。前端沒有登入，所以 P1-5 的 migration 把六個 collection 的五種 rule 都設為 `""`。從後台新建 collection 時，五種 rule 預設都是 `null`（P1-6 實測）。新增 collection 一律寫成 migration，並明確設定 rule，否則前端會收到 403。

無論預設為何，**這台機器不可對外暴露**。目前沒有 auth，任何能連到區網的裝置都能讀寫全部資料。

### PocketBase 有幾個預設值要改

- **batch API 預設關閉**（v0.40.3 原始碼 `Batch.Enabled: false`）。「新增物品同時寫入第一筆更換紀錄」需要在同一個交易完成，所以由 migration 開啟。batch 內的請求拿不到前一個請求建立的 id，物品 id 由前端先產生（15 個 `[a-z0-9]` 字元），更換紀錄才能引用它
- **JS SDK 會自動取消重複的請求**：同一個方法＋路徑還在等回應時，前一個會被取消並丟出錯誤。`listLogs` 與 `listLogsByItem` 打的是同一個路徑，同時發出就會互相取消，所以 `src/repo/client.ts` 關掉這個功能
- **batch 一次最多 50 個請求（v0.40.3 預設）**：刪除物品後的「復原」要把物品和所有更換紀錄放在同一個 batch 寫回，由 migration 調成 1000，也就是更換紀錄 999 筆以內可以復原（2026-09-13 以 999 筆實測，沒有超過 3 秒的交易逾時）。這個限制只存在 PocketBase 期間，P3 換成裝置 SQLite 後改用本機交易，沒有這個上限
- **batch 交易逾時 3 秒**（v0.40.3 預設）：還原備份要在同一個 batch 覆蓋全部資料與照片，由 migration 調成 30 秒

### 同一個 batch 裡不要刪掉紀錄再用同一個 id 建回來

PocketBase 刪除有檔案欄位的紀錄後，會在**交易完成時另開背景工作清掉整個 `storage/<collection>/<紀錄 id>/`**（v0.40.3 原始碼 `core/db.go` 的 `OnComplete`、`core/base.go` 的 `__pbFilesManagerDelete__`）。同一個 batch 裡用同一個 id 建回來時，新照片在交易完成前就上傳到那個資料夾，會跟著被清掉：紀錄還記得檔名，檔案 404。

2026-09-15 還原備份就這樣丟了物品照片（P2-13 原本的寫法是先刪全部再建回來）。改成：目前已有的 id 用更新，`photos` 整組換成備份裡的照片；PocketBase 更新時只依檔名刪掉舊照片，不會清整個資料夾（`src/repo/index.ts` 的 `replaceAllData`）。

刪除與復原分成兩次請求（刪物品後按「復原」）時沒遇到這個問題：背景清理在刪除那次請求完成後就開始，按復原至少隔了幾秒。沒有實測過兩次請求緊接著送出的情況。

### 每個物品至少一筆更換紀錄

新增物品時就寫入第一筆更換紀錄，**沒有例外**：選了「不知道上次更換日」也建立一筆，日期留空、存預計到期日。只剩一筆時不能刪除。

*為什麼*：讓 due 的計算只有一條路徑，不會出現「物品存在但算不出到期日」的狀態。

### 底部面板會讓面板外的東西不能操作

底部面板用 `<dialog>` 的 `showModal()`，打開期間面板以外的元素都會被瀏覽器設成不可操作，連 popover 也一樣。所以提示條要放進最上層的面板裡；面板被移除時，要搬到下一個面板或回到頁面上（`src/components/ToastProvider.tsx`，P2-3 手機實測）。之後新增任何「面板開著時也要能按」的東西，都要照這個做法。

---

## 指令

套件管理用 pnpm（版本由 `package.json` 的 `packageManager` 固定）。

### 開發

```sh
pnpm install
docker compose up -d   # PocketBase，http://127.0.0.1:8090；後台 http://127.0.0.1:8090/_/
pnpm dev               # Vite 開發伺服器；/api 轉到 127.0.0.1:8090（vite.config.ts）
```

### 檢查（交付前全部要過）

```sh
pnpm test           # Vitest
pnpm lint           # oxlint，含 type-aware 檢查
pnpm format:check   # Prettier；要自動修正用 pnpm format
pnpm build          # tsc -b 型別檢查 ＋ vite build
```

### 更新手機上看到的版本

前端是在 build image 時打包進容器的，改完程式要重建，手機（區網連 8090）才看得到：

```sh
docker compose up -d --build
```

`pb_migrations/` 裡新的 migration 在 PocketBase 啟動時套用，重建或重啟容器才會生效。只加 migration、沒改前端時，`docker compose restart` 應該也夠（未實測）。

### 備份 `pb_data`

伺服器每天台北 03:00 自動備份到 `pb_data/backups`，保留 7 份；但跟資料在同一個資料夾，手動複製到別處仍要做。

先停容器，避免複製到寫到一半的資料庫。備份不要放 `/ramdisk`，重開機會消失。

```sh
docker compose stop
cp -a pb_data <備份位置>/pb_data-$(date +%F-%H%M)
docker compose start
```

還原（未實測）：先把現有的 `pb_data` 改名移開，再複製備份。目標資料夾已經存在時，`cp` 會把備份複製成它底下的子資料夾，PocketBase 仍用原本的資料，還原沒有生效。

```sh
docker compose stop
mv pb_data pb_data-replaced-$(date +%F-%H%M)
cp -a <備份位置>/pb_data-XXXX pb_data
docker compose start
```

### 升級 PocketBase

版本號與 checksum 要一起改：只改一個，build 會因 checksum 不符而失敗，跑著的仍是舊版（2026-09-15 升 v0.40.4 時一度只改了 checksum）。

1. 看新版 release notes 有沒有破壞性變更
2. 備份 `pb_data`（見上方「備份 `pb_data`」）
3. 改 `Dockerfile` 的 `PB_VERSION` 與 checksum（取自該版 release 的 `checksums.txt`），兩個一起改
4. `docker compose up -d --build`，確認 build 沒失敗
5. `docker compose exec pocketbase /pb/pocketbase --version` 確認是新版本
6. 實測主要功能

回滾：`docker compose stop` → `Dockerfile` 改回 → `pb_data` 換回備份（見上方還原步驟）→ `docker compose up -d --build`

### commit

明確指定檔案（例如 `git add CLAUDE.md docs/`），不要用 `git add -A`：沙箱會在專案根目錄掛出空的設定檔（見 `.gitignore` 的說明），`-A` 會把它們收進去。

---

## 決策紀錄

| 決定 | 理由 |
|---|---|
| **PocketBase（暫定；P1-21、P2-14 檢核後續用，P3-7 決定去留）** | 這個專案的後端終將消失（P3 全部搬上裝置），所以「寫最少的鷹架」比「後端寫得漂亮」重要。PocketBase 讓後端程式碼接近零，還內建檔案上傳、on-demand 縮圖、admin 後台與備份 API |
| **P3 不把 PocketBase 包進 app，改用裝置上的 SQLite** | 技術上可行（社群用 gomobile 編成 Android/iOS 套件，在 app 內跑一個 localhost 伺服器），但官方不支援；唯一的社群專案 pocketbase_mobile 停在 v0.24.4，2025-01 後沒更新（官方已到 v0.40.3）；Capacitor 沒有現成外掛，要自己寫 Kotlin／Swift 包裝。為了省下 P3 重寫 `src/repo/` 的成本，換來一個卡在舊版、要自己維護的原生依賴，不划算。2026-09-11 查證 |
| **P1、P2 維持 PocketBase 網頁版，不從 P1 就做 Capacitor app** | 2026-09-11 評估過「P1 直接做 app、資料存裝置上的 SQLite」：可省掉 PocketBase、Docker、P3 的 `src/repo/` 重寫與資料搬遷；代價是 P1 就要架 Android 建置環境、沒有 admin 後台與現成縮圖。已知 PocketBase 的照片與備份功能到 P3 仍要在 app 內重做。維持現規劃的理由：想最快開始用，網頁版從骨架到手機能用的路徑最短；Android 建置（SDK、打包、安裝）的成本留到 P3 再付 |
| **SQLite，不是 Postgres** | 單人使用沒有併發問題；備份就是複製一個目錄；資料結構直接就是未來 app 版要用的結構 |
| **不用 Next.js** | 這個 app 用不到 SSR / RSC / SEO，而 Capacitor 需要純靜態前端會逼我們開 `output: 'export'`，把 Next.js 一半功能關掉，剩下的只是比較笨重的 React 路由器 |
| **Capacitor，不是 React Native / Flutter** | 這個 app 是表單 + 清單 + 相機 + 本地通知，全在 Capacitor 舒適區。RN 要重寫 UI、Flutter 連資料層都要用 Dart 重寫。付出的重寫成本換來的原生手感在這個 app 上感覺不到 |
| **不做 Telegram 推播** | 最終形態是 app，本地通知不需要 HTTPS、不需要 server、不需要憑證，整個在手機裡。Web Push 則需要在家裡那台掛憑證，為一個過渡期功能付這個成本不划算 |
| **金額記在 Purchase，不是 Log** | 一捲濾網 400 元可換五台冷氣。記在 Log 會逼使用者第一台記 400、後四台記 0，單次成本是假的。分開後成本統計從 Purchase 算，永遠正確 |
| **類別是一對多，不是多對多的 tag** | 一個物品只屬於一個類別，分組、icon 與顯示名稱才沒有歧義。原本「類別能當設定範本」的理由已不成立（見「週期記在更換紀錄上」） |
| **週期用天數，不用月** | 消耗品不在乎今天是幾號，只在乎裝上去多久了。天數是更誠實的模型，也不需要處理「1/31 加一個月是哪天」 |
| **週期記在更換紀錄上，不在物品或類別上** | 同類別的耗材週期並不相同（餐廳冷氣少開、主臥天天開），換了品牌型號週期也可能不同。週期跟品牌型號屬於同一件事：這次裝進去的耗材能用多久 |
| **提前提醒天數記在物品上，不做繼承** | 這個值設錯的代價很低（只是早幾天或晚幾天提醒），不值得為它保留「物品 > 類別 > 全域」整條繼承機制 |
| **物品名稱改成選填的補充名稱** | 選了位置與類別就知道是什麼。首頁依位置分組、物品頁依類別分組時，列表中的名稱沒有用處 |
| **首頁依位置分組** | P0 原型並陳「依緊急度」與「依位置」後，使用者選定依位置；有逾期物品的位置暫時置頂 |
| **品牌型號沒填時留空** | 畫面比顯示「未記錄品牌」乾淨，資料本身相同。例外是成本統計依品牌分組時，空值那組要有名稱 |
| **更換日期不限制修改，用提示條說明結果** | 這類修改很少發生，而且是使用者自己剛做的動作，結果就在眼前。用提示條說明結果並提供復原，比每次多一個確認步驟輕 |
| **原型關卡** | 原型改一次便宜，寫進程式後再改貴好幾倍，所以畫面要先確認。但要求 P0 涵蓋所有階段的畫面，P3、P4 需求還不穩定，P0 會沒有終點，所以改成每階段開工前各自把關 |
| **Tailwind CSS** | 手機優先的 responsive 寫起來最順，不用維護類名體系。P0 原型用 CDN 版（v3）寫，正式版用 v4，版面搬過來時要改少數 class：`shadow`→`shadow-sm`、`rounded`→`rounded-sm`、`outline-none`→`outline-hidden`；`border` 預設色改為 `currentColor`，要明確寫顏色 class |
| **字型檔放進 repo，不從 CDN 載入** | 紀律 2 要求前端能離線開啟，Google Fonts CDN 在 Capacitor 離線時載不到。DM Mono 只放 latin 子集的 400、500 兩個 woff2（原型只用到這兩個字重，中文由系統字型接手），授權 OFL 1.1，授權檔放在字型旁邊 |
| **Vitest** | 與前端同一套工具鏈，`src/shared/due.ts` 的測試不需要額外配置 |
| **oxlint，不用 ESLint** | TypeScript 用 7.0，而 typescript-eslint 8.70 只支援 `typescript <6.1.0`（7.0 沒有程式化 API）；要用 ESLint 得另裝 `@typescript/typescript6` 別名，編輯器與 build 會用不同 TS 版本。oxlint 的 type-aware 反而要求 TS 7.0+。代價是 type-aware 仍是 beta。2026-09-11 查證 |
| **拖曳排序用 `@dnd-kit/react`，不用舊版 `@dnd-kit/core`** | 舊版 2024-12 後沒有新版；新版宣告支援 React 19 且持續開發，代價是 0.x 可能有破壞性改版，所以拖曳程式集中在一個檔案，換套件時只改那裡。不另裝 `@dnd-kit/helpers`，排序搬移自己寫（`moveItem`）。2026-09-15 查證 |
| **備份用 app 自己的格式，不用 PocketBase 備份 API** | 備份 API 需要超級管理員登入，前端沒有登入；PocketBase 的備份檔是它的 SQLite 資料庫，P3 換成裝置 SQLite 後讀不了。自己的格式（zip：JSON＋照片）不用登入，P3-6 也能沿用。2026-09-15 決定 |
| **「今天」依裝置時區，不寫死 `Asia/Taipei`** | 之後想讓其他國家的使用者使用。日期本身存成不帶時區的 `YYYY-MM-DD`，只有「今天是幾號」需要時區，交給裝置決定就不必做時區設定。代價是出國時「今天」會變成當地日期 |

### PocketBase 是暫定的：退場條件與成本

這是「**先用它跑 P0/P1，不滿意再換**」的決定，不是定案。P0 完全不碰後端，所以實際的試用從 P1 才開始。

**退場條件** —— 出現以下任一項就重新評估，不要靠模糊的不爽：

1. collection 的 API rule / 權限模型擋住我們想做的事
2. 手寫 TS 型別與 PocketBase schema drift 造成的 bug 反覆出現，zod 邊界擋不住
3. 升級時遇到 v0.23 等級的破壞性改版
4. 需要的查詢 PocketBase 做不到，被迫寫 pb_hooks

**P1-21 檢核結果（2026-09-14）：四項都未觸發，續用到 P2 結束前再檢核一次（P2-14）。**

1. 權限：P1 的讀寫都沒被擋。但 P2-13 會碰到限制——備份 API 需要超級管理員登入（v0.40.3 `apis/backup.go`），前端沒有登入不能直接呼叫
2. 型別：zod 擋下了零值與不存在的日期，P1 期間沒有型別不一致的 bug；`photos`、`purchases` 還沒接上，要到 P2 才算測過
3. 升級：版本固定在 v0.40.3，沒升級過，這條其實還沒測到（當時最新版 v0.40.4 是修補版）
4. 查詢：P1 的讀寫都用 REST API ＋ JS SDK 完成，沒寫 pb_hooks；最接近的是「只剩一筆不能刪」只能先查再刪，單人使用可以接受

當初選 PocketBase 的主要理由（檔案上傳、on-demand 縮圖、備份）在 P1 都還沒用到，要到 P2 才會兌現或落空。

**P2-14 檢核結果（2026-09-15）：四項都未觸發，續用到 P3，去留由 P3-7 決定。**

1. 權限：P2-13 碰到備份 API 需要超級管理員登入，改成 app 自己匯出與還原繞過；其他功能沒被擋
2. 型別：`photos`、`purchases` 接上後沒有型別不一致的 bug。踩到的是欄位行為：更新時帶 `photos` 會刪掉沒列到的檔案，已寫進「型別要自己顧」；同一個 batch 刪掉再用同一個 id 建回來會丟照片，還原備份因此丟過一次物品照片，見「同一個 batch 裡不要刪掉紀錄再用同一個 id 建回來」
3. 升級：2026-09-15 從 v0.40.3 升到 v0.40.4（修補版），只改 Dockerfile 的版本與 checksum，app 程式不用改，實測正常。跨小版本（例如 0.41）的升級還沒走過
4. 查詢：沒寫 pb_hooks。前端先查再做、不是原子操作的有「只剩一筆不能刪」與「採購紀錄沒人指向才刪」；autodate 建立時間不能寫入，還原後同一天多筆的先後不保證。batch 可以帶檔案，新增連照片、還原全部資料都做成單一交易

三個理由：檔案上傳**兌現**（不寫上傳 API、張數與格式由欄位把關）；on-demand 縮圖**兌現**（預設 100x100，不用改 migration）；備份**部分落空**（前端用不了備份 API，匯出與還原自己做；伺服器排程備份由 migration 設定）。

**退場成本** —— 換回自建後端（Hono + Prisma + SQLite）需要：重寫 `src/repo/`、建後端專案、做一次性資料搬遷。

**UI 不用動。** 這正是紀律 1 要保護的東西。

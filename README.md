# 抽獎系統

一個功能完整的企業活動抽獎系統，支援報到、名單管理、隨機抽獎、視覺特效、音效播放，並將中獎紀錄儲存至 Google 試算表。

## 功能特色

- ✅ **報到系統**：掃 QR Code 或手動輸入工號密碼報到
- ✅ **名單管理**：CSV/Excel 匯入、編輯、搜尋、篩選
- ✅ **隨機抽獎**：支援多獎項、單筆/批次抽選、跳過已中獎者
- ✅ **視覺特效**：Slot 機動畫、Confetti 彩帶、大螢幕模式
- ✅ **音效播放**：抽獎音效、得獎音樂
- ✅ **資料儲存**：所有中獎紀錄自動寫入 Google 試算表
- ✅ **管理後台**：重抽、還原、匯出中獎名單

## 技術棧

- **前端**：React 18 + Vite
- **樣式**：Tailwind CSS
- **特效**：canvas-confetti
- **後端**：Google Apps Script (GAS)
- **資料庫**：Google 試算表

## 安裝與執行

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 Google Apps Script

系統已預設使用以下 Google Apps Script Web App URL：
```
https://script.google.com/macros/s/AKfycbxVqLsrEWQt-AGJPuwBTH-aZmGW1bmfGGsLAyVvp33VYjIuvXXAKzv1QB4z42-PlNkOgQ/exec
```

請確保您的 Google Apps Script 已正確部署並支援以下 API 端點：
- `getParticipants` - 取得參與者名單
- `getPrizes` - 取得獎項列表
- `getWinners` - 取得中獎紀錄
- `checkIn` - 報到
- `appendWinner` - 新增中獎紀錄
- `removeWinner` - 移除中獎紀錄（重抽）
- `updateParticipant` - 更新參與者狀態
- `importParticipants` - 匯入名單
- `updatePrize` - 更新獎項
- `exportWinners` - 匯出中獎名單

### 3. 準備音效檔（可選）

在 `public/sfx/` 目錄下放置以下音效檔：
- `spinning.mp3` - 抽獎轉盤音效
- `win.mp3` - 得獎音效

如果沒有音效檔，系統仍可正常運作，只是不會播放音效。

### 4. 執行開發伺服器

```bash
npm run dev
```

系統將在 `http://localhost:3000` 啟動。

### 5. 專屬網址說明

系統提供兩種專屬網址，用於不同的使用場景：

#### 📍 報到專屬網址
- **URL**: `http://localhost:3000/checkin`
- **功能**：只顯示報到功能，不顯示導航列
- **用途**：提供給報到人員使用，避免誤操作抽獎或管理功能

#### 🔧 管理後台專屬網址
- **URL**: `http://localhost:3000/admin`
- **功能**：顯示完整導航列（報到、抽獎、管理後台），可切換所有功能
- **用途**：提供給管理人員使用

#### 🏠 預設網址
- **URL**: `http://localhost:3000/`
- **功能**：顯示完整導航列，可切換所有功能

詳細說明請參考 [ROUTES.md](./ROUTES.md)

### 6. 建置生產版本

```bash
npm run build
```

建置後的檔案將在 `dist/` 目錄。

### 7. 部署到網路

要讓外部網路可以連線使用，請參考 [DEPLOYMENT.md](./DEPLOYMENT.md) 的完整部署指南。

**快速部署方式（推薦）**：
1. 將程式碼推送到 GitHub
2. 使用 [Vercel](https://vercel.com/) 或 [Netlify](https://www.netlify.com/) 一鍵部署
3. 確認 Google Apps Script 已正確部署（參考 [GAS_DEPLOYMENT.md](./GAS_DEPLOYMENT.md)）

部署完成後，您就可以透過網址分享給使用者：
- **報到專用**：`https://你的網址.com/checkin`
- **管理後台**：`https://你的網址.com/admin`
- **抽獎頁面**：`https://你的網址.com/`

## Google 試算表結構

系統需要一個名為 `LOTTERY` 的 Google 試算表，包含以下三個工作表：

### 1. participants (參與者名單)
- `id` - 員工編號
- `name` - 姓名
- `department` - 公司部門別
- `checked_in` - 報到狀態 (0=未報到, 1=已報到, 2=公差無法到場但可抽, 9=因公未到但可抽獎)
- `won` - 是否中獎 (TRUE/FALSE)
- `checked_date` - 報到時間
- `notes` - 備註

### 2. prizes (獎項)
- `prize_id` - 流水碼
- `prize_title` - 獎項名稱（特獎、一獎、二獎...）
- `prize_name` - 獎品名稱（現金20萬元、iPhone 16 Pro...）
- `quantity` - 獎品數量
- `description` - 獎品備註
- `order` - 抽獎順序

### 3. winners (中獎紀錄)
- `timestamp` - ISO 時間戳
- `prize_id` - 獎品流水碼
- `prize_title` - 獎項名稱
- `prize_name` - 獎品名稱
- `participant_id` - 員工編號
- `participant_name` - 姓名
- `admin` - 操作者
- `claimed` - 是否領取 (TRUE/FALSE)
- `notes` - 備註

## 使用說明

### 報到頁面
1. 參與者掃描 QR Code 或手動輸入工號和密碼
2. 系統驗證後完成報到

### 抽獎頁面
1. 選擇要抽取的獎項
2. 選擇單筆抽選或批次抽選
3. 點擊「開始抽獎」
4. 觀看動畫效果
5. 中獎結果自動儲存至 Google 試算表

### 管理後台
- **參與者名單**：匯入 CSV/Excel、搜尋、篩選
- **獎項管理**：查看所有獎項資訊
- **中獎紀錄**：查看所有中獎紀錄、匯出名單

## 安全隨機抽選

系統使用 `crypto.getRandomValues` API 產生不可預測的隨機數，並採用 Fisher-Yates shuffle 演算法確保抽選的公平性。

## 大螢幕模式

點擊「大螢幕模式」按鈕可進入全螢幕顯示，適合在活動現場的大螢幕上展示。

## 注意事項

1. 音效播放需要使用者互動（點擊按鈕）才能觸發，這是瀏覽器的安全限制
2. 確保 Google Apps Script 的權限設定正確，允許適當的使用者存取
3. 建議在活動前先測試所有功能
4. CSV 匯入格式需符合 participants 工作表的欄位結構

## 授權

本專案為企業內部使用系統。



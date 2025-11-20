# 快速開始指南

## 1. 安裝依賴

```bash
npm install
```

## 2. 確認 Google Apps Script 設定

系統已預設使用以下 Web App URL：
```
https://script.google.com/macros/s/AKfycbxVqLsrEWQt-AGJPuwBTH-aZmGW1bmfGGsLAyVvp33VYjIuvXXAKzv1QB4z42-PlNkOgQ/exec
```

請確認您的 Google Apps Script 已正確部署並支援所需的 API 端點。

## 3. 準備音效檔（可選）

在 `public/sfx/` 目錄下放置：
- `spinning.mp3` - 抽獎轉盤音效
- `win.mp3` - 得獎音效

如果沒有音效檔，系統仍可正常運作。

## 4. 啟動開發伺服器

```bash
npm run dev
```

系統將在 `http://localhost:3000` 啟動。

## 5. 使用流程

### 報到階段
1. 開啟「報到」頁面
2. 參與者輸入工號和密碼
3. 系統驗證並記錄報到狀態

### 抽獎階段
1. 開啟「抽獎」頁面
2. 選擇要抽取的獎項
3. 選擇單筆或批次抽選模式
4. 點擊「開始抽獎」
5. 觀看動畫效果
6. 中獎結果自動儲存

### 管理階段
1. 開啟「管理後台」
2. 匯入參與者名單（CSV/Excel）
3. 查看中獎紀錄
4. 匯出中獎名單

## 6. 大螢幕模式

在抽獎頁面點擊「大螢幕模式」按鈕，系統會進入全螢幕顯示，適合在活動現場的大螢幕上展示。

## 7. CSV 匯入格式

參考 `public/participants-example.csv` 檔案格式：

```csv
id,name,department,checked_in,won,checked_date,notes
E001,張三,資訊部,0,FALSE,,
E002,李四,人事部,0,FALSE,,
```

## 注意事項

- 確保 Google 試算表已建立並包含三個工作表：`participants`、`prizes`、`winners`
- 音效播放需要使用者互動才能觸發（瀏覽器安全限制）
- 建議在活動前先測試所有功能
- 抽獎使用 `crypto.getRandomValues` 確保隨機性



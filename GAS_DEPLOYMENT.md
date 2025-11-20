# Google Apps Script 部署說明

## 步驟 1：建立 Google Apps Script 專案

1. 前往 [Google Apps Script](https://script.google.com/)
2. 點擊「新增專案」
3. 將專案命名為「抽獎系統」或您喜歡的名稱

## 步驟 2：貼上代碼

1. 刪除預設的 `myFunction` 函式
2. 開啟 `gas-code.gs` 檔案
3. 複製所有代碼
4. 貼到 Google Apps Script 編輯器中

## 步驟 3：建立 Google 試算表

1. 建立一個新的 Google 試算表
2. 將試算表命名為 **`LOTTERY`**（必須與代碼中的名稱一致）
3. 建立三個工作表（tabs），名稱分別為：
   - `participants` - 參與者名單
   - `prizes` - 獎項
   - `winners` - 中獎紀錄

### 設定工作表標題列

#### participants 工作表
在第一列設定以下標題：
```
id | name | department | checked_in | won | checked_date | notes
```

#### prizes 工作表
在第一列設定以下標題：
```
prize_id | prize_title | prize_name | quantity | description | order
```

#### winners 工作表
在第一列設定以下標題：
```
timestamp | prize_id | prize_title | prize_name | participant_id | participant_name | admin | claimed | notes
```

**注意**：如果工作表不存在，代碼會自動建立並設定標題列。

## 步驟 4：連結試算表

1. 在 Google Apps Script 編輯器中
2. 點擊左側的「專案設定」（齒輪圖示）
3. 在「試算表」欄位中，選擇您建立的 `LOTTERY` 試算表
4. 或者，直接在試算表中點擊「擴充功能」→「Apps Script」，這樣會自動連結

## 步驟 5：部署為 Web App

1. 在 Google Apps Script 編輯器中，點擊右上角的「部署」→「新增部署作業」
2. 點擊「選取類型」旁邊的齒輪圖示，選擇「Web 應用程式」
3. 設定部署選項：
   - **說明**：抽獎系統 API
   - **執行身份**：我
   - **具有存取權的使用者**：只有我自己（或根據需求選擇）
4. 點擊「部署」
5. **複製 Web App URL**，格式如下：
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```

## 步驟 6：更新前端代碼中的 URL

1. 開啟 `src/services/api.js`
2. 將 `GAS_URL` 更新為您剛才複製的 Web App URL：
   ```javascript
   const GAS_URL = '您的 Web App URL';
   ```

## 步驟 7：測試

1. 在 Google Apps Script 編輯器中，點擊「執行」按鈕測試 `doPost` 函式
2. 或者直接在前端應用程式中測試 API 呼叫

## API 端點說明

代碼實作了以下 API 端點：

- `getParticipants` - 取得參與者名單
- `getPrizes` - 取得獎項列表
- `getWinners` - 取得中獎紀錄
- `checkIn` - 報到（需要 participantId 和 password）
- `appendWinner` - 新增中獎紀錄
- `removeWinner` - 移除中獎紀錄（重抽）
- `updateParticipant` - 更新參與者狀態
- `importParticipants` - 匯入名單
- `updatePrize` - 更新獎項
- `exportWinners` - 匯出中獎名單

## 注意事項

1. **權限設定**：如果設定為「只有我自己」，必須使用部署 Web App 的 Google 帳號登入瀏覽器
2. **試算表名稱**：必須與代碼中的 `SPREADSHEET_NAME` 一致（預設為 `LOTTERY`）
3. **工作表名稱**：必須與代碼中的工作表名稱一致
4. **首次執行**：首次執行時，Google 會要求授權存取試算表，請點擊「允許」

## 疑難排解

### 錯誤：找不到試算表
- 確認試算表名稱是否為 `LOTTERY`
- 確認 Apps Script 專案已正確連結到試算表

### 錯誤：權限被拒絕
- 確認已授權 Apps Script 存取試算表
- 確認 Web App 的權限設定正確

### API 呼叫失敗
- 檢查 Web App URL 是否正確
- 檢查瀏覽器控制台的錯誤訊息
- 確認已使用正確的 Google 帳號登入


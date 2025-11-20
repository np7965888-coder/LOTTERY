# 快速修復指南

## 問題：無法連接到 Google Apps Script

### 立即檢查項目

#### 1. 確認 Web App URL 正確

1. 前往 [Google Apps Script](https://script.google.com/)
2. 開啟您的專案
3. 點擊「部署」→「管理部署作業」
4. 點擊部署項目旁邊的「編輯」圖示（鉛筆）
5. **複製 Web App URL**
6. 確認 `src/services/api.js` 中的 `GAS_URL` 與此 URL **完全一致**

#### 2. 確認 Google 帳號

1. 在瀏覽器中，點擊右上角的 Google 帳號圖示
2. 確認已使用**部署 Web App 的 Google 帳號**登入
3. 如果使用多個帳號：
   - 登出所有 Google 帳號
   - 重新登入正確的帳號
   - 或使用無痕模式測試

#### 3. 測試 Web App URL

1. 在瀏覽器中直接開啟 Web App URL
2. 應該會看到錯誤訊息（因為沒有提供 action 參數）
3. 如果看到登入頁面，表示需要登入正確的帳號
4. 如果看到 404 或無法存取，表示 URL 不正確或未部署

#### 4. 重新部署 Web App

1. 在 Google Apps Script 編輯器中
2. 點擊「部署」→「管理部署作業」
3. 點擊「編輯」（鉛筆圖示）
4. 點擊「部署」
5. **複製新的 Web App URL**
6. 更新 `src/services/api.js` 中的 `GAS_URL`

#### 5. 使用測試工具

1. 開啟瀏覽器開發者工具（F12）
2. 切換到 Console 標籤
3. 輸入：`testGASConnection()`
4. 按 Enter 執行
5. 查看詳細的測試結果

### 常見問題

#### Q: URL 看起來正確，但還是無法連接
A: 
- 確認已重新部署 Web App（每次修改代碼後都需要重新部署）
- 確認權限設定為「只有我自己」
- 確認執行身份為「我」

#### Q: 看到「需要授權」的訊息
A:
- 在 Google Apps Script 編輯器中，點擊「執行」按鈕
- 選擇一個函式（例如 `testGetParticipants`）
- 點擊「授權存取」
- 選擇您的 Google 帳號
- 點擊「進階」→「前往 [專案名稱]（不安全）」
- 點擊「允許」

#### Q: 在瀏覽器中開啟 URL 看到 HTML 錯誤頁面
A:
- 這是正常的（因為沒有提供 action 參數）
- 但如果看到登入頁面，表示需要登入正確的帳號
- 如果看到 403 錯誤，表示權限設定有問題

### 檢查清單

- [ ] Web App URL 與 `src/services/api.js` 中的 URL 一致
- [ ] 已使用正確的 Google 帳號登入瀏覽器
- [ ] Web App 已重新部署
- [ ] 權限設定為「只有我自己」
- [ ] 執行身份為「我」
- [ ] 已授權 Apps Script 存取試算表
- [ ] 試算表名稱為 `LOTTERY`
- [ ] 可以在瀏覽器中開啟 Web App URL（即使有錯誤）

### 如果仍然無法解決

請提供以下資訊：
1. 瀏覽器控制台的完整錯誤訊息（F12 → Console）
2. Network 標籤中的請求詳情（F12 → Network → 點擊失敗的請求）
3. 在瀏覽器中直接開啟 Web App URL 時看到的內容


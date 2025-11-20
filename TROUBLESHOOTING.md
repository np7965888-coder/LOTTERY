# 疑難排解指南

## 問題：載入資料失敗: Failed to fetch

### 已修正的問題

1. **API 請求格式**：已改為使用 `FormData` 而非 JSON，避免 CORS 問題
2. **GAS 代碼**：已更新以支援表單資料格式
3. **錯誤處理**：已改善錯誤訊息，提供更詳細的診斷資訊

### 檢查清單

請依序檢查以下項目：

#### 1. Google Apps Script Web App 部署

- [ ] 確認 Web App 已正確部署
- [ ] 確認 Web App URL 與 `src/services/api.js` 中的 `GAS_URL` 一致
- [ ] 確認權限設定為「只有我自己」
- [ ] 確認執行身份為「我」

#### 2. Google 帳號登入

- [ ] 確認已使用**部署 Web App 的 Google 帳號**登入瀏覽器
- [ ] 如果使用多個 Google 帳號，確認使用正確的帳號
- [ ] 可以嘗試登出所有 Google 帳號後，重新登入正確的帳號

#### 3. Google 試算表設定

- [ ] 確認試算表名稱為 `LOTTERY`（與 GAS 代碼中的 `SPREADSHEET_NAME` 一致）
- [ ] 確認試算表已與 Apps Script 專案連結
- [ ] 確認試算表有 `participants`、`prizes`、`winners` 三個工作表

#### 4. Apps Script 授權

- [ ] 首次執行時，Google 會要求授權，請點擊「允許」
- [ ] 確認 Apps Script 有權限存取試算表

#### 5. 網路連線

- [ ] 確認網路連線正常
- [ ] 確認可以存取 Google 服務
- [ ] 檢查是否有防火牆或代理伺服器阻擋

### 測試步驟

1. **測試 Web App URL**
   - 在瀏覽器中直接開啟 Web App URL
   - 應該會看到錯誤訊息（因為沒有提供 action 參數），但這表示 URL 可存取

2. **檢查瀏覽器控制台**
   - 按 F12 開啟開發者工具
   - 查看 Console 標籤的錯誤訊息
   - 查看 Network 標籤，檢查 API 請求的狀態

3. **測試 GAS 函式**
   - 在 Google Apps Script 編輯器中
   - 建立一個測試函式：
   ```javascript
   function testGetParticipants() {
     const result = handleGetParticipants();
     Logger.log(result);
   }
   ```
   - 執行測試函式，查看是否有錯誤

### 常見錯誤訊息

#### "找不到試算表"
- **原因**：試算表名稱不正確或未連結
- **解決**：確認試算表名稱為 `LOTTERY`，並在 Apps Script 中連結試算表

#### "收到 HTML 回應"
- **原因**：權限問題，Google 返回登入頁面
- **解決**：確認已使用正確的 Google 帳號登入

#### "HTTP 401" 或 "HTTP 403"
- **原因**：權限不足
- **解決**：確認 Web App 權限設定正確，並確認已授權

#### "CORS 錯誤"
- **原因**：已修正（改用 FormData）
- **解決**：如果仍有問題，確認 GAS 代碼已更新

### 更新 GAS 代碼

如果問題仍然存在，請確認：

1. 已將最新的 `gas-code.gs` 代碼貼到 Google Apps Script 編輯器
2. 已重新部署 Web App（部署 → 管理部署作業 → 編輯 → 部署）
3. 已更新版本號碼

### 聯絡支援

如果以上步驟都無法解決問題，請提供：
1. 瀏覽器控制台的完整錯誤訊息
2. Network 標籤中的請求詳情
3. Google Apps Script 執行記錄（檢視 → 執行記錄）


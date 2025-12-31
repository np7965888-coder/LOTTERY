# GitHub Gist 報到設定同步 - 設置指南

本指南將協助您設置 GitHub Gist，以實現報到設定在多個裝置間的自動同步。

## 📋 前置需求

- GitHub 帳號
- 5 分鐘設置時間

## 🚀 快速設置（6 步驟）

### 步驟 1：創建 GitHub Personal Access Token

1. 登入 GitHub
2. 前往 **Settings**（右上角頭像 → Settings）
3. 點選左側選單最下方的 **Developer settings**
4. 點選 **Personal access tokens** → **Tokens (classic)**
5. 點選 **Generate new token** → **Generate new token (classic)**
6. 填寫表單：
   - **Note**: `Lottery App Check-in Settings` （或任意描述名稱）
   - **Expiration**: 選擇 **No expiration**（或依需求設定期限）
   - **Select scopes**: 勾選 **`gist`** ✅
7. 點選頁面最下方的 **Generate token**
8. **⚠️ 重要**：立即複製顯示的 token（格式：`ghp_xxxxxxxxxxxxxx`）
   - Token 只會顯示一次，請妥善保存

### 步驟 2：創建 GitHub Gist

1. 前往 https://gist.github.com/
2. 點選右上角的 **+** 或直接在頁面填寫
3. 填寫 Gist 內容：
   - **Filename**: `checkin-settings.json`
   - **Content**: 
   ```json
   {
     "enabled": true,
     "deadline": ""
   }
   ```
4. 選擇 **Create public gist** 或 **Create secret gist**
   - **Public**: 任何人都可讀取（推薦，讀取速度較快）
   - **Secret**: 只有知道 URL 的人可讀取
5. 點選 **Create public gist** 或 **Create secret gist** 按鈕

### 步驟 3：獲取 Gist ID

創建完成後，您會被導向到 Gist 頁面。從瀏覽器網址列複製 **Gist ID**：

```
https://gist.github.com/your-username/abc123def456789
                                      ^^^^^^^^^^^^^^^^
                                         這就是 Gist ID
```

例如：如果 URL 是 `https://gist.github.com/john/a1b2c3d4e5f6`，則 Gist ID 為 `a1b2c3d4e5f6`

### 步驟 4：本地環境配置（開發環境）

1. 在專案根目錄創建 `.env.local` 文件（可複製 `env.example`）
2. 填入您的設定：

```env
VITE_GIST_ID=a1b2c3d4e5f6
VITE_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxx
```

3. 儲存文件
4. 重新啟動開發伺服器（`npm run dev`）

### 步驟 5：Vercel 環境變數配置（部署環境）

1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案
3. 前往 **Settings** 標籤
4. 點選左側選單的 **Environment Variables**
5. 依次添加以下兩個變數：

   **變數 1：**
   - **Key**: `VITE_GIST_ID`
   - **Value**: 您的 Gist ID（例如：`a1b2c3d4e5f6`）
   - **Environments**: 勾選 **Production**, **Preview**, **Development**

   **變數 2：**
   - **Key**: `VITE_GITHUB_TOKEN`
   - **Value**: 您的 GitHub Token（例如：`ghp_xxxxxxxxxxxxxx`）
   - **Environments**: 勾選 **Production**, **Preview**, **Development**

6. 點選 **Save** 儲存

### 步驟 6：重新部署 Vercel

環境變數設置完成後，需要重新部署才能生效：

1. 在 Vercel Dashboard 中，前往 **Deployments** 標籤
2. 找到最新的部署，點選右側的 **⋯** 選單
3. 選擇 **Redeploy**
4. 等待部署完成（通常 1-2 分鐘）

## ✅ 驗證設置

### 本地驗證

1. 啟動開發伺服器：`npm run dev`
2. 打開瀏覽器開發者工具（F12）→ Console
3. 開啟報到頁面
4. 您應該會看到：`✅ 已從 Gist 同步報到設置`

### Vercel 驗證

1. 開啟管理後台
2. 修改報到設定（例如：設定截止時間）
3. 點選「儲存設定」
4. 應該會顯示：`✅ 已更新並同步到 GitHub Gist（所有裝置將在 10 秒內更新）`
5. 在另一個裝置上開啟報到頁面（或等待 10 秒）
6. 確認設定已同步

## 🔍 故障排除

### 錯誤：VITE_GIST_ID 未設定

**症狀**: Console 顯示 `⚠️ VITE_GIST_ID 未設定，無法同步報到設定`

**解決方案**:
1. 確認 `.env.local` 文件存在且包含 `VITE_GIST_ID`
2. 確認環境變數名稱正確（`VITE_` 前綴不可省略）
3. 重新啟動開發伺服器

### 錯誤：GitHub API 回應錯誤 404

**症狀**: Console 顯示 `GitHub API 回應錯誤: 404`

**解決方案**:
1. 確認 Gist ID 正確無誤
2. 確認 Gist 沒有被刪除
3. 前往 https://gist.github.com/ 檢查 Gist 是否存在

### 錯誤：GitHub API 回應錯誤 401

**症狀**: Console 顯示 `GitHub API 回應錯誤: 401` 或 `Bad credentials`

**解決方案**:
1. 確認 GitHub Token 正確無誤（包含 `ghp_` 前綴）
2. 確認 Token 有 `gist` 權限
3. 確認 Token 沒有過期
4. 嘗試重新生成新的 Token

### 錯誤：Gist 中找不到 checkin-settings.json 檔案

**症狀**: Console 顯示 `Gist 中找不到 checkin-settings.json 檔案`

**解決方案**:
1. 前往您的 Gist 頁面
2. 確認文件名稱完全是 `checkin-settings.json`（區分大小寫）
3. 如果文件名錯誤，點選 **Edit** 修改文件名

### 設定沒有同步到其他裝置

**可能原因**:
1. 等待時間不足（需等待最多 10 秒）
2. 其他裝置的網頁沒有開啟或在背景
3. 網路連線問題

**解決方案**:
1. 確認其他裝置的頁面已開啟且在前景
2. 手動重新整理頁面
3. 檢查開發者工具 Console 是否有錯誤訊息

## 🔒 安全性說明

### Token 安全

- ✅ **正確**：Token 存在環境變數中（`.env.local` 和 Vercel Environment Variables）
- ✅ **正確**：`.env.local` 已在 `.gitignore` 中，不會被提交到 Git
- ❌ **錯誤**：不要將 Token 直接寫在程式碼中
- ❌ **錯誤**：不要將 Token 提交到 Git 或公開分享

### Gist 類型選擇

- **Public Gist**:
  - ✅ 優點：讀取速度快，可被 CDN 緩存
  - ⚠️ 注意：任何人都可讀取設定（但無法修改）
  - 適用於：報到設定不含敏感資訊的情況

- **Secret Gist**:
  - ✅ 優點：只有知道 URL 的人可讀取
  - ⚠️ 注意：仍不是完全私有（URL 可被分享）
  - 適用於：需要額外隱私保護的情況

**建議**：由於報到設定（開啟/關閉、截止時間）不含敏感資訊，使用 **Public Gist** 即可。

## 📦 報到數據 Gist 設置（新增）

### 創建報到數據 Gist

除了報到設定 Gist 之外，還需要創建一個專門用於存儲報到數據的 Gist：

1. 前往 https://gist.github.com/ 創建新 Gist
2. 填寫內容：
   - **文件名**：`checkin-data.json`
   - **內容**：
   ```json
   {
     "checkIns": [],
     "lastUpdated": "",
     "totalCount": 0
   }
   ```
   - 選擇「Public」或「Secret」
3. 創建後複製 Gist ID（從 URL 中）
4. 在 `.env.local` 中添加：
   ```
   VITE_CHECKIN_GIST_ID=your_checkin_data_gist_id
   ```
5. 在 Vercel 環境變數中添加 `VITE_CHECKIN_GIST_ID`

### 兩個 Gist 的區別

系統使用兩個獨立的 Gist：

| Gist | 用途 | 環境變數 | 檔案名稱 |
|------|------|----------|----------|
| **報到設定 Gist** | 存儲報到開關和截止時間 | `VITE_GIST_ID` | `checkin-settings.json` |
| **報到數據 Gist** | 存儲所有用戶的報到記錄 | `VITE_CHECKIN_GIST_ID` | `checkin-data.json` |

**注意**：
- 兩個 Gist 可以使用相同的 GitHub Token
- 兩個 Gist 都需要在 Vercel 環境變數中配置
- 報到數據 Gist 會隨著用戶報到而增長

### 報到數據 Gist 內容格式

```json
{
  "checkIns": [
    {
      "participantId": "12345",
      "name": "張三",
      "department": "技術部",
      "company": "TW",
      "timestamp": "2025-12-31T10:30:00.000Z",
      "checkInCount": 1
    }
  ],
  "lastUpdated": "2025-12-31T10:30:00.000Z",
  "totalCount": 1
}
```

- `checkIns`: 報到記錄陣列
- `lastUpdated`: 最後更新時間
- `totalCount`: 總報到人數

### 同步機制說明

1. **用戶報到**：報到時直接寫入報到數據 Gist
2. **管理員同步**：管理員電腦每 10 秒自動從 Gist 同步報到數據到本地
3. **抽獎使用**：抽獎時使用本地已同步的報到數據
4. **上傳 Google Sheet**：需要時可批次上傳到 Google Sheet 保存

## 📚 技術細節

### 報到設定同步機制

- **管理後台 → Gist**: 使用 `PATCH` 請求更新 Gist（需要 Token）
- **Gist → 報到裝置**: 使用 `GET` 請求讀取 Gist（無需 Token）
- **同步頻率**: 每 10 秒自動同步一次
- **即時性**: 設定更新後，所有裝置在 10 秒內會自動獲取新設定

### 報到設定 API 端點

- **讀取**: `https://api.github.com/gists/{VITE_GIST_ID}`
- **更新**: `https://api.github.com/gists/{VITE_GIST_ID}` (PATCH)

### 報到數據 API 端點

- **讀取**: `https://api.github.com/gists/{VITE_CHECKIN_GIST_ID}`
- **寫入**: `https://api.github.com/gists/{VITE_CHECKIN_GIST_ID}` (PATCH)

### 報到設定 Gist 內容格式

```json
{
  "enabled": true,
  "deadline": "2025-01-15T12:00:00.000Z",
  "lastUpdated": "2025-12-31T10:30:00.000Z"
}
```

- `enabled`: 報到功能開關（`true` / `false`）
- `deadline`: 報到截止時間（ISO 8601 格式，或空字串表示無截止）
- `lastUpdated`: 最後更新時間（自動添加）

## 🎯 日常使用流程

設置完成後，日常使用非常簡單：

1. 管理員在管理後台設定報到時間
2. 點選「儲存設定」
3. 系統自動同步到 GitHub Gist
4. 所有報到裝置在 10 秒內自動更新
5. 無需重新整理頁面或手動操作

## 💡 優點總結

- ✅ **完全免費**: GitHub Gist 免費且無使用限制
- ✅ **設置簡單**: 只需 5 分鐘設置一次
- ✅ **穩定可靠**: GitHub API 99.9% 正常運行時間
- ✅ **自動同步**: 無需手動操作，背景自動更新
- ✅ **跨裝置**: 支援無限數量的報到裝置
- ✅ **Vercel 友好**: 原生支援環境變數
- ✅ **無需額外服務**: 不需註冊 Firebase、Supabase 等第三方服務

## 📞 技術支援

如有任何問題，請檢查：
1. 瀏覽器開發者工具 Console 的錯誤訊息
2. GitHub Gist 內容是否正確
3. 環境變數是否正確設定
4. 本文件的「故障排除」章節


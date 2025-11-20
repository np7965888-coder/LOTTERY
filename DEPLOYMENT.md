# 抽獎系統部署指南

本指南將幫助您將抽獎系統部署到網路上，讓外部使用者可以透過網址連線使用。

## 📋 部署架構

- **前端**：React + Vite（部署到 Vercel/Netlify/GitHub Pages）
- **後端**：Google Apps Script（已部署為 Web App）

## 🚀 方法一：使用 Vercel 部署（推薦）

Vercel 是最簡單且免費的部署方式，支援自動部署和 HTTPS。

### 步驟 1：準備專案

1. 確保專案已建置成功：
```bash
npm run build
```

2. 檢查 `dist` 資料夾是否已生成

### 步驟 2：推送到 GitHub

1. 在專案根目錄初始化 Git（如果還沒有）：
```bash
git init
git add .
git commit -m "Initial commit"
```

2. 在 GitHub 建立新 repository

3. 推送程式碼：
```bash
git remote add origin https://github.com/你的帳號/你的專案名稱.git
git branch -M main
git push -u origin main
```

### 步驟 3：部署到 Vercel

1. 前往 [Vercel](https://vercel.com/)
2. 使用 GitHub 帳號登入
3. 點擊 "Add New Project"
4. 選擇您的 repository
5. 設定專案：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. 點擊 "Deploy"
7. 等待部署完成（約 1-2 分鐘）

### 步驟 4：取得部署網址

部署完成後，Vercel 會提供：
- 生產環境網址：`https://你的專案名稱.vercel.app`
- 預覽網址：每次推送都會產生新的預覽網址

## 🌐 方法二：使用 Netlify 部署

### 步驟 1-2：同 Vercel（準備專案和推送到 GitHub）

### 步驟 3：部署到 Netlify

1. 前往 [Netlify](https://www.netlify.com/)
2. 使用 GitHub 帳號登入
3. 點擊 "Add new site" → "Import an existing project"
4. 選擇您的 repository
5. 設定建置選項：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. 點擊 "Deploy site"
7. 等待部署完成

### 步驟 4：設定重新導向規則

為了支援前端路由，需要在專案根目錄建立 `public/_redirects` 檔案：

```bash
# 在專案根目錄建立
mkdir -p public
echo "/*    /index.html   200" > public/_redirects
```

或者在 `vite.config.js` 中設定：

```js
export default defineConfig({
  // ... 其他設定
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  publicDir: 'public'
})
```

## 📦 方法三：使用 GitHub Pages

### 步驟 1：安裝 gh-pages

```bash
npm install --save-dev gh-pages
```

### 步驟 2：更新 package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

### 步驟 3：更新 vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/你的專案名稱/', // 如果使用 GitHub Pages，需要設定 base
  // ... 其他設定
})
```

### 步驟 4：部署

```bash
npm run deploy
```

## ✅ 確認 Google Apps Script 已部署

在部署前端之前，請確認 Google Apps Script 已正確部署：

1. 開啟 [Google Apps Script](https://script.google.com/)
2. 開啟您的專案
3. 點擊「部署」→「管理部署」
4. 確認：
   - **執行身分**：我
   - **具有存取權的使用者**：任何人（或您需要的權限）
   - **Web App URL** 已複製並更新到 `src/services/api.js` 中的 `GAS_URL`

### 更新 GAS_URL

部署前端後，如果 Google Apps Script URL 有變更，需要更新：

1. 編輯 `src/services/api.js`
2. 更新 `GAS_URL` 常數
3. 重新建置和部署前端

## 🔧 環境變數設定（可選）

如果需要使用環境變數來管理 GAS_URL，可以：

### 1. 建立 `.env` 檔案

```env
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 2. 更新 `src/services/api.js`

```js
const GAS_URL = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbxeCQwlMyf3SZkz31gaAWxhHSmzyglnwBBnkgRNEyQgu1tfNIev7rLR7-7bYlrzm6Jow/exec';
```

### 3. 在 Vercel/Netlify 設定環境變數

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment

## 📱 使用不同網址

根據 `ROUTES.md`，系統支援不同的路由：

- **報到專用網址**: `https://你的網址.com/checkin`
- **管理後台網址**: `https://你的網址.com/admin`
- **抽獎頁面**: `https://你的網址.com/`（預設）

## 🔒 安全性建議

1. **Google Apps Script 權限**：
   - 如果只允許特定人員使用，設定為「只有我自己」
   - 如果需要公開使用，設定為「任何人」

2. **HTTPS**：
   - Vercel 和 Netlify 都自動提供 HTTPS
   - 確保所有 API 呼叫都使用 HTTPS

3. **API 金鑰**（進階）：
   - 可以在 Google Apps Script 中加入 API 金鑰驗證
   - 在前端請求中加入驗證標頭

## 🐛 常見問題

### 問題 1：CORS 錯誤

**解決方案**：
- 確認 Google Apps Script 已正確部署為 Web App
- 確認權限設定為「任何人」或正確的存取權限
- 檢查 `GAS_URL` 是否正確

### 問題 2：路由無法正常運作

**解決方案**：
- Vercel：自動支援，無需額外設定
- Netlify：建立 `public/_redirects` 檔案
- GitHub Pages：需要設定 `base` 路徑

### 問題 3：API 呼叫失敗

**解決方案**：
1. 檢查瀏覽器控制台的錯誤訊息
2. 確認 `GAS_URL` 是否正確
3. 測試 Google Apps Script URL 是否可以直接存取
4. 檢查 Google Apps Script 的執行日誌

## 📝 部署檢查清單

- [ ] 專案已建置成功（`npm run build`）
- [ ] Google Apps Script 已部署為 Web App
- [ ] `GAS_URL` 已更新到最新 URL
- [ ] 程式碼已推送到 GitHub
- [ ] 已選擇部署平台（Vercel/Netlify/GitHub Pages）
- [ ] 部署完成並測試所有功能
- [ ] 確認報到、抽獎、管理後台功能正常
- [ ] 測試不同路由（/checkin, /admin, /）

## 🎉 完成！

部署完成後，您就可以：
- 分享網址給使用者進行報到
- 使用管理後台管理系統
- 進行抽獎活動

如有任何問題，請參考 `TROUBLESHOOTING.md` 或檢查 Google Apps Script 的執行日誌。


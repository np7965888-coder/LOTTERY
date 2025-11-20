# 路由說明

本系統提供兩種專屬網址，用於不同的使用場景：

## 📍 報到專屬網址

**URL**: `http://localhost:3000/checkin` (開發環境)  
**生產環境**: `https://your-domain.com/checkin`

### 功能特點：
- ✅ 只顯示報到功能
- ✅ 不顯示導航列
- ✅ 無法切換到抽獎或管理後台
- ✅ 適合給報到人員使用，避免誤操作

### 使用場景：
- 活動現場的報到站
- 提供給參與者的報到連結
- QR Code 掃描後導向的頁面

---

## 🔧 管理後台專屬網址

**URL**: `http://localhost:3000/admin` (開發環境)  
**生產環境**: `https://your-domain.com/admin`

### 功能特點：
- ✅ 顯示完整導航列（報到、抽獎、管理後台）
- ✅ 可以切換到所有功能頁面
- ✅ 預設顯示管理後台頁面
- ✅ 適合管理人員使用

### 使用場景：
- 活動管理人員的專屬入口
- 需要同時管理報到、抽獎和資料的場合

---

## 🏠 預設網址

**URL**: `http://localhost:3000/` (開發環境)  
**生產環境**: `https://your-domain.com/`

### 功能特點：
- ✅ 顯示完整導航列（報到、抽獎、管理後台）
- ✅ 可以切換到所有功能頁面
- ✅ 預設顯示報到頁面

---

## 📝 部署注意事項

### Vite 開發環境
開發環境已自動支持前端路由，無需額外配置。

### 生產環境部署
如果使用 Nginx、Apache 等 Web 伺服器，需要配置路由回退到 `index.html`：

#### Nginx 配置範例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Apache 配置範例（.htaccess）：
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### Vercel 部署
Vercel 自動支持前端路由，無需額外配置。

#### Netlify 部署
在 `public` 目錄下創建 `_redirects` 文件：
```
/*    /index.html   200
```

---

## 🔒 安全建議

1. **報到專屬網址**：可以公開分享，因為只能進行報到操作
2. **管理後台專屬網址**：建議僅提供給管理人員，不要公開分享
3. 考慮在管理後台加入額外的身份驗證（未來可擴展）

---

## 🧪 測試路由

在瀏覽器中測試以下 URL：

1. `http://localhost:3000/` - 預設頁面（顯示全部功能）
2. `http://localhost:3000/checkin` - 報到專屬頁面（只顯示報到）
3. `http://localhost:3000/admin` - 管理後台專屬頁面（顯示全部功能）


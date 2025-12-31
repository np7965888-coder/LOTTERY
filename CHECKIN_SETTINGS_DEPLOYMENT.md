# 報到設定同步部署指南

## 概述

此系統實現了報到設定的中央化管理，管理員可以在管理後台設定報到截止時間，所有報到設備會自動同步更新。

## 系統架構

```
管理後台 (AdminPanel)
    ↓ 保存設定
服務器 (checkin-settings.json + PHP API)
    ↓ 每 10 秒自動同步
報到頁面 (CheckInPanel) - 多個設備
```

## 檔案說明

### 1. `/public/api/checkin-settings.json`
- **功能**: 存儲報到設定
- **格式**: JSON
- **權限要求**: 
  - 讀取：所有人可讀取 (GET)
  - 寫入：只有 PHP 腳本可寫入

### 2. `/public/api/update-checkin-settings.php`
- **功能**: 更新報到設定的 API 端點
- **方法**: POST
- **權限要求**: 需要 PHP 執行環境

### 3. `/src/services/checkInSettingsApi.js`
- **功能**: 前端 API 服務
- **提供**: `fetchCheckInSettings()` 和 `updateCheckInSettings()`

## 部署步驟

### 方案 A: 使用 PHP 伺服器（推薦）

1. **確保服務器支持 PHP**
   ```bash
   php -v  # 確認 PHP 版本 (需要 7.0+)
   ```

2. **上傳檔案到服務器**
   ```
   /public/api/checkin-settings.json
   /public/api/update-checkin-settings.php
   ```

3. **設置檔案權限**
   ```bash
   chmod 644 /public/api/checkin-settings.json
   chmod 755 /public/api/update-checkin-settings.php
   chown www-data:www-data /public/api/checkin-settings.json  # Linux/Apache
   # 或
   chown nginx:nginx /public/api/checkin-settings.json  # Nginx
   ```

4. **測試 API**
   ```bash
   # 測試讀取
   curl https://your-domain.com/api/checkin-settings.json
   
   # 測試更新
   curl -X POST https://your-domain.com/api/update-checkin-settings.php \
     -H "Content-Type: application/json" \
     -d '{"enabled":true,"deadline":"2024-12-31T23:59:00"}'
   ```

### 方案 B: 使用 Node.js/Express 伺服器

如果不想使用 PHP，可以創建一個簡單的 Node.js API：

```javascript
// server.js
const express = require('express');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const SETTINGS_FILE = './public/api/checkin-settings.json';

// 讀取設定
app.get('/api/checkin-settings.json', async (req, res) => {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// 更新設定
app.post('/api/update-checkin-settings.php', async (req, res) => {
  try {
    const { enabled, deadline } = req.body;
    const settings = {
      enabled: !!enabled,
      deadline: deadline || '',
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.listen(3001, () => {
  console.log('Settings API running on port 3001');
});
```

### 方案 C: 使用無伺服器服務（Serverless）

可以使用以下服務之一：

1. **Vercel Serverless Functions**
2. **Netlify Functions**
3. **AWS Lambda + API Gateway**
4. **Cloudflare Workers**

## 安全性考慮

### 基本版本（當前實現）
- 所有人都可以讀取設定
- 所有人都可以更新設定（需要改進）

### 增強安全性（建議）

1. **添加 API 金鑰驗證**
   ```php
   // 在 update-checkin-settings.php 中添加
   $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
   $validKey = 'your-secret-key-here';  // 從環境變數讀取
   
   if ($apiKey !== $validKey) {
       http_response_code(401);
       echo json_encode(['error' => 'Unauthorized']);
       exit;
   }
   ```

2. **IP 白名單**
   ```php
   $allowedIPs = ['192.168.1.100', '10.0.0.50'];  // 管理員 IP
   $clientIP = $_SERVER['REMOTE_ADDR'];
   
   if (!in_array($clientIP, $allowedIPs)) {
       http_response_code(403);
       echo json_encode(['error' => 'Forbidden']);
       exit;
   }
   ```

3. **限制更新頻率**
   ```php
   // 使用 session 或文件鎖來限制更新頻率
   // 例如：每分鐘最多更新一次
   ```

## 使用方式

### 管理員操作流程

1. **設定報到時間**
   - 登入管理後台
   - 找到「報到設定（全局同步）」區域
   - 設定報到開關和截止時間
   - 點擊「保存設定」

2. **分享報到連結**
   - 點擊「📋 複製報到連結」按鈕
   - 將連結分享給報到設備（可製作 QR Code）
   - **注意**: 連結可以提前分享，設定會自動同步

### 報到設備行為

1. **首次開啟**
   - 從服務器獲取最新報到設定
   - 保存到本地 localStorage

2. **自動更新**
   - 每 10 秒從服務器獲取最新設定
   - 如果設定有變化，自動更新本地設定
   - 無需重新整理頁面

3. **離線處理**
   - 如果無法連接服務器，使用本地緩存的設定
   - 在控制台顯示警告訊息

## 故障排除

### 問題 1: 更新設定後其他設備沒有更新

**檢查項目**:
1. 確認 PHP 腳本有寫入權限
2. 檢查服務器日誌是否有錯誤
3. 在報到設備的瀏覽器控制台查看是否有網路錯誤
4. 確認 CORS 設定正確

**解決方法**:
```bash
# 查看 PHP 錯誤日誌
tail -f /var/log/apache2/error.log

# 查看檔案權限
ls -la /public/api/

# 測試 API 是否正常
curl -v https://your-domain.com/api/checkin-settings.json
```

### 問題 2: CORS 錯誤

**症狀**: 瀏覽器控制台顯示 "CORS policy" 錯誤

**解決方法**:
在 `.htaccess` 中添加（Apache）:
```apache
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type"
</IfModule>
```

或在 Nginx 配置中添加:
```nginx
location /api/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";
}
```

### 問題 3: 檔案無法寫入

**症狀**: 管理後台顯示「服務器同步失敗」

**解決方法**:
```bash
# 給予寫入權限
chmod 666 /public/api/checkin-settings.json

# 確認目錄權限
chmod 755 /public/api/

# 確認擁有者
chown www-data:www-data /public/api/checkin-settings.json
```

## 監控與日誌

建議添加日誌記錄來追蹤設定變更：

```php
// 在 update-checkin-settings.php 中添加
$logEntry = sprintf(
    "[%s] Settings updated: enabled=%s, deadline=%s, IP=%s\n",
    date('Y-m-d H:i:s'),
    $settings['enabled'] ? 'true' : 'false',
    $settings['deadline'],
    $_SERVER['REMOTE_ADDR']
);
file_put_contents(__DIR__ . '/checkin-settings.log', $logEntry, FILE_APPEND);
```

## 效能考量

- **同步頻率**: 預設 10 秒，可根據需求調整
- **快取控制**: 讀取時添加時間戳避免瀏覽器快取
- **並發處理**: PHP 檔案寫入有基本的原子性保證
- **資料大小**: JSON 檔案很小（< 1KB），效能影響可忽略

## 進階優化

### 使用 Redis 或 Memcached
```php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);
$redis->set('checkin_settings', json_encode($settings));
$redis->expire('checkin_settings', 3600);  // 1小時過期
```

### 使用資料庫
```sql
CREATE TABLE checkin_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enabled BOOLEAN DEFAULT TRUE,
    deadline DATETIME,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 總結

這個解決方案的優點：
- ✅ 簡單易部署
- ✅ 不依賴 Google Sheet（速度快）
- ✅ 自動同步到所有設備
- ✅ 可以提前分享連結
- ✅ 無需重新整理頁面

適用場景：
- 中小型活動（< 1000 人）
- 報到設備數量適中（< 50 台）
- 有基本的 web hosting 環境


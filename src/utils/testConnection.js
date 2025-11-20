/**
 * 測試 Google Apps Script 連接
 * 可以在瀏覽器控制台中使用此函式進行測試
 */

// 從 api.js 取得 URL（需要與 api.js 中的 URL 一致）
// 注意：請確保此 URL 與 src/services/api.js 中的 GAS_URL 一致
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz3lU-2Rr2DkQqL89sK4OYJeeEi8wi4JzjF5dON3nzLmL_iAWbfJGdjFPdQChSahioT4Q/exec';

/**
 * 測試 Web App URL 是否可存取
 */
export async function testGASConnection() {
  console.log('開始測試 Google Apps Script 連接...');
  console.log('Web App URL:', GAS_URL);
  
  try {
    // 測試 1: 直接開啟 URL
    console.log('\n測試 1: 檢查 URL 格式...');
    if (!GAS_URL || !GAS_URL.includes('script.google.com')) {
      console.error('❌ URL 格式不正確');
      return false;
    }
    console.log('✅ URL 格式正確');
    
    // 測試 2: 嘗試簡單的 fetch
    console.log('\n測試 2: 嘗試連接...');
    const formData = new FormData();
    formData.append('action', 'getParticipants');
    
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: formData,
      redirect: 'follow',
      credentials: 'include'
    });
    
    console.log('回應狀態:', response.status);
    console.log('回應 OK:', response.ok);
    console.log('回應類型:', response.type);
    
    // 測試 3: 讀取回應內容
    console.log('\n測試 3: 讀取回應內容...');
    const text = await response.text();
    console.log('回應長度:', text.length);
    console.log('回應前 200 字元:', text.substring(0, 200));
    
    // 測試 4: 嘗試解析 JSON
    if (text && text.trim()) {
      try {
        const json = JSON.parse(text);
        console.log('✅ 成功解析 JSON');
        console.log('回應內容:', json);
        return true;
      } catch (e) {
        console.warn('⚠️ 無法解析為 JSON:', e.message);
        if (text.includes('<!DOCTYPE')) {
          console.error('❌ 收到 HTML 回應，可能是權限問題');
          console.log('請確認：');
          console.log('1. 已使用正確的 Google 帳號登入');
          console.log('2. Web App 權限設定正確');
        }
        return false;
      }
    } else {
      console.warn('⚠️ 回應為空');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 連接失敗:', error);
    console.error('錯誤類型:', error.name);
    console.error('錯誤訊息:', error.message);
    
    if (error.message.includes('Failed to fetch')) {
      console.error('\n可能的原因：');
      console.error('1. 網路連線問題');
      console.error('2. CORS 問題（但應該已解決）');
      console.error('3. URL 不正確');
      console.error('4. Web App 未部署');
    }
    
    return false;
  }
}

/**
 * 在瀏覽器控制台中執行測試
 * 使用方法：在控制台輸入 testGASConnection()
 */
if (typeof window !== 'undefined') {
  window.testGASConnection = testGASConnection;
  console.log('測試函式已載入。在控制台輸入 testGASConnection() 進行測試');
}


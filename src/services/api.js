// Google Apps Script Web App URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxeCQwlMyf3SZkz31gaAWxhHSmzyglnwBBnkgRNEyYQgu1tfNIev7rLR7-7bYlrzm6Jow/exec';

/**
 * 呼叫 Google Apps Script API
 * 使用表單資料格式以避免 CORS 問題
 * 包含重試機制和錯誤處理
 */
async function callGAS(action, data = {}, retryCount = 0) {
  const MAX_RETRIES = 2;
  
  try {
    // 建立表單資料（Google Apps Script 更適合處理表單資料）
    const formData = new FormData();
    formData.append('action', action);
    
    // 將資料物件轉換為表單資料
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        if (typeof data[key] === 'object') {
          // 物件和陣列轉為 JSON 字串
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, String(data[key]));
        }
      }
    });

    console.log(`[API] 呼叫 ${action}，嘗試 ${retryCount + 1}/${MAX_RETRIES + 1}`);

    // 使用 fetch 並加入超時處理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 秒超時

    let response;
    try {
      response = await fetch(GAS_URL, {
        method: 'POST',
        body: formData,
        // 不設定 Content-Type，讓瀏覽器自動設定（包含 boundary）
        redirect: 'follow', // 跟隨重定向（Google Apps Script 可能會返回 302）
        signal: controller.signal
        // 注意：權限設定為「任何人」時，不需要 credentials: 'include'
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // 如果是超時或網路錯誤，嘗試重試
      if ((fetchError.name === 'AbortError' || fetchError.message.includes('Failed to fetch')) && retryCount < MAX_RETRIES) {
        console.warn(`[API] 請求失敗，${1000 * (retryCount + 1)}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return callGAS(action, data, retryCount + 1);
      }
      throw fetchError;
    }

    // Google Apps Script 可能會返回 302 重定向，redirect: 'follow' 會自動處理
    // 檢查回應狀態（允許 0 狀態，因為某些情況下可能無法取得狀態碼）
    if (!response.ok && response.status !== 0 && response.status !== 200) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || '請求失敗'}`);
    }

    // 嘗試解析 JSON 回應
    let result;
    let text = '';
    try {
      text = await response.text();
      console.log('API 回應長度:', text.length);
      console.log('API 回應內容（前500字元）:', text.substring(0, 500));
      
      if (!text || text.trim() === '') {
        // 空回應視為錯誤
        throw new Error('收到空回應。請檢查：\n1. Google Apps Script 是否正常運作\n2. 執行記錄中是否有錯誤\n3. Web App 是否已正確部署');
      }
      
      // 嘗試解析 JSON
      try {
        result = JSON.parse(text);
      } catch (jsonError) {
        // 如果無法解析 JSON
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('收到 HTML 回應，可能是權限問題。請確認：\n1. 已使用正確的 Google 帳號登入\n2. Web App 權限設定正確\n3. 已授權 Apps Script 存取試算表\n\n回應內容：' + text.substring(0, 300));
        }
        throw new Error(`無法解析 JSON 回應：${jsonError.message}\n回應內容：${text.substring(0, 300)}`);
      }
    } catch (parseError) {
      console.error('解析回應時發生錯誤:', parseError);
      console.error('回應內容:', text);
      throw parseError;
    }
    
    // 檢查是否有錯誤訊息（優先處理錯誤）
    if (result.error) {
      throw new Error(result.error);
    }
    
    // 對於 checkIn，如果沒有 success 或 name，視為錯誤
    if (action === 'checkIn') {
      if (!result.success) {
        throw new Error(result.message || '報到失敗');
      }
      if (!result.name) {
        throw new Error('報到回應中缺少姓名資訊，請檢查試算表資料');
      }
    }

    return result;
  } catch (error) {
    // 詳細的錯誤日誌
    console.error('=== API 錯誤詳情 ===');
    console.error('Action:', action);
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('GAS URL:', GAS_URL);
    console.error('Retry Count:', retryCount);
    console.error('===================');
    
    // 提供更詳細的錯誤訊息
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError' || error.name === 'NetworkError' || error.name === 'AbortError') {
      // 測試 URL 是否可存取
      let urlTestResult = '未測試';
      try {
        // 嘗試簡單的 HEAD 請求測試
        const testResponse = await fetch(GAS_URL, { 
          method: 'HEAD',
          mode: 'no-cors' // 使用 no-cors 模式測試連線
        });
        urlTestResult = 'URL 可存取（HEAD 測試）';
      } catch (testErr) {
        urlTestResult = 'URL 測試失敗';
      }
      
      const detailedError = `無法連接到 Google Apps Script (嘗試 ${retryCount + 1} 次後失敗)

請檢查以下項目：

1. Web App URL 是否正確
   當前 URL: ${GAS_URL}
   URL 測試: ${urlTestResult}
   - 請確認此 URL 與 Google Apps Script 部署的 URL 完全一致
   - 可以在瀏覽器中直接開啟此 URL 測試
   - 如果看到錯誤訊息（如「缺少 action 參數」），表示 URL 可存取

2. Web App 部署設定
   - 執行身份：我
   - 具有存取權的使用者：任何人
   - 已重新部署並取得新的 URL
   - 確認部署版本是最新的（每次修改代碼後都需要重新部署）

3. Google Apps Script 代碼
   - 確認已將最新的 gas-code.gs 代碼貼到編輯器
   - 確認 doPost 函式存在且正確
   - 檢查執行記錄（檢視 → 執行記錄）是否有錯誤
   - 可以在 Apps Script 編輯器中執行測試函式

4. 網路連線
   - 確認網路連線正常
   - 確認可以存取 Google 服務（如 google.com）
   - 檢查是否有防火牆、代理伺服器或 VPN 阻擋
   - 嘗試使用不同的網路環境測試

5. 瀏覽器設定
   - 嘗試使用無痕模式測試
   - 清除瀏覽器快取
   - 嘗試使用不同的瀏覽器
   - 檢查是否有擴充功能阻擋請求

6. 診斷工具
   - 按 F12 開啟開發者工具
   - 查看 Console 和 Network 標籤的詳細錯誤
   - 在 Console 中輸入 testGASConnection() 進行測試
   - 檢查 Network 標籤中請求的狀態和回應

原始錯誤: ${error.message}
錯誤類型: ${error.name}`;
      throw new Error(detailedError);
    }
    throw error;
  }
}

/**
 * 取得參與者名單
 */
export async function getParticipants() {
  return callGAS('getParticipants');
}

/**
 * 取得獎項列表
 */
export async function getPrizes() {
  return callGAS('getPrizes');
}

/**
 * 取得中獎紀錄
 */
export async function getWinners() {
  return callGAS('getWinners');
}

/**
 * 報到
 */
export async function checkIn(participantId, password) {
  return callGAS('checkIn', { participantId, password });
}

/**
 * 新增中獎紀錄
 */
export async function appendWinner(winnerData) {
  return callGAS('appendWinner', winnerData);
}

/**
 * 批次新增中獎紀錄（優化性能）
 */
export async function appendWinners(winnersList) {
  return callGAS('appendWinners', { winners: winnersList });
}

/**
 * 重抽（移除指定中獎紀錄）
 */
export async function removeWinner(winnerId, timestamp) {
  return callGAS('removeWinner', { winnerId, timestamp });
}

/**
 * 更新參與者狀態
 */
export async function updateParticipant(participantId, updates) {
  return callGAS('updateParticipant', { participantId, updates });
}

/**
 * 匯入名單
 */
export async function importParticipants(participants) {
  return callGAS('importParticipants', { participants });
}

/**
 * 更新獎項
 */
export async function updatePrize(prizeId, updates) {
  return callGAS('updatePrize', { prizeId, updates });
}

/**
 * 匯出中獎名單
 */
export async function exportWinners() {
  return callGAS('exportWinners');
}



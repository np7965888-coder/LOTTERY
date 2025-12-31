/**
 * 報到設置 API
 * 用於管理報到開關和截止時間
 */

// API 端點（根據實際部署調整）
const SETTINGS_URL = '/api/checkin-settings.json';
const UPDATE_URL = '/api/update-checkin-settings.php';

/**
 * 從服務器獲取報到設置
 */
export async function fetchCheckInSettings() {
  try {
    // 添加時間戳避免緩存
    const timestamp = new Date().getTime();
    const response = await fetch(`${SETTINGS_URL}?t=${timestamp}`, {
      method: 'GET',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const settings = await response.json();
    console.log('📥 從服務器獲取報到設置:', settings);
    
    return {
      success: true,
      settings: {
        enabled: settings.enabled ?? true,
        deadline: settings.deadline || '',
        lastUpdated: settings.lastUpdated || ''
      }
    };
  } catch (error) {
    console.error('❌ 獲取報到設置失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 更新服務器上的報到設置
 */
export async function updateCheckInSettings(settings) {
  try {
    const response = await fetch(UPDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: settings.enabled,
        deadline: settings.deadline || ''
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '更新失敗');
    }

    console.log('📤 成功更新服務器報到設置:', result.settings);
    
    return {
      success: true,
      settings: result.settings
    };
  } catch (error) {
    console.error('❌ 更新報到設置失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


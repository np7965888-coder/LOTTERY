// GitHub Gist API 配置
const GIST_ID = import.meta.env.VITE_GIST_ID || '';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || '';

/**
 * 從 GitHub Gist 讀取報到設定
 * @returns {Promise<{success: boolean, settings?: object, error?: string}>}
 */
export async function fetchCheckInSettings() {
  try {
    if (!GIST_ID) {
      console.warn('⚠️ VITE_GIST_ID 未設定，無法同步報到設定');
      return { success: false, error: 'GIST_ID 未設定' };
    }

    const url = `https://api.github.com/gists/${GIST_ID}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`GitHub API 回應錯誤: ${response.status}`);
    }
    
    const gist = await response.json();
    
    if (!gist.files || !gist.files['checkin-settings.json']) {
      throw new Error('Gist 中找不到 checkin-settings.json 檔案');
    }
    
    const content = gist.files['checkin-settings.json'].content;
    const settings = JSON.parse(content);
    
    return { success: true, settings };
  } catch (error) {
    console.error('❌ 讀取 Gist 設定失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新報到設定到 GitHub Gist
 * @param {object} settings - 報到設定 {enabled: boolean, deadline: string}
 * @returns {Promise<{success: boolean, settings?: object, error?: string}>}
 */
export async function updateCheckInSettings(settings) {
  try {
    if (!GIST_ID) {
      throw new Error('VITE_GIST_ID 未設定');
    }
    
    if (!GITHUB_TOKEN) {
      throw new Error('VITE_GITHUB_TOKEN 未設定');
    }

    const url = `https://api.github.com/gists/${GIST_ID}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          'checkin-settings.json': {
            content: JSON.stringify({
              ...settings,
              lastUpdated: new Date().toISOString()
            }, null, 2)
          }
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ 已更新 Gist 設定:', settings);
    
    return { success: true, settings };
  } catch (error) {
    console.error('❌ 更新 Gist 設定失敗:', error);
    return { success: false, error: error.message };
  }
}


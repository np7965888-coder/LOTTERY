// GitHub Gist 報到數據 API
// 用於集中存儲所有用戶的報到記錄

const CHECKIN_GIST_ID = import.meta.env.VITE_CHECKIN_GIST_ID || '';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || '';
const CHECKIN_FILE_NAME = 'checkin-data.json';

/**
 * 將報到記錄寫入 Gist（追加模式）
 * @param {string} participantId - 參與者工號
 * @param {object} participantData - 參與者資料 {name, department, etc.}
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function appendCheckInToGist(participantId, participantData) {
  try {
    if (!CHECKIN_GIST_ID || !GITHUB_TOKEN) {
      throw new Error('GitHub Gist 配置未完成');
    }

    // 先讀取現有數據
    const currentData = await fetchCheckInsFromGist();
    const checkIns = currentData.success ? currentData.checkIns : [];
    
    // 檢查是否已報到過
    const existingIndex = checkIns.findIndex(
      c => String(c.participantId) === String(participantId)
    );
    
    const timestamp = new Date().toISOString();
    
    if (existingIndex >= 0) {
      // 已報到過，更新時間
      checkIns[existingIndex] = {
        ...checkIns[existingIndex],
        lastCheckInTime: timestamp,
        checkInCount: (checkIns[existingIndex].checkInCount || 1) + 1
      };
    } else {
      // 新報到記錄
      checkIns.push({
        participantId: String(participantId),
        name: participantData.name || '',
        department: participantData.department || '',
        company: participantData.company || '',
        timestamp,
        checkInCount: 1
      });
    }
    
    // 寫入 Gist
    const url = `https://api.github.com/gists/${CHECKIN_GIST_ID}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [CHECKIN_FILE_NAME]: {
            content: JSON.stringify({
              checkIns,
              lastUpdated: timestamp,
              totalCount: checkIns.length
            }, null, 2)
          }
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    console.log('✅ 報到記錄已寫入 Gist:', participantId);
    return { 
      success: true, 
      alreadyCheckedIn: existingIndex >= 0 
    };
    
  } catch (error) {
    console.error('❌ 寫入報到記錄到 Gist 失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 從 Gist 讀取所有報到記錄
 * @returns {Promise<{success: boolean, checkIns?: Array, error?: string}>}
 */
export async function fetchCheckInsFromGist() {
  try {
    if (!CHECKIN_GIST_ID) {
      console.warn('⚠️ VITE_CHECKIN_GIST_ID 未設定');
      return { success: false, error: 'Gist ID 未設定' };
    }

    const url = `https://api.github.com/gists/${CHECKIN_GIST_ID}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const gist = await response.json();
    
    if (!gist.files || !gist.files[CHECKIN_FILE_NAME]) {
      // Gist 存在但文件不存在，返回空數組
      return { success: true, checkIns: [], totalCount: 0 };
    }
    
    const content = gist.files[CHECKIN_FILE_NAME].content;
    const data = JSON.parse(content);
    
    return { 
      success: true, 
      checkIns: data.checkIns || [],
      totalCount: data.totalCount || 0,
      lastUpdated: data.lastUpdated
    };
    
  } catch (error) {
    console.error('❌ 從 Gist 讀取報到記錄失敗:', error);
    return { success: false, error: error.message, checkIns: [] };
  }
}

/**
 * 清空 Gist 中的報到記錄（僅供測試/重置使用）
 */
export async function clearCheckInsInGist() {
  try {
    if (!CHECKIN_GIST_ID || !GITHUB_TOKEN) {
      throw new Error('GitHub Gist 配置未完成');
    }

    const url = `https://api.github.com/gists/${CHECKIN_GIST_ID}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [CHECKIN_FILE_NAME]: {
            content: JSON.stringify({
              checkIns: [],
              lastUpdated: new Date().toISOString(),
              totalCount: 0
            }, null, 2)
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ 清空 Gist 報到記錄失敗:', error);
    return { success: false, error: error.message };
  }
}


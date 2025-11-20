// Google Apps Script 測試函式
// 可以在 Apps Script 編輯器中執行這些函式來測試

/**
 * 測試 getParticipants
 */
function testGetParticipants() {
  try {
    const result = handleGetParticipants();
    Logger.log('測試結果:');
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * 測試 getPrizes
 */
function testGetPrizes() {
  try {
    const result = handleGetPrizes();
    Logger.log('測試結果:');
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * 測試 getWinners
 */
function testGetWinners() {
  try {
    const result = handleGetWinners();
    Logger.log('測試結果:');
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * 測試 doPost 函式（模擬表單資料請求）
 */
function testDoPost() {
  // 模擬表單資料請求
  const mockEvent = {
    parameter: {
      action: 'getParticipants'
    }
  };
  
  try {
    const result = doPost(mockEvent);
    Logger.log('doPost 測試結果:');
    Logger.log(result.getContent());
    return result;
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * 檢查試算表和工作表
 */
function checkSpreadsheet() {
  try {
    const ss = getSpreadsheet();
    Logger.log('試算表名稱: ' + ss.getName());
    Logger.log('試算表 ID: ' + ss.getId());
    
    const sheets = ss.getSheets();
    Logger.log('工作表數量: ' + sheets.length);
    sheets.forEach(function(sheet) {
      Logger.log('  - ' + sheet.getName() + ' (行數: ' + sheet.getLastRow() + ')');
    });
    
    return {
      success: true,
      spreadsheetName: ss.getName(),
      sheets: sheets.map(s => s.getName())
    };
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    return { error: error.toString() };
  }
}


import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { importParticipants, updatePrize } from '../services/api';
import { useData } from '../contexts/DataContext';
import TestProbability from './TestProbability';

export default function AdminPanel() {
  // 使用全局資料
  const { 
    participants, 
    prizes, 
    winners, 
    loading, 
    dataLoaded, 
    loadAllData,
    pendingCheckIns,
    pendingWinners,
    uploadPendingCheckIns,
    uploadPendingWinners,
    refreshPendingQueues,
    clearPendingWinners
  } = useData();
  
  const [activeTab, setActiveTab] = useState('participants');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCheckedIn, setFilterCheckedIn] = useState('all');
  const [uploadingCheckIns, setUploadingCheckIns] = useState(false);
  const [uploadingWinners, setUploadingWinners] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ type: '', text: '' });
  const [showClearPendingConfirm, setShowClearPendingConfirm] = useState(false);

  // 當分頁/視窗回到焦點或 localStorage 改變時，同步待上傳佇列
  useEffect(() => {
    const syncPending = () => refreshPendingQueues();
    window.addEventListener('focus', syncPending);
    window.addEventListener('visibilitychange', syncPending);
    window.addEventListener('storage', syncPending);
    return () => {
      window.removeEventListener('focus', syncPending);
      window.removeEventListener('visibilitychange', syncPending);
      window.removeEventListener('storage', syncPending);
    };
  }, [refreshPendingQueues]);

  // 手動上傳待上傳的報到記錄
  const handleUploadCheckIns = async () => {
    if (pendingCheckIns.length === 0) {
      setUploadMessage({ type: 'info', text: '沒有待上傳的報到記錄' });
      setTimeout(() => setUploadMessage({ type: '', text: '' }), 3000);
      return;
    }

    setUploadingCheckIns(true);
    setUploadMessage({ type: 'info', text: `正在上傳 ${pendingCheckIns.length} 條報到記錄...` });
    
    try {
      const result = await uploadPendingCheckIns();
      setUploadMessage({ 
        type: result.success ? 'success' : 'warning', 
        text: result.message 
      });
      setTimeout(() => setUploadMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setUploadMessage({ type: 'error', text: '上傳失敗: ' + error.message });
      setTimeout(() => setUploadMessage({ type: '', text: '' }), 5000);
    } finally {
      setUploadingCheckIns(false);
    }
  };

  // 手動上傳待上傳的中獎記錄
  const handleUploadWinners = async () => {
    if (pendingWinners.length === 0) {
      setUploadMessage({ type: 'info', text: '沒有待上傳的中獎記錄' });
      setTimeout(() => setUploadMessage({ type: '', text: '' }), 3000);
      return;
    }

    setUploadingWinners(true);
    setUploadMessage({ type: 'info', text: `正在上傳 ${pendingWinners.length} 條中獎記錄...` });
    
    try {
      const result = await uploadPendingWinners();
      setUploadMessage({ 
        type: result.success ? 'success' : 'warning', 
        text: result.message 
      });
      setTimeout(() => setUploadMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setUploadMessage({ type: 'error', text: '上傳失敗: ' + error.message });
      setTimeout(() => setUploadMessage({ type: '', text: '' }), 5000);
    } finally {
      setUploadingWinners(false);
    }
  };

  // 清除待上傳的中獎紀錄
  const handleClearPendingWinners = () => {
    setShowClearPendingConfirm(true);
  };

  const confirmClearPendingWinners = () => {
    const result = clearPendingWinners();
    setUploadMessage({ 
      type: result.success ? 'success' : 'error', 
      text: result.message 
    });
    setTimeout(() => setUploadMessage({ type: '', text: '' }), 5000);
    setShowClearPendingConfirm(false);
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const imported = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header] = values[idx] || '';
          });
          return obj;
        });

        await importParticipants(imported);
        alert('匯入成功！');
        loadAllData();
      } catch (error) {
        alert('匯入失敗: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExportWinners = async () => {
    try {
      // 使用本地 winners 資料，不呼叫遠端 API
      const winnersData = winners || [];
      
      // 準備 Excel 資料（確保工號是字串格式）
      const excelData = winnersData.map(winner => {
        // 確保 participant_id 保留前導零，轉為字串
        const participantId = String(winner.participant_id || '');
        return {
          '時間': new Date(winner.timestamp).toLocaleString('zh-TW'),
          '獎項': winner.prize_title || '',
          '獎品': winner.prize_name || '',
          '公司': winner.participant_company || '',
          '中獎者': winner.participant_name || '',
          '工號': participantId, // 已經是字串格式
          '領取狀態': winner.claimed ? '已領取' : '未領取'
        };
      });
      
      // 建立工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // 設定欄位寬度
      ws['!cols'] = [
        { wch: 20 }, // 時間
        { wch: 15 }, // 獎項
        { wch: 20 }, // 獎品
        { wch: 15 }, // 中獎者
        { wch: 12 }, // 工號
        { wch: 12 }  // 領取狀態
      ];
      
      // 將所有工號儲存格（E 欄，索引 4）設定為文字格式
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let row = 1; row <= range.e.r; row++) { // 跳過標題列（row 0）
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 4 }); // E 欄是第 4 欄（0-based）
        if (!ws[cellAddress]) continue;
        
        // 確保值是字串（保留前導零）
        const cellValue = ws[cellAddress].v;
        ws[cellAddress].v = String(cellValue);
        // 設定儲存格類型為字串
        ws[cellAddress].t = 's'; // 's' 表示字串類型
        // 設定儲存格格式為文字（@ 表示文字格式，用於保留前導零）
        ws[cellAddress].z = '@';
      }
      
      // 將工作表加入工作簿
      XLSX.utils.book_append_sheet(wb, ws, '中獎名單');
      
      // 生成 Excel 檔案（使用 .xls 格式）
      XLSX.writeFile(wb, `winners_${new Date().toISOString().split('T')[0]}.xls`, {
        bookType: 'xls', // 使用舊版 Excel 格式
        cellStyles: true
      });
      
    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗: ' + error.message);
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = !searchTerm || 
      String(p.company || '').includes(searchTerm) ||
      String(p.id).includes(searchTerm) ||
      String(p.name).includes(searchTerm) ||
      String(p.department).includes(searchTerm);
    
    const matchesFilter = filterCheckedIn === 'all' ||
      (filterCheckedIn === 'checked' && p.checked_in === 1) ||
      (filterCheckedIn === 'unchecked' && p.checked_in === 0) ||
      (filterCheckedIn === 'absent' && p.checked_in === 9) ||
      (filterCheckedIn === 'business' && p.checked_in === 2);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 relative z-40">
          <h1 className="text-3xl font-bold text-gray-800">管理後台</h1>
          <div className="flex items-center gap-4">
            {/* 資料載入狀態 */}
            <div className={`px-4 py-2 rounded-lg font-semibold ${
              dataLoaded 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
            }`}>
              {dataLoaded ? (
                <span>✅ 資料已載入</span>
              ) : (
                <span>⚠️ 資料未載入</span>
              )}
            </div>
            {/* 手動下載資料按鈕 */}
            <button
              onClick={loadAllData}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                loading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  載入中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  📥 下載所有資料
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 資料載入提示 */}
        {!dataLoaded && !loading && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>請先下載資料：</strong>報到和抽獎功能需要先在此頁面下載資料後才能使用。
                  請點擊上方的「下載所有資料」按鈕。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 上傳狀態提示 */}
        {uploadMessage.text && (
          <div className={`mb-6 p-4 rounded-lg border ${
            uploadMessage.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
            uploadMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
            uploadMessage.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
            'bg-blue-50 border-blue-300 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {uploadMessage.type === 'success' && <span className="text-xl">✅</span>}
              {uploadMessage.type === 'warning' && <span className="text-xl">⚠️</span>}
              {uploadMessage.type === 'error' && <span className="text-xl">❌</span>}
              {uploadMessage.type === 'info' && <span className="text-xl">ℹ️</span>}
              <span className="font-semibold">{uploadMessage.text}</span>
            </div>
          </div>
        )}

        {/* 待上傳資料統計（即使為 0 也顯示，方便找到上傳/清除按鈕） */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-orange-800 mb-2">
                <strong>待上傳資料：</strong>
              </p>
              <div className="text-sm text-orange-700 space-y-1">
                <div>📋 報到記錄: {pendingCheckIns.length} 條</div>
                <div>🎁 中獎記錄: {pendingWinners.length} 條</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleUploadCheckIns}
                disabled={uploadingCheckIns || pendingCheckIns.length === 0}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  uploadingCheckIns || pendingCheckIns.length === 0
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {uploadingCheckIns ? '上傳中...' : `上傳報到記錄 (${pendingCheckIns.length})`}
              </button>

              <button
                onClick={handleUploadWinners}
                disabled={uploadingWinners || pendingWinners.length === 0}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  uploadingWinners || pendingWinners.length === 0
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {uploadingWinners ? '上傳中...' : `上傳中獎記錄 (${pendingWinners.length})`}
              </button>

              <button
                onClick={handleClearPendingWinners}
                disabled={uploadingWinners || pendingWinners.length === 0}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  uploadingWinners || pendingWinners.length === 0
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title="清除待上傳的中獎記錄"
              >
                🗑️ 清除
              </button>
            </div>
          </div>
        </div>

        {/* 標籤頁 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['participants', 'prizes', 'winners', 'test'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'participants' ? '參與者名單' : 
                   tab === 'prizes' ? '獎項清單' : 
                   tab === 'winners' ? '中獎紀錄' : 
                   '機率測試'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 參與者名單 */}
        {activeTab === 'participants' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">參與者名單</h2>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileImport}
                  className="hidden"
                  id="file-import"
                />
                <label
                  htmlFor="file-import"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                >
                  匯入名單
                </label>
                <button
                  onClick={loadAllData}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  重新載入
                </button>
              </div>
            </div>

            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="搜尋（公司、工號、姓名、部門）"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded"
              />
              <select
                value={filterCheckedIn}
                onChange={(e) => setFilterCheckedIn(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded"
              >
                <option value="all">全部</option>
                <option value="checked">已報到</option>
                <option value="unchecked">未報到</option>
                <option value="business">公差無法到場</option>
                <option value="absent">因公未到</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">公司</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工號</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">報到狀態</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">中獎</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredParticipants.map((p, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap">{p.company || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{p.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{p.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{p.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {p.checked_in === 1 ? '✓ 已報到' : 
                         p.checked_in === 2 ? '公差無法到場' : 
                         p.checked_in === 9 ? '因公未到' : '未報到'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {p.won ? '✓ 已中獎' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              共 {filteredParticipants.length} 人
            </div>
          </div>
        )}

        {/* 獎項管理 */}
        {activeTab === 'prizes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">獎項管理</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">獎項</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">獎品名稱</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">數量</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">順序</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模式</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {prizes.map((prize, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap">{prize.prize_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{prize.prize_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {Number(prize.quantity) === 0 ? '無上限' : prize.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{prize.order}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {prize.mode === 'batch' ? '批次' : '單筆'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 中獎紀錄 */}
        {activeTab === 'winners' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">中獎紀錄</h2>
              <button
                onClick={handleExportWinners}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                匯出中獎名單
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">獎項</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">獎品</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">公司</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">中獎者</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工號</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">領取狀態</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {winners.map((winner, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(winner.timestamp).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{winner.prize_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{winner.prize_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{winner.participant_company || ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{winner.participant_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{winner.participant_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {winner.claimed ? '✓ 已領取' : '未領取'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 機率測試 */}
        {activeTab === 'test' && <TestProbability />}

        {/* 清除待上傳中獎紀錄確認對話框 */}
        {showClearPendingConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-red-600">⚠️ 確認清除待上傳中獎紀錄</h3>
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  此操作將清除：
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 mb-4">
                  <li>所有待上傳的中獎紀錄（共 {pendingWinners.length} 筆）</li>
                </ul>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>注意：</strong>此操作只會清除本地端（瀏覽器）的待上傳記錄，<strong>不會影響已上傳至伺服器的中獎紀錄</strong>。
                    清除後這些記錄將無法再上傳，請確認是否要繼續。
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearPendingConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                >
                  取消
                </button>
                <button
                  onClick={confirmClearPendingWinners}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  確認清除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



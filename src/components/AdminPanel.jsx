import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getParticipants, getPrizes, getWinners, importParticipants, updatePrize, exportWinners } from '../services/api';
import TestProbability from './TestProbability';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCheckedIn, setFilterCheckedIn] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [participantsData, prizesData, winnersData] = await Promise.all([
        getParticipants(),
        getPrizes(),
        getWinners()
      ]);
      setParticipants(participantsData.data || []);
      setPrizes(prizesData.data || []);
      setWinners(winnersData.data || []);
    } catch (error) {
      console.error('載入資料失敗:', error);
      alert('載入資料失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
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
        loadData();
      } catch (error) {
        alert('匯入失敗: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExportWinners = async () => {
    try {
      const response = await exportWinners();
      const winnersData = response.data || [];
      
      // 準備 Excel 資料（確保工號是字串格式）
      const excelData = winnersData.map(winner => {
        // 確保 participant_id 保留前導零，轉為字串
        const participantId = String(winner.participant_id || '');
        return {
          '時間': new Date(winner.timestamp).toLocaleString('zh-TW'),
          '獎項': winner.prize_title || '',
          '獎品': winner.prize_name || '',
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">管理後台</h1>

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
                   tab === 'prizes' ? '獎項管理' : 
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
                  onClick={loadData}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  重新載入
                </button>
              </div>
            </div>

            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="搜尋（工號、姓名、部門）"
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
                      <td className="px-6 py-4 whitespace-nowrap">{prize.quantity}</td>
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
      </div>
    </div>
  );
}



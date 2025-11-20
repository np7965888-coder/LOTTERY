import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getParticipants, getPrizes } from '../services/api';
import { secureShuffleAndPick, batchDraw } from '../utils/lottery';

export default function TestProbability() {
  const [participants, setParticipants] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [testCount, setTestCount] = useState(100);
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [drawRule, setDrawRule] = useState('no-repeat'); // 'no-repeat' or 'allow-repeat'
  const [drawMode, setDrawMode] = useState('single'); // 'single' or 'batch'
  const [batchCount, setBatchCount] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [participantsData, prizesData] = await Promise.all([
        getParticipants(),
        getPrizes()
      ]);
      setParticipants(participantsData.data || []);
      setPrizes(prizesData.data || []);
    } catch (error) {
      console.error('載入資料失敗:', error);
      alert('載入資料失敗: ' + error.message);
    }
  };

  const runTest = async () => {
    if (!selectedPrize) {
      alert('請先選擇獎項');
      return;
    }

    if (testCount <= 0 || testCount > 1000000) {
      alert('測試次數必須在 1-1000000 之間');
      return;
    }

    setIsTesting(true);
    setTestProgress(0);
    setResults(null);

    // 取得符合資格的參與者（測試時不考慮 won 狀態，因為每次測試都是獨立的）
    const eligibleParticipants = participants.filter(p => {
      // 檢查報到狀態
      if (p.checked_in !== 1 && p.checked_in !== 2 && p.checked_in !== 9) {
        return false;
      }
      // 測試模式下，不檢查 won 狀態，因為每次測試都是獨立的
      return true;
    });

    if (eligibleParticipants.length === 0) {
      alert('沒有符合資格的參與者！');
      setIsTesting(false);
      return;
    }

    // 統計每個參與者的中獎次數
    const winnerCounts = new Map();
    const totalDraws = drawMode === 'single' ? testCount : testCount * batchCount;

    // 初始化統計
    eligibleParticipants.forEach(p => {
      winnerCounts.set(String(p.id), {
        id: p.id,
        name: p.name,
        department: p.department,
        count: 0
      });
    });

    // 進行測試
    for (let i = 0; i < testCount; i++) {
      // 更新進度（根據測試次數調整更新頻率，避免 UI 更新過於頻繁）
      const updateInterval = testCount > 100000 ? 1000 : testCount > 10000 ? 100 : 10;
      if (i % updateInterval === 0 || i === testCount - 1) {
        setTestProgress(Math.floor(((i + 1) / testCount) * 100));
      }

      // 每次測試都是獨立的，使用完整的參與者列表
      // 根據抽獎規則決定排除列表（每次測試開始時都是空的）
      const excludedIds = new Set();
      
      // 進行抽獎（測試模式下忽略 won 狀態，因為每次測試都是獨立的）
      let winners = [];
      if (drawMode === 'single') {
        // 單筆抽選：每次只選一個，測試模式下忽略 won 狀態
        winners = secureShuffleAndPick(eligibleParticipants, excludedIds, 1, true);
      } else {
        // 批次抽選：根據規則決定是否允許重複
        // 注意：batchDraw 內部會調用 secureShuffleAndPick，需要傳遞 ignoreWonStatus
        if (drawRule === 'allow-repeat') {
          winners = batchDraw(eligibleParticipants, excludedIds, batchCount, true);
        } else {
          // 不重複抽獎：使用 secureShuffleAndPick，測試模式下忽略 won 狀態
          winners = secureShuffleAndPick(eligibleParticipants, excludedIds, batchCount, true);
        }
      }

      // 統計中獎次數
      winners.forEach(winner => {
        const id = String(winner.id);
        if (winnerCounts.has(id)) {
          winnerCounts.get(id).count++;
        }
      });
    }

    // 計算機率
    const resultsArray = Array.from(winnerCounts.values())
      .map(stat => ({
        ...stat,
        probability: totalDraws > 0 ? (stat.count / totalDraws * 100).toFixed(4) : '0.0000'
      }))
      .sort((a, b) => b.count - a.count); // 按中獎次數排序

    setResults({
      totalTests: testCount,
      totalDraws: totalDraws,
      eligibleCount: eligibleParticipants.length,
      statistics: resultsArray,
      prize: selectedPrize
    });

    setTestProgress(100);
    setIsTesting(false);
  };

  const exportResults = () => {
    if (!results) return;

    try {
      // 準備 Excel 資料（確保工號是字串格式）
      const excelData = results.statistics.map(stat => ({
        '排名': results.statistics.indexOf(stat) + 1,
        '工號': String(stat.id || ''), // 確保是字串格式，保留前導零
        '姓名': stat.name || '',
        '部門': stat.department || '',
        '中獎次數': stat.count,
        '中獎機率(%)': stat.probability
      }));

      // 建立工作簿
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // 設定欄位寬度
      ws['!cols'] = [
        { wch: 8 },  // 排名
        { wch: 12 }, // 工號
        { wch: 15 }, // 姓名
        { wch: 15 }, // 部門
        { wch: 12 }, // 中獎次數
        { wch: 15 }  // 中獎機率
      ];

      // 將所有工號儲存格（B 欄，索引 1）設定為文字格式
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let row = 1; row <= range.e.r; row++) { // 跳過標題列（row 0）
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 }); // B 欄是第 1 欄（0-based）
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
      XLSX.utils.book_append_sheet(wb, ws, '機率測試結果');

      // 生成 Excel 檔案（使用 .xls 格式）
      const fileName = `probability_test_${new Date().toISOString().split('T')[0]}.xls`;
      XLSX.writeFile(wb, fileName, {
        bookType: 'xls', // 使用舊版 Excel 格式
        cellStyles: true
      });
    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">中獎機率測試程式</h1>

        {/* 測試設定 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">測試設定</h2>
          
          <div className="space-y-4">
            {/* 選擇獎項 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">選擇獎項</label>
              <select
                value={selectedPrize?.prize_id || ''}
                onChange={(e) => {
                  const prize = prizes.find(p => p.prize_id === e.target.value);
                  setSelectedPrize(prize || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded"
                disabled={isTesting}
              >
                <option value="">請選擇獎項</option>
                {prizes.map(prize => (
                  <option key={prize.prize_id} value={prize.prize_id}>
                    {prize.prize_title} - {prize.prize_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 抽獎規則 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">抽獎規則</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="no-repeat"
                    checked={drawRule === 'no-repeat'}
                    onChange={(e) => setDrawRule(e.target.value)}
                    disabled={isTesting}
                    className="mr-2"
                  />
                  不重複抽獎
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="allow-repeat"
                    checked={drawRule === 'allow-repeat'}
                    onChange={(e) => setDrawRule(e.target.value)}
                    disabled={isTesting}
                    className="mr-2"
                  />
                  可重複抽獎
                </label>
              </div>
            </div>

            {/* 抽獎方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">抽獎方式</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="single"
                    checked={drawMode === 'single'}
                    onChange={(e) => setDrawMode(e.target.value)}
                    disabled={isTesting}
                    className="mr-2"
                  />
                  單筆抽選
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="batch"
                    checked={drawMode === 'batch'}
                    onChange={(e) => setDrawMode(e.target.value)}
                    disabled={isTesting}
                    className="mr-2"
                  />
                  批次抽選
                </label>
              </div>
              {drawMode === 'batch' && (
                <div className="mt-2">
                  <label className="block text-sm text-gray-600 mb-1">每次抽選數量</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                    disabled={isTesting}
                    className="px-4 py-2 border border-gray-300 rounded w-32"
                  />
                </div>
              )}
            </div>

            {/* 測試次數 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                測試次數 (1-1,000,000)
              </label>
              <input
                type="number"
                min="1"
                max="1000000"
                value={testCount}
                onChange={(e) => setTestCount(parseInt(e.target.value) || 100)}
                disabled={isTesting}
                className="px-4 py-2 border border-gray-300 rounded w-48"
              />
            </div>

            {/* 開始測試按鈕 */}
            <button
              onClick={runTest}
              disabled={isTesting || !selectedPrize}
              className={`px-6 py-3 rounded-lg font-bold transition ${
                isTesting || !selectedPrize
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isTesting ? `測試中... ${testProgress}%` : '開始測試'}
            </button>
          </div>
        </div>

        {/* 測試結果 */}
        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">測試結果</h2>
              <button
                onClick={exportResults}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                匯出結果 (Excel)
              </button>
            </div>

            {/* 統計摘要 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-sm text-gray-600">測試次數</div>
                <div className="text-2xl font-bold text-blue-600">{results.totalTests}</div>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <div className="text-sm text-gray-600">總抽選次數</div>
                <div className="text-2xl font-bold text-green-600">{results.totalDraws}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <div className="text-sm text-gray-600">符合資格人數</div>
                <div className="text-2xl font-bold text-purple-600">{results.eligibleCount}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <div className="text-sm text-gray-600">獎項</div>
                <div className="text-lg font-bold text-yellow-600">
                  {results.prize?.prize_title}
                </div>
              </div>
            </div>

            {/* 詳細統計表格 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">排名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工號</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">中獎次數</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">中獎機率 (%)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.statistics.map((stat, idx) => (
                    <tr key={stat.id} className={stat.count > 0 ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        {stat.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        {stat.probability}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


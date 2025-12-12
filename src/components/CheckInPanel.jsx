import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';

// 格式化中獎者姓名顯示（非 TW 公司顯示「姓名(公司)」）
const formatWinnerName = (name, company) => {
  const companyText = (company || '').toString().trim();
  if (!companyText) return name;
  if (companyText.toUpperCase() === 'TW') return name;
  return `${name}(${companyText})`;
};

export default function CheckInPanel({ onCheckInSuccess }) {
  // 使用全局資料
  const { winners, prizes, checkIn: checkInWithContext, dataLoaded, participants, loadAllData, loading: globalLoading } = useData();
  
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 獨立報到頁面若尚未載入資料，嘗試自動下載一次
  useEffect(() => {
    if (!dataLoaded && !globalLoading) {
      loadAllData();
    }
  }, [dataLoaded, globalLoading, loadAllData]);
  
  // 查詢中獎相關 state
  const [queryId, setQueryId] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [showQueryModal, setShowQueryModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // 先顯示處理中狀態，不阻塞 UI
    setLoading(true);

    // 使用本地資料處理報到（不阻塞 UI）
    checkInWithContext(participantId)
      .then(result => {
        if (result.success) {
          const name = result.name || '參與者';
          const message = result.alreadyCheckedIn 
            ? `您已經報到過了，歡迎 ${name}` 
            : `報到成功！歡迎 ${name}`;
          setSuccess(message);
          if (onCheckInSuccess) {
            onCheckInSuccess();
          }
        } else {
          setError(result.message || '報到失敗');
        }
      })
      .catch(err => {
        console.error('報到錯誤:', err);
        setError(err.message || '報到時發生錯誤');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 查詢中獎
  const handleQueryWinner = async () => {
    if (!queryId.trim()) {
      alert('請輸入工號');
      return;
    }

    setQueryLoading(true);
    setQueryResult(null);

    try {
      // 使用本地資料查詢（不需要從 API 載入）
      if (!dataLoaded || !winners || !prizes) {
        throw new Error('資料尚未載入，請先在管理後台下載資料');
      }

      // 搜尋該工號的中獎記錄
      const userWinners = winners.filter(
        w => String(w.participant_id).toLowerCase() === String(queryId).trim().toLowerCase()
      );

      if (userWinners.length === 0) {
        setQueryResult({
          found: false,
          participantId: queryId,
          message: '未查詢到中獎記錄'
        });
      } else {
        // 整理中獎獎項
        const prizeList = userWinners.map(winner => {
          const prize = prizes.find(p => p.prize_id === winner.prize_id);
          return {
            prizeTitle: winner.prize_title || prize?.prize_title || '未知獎項',
            prizeName: winner.prize_name || prize?.prize_name || '',
            timestamp: winner.timestamp,
            participantName: winner.participant_name,
            participantCompany: winner.participant_company
          };
        });

        setQueryResult({
          found: true,
          participantId: queryId,
          participantName: userWinners[0].participant_name,
          participantCompany: userWinners[0].participant_company,
          prizes: prizeList,
          count: prizeList.length
        });
      }

      setShowQueryModal(true);
    } catch (error) {
      console.error('查詢失敗:', error);
      alert('查詢失敗: ' + error.message);
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-4">
          <img 
            src="/NanpaoLogo_01.png" 
            alt="南寶樹酯化學工廠股份有限公司" 
            className="h-16 object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          尾牙抽獎活動報名
        </h1>
        
        {/* 資料未載入提示 */}
        {!dataLoaded && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>資料尚未載入：</strong>請先在管理後台頁面下載資料後，才能進行報到。
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4" style={{ opacity: dataLoaded ? 1 : 0.5, pointerEvents: dataLoaded ? 'auto' : 'none' }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              員工編號
            </label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="請輸入員工編號"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '處理中...' : '報到'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>請掃描 QR Code 或直接輸入資訊</p>
        </div>

        {/* 查詢中獎按鈕 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center">
            查詢中獎記錄
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={queryId}
              onChange={(e) => setQueryId(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQueryWinner();
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="輸入工號查詢"
            />
            <button
              onClick={handleQueryWinner}
              disabled={queryLoading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {queryLoading ? '查詢中...' : '🔍 查詢'}
            </button>
          </div>
        </div>
      </div>

      {/* 查詢結果彈窗 */}
      {showQueryModal && queryResult && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowQueryModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                中獎查詢結果
              </h2>
              <button
                onClick={() => setShowQueryModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {queryResult.found ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <div className="text-6xl mb-3">🎉</div>
                    <div className="text-2xl font-bold text-gray-800">
                      恭喜 {formatWinnerName(queryResult.participantName, queryResult.participantCompany)}！
                    </div>
                    <div className="text-gray-600 mt-2">
                      工號: {queryResult.participantId}
                    </div>
                    <div className="text-purple-600 font-bold text-lg mt-2">
                      共中獎 {queryResult.count} 個獎項
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {queryResult.prizes.map((prize, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-purple-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-lg font-bold text-gray-800">
                            {prize.prizeTitle}
                          </div>
                          <div className="text-md text-gray-600">
                            {prize.prizeName}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            中獎時間: {new Date(prize.timestamp).toLocaleString('zh-TW')}
                          </div>
                        </div>
                        <div className="text-4xl ml-4">
                          🏆
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">😊</div>
                <div className="text-xl text-gray-600 mb-2">
                  工號 {queryResult.participantId}
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {queryResult.message}
                </div>
                <div className="text-sm text-gray-500 mt-4">
                  如有疑問，請洽詢工作人員
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setShowQueryModal(false);
                  setQueryId('');
                  setQueryResult(null);
                }}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition shadow-lg"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



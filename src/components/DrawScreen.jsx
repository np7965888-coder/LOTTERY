import { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { getParticipants, getPrizes, getWinners, appendWinner, appendWinners } from '../services/api';
import { secureShuffleAndPick, batchDraw } from '../utils/lottery';

export default function DrawScreen({ isFullscreen = false, onExitFullscreen }) {
  const [participants, setParticipants] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [winners, setWinners] = useState([]);
  const [currentPrize, setCurrentPrize] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWinner, setCurrentWinner] = useState(null);
  const [drawMode, setDrawMode] = useState('single'); // 'single' or 'batch'
  const [drawRule, setDrawRule] = useState('no-repeat'); // 'no-repeat' or 'allow-repeat'
  const [batchCount, setBatchCount] = useState(5);
  const [batchWinners, setBatchWinners] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const animationCleanupRef = useRef(null);
  
  const audioRef = useRef({
    spinning: null,
    win: null
  });

  const winnersByPrize = useMemo(() => {
    const map = {};
    winners.forEach(winner => {
      const key = winner.prize_id;
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [winners]);

  const sortedPrizes = useMemo(() => {
    return [...prizes].sort((a, b) => a.order - b.order);
  }, [prizes]);

  const getRemaining = (prize) => {
    if (!prize) return 0;
    const used = winnersByPrize[prize.prize_id] || 0;
    return Math.max(prize.quantity - used, 0);
  };

  const currentPrizeIndex = currentPrize
    ? sortedPrizes.findIndex(p => p.prize_id === currentPrize.prize_id)
    : -1;

  const currentPrizeRemaining = getRemaining(currentPrize);
  const maxBatchCount = currentPrize ? Math.max(currentPrizeRemaining, 1) : 1;
  const canDraw = !!currentPrize && currentPrizeRemaining > 0 && !isDrawing;
  const noPrizes = sortedPrizes.length === 0;

  useEffect(() => {
    loadData();
    loadAudio();
    return () => {
      if (audioRef.current.spinning) {
        audioRef.current.spinning.pause();
      }
      if (audioRef.current.win) {
        audioRef.current.win.pause();
      }
      if (animationCleanupRef.current) {
        animationCleanupRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (currentPrize || sortedPrizes.length === 0) return;
    const firstAvailableIndex = sortedPrizes.findIndex(prize => getRemaining(prize) > 0);
    if (firstAvailableIndex !== -1) {
      setCurrentPrize(sortedPrizes[firstAvailableIndex]);
    } else {
      setCurrentPrize(sortedPrizes[0]);
    }
  }, [sortedPrizes, currentPrize, winnersByPrize]);

  useEffect(() => {
    if (!currentPrize) {
      setBatchCount(1);
      return;
    }
    const remaining = getRemaining(currentPrize);
    if (remaining === 0) {
      setBatchCount(1);
    } else {
      // 自動設為該獎項的最大剩餘數量
      setBatchCount(remaining);
    }
  }, [currentPrize, winnersByPrize]);

  const loadData = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const loadAudio = () => {
    // 注意：實際使用時需要將音效檔放在 public/sfx/ 目錄
    // 這裡使用動態載入，如果檔案不存在會靜默失敗
    try {
      audioRef.current.spinning = new Audio('/sfx/spinning.mp3');
      audioRef.current.spinning.loop = true;
      audioRef.current.win = new Audio('/sfx/win.mp3');
    } catch (error) {
      console.warn('音效載入失敗（可忽略）:', error);
    }
  };

  const playSpinningSound = () => {
    if (audioRef.current.spinning) {
      audioRef.current.spinning.currentTime = 0;
      audioRef.current.spinning.play().catch(() => {});
    }
  };

  const playWinSound = () => {
    if (audioRef.current.spinning) {
      audioRef.current.spinning.pause();
    }
    if (audioRef.current.win) {
      audioRef.current.win.currentTime = 0;
      audioRef.current.win.play().catch(() => {});
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    // 立即觸發一次大型煙花效果
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
    });

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // 左側煙花
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
      });
      
      // 右側煙花
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
      });
    }, 250);

    // 確保在組件卸載時清理 interval
    return () => clearInterval(interval);
  };

  const moveToPrizeByIndex = (index) => {
    if (index < 0 || index >= sortedPrizes.length) return;
    setCurrentPrize(sortedPrizes[index]);
    setCurrentWinner(null);
    setBatchWinners([]);
    setDisplayName('');
  };

  const goToNextPrize = () => {
    if (!sortedPrizes.length) return;
    if (currentPrizeIndex === -1) {
      moveToPrizeByIndex(0);
      return;
    }
    const nextIndex = (currentPrizeIndex + 1) % sortedPrizes.length;
    moveToPrizeByIndex(nextIndex);
  };

  const goToPreviousPrize = () => {
    if (!sortedPrizes.length) return;
    if (currentPrizeIndex === -1) {
      moveToPrizeByIndex(sortedPrizes.length - 1);
      return;
    }
    const prevIndex = (currentPrizeIndex - 1 + sortedPrizes.length) % sortedPrizes.length;
    moveToPrizeByIndex(prevIndex);
  };

  const moveToNextAvailablePrize = () => {
    if (currentPrizeIndex === -1) return;
    for (let i = currentPrizeIndex + 1; i < sortedPrizes.length; i++) {
      if (getRemaining(sortedPrizes[i]) > 0) {
        moveToPrizeByIndex(i);
        return;
      }
    }
    // 沒有下一個可用獎項時，清除當前獎項
    setCurrentPrize(null);
    setCurrentWinner(null);
    setBatchWinners([]);
    setDisplayName('');
  };

  const slotMachineAnimation = (eligibleNames, finalWinner, onComplete) => {
    let currentIndex = 0;
    let startTime = Date.now();
    const duration = 3000; // 3秒動畫
    let animationId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        // 加速階段 -> 減速階段
        let speed;
        if (progress < 0.7) {
          speed = 60 - (progress / 0.7) * 50; // 60ms -> 10ms
        } else {
          speed = 10 + ((progress - 0.7) / 0.3) * 200; // 10ms -> 210ms
        }

        if (elapsed % Math.max(10, Math.floor(speed)) < 10) {
          currentIndex = (currentIndex + 1) % eligibleNames.length;
          setDisplayName(eligibleNames[currentIndex]);
        }

        animationId = requestAnimationFrame(animate);
      } else {
        // 顯示最終結果
        setDisplayName(finalWinner.name);
        onComplete();
      }
    };

    playSpinningSound();
    animate();
    return () => cancelAnimationFrame(animationId);
  };

  const handleSingleDraw = async () => {
    if (!currentPrize || isDrawing) return;

    setIsDrawing(true);
    setCurrentWinner(null);
    setDisplayName('');

    const remainingBeforeDraw = getRemaining(currentPrize);

    // 優化：直接使用本地資料，不重新載入（節省 15-20 秒）
    // 資料已在頁面載入時下載到本地，直接使用即可
    const latestParticipants = participants;
    const latestWinners = winners;

    // 根據抽獎規則決定是否排除已中獎者
    // 不重複抽獎：排除所有已中獎者（won === true 或已在 winners 中）
    // 可重複抽獎：不排除任何人
    const excludedIds = drawRule === 'no-repeat' 
      ? new Set([
          // 排除當前獎項的已中獎者
          ...latestWinners
            .filter(w => w.prize_id === currentPrize.prize_id)
            .map(w => String(w.participant_id)),
          // 排除所有 won === true 的參與者
          ...latestParticipants
            .filter(p => p.won === true || p.won === 'TRUE')
            .map(p => String(p.id))
        ])
      : new Set(); // 可重複抽獎時不排除任何人
    
    // 取得符合資格的參與者（用於動畫顯示）
    const eligible = latestParticipants.filter(p => {
      const id = String(p.id);
      // 不重複抽獎：排除已中獎者；可重複抽獎：不排除任何人
      const isExcluded = drawRule === 'no-repeat' && excludedIds.has(id);
      // 不重複抽獎：排除所有已中獎者（won === true）
      const isWon = drawRule === 'no-repeat' && (p.won === true || p.won === 'TRUE');
      return !isExcluded && !isWon && (p.checked_in === 1 || p.checked_in === 2 || p.checked_in === 9);
    });

    if (eligible.length === 0) {
      alert('沒有可抽選的參與者！');
      setIsDrawing(false);
      return;
    }

    const eligibleNames = eligible.map(p => p.name);
    
    // 抽選（使用最新載入的資料）
    const selected = secureShuffleAndPick(latestParticipants, excludedIds, 1);
    
    if (selected.length === 0) {
      alert('抽選失敗！');
      setIsDrawing(false);
      return;
    }

    const winner = selected[0];

    // 播放動畫
    animationCleanupRef.current = slotMachineAnimation(eligibleNames, winner, async () => {
      setCurrentWinner(winner);
      playWinSound();
      const confettiCleanup = triggerConfetti();
      if (confettiCleanup) {
        // 保存清理函數，以便在需要時清理
        setTimeout(() => {
          if (confettiCleanup) confettiCleanup();
        }, 3000);
      }

      // 儲存到 Google Sheet
      try {
        await appendWinner({
          prize_id: currentPrize.prize_id,
          prize_title: currentPrize.prize_title,
          prize_name: currentPrize.prize_name,
          participant_id: winner.id,
          participant_name: winner.name,
          admin: 'system',
          claimed: false
        });
        
        // 優化：更新本地 state，不重新載入所有資料（節省 15-20 秒）
        const newWinner = {
          timestamp: new Date().toISOString(),
          prize_id: currentPrize.prize_id,
          prize_title: currentPrize.prize_title,
          prize_name: currentPrize.prize_name,
          participant_id: winner.id,
          participant_name: winner.name,
          admin: 'system',
          claimed: false
        };
        
        // 更新本地 winners state
        setWinners(prev => [...prev, newWinner]);
        
        // 更新本地 participants state（標記為已中獎）
        setParticipants(prev => prev.map(p => 
          String(p.id) === String(winner.id) 
            ? { ...p, won: true }
            : p
        ));
      } catch (error) {
        console.error('儲存中獎紀錄失敗:', error);
        alert('儲存失敗: ' + error.message);
      }

      setIsDrawing(false);
      animationCleanupRef.current = null;
      // 移除自動切換獎項，改為手動按繼續抽獎
    });
  };

  const handleBatchDraw = async () => {
    if (!currentPrize || isDrawing) return;

    setIsDrawing(true);
    setBatchWinners([]);
    setDisplayName('');

    const remainingBeforeDraw = getRemaining(currentPrize);

    // 優化：直接使用本地資料，不重新載入（節省 15-20 秒）
    // 資料已在頁面載入時下載到本地，直接使用即可
    const latestParticipants = participants;
    const latestWinners = winners;

    // 根據抽獎規則決定是否排除已中獎者
    // 不重複抽獎：排除所有已中獎者（won === true 或已在 winners 中）
    // 可重複抽獎：不排除任何人
    const excludedIds = drawRule === 'no-repeat' 
      ? new Set([
          // 排除當前獎項的已中獎者
          ...latestWinners
            .filter(w => w.prize_id === currentPrize.prize_id)
            .map(w => String(w.participant_id)),
          // 排除所有 won === true 的參與者
          ...latestParticipants
            .filter(p => p.won === true || p.won === 'TRUE')
            .map(p => String(p.id))
        ])
      : new Set(); // 可重複抽獎時不排除任何人
    
    // 抽選（使用最新載入的資料）
    const selected = batchDraw(latestParticipants, excludedIds, batchCount, drawRule === 'allow-repeat');

    if (selected.length === 0) {
      alert('沒有可抽選的參與者！');
      setIsDrawing(false);
      return;
    }

    // 淡入動畫效果
    setBatchWinners(selected);
    playWinSound();
    const confettiCleanup = triggerConfetti();
    if (confettiCleanup) {
      // 保存清理函數，以便在需要時清理
      setTimeout(() => {
        if (confettiCleanup) confettiCleanup();
      }, 3000);
    }

    // 批次儲存（使用批次 API 以大幅加速）
    try {
      // 準備批次資料
      const winnersList = selected.map(winner => ({
        prize_id: currentPrize.prize_id,
        prize_title: currentPrize.prize_title,
        prize_name: currentPrize.prize_name,
        participant_id: winner.id,
        participant_name: winner.name,
        admin: 'system',
        claimed: false
      }));
      
      // 使用批次 API 一次性儲存所有中獎者
      await appendWinners(winnersList);
      
      // 優化：更新本地 state，不重新載入所有資料（節省 15-20 秒）
      const now = new Date().toISOString();
      const newWinners = winnersList.map(winner => ({
        timestamp: now,
        ...winner
      }));
      
      // 更新本地 winners state
      setWinners(prev => [...prev, ...newWinners]);
      
      // 更新本地 participants state（標記為已中獎）
      const winnerIds = new Set(selected.map(w => String(w.id)));
      setParticipants(prev => prev.map(p => 
        winnerIds.has(String(p.id))
          ? { ...p, won: true }
          : p
      ));
    } catch (error) {
      console.error('儲存中獎紀錄失敗:', error);
      alert('儲存失敗: ' + error.message);
    }

    setIsDrawing(false);
    // 移除自動切換獎項，改為手動按繼續抽獎
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('無法進入全螢幕:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 ${isFullscreen ? 'p-0' : 'p-6'}`}>
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-white">抽獎系統</h1>
            <div className="flex gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className={`px-4 py-2 text-white font-bold rounded-lg transition text-sm ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                title={isLoading ? '載入中...' : '重新載入最新資料（如需要）'}
              >
                {isLoading ? '載入中...' : '重新載入'}
              </button>
              <button
                onClick={handleFullscreen}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg transition"
              >
                大螢幕模式
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`${isFullscreen ? 'h-screen' : ''} flex flex-col items-center justify-center`}>
        {/* 載入中提示 */}
        {isLoading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 max-w-4xl w-full text-center">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
              </div>
              <div className="text-3xl font-bold text-white">載入中...</div>
              <div className="text-xl text-white/80">正在載入最新資料，請稍候</div>
            </div>
          </div>
        )}
        
        {!isLoading && !isDrawing && !currentWinner && batchWinners.length === 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 max-w-4xl w-full">
            {noPrizes ? (
              <div className="text-center text-white text-xl">尚未設定任何獎項</div>
            ) : !currentPrize ? (
              <div className="text-center text-white text-xl">所有獎項皆已抽完 🎉</div>
            ) : (
              <div className="space-y-8">
                {/* 獎項資訊 - 重點突出 */}
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-8 border-4 border-yellow-400/50">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={goToPreviousPrize}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition disabled:opacity-50 text-sm"
                      disabled={sortedPrizes.length <= 1}
                    >
                      ← 上一個
                    </button>
                    <div className="text-sm text-white/70 bg-white/10 px-3 py-1 rounded-full">
                      第 {currentPrizeIndex + 1} / {sortedPrizes.length} 個獎項
                    </div>
                    <button
                      onClick={goToNextPrize}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition disabled:opacity-50 text-sm"
                      disabled={sortedPrizes.length <= 1}
                    >
                      下一個 →
                    </button>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="text-5xl font-bold text-yellow-300 mb-2">
                      {currentPrize.prize_title}
                    </div>
                    <div className="text-2xl text-white/90 mb-3">
                      {currentPrize.prize_name}
                    </div>
                    <div className="text-xl text-yellow-200 font-semibold">
                      剩餘 <span className="text-3xl text-yellow-300">{currentPrizeRemaining}</span> / {currentPrize.quantity}
                    </div>
                  </div>
                </div>

                {currentPrizeRemaining === 0 && (
                  <div className="text-center text-red-200 bg-red-900/30 border-2 border-red-500/40 rounded-lg py-3">
                    ⚠️ 此獎項已抽完，請切換其他獎項
                  </div>
                )}

                {/* 抽獎設定 - 次要資訊 */}
                <div className="space-y-4 bg-white/5 rounded-xl p-6">
                  <div>
                    <label className="block text-white mb-2 text-sm font-medium">抽獎規則</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDrawRule('no-repeat')}
                        className={`flex-1 py-2 rounded transition text-sm ${
                          drawRule === 'no-repeat' 
                            ? 'bg-purple-600 text-white font-bold' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        不重複抽獎
                        <div className="text-xs mt-1 opacity-80">中獎過不可再抽</div>
                      </button>
                      <button
                        onClick={() => setDrawRule('allow-repeat')}
                        className={`flex-1 py-2 rounded transition text-sm ${
                          drawRule === 'allow-repeat' 
                            ? 'bg-purple-600 text-white font-bold' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        可重複抽獎
                        <div className="text-xs mt-1 opacity-80">中獎後可再抽</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white mb-2 text-sm font-medium">抽獎方式</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDrawMode('single')}
                        className={`flex-1 py-2 rounded transition text-sm ${
                          drawMode === 'single' 
                            ? 'bg-blue-600 text-white font-bold' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        單筆抽選
                      </button>
                      <button
                        onClick={() => setDrawMode('batch')}
                        className={`flex-1 py-2 rounded transition text-sm ${
                          drawMode === 'batch' 
                            ? 'bg-blue-600 text-white font-bold' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        批次抽選
                      </button>
                    </div>
                  </div>

                  {drawMode === 'batch' && (
                    <div className="flex items-center gap-4 bg-white/10 p-3 rounded">
                      <label className="text-white font-medium text-sm">抽選數量:</label>
                      <input
                        type="number"
                        value={batchCount}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          if (Number.isNaN(value)) {
                            setBatchCount(1);
                            return;
                          }
                          const clamped = Math.min(Math.max(value, 1), maxBatchCount);
                          setBatchCount(clamped);
                        }}
                        min="1"
                        max={maxBatchCount}
                        className="px-4 py-2 rounded w-24 bg-white text-gray-800"
                        disabled={!currentPrize || currentPrizeRemaining === 0}
                      />
                      <span className="text-xs text-white/70">
                        最多可抽 {maxBatchCount} 名
                      </span>
                    </div>
                  )}

                  <button
                    onClick={drawMode === 'single' ? handleSingleDraw : handleBatchDraw}
                    disabled={!canDraw}
                    className={`w-full py-5 text-white font-bold text-2xl rounded-lg transition shadow-lg ${
                      canDraw
                        ? 'bg-green-600 hover:bg-green-700 transform hover:scale-105'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {canDraw ? '🎉 開始抽獎 🎉' : currentPrizeRemaining === 0 ? '本獎項已抽完' : '請選擇獎項'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 抽獎動畫顯示區域 */}
        {!isLoading && (isDrawing || currentWinner || batchWinners.length > 0) && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 max-w-4xl w-full text-center">
            {isDrawing && drawMode === 'single' && (
              <div className="space-y-8">
                <div className="text-4xl font-bold text-yellow-400 mb-4">
                  {currentPrize?.prize_title}
                </div>
                <div className="text-6xl font-bold text-white mb-4 min-h-[120px] flex items-center justify-center">
                  {displayName || '抽選中...'}
                </div>
                <div className="text-2xl text-white/80">
                  {currentPrize?.prize_name}
                </div>
              </div>
            )}

            {currentWinner && !isDrawing && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-5xl font-bold text-yellow-400 mb-4 animate-pulse">
                  恭喜中獎！
                </div>
                {/* 根據 checked_in 狀態顯示不同顏色 */}
                {currentWinner.checked_in === 2 || currentWinner.checked_in === 9 ? (
                  <>
                    <div className="text-7xl font-bold text-blue-300 mb-6 border-4 border-blue-400 rounded-lg p-6 bg-blue-900/30">
                      {currentWinner.name}
                    </div>
                    <div className="text-2xl font-bold text-blue-200 mb-4 bg-blue-800/50 rounded-lg p-4">
                      ⚠️ 不需上台領獎
                      {currentWinner.checked_in === 2 ? '（公差無法到場）' : '（因公未到）'}
                    </div>
                  </>
                ) : (
                  <div className="text-7xl font-bold text-white mb-6">
                    {currentWinner.name}
                  </div>
                )}
                <div className="text-3xl text-white/90 mb-2">
                  {currentPrize?.prize_title}
                </div>
                <div className="text-2xl text-white/80 mb-8">
                  {currentPrize?.prize_name}
                </div>
                <div className="text-xl text-white/70 mb-2">
                  工號: {currentWinner.id} | 部門: {currentWinner.department}
                </div>
                <div className="text-sm text-white/60">
                  抽獎規則: {drawRule === 'no-repeat' ? '不重複抽獎' : '可重複抽獎'}
                </div>
                <button
                  onClick={() => {
                    setCurrentWinner(null);
                    setDisplayName('');
                  }}
                  className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                >
                  繼續抽獎
                </button>
              </div>
            )}

            {batchWinners.length > 0 && !isDrawing && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-5xl font-bold text-yellow-400 mb-4">
                  恭喜中獎！
                </div>
                <div className="text-3xl text-white/90 mb-2">
                  {currentPrize?.prize_title} - {currentPrize?.prize_name}
                </div>
                <div className="text-sm text-white/60 mb-4">
                  抽獎規則: {drawRule === 'no-repeat' ? '不重複抽獎' : '可重複抽獎'}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {batchWinners.map((winner, idx) => {
                    // 根據 checked_in 狀態決定樣式
                    const isAbsent = winner.checked_in === 2 || winner.checked_in === 9;
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg p-4 ${
                          isAbsent 
                            ? 'bg-blue-900/50 border-4 border-blue-400 text-blue-200' 
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        <div className="text-3xl font-bold mb-2">{winner.name}</div>
                        {isAbsent && (
                          <div className="text-sm font-bold text-blue-200 mb-2">
                            ⚠️ 不需上台領獎
                            {winner.checked_in === 2 ? '（公差無法到場）' : '（因公未到）'}
                          </div>
                        )}
                        <div className="text-sm">工號: {winner.id}</div>
                        <div className="text-sm">部門: {winner.department}</div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setBatchWinners([]);
                  }}
                  className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                >
                  繼續抽獎
                </button>
              </div>
            )}
          </div>
        )}

        {isFullscreen && onExitFullscreen && (
          <button
            onClick={onExitFullscreen}
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            退出全螢幕
          </button>
        )}
      </div>
    </div>
  );
}


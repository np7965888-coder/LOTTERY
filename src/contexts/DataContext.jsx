import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getParticipants, getPrizes, getWinners, checkIn as apiCheckIn, appendWinner, appendWinners } from '../services/api';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

// localStorage 鍵名
const STORAGE_KEYS = {
  PARTICIPANTS: 'lottery_participants',
  PRIZES: 'lottery_prizes',
  WINNERS: 'lottery_winners',
  DATA_LOADED: 'lottery_data_loaded',
  DATA_LOADED_TIMESTAMP: 'lottery_data_loaded_timestamp',
  PENDING_CHECKINS: 'lottery_pending_checkins',
  PENDING_WINNERS: 'lottery_pending_winners'
};

export function DataProvider({ children }) {
  // 從 localStorage 初始化狀態
  const [participants, setParticipants] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [prizes, setPrizes] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRIZES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [winners, setWinners] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WINNERS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.DATA_LOADED) === 'true';
    } catch {
      return false;
    }
  }); // 追蹤資料是否已載入

  // 待上傳隊列（從 localStorage 初始化，不自動上傳）
  const [pendingCheckIns, setPendingCheckIns] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_CHECKINS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [pendingWinners, setPendingWinners] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_WINNERS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 將中獎紀錄同步到參與者的 won 狀態
  const applyWinnersToParticipants = useCallback((participantsList, winnersList) => {
    if (!participantsList?.length || !winnersList?.length) return participantsList || [];
    const winnerIds = new Set(winnersList.map(w => String(w.participant_id)));
    return participantsList.map(p => {
      const idStr = String(p.id);
      if (winnerIds.has(idStr)) {
        return { ...p, won: true };
      }
      return p;
    });
  }, []);

  // 重新載入本地主要資料（participants / prizes / winners）
  const refreshLocalData = useCallback(() => {
    try {
      const storedParticipants = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      const storedPrizes = localStorage.getItem(STORAGE_KEYS.PRIZES);
      const storedWinners = localStorage.getItem(STORAGE_KEYS.WINNERS);

      const participantsData = storedParticipants ? JSON.parse(storedParticipants) : [];
      const prizesData = storedPrizes ? JSON.parse(storedPrizes) : [];
      const winnersData = storedWinners ? JSON.parse(storedWinners) : [];

      const participantsWithWon = applyWinnersToParticipants(participantsData, winnersData);
      setParticipants(participantsWithWon);
      setPrizes(prizesData);
      setWinners(winnersData);
    } catch (err) {
      console.error('❌ 重新載入本地資料失敗:', err);
    }
  }, [applyWinnersToParticipants]);

  // 重新載入本地待上傳佇列（用於多分頁/視窗同步）
  const refreshPendingQueues = useCallback(() => {
    try {
      const storedCheckIns = localStorage.getItem(STORAGE_KEYS.PENDING_CHECKINS);
      setPendingCheckIns(storedCheckIns ? JSON.parse(storedCheckIns) : []);
    } catch (err) {
      console.error('❌ 讀取待上傳報到記錄失敗:', err);
    }

    try {
      const storedWinners = localStorage.getItem(STORAGE_KEYS.PENDING_WINNERS);
      setPendingWinners(storedWinners ? JSON.parse(storedWinners) : []);
    } catch (err) {
      console.error('❌ 讀取待上傳中獎記錄失敗:', err);
    }
  }, []);

  // 保存資料到 localStorage
  const saveToLocalStorage = useCallback((participantsData, prizesData, winnersData) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participantsData));
      localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizesData));
      localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(winnersData));
      localStorage.setItem(STORAGE_KEYS.DATA_LOADED, 'true');
      localStorage.setItem(STORAGE_KEYS.DATA_LOADED_TIMESTAMP, new Date().toISOString());
    } catch (err) {
      console.error('❌ 保存資料到 localStorage 失敗:', err);
    }
  }, []);

  // 一次性載入所有資料（手動觸發）
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📥 開始一次性載入所有資料...');
      const [participantsData, prizesData, winnersData] = await Promise.all([
        getParticipants(),
        getPrizes(),
        getWinners()
      ]);
      
      const participantsList = participantsData.data || [];
      const prizesList = prizesData.data || [];
      const winnersList = winnersData.data || [];
      const participantsWithWon = applyWinnersToParticipants(participantsList, winnersList);
      
      setParticipants(participantsWithWon);
      setPrizes(prizesList);
      setWinners(winnersList);
      setDataLoaded(true); // 標記資料已載入
      
      // 保存到 localStorage
      saveToLocalStorage(participantsWithWon, prizesList, winnersList);
      
      console.log('✅ 資料載入完成:', {
        participants: participantsList.length,
        prizes: prizesList.length,
        winners: winnersList.length
      });
    } catch (err) {
      console.error('❌ 載入資料失敗:', err);
      setError(err.message || '載入資料失敗');
      setDataLoaded(false);
      try {
        localStorage.setItem(STORAGE_KEYS.DATA_LOADED, 'false');
      } catch {}
      alert('載入資料失敗: ' + (err.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  }, [saveToLocalStorage, applyWinnersToParticipants]);

  // 更新參與者（用於報到）
  const updateParticipant = useCallback((participantId, updates) => {
    setParticipants(prev => {
      const updated = prev.map(p => {
        if (String(p.id) === String(participantId)) {
          return { ...p, ...updates };
        }
        return p;
      });
      // 更新 localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updated));
      } catch (err) {
        console.error('❌ 更新參與者到 localStorage 失敗:', err);
      }
      return updated;
    });
  }, []);

  // 添加中獎記錄（用於抽獎）
  const addWinner = useCallback((winner) => {
    setWinners(prev => {
      const updated = [...prev, winner];
      // 更新 localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(updated));
      } catch (err) {
        console.error('❌ 更新中獎記錄到 localStorage 失敗:', err);
      }
      return updated;
    });
    // 同步參與者 won 狀態並寫入 localStorage
    setParticipants(prev => {
      const updatedParticipants = applyWinnersToParticipants(prev, [winner]);
      try {
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updatedParticipants));
      } catch (err) {
        console.error('❌ 更新參與者到 localStorage 失敗:', err);
      }
      return updatedParticipants;
    });
  }, [applyWinnersToParticipants]);

  // 批次添加中獎記錄
  const addWinners = useCallback((winnersList) => {
    setWinners(prev => {
      const updated = [...prev, ...winnersList];
      // 更新 localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.WINNERS, JSON.stringify(updated));
      } catch (err) {
        console.error('❌ 更新中獎記錄到 localStorage 失敗:', err);
      }
      return updated;
    });
    // 同步參與者 won 狀態並寫入 localStorage
    setParticipants(prev => {
      const updatedParticipants = applyWinnersToParticipants(prev, winnersList);
      try {
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updatedParticipants));
      } catch (err) {
        console.error('❌ 更新參與者到 localStorage 失敗:', err);
      }
      return updatedParticipants;
    });
  }, [applyWinnersToParticipants]);

  // 報到功能（優先立即上傳；離線/失敗則留待上傳）
  const checkIn = useCallback(async (participantId) => {
    // 先更新本地資料
    const participant = participants.find(p => String(p.id) === String(participantId));
    if (!participant) {
      throw new Error(`找不到工號「${participantId}」的參與者`);
    }

    // 如果已經報到，直接返回（不再重複上傳）
    if (participant.checked_in === 1) {
      return {
        success: true,
        name: participant.name,
        message: '您已經報到過了',
        alreadyCheckedIn: true
      };
    }

    const participantIdStr = String(participantId || '').trim();
    const now = new Date().toISOString();

    // 先本地更新參與者狀態
    updateParticipant(participantId, {
      checked_in: 1,
      checked_date: now
    });

    // 嘗試立即上傳至伺服器
    let uploadSucceeded = false;
    try {
      if (participantIdStr) {
        await apiCheckIn(participantIdStr);
        uploadSucceeded = true;
      }
    } catch (err) {
      console.warn('⚠️ 即時上傳報到失敗，將加入待上傳隊列:', err?.message || err);
    }

    // 若上傳失敗，或無法判定，加入待上傳佇列
    if (!uploadSucceeded && participantIdStr) {
      setPendingCheckIns(prev => {
        const exists = prev.some(p => String(p.participantId) === participantIdStr);
        if (exists) return prev;
        const updated = [...prev, { participantId: participantIdStr, timestamp: now }];
        try {
          localStorage.setItem(STORAGE_KEYS.PENDING_CHECKINS, JSON.stringify(updated));
        } catch (err) {
          console.error('❌ 保存待上傳報到記錄失敗:', err);
        }
        return updated;
      });
    } else if (uploadSucceeded && participantIdStr) {
      // 確保若佇列裡已有同筆，移除
      setPendingCheckIns(prev => {
        const updated = prev.filter(p => String(p.participantId) !== participantIdStr);
        try {
          localStorage.setItem(STORAGE_KEYS.PENDING_CHECKINS, JSON.stringify(updated));
        } catch (err) {
          console.error('❌ 更新待上傳報到記錄失敗:', err);
        }
        return updated;
      });
    }

    return {
      success: true,
      name: participant.name,
      message: uploadSucceeded ? '報到成功（已同步）' : '報到成功（待上傳）'
    };
  }, [participants, updateParticipant]);

  // 添加待上傳的中獎記錄（用於抽獎）
  const addPendingWinner = useCallback((winner) => {
    setPendingWinners(prev => {
      // 檢查是否已存在（避免重複）
      const exists = prev.some(w => 
        w.prize_id === winner.prize_id && 
        w.participant_id === winner.participant_id &&
        Math.abs(new Date(w.timestamp || 0) - new Date(winner.timestamp || 0)) < 1000
      );
      if (exists) return prev;
      
      const updated = [...prev, winner];
      try {
        localStorage.setItem(STORAGE_KEYS.PENDING_WINNERS, JSON.stringify(updated));
      } catch (err) {
        console.error('❌ 保存待上傳中獎記錄失敗:', err);
      }
      return updated;
    });
  }, []);

  // 批次添加待上傳的中獎記錄
  const addPendingWinners = useCallback((winnersList) => {
    setPendingWinners(prev => {
      const newWinners = winnersList.filter(winner => {
        // 檢查是否已存在（避免重複）
        return !prev.some(w => 
          w.prize_id === winner.prize_id && 
          w.participant_id === winner.participant_id &&
          Math.abs(new Date(w.timestamp || 0) - new Date(winner.timestamp || 0)) < 1000
        );
      });
      
      if (newWinners.length === 0) return prev;
      
      const updated = [...prev, ...newWinners];
      try {
        localStorage.setItem(STORAGE_KEYS.PENDING_WINNERS, JSON.stringify(updated));
      } catch (err) {
        console.error('❌ 保存待上傳中獎記錄失敗:', err);
      }
      return updated;
    });
  }, []);

  // 手動上傳待上傳的報到記錄
  const uploadPendingCheckIns = useCallback(async () => {
    if (pendingCheckIns.length === 0) {
      return { success: true, message: '沒有待上傳的報到記錄' };
    }

    const results = [];
    const failed = [];
    
    for (const checkIn of pendingCheckIns) {
      try {
        await apiCheckIn(checkIn.participantId);
        results.push(checkIn);
      } catch (error) {
        console.error(`❌ 上傳報到記錄失敗 (${checkIn.participantId}):`, error);
        failed.push(checkIn);
      }
    }

    // 移除成功上傳的記錄
    if (results.length > 0) {
      setPendingCheckIns(prev => {
        const updated = prev.filter(c => !results.some(r => r.participantId === c.participantId));
        try {
          localStorage.setItem(STORAGE_KEYS.PENDING_CHECKINS, JSON.stringify(updated));
        } catch (err) {
          console.error('❌ 更新待上傳報到記錄失敗:', err);
        }
        return updated;
      });
    }

    return {
      success: failed.length === 0,
      uploaded: results.length,
      failed: failed.length,
      message: failed.length === 0 
        ? `成功上傳 ${results.length} 條報到記錄`
        : `成功上傳 ${results.length} 條，失敗 ${failed.length} 條`
    };
  }, [pendingCheckIns]);

  // 手動上傳待上傳的中獎記錄
  const uploadPendingWinners = useCallback(async () => {
    if (pendingWinners.length === 0) {
      return { success: true, message: '沒有待上傳的中獎記錄' };
    }

    try {
      // 批次上傳
      const result = await appendWinners(pendingWinners);
      
      if (result.success) {
        // 清空待上傳隊列
        setPendingWinners([]);
        try {
          localStorage.setItem(STORAGE_KEYS.PENDING_WINNERS, JSON.stringify([]));
        } catch (err) {
          console.error('❌ 清空待上傳中獎記錄失敗:', err);
        }
        // 同步參與者 won 狀態並寫入 localStorage
        setParticipants(prev => {
          const updatedParticipants = applyWinnersToParticipants(prev, pendingWinners);
          try {
            localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updatedParticipants));
          } catch (err) {
            console.error('❌ 更新參與者到 localStorage 失敗:', err);
          }
          return updatedParticipants;
        });
        return {
          success: true,
          uploaded: pendingWinners.length,
          message: `成功上傳 ${pendingWinners.length} 條中獎記錄`
        };
      } else {
        throw new Error(result.message || '上傳失敗');
      }
    } catch (error) {
      console.error('❌ 批次上傳中獎記錄失敗:', error);
      // 如果批次上傳失敗，嘗試單條上傳
      const results = [];
      const failed = [];
      
      for (const winner of pendingWinners) {
        try {
          await appendWinner(winner);
          results.push(winner);
        } catch (err) {
          console.error(`❌ 上傳中獎記錄失敗:`, err);
          failed.push(winner);
        }
      }

      // 移除成功上傳的記錄
      if (results.length > 0) {
        setPendingWinners(prev => {
          const updated = prev.filter(w => !results.some(r => 
            r.prize_id === w.prize_id && 
            r.participant_id === w.participant_id &&
            Math.abs(new Date(r.timestamp || 0) - new Date(w.timestamp || 0)) < 1000
          ));
          try {
            localStorage.setItem(STORAGE_KEYS.PENDING_WINNERS, JSON.stringify(updated));
          } catch (err) {
            console.error('❌ 更新待上傳中獎記錄失敗:', err);
          }
          return updated;
        });
        // 同步參與者 won 狀態並寫入 localStorage
        setParticipants(prev => {
          const updatedParticipants = applyWinnersToParticipants(prev, results);
          try {
            localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updatedParticipants));
          } catch (err) {
            console.error('❌ 更新參與者到 localStorage 失敗:', err);
          }
          return updatedParticipants;
        });
      }

      return {
        success: failed.length === 0,
        uploaded: results.length,
        failed: failed.length,
        message: failed.length === 0 
          ? `成功上傳 ${results.length} 條中獎記錄`
          : `成功上傳 ${results.length} 條，失敗 ${failed.length} 條`
      };
    }
  }, [pendingWinners]);

  // 當分頁回到焦點 / 可見或收到 storage 事件時，同步本地資料與待上傳佇列
  useEffect(() => {
    const syncAllLocal = () => {
      refreshLocalData();
      refreshPendingQueues();
    };

    window.addEventListener('focus', syncAllLocal);
    window.addEventListener('visibilitychange', syncAllLocal);
    window.addEventListener('storage', syncAllLocal);

    return () => {
      window.removeEventListener('focus', syncAllLocal);
      window.removeEventListener('visibilitychange', syncAllLocal);
      window.removeEventListener('storage', syncAllLocal);
    };
  }, [refreshLocalData, refreshPendingQueues]);

  // 清除待上傳的中獎紀錄
  const clearPendingWinners = useCallback(() => {
    try {
      // 清除待上傳中獎紀錄 state
      setPendingWinners([]);
      
      // 清除 localStorage 中的待上傳中獎紀錄
      localStorage.setItem(STORAGE_KEYS.PENDING_WINNERS, JSON.stringify([]));
      
      console.log('✅ 已清除待上傳中獎紀錄');
      return { success: true, message: '已清除待上傳中獎紀錄' };
    } catch (err) {
      console.error('❌ 清除待上傳中獎紀錄失敗:', err);
      return { success: false, message: '清除失敗: ' + err.message };
    }
  }, []);

  const value = {
    participants,
    prizes,
    winners,
    loading,
    error,
    dataLoaded,
    loadAllData,
    updateParticipant,
    addWinner,
    addWinners,
    checkIn,
    pendingCheckIns,
    pendingWinners,
    addPendingWinner,
    addPendingWinners,
    uploadPendingCheckIns,
    uploadPendingWinners,
    refreshLocalData,
    refreshPendingQueues,
    clearPendingWinners
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}


import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getParticipants, getPrizes, getWinners, checkIn as apiCheckIn, appendWinner, appendWinners, appendPrize } from '../services/api';
import { appendCheckInToGist, fetchCheckInsFromGist } from '../services/gistCheckInApi';

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
  PENDING_WINNERS: 'lottery_pending_winners',
  PENDING_PRIZES: 'lottery_pending_prizes',
  CHECKIN_SETTINGS: 'lottery_checkin_settings'
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
  const [pendingPrizes, setPendingPrizes] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_PRIZES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [checkInSettings, setCheckInSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHECKIN_SETTINGS);
      return stored ? JSON.parse(stored) : { enabled: true, deadline: '' };
    } catch {
      return { enabled: true, deadline: '' };
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
      const storedCheckInSettings = localStorage.getItem(STORAGE_KEYS.CHECKIN_SETTINGS);

      const participantsData = storedParticipants ? JSON.parse(storedParticipants) : [];
      const prizesData = storedPrizes ? JSON.parse(storedPrizes) : [];
      const winnersData = storedWinners ? JSON.parse(storedWinners) : [];
      const settingsData = storedCheckInSettings ? JSON.parse(storedCheckInSettings) : { enabled: true, deadline: '' };

      const participantsWithWon = applyWinnersToParticipants(participantsData, winnersData);
      setParticipants(participantsWithWon);
      setPrizes(prizesData);
      setWinners(winnersData);
      setCheckInSettings(settingsData);
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

    try {
      const storedPrizes = localStorage.getItem(STORAGE_KEYS.PENDING_PRIZES);
      setPendingPrizes(storedPrizes ? JSON.parse(storedPrizes) : []);
    } catch (err) {
      console.error('❌ 讀取待上傳獎項記錄失敗:', err);
    }
  }, []);

  // 更新報到設定（不依賴 Google Sheet）
  const updateCheckInSettings = useCallback((updates) => {
    setCheckInSettings(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEYS.CHECKIN_SETTINGS, JSON.stringify(next));
      } catch (err) {
        console.error('❌ 保存報到設定失敗:', err);
      }
      return next;
    });
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

  // 報到功能（寫入 GitHub Gist 作為中央存儲）
  const checkIn = useCallback(async (participantId) => {
    // 檢查報到設定
    if (!checkInSettings?.enabled) {
      return {
        success: false,
        message: '報到功能已暫停，請洽工作人員'
      };
    }

    // 檢查是否已過截止時間
    if (checkInSettings?.deadline) {
      const deadline = new Date(checkInSettings.deadline);
      const now = new Date();
      if (!isNaN(deadline.getTime()) && now > deadline) {
        return {
          success: false,
          message: '報到時間已截止，請洽工作人員'
        };
      }
    }

    // 查找參與者資料
    const participant = participants.find(p => String(p.id) === String(participantId));
    if (!participant) {
      throw new Error(`找不到工號「${participantId}」的參與者`);
    }

    try {
      // 寫入 GitHub Gist（中央存儲）
      console.log(`📝 報到: ${participantId} - 寫入 Gist`);
      const result = await appendCheckInToGist(participantId, {
        name: participant.name,
        department: participant.department,
        company: participant.company
      });

      if (!result.success) {
        throw new Error(result.error || '寫入 Gist 失敗');
      }

      console.log(`✅ 報到成功: ${participantId} - 已寫入 Gist`);

      return {
        success: true,
        name: participant.name,
        alreadyCheckedIn: result.alreadyCheckedIn,
        message: result.alreadyCheckedIn ? '您已經報到過了' : '報到成功'
      };

    } catch (error) {
      console.error(`❌ 報到失敗: ${participantId}`, error);

      // 容錯：存入本地待上傳隊列
      setPendingCheckIns(prev => {
        const updated = [...prev, {
          participantId,
          timestamp: new Date().toISOString(),
          error: error.message
        }];
        try {
          localStorage.setItem(STORAGE_KEYS.PENDING_CHECKINS, JSON.stringify(updated));
        } catch (err) {
          console.error('❌ 保存到本地隊列失敗:', err);
        }
        return updated;
      });

      throw error; // 讓前端顯示錯誤訊息
    }
  }, [participants, checkInSettings]);

  // 從 GitHub Gist 同步報到數據到本地
  const syncCheckInsFromGist = useCallback(async () => {
    try {
      console.log('🔄 開始從 Gist 同步報到數據...');

      const result = await fetchCheckInsFromGist();

      if (!result.success) {
        console.error('❌ 同步失敗:', result.error);
        return { success: false, error: result.error };
      }

      const gistCheckIns = result.checkIns || [];
      console.log(`📊 從 Gist 獲取到 ${gistCheckIns.length} 筆報到記錄`);

      // 更新本地參與者的 checked_in 狀態
      setParticipants(prev => {
        const updated = prev.map(p => {
          const checkInRecord = gistCheckIns.find(
            c => String(c.participantId) === String(p.id)
          );

          if (checkInRecord) {
            return {
              ...p,
              checked_in: 1,
              checkin_time: checkInRecord.timestamp
            };
          }
          return p;
        });

        // 保存到 localStorage
        try {
          localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updated));
        } catch (err) {
          console.error('❌ 保存參與者數據失敗:', err);
        }

        return updated;
      });

      const checkedInCount = gistCheckIns.length;
      console.log(`✅ 同步完成: ${checkedInCount} 人已報到`);

      return {
        success: true,
        count: checkedInCount,
        lastUpdated: result.lastUpdated
      };

    } catch (error) {
      console.error('❌ 同步報到數據時發生錯誤:', error);
      return { success: false, error: error.message };
    }
  }, []);

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

  // 手動上傳待上傳的獎項
  const uploadPendingPrizes = useCallback(async () => {
    if (pendingPrizes.length === 0) {
      return { success: true, message: '沒有待上傳的獎項記錄' };
    }

    const results = [];
    const failed = [];
    
    for (const prize of pendingPrizes) {
      try {
        const result = await appendPrize(prize);
        if (result.success) {
          results.push(prize);
          // 如果 Google Sheet 返回了新的 prize_id，更新本地數據
          if (result.prize_id && result.prize_id !== prize.prize_id) {
            setPrizes(prev => {
              const updated = prev.map(p => 
                p.prize_id === prize.prize_id 
                  ? { ...p, prize_id: result.prize_id }
                  : p
              );
              try {
                localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(updated));
              } catch (err) {
                console.error('❌ 更新獎項 ID 到 localStorage 失敗:', err);
              }
              return updated;
            });
          }
        } else {
          failed.push(prize);
        }
      } catch (error) {
        console.error(`❌ 上傳獎項失敗 (${prize.prize_title}):`, error);
        failed.push(prize);
      }
    }

    // 移除成功上傳的記錄
    if (results.length > 0) {
      setPendingPrizes(prev => {
        const updated = prev.filter(p => !results.some(r => r.prize_id === p.prize_id));
        try {
          localStorage.setItem(STORAGE_KEYS.PENDING_PRIZES, JSON.stringify(updated));
        } catch (err) {
          console.error('❌ 更新待上傳獎項記錄失敗:', err);
        }
        return updated;
      });
    }

    return {
      success: failed.length === 0,
      uploaded: results.length,
      failed: failed.length,
      message: failed.length === 0 
        ? `成功上傳 ${results.length} 條獎項記錄`
        : `成功上傳 ${results.length} 條，失敗 ${failed.length} 條`
    };
  }, [pendingPrizes]);

  // 添加臨時獎項（用於臨時加碼）
  const addPrize = useCallback((prizeData) => {
    // 先創建新獎項對象
    const newPrize = {
      ...prizeData,
      prize_id: prizeData.prize_id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      quantity: prizeData.quantity !== undefined ? Number(prizeData.quantity) : 0, // 確保是數字類型
      mode: prizeData.mode || 'temp' // 臨時加碼模式
    };

    // 更新本地 state
    setPrizes(prev => {
      // 計算 order
      newPrize.order = prizeData.order !== undefined ? prizeData.order : (prev.length > 0 ? Math.max(...prev.map(p => p.order || 0)) + 1 : 1);
      
      const updated = [...prev, newPrize];
      // 更新 localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(updated));
      } catch (err) {
        console.error('❌ 更新獎項到 localStorage 失敗:', err);
      }
      return updated;
    });

    // 添加到待上傳隊列
    setPendingPrizes(prev => {
      // 檢查是否已存在（避免重複）
      const exists = prev.some(p => p.prize_id === newPrize.prize_id);
      if (exists) return prev;
      
      const updated = [...prev, newPrize];
      try {
        localStorage.setItem(STORAGE_KEYS.PENDING_PRIZES, JSON.stringify(updated));
      } catch (err) {
        console.error('❌ 保存待上傳獎項記錄失敗:', err);
      }
      return updated;
    });
    
    console.log('📌 獎項已添加到待上傳隊列，請在管理後台手動上傳');
    return newPrize; // 返回新創建的獎項
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
    syncCheckInsFromGist,
    pendingCheckIns,
    pendingWinners,
    pendingPrizes,
    addPendingWinner,
    addPendingWinners,
    uploadPendingCheckIns,
    uploadPendingWinners,
    uploadPendingPrizes,
    refreshLocalData,
    refreshPendingQueues,
    checkInSettings,
    updateCheckInSettings,
    clearPendingWinners,
    addPrize
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}


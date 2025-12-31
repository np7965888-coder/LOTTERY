import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { secureShuffleAndPick, batchDraw } from '../utils/lottery';
import { useData } from '../contexts/DataContext';

// 有機化合物示性式和構造式列表
const CHEMICAL_FORMULAS = [
  // 烷烴 - 示性式
  'CH₄', 'CH₃CH₃', 'CH₃CH₂CH₃', 'CH₃CH₂CH₂CH₃', 'CH₃CH₂CH₂CH₂CH₃',
  // 烷烴 - 構造式
  'CH₃-CH₃', 'CH₃-CH₂-CH₃', 'CH₃-CH₂-CH₂-CH₃',
  // 烯烴 - 示性式
  'CH₂=CH₂', 'CH₃CH=CH₂',
  // 烯烴 - 構造式
  'CH₂=CH-CH₃', 'CH₃-CH=CH₂',
  // 炔烴 - 示性式
  'CH≡CH', 'CH₃C≡CH',
  // 炔烴 - 構造式
  'CH₃-C≡CH',
  // 醇類 - 示性式
  'CH₃OH', 'CH₃CH₂OH', 'CH₃CH₂CH₂OH', 'CH₃CH(OH)CH₃',
  // 醇類 - 構造式
  'CH₃-OH', 'CH₃-CH₂-OH', 'CH₃-CH₂-CH₂-OH', 'CH₃-CH(OH)-CH₃',
  // 醛類 - 示性式
  'HCHO', 'CH₃CHO', 'CH₃CH₂CHO',
  // 醛類 - 構造式
  'H-CHO', 'CH₃-CHO', 'CH₃-CH₂-CHO',
  // 酸類 - 示性式
  'CH₃COOH', 'CH₃CH₂COOH', 'HCOOH',
  // 酸類 - 構造式
  'CH₃-COOH', 'CH₃-CH₂-COOH', 'H-COOH',
  // 酮類 - 示性式
  'CH₃COCH₃', 'CH₃COCH₂CH₃',
  // 酮類 - 構造式
  'CH₃-CO-CH₃', 'CH₃-CO-CH₂-CH₃',
  // 酯類 - 示性式
  'CH₃COOCH₃', 'CH₃COOCH₂CH₃',
  // 酯類 - 構造式
  'CH₃-COO-CH₃', 'CH₃-COO-CH₂-CH₃',
  // 芳香族 - 示性式
  'C₆H₆', 'C₆H₅CH₃', 'C₆H₅OH', 'C₆H₅COOH',
  // 芳香族 - 構造式
  'C₆H₅-CH₃', 'C₆H₅-OH', 'C₆H₅-COOH',
  // 胺類 - 示性式
  'CH₃NH₂', 'CH₃CH₂NH₂', '(CH₃)₂NH', '(CH₃)₃N',
  // 胺類 - 構造式
  'CH₃-NH₂', 'CH₃-CH₂-NH₂', '(CH₃)₂N-H', '(CH₃)₃N',
  // 鹵化物 - 示性式
  'CH₃Cl', 'CH₃CH₂Cl', 'CHCl₃', 'CCl₄',
  // 鹵化物 - 構造式
  'CH₃-Cl', 'CH₃-CH₂-Cl', 'CHCl₃', 'CCl₄',
  // 醚類 - 示性式
  'CH₃CH₂OCH₂CH₃', 'CH₃OCH₃',
  // 醚類 - 構造式
  'CH₃-CH₂-O-CH₂-CH₃', 'CH₃-O-CH₃'
];

export default function DrawScreen({ isFullscreen = false, onExitFullscreen }) {
  // 使用全局資料
  const { participants: contextParticipants, prizes, winners, loading: isLoading, dataLoaded, addWinner, addWinners, addPendingWinner, addPendingWinners, loadAllData, addPrize } = useData();
  
  // 使用本地 participants state（從 context 初始化，用於更新 won 狀態）
  const [participants, setParticipants] = useState(contextParticipants);
  
  // 當 context 資料更新時，同步本地 state
  useEffect(() => {
    setParticipants(contextParticipants);
  }, [contextParticipants]);
  
  const [currentPrize, setCurrentPrize] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState(null);
  const [batchCount, setBatchCount] = useState(5);
  const [batchWinners, setBatchWinners] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [goldBorderProgress, setGoldBorderProgress] = useState(0); // 金色邊框動畫進度 (0-1)
  const [redrawCount, setRedrawCount] = useState(1); // 重抽次數
  const [tempPrizeDrawCount, setTempPrizeDrawCount] = useState({}); // 臨時加碼：後綴流水號 {prize_id: count}
  const [showResultScreen, setShowResultScreen] = useState(false); // quantity=0 特例：不抽人但切到抽獎結果畫面
  const [showTempPrizeModal, setShowTempPrizeModal] = useState(false); // 顯示臨時加碼彈窗
  const [tempPrizeForm, setTempPrizeForm] = useState({ prize_title: '臨時加碼', prize_name: '001', company: 'ALL', mode: 'batch', quantity: 1 }); // 臨時加碼表單
  const [tempPrizeCounter, setTempPrizeCounter] = useState(1); // 臨時加碼流水號計數器
  const [isRedrawDisabled, setIsRedrawDisabled] = useState(false); // 重抽按鈕是否禁用（5秒冷卻）
  const animationCleanupRef = useRef(null);
  const backgroundCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const resultCanvasRef = useRef(null);
  const resultAnimationFrameRef = useRef(null);
  const goldBorderAnimationRef = useRef(null);
  
  const audioRef = useRef({
    spinning: null,
    win: null,
    confetti: null,
    drumroll: null
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
    if (Number(prize.quantity) === 0) {
      return Number.POSITIVE_INFINITY;
    }
    const used = winnersByPrize[prize.prize_id] || 0;
    return Math.max(prize.quantity - used, 0);
  };

  const currentPrizeIndex = currentPrize
    ? sortedPrizes.findIndex(p => p.prize_id === currentPrize.prize_id)
    : -1;

  const currentPrizeRemaining = getRemaining(currentPrize);
  const prizeMode = currentPrize?.mode || 'single';
  const isBatchMode = prizeMode === 'batch';
  const isSinglePrize = prizeMode === 'single';
  const isUnlimitedQuantity = Number(currentPrize?.quantity) === 0;
  const maxBatchCount = currentPrize ? (isBatchMode ? Math.max(currentPrizeRemaining, 1) : 1) : 1;
  const canDraw = !!currentPrize && (isUnlimitedQuantity || currentPrizeRemaining > 0) && !isDrawing && (!isBatchMode || batchCount > 0);
  const noPrizes = sortedPrizes.length === 0;

  // 計算金色邊框顏色（根據動畫進度從黯淡黑色到亮金色）
  const getGoldBorderColor = (progress) => {
    // 起點：黯淡黑色 #1a1a1a (26, 26, 26)
    // 終點：亮金色 #FBC02D (251, 192, 45)
    const startR = 26;
    const startG = 26;
    const startB = 26;
    const endR = 251;
    const endG = 192;
    const endB = 45;
    
    const r = Math.round(startR + (endR - startR) * progress);
    const g = Math.round(startG + (endG - startG) * progress);
    const b = Math.round(startB + (endB - startB) * progress);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // 格式化中獎者姓名顯示（非 TW 公司顯示「姓名(公司)」）
  const formatWinnerName = (name, company) => {
    const companyText = (company || '').toString().trim();
    if (!companyText) return name;
    if (companyText.toUpperCase() === 'TW') return name;
    return `${name}(${companyText})`;
  };

  // 依獎項公司過濾可抽名單（prize.company === 'ALL' 表示不限制）
  const getEligibleParticipants = (prize, allParticipants) => {
    if (!prize) return [];
    const prizeCompany = (prize.company || 'ALL').toString().trim().toUpperCase();
    const filteredByCompany = prizeCompany === 'ALL'
      ? allParticipants
      : allParticipants.filter(p => {
      const participantCompany = (p.company || '').toString().trim().toUpperCase();
      return participantCompany === prizeCompany;
    });

    // 特定人員不可抽某些獎項（participants.exclude_prize_ids 以逗號分隔）
    const prizeId = String(prize.prize_id || '').trim();
    if (!prizeId) return filteredByCompany;
    return filteredByCompany.filter(p => {
      const raw = (p.exclude_prize_ids || '').toString().trim();
      if (!raw) return true;
      const blocked = raw
        .split(/[,\s]+/g)
        .map(s => s.trim())
        .filter(Boolean);
      return !blocked.includes(prizeId);
    });
  };

  // 臨時加碼：Prize_Title 後綴 3 碼（用於區分每次按抽獎按鈕/重抽的中獎紀錄）
  const getNextTempPrizeSuffix = (prizeId) => {
    const currentCount = tempPrizeDrawCount[prizeId] || 0;
    const nextCount = currentCount + 1;
    setTempPrizeDrawCount(prev => ({ ...prev, [prizeId]: nextCount }));
    return String(nextCount).padStart(3, '0'); // 001, 002...
  };

  const getPrizeTitleWithSuffix = (prize, suffix) => {
    if (!suffix) return prize.prize_title;
    return `${prize.prize_title}${suffix}`;
  };

  // quantity=0：在結果畫面用「重抽次數」當作抽獎數量，一次抽出 N 位
  const drawTempPrizeFromResult = async () => {
    if (!currentPrize || !isUnlimitedQuantity || isDrawing) return;

    const quantity = Math.max(1, Math.min(100, redrawCount));
    const suffix = getNextTempPrizeSuffix(currentPrize.prize_id);
    const prizeTitleWithSuffix = getPrizeTitleWithSuffix(currentPrize, suffix);

    setIsDrawing(true);
    setShowResultScreen(true);
    setCurrentWinner(null);
    setBatchWinners([]);
    setCurrentPage(0);

    try {
      const latestParticipants = getEligibleParticipants(currentPrize, participants);
      const latestWinners = winners;

      const excludedIds = new Set([
        ...latestWinners
          .filter(w => w.prize_id === currentPrize.prize_id)
          .map(w => String(w.participant_id)),
        ...participants
          .filter(p => p.won === true || p.won === 'TRUE')
          .map(p => String(p.id))
      ]);

      const selected = batchDraw(latestParticipants, excludedIds, quantity, false);

      if (selected.length === 0) {
        alert('沒有可抽選的參與者！');
        setIsDrawing(false);
        return;
      }

      const now = new Date().toISOString();
      const winnersList = selected.map(winner => ({
        timestamp: now,
        prize_id: currentPrize.prize_id,
        prize_title: prizeTitleWithSuffix,
        prize_name: currentPrize.prize_name,
        participant_company: winner.company || '',
        participant_id: winner.id,
        participant_name: winner.name,
        admin: 'system',
        claimed: false
      }));

      addWinners(winnersList);
      const winnerIds = new Set(selected.map(w => String(w.id)));
      setParticipants(prev => prev.map(p =>
        winnerIds.has(String(p.id))
          ? { ...p, won: true }
          : p
      ));

      setBatchWinners(selected);
      setCurrentPage(0);
      playWinSound();
      const confettiCleanup = triggerConfetti();
      if (confettiCleanup) {
        setTimeout(() => {
          if (confettiCleanup) confettiCleanup();
        }, 3000);
      }

      // 進入抽獎結果畫面時，禁用重抽按鈕 5 秒
      setIsRedrawDisabled(true);
      setTimeout(() => setIsRedrawDisabled(false), 5000);

      setIsDrawing(false);
      addPendingWinners(winnersList);
      console.log(`📌 ${winnersList.length} 條臨時加碼記錄已添加到待上傳隊列，請在管理後台手動上傳`);
    } catch (error) {
      console.error('抽獎失敗:', error);
      alert('抽獎失敗: ' + error.message);
      setIsDrawing(false);
      // 發生錯誤時也要設置 5 秒禁用
      setTimeout(() => setIsRedrawDisabled(false), 5000);
    }
  };

  useEffect(() => {
    loadAudio();
    initBackgroundAnimation();
    initResultBackgroundAnimation();
    return () => {
      if (audioRef.current.spinning) {
        audioRef.current.spinning.pause();
      }
      if (audioRef.current.win) {
        audioRef.current.win.pause();
      }
      if (audioRef.current.confetti) {
        audioRef.current.confetti.pause();
      }
      if (audioRef.current.drumroll) {
        audioRef.current.drumroll.pause();
      }
      if (animationCleanupRef.current) {
        animationCleanupRef.current();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (resultAnimationFrameRef.current) {
        cancelAnimationFrame(resultAnimationFrameRef.current);
      }
    };
  }, []);

  // 當結果畫面顯示時，確保動畫運行
  useEffect(() => {
    if (isDrawing || currentWinner || batchWinners.length > 0) {
      const timer = setTimeout(() => {
        initResultBackgroundAnimation();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isDrawing, currentWinner, batchWinners.length]);

  // 鍵盤熱鍵支援（配合實體按鈕）
  useEffect(() => {
    const handleKeyPress = async (event) => {
      // 避免在輸入框中觸發
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.isContentEditable) {
        return;
      }

      // 檢查是否正在抽獎
      if (isDrawing) return;

      // quantity=0：已進入結果畫面但尚未抽出任何人時，Space/Enter/2 直接等同按下「重抽」
      if (showResultScreen && isUnlimitedQuantity && !currentWinner && batchWinners.length === 0) {
        if (event.key === 'Enter' || event.key === ' ' || (event.key === '2' && isBatchMode)) {
          event.preventDefault();
          await drawTempPrizeFromResult();
        }
        return;
      }

      // 檢查是否有中獎結果顯示（重抽模式）
      const hasWinnerResult = currentWinner || batchWinners.length > 0;
      
      // 如果有中獎結果，執行重抽邏輯
      if (hasWinnerResult) {
        if (event.key === 'Enter' || event.key === ' ' || 
            (event.key === '1' && !isBatchMode) || 
            (event.key === '2' && isBatchMode)) {
          event.preventDefault();
          
          // 單次抽獎重抽
          if (currentWinner && !isBatchMode) {
            const count = Math.max(1, Math.min(10, redrawCount));
            setCurrentWinner(null);
            setDisplayName('');
            
            try {
              const suffix = isUnlimitedQuantity && currentPrize ? getNextTempPrizeSuffix(currentPrize.prize_id) : null;
              for (let i = 0; i < count; i++) {
                await handleSingleDraw(suffix ? { suffix } : {});
                if (i < count - 1) {
                  await new Promise(resolve => setTimeout(resolve, 4000));
                }
              }
            } catch (error) {
              console.error('重抽失敗:', error);
              alert('重抽失敗: ' + error.message);
              setIsDrawing(false);
            }
          }
          
          // 批次抽獎重抽
          if (batchWinners.length > 0 && isBatchMode && currentPrize) {
            setIsDrawing(true);
            setBatchWinners([]);
            setCurrentPage(0);
            
            try {
              const totalCount = batchCount * Math.max(1, Math.min(10, redrawCount));
              const latestParticipants = getEligibleParticipants(currentPrize, participants);
              const latestWinners = winners;
              
              const excludedIds = new Set([
                ...latestWinners
                  .filter(w => w.prize_id === currentPrize.prize_id)
                  .map(w => String(w.participant_id)),
                ...latestParticipants
                  .filter(p => p.won === true || p.won === 'TRUE')
                  .map(p => String(p.id))
              ]);
              
              const selected = batchDraw(latestParticipants, excludedIds, totalCount, false);
              
              if (selected.length === 0) {
                alert('沒有可抽選的參與者！');
                setIsDrawing(false);
                return;
              }
              
              const suffix = isUnlimitedQuantity ? getNextTempPrizeSuffix(currentPrize.prize_id) : null;
              const prizeTitleWithSuffix = isUnlimitedQuantity ? getPrizeTitleWithSuffix(currentPrize, suffix) : currentPrize.prize_title;

              const winnersList = selected.map(winner => ({
                prize_id: currentPrize.prize_id,
                prize_title: prizeTitleWithSuffix,
                prize_name: currentPrize.prize_name,
                participant_company: winner.company || '',
                participant_id: winner.id,
                participant_name: winner.name,
                admin: 'system',
                claimed: false,
                timestamp: new Date().toISOString()
              }));
              
              addWinners(winnersList);
              setParticipants(prev => prev.map(p => 
                selected.some(w => String(w.id) === String(p.id))
                  ? { ...p, won: true }
                  : p
              ));
              
              setBatchWinners(selected);
              setCurrentPage(0);
              playWinSound();
              const confettiCleanup = triggerConfetti();
              if (confettiCleanup) {
                setTimeout(() => {
                  if (confettiCleanup) confettiCleanup();
                }, 3000);
              }
              
              setIsDrawing(false);
              
              // 添加到待上傳隊列（不自動上傳，需在管理後台手動上傳）
              addPendingWinners(winnersList);
              console.log(`📌 ${winnersList.length} 條重抽記錄已添加到待上傳隊列，請在管理後台手動上傳`);
            } catch (error) {
              console.error('重抽失敗:', error);
              alert('重抽失敗: ' + error.message);
              setIsDrawing(false);
            }
          }
        }
        return;
      }

      // 沒有中獎結果，執行正常抽獎邏輯
      const canDrawCheck = currentPrize && !isDrawing && 
                           (isUnlimitedQuantity || getRemaining(currentPrize) > 0);
      
      if (!canDrawCheck) return;

      // Enter 鍵或 Space 鍵 - 開始抽獎
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (isBatchMode) {
          handleBatchDraw();
        } else {
          handleSingleDraw();
        }
      }
      
      // 數字鍵 1 - 單次抽獎
      if (event.key === '1' && !isBatchMode) {
        event.preventDefault();
        handleSingleDraw();
      }
      
      // 數字鍵 2 - 批次抽獎
      if (event.key === '2' && isBatchMode) {
        event.preventDefault();
        handleBatchDraw();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentPrize, isDrawing, isBatchMode, isUnlimitedQuantity, showResultScreen, currentWinner, batchWinners, batchCount, participants, winners, prizes, redrawCount]);

  const initBackgroundAnimation = () => {
    const canvas = backgroundCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = 20;

    // 設置 canvas 尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 創建粒子
    const directions = ['down', 'right', 'left', 'up']; // 上往下、左往右、右往左、下往上
    for (let i = 0; i < particleCount; i++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      let initialX, initialY;
      
      // 根據方向設置初始位置
      switch (direction) {
        case 'down': // 上往下
          initialX = Math.random() * canvas.width;
          initialY = -50;
          break;
        case 'right': // 左往右
          initialX = -50;
          initialY = Math.random() * canvas.height;
          break;
        case 'left': // 右往左
          initialX = canvas.width + 50;
          initialY = Math.random() * canvas.height;
          break;
        case 'up': // 下往上
          initialX = Math.random() * canvas.width;
          initialY = canvas.height + 50;
          break;
      }
      
      particles.push({
        formula: CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)],
        x: initialX,
        y: initialY,
        speed: 0.3 + Math.random() * 0.5,
        size: 20 + Math.random() * 30,
        opacity: 0.1 + Math.random() * 0.15,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        direction: direction,
      });
    }

    // 動畫循環
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        // 根據方向更新位置
        switch (particle.direction) {
          case 'down': // 上往下
            particle.y += particle.speed;
            if (particle.y > canvas.height) {
              particle.y = -50;
              particle.x = Math.random() * canvas.width;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
          case 'right': // 左往右
            particle.x += particle.speed;
            if (particle.x > canvas.width) {
              particle.x = -50;
              particle.y = Math.random() * canvas.height;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
          case 'left': // 右往左
            particle.x -= particle.speed;
            if (particle.x < -50) {
              particle.x = canvas.width + 50;
              particle.y = Math.random() * canvas.height;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
          case 'up': // 下往上
            particle.y -= particle.speed;
            if (particle.y < -50) {
              particle.y = canvas.height + 50;
              particle.x = Math.random() * canvas.width;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
        }
        
        particle.rotation += particle.rotationSpeed;

        // 繪製化學式
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = '#FBC02D';
        ctx.font = `${particle.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.formula, 0, 0);
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  };

  const initResultBackgroundAnimation = () => {
    const canvas = resultCanvasRef.current;
    if (!canvas) {
      // 如果 canvas 還不存在，稍後再試
      setTimeout(() => {
        if (resultCanvasRef.current) {
          initResultBackgroundAnimation();
        }
      }, 100);
      return;
    }
    
    // 如果已經有動畫在運行，先清除
    if (resultAnimationFrameRef.current) {
      cancelAnimationFrame(resultAnimationFrameRef.current);
      resultAnimationFrameRef.current = null;
    }

    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = 15;

    // 設置 canvas 尺寸
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      } else {
        // 如果沒有父元素，使用窗口尺寸
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    } else {
      // 如果沒有父元素，監聽窗口大小變化
      window.addEventListener('resize', resizeCanvas);
    }

    // 創建粒子
    const directions = ['down', 'right', 'left', 'up']; // 上往下、左往右、右往左、下往上
    for (let i = 0; i < particleCount; i++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 600;
      let initialX, initialY;
      
      // 根據方向設置初始位置
      switch (direction) {
        case 'down': // 上往下
          initialX = Math.random() * canvasWidth;
          initialY = -50;
          break;
        case 'right': // 左往右
          initialX = -50;
          initialY = Math.random() * canvasHeight;
          break;
        case 'left': // 右往左
          initialX = canvasWidth + 50;
          initialY = Math.random() * canvasHeight;
          break;
        case 'up': // 下往上
          initialX = Math.random() * canvasWidth;
          initialY = canvasHeight + 50;
          break;
      }
      
      particles.push({
        formula: CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)],
        x: initialX,
        y: initialY,
        speed: 0.3 + Math.random() * 0.5,
        size: 20 + Math.random() * 30,
        opacity: 0.1 + Math.random() * 0.15,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        direction: direction,
      });
    }

    // 動畫循環
    const animate = () => {
      if (!canvas) {
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        // 根據方向更新位置
        switch (particle.direction) {
          case 'down': // 上往下
            particle.y += particle.speed;
            if (particle.y > canvas.height) {
              particle.y = -50;
              particle.x = Math.random() * canvas.width;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
          case 'right': // 左往右
            particle.x += particle.speed;
            if (particle.x > canvas.width) {
              particle.x = -50;
              particle.y = Math.random() * canvas.height;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
          case 'left': // 右往左
            particle.x -= particle.speed;
            if (particle.x < -50) {
              particle.x = canvas.width + 50;
              particle.y = Math.random() * canvas.height;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
          case 'up': // 下往上
            particle.y -= particle.speed;
            if (particle.y < -50) {
              particle.y = canvas.height + 50;
              particle.x = Math.random() * canvas.width;
              particle.formula = CHEMICAL_FORMULAS[Math.floor(Math.random() * CHEMICAL_FORMULAS.length)];
            }
            break;
        }
        
        particle.rotation += particle.rotationSpeed;

        // 繪製化學式
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = '#FBC02D';
        ctx.font = `${particle.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.formula, 0, 0);
        ctx.restore();
      });

      resultAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      if (resultAnimationFrameRef.current) {
        cancelAnimationFrame(resultAnimationFrameRef.current);
      }
    };
  };

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
    if (!isBatchMode) {
      setBatchCount(1);
      return;
    }
    const remaining = getRemaining(currentPrize);
    if (!isFinite(remaining) || remaining === 0) {
      setBatchCount(1);
    } else {
      // 自動設為該獎項的最大剩餘數量
      setBatchCount(remaining);
    }
  }, [currentPrize, winnersByPrize, isBatchMode]);

  // 金色邊框動畫效果（單筆抽選大獎專用）
  useEffect(() => {
    // 當顯示中獎者且為單筆抽選時，啟動金色邊框動畫
    if (currentWinner && !isDrawing && isSinglePrize) {
      setGoldBorderProgress(0); // 重置進度
      
      const duration = 2000; // 2秒（加速）
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1); // 0 到 1
        
        setGoldBorderProgress(progress);
        
        if (progress < 1) {
          goldBorderAnimationRef.current = requestAnimationFrame(animate);
        }
      };
      
      goldBorderAnimationRef.current = requestAnimationFrame(animate);
    } else {
      // 清除動畫
      if (goldBorderAnimationRef.current) {
        cancelAnimationFrame(goldBorderAnimationRef.current);
        goldBorderAnimationRef.current = null;
      }
      setGoldBorderProgress(0);
    }
    
    return () => {
      if (goldBorderAnimationRef.current) {
        cancelAnimationFrame(goldBorderAnimationRef.current);
        goldBorderAnimationRef.current = null;
      }
    };
  }, [currentWinner, isDrawing, isSinglePrize]);


  const loadAudio = () => {
    // 注意：實際使用時需要將音效檔放在 public/sfx/ 目錄
    // 這裡使用動態載入，如果檔案不存在會靜默失敗
    try {
      // 滾輪音效（循環播放）
      audioRef.current.spinning = new Audio('/sfx/spinning.mp3');
      audioRef.current.spinning.loop = true;
      audioRef.current.spinning.volume = 0.6;
      
      // 中獎音效
      audioRef.current.win = new Audio('/sfx/win.mp3');
      audioRef.current.win.volume = 0.8;
      
      // 煙火音效
      audioRef.current.confetti = new Audio('/sfx/confetti.mp3');
      audioRef.current.confetti.volume = 0.7;
      
      // 鼓聲音效（可選）
      audioRef.current.drumroll = new Audio('/sfx/drumroll.mp3');
      audioRef.current.drumroll.volume = 0.5;
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
    // 停止滾輪音效
    if (audioRef.current.spinning) {
      audioRef.current.spinning.pause();
    }
    // 播放中獎音效
    if (audioRef.current.win) {
      audioRef.current.win.currentTime = 0;
      audioRef.current.win.play().catch(() => {});
    }
  };

  const playConfettiSound = () => {
    // 播放煙火音效
    if (audioRef.current.confetti) {
      audioRef.current.confetti.currentTime = 0;
      audioRef.current.confetti.play().catch(() => {});
    }
  };

  const playDrumrollSound = () => {
    // 播放鼓聲音效（可選）
    if (audioRef.current.drumroll) {
      audioRef.current.drumroll.currentTime = 0;
      audioRef.current.drumroll.play().catch(() => {});
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    // 播放煙火音效
    playConfettiSound();

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
    setCurrentPage(0);
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

  const randomNumberAnimation = (finalWinner, onComplete) => {
    let startTime = Date.now();
    const duration = 3500; // 3.5秒動畫（更長一點增加緊張感）
    let animationId;
    let lastUpdateTime = startTime;
    
    // 生成隨機數字的函數
    const generateRandomDisplay = () => {
      // 隨機生成 3-6 位數字（看起來像工號）
      const length = Math.floor(Math.random() * 4) + 3; // 3-6位
      let randomNum = '';
      for (let i = 0; i < length; i++) {
        randomNum += Math.floor(Math.random() * 10);
      }
      return randomNum;
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        // 計算速度（前70%快速跳動，後30%減速）
        let speed;
        if (progress < 0.7) {
          // 快速階段：30ms -> 15ms
          speed = 30 - (progress / 0.7) * 15;
        } else {
          // 減速階段：15ms -> 150ms
          speed = 15 + ((progress - 0.7) / 0.3) * 135;
        }

        speed = Math.max(10, speed);

        // 使用時間差來控制切換頻率
        const now = Date.now();
        if (now - lastUpdateTime >= speed) {
          // 顯示完全隨機的數字
          setDisplayName(generateRandomDisplay());
          lastUpdateTime = now;
        }

        animationId = requestAnimationFrame(animate);
      } else {
        // 動畫結束，揭曉真實結果
        // 先顯示工號（增加懸念）
        setDisplayName(finalWinner.id);
        
        // 0.5秒後顯示姓名
        setTimeout(() => {
          setDisplayName(finalWinner.name);
          onComplete();
        }, 500);
      }
    };

    playSpinningSound();
    animate();
    return () => cancelAnimationFrame(animationId);
  };

  const handleSingleDraw = async (options = {}) => {
    if (!currentPrize || isDrawing || isBatchMode) return;

    // quantity=0 特例：不抽獎，直接切到抽獎結果畫面
    if (isUnlimitedQuantity) {
      setShowResultScreen(true);
      setCurrentWinner(null);
      setBatchWinners([]);
      setCurrentPage(0);
      setDisplayName('');
      return;
    }

    setIsDrawing(true);
    setCurrentWinner(null);
    setDisplayName('');

    const remainingBeforeDraw = getRemaining(currentPrize);

    // 優化：直接使用本地資料，不重新載入（節省 15-20 秒）
    // 資料已在頁面載入時下載到本地，直接使用即可
    const latestParticipants = getEligibleParticipants(currentPrize, participants);
    const latestWinners = winners;

    // 排除已中獎者（僅保留不重複抽獎）
    const excludedIds = new Set([
      // 排除當前獎項的已中獎者
      ...latestWinners
        .filter(w => w.prize_id === currentPrize.prize_id)
        .map(w => String(w.participant_id)),
      // 排除所有 won === true 的參與者
      ...participants
        .filter(p => p.won === true || p.won === 'TRUE')
        .map(p => String(p.id))
    ]);
    
    // 抽選（使用最新載入的資料）- 技術可審核的抽獎邏輯
    const selected = secureShuffleAndPick(latestParticipants, excludedIds, 1);
    
    if (selected.length === 0) {
      alert('沒有可抽選的參與者！(公司限制可能導致無可抽名單)');
      setIsDrawing(false);
      return;
    }

    const winner = selected[0];

    // 播放隨機數字動畫（純視覺效果，與抽獎邏輯完全分離）
    animationCleanupRef.current = randomNumberAnimation(winner, async () => {
      const suffix = isUnlimitedQuantity ? (options.suffix || getNextTempPrizeSuffix(currentPrize.prize_id)) : null;
      const prizeTitleWithSuffix = isUnlimitedQuantity ? getPrizeTitleWithSuffix(currentPrize, suffix) : currentPrize.prize_title;

      // 立即更新本地 state 並顯示結果（不等待 GAS 回應）
      const newWinner = {
        timestamp: new Date().toISOString(),
        prize_id: currentPrize.prize_id,
        prize_title: prizeTitleWithSuffix,
        prize_name: currentPrize.prize_name,
        participant_company: winner.company || '',
        participant_id: winner.id,
        participant_name: winner.name,
        admin: 'system',
        claimed: false
      };
      
      // 立即更新本地 state（先顯示結果）
      addWinner(newWinner);
      setParticipants(prev => prev.map(p => 
        String(p.id) === String(winner.id) 
          ? { ...p, won: true }
          : p
      ));
      
      // 立即顯示中獎者
      setCurrentWinner(winner);
      playWinSound();
      const confettiCleanup = triggerConfetti();
      if (confettiCleanup) {
        // 保存清理函數，以便在需要時清理
        setTimeout(() => {
          if (confettiCleanup) confettiCleanup();
        }, 3000);
      }

      // 進入抽獎結果畫面時，禁用重抽按鈕 5 秒
      setIsRedrawDisabled(true);
      setTimeout(() => setIsRedrawDisabled(false), 5000);

      setIsDrawing(false);
      animationCleanupRef.current = null;

      // 添加到待上傳隊列（不自動上傳，需在管理後台手動上傳）
      const winnerData = {
        timestamp: new Date().toISOString(),
        prize_id: currentPrize.prize_id,
        prize_title: prizeTitleWithSuffix,
        prize_name: currentPrize.prize_name,
        participant_company: winner.company || '',
        participant_id: winner.id,
        participant_name: winner.name,
        admin: 'system',
        claimed: false
      };
      
      addPendingWinner(winnerData);
      console.log('📌 中獎記錄已添加到待上傳隊列，請在管理後台手動上傳');
    });
  };

  const handleBatchDraw = async () => {
    if (!currentPrize || isDrawing || !isBatchMode) return;

    // quantity=0 特例：不抽獎，直接切到抽獎結果畫面
    if (isUnlimitedQuantity) {
      setShowResultScreen(true);
      setCurrentWinner(null);
      setBatchWinners([]);
      setCurrentPage(0);
      setDisplayName('');
      return;
    }

    setIsDrawing(true);
    setBatchWinners([]);
    setDisplayName('');

    const remainingBeforeDraw = getRemaining(currentPrize);

    // 優化：直接使用本地資料，不重新載入（節省 15-20 秒）
    // 資料已在頁面載入時下載到本地，直接使用即可
    const latestParticipants = getEligibleParticipants(currentPrize, participants);
    const latestWinners = winners;

    // 排除已中獎者（僅保留不重複抽獎）
    const excludedIds = new Set([
      ...latestWinners
        .filter(w => w.prize_id === currentPrize.prize_id)
        .map(w => String(w.participant_id)),
      ...participants
        .filter(p => p.won === true || p.won === 'TRUE')
        .map(p => String(p.id))
    ]);
    
    // 抽選（使用最新載入的資料）
    const selected = batchDraw(latestParticipants, excludedIds, batchCount, false);

    if (selected.length === 0) {
      alert('沒有可抽選的參與者！(公司限制可能導致無可抽名單)');
      setIsDrawing(false);
      return;
    }

    // 臨時加碼：每次按「開始抽獎」生成一個後綴，整批共用
    const suffix = isUnlimitedQuantity ? getNextTempPrizeSuffix(currentPrize.prize_id) : null;
    const prizeTitleWithSuffix = isUnlimitedQuantity ? getPrizeTitleWithSuffix(currentPrize, suffix) : currentPrize.prize_title;

    // 立即準備批次資料並更新本地 state（先顯示結果）
    const winnersList = selected.map(winner => ({
      prize_id: currentPrize.prize_id,
      prize_title: prizeTitleWithSuffix,
      prize_name: currentPrize.prize_name,
      participant_company: winner.company || '',
      participant_id: winner.id,
      participant_name: winner.name,
      admin: 'system',
      claimed: false
    }));
    
    const now = new Date().toISOString();
    const newWinners = winnersList.map(winner => ({
      timestamp: now,
      ...winner
    }));
    
    // 立即更新本地 state（先顯示結果）
    addWinners(newWinners);
    const winnerIds = new Set(selected.map(w => String(w.id)));
    setParticipants(prev => prev.map(p => 
      winnerIds.has(String(p.id))
        ? { ...p, won: true }
        : p
    ));

    // 立即顯示結果
    setBatchWinners(selected);
    setCurrentPage(0); // 重置到第一頁
    playWinSound();
    const confettiCleanup = triggerConfetti();
    if (confettiCleanup) {
      // 保存清理函數，以便在需要時清理
      setTimeout(() => {
        if (confettiCleanup) confettiCleanup();
      }, 3000);
    }

    // 進入抽獎結果畫面時，禁用重抽按鈕 5 秒
    setIsRedrawDisabled(true);
    setTimeout(() => setIsRedrawDisabled(false), 5000);

    setIsDrawing(false);

    // 添加到待上傳隊列（不自動上傳，需在管理後台手動上傳）
    addPendingWinners(newWinners);
    console.log(`📌 ${newWinners.length} 條中獎記錄已添加到待上傳隊列，請在管理後台手動上傳`);
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

  // 快速添加臨時加碼獎項
  const handleAddTempPrize = () => {
    if (!tempPrizeForm.prize_title.trim() || !tempPrizeForm.prize_name.trim()) {
      alert('請填寫獎項標題和獎品名稱');
      return;
    }

    const quantity = parseInt(tempPrizeForm.quantity) || 1;
    if (quantity < 1) {
      alert('數量必須大於 0');
      return;
    }

    const newPrizeData = {
      prize_title: tempPrizeForm.prize_title.trim(),
      prize_name: tempPrizeForm.prize_name.trim(),
      company: tempPrizeForm.company || 'ALL',
      mode: tempPrizeForm.mode || 'batch', // 使用表單選擇的模式
      quantity: quantity, // 使用輸入的數量
      order: sortedPrizes.length > 0 ? Math.max(...sortedPrizes.map(p => p.order || 0)) + 1 : 1
    };

    const createdPrize = addPrize(newPrizeData);
    
    // 使用 setTimeout 確保 state 更新完成後再設置 currentPrize
    setTimeout(() => {
      setCurrentPrize(createdPrize);
    }, 0);
    
    setShowTempPrizeModal(false);
    
    // 流水號 +1，並更新表單的下一個流水號
    const nextCounter = tempPrizeCounter + 1;
    setTempPrizeCounter(nextCounter);
    setTempPrizeForm({ 
      prize_title: '臨時加碼', 
      prize_name: String(nextCounter).padStart(3, '0'), 
      company: 'ALL', 
      mode: 'batch',
      quantity: 1
    });
    
    alert('臨時加碼獎項已添加！請在管理後台上傳。');
  };

  // 打開臨時加碼彈窗時，自動填入標題和流水號
  const handleOpenTempPrizeModal = () => {
    setTempPrizeForm({
      prize_title: '臨時加碼',
      prize_name: String(tempPrizeCounter).padStart(3, '0'),
      company: 'ALL',
      mode: 'batch',
      quantity: 1
    });
    setShowTempPrizeModal(true);
  };

  // 快速添加參加獎
  const handleAddParticipationPrize = () => {
    // 計算未中獎的人數
    const notWonCount = participants.filter(p => {
      const won = p.won === true || p.won === 'TRUE';
      return !won;
    }).length;

    const newPrizeData = {
      prize_title: '參加獎',
      prize_name: '參加獎',
      company: 'ALL',
      mode: 'batch', // 使用批次模式
      quantity: notWonCount, // 自動設置為未中獎人數
      order: sortedPrizes.length > 0 ? Math.max(...sortedPrizes.map(p => p.order || 0)) + 1 : 1
    };

    const createdPrize = addPrize(newPrizeData);
    
    // 使用 setTimeout 確保 state 更新完成後再設置 currentPrize
    setTimeout(() => {
      setCurrentPrize(createdPrize);
    }, 0);
    
    alert(`參加獎已添加！共 ${notWonCount} 名未中獎者。請在管理後台上傳。`);
  };

  return (
    <>
      <style>{`
        @keyframes rainbowText {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes flipIn {
          from {
            transform: perspective(1000px) rotateY(90deg);
            opacity: 0;
          }
          to {
            transform: perspective(1000px) rotateY(0deg);
            opacity: 1;
          }
        }
        
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        
        @keyframes winnerScale {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          50% { transform: scale(1.25); }
          70% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        
        .spinning-name {
          background: linear-gradient(
            90deg,
            #ff0080, #ff8c00, #ffd700, #00ff00, 
            #00bfff, #0080ff, #8000ff, #ff0080
          );
          background-size: 400% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rainbowText 2s ease-in-out infinite, 
                     flipIn 0.3s ease-out,
                     pulse-scale 1.2s ease-in-out infinite;
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
        }
        
        .winner-name {
          animation: winnerScale 1s ease-out;
        }
      `}</style>
      <div className={`h-screen ${isFullscreen ? 'p-0' : 'p-6'} flex flex-col overflow-hidden relative`} style={{ backgroundColor: '#0F0F15' }}>
        {/* 背景化學式動畫 */}
        <canvas
          ref={backgroundCanvasRef}
          className="absolute inset-0 pointer-events-none z-0"
        style={{ opacity: 0.3 }}
      />
      <div className="flex-1 flex flex-col h-full w-full relative z-10">
        {/* 載入中提示 */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-12 max-w-4xl w-full text-center border border-gray-700">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
                </div>
                <div className="text-3xl font-bold text-white">載入中...</div>
                <div className="text-xl text-gray-300">正在載入最新資料，請稍候</div>
              </div>
            </div>
          </div>
        )}
        
        {/* 資料未載入提示 */}
        {!isLoading && !dataLoaded && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-12 max-w-4xl w-full text-center border border-gray-700">
              <div className="space-y-6">
                <div className="text-5xl mb-4">⚠️</div>
                <div className="text-3xl font-bold text-white">資料尚未載入</div>
                <div className="text-xl text-gray-300">
                  請先在管理後台頁面下載資料後，才能進行抽獎。
                </div>
                <div className="text-lg text-gray-400 mt-4">
                  請前往管理後台，點擊「下載所有資料」按鈕。
                </div>
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && dataLoaded && !isDrawing && !currentWinner && batchWinners.length === 0 && !showResultScreen && (
          <div className="flex-1 flex flex-col h-full w-full">
            {noPrizes ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white text-xl">尚未設定任何獎項</div>
              </div>
            ) : !currentPrize ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white text-xl">所有獎項皆已抽完 🎉</div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full w-full relative">
                {/* 標題區域 - 占10% */}
                <div className="flex-[0.1] flex items-center justify-center min-h-0 pb-2 relative z-[100]">
                  {!isFullscreen && (
                    <div className="w-full px-6 relative z-[100]">
                      <div className="flex justify-between items-center relative z-[100]">
                        <div className="flex items-center gap-4">
                          <img 
                            src="/NanpaoLogo_01.png" 
                            alt="南寶樹酯化學工廠股份有限公司" 
                            className="h-12 object-contain"
                          />
                          <h1 className="text-4xl font-bold text-white">南寶樹脂尾牙抽獎</h1>
                        </div>
                        <div 
                          className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-[100] pointer-events-auto"
                          style={{ transform: 'translateY(-50%)' }}
                        >
                          <button
                            onClick={loadAllData}
                            disabled={isLoading}
                            className={`px-2 py-2 text-white font-bold rounded-l-lg transition-all duration-300 text-sm relative z-[100] pointer-events-auto overflow-hidden whitespace-nowrap group ${
                              isLoading 
                                ? 'bg-gray-700 cursor-not-allowed border border-gray-600' 
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-blue-500/50'
                            }`}
                            style={{ 
                              position: 'relative', 
                              zIndex: 100,
                              width: '2rem',
                            }}
                            onMouseEnter={(e) => {
                              if (!isLoading) {
                                e.currentTarget.style.width = 'auto';
                                e.currentTarget.style.paddingRight = '1rem';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isLoading) {
                                e.currentTarget.style.width = '2rem';
                                e.currentTarget.style.paddingRight = '0.5rem';
                              }
                            }}
                            title={isLoading ? '載入中...' : '重新載入最新資料（如需要）'}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              {isLoading ? '載入中...' : '重新載入'}
                            </span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-0 opacity-100 transition-opacity duration-300">
                              ↻
                            </span>
                          </button>
                          <button
                            onClick={handleOpenTempPrizeModal}
                            className="px-2 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-l-lg transition-all duration-300 relative z-[100] border border-green-500/50 shadow-lg pointer-events-auto overflow-hidden whitespace-nowrap group"
                            style={{ 
                              position: 'relative', 
                              zIndex: 100,
                              width: '2rem',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.width = 'auto';
                              e.currentTarget.style.paddingRight = '1rem';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.width = '2rem';
                              e.currentTarget.style.paddingRight = '0.5rem';
                            }}
                            title="臨時加碼（10秒快速添加）"
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              臨時加碼
                            </span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-0 opacity-100 transition-opacity duration-300">
                              ⚡
                            </span>
                          </button>
                          <button
                            onClick={handleAddParticipationPrize}
                            className="px-2 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold rounded-l-lg transition-all duration-300 relative z-[100] border border-purple-500/50 shadow-lg pointer-events-auto overflow-hidden whitespace-nowrap group"
                            style={{ 
                              position: 'relative', 
                              zIndex: 100,
                              width: '2rem',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.width = 'auto';
                              e.currentTarget.style.paddingRight = '1rem';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.width = '2rem';
                              e.currentTarget.style.paddingRight = '0.5rem';
                            }}
                            title="添加參加獎（未中獎的人人有獎）"
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              參加獎
                            </span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-0 opacity-100 transition-opacity duration-300">
                              🎁
                            </span>
                          </button>
                          <button
                            onClick={handleFullscreen}
                            className="px-2 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold rounded-l-lg transition-all duration-300 relative z-[100] border border-yellow-500/50 shadow-lg pointer-events-auto overflow-hidden whitespace-nowrap group"
                            style={{ 
                              position: 'relative', 
                              zIndex: 100,
                              width: '2rem',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.width = 'auto';
                              e.currentTarget.style.paddingRight = '1.5rem';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.width = '2rem';
                              e.currentTarget.style.paddingRight = '0.5rem';
                            }}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              大螢幕模式
                            </span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-0 opacity-100 transition-opacity duration-300">
                              ⛶
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 獎項資訊 - 占70% */}
                <div className="flex-[0.7] flex items-center justify-center min-h-0 px-4 pt-2 pb-4">
                  <div 
                    className="w-full h-full flex items-center justify-center rounded-xl mx-4"
                    style={{
                      background: 'linear-gradient(to right, #5D4037, #6D4C41)',
                      border: '3px solid #FBC02D',
                      boxShadow: '0 0 40px rgba(251, 192, 45, 0.8), 0 0 80px rgba(251, 192, 45, 0.5), 0 0 120px rgba(251, 192, 45, 0.3), 0 8px 32px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-between px-8">
                      <button
                        onClick={goToPreviousPrize}
                        className="w-16 h-16 flex items-center justify-center rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        style={{
                          backgroundColor: '#FFFFFF30',
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 255, 255, 0.2)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF50';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 16px rgba(255, 255, 255, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF30';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 255, 255, 0.2)';
                          }
                        }}
                        disabled={sortedPrizes.length <= 1}
                        aria-label="上一個獎項"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="text-center flex-1 px-8">
                        <div 
                          className="text-6xl md:text-8xl font-bold break-words"
                          style={{
                            color: '#FBC02D',
                            textShadow: '0 4px 16px rgba(0, 0, 0, 0.8), 0 2px 8px rgba(251, 192, 45, 0.6), 0 0 24px rgba(251, 192, 45, 0.4), 0 0 40px rgba(251, 192, 45, 0.2)',
                            filter: 'drop-shadow(0 0 8px rgba(251, 192, 45, 0.5))',
                          }}
                        >
                          {currentPrize.prize_title} - {currentPrize.prize_name}
                        </div>
                        <div 
                          className="text-3xl md:text-4xl mt-4 font-semibold" 
                          style={{ 
                            color: '#FBC02D',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.7), 0 0 16px rgba(251, 192, 45, 0.5)',
                            filter: 'drop-shadow(0 0 4px rgba(251, 192, 45, 0.4))',
                          }}
                        >
                          {Number(currentPrize.quantity) === 0 ? '無上限' : `${currentPrize.quantity} 名`}
                        </div>
                        {!isUnlimitedQuantity && currentPrizeRemaining === 0 && (
                          <div className="text-2xl text-red-400 mt-4 font-semibold">
                            ⚠️ 此獎項已抽完，請切換其他獎項
                          </div>
                        )}
                      </div>
                      <button
                        onClick={goToNextPrize}
                        className="w-16 h-16 flex items-center justify-center rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        style={{
                          backgroundColor: '#FFFFFF30',
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 255, 255, 0.2)',
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF50';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 16px rgba(255, 255, 255, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF30';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 255, 255, 0.2)';
                          }
                        }}
                        disabled={sortedPrizes.length <= 1}
                        aria-label="下一個獎項"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 抽獎按鈕 - 占20% */}
                <div className="flex-[0.2] flex flex-col items-center justify-center min-h-0 px-4 pb-4 pt-2">
                  <button
                    onClick={isBatchMode ? handleBatchDraw : handleSingleDraw}
                    disabled={!canDraw}
                    className={`w-full max-w-2xl flex-1 text-white font-bold text-4xl md:text-5xl rounded-lg transition-all duration-200 ${
                      canDraw
                        ? ''
                        : 'bg-gray-700 cursor-not-allowed border border-gray-600'
                    }`}
                    style={canDraw ? {
                      background: 'linear-gradient(to bottom, #33D9FF, #00C3FF)',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 0 40px rgba(0, 195, 255, 0.9), 0 0 80px rgba(0, 195, 255, 0.5), 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    } : {}}
                    onMouseEnter={(e) => {
                      if (canDraw) {
                        e.currentTarget.style.background = 'linear-gradient(to bottom, #4DE3FF, #1AD3FF)';
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 195, 255, 1), 0 0 100px rgba(0, 195, 255, 0.6), 0 10px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canDraw) {
                        e.currentTarget.style.background = 'linear-gradient(to bottom, #33D9FF, #00C3FF)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 195, 255, 0.9), 0 0 80px rgba(0, 195, 255, 0.5), 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                      }
                    }}
                    onMouseDown={(e) => {
                      if (canDraw) {
                        e.currentTarget.style.transform = 'scale(0.98)';
                        e.currentTarget.style.boxShadow = 'inset 0 4px 10px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 195, 255, 0.7)';
                      }
                    }}
                    onMouseUp={(e) => {
                      if (canDraw) {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 195, 255, 1), 0 0 100px rgba(0, 195, 255, 0.6), 0 10px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
                      }
                    }}
                  >
                    {canDraw ? '🎉 開始抽獎 🎉' : (!isUnlimitedQuantity && currentPrizeRemaining === 0) ? '本獎項已抽完' : '請選擇獎項'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 抽獎動畫顯示區域 */}
        {!isLoading && (isDrawing || currentWinner || batchWinners.length > 0 || showResultScreen) && (
          <div className="flex-1 flex items-center justify-center w-full h-full relative">
            {/* 中獎結果背景化學式動畫 - 持續運行 */}
            <canvas
              ref={resultCanvasRef}
              className="absolute inset-0 pointer-events-none z-0 rounded-2xl"
              style={{ opacity: 0.5, display: 'block' }}
            />
            <div className={`rounded-2xl text-center border shadow-2xl relative z-10 ${
              batchWinners.length > 0 && !isDrawing 
                ? 'w-[90%] h-[90%] p-8 bg-gray-900/30 backdrop-blur-sm border-gray-600/50' 
                : 'max-w-4xl w-full p-12 bg-gray-800/80 backdrop-blur-lg border-gray-700'
            }`}>
            {showResultScreen && isUnlimitedQuantity && !isDrawing && !currentWinner && batchWinners.length === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-4xl font-bold drop-shadow-lg" style={{ color: '#FBC02D' }}>
                  {currentPrize?.prize_title}
                </div>
                <div className="text-2xl text-gray-300">
                  {currentPrize?.prize_name}
                </div>
                {/* 沿用原本結果畫面的「重抽」操作區塊（版型不變，只是這裡也要顯示） */}
                <div className="mt-8 flex flex-col items-center gap-6 w-full">
                  <div className="flex items-center gap-3 bg-gray-800/40 backdrop-blur-sm px-5 py-3 rounded-lg border border-gray-600/40">
                    <label className="text-white text-sm font-semibold whitespace-nowrap opacity-80">
                      重抽次數:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={redrawCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setRedrawCount(Math.max(1, Math.min(100, val)));
                      }}
                      className="w-16 px-2 py-1.5 text-center border border-gray-500 rounded-md bg-white text-gray-800 font-semibold text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <button
                      onClick={() => {
                        if (isRedrawDisabled) return;
                        // 按下重抽按鈕時立即禁用（5秒計時器會在抽獎完成後設置）
                        setIsRedrawDisabled(true);
                        drawTempPrizeFromResult();
                      }}
                      disabled={isDrawing || isRedrawDisabled}
                      className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold text-base rounded-lg transition shadow-md border border-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔄 重抽
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isDrawing && !isBatchMode && (
              <div className="space-y-8">
                <div className="text-4xl font-bold mb-4 drop-shadow-lg" style={{ color: '#FBC02D' }}>
                  {currentPrize?.prize_title}
                </div>
                <div className="text-2xl text-gray-300 mb-4">
                  {currentPrize?.prize_name}
                </div>
                <div 
                  key={displayName}
                  className="text-9xl font-bold mb-4 min-h-[200px] flex items-center justify-center spinning-name"
                  style={{
                    fontFamily: 'monospace',
                    letterSpacing: '0.1em'
                  }}
                >
                  {displayName || '???'}
                </div>
                <div className="text-xl text-cyan-400 animate-pulse">
                  ⚡ 隨機抽選中...
                </div>
              </div>
            )}

            {currentWinner && !isDrawing && (
              <div className="space-y-8 animate-fade-in">
                {/* 部門 */}
                <div className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 16px rgba(255, 255, 255, 0.3)' }}>
                  部門: {currentWinner.department}
                </div>
                {/* 工號 */}
                <div className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 16px rgba(255, 255, 255, 0.3)' }}>
                  工號: {currentWinner.id}
                </div>
                {/* 根據 checked_in 狀態顯示不同顏色 */}
                {currentWinner.checked_in === 2 || currentWinner.checked_in === 9 ? (
                  <>
                    <div
                      className={`text-7xl font-bold mb-6 drop-shadow-lg rounded-lg p-8 winner-name ${isSinglePrize ? 'gold-border-pulse' : ''}`}
                      style={{
                        color: '#FFFFFF',
                        border: isSinglePrize 
                          ? `4px solid ${getGoldBorderColor(goldBorderProgress)}`
                          : '4px solid rgba(255, 255, 255, 0.25)',
                        background: isSinglePrize
                          ? `linear-gradient(135deg, rgba(${Math.round(26 + (251 - 26) * goldBorderProgress)}, ${Math.round(26 + (192 - 26) * goldBorderProgress)}, ${Math.round(26 + (45 - 26) * goldBorderProgress)}, ${0.1 + goldBorderProgress * 0.15}), rgba(${Math.round(26 + (255 - 26) * goldBorderProgress)}, ${Math.round(215 - 26) * goldBorderProgress}, ${Math.round(0 - 26) * goldBorderProgress}, ${0.05 + goldBorderProgress * 0.1}))`
                          : 'linear-gradient(135deg, rgba(13, 25, 45, 0.8), rgba(20, 40, 70, 0.6))',
                        boxShadow: `
                          0 0 35px rgba(59, 130, 246, 0.4),
                          0 8px 32px rgba(0, 0, 0, 0.6)
                        `,
                        textShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {formatWinnerName(currentWinner.name, currentWinner.company)}
                    </div>
                    <div
                      className="text-2xl font-bold text-blue-200 mb-4 rounded-lg p-4 border"
                      style={{
                        border: '3px solid rgba(59, 130, 246, 0.5)',
                        background: 'linear-gradient(135deg, rgba(29, 78, 216, 0.55), rgba(37, 99, 235, 0.45))',
                        boxShadow: `
                          0 0 25px rgba(59, 130, 246, 0.4),
                          inset 0 0 20px rgba(59, 130, 246, 0.25)
                        `
                      }}
                    >
                      ⚠️ 不需上台領獎
                      {currentWinner.checked_in === 2 ? '（公差無法到場）' : '（因公未到）'}
                    </div>
                  </>
                ) : (
                  <div 
                    className={`text-7xl font-bold mb-6 rounded-lg p-8 winner-name ${isSinglePrize ? 'gold-border-pulse' : ''}`}
                    style={{
                      color: '#FFFFFF',
                      background: isSinglePrize 
                        ? `linear-gradient(135deg, rgba(${Math.round(26 + (251 - 26) * goldBorderProgress)}, ${Math.round(26 + (192 - 26) * goldBorderProgress)}, ${Math.round(26 + (45 - 26) * goldBorderProgress)}, ${0.1 + goldBorderProgress * 0.15}), rgba(${Math.round(26 + (255 - 26) * goldBorderProgress)}, ${Math.round(215 - 26) * goldBorderProgress}, ${Math.round(0 - 26) * goldBorderProgress}, ${0.05 + goldBorderProgress * 0.1})}`
                        : 'linear-gradient(135deg, rgba(251, 192, 45, 0.18), rgba(255, 215, 0, 0.12))',
                      border: isSinglePrize 
                        ? `4px solid ${getGoldBorderColor(goldBorderProgress)}`
                        : '4px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: `
                        0 0 40px rgba(251, 192, 45, 0.8),
                        0 0 80px rgba(251, 192, 45, 0.5),
                        inset 0 0 25px rgba(251, 192, 45, 0.2),
                        0 8px 32px rgba(0, 0, 0, 0.6)
                      `,
                      textShadow: '0 4px 16px rgba(0, 0, 0, 0.8)',
                      filter: 'drop-shadow(0 0 12px rgba(251, 192, 45, 0.6))',
                    }}
                  >
                    {formatWinnerName(currentWinner.name, currentWinner.company)}
                  </div>
                )}
                <div className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 16px rgba(255, 255, 255, 0.3)' }}>
                  {currentPrize?.prize_title}
                </div>
                <div className="text-2xl font-semibold mb-8" style={{ color: '#F0F0F0', textShadow: '0 2px 6px rgba(0, 0, 0, 0.7), 0 0 12px rgba(255, 255, 255, 0.2)' }}>
                  {currentPrize?.prize_name}
                </div>
                <div className="mt-8 flex flex-row items-center justify-center gap-6 w-full flex-wrap">
                  {/* 主要操作：继续抽奖 */}
                  <button
                    onClick={() => {
                      setCurrentWinner(null);
                      setDisplayName('');
                      setRedrawCount(1);
                      setShowResultScreen(false);
                    }}
                    className="px-16 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-3xl rounded-xl transition shadow-2xl border-2 border-blue-400/50 hover:scale-105"
                  >
                    繼續抽獎
                  </button>
                  
                  {/* 次要操作：重抽 */}
                  <div className="flex items-center gap-3 bg-gray-800/40 backdrop-blur-sm px-5 py-3 rounded-lg border border-gray-600/40">
                    <label className="text-white text-sm font-semibold whitespace-nowrap opacity-80">
                      重抽次數:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={redrawCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setRedrawCount(Math.max(1, Math.min(10, val)));
                      }}
                      className="w-16 px-2 py-1.5 text-center border border-gray-500 rounded-md bg-white text-gray-800 font-semibold text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <button
                      onClick={async () => {
                        if (!currentWinner || isDrawing || isRedrawDisabled) return;
                        
                        // 按下重抽按鈕時立即禁用
                        setIsRedrawDisabled(true);
                        
                        const count = Math.max(1, Math.min(10, redrawCount));
                        
                        // 清除當前顯示，保留中獎記錄
                        setCurrentWinner(null);
                        setDisplayName('');
                        
                        try {
                          // 直接重新抽選指定次數（不移除當前中獎記錄）
                          const suffix = isUnlimitedQuantity && currentPrize ? getNextTempPrizeSuffix(currentPrize.prize_id) : null;
                          for (let i = 0; i < count; i++) {
                            await handleSingleDraw(suffix ? { suffix } : {});
                            // 如果不是最後一次，等待結果顯示後再繼續
                            if (i < count - 1) {
                              await new Promise(resolve => setTimeout(resolve, 4000));
                            }
                          }
                        } catch (error) {
                          console.error('重抽失敗:', error);
                          alert('重抽失敗: ' + error.message);
                          setIsDrawing(false);
                          // 發生錯誤時也要設置 5 秒禁用
                          setTimeout(() => setIsRedrawDisabled(false), 5000);
                        }
                      }}
                      disabled={isDrawing || isRedrawDisabled}
                      className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold text-base rounded-lg transition shadow-md border border-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🔄 重抽
                    </button>
                  </div>
                </div>
              </div>
            )}

            {batchWinners.length > 0 && !isDrawing && (() => {
              const itemsPerPage = 4;
              const totalPages = Math.ceil(batchWinners.length / itemsPerPage);
              const startIndex = currentPage * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const currentPageWinners = batchWinners.slice(startIndex, endIndex);
              
              const goToNextPage = () => {
                if (currentPage < totalPages - 1) {
                  setCurrentPage(currentPage + 1);
                }
              };
              
              const goToPreviousPage = () => {
                if (currentPage > 0) {
                  setCurrentPage(currentPage - 1);
                }
              };
              
              return (
                <div className="h-full flex flex-col space-y-4 animate-fade-in">
                  <div className="text-3xl text-gray-200 mb-3 flex-shrink-0">
                    {currentPrize?.prize_title} - {currentPrize?.prize_name}
                  </div>
                  
                  {/* 中獎者列表 - 帶有分頁控制 */}
                  <div className="flex items-center justify-between gap-6 flex-1 min-h-0 overflow-hidden">
                    <button
                      onClick={goToPreviousPage}
                      className="w-20 h-20 flex items-center justify-center bg-gray-800/60 hover:bg-gray-700/80 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 border border-gray-600/50"
                      disabled={currentPage === 0 || totalPages <= 1}
                      aria-label="上一頁"
                    >
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
                      <div className="flex flex-wrap justify-center gap-4 content-start overflow-y-auto h-full px-4 py-2">
                        {currentPageWinners.map((winner, idx) => {
                          const actualIndex = startIndex + idx;
                          // 根據 checked_in 狀態決定樣式
                          const isAbsent = winner.checked_in === 2 || winner.checked_in === 9;
                          return (
                            <div
                              key={actualIndex}
                              className={`rounded-lg border shadow-lg ${
                                isAbsent 
                                  ? 'bg-gray-700/60 border-gray-600/50 text-white' 
                                  : 'bg-blue-900/60 border-blue-500/60 text-blue-200'
                              }`}
                              style={{ 
                                width: 'calc(50% - 16px)', 
                                minWidth: '380px', 
                                maxWidth: '600px',
                                height: 'auto',
                                minHeight: '160px',
                                maxHeight: '240px'
                              }}
                            >
                              <div className="flex items-center h-full">
                                {/* 左半邊：部門工號 */}
                                <div className="w-1/3 flex flex-col justify-center items-center px-3 py-4 border-r border-gray-500/40">
                                  <div className="text-base text-gray-300 mb-1 text-center">部門</div>
                                  <div className="text-lg font-semibold text-blue-200 mb-3 text-center break-words max-w-full">{winner.department}</div>
                                  <div className="text-base text-gray-300 mb-1 text-center">工號</div>
                                  <div className="text-lg font-semibold text-blue-200 text-center">{winner.id}</div>
                                </div>
                                {/* 右半邊：姓名 */}
                                <div className="flex-1 flex flex-col justify-center items-center px-3 py-3 overflow-hidden">
                                  <div className="font-black drop-shadow-lg text-center break-words w-full" style={{
                                    color: '#FFFFFF',
                                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                                    lineHeight: '1.2',
                                    textShadow: '0 4px 12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.3)',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    maxHeight: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {formatWinnerName(winner.name, winner.company)}
                                  </div>
                                  {isAbsent && (
                                    <div className="text-sm font-bold text-blue-200 mt-1 text-center">
                                      ⚠️ 不需上台領獎
                                      {winner.checked_in === 2 ? '（公差無法到場）' : '（因公未到）'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div className="text-center text-gray-400 mt-4 mb-3 text-lg flex-shrink-0">
                          第 {currentPage + 1} / {totalPages} 頁
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={goToNextPage}
                      className="w-20 h-20 flex items-center justify-center bg-gray-800/60 hover:bg-gray-700/80 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 border border-gray-600/50"
                      disabled={currentPage >= totalPages - 1 || totalPages <= 1}
                      aria-label="下一頁"
                    >
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mt-2 flex flex-row items-center justify-center gap-5 w-full flex-shrink-0 flex-wrap">
                    {/* 主要操作：继续抽奖 */}
                    <button
                      onClick={() => {
                        setBatchWinners([]);
                        setCurrentPage(0);
                        setRedrawCount(1);
                        setShowResultScreen(false);
                      }}
                      className="px-20 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-3xl rounded-xl transition shadow-2xl border-2 border-blue-400/50 hover:scale-105"
                    >
                      繼續抽獎
                    </button>
                    
                    {/* 次要操作：重抽 */}
                    <div className="flex items-center gap-3 bg-gray-800/40 backdrop-blur-sm px-5 py-3 rounded-lg border border-gray-600/40">
                      <label className="text-white text-base font-semibold whitespace-nowrap opacity-80">
                        重抽次數:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={redrawCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setRedrawCount(Math.max(1, Math.min(10, val)));
                        }}
                        className="w-16 px-2 py-2 text-center border border-gray-500 rounded-md bg-white text-gray-800 font-semibold text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                      <button
                        onClick={async () => {
                          if (batchWinners.length === 0 || isDrawing || !currentPrize || isRedrawDisabled) return;
                          
                          // 按下重抽按鈕時立即禁用
                          setIsRedrawDisabled(true);
                          
                          setIsDrawing(true);
                          setBatchWinners([]);
                          setCurrentPage(0);
                          
                          try {
                            // 計算重抽數量 = batchCount * redrawCount
                            const totalCount = batchCount * Math.max(1, Math.min(10, redrawCount));
                            
                            // 使用本地資料進行抽選
                            const latestParticipants = getEligibleParticipants(currentPrize, participants);
                            const latestWinners = winners;
                            
                            // 排除已中獎者
                            const excludedIds = new Set([
                              ...latestWinners
                                .filter(w => w.prize_id === currentPrize.prize_id)
                                .map(w => String(w.participant_id)),
                              ...participants
                                .filter(p => p.won === true || p.won === 'TRUE')
                                .map(p => String(p.id))
                            ]);
                            
                            // 抽選
                            const selected = batchDraw(latestParticipants, excludedIds, totalCount, false);
                            
                            if (selected.length === 0) {
                              alert('沒有可抽選的參與者！');
                              setIsDrawing(false);
                              return;
                            }
                            
                            const suffix = isUnlimitedQuantity ? getNextTempPrizeSuffix(currentPrize.prize_id) : null;
                            const prizeTitleWithSuffix = isUnlimitedQuantity ? getPrizeTitleWithSuffix(currentPrize, suffix) : currentPrize.prize_title;

                            // 準備批次資料並更新本地 state
                            const winnersList = selected.map(winner => ({
                              prize_id: currentPrize.prize_id,
                              prize_title: prizeTitleWithSuffix,
                              prize_name: currentPrize.prize_name,
                              participant_company: winner.company || '',
                              participant_id: winner.id,
                              participant_name: winner.name,
                              admin: 'system',
                              claimed: false
                            }));
                            
                            const now = new Date().toISOString();
                            const newWinners = winnersList.map(winner => ({
                              timestamp: now,
                              ...winner
                            }));
                            
                            // 更新本地 state
                            addWinners(newWinners);
                            const winnerIds = new Set(selected.map(w => String(w.id)));
                            setParticipants(prev => prev.map(p => 
                              winnerIds.has(String(p.id))
                                ? { ...p, won: true }
                                : p
                            ));
                            
                            // 顯示結果
                            setBatchWinners(selected);
                            setCurrentPage(0);
                            playWinSound();
                            const confettiCleanup = triggerConfetti();
                            if (confettiCleanup) {
                              setTimeout(() => {
                                if (confettiCleanup) confettiCleanup();
                              }, 3000);
                            }
                            
                            // 進入抽獎結果畫面時，禁用重抽按鈕 5 秒
                            setIsRedrawDisabled(true);
                            setTimeout(() => setIsRedrawDisabled(false), 5000);
                            
                            setIsDrawing(false);
                            
                            // 添加到待上傳隊列（不自動上傳，需在管理後台手動上傳）
                            addPendingWinners(newWinners);
                            console.log(`📌 ${newWinners.length} 條重抽記錄已添加到待上傳隊列，請在管理後台手動上傳`);
                          } catch (error) {
                            console.error('重抽失敗:', error);
                            alert('重抽失敗: ' + error.message);
                            setIsDrawing(false);
                            // 發生錯誤時也要設置 5 秒禁用
                            setTimeout(() => setIsRedrawDisabled(false), 5000);
                          }
                        }}
                        disabled={isDrawing || isRedrawDisabled}
                        className="px-7 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold text-lg rounded-lg transition shadow-md border border-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🔄 重抽
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>
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

      {/* 臨時加碼彈窗 */}
      {showTempPrizeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-green-500/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">⚡ 臨時加碼</h2>
              <button
                onClick={() => {
                  setShowTempPrizeModal(false);
                  setTempPrizeForm({ prize_title: '', prize_name: '', company: 'ALL', mode: 'single' });
                }}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  獎項標題 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={tempPrizeForm.prize_title}
                  onChange={(e) => setTempPrizeForm({ ...tempPrizeForm, prize_title: e.target.value })}
                  placeholder="例如：特別獎"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 outline-none"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  獎品名稱 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={tempPrizeForm.prize_name}
                  onChange={(e) => setTempPrizeForm({ ...tempPrizeForm, prize_name: e.target.value })}
                  placeholder="例如：現金 5000 元"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  數量 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={tempPrizeForm.quantity}
                  onChange={(e) => setTempPrizeForm({ ...tempPrizeForm, quantity: e.target.value })}
                  placeholder="請輸入數量"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  公司限制（選填）
                </label>
                <input
                  type="text"
                  value={tempPrizeForm.company}
                  onChange={(e) => setTempPrizeForm({ ...tempPrizeForm, company: e.target.value })}
                  placeholder="ALL 表示不限公司"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 outline-none"
                />
                <p className="text-gray-400 text-xs mt-1">留空或輸入 ALL 表示所有公司都可抽</p>
              </div>
              
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  抽獎模式
                </label>
                <select
                  value={tempPrizeForm.mode}
                  onChange={(e) => setTempPrizeForm({ ...tempPrizeForm, mode: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 outline-none"
                >
                  <option value="batch">批次抽獎</option>
                  <option value="single">單次抽獎</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddTempPrize}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold text-lg rounded-lg transition shadow-lg"
              >
                ✅ 立即添加
              </button>
              <button
                onClick={() => {
                  setShowTempPrizeModal(false);
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
              >
                取消
              </button>
            </div>
            
            <div className="mt-4 text-center text-gray-400 text-sm">
              💡 提示：流水號會自動遞增，可隨時添加
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}


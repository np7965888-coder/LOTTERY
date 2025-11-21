import { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { getParticipants, getPrizes, getWinners, appendWinner, appendWinners } from '../services/api';
import { secureShuffleAndPick, batchDraw } from '../utils/lottery';

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
  const [participants, setParticipants] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [winners, setWinners] = useState([]);
  const [currentPrize, setCurrentPrize] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWinner, setCurrentWinner] = useState(null);
  const [batchCount, setBatchCount] = useState(5);
  const [batchWinners, setBatchWinners] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const animationCleanupRef = useRef(null);
  const backgroundCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const resultCanvasRef = useRef(null);
  const resultAnimationFrameRef = useRef(null);
  
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
  const prizeMode = currentPrize?.mode || 'single';
  const isBatchMode = prizeMode === 'batch';
  const maxBatchCount = currentPrize ? (isBatchMode ? Math.max(currentPrizeRemaining, 1) : 1) : 1;
  const canDraw = !!currentPrize && currentPrizeRemaining > 0 && !isDrawing && (!isBatchMode || batchCount > 0);
  const noPrizes = sortedPrizes.length === 0;

  useEffect(() => {
    loadData();
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
    if (remaining === 0) {
      setBatchCount(1);
    } else {
      // 自動設為該獎項的最大剩餘數量
      setBatchCount(remaining);
    }
  }, [currentPrize, winnersByPrize, isBatchMode]);

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
    if (!currentPrize || isDrawing || isBatchMode) return;

    setIsDrawing(true);
    setCurrentWinner(null);
    setDisplayName('');

    const remainingBeforeDraw = getRemaining(currentPrize);

    // 優化：直接使用本地資料，不重新載入（節省 15-20 秒）
    // 資料已在頁面載入時下載到本地，直接使用即可
    const latestParticipants = participants;
    const latestWinners = winners;

    // 排除已中獎者（僅保留不重複抽獎）
    const excludedIds = new Set([
      // 排除當前獎項的已中獎者
      ...latestWinners
        .filter(w => w.prize_id === currentPrize.prize_id)
        .map(w => String(w.participant_id)),
      // 排除所有 won === true 的參與者
      ...latestParticipants
        .filter(p => p.won === true || p.won === 'TRUE')
        .map(p => String(p.id))
    ]);
    
    // 取得符合資格的參與者（用於動畫顯示）
    const eligible = latestParticipants.filter(p => {
      const id = String(p.id);
      const isExcluded = excludedIds.has(id);
      return !isExcluded && (p.checked_in === 1 || p.checked_in === 2 || p.checked_in === 9);
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
    if (!currentPrize || isDrawing || !isBatchMode) return;

    setIsDrawing(true);
    setBatchWinners([]);
    setDisplayName('');

    const remainingBeforeDraw = getRemaining(currentPrize);

    // 優化：直接使用本地資料，不重新載入（節省 15-20 秒）
    // 資料已在頁面載入時下載到本地，直接使用即可
    const latestParticipants = participants;
    const latestWinners = winners;

    // 排除已中獎者（僅保留不重複抽獎）
    const excludedIds = new Set([
      ...latestWinners
        .filter(w => w.prize_id === currentPrize.prize_id)
        .map(w => String(w.participant_id)),
      ...latestParticipants
        .filter(p => p.won === true || p.won === 'TRUE')
        .map(p => String(p.id))
    ]);
    
    // 抽選（使用最新載入的資料）
    const selected = batchDraw(latestParticipants, excludedIds, batchCount, false);

    if (selected.length === 0) {
      alert('沒有可抽選的參與者！');
      setIsDrawing(false);
      return;
    }

    // 淡入動畫效果
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
        
        {!isLoading && !isDrawing && !currentWinner && batchWinners.length === 0 && (
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
                        <div className="flex gap-3 relative z-[100] pointer-events-auto">
                          <button
                            onClick={loadData}
                            disabled={isLoading}
                            className={`px-4 py-2 text-white font-bold rounded-lg transition text-sm relative z-[100] pointer-events-auto ${
                              isLoading 
                                ? 'bg-gray-700 cursor-not-allowed border border-gray-600' 
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-blue-500/50'
                            }`}
                            style={{ position: 'relative', zIndex: 100 }}
                            title={isLoading ? '載入中...' : '重新載入最新資料（如需要）'}
                          >
                            {isLoading ? '載入中...' : '重新載入'}
                          </button>
                          <button
                            onClick={handleFullscreen}
                            className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold rounded-lg transition relative z-[100] border border-yellow-500/50 shadow-lg pointer-events-auto"
                            style={{ position: 'relative', zIndex: 100 }}
                          >
                            大螢幕模式
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
                          {currentPrize.quantity} 名
                        </div>
                        {currentPrizeRemaining === 0 && (
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
                <div className="flex-[0.2] flex items-center justify-center min-h-0 px-4 pb-4 pt-2">
                  <button
                    onClick={isBatchMode ? handleBatchDraw : handleSingleDraw}
                    disabled={!canDraw}
                    className={`w-full max-w-2xl h-full text-white font-bold text-4xl md:text-5xl rounded-lg transition-all duration-200 ${
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
                    {canDraw ? '🎉 開始抽獎 🎉' : currentPrizeRemaining === 0 ? '本獎項已抽完' : '請選擇獎項'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 抽獎動畫顯示區域 */}
        {!isLoading && (isDrawing || currentWinner || batchWinners.length > 0) && (
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
            {isDrawing && !isBatchMode && (
              <div className="space-y-8">
                <div className="text-4xl font-bold mb-4 drop-shadow-lg" style={{ color: '#FBC02D' }}>
                  {currentPrize?.prize_title}
                </div>
                <div className="text-6xl font-bold text-white mb-4 min-h-[120px] flex items-center justify-center drop-shadow-lg">
                  {displayName || '抽選中...'}
                </div>
                <div className="text-2xl text-gray-300">
                  {currentPrize?.prize_name}
                </div>
              </div>
            )}

            {currentWinner && !isDrawing && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-5xl font-bold mb-4 animate-pulse drop-shadow-lg" style={{ color: '#FBC02D' }}>
                  恭喜中獎！
                </div>
                {/* 根據 checked_in 狀態顯示不同顏色 */}
                {currentWinner.checked_in === 2 || currentWinner.checked_in === 9 ? (
                  <>
                    <div className="text-7xl font-bold text-white mb-6 drop-shadow-lg">
                      {currentWinner.name}
                    </div>
                    <div className="text-2xl font-bold text-blue-200 mb-4 bg-blue-800/60 rounded-lg p-4 border border-blue-600/50">
                      ⚠️ 不需上台領獎
                      {currentWinner.checked_in === 2 ? '（公差無法到場）' : '（因公未到）'}
                    </div>
                  </>
                ) : (
                  <div 
                    className="text-7xl font-bold mb-6 rounded-lg p-8"
                    style={{
                      color: '#FBC02D',
                      background: !isBatchMode
                        ? 'linear-gradient(135deg, rgba(251, 192, 45, 0.25), rgba(255, 215, 0, 0.2))'
                        : 'linear-gradient(135deg, rgba(251, 192, 45, 0.15), rgba(255, 215, 0, 0.1))',
                      border: !isBatchMode ? '6px solid #FBC02D' : '4px solid #FBC02D',
                      boxShadow: !isBatchMode
                        ? `
                          0 0 60px rgba(251, 192, 45, 1),
                          0 0 100px rgba(251, 192, 45, 0.8),
                          0 0 140px rgba(251, 192, 45, 0.6),
                          0 0 180px rgba(251, 192, 45, 0.4),
                          inset 0 0 40px rgba(251, 192, 45, 0.3),
                          inset 0 0 80px rgba(255, 215, 0, 0.15),
                          0 8px 32px rgba(0, 0, 0, 0.8),
                          0 0 0 2px rgba(255, 215, 0, 0.5)
                        `
                        : `
                          0 0 40px rgba(251, 192, 45, 0.8),
                          0 0 80px rgba(251, 192, 45, 0.5),
                          0 0 120px rgba(251, 192, 45, 0.3),
                          0 0 160px rgba(251, 192, 45, 0.15),
                          inset 0 0 30px rgba(251, 192, 45, 0.2),
                          0 8px 32px rgba(0, 0, 0, 0.6)
                        `,
                      textShadow: !isBatchMode
                        ? '0 4px 20px rgba(0, 0, 0, 1), 0 0 30px rgba(251, 192, 45, 0.8), 0 0 50px rgba(251, 192, 45, 0.6), 0 0 70px rgba(255, 215, 0, 0.4)'
                        : '0 4px 16px rgba(0, 0, 0, 0.8), 0 0 24px rgba(251, 192, 45, 0.6), 0 0 40px rgba(251, 192, 45, 0.4)',
                      filter: !isBatchMode
                        ? 'drop-shadow(0 0 16px rgba(251, 192, 45, 0.8)) drop-shadow(0 0 24px rgba(255, 215, 0, 0.6))'
                        : 'drop-shadow(0 0 12px rgba(251, 192, 45, 0.6))',
                    }}
                  >
                    {currentWinner.name}
                  </div>
                )}
                <div className="text-3xl text-gray-200 mb-2">
                  {currentPrize?.prize_title}
                </div>
                <div className="text-2xl text-gray-300 mb-8">
                  {currentPrize?.prize_name}
                </div>
                <div className="text-xl text-gray-400 mb-2">
                  工號: {currentWinner.id} | 部門: {currentWinner.department}
                </div>
                <button
                  onClick={() => {
                    setCurrentWinner(null);
                    setDisplayName('');
                  }}
                  className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-lg transition shadow-lg border border-blue-500/50"
                >
                  繼續抽獎
                </button>
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
                  <div className="text-5xl font-bold mb-2 drop-shadow-lg flex-shrink-0" style={{ color: '#FBC02D' }}>
                    恭喜中獎！
                  </div>
                  <div className="text-3xl text-gray-200 mb-3 flex-shrink-0">
                    {currentPrize?.prize_title} - {currentPrize?.prize_name}
                  </div>
                  
                  {/* 中獎者列表 - 帶有分頁控制 */}
                  <div className="flex items-center justify-between gap-6 flex-1 min-h-0">
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
                    
                    <div className="flex-1 h-full flex flex-col min-h-0">
                      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                        {currentPageWinners.map((winner, idx) => {
                          const actualIndex = startIndex + idx;
                          // 根據 checked_in 狀態決定樣式
                          const isAbsent = winner.checked_in === 2 || winner.checked_in === 9;
                          return (
                            <div
                              key={actualIndex}
                              className={`rounded-lg p-6 border shadow-lg ${
                                isAbsent 
                                  ? 'bg-gray-700/60 border-gray-600/50 text-white' 
                                  : 'bg-blue-900/60 border-blue-500/60 text-blue-200'
                              }`}
                            >
                              <div className="text-4xl font-bold mb-3 drop-shadow">{winner.name}</div>
                              {isAbsent && (
                                <div className="text-base font-bold text-blue-200 mb-2">
                                  ⚠️ 不需上台領獎
                                  {winner.checked_in === 2 ? '（公差無法到場）' : '（因公未到）'}
                                </div>
                              )}
                              <div className="text-base text-gray-300">工號: {winner.id}</div>
                              <div className="text-base text-gray-300">部門: {winner.department}</div>
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
                  
                  <button
                    onClick={() => {
                      setBatchWinners([]);
                      setCurrentPage(0);
                    }}
                    className="mt-2 px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xl rounded-lg transition shadow-lg border border-blue-500/50 flex-shrink-0"
                  >
                    繼續抽獎
                  </button>
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
    </div>
  );
}


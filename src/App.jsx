import { useState, useEffect } from 'react';
import CheckInPanel from './components/CheckInPanel';
import AdminPanel from './components/AdminPanel';
import DrawScreen from './components/DrawScreen';

function App() {
  // 根據 URL 路徑判斷模式
  const getModeFromPath = () => {
    const path = window.location.pathname;
    if (path === '/checkin' || path.startsWith('/checkin/')) {
      return 'checkin-only'; // 報到專屬模式
    }
    if (path === '/admin' || path.startsWith('/admin/')) {
      return 'admin'; // 管理後台模式（顯示全部）
    }
    return 'default'; // 默認模式（顯示全部）
  };

  const [mode] = useState(getModeFromPath());
  const [currentPage, setCurrentPage] = useState(() => {
    // 根據模式設定初始頁面
    if (mode === 'checkin-only') return 'checkin';
    if (mode === 'admin') return 'admin';
    return 'checkin';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCheckInSuccess = () => {
    // 報到成功後的處理（可選）
  };

  const handleEnterFullscreen = () => {
    setIsFullscreen(true);
    setCurrentPage('draw');
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  // 監聽全螢幕狀態變化
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 監聽 URL 變化（防止在報到專屬模式下通過修改 URL 訪問其他頁面）
  useEffect(() => {
    if (mode === 'checkin-only') {
      const checkAndRedirect = () => {
        const currentPath = window.location.pathname;
        if (currentPath !== '/checkin' && !currentPath.startsWith('/checkin/')) {
          // 如果 URL 被修改，強制重定向回報到頁面
          window.history.replaceState(null, '', '/checkin');
        }
      };

      // 初始檢查
      checkAndRedirect();

      // 監聽瀏覽器歷史記錄變化（前進/後退按鈕）
      window.addEventListener('popstate', checkAndRedirect);

      // 定期檢查（防止通過其他方式修改 URL）
      const intervalId = setInterval(checkAndRedirect, 1000);

      return () => {
        window.removeEventListener('popstate', checkAndRedirect);
        clearInterval(intervalId);
      };
    }
  }, [mode]);

  // 報到專屬模式：強制只顯示報到頁面，不允許切換
  const effectivePage = mode === 'checkin-only' ? 'checkin' : currentPage;
  const showNavigation = !isFullscreen && mode !== 'checkin-only';

  // 安全的頁面切換函數（報到專屬模式下不允許切換）
  const safeSetCurrentPage = (page) => {
    if (mode !== 'checkin-only') {
      setCurrentPage(page);
    }
  };

  return (
    <div className="App">
      {showNavigation && (
        <nav className="bg-gray-800 text-white p-4">
          <div className="max-w-7xl mx-auto flex gap-4">
            <button
              onClick={() => safeSetCurrentPage('checkin')}
              className={`px-4 py-2 rounded ${
                effectivePage === 'checkin' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              報到
            </button>
            <button
              onClick={() => safeSetCurrentPage('draw')}
              className={`px-4 py-2 rounded ${
                effectivePage === 'draw' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              抽獎
            </button>
            <button
              onClick={() => safeSetCurrentPage('admin')}
              className={`px-4 py-2 rounded ${
                effectivePage === 'admin' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              管理後台
            </button>
          </div>
        </nav>
      )}

      {effectivePage === 'checkin' && (
        <CheckInPanel onCheckInSuccess={handleCheckInSuccess} />
      )}

      {effectivePage === 'draw' && (
        <DrawScreen
          isFullscreen={isFullscreen}
          onExitFullscreen={handleExitFullscreen}
        />
      )}

      {effectivePage === 'admin' && <AdminPanel />}
    </div>
  );
}

export default App;


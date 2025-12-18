import { useState, useEffect } from 'react';
import { DataProvider } from './contexts/DataContext';
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
  // 簡易密碼保護（非 checkin-only 模式）
  const PASSWORD_KEY = 'app_password_ok';
  const PASSCODE = 'Np74229304@';
  const [passInput, setPassInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthed, setIsAuthed] = useState(() => {
    try {
      return localStorage.getItem(PASSWORD_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);

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

  // 密碼提交
  const handleSubmitPassword = (e) => {
    e.preventDefault();
    if (passInput === PASSCODE) {
      setIsAuthed(true);
      setAuthError('');
      try {
        localStorage.setItem(PASSWORD_KEY, 'true');
      } catch {}
    } else {
      setAuthError('密碼錯誤');
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

  // 若為報到專屬模式，直接顯示報到頁
  if (mode === 'checkin-only') {
    return (
      <DataProvider>
        <CheckInPanel onCheckInSuccess={handleCheckInSuccess} />
      </DataProvider>
    );
  }

  // 其他頁面需密碼
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-4">
        <div className="bg-white/95 shadow-2xl rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">系統存取</h1>
          <form onSubmit={handleSubmitPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">請輸入密碼</label>
              <input
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Password"
                autoFocus
              />
            </div>
            {authError && (
              <div className="text-red-600 text-sm">{authError}</div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              確認
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <DataProvider>
      <div className="App">
        {showNavigation && (
        <div
          className="fixed top-0 left-0 right-0 z-30 flex justify-center"
          onMouseEnter={() => setIsNavHovered(true)}
          onMouseLeave={() => setIsNavHovered(false)}
        >
          <nav
            className={`bg-gray-800/95 text-white p-4 rounded-b-2xl shadow-lg transition-all duration-300 pointer-events-none opacity-0 -translate-y-6 ${
              isNavHovered ? 'opacity-100 translate-y-0 pointer-events-auto' : ''
            }`}
          >
            <div className="flex gap-4">
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
        </div>
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
    </DataProvider>
  );
}

export default App;


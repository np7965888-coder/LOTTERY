import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// 載入測試工具（開發環境）
if (import.meta.env.DEV) {
  import('./utils/testConnection')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)



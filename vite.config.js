import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  // 支持前端路由（所有路徑都回退到 index.html）
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})



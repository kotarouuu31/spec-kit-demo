import { defineConfig } from 'vite'

export default defineConfig({
  // ルートディレクトリ
  root: '.',
  
  // ビルド設定
  build: {
    outDir: 'dist',
    sourcemap: true,
    // ES2022 features使用
    target: 'es2022'
  },
  
  // 開発サーバー設定
  server: {
    port: 5173,
    open: true
  },
  
  // テスト設定
  test: {
    // Vitest設定
    globals: true,
    environment: 'jsdom'
  }
})
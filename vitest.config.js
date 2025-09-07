/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // テスト環境設定
    globals: true,
    environment: 'jsdom',
    
    // テストファイルパターン
    include: ['tests/**/*.{test,spec}.js'],
    
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'vite.config.js',
        'vitest.config.js'
      ]
    },
    
    // セットアップファイル
    setupFiles: ['tests/setup.js']
  }
})
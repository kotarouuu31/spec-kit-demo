// Vitestテストのセットアップファイル

// グローバルテスト設定
import { beforeEach, afterEach } from 'vitest'

// 各テスト前の共通セットアップ
beforeEach(() => {
  // テストデータベースの初期化など
  // console.log('テスト開始')
})

// 各テスト後のクリーンアップ
afterEach(() => {
  // テストデータのクリーンアップなど
  // console.log('テスト終了')
})

// JSDOM環境でのDOM操作のヘルパー
global.createTestContainer = () => {
  const container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
  return container
}

global.cleanupTestContainer = () => {
  const container = document.getElementById('test-container')
  if (container) {
    document.body.removeChild(container)
  }
}
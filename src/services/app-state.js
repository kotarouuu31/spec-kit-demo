// アプリケーション状態管理
import { APP_CONFIG } from '../config/app-config.js'

export class AppState {
  constructor() {
    this.database = null
    this.components = {}
    this.currentFilter = { ...APP_CONFIG.DEFAULTS.FILTER }
    this.isInitialized = false
    this.isLoading = false

    // イベントリスナーの管理
    this.eventListeners = new Map()
  }

  // データベース設定
  setDatabase(database) {
    this.database = database
  }

  getDatabase() {
    return this.database
  }

  // コンポーネント管理
  setComponent(name, component) {
    this.components[name] = component
  }

  getComponent(name) {
    return this.components[name]
  }

  getAllComponents() {
    return { ...this.components }
  }

  // フィルター状態管理
  setFilter(filterUpdates) {
    this.currentFilter = { ...this.currentFilter, ...filterUpdates }
  }

  getFilter() {
    return { ...this.currentFilter }
  }

  resetFilter() {
    this.currentFilter = { ...APP_CONFIG.DEFAULTS.FILTER }
  }

  // 初期化状態管理
  setInitialized(initialized) {
    this.isInitialized = initialized
  }

  getIsInitialized() {
    return this.isInitialized
  }

  // ローディング状態管理
  setLoading(loading) {
    this.isLoading = loading
  }

  getIsLoading() {
    return this.isLoading
  }

  // クリーンアップ
  cleanup() {
    if (this.database) {
      try {
        this.database.close()
      } catch (error) {
        console.warn('データベースのクリーンアップ中にエラーが発生しました:', error)
      }
    }

    this.components = {}
    this.eventListeners.clear()
    this.isInitialized = false
    this.isLoading = false
  }
}

// シングルトンインスタンス
export const appState = new AppState()
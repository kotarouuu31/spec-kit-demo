// AppHeaderクラス - アプリケーションヘッダー管理
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BaseComponent, DOMHelper } from '../utils/dom-helpers.js'
import { logger } from '../utils/logger.js'

export class AppHeader extends BaseComponent {
  constructor(container, database) {
    super(container)
    
    if (!database) {
      throw new Error('Database must be provided')
    }

    this.database = database
    this.isCompact = false
    this.stats = {
      total: 0,
      active: 0,
      completed: 0,
      overdue: 0,
      high_priority: 0,
      medium_priority: 0,
      low_priority: 0
    }

    this.init()
  }

  // 初期化
  init() {
    DOMHelper.addClass(this.container, 'app-header')
    this.cacheElements()
    this.setupEventListeners()
  }

  // DOM要素をキャッシュ
  cacheElements() {
    this.cacheElement('currentDate', '#current-date, .current-date')
    this.cacheElement('totalCount', '[data-stat="total"], .total-count')
    this.cacheElement('activeCount', '[data-stat="active"], .active-count')
    this.cacheElement('completedCount', '[data-stat="completed"], .completed-count')
    this.cacheElement('overdueWarning', '[data-stat="overdue"], .overdue-warning')
    this.cacheElement('overdueCount', '.overdue-count')
    this.cacheElement('progressBar', '[data-element="progress"], .progress-bar')
    this.cacheElement('progressFill', '[data-element="progress-fill"], .progress-fill')
    this.cacheElement('progressPercentage', '.progress-percentage')
    this.cacheElement('addTaskButton', '[data-action="add-task"], .add-task-button')
  }

  // イベントリスナーを設定
  setupEventListeners() {
    // 新規タスク追加ボタン
    this.addEventListenerSafe('addTaskButton', 'click', (e) => {
      e.preventDefault()
      this.handleAddTaskClick()
    })

    // キーボードアクセシビリティ
    this.addEventListenerSafe('addTaskButton', 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.handleAddTaskClick()
      }
    })
  }

  // レンダリング
  render() {
    this.updateDate()
    this.updateStats()
  }

  // 統計情報を更新
  updateStats() {
    try {
      this.stats = this.database.getTaskStats()
      this.renderStats()
      this.updateProgress()
      
      // イベント発行
      this.dispatchEvent('stats-updated', {
        stats: { ...this.stats }
      })
    } catch (error) {
      logger.error('統計更新エラー', { error: error.message })
      // エラー時は前回の値を維持
    }
  }

  // 統計情報をDOM に反映
  renderStats() {
    // 基本統計
    this.updateElement('totalCount', this.stats.total)
    this.updateElement('activeCount', this.stats.active)
    this.updateElement('completedCount', this.stats.completed)

    // 期限切れ警告
    const overdueWarning = this.getElement('overdueWarning')
    const overdueCount = this.getElement('overdueCount')
    
    if (overdueWarning && overdueCount) {
      const hasOverdue = this.stats.overdue > 0
      DOMHelper.toggleDisplay(overdueWarning, hasOverdue, 'flex')
      if (hasOverdue) {
        this.updateElement('overdueCount', this.stats.overdue)
      }
    }
  }

  // 進捗情報を更新
  updateProgress() {
    const completionRate = this.getCompletionRate()
    
    // 進捗バー
    const progressFill = this.getElement('progressFill')
    if (progressFill) {
      progressFill.style.width = `${completionRate}%`
      DOMHelper.setAttribute(progressFill, 'data-progress', `${completionRate}%`)
    }

    // 進捗パーセンテージ
    const progressPercentage = this.getElement('progressPercentage')
    if (progressPercentage) {
      DOMHelper.setText(progressPercentage, `${completionRate}%`)
    }
  }

  // 完了率を計算
  getCompletionRate() {
    if (this.stats.total === 0) {
      return 0
    }
    
    return Math.round((this.stats.completed / this.stats.total) * 100)
  }

  // 日付を更新
  updateDate() {
    const dateString = this.getCurrentDateString()
    DOMHelper.setText(this.getElement('currentDate'), dateString)
  }

  // 現在日付の文字列を取得
  getCurrentDateString() {
    try {
      const now = new Date()
      return format(now, 'yyyy年MM月dd日（E）', { locale: ja })
    } catch (error) {
      // date-fns エラー時のフォールバック
      const now = new Date()
      return `${now.getFullYear()}年${(now.getMonth() + 1).toString().padStart(2, '0')}月${now.getDate().toString().padStart(2, '0')}日`
    }
  }

  // コンパクトモードの設定
  setCompactMode(enabled) {
    this.isCompact = enabled
    
    if (enabled) {
      DOMHelper.setAttribute(this.container, 'data-compact', 'true')
      DOMHelper.addClass(this.container, 'compact')
    } else {
      DOMHelper.removeAttribute(this.container, 'data-compact')
      DOMHelper.removeClass(this.container, 'compact')
    }
    
    this.updateCompactLayout()
  }

  // コンパクトレイアウトの更新
  updateCompactLayout() {
    if (!this.isCompact) return

    // モバイル表示用の調整
    const headerContent = this.container.querySelector('.header-content')
    if (headerContent) {
      headerContent.style.gridTemplateColumns = '1fr'
      headerContent.style.textAlign = 'center'
    }

    // 統計表示の簡略化
    const taskStats = this.container.querySelector('.task-stats')
    if (taskStats) {
      taskStats.style.flexWrap = 'wrap'
      taskStats.style.justifyContent = 'center'
    }
  }

  // 要素のテキストを更新するヘルパー
  updateElement(elementKey, value) {
    if (value !== undefined && value !== null) {
      DOMHelper.setText(this.getElement(elementKey), value.toString())
    }
  }

  // 新規タスクボタンクリックハンドラー
  handleAddTaskClick() {
    logger.debug('新規タスクボタンがクリックされました')
    this.dispatchEvent('add-task-requested', {
      source: 'header'
    })
  }

  // カスタムイベントを発行
  dispatchEvent(eventType, detail = {}) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      cancelable: false
    })
    
    this.container.dispatchEvent(event)
  }

  // レスポンシブデザイン対応
  updateResponsiveLayout() {
    const width = window.innerWidth
    
    if (width < 768) {
      this.setCompactMode(true)
    } else {
      this.setCompactMode(false)
    }
  }

  // 統計のリアルタイム監視を開始
  startStatsMonitoring(interval = 5000) {
    this.stopStatsMonitoring()
    
    this.statsInterval = setInterval(() => {
      this.updateStats()
    }, interval)
  }

  // 統計監視を停止
  stopStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
  }

  // 統計データの手動リフレッシュ
  refreshStats() {
    this.updateStats()
    
    // 視覚的フィードバック
    const progressBar = this.getElement('progressBar')
    if (progressBar) {
      progressBar.style.opacity = '0.5'
      setTimeout(() => {
        if (progressBar) {
          progressBar.style.opacity = '1'
        }
      }, 200)
    }
  }

  // アクセシビリティ対応
  updateAriaLabels() {
    const completionRate = this.getCompletionRate()
    
    const progressBar = this.getElement('progressBar')
    if (progressBar) {
      DOMHelper.setAttribute(progressBar, 'role', 'progressbar')
      DOMHelper.setAttribute(progressBar, 'aria-valuenow', completionRate)
      DOMHelper.setAttribute(progressBar, 'aria-valuemin', '0')
      DOMHelper.setAttribute(progressBar, 'aria-valuemax', '100')
      DOMHelper.setAttribute(progressBar, 'aria-label', `タスク完了率: ${completionRate}%`)
    }

    const addTaskButton = this.getElement('addTaskButton')
    if (addTaskButton) {
      DOMHelper.setAttribute(addTaskButton, 'aria-label', '新しいタスクを追加')
    }
  }

  // 統計の詳細情報を取得
  getDetailedStats() {
    return {
      ...this.stats,
      completionRate: this.getCompletionRate(),
      lastUpdated: new Date(),
      isCompact: this.isCompact
    }
  }

  // クリーンアップ
  destroy() {
    this.stopStatsMonitoring()
    
    // BaseComponentのdestroyを呼び出し
    super.destroy()
    
    this.stats = {}
  }

  // デバッグ用情報
  getDebugInfo() {
    return {
      isCompact: this.isCompact,
      stats: this.stats,
      completionRate: this.getCompletionRate(),
      elementsFound: Array.from(this.elements.keys()).filter(key => this.getElement(key) !== null),
      currentDate: this.getCurrentDateString()
    }
  }
}
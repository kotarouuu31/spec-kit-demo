// AppHeaderクラス - アプリケーションヘッダー管理
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export class AppHeader {
  constructor(container, database) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid HTML element')
    }
    
    if (!database) {
      throw new Error('Database must be provided')
    }

    this.container = container
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
    this.container.className = 'app-header'
    this.cacheElements()
    this.setupEventListeners()
  }

  // DOM要素をキャッシュ
  cacheElements() {
    this.elements = {
      currentDate: this.container.querySelector('#current-date, .current-date'),
      totalCount: this.container.querySelector('[data-stat="total"], .total-count'),
      activeCount: this.container.querySelector('[data-stat="active"], .active-count'),
      completedCount: this.container.querySelector('[data-stat="completed"], .completed-count'),
      overdueWarning: this.container.querySelector('[data-stat="overdue"], .overdue-warning'),
      overdueCount: this.container.querySelector('.overdue-count'),
      progressBar: this.container.querySelector('[data-element="progress"], .progress-bar'),
      progressFill: this.container.querySelector('[data-element="progress-fill"], .progress-fill'),
      progressPercentage: this.container.querySelector('.progress-percentage'),
      addTaskButton: this.container.querySelector('[data-action="add-task"], .add-task-button')
    }
  }

  // イベントリスナーを設定
  setupEventListeners() {
    // 新規タスク追加ボタン
    if (this.elements.addTaskButton) {
      this.elements.addTaskButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.handleAddTaskClick()
      })
    }

    // キーボードアクセシビリティ
    if (this.elements.addTaskButton) {
      this.elements.addTaskButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          this.handleAddTaskClick()
        }
      })
    }
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
      console.error('統計更新エラー:', error)
      // エラー時は前回の値を維持
    }
  }

  // 統計情報をDOM に反映
  renderStats() {
    // 基本統計
    this.updateElement(this.elements.totalCount, this.stats.total)
    this.updateElement(this.elements.activeCount, this.stats.active)
    this.updateElement(this.elements.completedCount, this.stats.completed)

    // 期限切れ警告
    if (this.elements.overdueWarning && this.elements.overdueCount) {
      if (this.stats.overdue > 0) {
        this.elements.overdueWarning.style.display = 'flex'
        this.updateElement(this.elements.overdueCount, this.stats.overdue)
      } else {
        this.elements.overdueWarning.style.display = 'none'
      }
    }
  }

  // 進捗情報を更新
  updateProgress() {
    const completionRate = this.getCompletionRate()
    
    // 進捗バー
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${completionRate}%`
      this.elements.progressFill.setAttribute('data-progress', `${completionRate}%`)
    }

    // 進捗パーセンテージ
    if (this.elements.progressPercentage) {
      this.elements.progressPercentage.textContent = `${completionRate}%`
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
    if (this.elements.currentDate) {
      const dateString = this.getCurrentDateString()
      this.elements.currentDate.textContent = dateString
    }
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
      this.container.setAttribute('data-compact', 'true')
      this.container.classList.add('compact')
    } else {
      this.container.removeAttribute('data-compact')
      this.container.classList.remove('compact')
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
  updateElement(element, value) {
    if (element && value !== undefined && value !== null) {
      element.textContent = value.toString()
    }
  }

  // 新規タスクボタンクリックハンドラー
  handleAddTaskClick() {
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
    if (this.elements.progressBar) {
      this.elements.progressBar.style.opacity = '0.5'
      setTimeout(() => {
        if (this.elements.progressBar) {
          this.elements.progressBar.style.opacity = '1'
        }
      }, 200)
    }
  }

  // アクセシビリティ対応
  updateAriaLabels() {
    const completionRate = this.getCompletionRate()
    
    if (this.elements.progressBar) {
      this.elements.progressBar.setAttribute('role', 'progressbar')
      this.elements.progressBar.setAttribute('aria-valuenow', completionRate)
      this.elements.progressBar.setAttribute('aria-valuemin', '0')
      this.elements.progressBar.setAttribute('aria-valuemax', '100')
      this.elements.progressBar.setAttribute('aria-label', `タスク完了率: ${completionRate}%`)
    }

    if (this.elements.addTaskButton) {
      this.elements.addTaskButton.setAttribute('aria-label', '新しいタスクを追加')
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
    
    // イベントリスナーの削除は不要（要素と一緒に削除される）
    
    if (this.container) {
      this.container.innerHTML = ''
    }
    
    this.elements = {}
    this.stats = {}
  }

  // デバッグ用情報
  getDebugInfo() {
    return {
      isCompact: this.isCompact,
      stats: this.stats,
      completionRate: this.getCompletionRate(),
      elementsFound: Object.keys(this.elements).filter(key => this.elements[key] !== null),
      currentDate: this.getCurrentDateString()
    }
  }
}
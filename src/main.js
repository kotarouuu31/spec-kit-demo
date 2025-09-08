// 個人用ToDoアプリ - メインエントリーポイント
import { TaskDatabase } from './db/browser-database.js'
import { AppHeader } from './ui/AppHeader.js'
import { TaskList } from './ui/TaskList.js'
import { TaskForm } from './ui/TaskForm.js'
import { FilterControls } from './ui/FilterControls.js'
import { NotificationManager } from './ui/NotificationManager.js'
import { logger, ErrorHandler } from './utils/logger.js'

// グローバル状態管理
class TodoApp {
  constructor() {
    this.database = null
    this.components = {}
    this.currentFilter = {
      show: 'all',
      priority: [],
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
    
    // ログシステム初期化
    this.logger = logger
    this.errorHandler = null // NotificationManager初期化後に設定
    
    this.logger.info('TodoAppインスタンスが作成されました')
  }

  // アプリケーション初期化
  async init() {
    const initTimer = 'app-initialization'
    this.logger.startTimer(initTimer)
    
    try {
      this.logger.info('アプリケーションの初期化を開始します')
      
      // ローディング表示
      this.showLoading(true)

      // データベース初期化
      await this.initializeDatabase()

      // UIコンポーネント初期化
      this.initializeComponents()
      
      // エラーハンドラー設定（NotificationManager初期化後）
      this.errorHandler = new ErrorHandler(this.logger, this.components.notifications)

      // イベントリスナー設定
      this.setupEventListeners()

      // 初期データ読み込み
      await this.loadInitialData()

      // ローディング非表示
      this.showLoading(false)

      this.logger.endTimer(initTimer)
      this.logger.info('ToDoアプリが正常に初期化されました')
      
      // システム情報をログに記録
      this.logger.logSystemInfo()
      
    } catch (error) {
      this.logger.error('アプリケーションの初期化中にエラーが発生しました', {
        error: error.message,
        stack: error.stack
      })
      
      this.showLoading(false)
      this.components.notifications?.showError(
        'アプリケーションの初期化に失敗しました。ページを再読み込みしてください。'
      )
      
      this.logger.endTimer(initTimer)
    }
  }

  // データベース初期化
  async initializeDatabase() {
    const dbName = 'todo-app'
    this.logger.info('データベースの初期化を開始します', { dbName })
    
    this.database = new TaskDatabase(dbName)
    
    try {
      this.logger.logDbOperation('connect', 'database', { dbName })
      await this.database.connect()
      
      this.logger.info('データベースが正常に初期化されました')
    } catch (error) {
      this.logger.error('データベースの初期化に失敗しました', {
        error: error.message,
        dbName
      })
      throw new Error(`データベースの初期化に失敗しました: ${error.message}`)
    }
  }

  // UIコンポーネント初期化
  initializeComponents() {
    const containers = {
      header: document.getElementById('app-header'),
      form: document.getElementById('task-form-modal'),
      filters: document.getElementById('filter-controls'),
      taskList: document.getElementById('task-list'),
      notifications: document.getElementById('notifications')
    }

    // コンテナが存在することを確認
    Object.entries(containers).forEach(([name, container]) => {
      if (!container) {
        throw new Error(`必要なDOM要素が見つかりません: ${name}`)
      }
    })

    // コンポーネント初期化
    this.components = {
      header: new AppHeader(containers.header, this.database),
      form: new TaskForm(containers.form, this.database),
      filters: new FilterControls(containers.filters),
      taskList: new TaskList(containers.taskList, this.database),
      notifications: new NotificationManager(containers.notifications)
    }

    // 初期レンダリング
    this.components.header.render()
    this.components.filters.render()
    this.components.taskList.render([])
  }

  // イベントリスナー設定（統合・エラーハンドリング強化）
  setupEventListeners() {
    // 中央集権的なイベントハンドラーでエラーキャッチ
    const safeEventHandler = (handler) => {
      return (event) => {
        try {
          handler(event)
        } catch (error) {
          console.error('イベントハンドリング中にエラーが発生:', error)
          this.components.notifications?.showError('操作中にエラーが発生しました')
        }
      }
    }

    // ヘッダーイベント
    this.components.header.container.addEventListener('add-task-requested', safeEventHandler((event) => {
      this.logger.debug('新規タスク追加リクエスト受信', event.detail)
      this.openTaskForm('create')
    }))

    this.components.header.container.addEventListener('stats-updated', safeEventHandler((event) => {
      // 統計更新の通知をコンソールに記録
      console.log('統計更新:', event.detail.stats)
    }))

    // フォームイベント
    this.components.form.container.addEventListener('task-created', safeEventHandler((event) => {
      this.handleTaskCreated(event.detail.task)
    }))

    this.components.form.container.addEventListener('task-updated', safeEventHandler((event) => {
      this.handleTaskUpdated(event.detail.task)
    }))

    this.components.form.container.addEventListener('form-cancel', safeEventHandler(() => {
      this.closeTaskForm()
    }))

    // フィルターイベント
    this.components.filters.container.addEventListener('filters-changed', safeEventHandler((event) => {
      this.handleFiltersChanged(event.detail.filters)
    }))

    this.components.filters.container.addEventListener('filters-reset', safeEventHandler(() => {
      this.handleFiltersReset()
    }))

    // タスクリストイベント
    this.components.taskList.container.addEventListener('task-toggle', safeEventHandler((event) => {
      this.handleTaskToggle(event.detail.taskId)
    }))

    this.components.taskList.container.addEventListener('task-edit', safeEventHandler((event) => {
      this.openTaskForm('edit', event.detail.task)
    }))

    this.components.taskList.container.addEventListener('task-delete', safeEventHandler((event) => {
      this.handleTaskDelete(event.detail.taskId, event.detail.task)
    }))

    // 通知イベント
    this.components.notifications.container.addEventListener('notification-action', safeEventHandler((event) => {
      console.log('通知アクション実行:', event.detail)
    }))

    // キーボードショートカット
    document.addEventListener('keydown', safeEventHandler((event) => {
      this.handleKeyboardShortcuts(event)
    }))

    // ページ離脱前の処理
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })

    // アプリケーション全体のエラーハンドリング
    window.addEventListener('error', (event) => {
      console.error('グローバルエラー:', event.error)
      this.components.notifications?.showError('予期しないエラーが発生しました')
    })

    window.addEventListener('unhandledrejection', (event) => {
      console.error('未処理のPromise拒否:', event.reason)
      this.components.notifications?.showError('非同期処理でエラーが発生しました')
    })
  }

  // 初期データ読み込み
  async loadInitialData() {
    await this.refreshTaskList()
    this.updateHeaderStats()
    this.updateCurrentDate()
    
    // 定期的な統計更新（1分ごと）
    setInterval(() => {
      this.updateCurrentDate()
    }, 60000)
  }

  // タスクリスト更新
  async refreshTaskList() {
    try {
      const allTasks = this.database.getAllTasks()
      const filteredTasks = this.applyCurrentFilters(allTasks)
      this.components.taskList.render(filteredTasks)
      
      // 空状態の表示/非表示
      const isEmpty = filteredTasks.length === 0
      this.toggleEmptyState(isEmpty, allTasks.length > 0)
    } catch (error) {
      console.error('タスクリストの更新中にエラーが発生しました:', error)
      this.components.notifications.showError('タスクリストの更新に失敗しました')
    }
  }

  // ヘッダー統計更新
  updateHeaderStats() {
    try {
      this.components.header.updateStats()
    } catch (error) {
      console.error('統計情報の更新中にエラーが発生しました:', error)
    }
  }

  // 現在日付更新
  updateCurrentDate() {
    try {
      this.components.header.updateDate()
    } catch (error) {
      console.error('日付の更新中にエラーが発生しました:', error)
    }
  }

  // 現在のフィルターを適用
  applyCurrentFilters(tasks) {
    return this.components.filters.applyFiltersToTasks(tasks, this.currentFilter)
  }

  // タスクフォームを開く
  openTaskForm(mode, task = null) {
    try {
      this.logger.debug('タスクフォームを開いています', { mode, taskId: task?.id })
      
      this.components.form.render(mode, task)
      this.components.form.container.style.display = 'flex'
      
      // アクセシビリティの改善
      this.components.form.updateAriaLabels()
      
      // フォーカスを設定
      this.components.form.focusFirstField()
      
      this.logger.debug('タスクフォームの表示完了')
    } catch (error) {
      this.logger.error('フォーム表示エラー', { error: error.message, mode, task })
      this.components.notifications.showError('フォームの表示に失敗しました')
    }
  }

  // タスクフォームを閉じる
  closeTaskForm() {
    try {
      this.logger.debug('タスクフォームを閉じています')
      
      this.components.form.container.style.display = 'none'
      this.components.form.reset()
      
      this.logger.debug('タスクフォームの非表示完了')
    } catch (error) {
      this.logger.error('フォーム非表示エラー', { error: error.message })
    }
  }

  // タスク作成処理
  async handleTaskCreated(task) {
    try {
      this.logger.logUserAction('task-created', 'TaskForm', { 
        taskId: task.id, 
        text: task.text,
        priority: task.priority 
      })
      
      this.closeTaskForm()
      await this.refreshTaskList()
      this.updateHeaderStats()
      
      this.components.notifications.showSuccess(
        `タスク「${task.text}」を作成しました`,
        { duration: 3000 }
      )
      
      this.logger.info('新規タスクが正常に作成されました', { taskId: task.id })
    } catch (error) {
      this.errorHandler.handleError(error, 'task-creation-post-process')
    }
  }

  // タスク更新処理
  async handleTaskUpdated(task) {
    try {
      this.logger.logUserAction('task-updated', 'TaskForm', { 
        taskId: task.id, 
        text: task.text,
        priority: task.priority 
      })
      
      this.closeTaskForm()
      await this.refreshTaskList()
      this.updateHeaderStats()
      
      this.components.notifications.showSuccess(
        `タスク「${task.text}」を更新しました`,
        { duration: 3000 }
      )
      
      this.logger.info('タスクが正常に更新されました', { taskId: task.id })
    } catch (error) {
      this.errorHandler.handleError(error, 'task-update-post-process')
    }
  }

  // タスク完了切り替え処理
  async handleTaskToggle(taskId) {
    try {
      this.logger.logDbOperation('toggleTaskCompletion', 'tasks', { taskId })
      const updatedTask = this.database.toggleTaskCompletion(taskId)
      
      this.logger.logUserAction('task-toggled', 'TaskList', { 
        taskId, 
        completed: updatedTask.completed 
      })
      
      await this.refreshTaskList()
      this.updateHeaderStats()
      
      const statusText = updatedTask.completed ? '完了しました' : '未完了に戻しました'
      this.components.notifications.showSuccess(
        `タスク「${updatedTask.text}」を${statusText}`,
        { duration: 2000 }
      )
      
      this.logger.info('タスクの完了状態が正常に変更されました', { 
        taskId, 
        completed: updatedTask.completed 
      })
    } catch (error) {
      this.errorHandler.handleError(error, 'task-toggle-process')
    }
  }

  // タスク削除処理
  async handleTaskDelete(taskId, task) {
    try {
      const success = this.database.deleteTask(taskId)
      
      if (success) {
        await this.refreshTaskList()
        this.updateHeaderStats()
        
        // 削除の取り消し機能付き通知
        this.components.notifications.showInfo(
          `タスク「${task.text}」を削除しました`,
          {
            duration: 5000,
            actionButton: {
              text: '元に戻す',
              callback: () => this.undoTaskDelete(task)
            }
          }
        )
      } else {
        this.components.notifications.showError('タスクの削除に失敗しました')
      }
    } catch (error) {
      console.error('タスク削除中にエラーが発生しました:', error)
      this.components.notifications.showError('タスクの削除に失敗しました')
    }
  }

  // タスク削除の取り消し
  async undoTaskDelete(originalTask) {
    try {
      const restoredTask = this.database.createTask({
        text: originalTask.text,
        priority: originalTask.priority,
        due_date: originalTask.due_date
      })
      
      await this.refreshTaskList()
      this.updateHeaderStats()
      
      this.components.notifications.showSuccess(
        `タスク「${restoredTask.text}」を復元しました`,
        { duration: 2000 }
      )
    } catch (error) {
      console.error('タスク復元中にエラーが発生しました:', error)
      this.components.notifications.showError('タスクの復元に失敗しました')
    }
  }

  // フィルター変更処理
  async handleFiltersChanged(filters) {
    this.currentFilter = { ...filters }
    await this.refreshTaskList()
  }

  // フィルターリセット処理
  async handleFiltersReset() {
    this.currentFilter = {
      show: 'all',
      priority: [],
      sortBy: 'created_at',
      sortOrder: 'desc'
    }
    await this.refreshTaskList()
  }

  // キーボードショートカット処理
  handleKeyboardShortcuts(event) {
    // Cmd/Ctrl + N: 新規タスク作成
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault()
      this.openTaskForm('create')
    }
    
    // Escape: フォームを閉じる
    if (event.key === 'Escape') {
      if (this.components.form.container.style.display !== 'none') {
        this.closeTaskForm()
      }
    }
    
    // Cmd/Ctrl + R: データ更新
    if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
      event.preventDefault()
      this.refreshTaskList()
      this.updateHeaderStats()
    }
  }

  // 空状態の表示切り替え
  toggleEmptyState(isEmpty, hasAllTasks) {
    const emptyState = document.getElementById('empty-state')
    const taskListContent = document.getElementById('task-list-content')
    
    if (emptyState) {
      if (isEmpty) {
        emptyState.style.display = 'flex'
        
        if (hasAllTasks) {
          // フィルター結果が空の場合
          emptyState.querySelector('.empty-title').textContent = '該当するタスクがありません'
          emptyState.querySelector('.empty-message').textContent = 'フィルター条件を変更してみてください'
        } else {
          // 全体が空の場合
          emptyState.querySelector('.empty-title').textContent = 'タスクがありません'
          emptyState.querySelector('.empty-message').textContent = '新規タスクを追加して始めましょう！'
        }
      } else {
        emptyState.style.display = 'none'
      }
    }
  }

  // ローディング表示制御
  showLoading(show) {
    const loading = document.getElementById('loading')
    if (loading) {
      loading.style.display = show ? 'flex' : 'none'
    }
  }

  // クリーンアップ処理
  cleanup() {
    try {
      if (this.database) {
        this.database.close()
      }
    } catch (error) {
      console.error('クリーンアップ中にエラーが発生しました:', error)
    }
  }

  // エラーハンドリング
  handleGlobalError(error) {
    console.error('予期しないエラーが発生しました:', error)
    
    if (this.components.notifications) {
      this.components.notifications.showError(
        '予期しないエラーが発生しました。ページを再読み込みしてください。',
        { 
          persistent: true,
          actionButton: {
            text: '再読み込み',
            callback: () => window.location.reload()
          }
        }
      )
    }
  }
}

// グローバルエラーハンドラー設定
window.addEventListener('error', (event) => {
  if (window.todoApp) {
    window.todoApp.handleGlobalError(event.error)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  if (window.todoApp) {
    window.todoApp.handleGlobalError(event.reason)
  }
})

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    window.todoApp = new TodoApp()
    await window.todoApp.init()
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error)
    
    // フォールバック通知
    const notificationDiv = document.createElement('div')
    notificationDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fee2e2;
      color: #dc2626;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #fca5a5;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 400px;
    `
    notificationDiv.textContent = 'アプリケーションの初期化に失敗しました。ページを再読み込みしてください。'
    document.body.appendChild(notificationDiv)
  }
})

// ServiceWorker登録（PWA対応）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('ServiceWorker registered:', registration)
    } catch (error) {
      console.log('ServiceWorker registration failed:', error)
    }
  })
}
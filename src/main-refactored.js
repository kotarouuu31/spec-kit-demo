// リファクタリング後のメインエントリーポイント
import { TaskDatabase } from './db/browser-database.js'
import { AppHeader } from './ui/AppHeader.js'
import { TaskList } from './ui/TaskList.js'
import { TaskForm } from './ui/TaskForm.js'
import { FilterControls } from './ui/FilterControls.js'
import { CategoryManager } from './ui/CategoryManager.js'
import { NotificationManager } from './ui/NotificationManager.js'
import { logger, ErrorHandler } from './utils/logger.js'
import { EventHelper } from './utils/event-helpers.js'

// サービス
import { appState } from './services/app-state.js'
import { KeyboardService } from './services/keyboard-service.js'
import { TaskService } from './services/task-service.js'
import { APP_CONFIG } from './config/app-config.js'

// リファクタリング後のToDoアプリ
class TodoApp {
  constructor() {
    this.logger = logger
    this.errorHandler = null
    this.keyboardService = null
    this.taskService = null

    this.logger.info('TodoAppインスタンスが作成されました')
  }

  // アプリケーション初期化
  async init() {
    const initTimer = 'app-initialization'
    this.logger.startTimer(initTimer)

    try {
      this.logger.info('アプリケーションの初期化を開始します')

      this.showLoading(true)

      await this.initializeDatabase()
      this.initializeComponents()
      this.initializeServices()
      this.setupEventListeners()
      await this.loadInitialData()

      this.showLoading(false)

      this.logger.endTimer(initTimer)
      this.logger.info('ToDoアプリが正常に初期化されました')
      this.logger.logSystemInfo()

    } catch (error) {
      this.logger.error('アプリケーションの初期化中にエラーが発生しました', {
        error: error.message,
        stack: error.stack
      })

      this.showLoading(false)
      this.handleInitializationError(error)
      this.logger.endTimer(initTimer)
    }
  }

  // データベース初期化
  async initializeDatabase() {
    const dbName = APP_CONFIG.DATABASE.NAME
    this.logger.info('データベースの初期化を開始します', { dbName })

    const database = new TaskDatabase(dbName)

    try {
      this.logger.logDbOperation('connect', 'database', { dbName })
      await database.connect()

      appState.setDatabase(database)
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
    const containers = this.validateContainers()
    const database = appState.getDatabase()

    const components = {
      header: new AppHeader(containers.header, database),
      form: new TaskForm(containers.form, database),
      filters: new FilterControls(containers.filters),
      taskList: new TaskList(containers.taskList, database),
      categoryManager: new CategoryManager(database),
      notifications: new NotificationManager(containers.notifications)
    }

    // AppStateにコンポーネントを登録
    Object.entries(components).forEach(([name, component]) => {
      appState.setComponent(name, component)
    })

    // CategoryManagerをコンテナに追加
    containers.categoryManager.appendChild(components.categoryManager.element)

    // 初期レンダリング
    components.header.render()
    components.filters.render()
    components.taskList.render([])
  }

  // 必要なDOM要素の存在確認
  validateContainers() {
    const containerIds = {
      header: 'app-header',
      form: 'task-form-modal',
      filters: 'filter-controls',
      taskList: 'task-list',
      categoryManager: 'category-manager-container',
      notifications: 'notifications'
    }

    const containers = {}

    Object.entries(containerIds).forEach(([name, id]) => {
      const container = document.getElementById(id)
      if (!container) {
        throw new Error(`必要なDOM要素が見つかりません: ${name} (#${id})`)
      }
      containers[name] = container
    })

    return containers
  }

  // サービス初期化
  initializeServices() {
    const database = appState.getDatabase()
    const notifications = appState.getComponent('notifications')

    // エラーハンドラー初期化
    this.errorHandler = new ErrorHandler(this.logger, notifications)

    // タスクサービス初期化
    this.taskService = new TaskService(database, this.logger)

    // キーボードサービス初期化
    this.keyboardService = new KeyboardService(this)
  }

  // イベントリスナー設定
  setupEventListeners() {
    const errorCallback = (error) => {
      appState.getComponent('notifications')?.showError('操作中にエラーが発生しました')
    }

    this.setupHeaderEvents(errorCallback)
    this.setupFormEvents(errorCallback)
    this.setupFilterEvents(errorCallback)
    this.setupTaskListEvents(errorCallback)
    this.setupNotificationEvents(errorCallback)
    this.setupGlobalEvents(errorCallback)
  }

  // ヘッダーイベント設定
  setupHeaderEvents(errorCallback) {
    const header = appState.getComponent('header')

    header.container.addEventListener('add-task-requested', EventHelper.createSafeHandler((event) => {
      this.logger.debug('新規タスク追加リクエスト受信', event.detail)
      this.openTaskForm('create')
    }, errorCallback))

    header.container.addEventListener('manage-categories-requested', EventHelper.createSafeHandler((event) => {
      this.logger.debug('カテゴリ管理リクエスト受信', event.detail)
      this.openCategoryManager()
    }, errorCallback))

    header.container.addEventListener('stats-updated', EventHelper.createSafeHandler((event) => {
      console.log('統計更新:', event.detail.stats)
    }, errorCallback))
  }

  // フォームイベント設定
  setupFormEvents(errorCallback) {
    const form = appState.getComponent('form')

    form.container.addEventListener('task-created', EventHelper.createSafeAsyncHandler(async (event) => {
      await this.handleTaskCreated(event.detail.task)
    }, errorCallback))

    form.container.addEventListener('task-updated', EventHelper.createSafeAsyncHandler(async (event) => {
      await this.handleTaskUpdated(event.detail.task)
    }, errorCallback))

    form.container.addEventListener('form-cancel', EventHelper.createSafeHandler(() => {
      this.closeTaskForm()
    }, errorCallback))
  }

  // フィルターイベント設定
  setupFilterEvents(errorCallback) {
    const filters = appState.getComponent('filters')

    filters.container.addEventListener('filters-changed', EventHelper.createSafeAsyncHandler(async (event) => {
      appState.setFilter(event.detail.filters)
      await this.refreshTaskList()
    }, errorCallback))

    filters.container.addEventListener('filters-reset', EventHelper.createSafeAsyncHandler(async () => {
      appState.resetFilter()
      await this.refreshTaskList()
    }, errorCallback))
  }

  // タスクリストイベント設定
  setupTaskListEvents(errorCallback) {
    const taskList = appState.getComponent('taskList')

    taskList.container.addEventListener('task-toggle', EventHelper.createSafeAsyncHandler(async (event) => {
      await this.handleTaskToggle(event.detail.taskId)
    }, errorCallback))

    taskList.container.addEventListener('task-edit', EventHelper.createSafeHandler((event) => {
      this.openTaskForm('edit', event.detail.task)
    }, errorCallback))

    taskList.container.addEventListener('task-delete', EventHelper.createSafeAsyncHandler(async (event) => {
      await this.handleTaskDelete(event.detail.taskId, event.detail.task)
    }, errorCallback))
  }

  // 通知イベント設定
  setupNotificationEvents(errorCallback) {
    const notifications = appState.getComponent('notifications')

    notifications.container.addEventListener('notification-action', EventHelper.createSafeHandler((event) => {
      console.log('通知アクション実行:', event.detail)
    }, errorCallback))
  }

  // グローバルイベント設定
  setupGlobalEvents(errorCallback) {
    // ページ離脱前の処理
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })

    // アプリケーション全体のエラーハンドリング
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error)
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason)
    })
  }

  // 初期データ読み込み
  async loadInitialData() {
    await this.refreshTaskList()
    this.updateHeaderStats()
    this.updateCurrentDate()

    // 定期的な統計更新
    setInterval(() => {
      this.updateCurrentDate()
    }, APP_CONFIG.UI.REFRESH.STATS_INTERVAL)
  }

  // タスクリスト更新
  async refreshTaskList() {
    try {
      const database = appState.getDatabase()
      const taskList = appState.getComponent('taskList')
      const currentFilter = appState.getFilter()

      const allTasks = database.getAllTasks()
      const filteredTasks = this.taskService.applyFilters(allTasks, currentFilter)

      taskList.render(filteredTasks)
      this.toggleEmptyState(filteredTasks.length === 0, allTasks.length > 0)
    } catch (error) {
      console.error('タスクリストの更新中にエラーが発生しました:', error)
      appState.getComponent('notifications').showError('タスクリストの更新に失敗しました')
    }
  }

  // ヘッダー統計更新
  updateHeaderStats() {
    try {
      appState.getComponent('header').updateStats()
    } catch (error) {
      console.error('統計情報の更新中にエラーが発生しました:', error)
    }
  }

  // 現在日付更新
  updateCurrentDate() {
    try {
      appState.getComponent('header').updateDate()
    } catch (error) {
      console.error('日付の更新中にエラーが発生しました:', error)
    }
  }

  // タスクフォーム表示
  openTaskForm(mode, task = null) {
    try {
      this.logger.debug('タスクフォームを開いています', { mode, taskId: task?.id })

      const form = appState.getComponent('form')
      form.render(mode, task)
      form.container.style.display = 'flex'
      form.updateAriaLabels()
      form.focusFirstField()

      this.logger.debug('タスクフォームの表示完了')
    } catch (error) {
      this.logger.error('フォーム表示エラー', { error: error.message, mode, task })
      appState.getComponent('notifications').showError('フォームの表示に失敗しました')
    }
  }

  // タスクフォーム非表示
  closeTaskForm() {
    try {
      this.logger.debug('タスクフォームを閉じています')

      const form = appState.getComponent('form')
      form.container.style.display = 'none'
      form.reset()

      this.logger.debug('タスクフォームの非表示完了')
    } catch (error) {
      this.logger.error('フォーム非表示エラー', { error: error.message })
    }
  }

  // カテゴリ管理表示
  openCategoryManager() {
    try {
      this.logger.debug('カテゴリ管理を開いています')
      appState.getComponent('categoryManager').show()
    } catch (error) {
      this.logger.error('カテゴリ管理表示エラー', { error: error.message })
      appState.getComponent('notifications').showError('カテゴリ管理の表示に失敗しました')
    }
  }

  // タスク作成処理
  async handleTaskCreated(task) {
    try {
      const result = await this.taskService.createTask(task)

      this.closeTaskForm()
      await this.refreshTaskList()
      this.updateHeaderStats()

      appState.getComponent('notifications').showSuccess(
        result.message,
        { duration: APP_CONFIG.UI.NOTIFICATIONS.SUCCESS_DURATION }
      )

      this.logger.info('新規タスクが正常に作成されました', { taskId: task.id })
    } catch (error) {
      this.errorHandler.handleError(error, 'task-creation-post-process')
    }
  }

  // タスク更新処理
  async handleTaskUpdated(task) {
    try {
      const result = await this.taskService.updateTask(task.id, task)

      this.closeTaskForm()
      await this.refreshTaskList()
      this.updateHeaderStats()

      appState.getComponent('notifications').showSuccess(
        result.message,
        { duration: APP_CONFIG.UI.NOTIFICATIONS.SUCCESS_DURATION }
      )

      this.logger.info('タスクが正常に更新されました', { taskId: task.id })
    } catch (error) {
      this.errorHandler.handleError(error, 'task-update-post-process')
    }
  }

  // タスク完了切り替え処理
  async handleTaskToggle(taskId) {
    try {
      const result = await this.taskService.toggleTaskCompletion(taskId)

      await this.refreshTaskList()
      this.updateHeaderStats()

      appState.getComponent('notifications').showSuccess(
        result.message,
        { duration: APP_CONFIG.UI.NOTIFICATIONS.SUCCESS_DURATION - 1000 }
      )

      this.logger.info('タスクの完了状態が正常に変更されました', {
        taskId,
        completed: result.task.completed
      })
    } catch (error) {
      this.errorHandler.handleError(error, 'task-toggle-process')
    }
  }

  // タスク削除処理
  async handleTaskDelete(taskId, task) {
    try {
      const result = await this.taskService.deleteTask(taskId, task)

      if (result.success) {
        await this.refreshTaskList()
        this.updateHeaderStats()

        // 削除の取り消し機能付き通知
        appState.getComponent('notifications').showInfo(
          result.message,
          {
            duration: APP_CONFIG.UI.NOTIFICATIONS.INFO_DURATION,
            actionButton: {
              text: '元に戻す',
              callback: () => this.undoTaskDelete(result.deletedTask)
            }
          }
        )
      } else {
        appState.getComponent('notifications').showError(result.message)
      }
    } catch (error) {
      console.error('タスク削除中にエラーが発生しました:', error)
      appState.getComponent('notifications').showError('タスクの削除に失敗しました')
    }
  }

  // タスク削除の取り消し
  async undoTaskDelete(originalTask) {
    try {
      const result = await this.taskService.restoreTask(originalTask)

      await this.refreshTaskList()
      this.updateHeaderStats()

      appState.getComponent('notifications').showSuccess(
        result.message,
        { duration: APP_CONFIG.UI.NOTIFICATIONS.SUCCESS_DURATION - 1000 }
      )
    } catch (error) {
      console.error('タスク復元中にエラーが発生しました:', error)
      appState.getComponent('notifications').showError('タスクの復元に失敗しました')
    }
  }

  // 空状態の表示切り替え
  toggleEmptyState(isEmpty, hasAllTasks) {
    const emptyState = document.getElementById('empty-state')

    if (emptyState) {
      if (isEmpty) {
        emptyState.style.display = 'flex'

        const titleElement = emptyState.querySelector('.empty-title')
        const messageElement = emptyState.querySelector('.empty-message')

        if (hasAllTasks) {
          titleElement.textContent = '該当するタスクがありません'
          messageElement.textContent = 'フィルター条件を変更してみてください'
        } else {
          titleElement.textContent = 'タスクがありません'
          messageElement.textContent = '新規タスクを追加して始めましょう！'
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

  // 初期化エラーハンドリング
  handleInitializationError(error) {
    appState.getComponent('notifications')?.showError(
      'アプリケーションの初期化に失敗しました。ページを再読み込みしてください。'
    )
  }

  // クリーンアップ処理
  cleanup() {
    try {
      if (this.keyboardService) {
        this.keyboardService.destroy()
      }
      appState.cleanup()
    } catch (error) {
      console.error('クリーンアップ中にエラーが発生しました:', error)
    }
  }

  // グローバルエラーハンドリング
  handleGlobalError(error) {
    console.error('予期しないエラーが発生しました:', error)

    appState.getComponent('notifications')?.showError(
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
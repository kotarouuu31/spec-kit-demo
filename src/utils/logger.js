// ログシステム - 統合的なエラーハンドリングとログ管理
export class Logger {
  constructor(appName = 'TodoApp') {
    this.appName = appName
    this.logLevel = this.getLogLevel()
    this.errorHistory = []
    this.maxErrorHistory = 100
    this.init()
  }

  // ログレベルの取得
  getLogLevel() {
    // 開発環境では詳細ログ、本番環境では警告以上のみ
    return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
  }

  // 初期化
  init() {
    // グローバルエラーハンドラーの設定
    this.setupGlobalErrorHandlers()
    this.info(`${this.appName}のログシステムが初期化されました`)
  }

  // グローバルエラーハンドラーの設定
  setupGlobalErrorHandlers() {
    // JavaScript実行時エラー
    window.addEventListener('error', (event) => {
      this.error('実行時エラー', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    })

    // Promise拒否エラー
    window.addEventListener('unhandledrejection', (event) => {
      this.error('未処理のPromise拒否', {
        reason: event.reason,
        promise: event.promise
      })
    })

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        this.error('リソース読み込みエラー', {
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          message: event.message
        })
      }
    }, true)
  }

  // ログレベルチェック
  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    return levels[level] >= levels[this.logLevel]
  }

  // フォーマット済みログメッセージ生成
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${this.appName}] [${level.toUpperCase()}]`
    
    let formattedMessage = `${prefix} ${message}`
    
    if (Object.keys(context).length > 0) {
      formattedMessage += '\nコンテキスト: ' + JSON.stringify(context, null, 2)
    }
    
    return formattedMessage
  }

  // デバッグログ
  debug(message, context = {}) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  // 情報ログ
  info(message, context = {}) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  // 警告ログ
  warn(message, context = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  // エラーログ
  error(message, context = {}) {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message, context)
      console.error(formattedMessage)
      
      // エラー履歴に保存
      this.addToErrorHistory({
        timestamp: new Date().toISOString(),
        message,
        context,
        formattedMessage
      })
    }
  }

  // エラー履歴への追加
  addToErrorHistory(errorData) {
    this.errorHistory.push(errorData)
    
    // 履歴サイズ制限
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory)
    }
  }

  // パフォーマンス測定開始
  startTimer(label) {
    console.time(`${this.appName}-${label}`)
  }

  // パフォーマンス測定終了
  endTimer(label) {
    console.timeEnd(`${this.appName}-${label}`)
  }

  // データベース操作のログ
  logDbOperation(operation, tableName, data = {}) {
    this.debug(`DB操作: ${operation}`, {
      table: tableName,
      data: data
    })
  }

  // UIイベントのログ
  logUserAction(action, component, details = {}) {
    this.info(`ユーザーアクション: ${action}`, {
      component,
      details
    })
  }

  // API呼び出しのログ
  logApiCall(method, url, data = {}) {
    this.debug(`API呼び出し: ${method} ${url}`, data)
  }

  // エラー履歴の取得
  getErrorHistory() {
    return [...this.errorHistory]
  }

  // エラー履歴のクリア
  clearErrorHistory() {
    this.errorHistory = []
    this.info('エラー履歴をクリアしました')
  }

  // システム情報のログ
  logSystemInfo() {
    const systemInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: new Date().toISOString()
    }

    this.info('システム情報', systemInfo)
    return systemInfo
  }

  // ログのエクスポート（デバッグ用）
  exportLogs() {
    const logs = {
      appName: this.appName,
      logLevel: this.logLevel,
      errorHistory: this.getErrorHistory(),
      systemInfo: this.logSystemInfo(),
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(logs, null, 2)], 
      { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${this.appName}-logs-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    this.info('ログをエクスポートしました')
  }

  // クリーンアップ
  destroy() {
    this.info(`${this.appName}のログシステムをシャットダウンします`)
    this.clearErrorHistory()
  }
}

// グローバルログインスタンス
export const logger = new Logger('TodoApp')

// エラーハンドリングユーティリティ
export class ErrorHandler {
  constructor(logger, notificationManager = null) {
    this.logger = logger
    this.notificationManager = notificationManager
  }

  // 安全な非同期関数実行
  async safeAsync(fn, context = 'unknown') {
    try {
      return await fn()
    } catch (error) {
      this.handleError(error, context)
      throw error // re-throw for caller handling
    }
  }

  // 安全な同期関数実行
  safeSync(fn, context = 'unknown') {
    try {
      return fn()
    } catch (error) {
      this.handleError(error, context)
      throw error
    }
  }

  // エラー処理
  handleError(error, context = 'unknown') {
    this.logger.error(`エラーが発生しました [${context}]`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context
    })

    // 通知システムがある場合は通知表示
    if (this.notificationManager) {
      const userMessage = this.getUserFriendlyMessage(error)
      this.notificationManager.showError(userMessage)
    }
  }

  // ユーザー向けエラーメッセージ生成
  getUserFriendlyMessage(error) {
    if (error.name === 'ValidationError') {
      return error.message.replace('ValidationError: ', '')
    }
    
    if (error.name === 'DatabaseError') {
      return 'データベースエラーが発生しました。再試行してください。'
    }
    
    if (error.name === 'NotFoundError') {
      return '指定されたデータが見つかりませんでした。'
    }
    
    // デフォルトメッセージ
    return '予期しないエラーが発生しました。'
  }

  // 重要なエラーの判定
  isCriticalError(error) {
    const criticalErrors = [
      'DatabaseError',
      'SecurityError',
      'NetworkError'
    ]
    return criticalErrors.includes(error.name)
  }
}
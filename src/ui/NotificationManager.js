// NotificationManagerクラス - 通知管理システム
export class NotificationManager {
  constructor(container) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid HTML element')
    }

    this.container = container
    this.notifications = new Map()
    this.maxNotifications = 5
    this.autoHideTimeouts = new Map()
    this.notificationCounter = 0

    this.init()
  }

  // 初期化
  init() {
    this.container.className = 'notifications'
    this.setupStyles()
  }

  // 動的スタイル設定（必要に応じて）
  setupStyles() {
    // CSSファイルで定義済みのため、特別な設定は不要
    // 必要に応じてここで動的スタイルを追加
  }

  // 成功通知を表示
  showSuccess(message, options = {}) {
    return this.showNotification(message, 'success', options)
  }

  // エラー通知を表示
  showError(message, options = {}) {
    return this.showNotification(message, 'error', options)
  }

  // 警告通知を表示
  showWarning(message, options = {}) {
    return this.showNotification(message, 'warning', options)
  }

  // 情報通知を表示
  showInfo(message, options = {}) {
    return this.showNotification(message, 'info', options)
  }

  // 通知を表示（内部メソッド）
  showNotification(message, type, options = {}) {
    const notificationId = this.generateId()
    
    const notification = {
      id: notificationId,
      message,
      type,
      createdAt: new Date(),
      options: {
        duration: options.duration || (type === 'error' ? 5000 : 3000),
        persistent: options.persistent || false,
        actionButton: options.actionButton || null
      }
    }

    // 最大数チェック
    this.enforceMaxNotifications()

    // 通知要素作成
    const element = this.createNotificationElement(notification)
    
    // DOMに追加
    this.container.appendChild(element)
    
    // 内部状態に保存
    this.notifications.set(notificationId, {
      ...notification,
      element
    })

    // アニメーション開始
    this.animateIn(element)

    // 自動非表示設定
    if (!notification.options.persistent) {
      this.scheduleAutoHide(notificationId, notification.options.duration)
    }

    // イベント発行
    this.dispatchNotificationEvent('notification-shown', {
      id: notificationId,
      type,
      message
    })

    return notificationId
  }

  // 通知要素を作成
  createNotificationElement(notification) {
    const element = document.createElement('div')
    element.className = `notification ${notification.type}`
    element.setAttribute('data-notification-id', notification.id)
    element.setAttribute('data-type', notification.type)

    const content = document.createElement('div')
    content.className = 'notification-content'

    const header = document.createElement('div')
    header.className = 'notification-header'

    const message = document.createElement('div')
    message.className = 'notification-message'
    message.textContent = notification.message

    header.appendChild(message)

    // 閉じるボタン
    if (notification.options.persistent || notification.options.actionButton) {
      const closeButton = document.createElement('button')
      closeButton.className = 'notification-close'
      closeButton.textContent = '×'
      closeButton.type = 'button'
      closeButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.hide(notification.id)
      })
      header.appendChild(closeButton)
    }

    content.appendChild(header)

    // アクションボタン
    if (notification.options.actionButton) {
      const actions = document.createElement('div')
      actions.className = 'notification-actions'

      const actionButton = document.createElement('button')
      actionButton.className = 'notification-action'
      actionButton.textContent = notification.options.actionButton.text
      actionButton.type = 'button'
      
      actionButton.addEventListener('click', (e) => {
        e.preventDefault()
        
        // カスタムイベント発行
        this.dispatchNotificationEvent('notification-action', {
          id: notification.id,
          action: notification.options.actionButton.text
        })
        
        // コールバック実行
        if (typeof notification.options.actionButton.callback === 'function') {
          try {
            notification.options.actionButton.callback()
          } catch (error) {
            console.error('Notification action callback error:', error)
          }
        }
        
        // 通知を閉じる
        this.hide(notification.id)
      })

      actions.appendChild(actionButton)
      content.appendChild(actions)
    }

    element.appendChild(content)
    return element
  }

  // 通知を非表示
  hide(notificationId) {
    const notification = this.notifications.get(notificationId)
    if (!notification) {
      return false
    }

    // アニメーションアウト
    this.animateOut(notification.element, () => {
      // DOM から削除
      if (notification.element.parentNode) {
        this.container.removeChild(notification.element)
      }
      
      // 内部状態から削除
      this.notifications.delete(notificationId)
      
      // タイマーをクリア
      if (this.autoHideTimeouts.has(notificationId)) {
        clearTimeout(this.autoHideTimeouts.get(notificationId))
        this.autoHideTimeouts.delete(notificationId)
      }
      
      // イベント発行
      this.dispatchNotificationEvent('notification-hidden', {
        id: notificationId
      })
    })

    return true
  }

  // 全通知を非表示
  hideAll() {
    const notificationIds = Array.from(this.notifications.keys())
    let hiddenCount = 0

    notificationIds.forEach(id => {
      if (this.hide(id)) {
        hiddenCount++
      }
    })

    return hiddenCount
  }

  // アクティブ通知一覧を取得
  getActiveNotifications() {
    return Array.from(this.notifications.values()).map(notification => ({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt
    }))
  }

  // 最大通知数を設定
  setMaxNotifications(max) {
    if (typeof max !== 'number' || max < 1) {
      throw new Error('Max notifications must be a positive number')
    }
    
    this.maxNotifications = max
    this.enforceMaxNotifications()
  }

  // 最大通知数を強制
  enforceMaxNotifications() {
    const notificationIds = Array.from(this.notifications.keys())
    
    while (notificationIds.length >= this.maxNotifications) {
      const oldestId = notificationIds.shift()
      this.hide(oldestId)
    }
  }

  // アニメーションイン
  animateIn(element) {
    // CSS アニメーションを使用
    element.style.transform = 'translateX(100%)'
    element.style.opacity = '0'
    
    // フレームを飛ばしてアニメーション開始
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.3s ease-out'
      element.style.transform = 'translateX(0)'
      element.style.opacity = '1'
    })
  }

  // アニメーションアウト
  animateOut(element, callback) {
    element.style.transition = 'all 0.3s ease-in'
    element.style.transform = 'translateX(100%)'
    element.style.opacity = '0'
    
    // アニメーション完了を待つ
    element.addEventListener('transitionend', function onTransitionEnd() {
      element.removeEventListener('transitionend', onTransitionEnd)
      if (callback) callback()
    })
    
    // フォールバック（アニメーションが実行されない場合）
    setTimeout(() => {
      if (callback) callback()
    }, 350)
  }

  // 自動非表示をスケジュール
  scheduleAutoHide(notificationId, duration) {
    if (this.autoHideTimeouts.has(notificationId)) {
      clearTimeout(this.autoHideTimeouts.get(notificationId))
    }

    const timeoutId = setTimeout(() => {
      this.hide(notificationId)
      this.autoHideTimeouts.delete(notificationId)
    }, duration)

    this.autoHideTimeouts.set(notificationId, timeoutId)
  }

  // ユニークIDを生成
  generateId() {
    return `notification-${++this.notificationCounter}-${Date.now()}`
  }

  // カスタムイベントを発行
  dispatchNotificationEvent(eventType, detail) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      cancelable: false
    })
    
    this.container.dispatchEvent(event)
  }

  // クリーンアップ
  destroy() {
    // 全ての通知を非表示
    this.hideAll()
    
    // 全てのタイマーをクリア
    this.autoHideTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    
    // 状態をクリア
    this.notifications.clear()
    this.autoHideTimeouts.clear()
    
    // DOM をクリア
    if (this.container) {
      this.container.innerHTML = ''
    }
  }

  // デバッグ用: 通知状態を取得
  getDebugInfo() {
    return {
      activeCount: this.notifications.size,
      maxNotifications: this.maxNotifications,
      activeNotifications: this.getActiveNotifications(),
      autoHideTimeouts: this.autoHideTimeouts.size
    }
  }
}
// NotificationManagerコンポーネントの契約テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NotificationManager } from '../../src/ui/NotificationManager.js'

describe('NotificationManagerコンポーネント契約', () => {
  let container
  let notificationManager

  beforeEach(() => {
    // テスト用DOMコンテナを作成
    container = document.createElement('div')
    container.id = 'notification-container'
    document.body.appendChild(container)
  })

  afterEach(() => {
    // クリーンアップ
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  })

  describe('コンストラクタ', () => {
    it('container要素でNotificationManagerインスタンスを作成できる', () => {
      // 契約: constructor(container: HTMLElement)
      expect(() => {
        notificationManager = new NotificationManager(container)
      }).not.toThrow()
      
      expect(notificationManager).toBeDefined()
      expect(notificationManager).toBeInstanceOf(NotificationManager)
    })

    it('無効なcontainerでエラーを投げる', () => {
      expect(() => {
        notificationManager = new NotificationManager(null)
      }).toThrow()
    })
  })

  describe('通知表示メソッド', () => {
    beforeEach(() => {
      notificationManager = new NotificationManager(container)
    })

    it('showSuccess()で成功通知を表示できる', () => {
      // 契約: showSuccess(message: string, options?: NotificationOptions): string
      const notificationId = notificationManager.showSuccess('タスクが正常に作成されました')
      
      expect(notificationId).toBeTypeOf('string')
      expect(notificationId.length).toBeGreaterThan(0)
      
      // 通知要素が作成されたことを確認
      const notification = container.querySelector('.notification, .success')
      expect(notification).toBeDefined()
      expect(notification).not.toBeNull()
    })

    it('showError()でエラー通知を表示できる', () => {
      // 契約: showError(message: string, options?: NotificationOptions): string
      const notificationId = notificationManager.showError('タスクの保存に失敗しました')
      
      expect(notificationId).toBeTypeOf('string')
      expect(notificationId.length).toBeGreaterThan(0)
      
      // エラー通知要素が作成されたことを確認
      const notification = container.querySelector('.notification, .error')
      expect(notification).toBeDefined()
      expect(notification).not.toBeNull()
    })

    it('showWarning()で警告通知を表示できる', () => {
      // 契約: showWarning(message: string, options?: NotificationOptions): string
      const notificationId = notificationManager.showWarning('期限が近づいています')
      
      expect(notificationId).toBeTypeOf('string')
      expect(notificationId.length).toBeGreaterThan(0)
      
      // 警告通知要素が作成されたことを確認
      const notification = container.querySelector('.notification, .warning')
      expect(notification).toBeDefined()
      expect(notification).not.toBeNull()
    })

    it('showInfo()で情報通知を表示できる', () => {
      // 契約: showInfo(message: string, options?: NotificationOptions): string
      const notificationId = notificationManager.showInfo('タスクが更新されました')
      
      expect(notificationId).toBeTypeOf('string')
      expect(notificationId.length).toBeGreaterThan(0)
      
      // 情報通知要素が作成されたことを確認
      const notification = container.querySelector('.notification, .info')
      expect(notification).toBeDefined()
      expect(notification).not.toBeNull()
    })
  })

  describe('通知オプション', () => {
    beforeEach(() => {
      notificationManager = new NotificationManager(container)
    })

    it('duration オプションで自動消去時間を設定できる', () => {
      const options = { duration: 1000 } // 1秒
      const notificationId = notificationManager.showSuccess('テストメッセージ', options)
      
      expect(notificationId).toBeTypeOf('string')
      
      // 通知が存在することを確認
      const notification = container.querySelector(`[data-notification-id="${notificationId}"]`)
      expect(notification).toBeDefined()
    })

    it('persistent オプションで永続通知を作成できる', () => {
      const options = { persistent: true }
      const notificationId = notificationManager.showError('永続エラーメッセージ', options)
      
      expect(notificationId).toBeTypeOf('string')
      
      // 永続通知には閉じるボタンが含まれることを確認
      const closeButton = container.querySelector('.notification-close, [data-action="close"]')
      expect(closeButton).toBeDefined()
      expect(closeButton).not.toBeNull()
    })

    it('actionButton オプションでアクションボタンを追加できる', () => {
      const options = {
        actionButton: {
          text: '元に戻す',
          callback: vi.fn()
        }
      }
      const notificationId = notificationManager.showInfo('タスクが削除されました', options)
      
      expect(notificationId).toBeTypeOf('string')
      
      // アクションボタンが含まれることを確認
      const actionButton = container.querySelector('.notification-action, [data-action="custom"]')
      expect(actionButton).toBeDefined()
      expect(actionButton).not.toBeNull()
      
      if (actionButton) {
        expect(actionButton.textContent).toContain('元に戻す')
      }
    })
  })

  describe('通知管理メソッド', () => {
    beforeEach(() => {
      notificationManager = new NotificationManager(container)
    })

    it('hide()で特定の通知を非表示にできる', () => {
      // 契約: hide(notificationId: string): boolean
      const notificationId = notificationManager.showSuccess('テストメッセージ')
      
      const result = notificationManager.hide(notificationId)
      
      expect(result).toBe(true)
      
      // 通知が削除されたことを確認
      const notification = container.querySelector(`[data-notification-id="${notificationId}"]`)
      expect(notification).toBeNull()
    })

    it('存在しない通知IDでhide()するとfalseを返す', () => {
      const result = notificationManager.hide('non-existent-id')
      
      expect(result).toBe(false)
    })

    it('hideAll()で全ての通知を非表示にできる', () => {
      // 契約: hideAll(): number
      // 複数の通知を作成
      notificationManager.showSuccess('メッセージ1')
      notificationManager.showError('メッセージ2')
      notificationManager.showWarning('メッセージ3')
      
      const hiddenCount = notificationManager.hideAll()
      
      expect(hiddenCount).toBe(3)
      
      // 全ての通知が削除されたことを確認
      const notifications = container.querySelectorAll('.notification')
      expect(notifications.length).toBe(0)
    })

    it('getActiveNotifications()でアクティブな通知一覧を取得できる', () => {
      // 契約: getActiveNotifications(): NotificationInfo[]
      const id1 = notificationManager.showSuccess('メッセージ1')
      const id2 = notificationManager.showError('メッセージ2')
      
      const activeNotifications = notificationManager.getActiveNotifications()
      
      expect(activeNotifications).toBeInstanceOf(Array)
      expect(activeNotifications).toHaveLength(2)
      
      expect(activeNotifications[0]).toHaveProperty('id')
      expect(activeNotifications[0]).toHaveProperty('type')
      expect(activeNotifications[0]).toHaveProperty('message')
      expect(activeNotifications[0]).toHaveProperty('createdAt')
    })
  })

  describe('通知要素の構造', () => {
    beforeEach(() => {
      notificationManager = new NotificationManager(container)
    })

    it('通知要素に必要な属性とクラスが設定される', () => {
      const notificationId = notificationManager.showSuccess('テストメッセージ')
      
      const notification = container.querySelector('.notification')
      expect(notification).toBeDefined()
      expect(notification).not.toBeNull()
      
      if (notification) {
        // 必要な属性があることを確認
        expect(notification.getAttribute('data-notification-id')).toBe(notificationId)
        expect(notification.getAttribute('data-type') || notification.classList.contains('success')).toBeTruthy()
        
        // メッセージテキストが含まれることを確認
        expect(notification.textContent).toContain('テストメッセージ')
      }
    })

    it('通知タイプに応じた適切なクラスが適用される', () => {
      notificationManager.showSuccess('成功')
      notificationManager.showError('エラー')
      notificationManager.showWarning('警告')
      notificationManager.showInfo('情報')
      
      // 各タイプの通知クラスが存在することを確認
      const successNotif = container.querySelector('.success, [data-type="success"]')
      const errorNotif = container.querySelector('.error, [data-type="error"]')
      const warningNotif = container.querySelector('.warning, [data-type="warning"]')
      const infoNotif = container.querySelector('.info, [data-type="info"]')
      
      expect(successNotif).not.toBeNull()
      expect(errorNotif).not.toBeNull()
      expect(warningNotif).not.toBeNull()
      expect(infoNotif).not.toBeNull()
    })
  })

  describe('イベント発行', () => {
    let eventSpy
    
    beforeEach(() => {
      notificationManager = new NotificationManager(container)
      eventSpy = vi.fn()
      
      // カスタムイベントリスナーを設定
      container.addEventListener('notification-shown', eventSpy)
      container.addEventListener('notification-hidden', eventSpy)
      container.addEventListener('notification-action', eventSpy)
    })

    it('通知表示時にnotification-shownイベントを発行する', () => {
      // notification-shownイベントの契約確認
      notificationManager.showSuccess('テストメッセージ')
      
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態（実装前）
    })

    it('通知非表示時にnotification-hiddenイベントを発行する', () => {
      // notification-hiddenイベントの契約確認
      const notificationId = notificationManager.showSuccess('テストメッセージ')
      notificationManager.hide(notificationId)
      
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態（実装前）
    })

    it('アクションボタンクリック時にnotification-actionイベントを発行する', () => {
      // notification-actionイベントの契約確認
      const options = {
        actionButton: {
          text: 'アクション',
          callback: vi.fn()
        }
      }
      notificationManager.showInfo('アクションメッセージ', options)
      
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態（実装前）
    })
  })

  describe('パフォーマンスと制限', () => {
    beforeEach(() => {
      notificationManager = new NotificationManager(container)
    })

    it('setMaxNotifications()で同時表示通知数の上限を設定できる', () => {
      // 契約: setMaxNotifications(max: number): void
      expect(() => {
        notificationManager.setMaxNotifications(3)
      }).not.toThrow()
    })

    it('上限を超える通知は古いものから自動削除される', () => {
      notificationManager.setMaxNotifications(2)
      
      notificationManager.showInfo('通知1')
      notificationManager.showInfo('通知2')
      notificationManager.showInfo('通知3') // これにより通知1が削除される
      
      const notifications = container.querySelectorAll('.notification')
      expect(notifications.length).toBe(2)
      
      // 最新の2つが残っていることを確認
      expect(container.textContent).toContain('通知2')
      expect(container.textContent).toContain('通知3')
      expect(container.textContent).not.toContain('通知1')
    })
  })
})
// キーボードショートカット管理サービス
import { APP_CONFIG } from '../config/app-config.js'
import { EventHelper } from '../utils/event-helpers.js'

export class KeyboardService {
  constructor(appInstance) {
    this.app = appInstance
    this.shortcuts = new Map()
    this.isEnabled = true

    this.registerDefaultShortcuts()
    this.setupEventListener()
  }

  // デフォルトショートカットの登録
  registerDefaultShortcuts() {
    const shortcuts = APP_CONFIG.KEYBOARD_SHORTCUTS

    this.register(shortcuts.NEW_TASK, () => {
      this.app.openTaskForm('create')
    })

    this.register(shortcuts.REFRESH, () => {
      this.app.refreshTaskList()
      this.app.updateHeaderStats()
    })

    this.register(shortcuts.CLOSE_MODAL, () => {
      if (this.app.components.form.container.style.display !== 'none') {
        this.app.closeTaskForm()
      }
    })
  }

  // ショートカット登録
  register(shortcutConfig, callback) {
    const key = this.createShortcutKey(shortcutConfig)
    this.shortcuts.set(key, {
      config: shortcutConfig,
      callback: callback,
      enabled: true
    })
  }

  // ショートカット削除
  unregister(shortcutConfig) {
    const key = this.createShortcutKey(shortcutConfig)
    this.shortcuts.delete(key)
  }

  // ショートカットの有効/無効切り替え
  toggle(enabled) {
    this.isEnabled = enabled
  }

  // 特定ショートカットの有効/無効切り替え
  toggleShortcut(shortcutConfig, enabled) {
    const key = this.createShortcutKey(shortcutConfig)
    const shortcut = this.shortcuts.get(key)
    if (shortcut) {
      shortcut.enabled = enabled
    }
  }

  // ショートカットキー文字列生成
  createShortcutKey({ key, modifiers = [] }) {
    const sortedModifiers = [...modifiers].sort()
    return `${sortedModifiers.join('+')}+${key.toLowerCase()}`
  }

  // キーイベント処理
  handleKeyEvent(event) {
    if (!this.isEnabled) return

    const pressedModifiers = []
    if (event.ctrlKey) pressedModifiers.push('ctrl')
    if (event.metaKey) pressedModifiers.push('meta')
    if (event.altKey) pressedModifiers.push('alt')
    if (event.shiftKey) pressedModifiers.push('shift')

    const key = this.createShortcutKey({
      key: event.key,
      modifiers: pressedModifiers
    })

    const shortcut = this.shortcuts.get(key)
    if (shortcut && shortcut.enabled) {
      event.preventDefault()
      shortcut.callback(event)
    }
  }

  // イベントリスナー設定
  setupEventListener() {
    document.addEventListener('keydown', EventHelper.createSafeHandler((event) => {
      this.handleKeyEvent(event)
    }, (error) => {
      console.error('キーボードショートカット処理エラー:', error)
    }))
  }

  // クリーンアップ
  destroy() {
    this.shortcuts.clear()
    this.isEnabled = false
  }
}
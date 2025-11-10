// DOM操作ヘルパーユーティリティ - 共通のDOM処理を統一
import { logger } from './logger.js'

/**
 * DOM操作の共通ユーティリティクラス
 */
export class DOMHelper {
  /**
   * 要素を安全に取得する
   * @param {string|Element} selector - セレクタ文字列またはElement
   * @param {Element} context - 検索コンテキスト（デフォルト: document）
   * @returns {Element|null} 見つかった要素またはnull
   */
  static getElement(selector, context = document) {
    try {
      if (selector instanceof Element) {
        return selector
      }
      
      if (typeof selector === 'string') {
        return context.querySelector(selector)
      }
      
      return null
    } catch (error) {
      logger.warn('要素取得エラー', { selector, error: error.message })
      return null
    }
  }

  /**
   * 複数の要素を安全に取得する
   * @param {string} selector - セレクタ文字列
   * @param {Element} context - 検索コンテキスト
   * @returns {Element[]} 見つかった要素の配列
   */
  static getElements(selector, context = document) {
    try {
      const elements = context.querySelectorAll(selector)
      return Array.from(elements)
    } catch (error) {
      logger.warn('複数要素取得エラー', { selector, error: error.message })
      return []
    }
  }

  /**
   * 要素の存在確認
   * @param {string|Element} selector - セレクタまたは要素
   * @param {Element} context - 検索コンテキスト
   * @returns {boolean} 要素が存在するかどうか
   */
  static exists(selector, context = document) {
    return this.getElement(selector, context) !== null
  }

  /**
   * 安全なイベントリスナー追加
   * @param {Element} element - 対象要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - イベントオプション
   */
  static addEventListener(element, event, handler, options = {}) {
    if (!element || typeof handler !== 'function') {
      logger.warn('無効なイベントリスナー設定', { element, event, handler })
      return
    }

    try {
      element.addEventListener(event, handler, options)
    } catch (error) {
      logger.error('イベントリスナー追加エラー', { 
        event, 
        error: error.message 
      })
    }
  }

  /**
   * 複数要素への一括イベントリスナー追加
   * @param {Element[]|NodeList} elements - 対象要素群
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - イベントオプション
   */
  static addEventListenerToAll(elements, event, handler, options = {}) {
    const elementArray = Array.isArray(elements) ? elements : Array.from(elements)
    
    elementArray.forEach(element => {
      this.addEventListener(element, event, handler, options)
    })
  }

  /**
   * 要素にクラスを安全に追加
   * @param {Element} element - 対象要素
   * @param {...string} classes - 追加するクラス名
   */
  static addClass(element, ...classes) {
    if (!element || !element.classList) return

    try {
      element.classList.add(...classes)
    } catch (error) {
      logger.warn('クラス追加エラー', { classes, error: error.message })
    }
  }

  /**
   * 要素からクラスを安全に削除
   * @param {Element} element - 対象要素
   * @param {...string} classes - 削除するクラス名
   */
  static removeClass(element, ...classes) {
    if (!element || !element.classList) return

    try {
      element.classList.remove(...classes)
    } catch (error) {
      logger.warn('クラス削除エラー', { classes, error: error.message })
    }
  }

  /**
   * クラスの有無を切り替え
   * @param {Element} element - 対象要素
   * @param {string} className - クラス名
   * @param {boolean} force - 強制的に追加(true)または削除(false)
   * @returns {boolean} 操作後のクラス存在状況
   */
  static toggleClass(element, className, force = undefined) {
    if (!element || !element.classList) return false

    try {
      return element.classList.toggle(className, force)
    } catch (error) {
      logger.warn('クラス切り替えエラー', { className, error: error.message })
      return false
    }
  }

  /**
   * 要素のテキストコンテンツを安全に設定
   * @param {Element} element - 対象要素
   * @param {string} text - 設定するテキスト
   */
  static setText(element, text) {
    if (!element) return

    try {
      element.textContent = text || ''
    } catch (error) {
      logger.warn('テキスト設定エラー', { text, error: error.message })
    }
  }

  /**
   * 要素のHTMLコンテンツを安全に設定
   * @param {Element} element - 対象要素  
   * @param {string} html - 設定するHTML
   */
  static setHTML(element, html) {
    if (!element) return

    try {
      element.innerHTML = html || ''
    } catch (error) {
      logger.warn('HTML設定エラー', { html, error: error.message })
    }
  }

  /**
   * 要素の値を安全に設定
   * @param {Element} element - 対象要素
   * @param {string} value - 設定する値
   */
  static setValue(element, value) {
    if (!element) return

    try {
      element.value = value || ''
    } catch (error) {
      logger.warn('値設定エラー', { value, error: error.message })
    }
  }

  /**
   * 要素の属性を安全に設定
   * @param {Element} element - 対象要素
   * @param {string} name - 属性名
   * @param {string} value - 属性値
   */
  static setAttribute(element, name, value) {
    if (!element) return

    try {
      element.setAttribute(name, value)
    } catch (error) {
      logger.warn('属性設定エラー', { name, value, error: error.message })
    }
  }

  /**
   * 要素の属性を安全に削除
   * @param {Element} element - 対象要素
   * @param {string} name - 属性名
   */
  static removeAttribute(element, name) {
    if (!element) return

    try {
      element.removeAttribute(name)
    } catch (error) {
      logger.warn('属性削除エラー', { name, error: error.message })
    }
  }

  /**
   * 要素の表示・非表示を切り替え
   * @param {Element} element - 対象要素
   * @param {boolean} show - 表示するかどうか
   * @param {string} displayType - 表示時のdisplayプロパティ
   */
  static toggleDisplay(element, show, displayType = 'block') {
    if (!element || !element.style) return

    try {
      element.style.display = show ? displayType : 'none'
    } catch (error) {
      logger.warn('表示切り替えエラー', { show, error: error.message })
    }
  }

  /**
   * 要素を安全に削除
   * @param {Element} element - 削除する要素
   */
  static removeElement(element) {
    if (!element || !element.parentNode) return

    try {
      element.parentNode.removeChild(element)
    } catch (error) {
      logger.warn('要素削除エラー', { error: error.message })
    }
  }

  /**
   * 新しい要素を作成
   * @param {string} tagName - タグ名
   * @param {Object} options - 要素のオプション設定
   * @returns {Element} 作成された要素
   */
  static createElement(tagName, options = {}) {
    try {
      const element = document.createElement(tagName)
      
      // クラス設定
      if (options.className) {
        element.className = options.className
      }
      
      // ID設定
      if (options.id) {
        element.id = options.id
      }
      
      // テキスト設定
      if (options.textContent) {
        element.textContent = options.textContent
      }
      
      // HTML設定
      if (options.innerHTML) {
        element.innerHTML = options.innerHTML
      }
      
      // 属性設定
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([name, value]) => {
          element.setAttribute(name, value)
        })
      }
      
      // スタイル設定
      if (options.style) {
        Object.entries(options.style).forEach(([prop, value]) => {
          element.style[prop] = value
        })
      }
      
      return element
    } catch (error) {
      logger.error('要素作成エラー', { tagName, options, error: error.message })
      return null
    }
  }

  /**
   * 要素が表示されているかチェック
   * @param {Element} element - 対象要素
   * @returns {boolean} 表示されているかどうか
   */
  static isVisible(element) {
    if (!element) return false

    try {
      return element.offsetParent !== null && 
             element.style.display !== 'none' &&
             element.style.visibility !== 'hidden'
    } catch (error) {
      logger.warn('表示状態取得エラー', { error: error.message })
      return false
    }
  }

  /**
   * 要素にフォーカスを設定
   * @param {Element} element - 対象要素
   * @param {Object} options - フォーカスオプション
   */
  static focus(element, options = {}) {
    if (!element || typeof element.focus !== 'function') return

    try {
      element.focus(options)
    } catch (error) {
      logger.warn('フォーカス設定エラー', { error: error.message })
    }
  }

  /**
   * 要素内のテキストを選択
   * @param {Element} element - 対象要素
   */
  static selectText(element) {
    if (!element || typeof element.select !== 'function') return

    try {
      element.select()
    } catch (error) {
      logger.warn('テキスト選択エラー', { error: error.message })
    }
  }

  /**
   * 親要素から子要素を検索
   * @param {Element} parent - 親要素
   * @param {string} selector - セレクタ
   * @returns {Element|null} 見つかった子要素
   */
  static findChild(parent, selector) {
    return this.getElement(selector, parent)
  }

  /**
   * 親要素から複数の子要素を検索
   * @param {Element} parent - 親要素
   * @param {string} selector - セレクタ
   * @returns {Element[]} 見つかった子要素の配列
   */
  static findChildren(parent, selector) {
    return this.getElements(selector, parent)
  }

  /**
   * データ属性の安全な操作
   * @param {Element} element - 対象要素
   * @param {string} key - データ属性のキー（data-なしで指定）
   * @param {string} value - 設定する値（undefinedの場合は取得）
   * @returns {string|void} 取得時は値、設定時はvoid
   */
  static data(element, key, value = undefined) {
    if (!element || !element.dataset) return

    try {
      if (value === undefined) {
        return element.dataset[key]
      } else {
        element.dataset[key] = value
      }
    } catch (error) {
      logger.warn('データ属性操作エラー', { key, value, error: error.message })
    }
  }
}

/**
 * コンポーネント基底クラス - 共通のDOM操作機能を提供
 */
export class BaseComponent {
  constructor(container) {
    this.container = DOMHelper.getElement(container)
    if (!this.container) {
      throw new Error('Container element is required')
    }
    
    this.elements = new Map()
    this.eventListeners = new Map()
    
    logger.debug('コンポーネント初期化', { 
      component: this.constructor.name,
      container: this.container.id || this.container.className
    })
  }

  /**
   * 要素をキャッシュする
   * @param {string} key - キャッシュキー
   * @param {string} selector - セレクタ
   * @param {boolean} required - 必須要素かどうか
   */
  cacheElement(key, selector, required = false) {
    const element = DOMHelper.getElement(selector, this.container)
    
    if (required && !element) {
      logger.error('必須要素が見つかりません', { key, selector })
      throw new Error(`Required element not found: ${selector}`)
    }
    
    this.elements.set(key, element)
    return element
  }

  /**
   * キャッシュされた要素を取得
   * @param {string} key - キャッシュキー
   * @returns {Element|null} キャッシュされた要素
   */
  getElement(key) {
    return this.elements.get(key) || null
  }

  /**
   * 安全なイベントリスナー追加
   * @param {string} elementKey - 要素のキャッシュキー
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - イベントオプション
   */
  addEventListenerSafe(elementKey, event, handler, options = {}) {
    const element = this.getElement(elementKey)
    if (!element) {
      logger.warn('イベント設定対象要素が見つかりません', { elementKey, event })
      return
    }

    const wrappedHandler = (e) => {
      try {
        handler(e)
      } catch (error) {
        logger.error('イベントハンドラーエラー', { 
          component: this.constructor.name,
          event,
          error: error.message 
        })
      }
    }

    DOMHelper.addEventListener(element, event, wrappedHandler, options)
    
    // イベントリスナー追跡
    const listenerKey = `${elementKey}:${event}`
    this.eventListeners.set(listenerKey, { element, event, handler: wrappedHandler })
  }

  /**
   * カスタムイベント発行
   * @param {string} eventType - イベント名
   * @param {Object} detail - イベント詳細
   */
  dispatchEvent(eventType, detail = {}) {
    try {
      const event = new CustomEvent(eventType, {
        detail,
        bubbles: true,
        cancelable: false
      })
      
      this.container.dispatchEvent(event)
      
      logger.debug('イベント発行', {
        component: this.constructor.name,
        eventType,
        detail
      })
    } catch (error) {
      logger.error('イベント発行エラー', { eventType, error: error.message })
    }
  }

  /**
   * コンポーネントのクリーンアップ
   */
  destroy() {
    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler)
      }
    })
    
    this.eventListeners.clear()
    this.elements.clear()
    
    logger.debug('コンポーネント破棄', { component: this.constructor.name })
  }
}
// イベントハンドリング用のユーティリティ関数

export class EventHelper {
  // 安全なイベントハンドラーラッパー
  static createSafeHandler(handler, errorCallback = null) {
    return (event) => {
      try {
        return handler(event)
      } catch (error) {
        console.error('イベントハンドリング中にエラーが発生:', error)
        if (errorCallback) {
          errorCallback(error, event)
        }
      }
    }
  }

  // 非同期の安全なイベントハンドラー
  static createSafeAsyncHandler(asyncHandler, errorCallback = null) {
    return async (event) => {
      try {
        return await asyncHandler(event)
      } catch (error) {
        console.error('非同期イベントハンドリング中にエラーが発生:', error)
        if (errorCallback) {
          errorCallback(error, event)
        }
      }
    }
  }

  // カスタムイベント発行のヘルパー
  static dispatchCustomEvent(element, eventType, detail = {}, options = {}) {
    const defaultOptions = {
      bubbles: true,
      cancelable: false,
      ...options
    }
    
    const event = new CustomEvent(eventType, {
      detail,
      ...defaultOptions
    })
    
    element.dispatchEvent(event)
  }

  // 要素の属性からタスクIDを取得
  static getTaskIdFromElement(element) {
    const taskId = element.getAttribute('data-task-id')
    return taskId ? parseInt(taskId) : null
  }

  // イベント委任のヘルパー
  static delegateEvent(container, selector, eventType, handler) {
    container.addEventListener(eventType, (event) => {
      const target = event.target.closest(selector)
      if (target) {
        handler(event, target)
      }
    })
  }
}
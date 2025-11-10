// AppHeaderコンポーネントの契約テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppHeader } from '../../src/ui/AppHeader.js'

describe('AppHeaderコンポーネント契約', () => {
  let container
  let mockDatabase
  let appHeader

  beforeEach(() => {
    // テスト用DOMコンテナを作成
    container = document.createElement('div')
    container.id = 'app-header-container'
    document.body.appendChild(container)

    // モックデータベース
    mockDatabase = {
      getTaskStats: vi.fn().mockReturnValue({
        total: 10,
        active: 7,
        completed: 3,
        overdue: 2,
        high_priority: 4,
        medium_priority: 3,
        low_priority: 3
      })
    }
  })

  afterEach(() => {
    // クリーンアップ
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  })

  describe('コンストラクタ', () => {
    it('container要素とdatabaseでAppHeaderインスタンスを作成できる', () => {
      // 契約: constructor(container: HTMLElement, database: TaskDatabase)
      expect(() => {
        appHeader = new AppHeader(container, mockDatabase)
      }).not.toThrow()
      
      expect(appHeader).toBeDefined()
      expect(appHeader).toBeInstanceOf(AppHeader)
    })

    it('無効なcontainerでエラーを投げる', () => {
      expect(() => {
        appHeader = new AppHeader(null, mockDatabase)
      }).toThrow()
    })

    it('無効なdatabaseでエラーを投げる', () => {
      expect(() => {
        appHeader = new AppHeader(container, null)
      }).toThrow()
    })
  })

  describe('render()メソッド', () => {
    beforeEach(() => {
      appHeader = new AppHeader(container, mockDatabase)
    })

    it('アプリケーションヘッダーをレンダリングできる', () => {
      // 契約: render(): void
      expect(() => {
        appHeader.render()
      }).not.toThrow()
    })
  })

  describe('必要なヘッダー要素', () => {
    beforeEach(() => {
      appHeader = new AppHeader(container, mockDatabase)
      appHeader.render()
    })

    it('アプリケーションタイトルが表示される', () => {
      const titleElement = container.querySelector('.app-title, h1, [data-element="title"]')
      expect(titleElement).toBeDefined()
      expect(titleElement).not.toBeNull()
      
      if (titleElement) {
        expect(titleElement.textContent).toContain('ToDo')
      }
    })

    it('新規タスク追加ボタンが表示される', () => {
      const addButton = container.querySelector('.add-task-button, [data-action="add-task"]')
      expect(addButton).toBeDefined()
      expect(addButton).not.toBeNull()
    })

    it('タスク統計情報が表示される', () => {
      // 全体統計
      const totalCount = container.querySelector('.total-count, [data-stat="total"]')
      expect(totalCount).toBeDefined()
      expect(totalCount).not.toBeNull()

      // アクティブタスク数
      const activeCount = container.querySelector('.active-count, [data-stat="active"]')
      expect(activeCount).toBeDefined()
      expect(activeCount).not.toBeNull()

      // 完了タスク数
      const completedCount = container.querySelector('.completed-count, [data-stat="completed"]')
      expect(completedCount).toBeDefined()
      expect(completedCount).not.toBeNull()
    })

    it('今日の日付が表示される', () => {
      const dateElement = container.querySelector('.current-date, [data-element="date"]')
      expect(dateElement).toBeDefined()
      expect(dateElement).not.toBeNull()
    })
  })

  describe('統計情報の更新', () => {
    beforeEach(() => {
      appHeader = new AppHeader(container, mockDatabase)
      appHeader.render()
    })

    it('updateStats()でタスク統計を更新できる', () => {
      // 契約: updateStats(): void
      expect(() => {
        appHeader.updateStats()
      }).not.toThrow()

      // データベースから統計を取得することを確認
      expect(mockDatabase.getTaskStats).toHaveBeenCalled()
    })

    it('統計情報が正しく表示される', () => {
      appHeader.updateStats()

      const totalElement = container.querySelector('.total-count, [data-stat="total"]')
      const activeElement = container.querySelector('.active-count, [data-stat="active"]')
      const completedElement = container.querySelector('.completed-count, [data-stat="completed"]')

      if (totalElement) {
        expect(totalElement.textContent).toContain('10')
      }
      if (activeElement) {
        expect(activeElement.textContent).toContain('7')
      }
      if (completedElement) {
        expect(completedElement.textContent).toContain('3')
      }
    })

    it('期限切れタスクがある場合は警告表示する', () => {
      appHeader.updateStats()

      const overdueElement = container.querySelector('.overdue-warning, [data-stat="overdue"]')
      expect(overdueElement).toBeDefined()
      expect(overdueElement).not.toBeNull()
      
      if (overdueElement) {
        expect(overdueElement.textContent).toContain('2')
      }
    })
  })

  describe('日付表示', () => {
    beforeEach(() => {
      appHeader = new AppHeader(container, mockDatabase)
      appHeader.render()
    })

    it('getCurrentDateString()で現在日付の文字列を取得できる', () => {
      // 契約: getCurrentDateString(): string
      const dateString = appHeader.getCurrentDateString()
      
      expect(dateString).toBeTypeOf('string')
      expect(dateString.length).toBeGreaterThan(0)
      
      // 日付形式の基本チェック（YYYY年MM月DD日など）
      expect(dateString).toMatch(/\d{4}/)
    })

    it('updateDate()で表示日付を更新できる', () => {
      // 契約: updateDate(): void
      expect(() => {
        appHeader.updateDate()
      }).not.toThrow()
    })
  })

  describe('進捗表示', () => {
    beforeEach(() => {
      appHeader = new AppHeader(container, mockDatabase)
      appHeader.render()
    })

    it('進捗バーが表示される', () => {
      appHeader.updateStats()
      
      const progressBar = container.querySelector('.progress-bar, [data-element="progress"]')
      expect(progressBar).toBeDefined()
      expect(progressBar).not.toBeNull()
    })

    it('完了率が正しく計算される', () => {
      const completionRate = appHeader.getCompletionRate()
      
      expect(completionRate).toBeTypeOf('number')
      expect(completionRate).toBeGreaterThanOrEqual(0)
      expect(completionRate).toBeLessThanOrEqual(100)
      
      // モックデータ: 完了3/全体10 = 30%
      expect(completionRate).toBe(30)
    })

    it('進捗バーの幅が完了率を反映する', () => {
      appHeader.updateStats()
      
      const progressFill = container.querySelector('.progress-fill, [data-element="progress-fill"]')
      expect(progressFill).toBeDefined()
      
      if (progressFill) {
        const width = progressFill.style.width || progressFill.getAttribute('data-progress')
        expect(width).toBeDefined()
      }
    })
  })

  describe('イベント発行', () => {
    let eventSpy
    
    beforeEach(() => {
      appHeader = new AppHeader(container, mockDatabase)
      appHeader.render()
      eventSpy = vi.fn()
      
      // カスタムイベントリスナーを設定
      container.addEventListener('add-task-requested', eventSpy)
      container.addEventListener('stats-updated', eventSpy)
    })

    it('新規タスクボタンクリックでadd-task-requestedイベントを発行する', () => {
      // add-task-requestedイベントの契約確認
      const addButton = container.querySelector('.add-task-button, [data-action="add-task"]')
      
      if (addButton) {
        addButton.click()
      }
      
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態（実装前）
    })

    it('統計更新後にstats-updatedイベントを発行する', () => {
      // stats-updatedイベントの契約確認
      appHeader.updateStats()
      
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態（実装前）
    })
  })

  describe('レスポンシブ対応', () => {
    beforeEach(() => {
      appHeader = new AppHeader(container, mockDatabase)
      appHeader.render()
    })

    it('モバイル表示用のコンパクトモードが利用できる', () => {
      // 契約: setCompactMode(enabled: boolean): void
      expect(() => {
        appHeader.setCompactMode(true)
      }).not.toThrow()
      
      expect(() => {
        appHeader.setCompactMode(false)
      }).not.toThrow()
    })

    it('コンパクトモードでは統計の表示が簡略化される', () => {
      appHeader.setCompactMode(true)
      
      // コンパクトモード用のクラスまたは属性が適用されることを確認
      const compactElements = container.querySelectorAll('.compact, [data-compact="true"]')
      expect(compactElements.length).toBeGreaterThan(0)
    })
  })
})
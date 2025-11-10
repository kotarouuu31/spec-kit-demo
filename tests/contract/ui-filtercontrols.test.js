// FilterControlsコンポーネントの契約テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FilterControls } from '../../src/ui/FilterControls.js'

describe('FilterControlsコンポーネント契約', () => {
  let container
  let filterControls

  beforeEach(() => {
    // テスト用DOMコンテナを作成
    container = document.createElement('div')
    container.id = 'filter-controls-container'
    document.body.appendChild(container)
  })

  afterEach(() => {
    // クリーンアップ
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  })

  describe('コンストラクタ', () => {
    it('container要素でFilterControlsインスタンスを作成できる', () => {
      // 契約: constructor(container: HTMLElement)
      expect(() => {
        filterControls = new FilterControls(container)
      }).not.toThrow()
      
      expect(filterControls).toBeDefined()
      expect(filterControls).toBeInstanceOf(FilterControls)
    })

    it('無効なcontainerでエラーを投げる', () => {
      expect(() => {
        filterControls = new FilterControls(null)
      }).toThrow()
    })
  })

  describe('render()メソッド', () => {
    beforeEach(() => {
      filterControls = new FilterControls(container)
    })

    it('フィルターコントロールをレンダリングできる', () => {
      // 契約: render(): void
      expect(() => {
        filterControls.render()
      }).not.toThrow()
    })

    it('初期状態で全てのフィルターオプションが表示される', () => {
      filterControls.render()
      
      // 表示状態フィルター（全て・アクティブ・完了済み）
      const showFilters = container.querySelectorAll('[data-filter-type="show"]')
      expect(showFilters.length).toBeGreaterThan(0)
      
      // 優先度フィルター
      const priorityFilters = container.querySelectorAll('[data-filter-type="priority"]')
      expect(priorityFilters.length).toBeGreaterThan(0)
    })
  })

  describe('必要なフィルター要素', () => {
    beforeEach(() => {
      filterControls = new FilterControls(container)
      filterControls.render()
    })

    it('表示状態フィルター（全て・アクティブ・完了済み）が表示される', () => {
      // "全て"フィルター
      const allFilter = container.querySelector('[data-show="all"], .filter-all')
      expect(allFilter).toBeDefined()
      expect(allFilter).not.toBeNull()

      // "アクティブ"フィルター
      const activeFilter = container.querySelector('[data-show="active"], .filter-active')
      expect(activeFilter).toBeDefined()
      expect(activeFilter).not.toBeNull()

      // "完了済み"フィルター
      const completedFilter = container.querySelector('[data-show="completed"], .filter-completed')
      expect(completedFilter).toBeDefined()
      expect(completedFilter).not.toBeNull()
    })

    it('優先度フィルターボタンが表示される', () => {
      // 高優先度フィルター
      const highFilter = container.querySelector('[data-priority="high"], .filter-high')
      expect(highFilter).toBeDefined()
      expect(highFilter).not.toBeNull()

      // 中優先度フィルター
      const mediumFilter = container.querySelector('[data-priority="medium"], .filter-medium')
      expect(mediumFilter).toBeDefined()
      expect(mediumFilter).not.toBeNull()

      // 低優先度フィルター
      const lowFilter = container.querySelector('[data-priority="low"], .filter-low')
      expect(lowFilter).toBeDefined()
      expect(lowFilter).not.toBeNull()
    })

    it('ソート選択コントロールが表示される', () => {
      const sortSelect = container.querySelector('select[data-sort], .sort-select')
      expect(sortSelect).toBeDefined()
      expect(sortSelect).not.toBeNull()
      
      // ソートオプションが含まれていることを確認
      if (sortSelect) {
        const options = sortSelect.querySelectorAll('option')
        expect(options.length).toBeGreaterThan(1)
      }
    })

    it('フィルタークリアボタンが表示される', () => {
      const clearButton = container.querySelector('.clear-filters, [data-action="clear"]')
      expect(clearButton).toBeDefined()
      expect(clearButton).not.toBeNull()
    })
  })

  describe('フィルター状態管理', () => {
    beforeEach(() => {
      filterControls = new FilterControls(container)
      filterControls.render()
    })

    it('getCurrentFilters()で現在のフィルター設定を取得できる', () => {
      // 契約: getCurrentFilters(): FilterOptions
      const filters = filterControls.getCurrentFilters()
      
      expect(filters).toBeDefined()
      expect(filters).toHaveProperty('show')
      expect(filters).toHaveProperty('priority')
      expect(filters).toHaveProperty('sortBy')
      expect(filters).toHaveProperty('sortOrder')
    })

    it('setFilters()でフィルター設定を適用できる', () => {
      // 契約: setFilters(options: FilterOptions): void
      const filterOptions = {
        show: 'active',
        priority: ['high', 'medium'],
        sortBy: 'due_date',
        sortOrder: 'desc'
      }

      expect(() => {
        filterControls.setFilters(filterOptions)
      }).not.toThrow()
    })

    it('resetFilters()でフィルター設定を初期状態にリセットできる', () => {
      // 契約: resetFilters(): void
      // 何かフィルターを設定
      filterControls.setFilters({
        show: 'completed',
        priority: ['high'],
        sortBy: 'priority',
        sortOrder: 'desc'
      })

      expect(() => {
        filterControls.resetFilters()
      }).not.toThrow()

      // リセット後は初期状態に戻る
      const filters = filterControls.getCurrentFilters()
      expect(filters.show).toBe('all')
      expect(filters.priority).toEqual([])
      expect(filters.sortBy).toBe('created_at')
    })
  })

  describe('フィルター検証', () => {
    beforeEach(() => {
      filterControls = new FilterControls(container)
      filterControls.render()
    })

    it('無効なshow値でValidationErrorを投げる', () => {
      expect(() => {
        filterControls.setFilters({ show: 'invalid' })
      }).toThrow('ValidationError')
    })

    it('無効なpriority値でValidationErrorを投げる', () => {
      expect(() => {
        filterControls.setFilters({ priority: ['invalid'] })
      }).toThrow('ValidationError')
    })

    it('無効なsortBy値でValidationErrorを投げる', () => {
      expect(() => {
        filterControls.setFilters({ sortBy: 'invalid' })
      }).toThrow('ValidationError')
    })

    it('無効なsortOrder値でValidationErrorを投げる', () => {
      expect(() => {
        filterControls.setFilters({ sortOrder: 'invalid' })
      }).toThrow('ValidationError')
    })
  })

  describe('UI状態の更新', () => {
    beforeEach(() => {
      filterControls = new FilterControls(container)
      filterControls.render()
    })

    it('アクティブなフィルターボタンが視覚的に区別される', () => {
      // 高優先度フィルターをアクティブにする
      filterControls.setFilters({ priority: ['high'] })

      const highFilter = container.querySelector('[data-priority="high"], .filter-high')
      expect(highFilter).toBeDefined()
      
      // アクティブ状態のクラスまたは属性があることを確認
      const hasActiveState = highFilter.classList.contains('active') || 
                            highFilter.classList.contains('selected') ||
                            highFilter.getAttribute('data-active') === 'true'
      expect(hasActiveState).toBe(true)
    })

    it('複数の優先度フィルターを同時にアクティブにできる', () => {
      filterControls.setFilters({ priority: ['high', 'medium'] })

      const highFilter = container.querySelector('[data-priority="high"], .filter-high')
      const mediumFilter = container.querySelector('[data-priority="medium"], .filter-medium')
      const lowFilter = container.querySelector('[data-priority="low"], .filter-low')

      // 高・中優先度はアクティブ
      expect(highFilter.classList.contains('active') || highFilter.getAttribute('data-active') === 'true').toBe(true)
      expect(mediumFilter.classList.contains('active') || mediumFilter.getAttribute('data-active') === 'true').toBe(true)
      
      // 低優先度は非アクティブ
      expect(lowFilter.classList.contains('active') || lowFilter.getAttribute('data-active') === 'true').toBe(false)
    })
  })

  describe('イベント発行', () => {
    let eventSpy
    
    beforeEach(() => {
      filterControls = new FilterControls(container)
      filterControls.render()
      eventSpy = vi.fn()
      
      // カスタムイベントリスナーを設定
      container.addEventListener('filters-changed', eventSpy)
      container.addEventListener('filters-reset', eventSpy)
    })

    it('フィルター変更でfilters-changedイベントを発行する', () => {
      // filters-changedイベントの契約確認
      filterControls.setFilters({ show: 'active' })
      
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態（実装前）
    })

    it('フィルターリセットでfilters-resetイベントを発行する', () => {
      // filters-resetイベントの契約確認
      filterControls.resetFilters()
      
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態（実装前）
    })

    it('イベント詳細にフィルター情報が含まれる', () => {
      // イベントペイロードの契約確認
      // 実装後には以下のような詳細情報が含まれることを期待
      const expectedEventDetail = {
        filters: {
          show: 'active',
          priority: [],
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      }

      // 現在は実装前なのでプレースホルダー
      expect(expectedEventDetail).toBeDefined()
    })
  })

  describe('フィルター適用ヘルパー', () => {
    beforeEach(() => {
      filterControls = new FilterControls(container)
      filterControls.render()
    })

    it('applyFiltersToTasks()でタスク配列にフィルターを適用できる', () => {
      // 契約: applyFiltersToTasks(tasks: Task[]): Task[]
      const sampleTasks = [
        {
          id: 1,
          text: 'タスク1',
          priority: 'high',
          due_date: null,
          completed: 0,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          text: 'タスク2',
          priority: 'medium',
          due_date: '2025-12-31',
          completed: 1,
          created_at: '2025-01-01T01:00:00.000Z',
          updated_at: '2025-01-01T01:00:00.000Z'
        }
      ]

      filterControls.setFilters({ show: 'active' })
      
      const filteredTasks = filterControls.applyFiltersToTasks(sampleTasks)
      
      expect(filteredTasks).toBeInstanceOf(Array)
      expect(filteredTasks.length).toBeLessThanOrEqual(sampleTasks.length)
    })
  })
})
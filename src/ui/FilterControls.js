// FilterControlsクラス - フィルター制御管理
export class FilterControls {
  constructor(container) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid HTML element')
    }

    this.container = container
    this.filters = {
      show: 'all', // all, active, completed
      priority: [], // ['high', 'medium', 'low']
      sortBy: 'created_at', // created_at, updated_at, due_date, priority, text
      sortOrder: 'desc' // asc, desc
    }

    this.init()
  }

  // 初期化
  init() {
    this.container.className = 'filter-controls'
    this.cacheElements()
    this.setupEventListeners()
  }

  // DOM要素をキャッシュ
  cacheElements() {
    this.elements = {
      // 表示フィルターボタン
      showAll: this.container.querySelector('[data-show="all"], .filter-all'),
      showActive: this.container.querySelector('[data-show="active"], .filter-active'),
      showCompleted: this.container.querySelector('[data-show="completed"], .filter-completed'),
      
      // 優先度フィルターボタン
      priorityHigh: this.container.querySelector('[data-priority="high"], .filter-high'),
      priorityMedium: this.container.querySelector('[data-priority="medium"], .filter-medium'),
      priorityLow: this.container.querySelector('[data-priority="low"], .filter-low'),
      
      // ソート制御
      sortSelect: this.container.querySelector('[data-sort], .sort-select'),
      sortOrderButton: this.container.querySelector('.sort-order-button'),
      
      // その他
      clearButton: this.container.querySelector('[data-action="clear"], .clear-filters')
    }

    // すべての show ボタン
    this.showButtons = [
      this.elements.showAll,
      this.elements.showActive,
      this.elements.showCompleted
    ].filter(btn => btn !== null)

    // すべての priority ボタン
    this.priorityButtons = [
      this.elements.priorityHigh,
      this.elements.priorityMedium,
      this.elements.priorityLow
    ].filter(btn => btn !== null)
  }

  // イベントリスナー設定
  setupEventListeners() {
    // 表示フィルターボタン
    this.showButtons.forEach(button => {
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          const show = button.getAttribute('data-show') || 
                      button.classList.contains('filter-all') ? 'all' :
                      button.classList.contains('filter-active') ? 'active' : 'completed'
          this.setShowFilter(show)
        })
      }
    })

    // 優先度フィルターボタン
    this.priorityButtons.forEach(button => {
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault()
          const priority = button.getAttribute('data-priority') ||
                          button.classList.contains('filter-high') ? 'high' :
                          button.classList.contains('filter-medium') ? 'medium' : 'low'
          this.togglePriorityFilter(priority)
        })
      }
    })

    // ソート選択
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', (e) => {
        this.setSortBy(e.target.value)
      })
    }

    // ソート順ボタン
    if (this.elements.sortOrderButton) {
      this.elements.sortOrderButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.toggleSortOrder()
      })
    }

    // クリアボタン
    if (this.elements.clearButton) {
      this.elements.clearButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.resetFilters()
      })
    }
  }

  // レンダリング
  render() {
    this.updateButtonStates()
    this.updateSortControls()
  }

  // フィルター設定
  setFilters(options) {
    this.validateFilterOptions(options)
    
    if (options.show !== undefined) {
      this.filters.show = options.show
    }
    
    if (options.priority !== undefined) {
      this.filters.priority = Array.isArray(options.priority) ? [...options.priority] : []
    }
    
    if (options.sortBy !== undefined) {
      this.filters.sortBy = options.sortBy
    }
    
    if (options.sortOrder !== undefined) {
      this.filters.sortOrder = options.sortOrder
    }

    this.updateButtonStates()
    this.updateSortControls()
    this.dispatchFiltersChangedEvent()
  }

  // 現在のフィルター設定を取得
  getCurrentFilters() {
    return {
      show: this.filters.show,
      priority: [...this.filters.priority],
      sortBy: this.filters.sortBy,
      sortOrder: this.filters.sortOrder
    }
  }

  // フィルターリセット
  resetFilters() {
    this.filters = {
      show: 'all',
      priority: [],
      sortBy: 'created_at',
      sortOrder: 'desc'
    }

    this.updateButtonStates()
    this.updateSortControls()
    this.dispatchFiltersResetEvent()
  }

  // 表示フィルター設定
  setShowFilter(show) {
    this.validateShowValue(show)
    this.filters.show = show
    this.updateShowButtons()
    this.dispatchFiltersChangedEvent()
  }

  // 優先度フィルター切り替え
  togglePriorityFilter(priority) {
    this.validatePriorityValue(priority)
    
    const index = this.filters.priority.indexOf(priority)
    if (index === -1) {
      this.filters.priority.push(priority)
    } else {
      this.filters.priority.splice(index, 1)
    }
    
    this.updatePriorityButtons()
    this.dispatchFiltersChangedEvent()
  }

  // ソート項目設定
  setSortBy(sortBy) {
    this.validateSortByValue(sortBy)
    this.filters.sortBy = sortBy
    this.updateSortControls()
    this.dispatchFiltersChangedEvent()
  }

  // ソート順切り替え
  toggleSortOrder() {
    this.filters.sortOrder = this.filters.sortOrder === 'asc' ? 'desc' : 'asc'
    this.updateSortOrderButton()
    this.dispatchFiltersChangedEvent()
  }

  // ボタン状態の更新
  updateButtonStates() {
    this.updateShowButtons()
    this.updatePriorityButtons()
  }

  // 表示ボタンの状態更新
  updateShowButtons() {
    this.showButtons.forEach(button => {
      const show = button.getAttribute('data-show') ||
                  button.classList.contains('filter-all') ? 'all' :
                  button.classList.contains('filter-active') ? 'active' : 'completed'
      
      if (show === this.filters.show) {
        button.classList.add('active')
        button.setAttribute('data-active', 'true')
      } else {
        button.classList.remove('active')
        button.removeAttribute('data-active')
      }
    })
  }

  // 優先度ボタンの状態更新
  updatePriorityButtons() {
    this.priorityButtons.forEach(button => {
      const priority = button.getAttribute('data-priority') ||
                      button.classList.contains('filter-high') ? 'high' :
                      button.classList.contains('filter-medium') ? 'medium' : 'low'
      
      if (this.filters.priority.includes(priority)) {
        button.classList.add('active')
        button.setAttribute('data-active', 'true')
      } else {
        button.classList.remove('active')
        button.removeAttribute('data-active')
      }
    })
  }

  // ソート制御の更新
  updateSortControls() {
    if (this.elements.sortSelect) {
      this.elements.sortSelect.value = this.filters.sortBy
    }
    
    this.updateSortOrderButton()
  }

  // ソート順ボタンの更新
  updateSortOrderButton() {
    if (this.elements.sortOrderButton) {
      this.elements.sortOrderButton.setAttribute('data-sort-order', this.filters.sortOrder)
      this.elements.sortOrderButton.title = 
        this.filters.sortOrder === 'asc' ? '昇順' : '降順'
    }
  }

  // タスクにフィルターを適用
  applyFiltersToTasks(tasks) {
    if (!Array.isArray(tasks)) {
      return []
    }

    let filtered = [...tasks]

    // 表示フィルター適用
    filtered = this.applyShowFilter(filtered)
    
    // 優先度フィルター適用
    filtered = this.applyPriorityFilter(filtered)
    
    // ソート適用
    filtered = this.applySorting(filtered)

    return filtered
  }

  // 表示フィルター適用
  applyShowFilter(tasks) {
    switch (this.filters.show) {
      case 'active':
        return tasks.filter(task => task.completed === 0)
      case 'completed':
        return tasks.filter(task => task.completed === 1)
      case 'all':
      default:
        return tasks
    }
  }

  // 優先度フィルター適用
  applyPriorityFilter(tasks) {
    if (this.filters.priority.length === 0) {
      return tasks
    }
    
    return tasks.filter(task => this.filters.priority.includes(task.priority))
  }

  // ソート適用
  applySorting(tasks) {
    return tasks.sort((a, b) => {
      let aValue = a[this.filters.sortBy]
      let bValue = b[this.filters.sortBy]

      // null/undefined の処理
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''

      // 優先度の場合は数値変換
      if (this.filters.sortBy === 'priority') {
        aValue = this.priorityToNumber(aValue)
        bValue = this.priorityToNumber(bValue)
      }

      // 比較
      let comparison = 0
      if (aValue < bValue) comparison = -1
      if (aValue > bValue) comparison = 1

      // ソート順適用
      return this.filters.sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // 優先度を数値に変換
  priorityToNumber(priority) {
    switch (priority) {
      case 'low': return 1
      case 'medium': return 2
      case 'high': return 3
      default: return 0
    }
  }

  // バリデーション
  validateFilterOptions(options) {
    if (options.show !== undefined) {
      this.validateShowValue(options.show)
    }
    
    if (options.priority !== undefined) {
      if (Array.isArray(options.priority)) {
        options.priority.forEach(p => this.validatePriorityValue(p))
      } else {
        throw new Error('ValidationError: Priority must be an array')
      }
    }
    
    if (options.sortBy !== undefined) {
      this.validateSortByValue(options.sortBy)
    }
    
    if (options.sortOrder !== undefined) {
      this.validateSortOrderValue(options.sortOrder)
    }
  }

  validateShowValue(show) {
    if (!['all', 'active', 'completed'].includes(show)) {
      throw new Error('ValidationError: Show must be all, active, or completed')
    }
  }

  validatePriorityValue(priority) {
    if (!['low', 'medium', 'high'].includes(priority)) {
      throw new Error('ValidationError: Priority must be low, medium, or high')
    }
  }

  validateSortByValue(sortBy) {
    if (!['created_at', 'updated_at', 'due_date', 'priority', 'text'].includes(sortBy)) {
      throw new Error('ValidationError: SortBy must be created_at, updated_at, due_date, priority, or text')
    }
  }

  validateSortOrderValue(sortOrder) {
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new Error('ValidationError: SortOrder must be asc or desc')
    }
  }

  // イベント発行
  dispatchFiltersChangedEvent() {
    this.dispatchEvent('filters-changed', {
      filters: this.getCurrentFilters()
    })
  }

  dispatchFiltersResetEvent() {
    this.dispatchEvent('filters-reset', {
      filters: this.getCurrentFilters()
    })
  }

  dispatchEvent(eventType, detail = {}) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      cancelable: false
    })
    
    this.container.dispatchEvent(event)
  }

  // アクセシビリティ対応
  updateAriaLabels() {
    this.showButtons.forEach(button => {
      const show = button.getAttribute('data-show') ||
                  button.classList.contains('filter-all') ? 'all' :
                  button.classList.contains('filter-active') ? 'active' : 'completed'
      const isActive = show === this.filters.show
      
      button.setAttribute('aria-pressed', isActive.toString())
    })

    this.priorityButtons.forEach(button => {
      const priority = button.getAttribute('data-priority') ||
                      button.classList.contains('filter-high') ? 'high' :
                      button.classList.contains('filter-medium') ? 'medium' : 'low'
      const isActive = this.filters.priority.includes(priority)
      
      button.setAttribute('aria-pressed', isActive.toString())
    })
  }

  // クリーンアップ
  destroy() {
    if (this.container) {
      this.container.innerHTML = ''
    }
    
    this.elements = {}
    this.filters = {}
  }

  // デバッグ用情報
  getDebugInfo() {
    return {
      filters: this.getCurrentFilters(),
      elementsFound: Object.keys(this.elements).filter(key => this.elements[key] !== null),
      showButtonsCount: this.showButtons.length,
      priorityButtonsCount: this.priorityButtons.length
    }
  }
}
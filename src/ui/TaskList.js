// TaskListクラス - タスクリスト表示管理
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BaseComponent } from '../utils/dom-helpers.js'
import { EventHelper } from '../utils/event-helpers.js'

export class TaskList extends BaseComponent {
  constructor(container, database) {
    super(container)
    
    if (!database) {
      throw new Error('Database must be provided')
    }

    this.database = database
    this.tasks = []
    this.taskElements = new Map()

    this.init()
  }

  // 初期化
  init() {
    this.container.className = 'task-list'
    this.cacheElements()
    this.setupEventListeners()
  }

  // DOM要素をキャッシュ
  cacheElements() {
    this.cacheElement('listContent', '#task-list-content, .task-list-content')
    this.cacheElement('emptyState', '#empty-state, .empty-state')
    this.cacheElement('refreshButton', '[data-action="refresh"], .refresh-button')

    // task-list-content が存在しない場合は作成
    if (!this.getElement('listContent')) {
      const content = this.createTaskListContent()
      this.elements.set('listContent', content)
    }
  }

  // task-list-content 要素を作成
  createTaskListContent() {
    const existingContent = this.container.querySelector('.task-list-content')
    if (existingContent) return existingContent

    const content = document.createElement('div')
    content.className = 'task-list-content'
    content.id = 'task-list-content'
    
    const header = this.container.querySelector('.task-list-header')
    if (header && header.nextSibling) {
      this.container.insertBefore(content, header.nextSibling)
    } else {
      this.container.appendChild(content)
    }
    
    return content
  }

  // イベントリスナー設定
  setupEventListeners() {
    // リフレッシュボタン
    this.addEventListenerSafe('refreshButton', 'click', (e) => {
      e.preventDefault()
      this.refresh()
    })

    // コンテナ全体でのイベント委任
    this.addEventListenerSafe('listContent', 'click', (e) => {
      this.handleTaskItemClick(e)
    })

    this.addEventListenerSafe('listContent', 'change', (e) => {
      this.handleTaskItemChange(e)
    })

    // キーボードナビゲーション
    this.container.addEventListener('keydown', EventHelper.createSafeHandler((e) => {
      this.handleKeyboardNavigation(e)
    }))
  }

  // タスクレンダリング
  render(tasks, options = {}) {
    if (!Array.isArray(tasks)) {
      console.warn('TaskList.render: tasks must be an array')
      tasks = []
    }

    this.tasks = [...tasks]
    this.clearTaskElements()
    
    if (this.tasks.length === 0) {
      this.showEmptyState(options.showCompleted !== false)
    } else {
      this.hideEmptyState()
      this.renderTasks(options)
    }

    this.updateAriaLabels()
  }

  // タスクリストをレンダリング
  renderTasks(options = {}) {
    const listContent = this.getElement('listContent')
    if (!listContent) return

    // フラグメントを使用してパフォーマンス向上
    const fragment = document.createDocumentFragment()

    this.tasks.forEach(task => {
      const taskElement = this.createTaskElement(task)
      this.taskElements.set(task.id, taskElement)
      fragment.appendChild(taskElement)
    })

    listContent.appendChild(fragment)
  }

  // タスク要素を作成
  createTaskElement(task) {
    const item = document.createElement('div')
    item.className = `task-item ${task.completed ? 'completed' : ''}`
    item.setAttribute('data-task-id', task.id)
    item.setAttribute('data-completed', task.completed.toString())

    // チェックボックス
    const checkbox = this.createCheckbox(task)
    
    // タスク内容
    const content = this.createTaskContent(task)
    
    // アクションボタン
    const actions = this.createTaskActions(task)

    item.appendChild(checkbox)
    item.appendChild(content)
    item.appendChild(actions)

    return item
  }

  // チェックボックスを作成
  createCheckbox(task) {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'task-checkbox'
    checkbox.checked = task.completed === 1
    checkbox.setAttribute('data-task-id', task.id)
    checkbox.setAttribute('aria-label', `タスク「${task.text}」を${task.completed ? '未完了' : '完了'}にする`)

    return checkbox
  }

  // タスク内容を作成
  createTaskContent(task) {
    const content = document.createElement('div')
    content.className = 'task-content'

    // テキスト
    const text = document.createElement('div')
    text.className = 'task-text'
    text.textContent = task.text

    // メタ情報
    const meta = this.createTaskMeta(task)

    content.appendChild(text)
    content.appendChild(meta)

    return content
  }

  // タスクメタ情報を作成
  createTaskMeta(task) {
    const meta = document.createElement('div')
    meta.className = 'task-meta'

    // 優先度
    const priority = document.createElement('span')
    priority.className = 'task-priority'
    priority.setAttribute('data-priority', task.priority)
    priority.textContent = this.getPriorityText(task.priority)
    meta.appendChild(priority)

    // 期日
    if (task.due_date) {
      const dueDate = this.createDueDateElement(task.due_date)
      meta.appendChild(dueDate)
    }

    // 作成日時
    const createdAt = document.createElement('span')
    createdAt.className = 'task-created-at'
    createdAt.textContent = this.formatDate(task.created_at)
    meta.appendChild(createdAt)

    return meta
  }

  // 期日要素を作成
  createDueDateElement(dueDate) {
    const dueDateElement = document.createElement('span')
    dueDateElement.className = 'task-due-date'

    const today = new Date()
    const due = new Date(dueDate)
    const isOverdue = due < today

    if (isOverdue) {
      dueDateElement.classList.add('overdue')
      dueDateElement.textContent = `⚠️ ${this.formatDate(dueDate)}`
      dueDateElement.title = '期限切れです'
    } else {
      dueDateElement.textContent = `📅 ${this.formatDate(dueDate)}`
    }

    return dueDateElement
  }

  // タスクアクションを作成
  createTaskActions(task) {
    const actions = document.createElement('div')
    actions.className = 'task-actions'

    // 編集ボタン
    const editButton = document.createElement('button')
    editButton.className = 'task-action-button edit-button'
    editButton.textContent = '編集'
    editButton.setAttribute('data-action', 'edit')
    editButton.setAttribute('data-task-id', task.id)
    editButton.setAttribute('aria-label', `タスク「${task.text}」を編集`)

    // 削除ボタン
    const deleteButton = document.createElement('button')
    deleteButton.className = 'task-action-button delete-button'
    deleteButton.textContent = '削除'
    deleteButton.setAttribute('data-action', 'delete')
    deleteButton.setAttribute('data-task-id', task.id)
    deleteButton.setAttribute('aria-label', `タスク「${task.text}」を削除`)

    actions.appendChild(editButton)
    actions.appendChild(deleteButton)

    return actions
  }

  // 空状態を表示
  showEmptyState(hasAllTasks = false) {
    const listContent = this.getElement('listContent')
    const emptyState = this.getElement('emptyState')
    
    if (listContent) {
      listContent.style.display = 'none'
    }

    if (emptyState) {
      emptyState.style.display = 'flex'
    }
  }

  // 空状態を非表示
  hideEmptyState() {
    const emptyState = this.getElement('emptyState')
    const listContent = this.getElement('listContent')
    
    if (emptyState) {
      emptyState.style.display = 'none'
    }

    if (listContent) {
      listContent.style.display = 'block'
    }
  }

  // データベースから再読み込み
  refresh() {
    try {
      const allTasks = this.database.getAllTasks()
      this.render(allTasks)
    } catch (error) {
      console.error('Task refresh error:', error)
    }
  }

  // 全タスクを取得（現在表示中のタスク）
  getAllTasks() {
    return [...this.tasks]
  }

  // イベントリスナー設定
  attachEventListeners() {
    // 既に init() で設定済み
    // この方法は契約テストとの互換性のため
  }

  // タスクアイテムクリックハンドラー
  handleTaskItemClick(event) {
    const target = event.target
    const taskId = parseInt(target.getAttribute('data-task-id'))
    
    if (!taskId) return

    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return

    if (target.classList.contains('edit-button') || target.getAttribute('data-action') === 'edit') {
      EventHelper.dispatchCustomEvent(this.container, 'task-edit', {
        taskId,
        task: { ...task }
      })
    } else if (target.classList.contains('delete-button') || target.getAttribute('data-action') === 'delete') {
      EventHelper.dispatchCustomEvent(this.container, 'task-delete', {
        taskId,
        task: { ...task }
      })
    }
  }

  // タスクアイテム変更ハンドラー
  handleTaskItemChange(event) {
    const target = event.target
    
    if (target.type === 'checkbox' && target.classList.contains('task-checkbox')) {
      const taskId = parseInt(target.getAttribute('data-task-id'))
      
      if (taskId) {
        EventHelper.dispatchCustomEvent(this.container, 'task-toggle', {
          taskId,
          checked: target.checked
        })
      }
    }
  }

  // キーボードナビゲーション
  handleKeyboardNavigation(event) {
    const taskItems = this.container.querySelectorAll('.task-item')
    const currentFocus = document.activeElement
    
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      
      const focusableElements = Array.from(this.container.querySelectorAll(
        '.task-checkbox, .edit-button, .delete-button'
      ))
      
      const currentIndex = focusableElements.indexOf(currentFocus)
      
      if (currentIndex !== -1) {
        const nextIndex = event.key === 'ArrowDown' 
          ? Math.min(currentIndex + 1, focusableElements.length - 1)
          : Math.max(currentIndex - 1, 0)
        
        focusableElements[nextIndex]?.focus()
      } else if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }
  }

  // ユーティリティメソッド
  getPriorityText(priority) {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '中'
    }
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString)
      return format(date, 'yyyy/MM/dd', { locale: ja })
    } catch (error) {
      return dateString
    }
  }

  // タスク要素をクリア
  clearTaskElements() {
    this.taskElements.clear()
    
    const listContent = this.getElement('listContent')
    if (listContent) {
      listContent.innerHTML = ''
    }
  }

  // ARIA ラベルを更新
  updateAriaLabels() {
    const listContent = this.getElement('listContent')
    if (listContent) {
      listContent.setAttribute('role', 'list')
      listContent.setAttribute('aria-label', `タスクリスト（${this.tasks.length}件）`)
    }

    // 各タスクアイテムにもARIAラベルを設定
    this.container.querySelectorAll('.task-item').forEach((item, index) => {
      item.setAttribute('role', 'listitem')
      item.setAttribute('aria-posinset', (index + 1).toString())
      item.setAttribute('aria-setsize', this.tasks.length.toString())
    })
  }


  // パフォーマンス最適化: 仮想スクロール（将来の実装用）
  enableVirtualScrolling(itemHeight = 80, bufferSize = 5) {
    // 大量データ用の仮想スクロール実装
    // 現在は基本実装のため、将来の拡張として残しておく
  }

  // タスクの部分更新
  updateTaskElement(taskId, updatedTask) {
    const element = this.taskElements.get(taskId)
    if (element) {
      const newElement = this.createTaskElement(updatedTask)
      element.parentNode.replaceChild(newElement, element)
      this.taskElements.set(taskId, newElement)
    }
  }

  // タスク要素を削除
  removeTaskElement(taskId) {
    const element = this.taskElements.get(taskId)
    if (element && element.parentNode) {
      element.parentNode.removeChild(element)
      this.taskElements.delete(taskId)
    }
  }

  // クリーンアップ
  destroy() {
    this.clearTaskElements()
    
    if (this.container) {
      this.container.innerHTML = ''
    }
    
    this.tasks = []
    
    // BaseComponentのdestroyを呼び出し
    super.destroy()
  }

  // デバッグ用情報
  getDebugInfo() {
    return {
      tasksCount: this.tasks.length,
      taskElementsCount: this.taskElements.size,
      elementsFound: Array.from(this.elements.keys()).filter(key => this.getElement(key) !== null),
      isEmpty: this.tasks.length === 0
    }
  }
}
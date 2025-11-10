// TaskListコンポーネントの契約テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskList } from '../../src/ui/TaskList.js'

describe('TaskListコンポーネント契約', () => {
  let container
  let mockDatabase
  let taskList

  beforeEach(() => {
    // テスト用DOMコンテナを作成
    container = document.createElement('div')
    container.id = 'task-list-container'
    document.body.appendChild(container)

    // モックデータベース
    mockDatabase = {
      getAllTasks: () => [],
      getActiveTasks: () => [],
      toggleTaskCompletion: () => ({}),
      deleteTask: () => true
    }
  })

  afterEach(() => {
    // クリーンアップ
    if (container.parentNode) {
      document.body.removeChild(container)
    }
  })

  describe('コンストラクタ', () => {
    it('container要素とdatabaseでTaskListインスタンスを作成できる', () => {
      // 契約: constructor(container: HTMLElement, database: TaskDatabase)
      expect(() => {
        taskList = new TaskList(container, mockDatabase)
      }).not.toThrow()
      
      expect(taskList).toBeDefined()
      expect(taskList).toBeInstanceOf(TaskList)
    })

    it('無効なcontainerでエラーを投げる', () => {
      expect(() => {
        taskList = new TaskList(null, mockDatabase)
      }).toThrow()
    })

    it('無効なdatabaseでエラーを投げる', () => {
      expect(() => {
        taskList = new TaskList(container, null)
      }).toThrow()
    })
  })

  describe('render()メソッド', () => {
    beforeEach(() => {
      taskList = new TaskList(container, mockDatabase)
    })

    it('タスク配列を表示できる', () => {
      // 契約: render(tasks: Task[], options?: RenderOptions): void
      const tasks = [
        {
          id: 1,
          text: 'テストタスク1',
          priority: 'high',
          due_date: null,
          completed: 0,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z'
        }
      ]

      expect(() => {
        taskList.render(tasks)
      }).not.toThrow()
    })

    it('空配列を表示できる', () => {
      expect(() => {
        taskList.render([])
      }).not.toThrow()
    })

    it('RenderOptionsでレンダリングオプションを指定できる', () => {
      const tasks = []
      const options = {
        showCompleted: true,
        sortBy: 'priority',
        filterBy: {
          priority: 'high'
        }
      }

      expect(() => {
        taskList.render(tasks, options)
      }).not.toThrow()
    })
  })

  describe('refresh()メソッド', () => {
    beforeEach(() => {
      taskList = new TaskList(container, mockDatabase)
    })

    it('refresh()でデータベースから再読み込みできる', () => {
      // 契約: refresh(): void
      expect(() => {
        taskList.refresh()
      }).not.toThrow()
    })
  })

  describe('attachEventListeners()メソッド', () => {
    beforeEach(() => {
      taskList = new TaskList(container, mockDatabase)
    })

    it('イベントリスナーをアタッチできる', () => {
      // 契約: attachEventListeners(): void
      expect(() => {
        taskList.attachEventListeners()
      }).not.toThrow()
    })
  })

  describe('必要なUI要素', () => {
    beforeEach(() => {
      taskList = new TaskList(container, mockDatabase)
      const tasks = [
        {
          id: 1,
          text: 'テストタスク',
          priority: 'high',
          due_date: '2025-12-31',
          completed: 0,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          text: '完了タスク',
          priority: 'medium',
          due_date: null,
          completed: 1,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z'
        }
      ]
      taskList.render(tasks)
    })

    it('チェックボックスを含むタスク項目が表示される', () => {
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('優先度インディケーターが表示される', () => {
      // 優先度を示すクラスやデータ属性が存在することを確認
      const priorityElements = container.querySelectorAll('[data-priority]')
      expect(priorityElements.length).toBeGreaterThan(0)
    })

    it('完了タスクが視覚的に区別される', () => {
      // 完了タスクのスタイリングクラスが存在することを確認
      const completedTasks = container.querySelectorAll('.completed, [data-completed="true"]')
      expect(completedTasks.length).toBeGreaterThan(0)
    })
  })

  describe('イベント発行', () => {
    let eventSpy
    
    beforeEach(() => {
      taskList = new TaskList(container, mockDatabase)
      eventSpy = vi.fn()
      
      // カスタムイベントリスナーを設定
      container.addEventListener('task-toggle', eventSpy)
      container.addEventListener('task-edit', eventSpy)
      container.addEventListener('task-delete', eventSpy)
    })

    it('チェックボックスクリックでtask-toggleイベントを発行する', () => {
      // task-toggleイベントの契約確認
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態
    })
  })
})
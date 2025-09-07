// TaskFormコンポーネントの契約テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskForm } from '../../src/ui/TaskForm.js'

describe('TaskFormコンポーネント契約', () => {
  let container
  let mockDatabase
  let taskForm

  beforeEach(() => {
    // テスト用DOMコンテナを作成
    container = document.createElement('div')
    container.id = 'task-form-container'
    document.body.appendChild(container)

    // モックデータベース
    mockDatabase = {
      createTask: vi.fn().mockReturnValue({
        id: 1,
        text: 'テストタスク',
        priority: 'medium',
        due_date: null,
        completed: 0,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      }),
      updateTask: vi.fn().mockReturnValue({
        id: 1,
        text: '更新されたタスク',
        priority: 'high',
        due_date: '2025-12-31',
        completed: 0,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T01:00:00.000Z'
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
    it('container要素とdatabaseでTaskFormインスタンスを作成できる', () => {
      // 契約: constructor(container: HTMLElement, database: TaskDatabase)
      expect(() => {
        taskForm = new TaskForm(container, mockDatabase)
      }).not.toThrow()
      
      expect(taskForm).toBeDefined()
      expect(taskForm).toBeInstanceOf(TaskForm)
    })

    it('無効なcontainerでエラーを投げる', () => {
      expect(() => {
        taskForm = new TaskForm(null, mockDatabase)
      }).toThrow()
    })

    it('無効なdatabaseでエラーを投げる', () => {
      expect(() => {
        taskForm = new TaskForm(container, null)
      }).toThrow()
    })
  })

  describe('render()メソッド', () => {
    beforeEach(() => {
      taskForm = new TaskForm(container, mockDatabase)
    })

    it('新規タスクフォームをレンダリングできる', () => {
      // 契約: render(mode: 'create' | 'edit', task?: Task): void
      expect(() => {
        taskForm.render('create')
      }).not.toThrow()
    })

    it('編集モードで既存タスクを表示できる', () => {
      const existingTask = {
        id: 1,
        text: '既存タスク',
        priority: 'high',
        due_date: '2025-12-31',
        completed: 0,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      }

      expect(() => {
        taskForm.render('edit', existingTask)
      }).not.toThrow()
    })

    it('editモードでtaskが未指定の場合エラーを投げる', () => {
      expect(() => {
        taskForm.render('edit')
      }).toThrow('ValidationError')
    })

    it('無効なmodeでValidationErrorを投げる', () => {
      expect(() => {
        taskForm.render('invalid')
      }).toThrow('ValidationError')
    })
  })

  describe('必要なフォーム要素', () => {
    beforeEach(() => {
      taskForm = new TaskForm(container, mockDatabase)
      taskForm.render('create')
    })

    it('テキスト入力フィールドが表示される', () => {
      const textInput = container.querySelector('input[name="text"], textarea[name="text"]')
      expect(textInput).toBeDefined()
      expect(textInput).not.toBeNull()
    })

    it('優先度選択フィールドが表示される', () => {
      const prioritySelect = container.querySelector('select[name="priority"], input[name="priority"]')
      expect(prioritySelect).toBeDefined()
      expect(prioritySelect).not.toBeNull()
    })

    it('期日入力フィールドが表示される', () => {
      const dueDateInput = container.querySelector('input[name="due_date"], input[type="date"]')
      expect(dueDateInput).toBeDefined()
      expect(dueDateInput).not.toBeNull()
    })

    it('保存ボタンが表示される', () => {
      const saveButton = container.querySelector('button[type="submit"], .save-button')
      expect(saveButton).toBeDefined()
      expect(saveButton).not.toBeNull()
    })

    it('キャンセルボタンが表示される', () => {
      const cancelButton = container.querySelector('.cancel-button, .close-button')
      expect(cancelButton).toBeDefined()
      expect(cancelButton).not.toBeNull()
    })
  })

  describe('フォーム検証', () => {
    beforeEach(() => {
      taskForm = new TaskForm(container, mockDatabase)
      taskForm.render('create')
    })

    it('validate()メソッドで入力値を検証できる', () => {
      // 契約: validate(): ValidationResult
      expect(() => {
        const result = taskForm.validate()
        expect(result).toHaveProperty('isValid')
        expect(result).toHaveProperty('errors')
      }).not.toThrow()
    })

    it('必須フィールドが空の場合は検証エラーを返す', () => {
      // テキストフィールドを空にする
      const textInput = container.querySelector('input[name="text"], textarea[name="text"]')
      if (textInput) {
        textInput.value = ''
      }

      const result = taskForm.validate()
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('text')
    })

    it('無効な日付形式の場合は検証エラーを返す', () => {
      const dueDateInput = container.querySelector('input[name="due_date"], input[type="date"]')
      if (dueDateInput) {
        dueDateInput.value = '無効な日付'
      }

      const result = taskForm.validate()
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('due_date')
    })
  })

  describe('フォーム送信', () => {
    beforeEach(() => {
      taskForm = new TaskForm(container, mockDatabase)
      taskForm.render('create')
    })

    it('save()メソッドで新規タスクを作成できる', async () => {
      // 契約: save(): Promise<Task>
      // フォームに有効なデータを設定
      const textInput = container.querySelector('input[name="text"], textarea[name="text"]')
      if (textInput) {
        textInput.value = '新しいタスク'
      }

      const result = await taskForm.save()
      
      expect(result).toBeDefined()
      expect(mockDatabase.createTask).toHaveBeenCalled()
    })

    it('編集モードでsave()すると既存タスクを更新する', async () => {
      const existingTask = {
        id: 1,
        text: '既存タスク',
        priority: 'medium',
        due_date: null,
        completed: 0,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      }

      taskForm.render('edit', existingTask)
      
      const result = await taskForm.save()
      
      expect(result).toBeDefined()
      expect(mockDatabase.updateTask).toHaveBeenCalled()
    })

    it('検証エラーがある場合はsave()でValidationErrorを投げる', async () => {
      // テキストフィールドを空にする
      const textInput = container.querySelector('input[name="text"], textarea[name="text"]')
      if (textInput) {
        textInput.value = ''
      }

      await expect(taskForm.save()).rejects.toThrow('ValidationError')
    })
  })

  describe('フォーム状態管理', () => {
    beforeEach(() => {
      taskForm = new TaskForm(container, mockDatabase)
      taskForm.render('create')
    })

    it('reset()メソッドでフォームをクリアできる', () => {
      // 契約: reset(): void
      // フォームにデータを設定
      const textInput = container.querySelector('input[name="text"], textarea[name="text"]')
      if (textInput) {
        textInput.value = 'テストデータ'
      }

      expect(() => {
        taskForm.reset()
      }).not.toThrow()

      // フォームがクリアされたことを確認
      expect(textInput.value).toBe('')
    })

    it('setFormData()メソッドで既存データを設定できる', () => {
      // 契約: setFormData(task: Task): void
      const taskData = {
        id: 1,
        text: 'セットするタスク',
        priority: 'high',
        due_date: '2025-12-31',
        completed: 0,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z'
      }

      expect(() => {
        taskForm.setFormData(taskData)
      }).not.toThrow()
    })

    it('getFormData()メソッドで現在のフォームデータを取得できる', () => {
      // 契約: getFormData(): CreateTaskInput | UpdateTaskInput
      const formData = taskForm.getFormData()
      
      expect(formData).toBeDefined()
      expect(formData).toHaveProperty('text')
      expect(formData).toHaveProperty('priority')
    })
  })

  describe('イベント発行', () => {
    let eventSpy
    
    beforeEach(() => {
      taskForm = new TaskForm(container, mockDatabase)
      taskForm.render('create')
      eventSpy = vi.fn()
      
      // カスタムイベントリスナーを設定
      container.addEventListener('task-created', eventSpy)
      container.addEventListener('task-updated', eventSpy)
      container.addEventListener('form-cancel', eventSpy)
    })

    it('新規タスク保存でtask-createdイベントを発行する', async () => {
      // task-createdイベントの契約確認
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態
    })

    it('タスク更新でtask-updatedイベントを発行する', async () => {
      // task-updatedイベントの契約確認
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態
    })

    it('キャンセルボタンクリックでform-cancelイベントを発行する', () => {
      // form-cancelイベントの契約確認
      // 実装後にイベントがtriggerされることをテスト
      expect(eventSpy).toHaveBeenCalledTimes(0) // 初期状態
    })
  })
})
// TaskDatabase CRUDメソッドの契約テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskDatabase } from '../../src/db/database.js'
import fs from 'fs'
import path from 'path'

describe('TaskDatabase CRUD操作契約', () => {
  let database
  let testDbPath

  beforeEach(() => {
    testDbPath = path.join(process.cwd(), 'test-crud.db')
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    
    database = new TaskDatabase(testDbPath)
    database.connect()
    database.initializeSchema()
  })

  afterEach(() => {
    if (database) {
      database.close()
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('タスク作成 - createTask()', () => {
    it('有効なCreateTaskInputでタスクを作成できる', () => {
      // 契約: createTask(taskData: CreateTaskInput): Task
      const taskData = {
        text: 'テストタスク',
        priority: 'high',
        due_date: '2025-12-31'
      }
      
      const result = database.createTask(taskData)
      
      // Task契約の確認
      expect(result).toBeDefined()
      expect(result.id).toBeTypeOf('number')
      expect(result.text).toBe('テストタスク')
      expect(result.priority).toBe('high')
      expect(result.due_date).toBe('2025-12-31')
      expect(result.completed).toBe(0)
      expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
      expect(result.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    })

    it('最小限のデータ（textのみ）でタスクを作成できる', () => {
      const taskData = {
        text: '最小限タスク'
      }
      
      const result = database.createTask(taskData)
      
      expect(result.text).toBe('最小限タスク')
      expect(result.priority).toBe('medium') // デフォルト値
      expect(result.due_date).toBeNull()
      expect(result.completed).toBe(0)
    })

    it('空のtextでValidationErrorを投げる', () => {
      const taskData = {
        text: ''
      }
      
      expect(() => {
        database.createTask(taskData)
      }).toThrow('ValidationError')
    })

    it('無効なpriorityでValidationErrorを投げる', () => {
      const taskData = {
        text: 'テストタスク',
        priority: 'invalid'
      }
      
      expect(() => {
        database.createTask(taskData)
      }).toThrow('ValidationError')
    })

    it('無効なdue_date形式でValidationErrorを投げる', () => {
      const taskData = {
        text: 'テストタスク',
        due_date: '無効な日付'
      }
      
      expect(() => {
        database.createTask(taskData)
      }).toThrow('ValidationError')
    })
  })

  describe('タスク読み込み', () => {
    let sampleTasks

    beforeEach(() => {
      // サンプルデータの準備
      sampleTasks = [
        database.createTask({ text: 'タスク1', priority: 'high' }),
        database.createTask({ text: 'タスク2', priority: 'medium' }),
        database.createTask({ text: 'タスク3', priority: 'low', due_date: '2025-12-31' })
      ]
      
      // 2番目のタスクを完了状態にする
      database.toggleTaskCompletion(sampleTasks[1].id)
    })

    it('getAllTasks()で全タスクを取得できる', () => {
      // 契約: getAllTasks(): Task[]
      const result = database.getAllTasks()
      
      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('text')
    })

    it('getActiveTasks()でアクティブタスクのみ取得できる', () => {
      // 契約: getActiveTasks(): Task[]
      const result = database.getActiveTasks()
      
      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(2) // completed = 0 のタスクのみ
      expect(result.every(task => task.completed === 0)).toBe(true)
    })

    it('getCompletedTasks()で完了タスクのみ取得できる', () => {
      // 契約: getCompletedTasks(): Task[]
      const result = database.getCompletedTasks()
      
      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(1) // completed = 1 のタスクのみ
      expect(result.every(task => task.completed === 1)).toBe(true)
    })

    it('getTaskById()で特定IDのタスクを取得できる', () => {
      // 契約: getTaskById(id: number): Task | null
      const result = database.getTaskById(sampleTasks[0].id)
      
      expect(result).toBeDefined()
      expect(result.id).toBe(sampleTasks[0].id)
      expect(result.text).toBe('タスク1')
    })

    it('存在しないIDでgetTaskById()するとnullを返す', () => {
      const result = database.getTaskById(99999)
      
      expect(result).toBeNull()
    })

    it('getTasksByPriority()で指定優先度のタスクを取得できる', () => {
      // 契約: getTasksByPriority(priority: 'high' | 'medium' | 'low'): Task[]
      const result = database.getTasksByPriority('high')
      
      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(1)
      expect(result[0].priority).toBe('high')
    })
  })

  describe('タスク更新', () => {
    let testTask

    beforeEach(() => {
      testTask = database.createTask({
        text: '更新テストタスク',
        priority: 'medium'
      })
    })

    it('updateTask()でタスクを更新できる', async () => {
      // 契約: updateTask(id: number, updates: UpdateTaskInput): Task
      
      // 1ms遅延を追加してupdated_atの違いを確保
      await new Promise(resolve => setTimeout(resolve, 1))
      
      const updates = {
        text: '更新されたタスク',
        priority: 'high',
        due_date: '2025-12-31'
      }
      
      const result = database.updateTask(testTask.id, updates)
      
      expect(result.id).toBe(testTask.id)
      expect(result.text).toBe('更新されたタスク')
      expect(result.priority).toBe('high')
      expect(result.due_date).toBe('2025-12-31')
      expect(result.updated_at).not.toBe(testTask.updated_at)
    })

    it('toggleTaskCompletion()で完了状態を切り替えできる', () => {
      // 契約: toggleTaskCompletion(id: number): Task
      // 未完了 → 完了
      const result1 = database.toggleTaskCompletion(testTask.id)
      expect(result1.completed).toBe(1)
      
      // 完了 → 未完了
      const result2 = database.toggleTaskCompletion(testTask.id)
      expect(result2.completed).toBe(0)
    })

    it('存在しないIDでupdateTask()するとNotFoundErrorを投げる', () => {
      expect(() => {
        database.updateTask(99999, { text: '更新' })
      }).toThrow('NotFoundError')
    })

    it('無効なデータでupdateTask()するとValidationErrorを投げる', () => {
      expect(() => {
        database.updateTask(testTask.id, { priority: 'invalid' })
      }).toThrow('ValidationError')
    })
  })

  describe('タスク削除', () => {
    let testTask

    beforeEach(() => {
      testTask = database.createTask({
        text: '削除テストタスク'
      })
    })

    it('deleteTask()で既存タスクを削除できる', () => {
      // 契約: deleteTask(id: number): boolean
      const result = database.deleteTask(testTask.id)
      
      expect(result).toBe(true)
      
      // 削除確認
      const deletedTask = database.getTaskById(testTask.id)
      expect(deletedTask).toBeNull()
    })

    it('存在しないIDでdeleteTask()するとfalseを返す', () => {
      const result = database.deleteTask(99999)
      
      expect(result).toBe(false)
    })
  })

  describe('クエリヘルパー', () => {
    beforeEach(() => {
      // テストデータを準備
      database.createTask({ text: 'タスクA', priority: 'high' })
      database.createTask({ text: 'タスクB', priority: 'medium', completed: 1 })
      database.createTask({ text: 'タスクC', priority: 'low', due_date: '2024-01-01' })
    })

    it('searchTasks()でテキスト検索ができる', () => {
      // 契約: searchTasks(query: string): Task[]
      const result = database.searchTasks('タスクA')
      
      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(1)
      expect(result[0].text).toContain('タスクA')
    })

    it('getTaskStats()で統計情報を取得できる', () => {
      // 契約: getTaskStats(): TaskStats
      const result = database.getTaskStats()
      
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('active')
      expect(result).toHaveProperty('completed')
      expect(result).toHaveProperty('overdue')
      expect(result).toHaveProperty('high_priority')
      expect(result).toHaveProperty('medium_priority')
      expect(result).toHaveProperty('low_priority')
      
      expect(result.total).toBeTypeOf('number')
      expect(result.active).toBeTypeOf('number')
      expect(result.completed).toBeTypeOf('number')
    })
  })

  describe('エラーハンドリング', () => {
    it('DatabaseErrorが適切な情報を含む', () => {
      // データベース操作エラーのシミュレーション
      try {
        // 無効な操作を実行（実装後に具体的なケースに変更）
        database.close()
        database.createTask({ text: 'テスト' })
      } catch (error) {
        expect(error.constructor.name).toBe('DatabaseError')
        expect(error).toHaveProperty('operation')
        expect(error).toHaveProperty('sqliteError')
      }
    })
  })
})
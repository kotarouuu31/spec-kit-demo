// データフロー統合テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskDatabase } from '../../src/db/database.js'
import { TaskList } from '../../src/ui/TaskList.js'
import { TaskForm } from '../../src/ui/TaskForm.js'
import { FilterControls } from '../../src/ui/FilterControls.js'
import { AppHeader } from '../../src/ui/AppHeader.js'
import fs from 'fs'
import path from 'path'

describe('データフロー統合テスト', () => {
  let database
  let testDbPath
  let components
  let containers

  beforeEach(() => {
    // テスト用データベース設定
    testDbPath = path.join(process.cwd(), 'test-dataflow.db')
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    
    database = new TaskDatabase(testDbPath)
    database.connect()
    database.initializeSchema()

    // テスト用DOMコンテナを作成
    containers = {
      header: document.createElement('div'),
      form: document.createElement('div'),
      filters: document.createElement('div'),
      taskList: document.createElement('div')
    }

    Object.values(containers).forEach(container => {
      document.body.appendChild(container)
    })

    // コンポーネントを初期化
    components = {
      header: new AppHeader(containers.header, database),
      form: new TaskForm(containers.form, database),
      filters: new FilterControls(containers.filters),
      taskList: new TaskList(containers.taskList, database)
    }

    // 初期レンダリング
    components.header.render()
    components.filters.render()
    components.taskList.render([])
  })

  afterEach(() => {
    // クリーンアップ
    if (database) {
      database.close()
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    
    Object.values(containers).forEach(container => {
      if (container.parentNode) {
        document.body.removeChild(container)
      }
    })
  })

  describe('データベース → UI コンポーネントのデータフロー', () => {
    it('データベースからタスクリストへのデータ反映', () => {
      // データベースに直接データを追加
      const task1 = database.createTask({ text: 'タスク1', priority: 'high' })
      const task2 = database.createTask({ text: 'タスク2', priority: 'medium' })
      const task3 = database.createTask({ text: 'タスク3', priority: 'low' })

      // タスクリストの更新
      components.taskList.refresh()
      
      // データが正しく反映されているかを確認
      const displayedTasks = components.taskList.getAllTasks()
      expect(displayedTasks).toHaveLength(3)
      expect(displayedTasks.map(t => t.text)).toContain('タスク1')
      expect(displayedTasks.map(t => t.text)).toContain('タスク2')
      expect(displayedTasks.map(t => t.text)).toContain('タスク3')
    })

    it('データベースからヘッダー統計への自動反映', () => {
      // 複数のタスクを作成（一部完了済み）
      const task1 = database.createTask({ text: 'アクティブ1', priority: 'high' })
      const task2 = database.createTask({ text: 'アクティブ2', priority: 'medium' })
      const task3 = database.createTask({ text: '完了済み', priority: 'low' })
      database.toggleTaskCompletion(task3.id)

      // ヘッダー統計の更新
      components.header.updateStats()
      
      // 統計データの確認
      const stats = database.getTaskStats()
      expect(stats.total).toBe(3)
      expect(stats.active).toBe(2)
      expect(stats.completed).toBe(1)
      expect(stats.high_priority).toBe(1)
      
      // ヘッダーの完了率計算確認
      const completionRate = components.header.getCompletionRate()
      expect(completionRate).toBeCloseTo(33.33, 1) // 1/3 = 33.33%
    })

    it('優先度別統計の正確な集計', () => {
      // 各優先度のタスクを作成
      database.createTask({ text: 'High 1', priority: 'high' })
      database.createTask({ text: 'High 2', priority: 'high' })
      database.createTask({ text: 'Medium 1', priority: 'medium' })
      database.createTask({ text: 'Low 1', priority: 'low' })
      database.createTask({ text: 'Low 2', priority: 'low' })
      database.createTask({ text: 'Low 3', priority: 'low' })

      const stats = database.getTaskStats()
      expect(stats.high_priority).toBe(2)
      expect(stats.medium_priority).toBe(1)
      expect(stats.low_priority).toBe(3)
      expect(stats.total).toBe(6)
    })
  })

  describe('UI操作 → データベースのデータフロー', () => {
    it('フォーム送信でデータベースに正確に保存される', async () => {
      // フォームで新規タスク作成
      components.form.render('create')
      
      const taskData = {
        text: 'フォームから作成',
        priority: 'high',
        due_date: '2025-12-31'
      }
      
      components.form.setFormData(taskData)
      const savedTask = await components.form.save()

      // データベースから直接確認
      const dbTask = database.getTaskById(savedTask.id)
      expect(dbTask).not.toBeNull()
      expect(dbTask.text).toBe('フォームから作成')
      expect(dbTask.priority).toBe('high')
      expect(dbTask.due_date).toBe('2025-12-31')
      expect(dbTask.completed).toBe(0)

      // タイムスタンプが設定されていることを確認
      expect(dbTask.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
      expect(dbTask.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    })

    it('タスク更新でデータベースが正確に更新される', async () => {
      // 既存タスクを作成
      const originalTask = database.createTask({
        text: '更新前',
        priority: 'medium',
        due_date: null
      })

      // フォームで更新
      components.form.render('edit', originalTask)
      
      const updateData = {
        text: '更新後',
        priority: 'high',
        due_date: '2025-01-31'
      }
      
      components.form.setFormData(updateData)
      const updatedTask = await components.form.save()

      // データベースから確認
      const dbTask = database.getTaskById(originalTask.id)
      expect(dbTask.text).toBe('更新後')
      expect(dbTask.priority).toBe('high')
      expect(dbTask.due_date).toBe('2025-01-31')
      
      // updated_atが更新されていることを確認
      expect(dbTask.updated_at).not.toBe(originalTask.updated_at)
      expect(new Date(dbTask.updated_at) > new Date(originalTask.updated_at)).toBe(true)
    })

    it('タスク完了切り替えでデータベース状態が正確に変更される', () => {
      // アクティブなタスクを作成
      const task = database.createTask({ text: 'トグルテスト', priority: 'medium' })
      expect(task.completed).toBe(0)

      // 完了状態に切り替え
      const completedTask = database.toggleTaskCompletion(task.id)
      expect(completedTask.completed).toBe(1)
      expect(completedTask.updated_at).not.toBe(task.updated_at)

      // 再度切り替えてアクティブに戻す
      const reactivatedTask = database.toggleTaskCompletion(task.id)
      expect(reactivatedTask.completed).toBe(0)
      expect(reactivatedTask.updated_at).not.toBe(completedTask.updated_at)
    })
  })

  describe('フィルター → 表示データの変換フロー', () => {
    beforeEach(() => {
      // テスト用の多様なタスクを作成
      const tasks = [
        { text: 'High Active', priority: 'high', completed: 0, due_date: '2025-01-15' },
        { text: 'High Completed', priority: 'high', completed: 1, due_date: '2024-12-01' },
        { text: 'Medium Active', priority: 'medium', completed: 0, due_date: null },
        { text: 'Medium Completed', priority: 'medium', completed: 1, due_date: '2024-11-30' },
        { text: 'Low Active', priority: 'low', completed: 0, due_date: '2025-02-28' },
        { text: 'Low Overdue', priority: 'low', completed: 0, due_date: '2024-01-01' }
      ]

      tasks.forEach(taskData => {
        const task = database.createTask(taskData)
        if (taskData.completed) {
          database.toggleTaskCompletion(task.id)
        }
      })
    })

    it('show フィルターでタスク表示状態が正確に絞り込まれる', () => {
      const allTasks = database.getAllTasks()
      
      // "active" フィルター
      components.filters.setFilters({ show: 'active' })
      const activeTasks = components.filters.applyFiltersToTasks(allTasks)
      expect(activeTasks.every(task => task.completed === 0)).toBe(true)
      expect(activeTasks).toHaveLength(4)

      // "completed" フィルター
      components.filters.setFilters({ show: 'completed' })
      const completedTasks = components.filters.applyFiltersToTasks(allTasks)
      expect(completedTasks.every(task => task.completed === 1)).toBe(true)
      expect(completedTasks).toHaveLength(2)

      // "all" フィルター
      components.filters.setFilters({ show: 'all' })
      const allFilteredTasks = components.filters.applyFiltersToTasks(allTasks)
      expect(allFilteredTasks).toHaveLength(6)
    })

    it('priority フィルターで優先度が正確に絞り込まれる', () => {
      const allTasks = database.getAllTasks()

      // 高優先度のみ
      components.filters.setFilters({ priority: ['high'] })
      const highTasks = components.filters.applyFiltersToTasks(allTasks)
      expect(highTasks.every(task => task.priority === 'high')).toBe(true)
      expect(highTasks).toHaveLength(2)

      // 複数優先度
      components.filters.setFilters({ priority: ['high', 'medium'] })
      const highMediumTasks = components.filters.applyFiltersToTasks(allTasks)
      expect(highMediumTasks.every(task => 
        task.priority === 'high' || task.priority === 'medium'
      )).toBe(true)
      expect(highMediumTasks).toHaveLength(4)
    })

    it('sortBy フィルターでソート順が正確に適用される', () => {
      const allTasks = database.getAllTasks()

      // 優先度でソート（昇順）
      components.filters.setFilters({ sortBy: 'priority', sortOrder: 'asc' })
      const sortedTasks = components.filters.applyFiltersToTasks(allTasks)
      
      // 優先度の順序確認（low < medium < high）
      const priorities = sortedTasks.map(task => task.priority)
      let isCorrectOrder = true
      for (let i = 1; i < priorities.length; i++) {
        const prevPriority = priorities[i-1]
        const currPriority = priorities[i]
        if (getPriorityValue(prevPriority) > getPriorityValue(currPriority)) {
          isCorrectOrder = false
          break
        }
      }
      expect(isCorrectOrder).toBe(true)

      // 作成日でソート（降順）
      components.filters.setFilters({ sortBy: 'created_at', sortOrder: 'desc' })
      const datesSorted = components.filters.applyFiltersToTasks(allTasks)
      const createdDates = datesSorted.map(task => new Date(task.created_at))
      
      for (let i = 1; i < createdDates.length; i++) {
        expect(createdDates[i-1] >= createdDates[i]).toBe(true)
      }
    })

    // ヘルパー関数：優先度の数値変換
    function getPriorityValue(priority) {
      const values = { low: 1, medium: 2, high: 3 }
      return values[priority] || 0
    }
  })

  describe('複合フィルター処理とチェーン', () => {
    beforeEach(() => {
      // より複雑なテストデータ
      const complexTasks = [
        { text: 'High Active Recent', priority: 'high', completed: 0, due_date: '2025-01-10' },
        { text: 'High Active Old', priority: 'high', completed: 0, due_date: '2025-03-15' },
        { text: 'High Completed', priority: 'high', completed: 1, due_date: '2024-12-01' },
        { text: 'Medium Active', priority: 'medium', completed: 0, due_date: null },
        { text: 'Medium Completed', priority: 'medium', completed: 1, due_date: '2024-11-30' },
        { text: 'Low Active Overdue', priority: 'low', completed: 0, due_date: '2024-01-01' }
      ]

      complexTasks.forEach(taskData => {
        const task = database.createTask(taskData)
        if (taskData.completed) {
          database.toggleTaskCompletion(task.id)
        }
      })
    })

    it('複数条件の組み合わせフィルターが正確に動作する', () => {
      const allTasks = database.getAllTasks()

      // アクティブ + 高優先度 + 期日でソート
      components.filters.setFilters({
        show: 'active',
        priority: ['high'],
        sortBy: 'due_date',
        sortOrder: 'asc'
      })

      const complexFiltered = components.filters.applyFiltersToTasks(allTasks)
      
      // アクティブかつ高優先度のみ
      expect(complexFiltered.every(task => 
        task.completed === 0 && task.priority === 'high'
      )).toBe(true)
      expect(complexFiltered).toHaveLength(2)

      // 期日でソートされていることを確認
      const dueDates = complexFiltered
        .filter(task => task.due_date !== null)
        .map(task => new Date(task.due_date))
      
      for (let i = 1; i < dueDates.length; i++) {
        expect(dueDates[i-1] <= dueDates[i]).toBe(true)
      }
    })

    it('フィルター変更の連続適用で状態が正確に更新される', () => {
      const allTasks = database.getAllTasks()

      // 初期フィルター: 全て表示
      components.filters.setFilters({ show: 'all' })
      let filtered = components.filters.applyFiltersToTasks(allTasks)
      expect(filtered).toHaveLength(6)

      // フィルター変更1: アクティブのみ
      components.filters.setFilters({ show: 'active' })
      filtered = components.filters.applyFiltersToTasks(allTasks)
      expect(filtered).toHaveLength(4)

      // フィルター変更2: アクティブ + 高優先度
      components.filters.setFilters({ show: 'active', priority: ['high'] })
      filtered = components.filters.applyFiltersToTasks(allTasks)
      expect(filtered).toHaveLength(2)

      // フィルター変更3: 完了済み + 中優先度
      components.filters.setFilters({ show: 'completed', priority: ['medium'] })
      filtered = components.filters.applyFiltersToTasks(allTasks)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].text).toBe('Medium Completed')
    })
  })

  describe('リアルタイムデータ同期', () => {
    it('データ変更が全コンポーネントに正確に伝播される', () => {
      // 初期状態の確認
      components.header.updateStats()
      let initialStats = database.getTaskStats()
      expect(initialStats.total).toBe(0)

      // 新しいタスクを追加
      const newTask = database.createTask({ text: 'リアルタイムテスト', priority: 'high' })

      // 各コンポーネントの更新
      components.taskList.refresh()
      components.header.updateStats()

      // タスクリストに反映確認
      const listTasks = components.taskList.getAllTasks()
      expect(listTasks).toHaveLength(1)
      expect(listTasks[0].text).toBe('リアルタイムテスト')

      // ヘッダー統計に反映確認
      const updatedStats = database.getTaskStats()
      expect(updatedStats.total).toBe(1)
      expect(updatedStats.active).toBe(1)
      expect(updatedStats.high_priority).toBe(1)

      // タスク完了で再度更新
      database.toggleTaskCompletion(newTask.id)
      components.taskList.refresh()
      components.header.updateStats()

      const finalStats = database.getTaskStats()
      expect(finalStats.active).toBe(0)
      expect(finalStats.completed).toBe(1)
    })

    it('バッチ操作での一括データ更新が正確に処理される', () => {
      // 複数タスクを一括作成
      const batchTasks = [
        { text: 'Batch 1', priority: 'high' },
        { text: 'Batch 2', priority: 'medium' },
        { text: 'Batch 3', priority: 'low' },
        { text: 'Batch 4', priority: 'high' },
        { text: 'Batch 5', priority: 'medium' }
      ]

      batchTasks.forEach(taskData => {
        database.createTask(taskData)
      })

      // 統計の更新確認
      const stats = database.getTaskStats()
      expect(stats.total).toBe(5)
      expect(stats.high_priority).toBe(2)
      expect(stats.medium_priority).toBe(2)
      expect(stats.low_priority).toBe(1)
      
      // UI更新の確認
      components.taskList.refresh()
      components.header.updateStats()
      
      const displayedTasks = components.taskList.getAllTasks()
      expect(displayedTasks).toHaveLength(5)
      expect(components.header.getCompletionRate()).toBe(0) // 全てアクティブ
    })
  })
})
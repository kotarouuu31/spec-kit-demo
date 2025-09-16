// ブラウザ用データベース - LocalStorageを使用
import { format } from 'date-fns'
import { DatabaseError, ValidationError, NotFoundError } from '../utils/errors.js'

export class TaskDatabase {
  constructor(dbName = 'todo-app') {
    this.dbName = dbName
    this.connected = false
    this.tasks = []
    this.nextId = 1
  }

  // データベース接続
  async connect() {
    try {
      // LocalStorageからデータを読み込み
      const storedTasks = localStorage.getItem(`${this.dbName}_tasks`)
      const storedNextId = localStorage.getItem(`${this.dbName}_nextId`)
      
      if (storedTasks) {
        this.tasks = JSON.parse(storedTasks)
      }
      
      if (storedNextId) {
        this.nextId = parseInt(storedNextId)
      } else if (this.tasks.length > 0) {
        // 既存のタスクから最大IDを計算
        this.nextId = Math.max(...this.tasks.map(t => t.id)) + 1
      }
      
      this.connected = true
      console.log(`データベース接続完了: ${this.tasks.length}件のタスクを読み込み`)
      
    } catch (error) {
      throw new DatabaseError('データベースの接続に失敗しました', 'connect')
    }
  }

  // データベース切断
  disconnect() {
    this.connected = false
    console.log('データベース接続を切断しました')
  }

  // データベースクローズ（disconnectのエイリアス）
  close() {
    this.disconnect()
  }

  // データ保存
  _saveData() {
    try {
      localStorage.setItem(`${this.dbName}_tasks`, JSON.stringify(this.tasks))
      localStorage.setItem(`${this.dbName}_nextId`, this.nextId.toString())
    } catch (error) {
      throw new DatabaseError('データの保存に失敗しました', 'save')
    }
  }

  // バリデーション
  _validateTask(taskData) {
    if (!taskData.text || typeof taskData.text !== 'string' || taskData.text.trim() === '') {
      throw new ValidationError('タスク内容は必須です')
    }

    if (taskData.text.length > 500) {
      throw new ValidationError('タスク内容は500文字以下で入力してください')
    }

    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
      throw new ValidationError('優先度は low, medium, high のいずれかを選択してください')
    }

    if (taskData.due_date && taskData.due_date !== null) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(taskData.due_date)) {
        throw new ValidationError('期日はYYYY-MM-DD形式で入力してください')
      }
      
      const date = new Date(taskData.due_date + 'T00:00:00Z')
      if (isNaN(date.getTime())) {
        throw new ValidationError('有効な日付を入力してください')
      }
    }
  }

  // タスク作成
  createTask(taskData) {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'create')
    }

    this._validateTask(taskData)

    const now = new Date().toISOString()
    const task = {
      id: this.nextId++,
      text: taskData.text.trim(),
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || null,
      completed: 0,
      created_at: now,
      updated_at: now
    }

    this.tasks.push(task)
    this._saveData()

    console.log('新規タスクを作成:', task)
    return task
  }

  // 全タスク取得
  getAllTasks() {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'select')
    }

    // 作成日時の降順でソート
    return [...this.tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  // ID指定でタスク取得
  getTaskById(id) {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'select')
    }

    const task = this.tasks.find(t => t.id === parseInt(id))
    if (!task) {
      throw new NotFoundError(`ID ${id} のタスクが見つかりません`)
    }

    return task
  }

  // タスク更新
  updateTask(id, updates) {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'update')
    }

    const taskIndex = this.tasks.findIndex(t => t.id === parseInt(id))
    if (taskIndex === -1) {
      throw new NotFoundError(`ID ${id} のタスクが見つかりません`)
    }

    // バリデーション（更新データのみ）
    if (updates.text !== undefined || updates.priority !== undefined || updates.due_date !== undefined) {
      const testData = { ...this.tasks[taskIndex], ...updates }
      this._validateTask(testData)
    }

    // 更新データを適用
    const updatedTask = {
      ...this.tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    this.tasks[taskIndex] = updatedTask
    this._saveData()

    console.log('タスクを更新:', updatedTask)
    return updatedTask
  }

  // タスク削除
  deleteTask(id) {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'delete')
    }

    const taskIndex = this.tasks.findIndex(t => t.id === parseInt(id))
    if (taskIndex === -1) {
      throw new NotFoundError(`ID ${id} のタスクが見つかりません`)
    }

    const deletedTask = this.tasks[taskIndex]
    this.tasks.splice(taskIndex, 1)
    this._saveData()

    console.log('タスクを削除:', deletedTask)
    return deletedTask
  }

  // タスク完了状態の切り替え
  toggleTaskCompletion(id) {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'toggle')
    }

    const taskIndex = this.tasks.findIndex(t => t.id === parseInt(id))
    if (taskIndex === -1) {
      throw new NotFoundError(`ID ${id} のタスクが見つかりません`)
    }

    const task = this.tasks[taskIndex]
    const newCompletedState = task.completed === 1 ? 0 : 1
    
    const updatedTask = {
      ...task,
      completed: newCompletedState,
      updated_at: new Date().toISOString()
    }

    this.tasks[taskIndex] = updatedTask
    this._saveData()

    console.log('タスク完了状態を切り替え:', updatedTask)
    return updatedTask
  }

  // 統計情報取得
  getTaskStats() {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'stats')
    }

    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')

    const stats = {
      total: this.tasks.length,
      active: this.tasks.filter(t => t.completed === 0).length,
      completed: this.tasks.filter(t => t.completed === 1).length,
      overdue: 0,
      high_priority: this.tasks.filter(t => t.priority === 'high').length,
      medium_priority: this.tasks.filter(t => t.priority === 'medium').length,
      low_priority: this.tasks.filter(t => t.priority === 'low').length
    }

    // 期限切れタスクの計算
    for (const task of this.tasks) {
      if (task.due_date && task.completed === 0) {
        const taskDate = new Date(task.due_date + 'T00:00:00Z')
        const todayDate = new Date(today + 'T00:00:00Z')
        if (taskDate < todayDate) {
          stats.overdue++
        }
      }
    }

    return stats
  }

  // データベースクリア（テスト用）
  clearAllTasks() {
    if (!this.connected) {
      throw new DatabaseError('データベースが接続されていません', 'clear')
    }

    this.tasks = []
    this.nextId = 1
    this._saveData()

    console.log('全タスクをクリアしました')
  }

  // デバッグ情報
  getDebugInfo() {
    return {
      connected: this.connected,
      dbName: this.dbName,
      taskCount: this.tasks.length,
      nextId: this.nextId,
      storageUsed: JSON.stringify(this.tasks).length
    }
  }
}
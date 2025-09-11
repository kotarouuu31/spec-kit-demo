import Database from 'better-sqlite3'
import { format } from 'date-fns'

// カスタムエラークラス
export class DatabaseError extends Error {
  constructor(message, operation = null, sqliteError = null) {
    super(message)
    this.name = 'DatabaseError'
    this.operation = operation
    this.sqliteError = sqliteError
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
  }
}

// TaskDatabaseクラス - SQLiteを使用したタスク管理
export class TaskDatabase {
  constructor(dbPath) {
    if (typeof dbPath !== 'string') {
      throw new Error('Database path must be a string')
    }
    
    this.dbPath = dbPath
    this.db = null
    this.connected = false
  }

  // データベース接続
  connect() {
    try {
      this.db = new Database(this.dbPath)
      this.connected = true
      
      // SQLiteの設定
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')
      
    } catch (error) {
      throw new DatabaseError(
        `DatabaseError: Failed to connect to database: ${error.message}`,
        'connect',
        error
      )
    }
  }

  // データベース接続を閉じる
  close() {
    if (this.db) {
      try {
        this.db.close()
        this.connected = false
      } catch (error) {
        // 既に閉じられている場合は無視
      }
      this.db = null
    }
  }

  // 接続状態の確認
  isConnected() {
    return this.connected && this.db !== null
  }

  // データベーススキーマの初期化
  initializeSchema() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'initializeSchema')
    }

    try {
      // categoriesテーブルの作成
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE CHECK(length(name) > 0),
          color TEXT NOT NULL DEFAULT '#6366f1' CHECK(length(color) = 7 AND color LIKE '#%'),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // tasksテーブルの作成
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL CHECK(length(text) > 0),
          priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
          due_date TEXT NULL,
          completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
          category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)

      // categoriesテーブルのインデックス
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
        CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at);
      `)

      // 基本インデックスの作成
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
      `)

      // パフォーマンス最適化のための複合インデックス
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_completed_priority ON tasks(completed, priority);
        CREATE INDEX IF NOT EXISTS idx_tasks_completed_due_date ON tasks(completed, due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_completed_category ON tasks(completed, category_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority_created_at ON tasks(priority, created_at);
      `)

      // 統計情報取得用の複合インデックス
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_stats ON tasks(completed, priority, due_date, category_id);
      `)

      // データベース統計の更新
      this.db.exec('ANALYZE')

      // トリガーは使用せず、アプリケーション側でupdated_atを管理

    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize schema: ${error.message}`,
        'initializeSchema',
        error
      )
    }
  }

  // バリデーションヘルパー
  _validateTaskData(taskData, isUpdate = false) {
    if (!taskData || typeof taskData !== 'object') {
      throw new ValidationError('Task data must be an object')
    }

    // テキストのバリデーション
    if (!isUpdate || taskData.hasOwnProperty('text')) {
      if (!taskData.text || typeof taskData.text !== 'string' || taskData.text.trim().length === 0) {
        throw new ValidationError('ValidationError: Task text is required and cannot be empty')
      }
    }

    // 優先度のバリデーション
    if (taskData.hasOwnProperty('priority')) {
      if (!['low', 'medium', 'high'].includes(taskData.priority)) {
        throw new ValidationError('ValidationError: Priority must be low, medium, or high')
      }
    }

    // 期日のバリデーション
    if (taskData.hasOwnProperty('due_date') && taskData.due_date !== null) {
      if (typeof taskData.due_date !== 'string' || !this._isValidDate(taskData.due_date)) {
        throw new ValidationError('ValidationError: Due date must be in YYYY-MM-DD format')
      }
    }

    // 完了状態のバリデーション
    if (taskData.hasOwnProperty('completed')) {
      if (![0, 1].includes(taskData.completed)) {
        throw new ValidationError('Completed must be 0 or 1')
      }
    }

    // カテゴリIDのバリデーション
    if (taskData.hasOwnProperty('category_id') && taskData.category_id !== null) {
      if (!Number.isInteger(taskData.category_id) || taskData.category_id <= 0) {
        throw new ValidationError('Category ID must be a positive integer')
      }
    }
  }

  // カテゴリデータのバリデーション
  _validateCategoryData(categoryData, isUpdate = false) {
    if (!categoryData || typeof categoryData !== 'object') {
      throw new ValidationError('Category data must be an object')
    }

    // 名前のバリデーション
    if (!isUpdate || categoryData.hasOwnProperty('name')) {
      if (!categoryData.name || typeof categoryData.name !== 'string' || categoryData.name.trim().length === 0) {
        throw new ValidationError('Category name is required and cannot be empty')
      }
    }

    // 色のバリデーション
    if (categoryData.hasOwnProperty('color')) {
      if (!categoryData.color || typeof categoryData.color !== 'string' || 
          !/^#[0-9A-Fa-f]{6}$/.test(categoryData.color)) {
        throw new ValidationError('Color must be in hex format (#RRGGBB)')
      }
    }
  }

  // 日付フォーマットのバリデーション
  _isValidDate(dateString) {
    if (typeof dateString !== 'string') return false
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) return false
    
    const date = new Date(dateString + 'T00:00:00Z')
    return date instanceof Date && !isNaN(date.getTime()) && 
           date.toISOString().startsWith(dateString)
  }

  // データベース操作エラーハンドラー
  _handleDbError(error, operation) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database connection lost', operation, error)
    }
    throw new DatabaseError(
      `Database operation failed: ${error.message}`,
      operation,
      error
    )
  }

  // タスク作成
  createTask(taskData) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'createTask')
    }

    this._validateTaskData(taskData)

    try {
      const now = new Date().toISOString()
      
      const stmt = this.db.prepare(`
        INSERT INTO tasks (text, priority, due_date, category_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        taskData.text.trim(),
        taskData.priority || 'medium',
        taskData.due_date || null,
        taskData.category_id || null,
        now,
        now
      )

      return this.getTaskById(result.lastInsertRowid)
    } catch (error) {
      this._handleDbError(error, 'createTask')
    }
  }

  // 全タスクの取得
  getAllTasks() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getAllTasks')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        ORDER BY created_at DESC
      `)
      return stmt.all()
    } catch (error) {
      this._handleDbError(error, 'getAllTasks')
    }
  }

  // アクティブタスクの取得
  getActiveTasks() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getActiveTasks')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE completed = 0 
        ORDER BY created_at DESC
      `)
      return stmt.all()
    } catch (error) {
      this._handleDbError(error, 'getActiveTasks')
    }
  }

  // 完了タスクの取得
  getCompletedTasks() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getCompletedTasks')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE completed = 1 
        ORDER BY updated_at DESC
      `)
      return stmt.all()
    } catch (error) {
      this._handleDbError(error, 'getCompletedTasks')
    }
  }

  // ID指定でタスク取得
  getTaskById(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getTaskById')
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?')
      return stmt.get(id) || null
    } catch (error) {
      this._handleDbError(error, 'getTaskById')
    }
  }

  // 優先度指定でタスク取得
  getTasksByPriority(priority) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getTasksByPriority')
    }

    if (!['low', 'medium', 'high'].includes(priority)) {
      throw new ValidationError('Priority must be low, medium, or high')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE priority = ?
        ORDER BY created_at DESC
      `)
      return stmt.all(priority)
    } catch (error) {
      this._handleDbError(error, 'getTasksByPriority')
    }
  }

  // タスク更新
  updateTask(id, updates) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'updateTask')
    }

    // 既存タスクの確認
    const existingTask = this.getTaskById(id)
    if (!existingTask) {
      throw new NotFoundError(`NotFoundError: Task with id ${id} not found`)
    }

    this._validateTaskData(updates, true)

    try {
      const updateFields = []
      const values = []

      // 更新フィールドを動的に構築
      if (updates.hasOwnProperty('text')) {
        updateFields.push('text = ?')
        values.push(updates.text.trim())
      }
      if (updates.hasOwnProperty('priority')) {
        updateFields.push('priority = ?')
        values.push(updates.priority)
      }
      if (updates.hasOwnProperty('due_date')) {
        updateFields.push('due_date = ?')
        values.push(updates.due_date)
      }
      if (updates.hasOwnProperty('completed')) {
        updateFields.push('completed = ?')
        values.push(updates.completed)
      }
      if (updates.hasOwnProperty('category_id')) {
        updateFields.push('category_id = ?')
        values.push(updates.category_id)
      }

      if (updateFields.length === 0) {
        return existingTask
      }

      // updated_atを現在時刻で更新
      updateFields.push('updated_at = ?')
      values.push(new Date().toISOString())

      // IDを最後に追加
      values.push(id)

      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `)

      stmt.run(...values)
      
      return this.getTaskById(id)
    } catch (error) {
      this._handleDbError(error, 'updateTask')
    }
  }

  // タスク完了切り替え
  toggleTaskCompletion(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'toggleTaskCompletion')
    }

    const existingTask = this.getTaskById(id)
    if (!existingTask) {
      throw new NotFoundError(`NotFoundError: Task with id ${id} not found`)
    }

    try {
      const newCompleted = existingTask.completed === 0 ? 1 : 0
      const now = new Date().toISOString()
      
      const stmt = this.db.prepare(`
        UPDATE tasks 
        SET completed = ?, updated_at = ?
        WHERE id = ?
      `)

      stmt.run(newCompleted, now, id)
      return this.getTaskById(id)
    } catch (error) {
      this._handleDbError(error, 'toggleTaskCompletion')
    }
  }

  // タスク削除
  deleteTask(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'deleteTask')
    }

    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?')
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      this._handleDbError(error, 'deleteTask')
    }
  }

  // タスク検索
  searchTasks(query) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'searchTasks')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE text LIKE ?
        ORDER BY created_at DESC
      `)
      return stmt.all(`%${query}%`)
    } catch (error) {
      this._handleDbError(error, 'searchTasks')
    }
  }

  // タスク統計の取得
  getTaskStats() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getTaskStats')
    }

    try {
      // 最適化された1クエリによる統計取得（複合インデックス idx_tasks_stats を活用）
      const today = new Date().toISOString().split('T')[0]
      
      const statsStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN completed = 0 AND due_date < ? AND due_date IS NOT NULL THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
        FROM tasks
      `)
      
      const stats = statsStmt.get(today)

      return {
        total: stats.total || 0,
        active: stats.active || 0,
        completed: stats.completed || 0,
        overdue: stats.overdue || 0,
        high_priority: stats.high_priority || 0,
        medium_priority: stats.medium_priority || 0,
        low_priority: stats.low_priority || 0
      }
    } catch (error) {
      this._handleDbError(error, 'getTaskStats')
    }
  }

  // データベースのメンテナンス
  vacuum() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'vacuum')
    }

    try {
      this.db.exec('VACUUM')
    } catch (error) {
      this._handleDbError(error, 'vacuum')
    }
  }

  // トランザクション実行
  transaction(fn) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'transaction')
    }

    try {
      return this.db.transaction(fn)()
    } catch (error) {
      this._handleDbError(error, 'transaction')
    }
  }

  // データベースのバックアップ（将来の実装用）
  backup(targetPath) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'backup')
    }

    try {
      this.db.backup(targetPath)
    } catch (error) {
      this._handleDbError(error, 'backup')
    }
  }

  // ===== カテゴリ管理メソッド =====

  // カテゴリ作成
  createCategory(categoryData) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'createCategory')
    }

    this._validateCategoryData(categoryData)

    try {
      const now = new Date().toISOString()
      
      const stmt = this.db.prepare(`
        INSERT INTO categories (name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `)

      const result = stmt.run(
        categoryData.name.trim(),
        categoryData.color || '#6366f1',
        now,
        now
      )

      return this.getCategoryById(result.lastInsertRowid)
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ValidationError(`Category name '${categoryData.name}' already exists`)
      }
      this._handleDbError(error, 'createCategory')
    }
  }

  // 全カテゴリの取得
  getAllCategories() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getAllCategories')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM categories 
        ORDER BY created_at ASC
      `)
      return stmt.all()
    } catch (error) {
      this._handleDbError(error, 'getAllCategories')
    }
  }

  // ID指定でカテゴリ取得
  getCategoryById(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getCategoryById')
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?')
      return stmt.get(id) || null
    } catch (error) {
      this._handleDbError(error, 'getCategoryById')
    }
  }

  // カテゴリ更新
  updateCategory(id, updates) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'updateCategory')
    }

    const existingCategory = this.getCategoryById(id)
    if (!existingCategory) {
      throw new NotFoundError(`Category with id ${id} not found`)
    }

    this._validateCategoryData(updates, true)

    try {
      const updateFields = []
      const values = []

      if (updates.hasOwnProperty('name')) {
        updateFields.push('name = ?')
        values.push(updates.name.trim())
      }
      if (updates.hasOwnProperty('color')) {
        updateFields.push('color = ?')
        values.push(updates.color)
      }

      if (updateFields.length === 0) {
        return existingCategory
      }

      updateFields.push('updated_at = ?')
      values.push(new Date().toISOString())
      values.push(id)

      const stmt = this.db.prepare(`
        UPDATE categories 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `)

      stmt.run(...values)
      return this.getCategoryById(id)
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ValidationError(`Category name '${updates.name}' already exists`)
      }
      this._handleDbError(error, 'updateCategory')
    }
  }

  // カテゴリ削除
  deleteCategory(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'deleteCategory')
    }

    try {
      const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?')
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      this._handleDbError(error, 'deleteCategory')
    }
  }

  // カテゴリ別タスク取得
  getTasksByCategory(categoryId) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getTasksByCategory')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM tasks t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.category_id = ?
        ORDER BY t.created_at DESC
      `)
      return stmt.all(categoryId)
    } catch (error) {
      this._handleDbError(error, 'getTasksByCategory')
    }
  }

  // カテゴリなしタスク取得
  getTasksWithoutCategory() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getTasksWithoutCategory')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks 
        WHERE category_id IS NULL
        ORDER BY created_at DESC
      `)
      return stmt.all()
    } catch (error) {
      this._handleDbError(error, 'getTasksWithoutCategory')
    }
  }

  // カテゴリ統計取得
  getCategoryStats() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getCategoryStats')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT 
          c.id,
          c.name,
          c.color,
          COUNT(t.id) as total_tasks,
          SUM(CASE WHEN t.completed = 0 THEN 1 ELSE 0 END) as active_tasks,
          SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed_tasks
        FROM categories c
        LEFT JOIN tasks t ON c.id = t.category_id
        GROUP BY c.id, c.name, c.color
        ORDER BY c.created_at ASC
      `)
      return stmt.all()
    } catch (error) {
      this._handleDbError(error, 'getCategoryStats')
    }
  }

  // JOIN付き全タスク取得
  getAllTasksWithCategories() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getAllTasksWithCategories')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT 
          t.*,
          c.name as category_name,
          c.color as category_color
        FROM tasks t
        LEFT JOIN categories c ON t.category_id = c.id
        ORDER BY t.created_at DESC
      `)
      return stmt.all()
    } catch (error) {
      this._handleDbError(error, 'getAllTasksWithCategories')
    }
  }
}
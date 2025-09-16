// リファクタリング後のTaskDatabaseクラス
import Database from 'better-sqlite3'
import { DatabaseError, ValidationError, NotFoundError } from '../utils/errors.js'
import { TaskQueries } from './task-queries.js'
import { CategoryQueries } from './category-queries.js'
import { DatabaseValidator } from './database-validator.js'

export class TaskDatabase {
  constructor(dbPath, logger = null) {
    if (typeof dbPath !== 'string') {
      throw new Error('Database path must be a string')
    }

    this.dbPath = dbPath
    this.db = null
    this.connected = false
    this.logger = logger

    // クエリクラスのインスタンス
    this.tasks = null
    this.categories = null
  }

  // データベース接続
  connect() {
    try {
      this.db = new Database(this.dbPath)
      this.connected = true

      // SQLiteの設定
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')

      // クエリクラス初期化
      this.tasks = new TaskQueries(this.db, this.logger)
      this.categories = new CategoryQueries(this.db, this.logger)

      this.logger?.info('データベース接続が完了しました', { path: this.dbPath })
    } catch (error) {
      throw new DatabaseError(
        `Failed to connect to database: ${error.message}`,
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
        this.tasks = null
        this.categories = null
        this.logger?.info('データベース接続を閉じました')
      } catch (error) {
        this.logger?.warn('データベース切断中に警告が発生しました', { error: error.message })
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
      this.logger?.info('データベーススキーマの初期化を開始します')

      // テーブル作成
      this.createTables()

      // インデックス作成
      this.createIndexes()

      // データベース統計の更新
      this.db.exec('ANALYZE')

      this.logger?.info('データベーススキーマの初期化が完了しました')
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize schema: ${error.message}`,
        'initializeSchema',
        error
      )
    }
  }

  // テーブル作成
  createTables() {
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
  }

  // インデックス作成
  createIndexes() {
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

  // ===== タスク管理メソッド =====

  // タスク作成
  createTask(taskData) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'createTask')
    }

    DatabaseValidator.validateTaskData(taskData)

    try {
      const taskId = this.tasks.create(taskData)
      return this.getTaskById(taskId)
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
      return this.tasks.getAll()
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
      return this.tasks.getActive()
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
      return this.tasks.getCompleted()
    } catch (error) {
      this._handleDbError(error, 'getCompletedTasks')
    }
  }

  // ID指定でタスク取得
  getTaskById(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getTaskById')
    }

    DatabaseValidator.validateId(id, 'Task')

    try {
      return this.tasks.getById(id)
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
      throw new ValidationError('Priority must be low, medium, or high', 'priority')
    }

    try {
      return this.tasks.getByPriority(priority)
    } catch (error) {
      this._handleDbError(error, 'getTasksByPriority')
    }
  }

  // タスク更新
  updateTask(id, updates) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'updateTask')
    }

    DatabaseValidator.validateId(id, 'Task')

    // 既存タスクの確認
    const existingTask = this.getTaskById(id)
    if (!existingTask) {
      throw new NotFoundError(`Task with id ${id} not found`, 'task', id)
    }

    DatabaseValidator.validateTaskData(updates, true)

    try {
      const success = this.tasks.update(id, updates)
      if (!success) {
        return existingTask // 変更がない場合は既存タスクを返す
      }
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

    DatabaseValidator.validateId(id, 'Task')

    const existingTask = this.getTaskById(id)
    if (!existingTask) {
      throw new NotFoundError(`Task with id ${id} not found`, 'task', id)
    }

    try {
      const success = this.tasks.toggleCompletion(id)
      if (!success) {
        throw new DatabaseError('Failed to toggle task completion', 'toggleTaskCompletion')
      }
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

    DatabaseValidator.validateId(id, 'Task')

    try {
      return this.tasks.delete(id)
    } catch (error) {
      this._handleDbError(error, 'deleteTask')
    }
  }

  // タスク検索
  searchTasks(query) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'searchTasks')
    }

    DatabaseValidator.validateSearchQuery(query)

    try {
      return this.tasks.search(query)
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
      return this.tasks.getStats()
    } catch (error) {
      this._handleDbError(error, 'getTaskStats')
    }
  }

  // ===== カテゴリ管理メソッド =====

  // カテゴリ作成
  createCategory(categoryData) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'createCategory')
    }

    DatabaseValidator.validateCategoryData(categoryData)

    try {
      const categoryId = this.categories.create(categoryData)
      return this.getCategoryById(categoryId)
    } catch (error) {
      this._handleDbError(error, 'createCategory')
    }
  }

  // 全カテゴリの取得
  getAllCategories() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getAllCategories')
    }

    try {
      return this.categories.getAll()
    } catch (error) {
      this._handleDbError(error, 'getAllCategories')
    }
  }

  // ID指定でカテゴリ取得
  getCategoryById(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getCategoryById')
    }

    DatabaseValidator.validateId(id, 'Category')

    try {
      return this.categories.getById(id)
    } catch (error) {
      this._handleDbError(error, 'getCategoryById')
    }
  }

  // カテゴリ更新
  updateCategory(id, updates) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'updateCategory')
    }

    DatabaseValidator.validateId(id, 'Category')

    const existingCategory = this.getCategoryById(id)
    if (!existingCategory) {
      throw new NotFoundError(`Category with id ${id} not found`, 'category', id)
    }

    DatabaseValidator.validateCategoryData(updates, true)

    try {
      const success = this.categories.update(id, updates)
      if (!success) {
        return existingCategory
      }
      return this.getCategoryById(id)
    } catch (error) {
      this._handleDbError(error, 'updateCategory')
    }
  }

  // カテゴリ削除
  deleteCategory(id) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'deleteCategory')
    }

    DatabaseValidator.validateId(id, 'Category')

    try {
      return this.categories.delete(id)
    } catch (error) {
      this._handleDbError(error, 'deleteCategory')
    }
  }

  // カテゴリ別タスク取得
  getTasksByCategory(categoryId) {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getTasksByCategory')
    }

    DatabaseValidator.validateId(categoryId, 'Category')

    try {
      return this.tasks.getByCategory(categoryId)
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
      return this.tasks.getWithoutCategory()
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
      return this.categories.getStats()
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
      return this.tasks.getAllWithCategories()
    } catch (error) {
      this._handleDbError(error, 'getAllTasksWithCategories')
    }
  }

  // ===== データベースメンテナンス =====

  // データベースのメンテナンス
  vacuum() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'vacuum')
    }

    try {
      this.db.exec('VACUUM')
      this.logger?.info('データベースのVACUUMが完了しました')
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
      this.logger?.info('データベースのバックアップが完了しました', { targetPath })
    } catch (error) {
      this._handleDbError(error, 'backup')
    }
  }

  // データベース統計情報取得
  getDatabaseInfo() {
    if (!this.isConnected()) {
      throw new DatabaseError('Database is not connected', 'getDatabaseInfo')
    }

    try {
      const info = {
        path: this.dbPath,
        connected: this.connected,
        tasks: this.tasks.getStats(),
        categories: this.categories.getStats().length,
        version: this.db.pragma('user_version', { simple: true }),
        journalMode: this.db.pragma('journal_mode', { simple: true }),
        foreignKeys: this.db.pragma('foreign_keys', { simple: true })
      }

      return info
    } catch (error) {
      this._handleDbError(error, 'getDatabaseInfo')
    }
  }
}
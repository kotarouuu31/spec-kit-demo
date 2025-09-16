// タスク関連のクエリクラス
import { DatabaseError, ValidationError, NotFoundError } from '../utils/errors.js'

export class TaskQueries {
  constructor(db, logger = null) {
    this.db = db
    this.logger = logger
  }

  // タスク作成
  create(taskData) {
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

      this.logger?.debug('タスク作成クエリ実行', { taskId: result.lastInsertRowid })
      return result.lastInsertRowid
    } catch (error) {
      throw new DatabaseError(`タスク作成に失敗しました: ${error.message}`, 'createTask', error)
    }
  }

  // 全タスクの取得
  getAll() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks
        ORDER BY created_at DESC
      `)
      return stmt.all()
    } catch (error) {
      throw new DatabaseError(`全タスクの取得に失敗しました: ${error.message}`, 'getAllTasks', error)
    }
  }

  // アクティブタスクの取得
  getActive() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks
        WHERE completed = 0
        ORDER BY created_at DESC
      `)
      return stmt.all()
    } catch (error) {
      throw new DatabaseError(`アクティブタスクの取得に失敗しました: ${error.message}`, 'getActiveTasks', error)
    }
  }

  // 完了タスクの取得
  getCompleted() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks
        WHERE completed = 1
        ORDER BY updated_at DESC
      `)
      return stmt.all()
    } catch (error) {
      throw new DatabaseError(`完了タスクの取得に失敗しました: ${error.message}`, 'getCompletedTasks', error)
    }
  }

  // ID指定でタスク取得
  getById(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?')
      return stmt.get(id) || null
    } catch (error) {
      throw new DatabaseError(`タスクの取得に失敗しました: ${error.message}`, 'getTaskById', error)
    }
  }

  // 優先度指定でタスク取得
  getByPriority(priority) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks
        WHERE priority = ?
        ORDER BY created_at DESC
      `)
      return stmt.all(priority)
    } catch (error) {
      throw new DatabaseError(`優先度別タスクの取得に失敗しました: ${error.message}`, 'getTasksByPriority', error)
    }
  }

  // カテゴリ別タスク取得
  getByCategory(categoryId) {
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
      throw new DatabaseError(`カテゴリ別タスクの取得に失敗しました: ${error.message}`, 'getTasksByCategory', error)
    }
  }

  // カテゴリなしタスク取得
  getWithoutCategory() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks
        WHERE category_id IS NULL
        ORDER BY created_at DESC
      `)
      return stmt.all()
    } catch (error) {
      throw new DatabaseError(`カテゴリなしタスクの取得に失敗しました: ${error.message}`, 'getTasksWithoutCategory', error)
    }
  }

  // タスク更新
  update(id, updates) {
    try {
      const updateFields = []
      const values = []

      // 更新フィールドを動的に構築
      const allowedFields = ['text', 'priority', 'due_date', 'completed', 'category_id']

      allowedFields.forEach(field => {
        if (updates.hasOwnProperty(field)) {
          updateFields.push(`${field} = ?`)
          if (field === 'text' && updates[field]) {
            values.push(updates[field].trim())
          } else {
            values.push(updates[field])
          }
        }
      })

      if (updateFields.length === 0) {
        this.logger?.warn('更新するフィールドがありません', { id, updates })
        return false
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

      const result = stmt.run(...values)
      this.logger?.debug('タスク更新クエリ実行', { taskId: id, changedRows: result.changes })

      return result.changes > 0
    } catch (error) {
      throw new DatabaseError(`タスクの更新に失敗しました: ${error.message}`, 'updateTask', error)
    }
  }

  // タスク完了切り替え
  toggleCompletion(id) {
    try {
      const existingTask = this.getById(id)
      if (!existingTask) {
        throw new NotFoundError(`タスクが見つかりません`, 'task', id)
      }

      const newCompleted = existingTask.completed === 0 ? 1 : 0
      const now = new Date().toISOString()

      const stmt = this.db.prepare(`
        UPDATE tasks
        SET completed = ?, updated_at = ?
        WHERE id = ?
      `)

      const result = stmt.run(newCompleted, now, id)
      this.logger?.debug('タスク完了切り替えクエリ実行', { taskId: id, newCompleted })

      return result.changes > 0
    } catch (error) {
      throw new DatabaseError(`タスクの完了状態の変更に失敗しました: ${error.message}`, 'toggleTaskCompletion', error)
    }
  }

  // タスク削除
  delete(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?')
      const result = stmt.run(id)
      this.logger?.debug('タスク削除クエリ実行', { taskId: id, deletedRows: result.changes })

      return result.changes > 0
    } catch (error) {
      throw new DatabaseError(`タスクの削除に失敗しました: ${error.message}`, 'deleteTask', error)
    }
  }

  // タスク検索
  search(query) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tasks
        WHERE text LIKE ?
        ORDER BY created_at DESC
      `)
      return stmt.all(`%${query}%`)
    } catch (error) {
      throw new DatabaseError(`タスクの検索に失敗しました: ${error.message}`, 'searchTasks', error)
    }
  }

  // JOIN付き全タスク取得
  getAllWithCategories() {
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
      throw new DatabaseError(`カテゴリ付きタスクの取得に失敗しました: ${error.message}`, 'getAllTasksWithCategories', error)
    }
  }

  // 統計情報の取得
  getStats() {
    try {
      const today = new Date().toISOString().split('T')[0]

      const stmt = this.db.prepare(`
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

      const stats = stmt.get(today)

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
      throw new DatabaseError(`統計情報の取得に失敗しました: ${error.message}`, 'getTaskStats', error)
    }
  }
}
// カテゴリ関連のクエリクラス
import { DatabaseError, ValidationError, NotFoundError } from '../utils/errors.js'

export class CategoryQueries {
  constructor(db, logger = null) {
    this.db = db
    this.logger = logger
  }

  // カテゴリ作成
  create(categoryData) {
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

      this.logger?.debug('カテゴリ作成クエリ実行', { categoryId: result.lastInsertRowid })
      return result.lastInsertRowid
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ValidationError(`カテゴリ名 '${categoryData.name}' は既に存在します`, 'name')
      }
      throw new DatabaseError(`カテゴリの作成に失敗しました: ${error.message}`, 'createCategory', error)
    }
  }

  // 全カテゴリの取得
  getAll() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM categories
        ORDER BY created_at ASC
      `)
      return stmt.all()
    } catch (error) {
      throw new DatabaseError(`全カテゴリの取得に失敗しました: ${error.message}`, 'getAllCategories', error)
    }
  }

  // ID指定でカテゴリ取得
  getById(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?')
      return stmt.get(id) || null
    } catch (error) {
      throw new DatabaseError(`カテゴリの取得に失敗しました: ${error.message}`, 'getCategoryById', error)
    }
  }

  // カテゴリ更新
  update(id, updates) {
    try {
      const updateFields = []
      const values = []

      // 更新フィールドを動的に構築
      const allowedFields = ['name', 'color']

      allowedFields.forEach(field => {
        if (updates.hasOwnProperty(field)) {
          updateFields.push(`${field} = ?`)
          if (field === 'name' && updates[field]) {
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
        UPDATE categories
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `)

      const result = stmt.run(...values)
      this.logger?.debug('カテゴリ更新クエリ実行', { categoryId: id, changedRows: result.changes })

      return result.changes > 0
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ValidationError(`カテゴリ名 '${updates.name}' は既に存在します`, 'name')
      }
      throw new DatabaseError(`カテゴリの更新に失敗しました: ${error.message}`, 'updateCategory', error)
    }
  }

  // カテゴリ削除
  delete(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?')
      const result = stmt.run(id)
      this.logger?.debug('カテゴリ削除クエリ実行', { categoryId: id, deletedRows: result.changes })

      return result.changes > 0
    } catch (error) {
      throw new DatabaseError(`カテゴリの削除に失敗しました: ${error.message}`, 'deleteCategory', error)
    }
  }

  // カテゴリ統計取得
  getStats() {
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
      throw new DatabaseError(`カテゴリ統計の取得に失敗しました: ${error.message}`, 'getCategoryStats', error)
    }
  }

  // 名前でカテゴリ検索
  findByName(name) {
    try {
      const stmt = this.db.prepare('SELECT * FROM categories WHERE name = ?')
      return stmt.get(name.trim()) || null
    } catch (error) {
      throw new DatabaseError(`カテゴリの検索に失敗しました: ${error.message}`, 'findCategoryByName', error)
    }
  }

  // カテゴリ使用状況チェック
  isInUse(id) {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?')
      const result = stmt.get(id)
      return result.count > 0
    } catch (error) {
      throw new DatabaseError(`カテゴリ使用状況の確認に失敗しました: ${error.message}`, 'isCategoryInUse', error)
    }
  }
}
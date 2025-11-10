// データベースバリデーターモジュール
import { ValidationError } from '../utils/errors.js'

export class DatabaseValidator {
  // タスクデータのバリデーション
  static validateTaskData(taskData, isUpdate = false) {
    if (!taskData || typeof taskData !== 'object') {
      throw new ValidationError('Task data must be an object')
    }

    // テキストのバリデーション
    if (!isUpdate || taskData.hasOwnProperty('text')) {
      if (!taskData.text || typeof taskData.text !== 'string' || taskData.text.trim().length === 0) {
        throw new ValidationError('Task text is required and cannot be empty', 'text')
      }
      if (taskData.text.trim().length > 500) {
        throw new ValidationError('Task text cannot exceed 500 characters', 'text')
      }
    }

    // 優先度のバリデーション
    if (taskData.hasOwnProperty('priority')) {
      if (!['low', 'medium', 'high'].includes(taskData.priority)) {
        throw new ValidationError('Priority must be low, medium, or high', 'priority')
      }
    }

    // 期日のバリデーション
    if (taskData.hasOwnProperty('due_date') && taskData.due_date !== null) {
      if (typeof taskData.due_date !== 'string' || !this.isValidDate(taskData.due_date)) {
        throw new ValidationError('Due date must be in YYYY-MM-DD format', 'due_date')
      }

      // 過去の日付チェック（オプション）
      const dueDate = new Date(taskData.due_date + 'T00:00:00Z')
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (dueDate < today) {
        // 警告レベル - エラーにしない
        console.warn('Due date is in the past:', taskData.due_date)
      }
    }

    // 完了状態のバリデーション
    if (taskData.hasOwnProperty('completed')) {
      if (![0, 1, true, false].includes(taskData.completed)) {
        throw new ValidationError('Completed must be 0, 1, true, or false', 'completed')
      }
    }

    // カテゴリIDのバリデーション
    if (taskData.hasOwnProperty('category_id') && taskData.category_id !== null) {
      if (!Number.isInteger(taskData.category_id) || taskData.category_id <= 0) {
        throw new ValidationError('Category ID must be a positive integer', 'category_id')
      }
    }
  }

  // カテゴリデータのバリデーション
  static validateCategoryData(categoryData, isUpdate = false) {
    if (!categoryData || typeof categoryData !== 'object') {
      throw new ValidationError('Category data must be an object')
    }

    // 名前のバリデーション
    if (!isUpdate || categoryData.hasOwnProperty('name')) {
      if (!categoryData.name || typeof categoryData.name !== 'string' || categoryData.name.trim().length === 0) {
        throw new ValidationError('Category name is required and cannot be empty', 'name')
      }
      if (categoryData.name.trim().length > 50) {
        throw new ValidationError('Category name cannot exceed 50 characters', 'name')
      }
    }

    // 色のバリデーション
    if (categoryData.hasOwnProperty('color')) {
      if (!categoryData.color || typeof categoryData.color !== 'string') {
        throw new ValidationError('Color is required and must be a string', 'color')
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(categoryData.color)) {
        throw new ValidationError('Color must be in hex format (#RRGGBB)', 'color')
      }
    }
  }

  // IDのバリデーション
  static validateId(id, resourceName = 'resource') {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(`${resourceName} ID must be a positive integer`, 'id')
    }
  }

  // 検索クエリのバリデーション
  static validateSearchQuery(query) {
    if (typeof query !== 'string') {
      throw new ValidationError('Search query must be a string', 'query')
    }
    if (query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty', 'query')
    }
    if (query.length > 100) {
      throw new ValidationError('Search query cannot exceed 100 characters', 'query')
    }
  }

  // 日付フォーマットのバリデーション
  static isValidDate(dateString) {
    if (typeof dateString !== 'string') return false

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) return false

    const date = new Date(dateString + 'T00:00:00Z')
    return date instanceof Date &&
           !isNaN(date.getTime()) &&
           date.toISOString().startsWith(dateString)
  }

  // ソートパラメータのバリデーション
  static validateSortParameters(sortBy, sortOrder) {
    const validSortFields = ['created_at', 'updated_at', 'text', 'priority', 'due_date', 'completed']
    const validSortOrders = ['asc', 'desc']

    if (sortBy && !validSortFields.includes(sortBy)) {
      throw new ValidationError(`Sort field must be one of: ${validSortFields.join(', ')}`, 'sortBy')
    }

    if (sortOrder && !validSortOrders.includes(sortOrder)) {
      throw new ValidationError(`Sort order must be one of: ${validSortOrders.join(', ')}`, 'sortOrder')
    }
  }

  // フィルターパラメータのバリデーション
  static validateFilterParameters(filters) {
    if (!filters || typeof filters !== 'object') {
      throw new ValidationError('Filters must be an object')
    }

    // 表示フィルターのバリデーション
    if (filters.show && !['all', 'active', 'completed'].includes(filters.show)) {
      throw new ValidationError('Show filter must be: all, active, or completed', 'show')
    }

    // 優先度フィルターのバリデーション
    if (filters.priority && Array.isArray(filters.priority)) {
      const validPriorities = ['low', 'medium', 'high']
      filters.priority.forEach(priority => {
        if (!validPriorities.includes(priority)) {
          throw new ValidationError(`Priority filter contains invalid value: ${priority}`, 'priority')
        }
      })
    }

    // カテゴリフィルターのバリデーション
    if (filters.category_id !== undefined && filters.category_id !== null) {
      this.validateId(filters.category_id, 'Category')
    }

    // ソートパラメータのバリデーション
    if (filters.sortBy || filters.sortOrder) {
      this.validateSortParameters(filters.sortBy, filters.sortOrder)
    }
  }

  // 一括操作のバリデーション
  static validateBulkOperation(ids, operation) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('IDs must be a non-empty array', 'ids')
    }

    ids.forEach((id, index) => {
      try {
        this.validateId(id, `Item ${index + 1}`)
      } catch (error) {
        throw new ValidationError(`Invalid ID at position ${index + 1}: ${error.message}`, 'ids')
      }
    })

    const validOperations = ['delete', 'complete', 'incomplete', 'update_priority', 'update_category']
    if (!validOperations.includes(operation)) {
      throw new ValidationError(`Operation must be one of: ${validOperations.join(', ')}`, 'operation')
    }
  }
}
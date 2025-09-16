// タスク関連の業務ロジック
import { APP_CONFIG } from '../config/app-config.js'

export class TaskService {
  constructor(database, logger) {
    this.database = database
    this.logger = logger
  }

  // タスク作成処理
  async createTask(taskData, { showNotification = true, refreshUI = true } = {}) {
    try {
      this.logger.logUserAction('task-creation-started', 'TaskService', {
        text: taskData.text,
        priority: taskData.priority
      })

      const task = this.database.createTask(taskData)

      this.logger.logUserAction('task-created', 'TaskService', {
        taskId: task.id,
        text: task.text,
        priority: task.priority
      })

      return {
        success: true,
        task,
        message: `タスク「${task.text}」を作成しました`
      }
    } catch (error) {
      this.logger.error('タスク作成エラー', {
        error: error.message,
        taskData
      })

      return {
        success: false,
        error: error.message,
        message: 'タスクの作成に失敗しました'
      }
    }
  }

  // タスク更新処理
  async updateTask(taskId, updates, { showNotification = true, refreshUI = true } = {}) {
    try {
      this.logger.logUserAction('task-update-started', 'TaskService', {
        taskId,
        updates
      })

      const task = this.database.updateTask(taskId, updates)

      this.logger.logUserAction('task-updated', 'TaskService', {
        taskId: task.id,
        text: task.text,
        priority: task.priority
      })

      return {
        success: true,
        task,
        message: `タスク「${task.text}」を更新しました`
      }
    } catch (error) {
      this.logger.error('タスク更新エラー', {
        error: error.message,
        taskId,
        updates
      })

      return {
        success: false,
        error: error.message,
        message: 'タスクの更新に失敗しました'
      }
    }
  }

  // タスク完了切り替え処理
  async toggleTaskCompletion(taskId, { showNotification = true, refreshUI = true } = {}) {
    try {
      this.logger.logDbOperation('toggleTaskCompletion', 'tasks', { taskId })
      const updatedTask = this.database.toggleTaskCompletion(taskId)

      this.logger.logUserAction('task-toggled', 'TaskService', {
        taskId,
        completed: updatedTask.completed
      })

      const statusText = updatedTask.completed ? '完了しました' : '未完了に戻しました'

      return {
        success: true,
        task: updatedTask,
        message: `タスク「${updatedTask.text}」を${statusText}`
      }
    } catch (error) {
      this.logger.error('タスク完了切り替えエラー', {
        error: error.message,
        taskId
      })

      return {
        success: false,
        error: error.message,
        message: 'タスクの完了状態の変更に失敗しました'
      }
    }
  }

  // タスク削除処理
  async deleteTask(taskId, task, { showNotification = true, refreshUI = true } = {}) {
    try {
      const success = this.database.deleteTask(taskId)

      if (success) {
        this.logger.logUserAction('task-deleted', 'TaskService', {
          taskId,
          text: task.text
        })

        return {
          success: true,
          message: `タスク「${task.text}」を削除しました`,
          deletedTask: task
        }
      } else {
        return {
          success: false,
          error: 'タスクが見つかりませんでした',
          message: 'タスクの削除に失敗しました'
        }
      }
    } catch (error) {
      this.logger.error('タスク削除エラー', {
        error: error.message,
        taskId
      })

      return {
        success: false,
        error: error.message,
        message: 'タスクの削除に失敗しました'
      }
    }
  }

  // タスク復元処理（削除の取り消し用）
  async restoreTask(originalTask, { showNotification = true, refreshUI = true } = {}) {
    try {
      const restoredTask = this.database.createTask({
        text: originalTask.text,
        priority: originalTask.priority,
        due_date: originalTask.due_date,
        category_id: originalTask.category_id
      })

      this.logger.logUserAction('task-restored', 'TaskService', {
        originalId: originalTask.id,
        newId: restoredTask.id,
        text: restoredTask.text
      })

      return {
        success: true,
        task: restoredTask,
        message: `タスク「${restoredTask.text}」を復元しました`
      }
    } catch (error) {
      this.logger.error('タスク復元エラー', {
        error: error.message,
        originalTask
      })

      return {
        success: false,
        error: error.message,
        message: 'タスクの復元に失敗しました'
      }
    }
  }

  // フィルター適用
  applyFilters(tasks, filters) {
    let filteredTasks = [...tasks]

    // 完了状態フィルター
    if (filters.show === 'active') {
      filteredTasks = filteredTasks.filter(task => !task.completed)
    } else if (filters.show === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed)
    }

    // 優先度フィルター
    if (filters.priority && filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        filters.priority.includes(task.priority)
      )
    }

    // カテゴリフィルター
    if (filters.category !== null) {
      filteredTasks = filteredTasks.filter(task =>
        task.category_id === filters.category
      )
    }

    // ソート適用
    filteredTasks.sort((a, b) => {
      const aValue = a[filters.sortBy]
      const bValue = b[filters.sortBy]

      let comparison = 0
      if (aValue < bValue) comparison = -1
      if (aValue > bValue) comparison = 1

      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    return filteredTasks
  }

  // 統計情報の取得と計算
  getTaskStatistics(tasks = null) {
    try {
      // データベースから統計を取得（パフォーマンス最適化）
      if (!tasks) {
        return this.database.getTaskStats()
      }

      // 渡されたタスク配列から統計を計算
      const stats = {
        total: tasks.length,
        active: 0,
        completed: 0,
        overdue: 0,
        high_priority: 0,
        medium_priority: 0,
        low_priority: 0
      }

      const today = new Date().toISOString().split('T')[0]

      tasks.forEach(task => {
        if (task.completed) {
          stats.completed++
        } else {
          stats.active++
          if (task.due_date && task.due_date < today) {
            stats.overdue++
          }
        }

        switch (task.priority) {
          case 'high':
            stats.high_priority++
            break
          case 'medium':
            stats.medium_priority++
            break
          case 'low':
            stats.low_priority++
            break
        }
      })

      return stats
    } catch (error) {
      this.logger.error('統計情報取得エラー', { error: error.message })
      return {
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        high_priority: 0,
        medium_priority: 0,
        low_priority: 0
      }
    }
  }
}
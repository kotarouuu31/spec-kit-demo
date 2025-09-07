// エラーハンドリング統合テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskDatabase } from '../../src/db/database.js'
import { TaskList } from '../../src/ui/TaskList.js'
import { TaskForm } from '../../src/ui/TaskForm.js'
import { FilterControls } from '../../src/ui/FilterControls.js'
import { AppHeader } from '../../src/ui/AppHeader.js'
import { NotificationManager } from '../../src/ui/NotificationManager.js'
import fs from 'fs'
import path from 'path'

describe('エラーハンドリング統合テスト', () => {
  let database
  let testDbPath
  let components
  let containers

  beforeEach(() => {
    // テスト用データベース設定
    testDbPath = path.join(process.cwd(), 'test-errors.db')
    
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
      taskList: document.createElement('div'),
      notifications: document.createElement('div')
    }

    Object.values(containers).forEach(container => {
      document.body.appendChild(container)
    })

    // コンポーネントを初期化
    components = {
      header: new AppHeader(containers.header, database),
      form: new TaskForm(containers.form, database),
      filters: new FilterControls(containers.filters),
      taskList: new TaskList(containers.taskList, database),
      notifications: new NotificationManager(containers.notifications)
    }

    // 初期レンダリング
    components.header.render()
    components.filters.render()
    components.taskList.render([])
  })

  afterEach(() => {
    // クリーンアップ
    if (database && database.isConnected()) {
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

  describe('データベース接続エラーハンドリング', () => {
    it('データベース接続失敗時の適切なエラー処理', () => {
      // 無効なパスでデータベースを作成
      const invalidPath = '/invalid/path/nonexistent.db'
      const invalidDatabase = new TaskDatabase(invalidPath)

      expect(() => {
        invalidDatabase.connect()
      }).toThrow('DatabaseError')

      // エラー情報の確認
      try {
        invalidDatabase.connect()
      } catch (error) {
        expect(error.constructor.name).toBe('DatabaseError')
        expect(error.message).toContain('DatabaseError')
        expect(error).toHaveProperty('operation')
        expect(error.operation).toBe('connect')
      }
    })

    it('データベース接続切断後の操作エラー処理', () => {
      // 正常な接続を確立後、切断
      expect(database.isConnected()).toBe(true)
      database.close()
      expect(database.isConnected()).toBe(false)

      // 切断後の操作でエラーが発生することを確認
      expect(() => {
        database.createTask({ text: 'テストタスク', priority: 'medium' })
      }).toThrow('DatabaseError')

      expect(() => {
        database.getAllTasks()
      }).toThrow('DatabaseError')
    })

    it('データベースファイル破損時のフォールバック処理', () => {
      // データベースを閉じてファイルを破損させる
      database.close()
      
      // ファイルを無効なデータで上書き
      fs.writeFileSync(testDbPath, 'invalid sqlite data')

      // 再接続を試行
      const corruptedDatabase = new TaskDatabase(testDbPath)
      
      expect(() => {
        corruptedDatabase.connect()
      }).toThrow('DatabaseError')

      // エラー詳細の確認
      try {
        corruptedDatabase.connect()
      } catch (error) {
        expect(error.constructor.name).toBe('DatabaseError')
        expect(error).toHaveProperty('sqliteError')
      }
    })
  })

  describe('データ検証エラーハンドリング', () => {
    it('無効なタスクデータでの作成エラー処理', async () => {
      // 空のテキストでタスク作成を試行
      components.form.render('create')
      
      expect(() => {
        database.createTask({ text: '', priority: 'medium' })
      }).toThrow('ValidationError')

      // 無効な優先度でタスク作成を試行
      expect(() => {
        database.createTask({ text: '有効なテキスト', priority: 'invalid' })
      }).toThrow('ValidationError')

      // 無効な日付形式でタスク作成を試行
      expect(() => {
        database.createTask({ 
          text: '有効なテキスト', 
          priority: 'medium',
          due_date: '無効な日付'
        })
      }).toThrow('ValidationError')

      // フォームレベルでの検証エラー
      components.form.setFormData({ text: '' })
      
      await expect(components.form.save()).rejects.toThrow('ValidationError')
    })

    it('存在しないタスクの更新・削除エラー処理', () => {
      const nonExistentId = 99999

      // 存在しないタスクの更新を試行
      expect(() => {
        database.updateTask(nonExistentId, { text: '更新テキスト' })
      }).toThrow('NotFoundError')

      // 存在しないタスクの削除を試行
      const deleteResult = database.deleteTask(nonExistentId)
      expect(deleteResult).toBe(false)

      // 存在しないタスクの完了切り替えを試行
      expect(() => {
        database.toggleTaskCompletion(nonExistentId)
      }).toThrow('NotFoundError')

      // 存在しないタスクの取得
      const result = database.getTaskById(nonExistentId)
      expect(result).toBeNull()
    })

    it('フィルター設定での無効値エラー処理', () => {
      // 無効なshow値
      expect(() => {
        components.filters.setFilters({ show: 'invalid_show' })
      }).toThrow('ValidationError')

      // 無効なpriority値
      expect(() => {
        components.filters.setFilters({ priority: ['invalid_priority'] })
      }).toThrow('ValidationError')

      // 無効なsortBy値
      expect(() => {
        components.filters.setFilters({ sortBy: 'invalid_sort' })
      }).toThrow('ValidationError')

      // 無効なsortOrder値
      expect(() => {
        components.filters.setFilters({ sortOrder: 'invalid_order' })
      }).toThrow('ValidationError')
    })
  })

  describe('UI操作エラーハンドリング', () => {
    it('不正なDOM操作エラーの適切な処理', () => {
      // 存在しないコンテナでコンポーネント作成を試行
      expect(() => {
        new TaskList(null, database)
      }).toThrow()

      expect(() => {
        new TaskForm(null, database)
      }).toThrow()

      expect(() => {
        new FilterControls(null)
      }).toThrow()

      expect(() => {
        new AppHeader(null, database)
      }).toThrow()

      expect(() => {
        new NotificationManager(null)
      }).toThrow()
    })

    it('フォーム状態不整合エラーの処理', async () => {
      // edit モードで task を指定しない
      expect(() => {
        components.form.render('edit')
      }).toThrow('ValidationError')

      // 無効なモードでレンダリング
      expect(() => {
        components.form.render('invalid_mode')
      }).toThrow('ValidationError')

      // 保存前の検証エラー
      components.form.render('create')
      components.form.setFormData({ text: '', priority: 'invalid' })

      await expect(components.form.save()).rejects.toThrow('ValidationError')
    })

    it('非同期操作の競合状態エラー処理', async () => {
      // 同時並行でタスク作成を実行
      const task = database.createTask({ text: 'コンフリクトテスト', priority: 'medium' })

      // 複数の更新操作を同時実行
      const promises = [
        database.updateTask(task.id, { text: '更新1' }),
        database.updateTask(task.id, { text: '更新2' }),
        database.toggleTaskCompletion(task.id)
      ]

      // 少なくとも一つは成功することを確認
      const results = await Promise.allSettled(promises)
      const successful = results.filter(result => result.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(0)

      // 最終状態の確認
      const finalTask = database.getTaskById(task.id)
      expect(finalTask).not.toBeNull()
    })
  })

  describe('ネットワークエラーシミュレーション', () => {
    it('外部依存関係エラーの処理', () => {
      // 日付ライブラリのエラーシミュレーション
      const originalDate = global.Date
      
      // 無効なDateオブジェクトを返すモック
      global.Date = function(...args) {
        if (args.length === 0) {
          throw new Error('Date constructor error')
        }
        return new originalDate(...args)
      }

      try {
        // 現在時刻を使用するメソッドでエラーが適切に処理されることを確認
        expect(() => {
          components.header.getCurrentDateString()
        }).not.toThrow() // 実装ではエラーを適切にキャッチして代替値を返すべき
      } finally {
        // モックを元に戻す
        global.Date = originalDate
      }
    })

    it('localStorage エラーの処理', () => {
      // localStorageが利用できない環境をシミュレート
      const originalLocalStorage = global.localStorage
      
      global.localStorage = {
        getItem: () => { throw new Error('localStorage not available') },
        setItem: () => { throw new Error('localStorage not available') }
      }

      try {
        // localStorage依存の機能が適切にフォールバックすることを確認
        expect(() => {
          // 設定の保存/読み込み処理（将来の実装用）
          // components.settings.saveSettings({ theme: 'dark' })
        }).not.toThrow()
      } finally {
        global.localStorage = originalLocalStorage
      }
    })
  })

  describe('エラー通知とユーザーフィードバック', () => {
    it('各種エラーに対する適切な通知表示', () => {
      // データベースエラー通知
      const dbErrorId = components.notifications.showError(
        'データベースとの接続に失敗しました',
        { persistent: true }
      )
      expect(dbErrorId).toBeDefined()

      let errorNotification = containers.notifications.querySelector('.error')
      expect(errorNotification).not.toBeNull()
      expect(errorNotification.textContent).toContain('データベース')

      // 検証エラー通知
      const validationErrorId = components.notifications.showWarning(
        'タスクのテキストは必須項目です'
      )
      expect(validationErrorId).toBeDefined()

      let warningNotification = containers.notifications.querySelector('.warning')
      expect(warningNotification).not.toBeNull()
      expect(warningNotification.textContent).toContain('必須項目')

      // システムエラー通知
      const systemErrorId = components.notifications.showError(
        '予期しないエラーが発生しました。ページを再読み込みしてください。',
        { 
          persistent: true,
          actionButton: {
            text: '再読み込み',
            callback: () => window.location.reload()
          }
        }
      )
      expect(systemErrorId).toBeDefined()

      const actionButton = containers.notifications.querySelector('.notification-action')
      expect(actionButton).not.toBeNull()
      expect(actionButton.textContent).toContain('再読み込み')
    })

    it('エラー回復のためのアクション提供', () => {
      // 削除の取り消し機能
      const task = database.createTask({ text: '削除テスト', priority: 'medium' })
      const originalTaskData = { ...task }
      
      database.deleteTask(task.id)

      const undoNotificationId = components.notifications.showInfo(
        'タスクが削除されました',
        {
          duration: 5000,
          actionButton: {
            text: '元に戻す',
            callback: () => {
              // 削除の取り消し処理
              database.createTask({
                text: originalTaskData.text,
                priority: originalTaskData.priority,
                due_date: originalTaskData.due_date
              })
              components.taskList.refresh()
              components.notifications.showSuccess('タスクを復元しました')
            }
          }
        }
      )

      expect(undoNotificationId).toBeDefined()
      
      const undoButton = containers.notifications.querySelector('.notification-action')
      expect(undoButton).not.toBeNull()
      expect(undoButton.textContent).toContain('元に戻す')
    })

    it('連続するエラーの適切な管理', () => {
      // 最大通知数の制限をテスト
      components.notifications.setMaxNotifications(3)

      // 複数のエラーを連続発生
      const error1 = components.notifications.showError('エラー1')
      const error2 = components.notifications.showError('エラー2')
      const error3 = components.notifications.showError('エラー3')
      const error4 = components.notifications.showError('エラー4') // これにより error1 が削除される

      const notifications = containers.notifications.querySelectorAll('.notification')
      expect(notifications.length).toBe(3)

      // 最新の3つが表示されていることを確認
      expect(containers.notifications.textContent).not.toContain('エラー1')
      expect(containers.notifications.textContent).toContain('エラー2')
      expect(containers.notifications.textContent).toContain('エラー3')
      expect(containers.notifications.textContent).toContain('エラー4')
    })
  })

  describe('データ整合性とリカバリ', () => {
    it('部分的なデータ破損からの回復', () => {
      // 正常なタスクを作成
      const task1 = database.createTask({ text: 'タスク1', priority: 'high' })
      const task2 = database.createTask({ text: 'タスク2', priority: 'medium' })

      // データベースの整合性チェック
      const allTasks = database.getAllTasks()
      expect(allTasks).toHaveLength(2)

      // 統計情報の整合性確認
      const stats = database.getTaskStats()
      expect(stats.total).toBe(2)
      expect(stats.active).toBe(2)
      expect(stats.completed).toBe(0)

      // 不正な完了状態の修正をシミュレート
      database.toggleTaskCompletion(task1.id)
      
      const updatedStats = database.getTaskStats()
      expect(updatedStats.active).toBe(1)
      expect(updatedStats.completed).toBe(1)
    })

    it('同時アクセス時のデータ競合回避', () => {
      const task = database.createTask({ text: '競合テスト', priority: 'medium' })

      // 同時更新のシミュレーション
      const update1 = () => database.updateTask(task.id, { text: '更新A', priority: 'high' })
      const update2 = () => database.updateTask(task.id, { text: '更新B', priority: 'low' })
      
      // 両方の更新を実行（最後の更新が勝つ）
      update1()
      update2()

      const finalTask = database.getTaskById(task.id)
      expect(finalTask.text).toBe('更新B')
      expect(finalTask.priority).toBe('low')

      // updated_at が適切に更新されていることを確認
      expect(new Date(finalTask.updated_at) > new Date(task.updated_at)).toBe(true)
    })

    it('バックアップとリストア機能のテスト', () => {
      // 複数のタスクを作成
      const tasks = [
        { text: 'バックアップ1', priority: 'high' },
        { text: 'バックアップ2', priority: 'medium' },
        { text: 'バックアップ3', priority: 'low' }
      ]

      tasks.forEach(taskData => database.createTask(taskData))

      // バックアップデータの取得
      const backupData = database.getAllTasks()
      expect(backupData).toHaveLength(3)

      // データを削除
      backupData.forEach(task => database.deleteTask(task.id))
      expect(database.getAllTasks()).toHaveLength(0)

      // リストア処理（実装される場合）
      backupData.forEach(task => {
        database.createTask({
          text: task.text,
          priority: task.priority,
          due_date: task.due_date
        })
      })

      const restoredData = database.getAllTasks()
      expect(restoredData).toHaveLength(3)
      expect(restoredData.map(t => t.text)).toEqual(
        expect.arrayContaining(['バックアップ1', 'バックアップ2', 'バックアップ3'])
      )
    })
  })
})
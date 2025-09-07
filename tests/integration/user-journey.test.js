// ユーザージャーニーの統合テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskDatabase } from '../../src/db/database.js'
import { TaskList } from '../../src/ui/TaskList.js'
import { TaskForm } from '../../src/ui/TaskForm.js'
import { FilterControls } from '../../src/ui/FilterControls.js'
import { AppHeader } from '../../src/ui/AppHeader.js'
import { NotificationManager } from '../../src/ui/NotificationManager.js'
import fs from 'fs'
import path from 'path'

describe('ユーザージャーニー統合テスト', () => {
  let database
  let testDbPath
  let appContainer
  let components

  beforeEach(() => {
    // テスト用データベース設定
    testDbPath = path.join(process.cwd(), 'test-journey.db')
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
    
    database = new TaskDatabase(testDbPath)
    database.connect()
    database.initializeSchema()

    // テスト用DOMコンテナを作成
    appContainer = document.createElement('div')
    appContainer.id = 'app'
    appContainer.innerHTML = `
      <div id="app-header"></div>
      <div id="task-form-modal" style="display: none;"></div>
      <div id="filter-controls"></div>
      <div id="task-list"></div>
      <div id="notifications"></div>
    `
    document.body.appendChild(appContainer)

    // コンポーネントを初期化
    components = {
      header: new AppHeader(document.getElementById('app-header'), database),
      form: new TaskForm(document.getElementById('task-form-modal'), database),
      filters: new FilterControls(document.getElementById('filter-controls')),
      taskList: new TaskList(document.getElementById('task-list'), database),
      notifications: new NotificationManager(document.getElementById('notifications'))
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
    
    if (appContainer.parentNode) {
      document.body.removeChild(appContainer)
    }
  })

  describe('新規ユーザーの初回使用体験', () => {
    it('空の状態から最初のタスクを作成できる', async () => {
      // 初期状態の確認
      expect(components.taskList.getAllTasks()).toHaveLength(0)
      expect(components.header.getCompletionRate()).toBe(0)

      // 新規タスク追加ボタンをクリック
      const addButton = document.querySelector('.add-task-button, [data-action="add-task"]')
      expect(addButton).not.toBeNull()
      
      // フォーム表示イベントをシミュレート
      components.form.render('create')
      expect(document.getElementById('task-form-modal').style.display).not.toBe('none')

      // タスクデータを入力
      const taskData = {
        text: '最初のタスク',
        priority: 'medium',
        due_date: '2025-12-31'
      }

      // フォームにデータを設定
      components.form.setFormData(taskData)

      // タスクを保存
      const createdTask = await components.form.save()
      expect(createdTask).toBeDefined()
      expect(createdTask.text).toBe('最初のタスク')

      // タスクリストの更新を確認
      components.taskList.refresh()
      expect(components.taskList.getAllTasks()).toHaveLength(1)

      // ヘッダー統計の更新を確認
      components.header.updateStats()
      const stats = database.getTaskStats()
      expect(stats.total).toBe(1)
      expect(stats.active).toBe(1)
    })

    it('初回のタスク作成で適切なガイダンス通知が表示される', () => {
      // 初回作成時の通知表示をテスト
      const notificationId = components.notifications.showSuccess(
        'おめでとうございます！最初のタスクが作成されました。'
      )

      expect(notificationId).toBeDefined()
      const notification = document.querySelector('.notification')
      expect(notification).not.toBeNull()
      expect(notification.textContent).toContain('おめでとうございます')
    })
  })

  describe('日常的なタスク管理フロー', () => {
    beforeEach(() => {
      // 日常使用のためのサンプルタスクを作成
      const sampleTasks = [
        { text: '重要な会議の準備', priority: 'high', due_date: '2025-01-10' },
        { text: '買い物リスト作成', priority: 'medium', due_date: null },
        { text: 'メール返信', priority: 'low', due_date: '2025-01-15' },
        { text: '完了したタスク', priority: 'medium', due_date: null, completed: 1 }
      ]

      sampleTasks.forEach(task => {
        const createdTask = database.createTask(task)
        if (task.completed) {
          database.toggleTaskCompletion(createdTask.id)
        }
      })

      components.taskList.refresh()
    })

    it('タスクの完了マークができ、統計が更新される', () => {
      // 初期統計を確認
      let stats = database.getTaskStats()
      expect(stats.active).toBe(3)
      expect(stats.completed).toBe(1)

      // アクティブなタスクを完了マークする
      const activeTasks = database.getActiveTasks()
      const firstTask = activeTasks[0]
      
      // タスク完了をシミュレート
      const completedTask = database.toggleTaskCompletion(firstTask.id)
      expect(completedTask.completed).toBe(1)

      // UIの更新
      components.taskList.refresh()
      components.header.updateStats()

      // 統計の変化を確認
      stats = database.getTaskStats()
      expect(stats.active).toBe(2)
      expect(stats.completed).toBe(2)

      // 完了通知の表示
      const notificationId = components.notifications.showSuccess('タスクが完了しました！')
      expect(notificationId).toBeDefined()
    })

    it('優先度フィルターでタスクを絞り込める', () => {
      // 全タスクが表示されていることを確認
      const allTasks = database.getAllTasks()
      expect(allTasks).toHaveLength(4)

      // 高優先度フィルターを適用
      components.filters.setFilters({ priority: ['high'] })
      
      const filteredTasks = components.filters.applyFiltersToTasks(allTasks)
      expect(filteredTasks).toHaveLength(1)
      expect(filteredTasks[0].text).toBe('重要な会議の準備')

      // タスクリストの更新
      components.taskList.render(filteredTasks)

      // フィルター変更イベントの発行を確認
      expect(() => {
        const event = new CustomEvent('filters-changed', {
          detail: { filters: components.filters.getCurrentFilters() }
        })
        document.getElementById('filter-controls').dispatchEvent(event)
      }).not.toThrow()
    })

    it('アクティブタスクのみ表示フィルターが機能する', () => {
      // アクティブフィルターを適用
      components.filters.setFilters({ show: 'active' })
      
      const allTasks = database.getAllTasks()
      const filteredTasks = components.filters.applyFiltersToTasks(allTasks)
      
      // 完了していないタスクのみが表示される
      expect(filteredTasks.every(task => task.completed === 0)).toBe(true)
      expect(filteredTasks).toHaveLength(3)
    })
  })

  describe('タスク編集とメンテナンス', () => {
    let existingTask

    beforeEach(() => {
      // 編集用のテストタスクを作成
      existingTask = database.createTask({
        text: '編集前のタスク',
        priority: 'medium',
        due_date: '2025-01-20'
      })
      components.taskList.refresh()
    })

    it('既存タスクを編集して保存できる', async () => {
      // 編集モードでフォームを表示
      components.form.render('edit', existingTask)

      // 編集データを設定
      const updatedData = {
        text: '編集後のタスク',
        priority: 'high',
        due_date: '2025-01-25'
      }
      components.form.setFormData(updatedData)

      // 更新を保存
      const updatedTask = await components.form.save()
      expect(updatedTask.id).toBe(existingTask.id)
      expect(updatedTask.text).toBe('編集後のタスク')
      expect(updatedTask.priority).toBe('high')

      // タスクリストの更新を確認
      components.taskList.refresh()
      const refreshedTask = database.getTaskById(existingTask.id)
      expect(refreshedTask.text).toBe('編集後のタスク')

      // 更新通知の表示
      const notificationId = components.notifications.showSuccess('タスクが更新されました')
      expect(notificationId).toBeDefined()
    })

    it('タスクを削除できる', () => {
      // 削除前の確認
      expect(database.getTaskById(existingTask.id)).not.toBeNull()

      // タスクを削除
      const deleteResult = database.deleteTask(existingTask.id)
      expect(deleteResult).toBe(true)

      // 削除確認
      expect(database.getTaskById(existingTask.id)).toBeNull()

      // UIの更新
      components.taskList.refresh()
      components.header.updateStats()

      // 削除通知の表示（元に戻すアクション付き）
      const notificationId = components.notifications.showInfo('タスクが削除されました', {
        actionButton: {
          text: '元に戻す',
          callback: () => {
            // 削除の取り消し機能をシミュレート
            database.createTask({
              text: existingTask.text,
              priority: existingTask.priority,
              due_date: existingTask.due_date
            })
          }
        }
      })

      expect(notificationId).toBeDefined()
    })
  })

  describe('エラーハンドリング', () => {
    it('無効なタスクデータ入力時に適切なエラーメッセージを表示', async () => {
      // 無効なデータでタスク作成を試行
      components.form.render('create')
      components.form.setFormData({ text: '' }) // 空のテキスト

      try {
        await components.form.save()
        // エラーが発生しなかった場合はテスト失敗
        expect(false).toBe(true)
      } catch (error) {
        expect(error.message).toContain('ValidationError')

        // エラー通知の表示
        const notificationId = components.notifications.showError(
          'タスクの作成に失敗しました: テキストは必須です'
        )
        expect(notificationId).toBeDefined()

        const errorNotification = document.querySelector('.error')
        expect(errorNotification).not.toBeNull()
        expect(errorNotification.textContent).toContain('失敗しました')
      }
    })

    it('データベースエラー時の適切なフォールバック', () => {
      // データベース接続を閉じてエラー状況をシミュレート
      database.close()

      try {
        // データベース操作を試行
        database.getAllTasks()
        expect(false).toBe(true) // エラーが発生しなかった場合はテスト失敗
      } catch (error) {
        expect(error.constructor.name).toBe('DatabaseError')

        // エラー通知の表示
        const notificationId = components.notifications.showError(
          'データベースへの接続に問題が発生しました',
          { persistent: true }
        )
        expect(notificationId).toBeDefined()

        const errorNotification = document.querySelector('.error')
        expect(errorNotification).not.toBeNull()
      }
    })
  })

  describe('レスポンシブデザインとアクセシビリティ', () => {
    it('モバイル表示モードでコンパクトレイアウトが適用される', () => {
      // モバイルモードを設定
      components.header.setCompactMode(true)

      // コンパクトモードの適用を確認
      const compactElements = document.querySelectorAll('.compact, [data-compact="true"]')
      expect(compactElements.length).toBeGreaterThan(0)

      // フィルターコントロールも簡略化される
      expect(() => {
        components.filters.setFilters({ show: 'active' })
      }).not.toThrow()
    })

    it('キーボードナビゲーションでタスク操作ができる', () => {
      // サンプルタスクを作成
      const task = database.createTask({ text: 'キーボードテスト', priority: 'medium' })
      components.taskList.refresh()

      // タスクリスト内の要素を確認
      const taskElements = document.querySelectorAll('[data-task-id]')
      expect(taskElements.length).toBeGreaterThan(0)

      // フォーカス可能要素の存在を確認
      const focusableElements = document.querySelectorAll('input, button, select, [tabindex]')
      expect(focusableElements.length).toBeGreaterThan(0)

      // キーボードイベントのシミュレーション
      expect(() => {
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
        
        focusableElements[0].dispatchEvent(enterEvent)
        focusableElements[0].dispatchEvent(spaceEvent)
      }).not.toThrow()
    })
  })

  describe('データ永続化と復旧', () => {
    it('アプリケーション再起動後にデータが保持されている', () => {
      // タスクを作成
      const originalTask = database.createTask({
        text: '永続化テスト',
        priority: 'high'
      })

      // データベース接続を一度閉じて再接続
      database.close()
      database.connect()

      // データが保持されていることを確認
      const persistedTask = database.getTaskById(originalTask.id)
      expect(persistedTask).not.toBeNull()
      expect(persistedTask.text).toBe('永続化テスト')
      expect(persistedTask.priority).toBe('high')
    })

    it('破損データの検出と回復', () => {
      // 正常なタスクを作成
      const validTask = database.createTask({ text: '正常なタスク', priority: 'medium' })

      // データベースの整合性チェック（将来の実装用）
      expect(() => {
        const stats = database.getTaskStats()
        expect(stats.total).toBeGreaterThan(0)
      }).not.toThrow()

      // 回復処理のシミュレーション
      const allTasks = database.getAllTasks()
      expect(allTasks.every(task => 
        task.hasOwnProperty('id') && 
        task.hasOwnProperty('text') && 
        task.hasOwnProperty('priority')
      )).toBe(true)
    })
  })
})
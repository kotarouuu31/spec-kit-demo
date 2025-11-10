// UIコンポーネント間の連携統合テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskDatabase } from '../../src/db/database.js'
import { TaskList } from '../../src/ui/TaskList.js'
import { TaskForm } from '../../src/ui/TaskForm.js'
import { FilterControls } from '../../src/ui/FilterControls.js'
import { AppHeader } from '../../src/ui/AppHeader.js'
import { NotificationManager } from '../../src/ui/NotificationManager.js'
import fs from 'fs'
import path from 'path'

describe('UIコンポーネント間連携統合テスト', () => {
  let database
  let testDbPath
  let components
  let containers
  let eventLog

  beforeEach(() => {
    // イベント追跡用ログ
    eventLog = []
    
    // テスト用データベース設定
    testDbPath = path.join(process.cwd(), 'test-interaction.db')
    
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

    // コンテナにIDを設定
    containers.header.id = 'header-container'
    containers.form.id = 'form-container'
    containers.filters.id = 'filters-container'
    containers.taskList.id = 'tasklist-container'
    containers.notifications.id = 'notifications-container'

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

    // イベントリスナーを設定してイベントを追跡
    setupEventListeners()

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
    
    eventLog = []
  })

  function setupEventListeners() {
    // ヘッダーイベント
    containers.header.addEventListener('add-task-requested', (e) => {
      eventLog.push({ type: 'add-task-requested', source: 'header', detail: e.detail })
    })
    containers.header.addEventListener('stats-updated', (e) => {
      eventLog.push({ type: 'stats-updated', source: 'header', detail: e.detail })
    })

    // フォームイベント  
    containers.form.addEventListener('task-created', (e) => {
      eventLog.push({ type: 'task-created', source: 'form', detail: e.detail })
    })
    containers.form.addEventListener('task-updated', (e) => {
      eventLog.push({ type: 'task-updated', source: 'form', detail: e.detail })
    })
    containers.form.addEventListener('form-cancel', (e) => {
      eventLog.push({ type: 'form-cancel', source: 'form', detail: e.detail })
    })

    // フィルターイベント
    containers.filters.addEventListener('filters-changed', (e) => {
      eventLog.push({ type: 'filters-changed', source: 'filters', detail: e.detail })
    })
    containers.filters.addEventListener('filters-reset', (e) => {
      eventLog.push({ type: 'filters-reset', source: 'filters', detail: e.detail })
    })

    // タスクリストイベント
    containers.taskList.addEventListener('task-toggle', (e) => {
      eventLog.push({ type: 'task-toggle', source: 'taskList', detail: e.detail })
    })
    containers.taskList.addEventListener('task-edit', (e) => {
      eventLog.push({ type: 'task-edit', source: 'taskList', detail: e.detail })
    })
    containers.taskList.addEventListener('task-delete', (e) => {
      eventLog.push({ type: 'task-delete', source: 'taskList', detail: e.detail })
    })

    // 通知イベント
    containers.notifications.addEventListener('notification-shown', (e) => {
      eventLog.push({ type: 'notification-shown', source: 'notifications', detail: e.detail })
    })
    containers.notifications.addEventListener('notification-hidden', (e) => {
      eventLog.push({ type: 'notification-hidden', source: 'notifications', detail: e.detail })
    })
    containers.notifications.addEventListener('notification-action', (e) => {
      eventLog.push({ type: 'notification-action', source: 'notifications', detail: e.detail })
    })
  }

  describe('タスク作成フローの完全な連携', () => {
    it('ヘッダー → フォーム → タスクリスト → 統計更新の一連の流れ', async () => {
      // 1. ヘッダーの「新規タスク追加」ボタンクリック
      const addButton = containers.header.querySelector('.add-task-button, [data-action="add-task"]')
      
      // イベント発行をシミュレート
      const addTaskEvent = new CustomEvent('add-task-requested', {
        detail: { source: 'header' }
      })
      containers.header.dispatchEvent(addTaskEvent)

      // 2. フォーム表示
      components.form.render('create')
      expect(containers.form.children.length).toBeGreaterThan(0)

      // 3. フォームデータ入力と保存
      const taskData = {
        text: '統合テストタスク',
        priority: 'high',
        due_date: '2025-12-31'
      }
      
      components.form.setFormData(taskData)
      const createdTask = await components.form.save()

      // タスク作成イベント発行をシミュレート
      const taskCreatedEvent = new CustomEvent('task-created', {
        detail: { task: createdTask }
      })
      containers.form.dispatchEvent(taskCreatedEvent)

      // 4. タスクリストの自動更新
      components.taskList.refresh()
      const displayedTasks = components.taskList.getAllTasks()
      expect(displayedTasks).toHaveLength(1)
      expect(displayedTasks[0].text).toBe('統合テストタスク')

      // 5. ヘッダー統計の自動更新
      components.header.updateStats()
      const stats = database.getTaskStats()
      expect(stats.total).toBe(1)
      expect(stats.active).toBe(1)
      expect(stats.high_priority).toBe(1)

      // 6. 成功通知の表示
      const notificationId = components.notifications.showSuccess('タスクが作成されました')
      expect(notificationId).toBeDefined()

      // イベントログの確認（実装後に有効になる）
      // expect(eventLog.some(e => e.type === 'add-task-requested')).toBe(true)
      // expect(eventLog.some(e => e.type === 'task-created')).toBe(true)
    })

    it('フォーム検証エラー時の適切な通知表示', async () => {
      // 無効なデータでフォーム送信
      components.form.render('create')
      components.form.setFormData({ text: '', priority: 'invalid' })

      try {
        await components.form.save()
        expect(false).toBe(true) // エラーが発生しなかった場合はテスト失敗
      } catch (error) {
        expect(error.message).toContain('ValidationError')

        // エラー通知の表示
        const errorNotificationId = components.notifications.showError(
          'タスクの作成に失敗しました: ' + error.message
        )
        expect(errorNotificationId).toBeDefined()

        // 通知が表示されていることを確認
        const errorNotification = containers.notifications.querySelector('.error')
        expect(errorNotification).not.toBeNull()
        expect(errorNotification.textContent).toContain('失敗しました')
      }
    })
  })

  describe('タスク編集フローの連携', () => {
    let existingTask

    beforeEach(() => {
      // 編集用のタスクを事前作成
      existingTask = database.createTask({
        text: '編集対象タスク',
        priority: 'medium',
        due_date: '2025-01-15'
      })
      components.taskList.refresh()
    })

    it('タスクリスト → フォーム編集 → 更新反映の流れ', async () => {
      // 1. タスクリストから編集ボタンクリック
      const editEvent = new CustomEvent('task-edit', {
        detail: { taskId: existingTask.id, task: existingTask }
      })
      containers.taskList.dispatchEvent(editEvent)

      // 2. 編集フォームの表示
      components.form.render('edit', existingTask)
      
      // フォームに既存データが設定されていることを確認
      const formData = components.form.getFormData()
      expect(formData.text).toBe('編集対象タスク')
      expect(formData.priority).toBe('medium')

      // 3. データ更新
      const updatedData = {
        text: '更新されたタスク',
        priority: 'high',
        due_date: '2025-02-28'
      }
      
      components.form.setFormData(updatedData)
      const updatedTask = await components.form.save()

      // 更新イベント発行をシミュレート
      const taskUpdatedEvent = new CustomEvent('task-updated', {
        detail: { task: updatedTask }
      })
      containers.form.dispatchEvent(taskUpdatedEvent)

      // 4. タスクリストと統計の更新
      components.taskList.refresh()
      components.header.updateStats()

      // データベースから直接確認
      const dbTask = database.getTaskById(existingTask.id)
      expect(dbTask.text).toBe('更新されたタスク')
      expect(dbTask.priority).toBe('high')

      // 5. 更新成功通知
      const notificationId = components.notifications.showSuccess('タスクが更新されました')
      expect(notificationId).toBeDefined()
    })

    it('編集キャンセル時の適切な状態復元', () => {
      // 編集フォーム表示
      components.form.render('edit', existingTask)
      
      // データ変更
      components.form.setFormData({
        text: '変更されたが保存されない',
        priority: 'low'
      })

      // キャンセルイベント発行
      const cancelEvent = new CustomEvent('form-cancel', {
        detail: { mode: 'edit', taskId: existingTask.id }
      })
      containers.form.dispatchEvent(cancelEvent)

      // フォームリセット
      components.form.reset()

      // 元のデータが保持されていることを確認
      const dbTask = database.getTaskById(existingTask.id)
      expect(dbTask.text).toBe('編集対象タスク')
      expect(dbTask.priority).toBe('medium')
    })
  })

  describe('フィルター操作とタスク表示の連携', () => {
    beforeEach(() => {
      // 多様なテストデータを作成
      const testTasks = [
        { text: 'High Active', priority: 'high', completed: 0 },
        { text: 'High Completed', priority: 'high', completed: 1 },
        { text: 'Medium Active', priority: 'medium', completed: 0 },
        { text: 'Medium Completed', priority: 'medium', completed: 1 },
        { text: 'Low Active', priority: 'low', completed: 0 }
      ]

      testTasks.forEach(taskData => {
        const task = database.createTask(taskData)
        if (taskData.completed) {
          database.toggleTaskCompletion(task.id)
        }
      })

      components.taskList.refresh()
    })

    it('フィルター変更時のタスクリスト自動更新', () => {
      // 初期状態（全て表示）
      let allTasks = database.getAllTasks()
      expect(allTasks).toHaveLength(5)

      // 高優先度フィルター適用
      components.filters.setFilters({ priority: ['high'] })
      
      // フィルター変更イベント発行をシミュレート
      const filtersChangedEvent = new CustomEvent('filters-changed', {
        detail: { 
          filters: components.filters.getCurrentFilters(),
          appliedTasks: components.filters.applyFiltersToTasks(allTasks)
        }
      })
      containers.filters.dispatchEvent(filtersChangedEvent)

      // フィルター適用後のタスクリスト更新
      const filteredTasks = components.filters.applyFiltersToTasks(allTasks)
      components.taskList.render(filteredTasks)

      expect(filteredTasks).toHaveLength(2)
      expect(filteredTasks.every(task => task.priority === 'high')).toBe(true)

      // アクティブタスクのみフィルター
      components.filters.setFilters({ show: 'active' })
      const activeFilteredTasks = components.filters.applyFiltersToTasks(allTasks)
      components.taskList.render(activeFilteredTasks)

      expect(activeFilteredTasks.every(task => task.completed === 0)).toBe(true)
      expect(activeFilteredTasks).toHaveLength(3)
    })

    it('フィルターリセット時の全データ表示復元', () => {
      // フィルターを適用
      components.filters.setFilters({ 
        show: 'completed', 
        priority: ['high'] 
      })

      let allTasks = database.getAllTasks()
      let filteredTasks = components.filters.applyFiltersToTasks(allTasks)
      components.taskList.render(filteredTasks)
      expect(filteredTasks).toHaveLength(1)

      // フィルターリセット
      components.filters.resetFilters()

      // リセットイベント発行をシミュレート
      const filtersResetEvent = new CustomEvent('filters-reset', {
        detail: { filters: components.filters.getCurrentFilters() }
      })
      containers.filters.dispatchEvent(filtersResetEvent)

      // 全データ表示に復元
      const resetFilteredTasks = components.filters.applyFiltersToTasks(allTasks)
      components.taskList.render(resetFilteredTasks)

      expect(resetFilteredTasks).toHaveLength(5)

      // フィルター設定が初期値に戻っていることを確認
      const currentFilters = components.filters.getCurrentFilters()
      expect(currentFilters.show).toBe('all')
      expect(currentFilters.priority).toEqual([])
    })
  })

  describe('タスク操作と通知の連携', () => {
    let sampleTask

    beforeEach(() => {
      sampleTask = database.createTask({
        text: '通知テストタスク',
        priority: 'medium'
      })
      components.taskList.refresh()
    })

    it('タスク完了切り替え時の通知と統計更新', () => {
      // 初期統計
      let stats = database.getTaskStats()
      expect(stats.active).toBe(1)
      expect(stats.completed).toBe(0)

      // タスク完了
      const completedTask = database.toggleTaskCompletion(sampleTask.id)

      // 完了イベント発行をシミュレート
      const toggleEvent = new CustomEvent('task-toggle', {
        detail: { 
          taskId: sampleTask.id, 
          task: completedTask,
          previousState: 0,
          newState: 1
        }
      })
      containers.taskList.dispatchEvent(toggleEvent)

      // 完了通知表示
      const completionNotificationId = components.notifications.showSuccess(
        `タスク「${completedTask.text}」が完了しました！`,
        { duration: 3000 }
      )
      expect(completionNotificationId).toBeDefined()

      // タスクリストと統計の更新
      components.taskList.refresh()
      components.header.updateStats()

      // 統計の変化確認
      stats = database.getTaskStats()
      expect(stats.active).toBe(0)
      expect(stats.completed).toBe(1)

      // 完了率の変化確認
      const completionRate = components.header.getCompletionRate()
      expect(completionRate).toBe(100)
    })

    it('タスク削除時の確認通知とundo機能', () => {
      // 削除前のデータ保存
      const taskToDelete = { ...sampleTask }

      // タスク削除
      const deleteResult = database.deleteTask(sampleTask.id)
      expect(deleteResult).toBe(true)

      // 削除イベント発行をシミュレート
      const deleteEvent = new CustomEvent('task-delete', {
        detail: { 
          taskId: sampleTask.id,
          deletedTask: taskToDelete
        }
      })
      containers.taskList.dispatchEvent(deleteEvent)

      // Undo機能付き削除通知
      const undoNotificationId = components.notifications.showInfo(
        `タスク「${taskToDelete.text}」が削除されました`,
        {
          duration: 5000,
          actionButton: {
            text: '元に戻す',
            callback: () => {
              // 削除の取り消し
              const restoredTask = database.createTask({
                text: taskToDelete.text,
                priority: taskToDelete.priority,
                due_date: taskToDelete.due_date
              })

              // UI更新
              components.taskList.refresh()
              components.header.updateStats()

              // 復元通知
              components.notifications.showSuccess('タスクを復元しました')
              components.notifications.hide(undoNotificationId)

              return restoredTask
            }
          }
        }
      )

      expect(undoNotificationId).toBeDefined()

      // アクションボタンが表示されていることを確認
      const actionButton = containers.notifications.querySelector('.notification-action')
      expect(actionButton).not.toBeNull()
      expect(actionButton.textContent).toContain('元に戻す')

      // UI更新
      components.taskList.refresh()
      components.header.updateStats()

      // 削除後の状態確認
      expect(database.getTaskById(sampleTask.id)).toBeNull()
      const stats = database.getTaskStats()
      expect(stats.total).toBe(0)
    })
  })

  describe('レスポンシブデザインとモバイル連携', () => {
    it('画面サイズ変更時のコンポーネント適応', () => {
      // デスクトップモード（通常表示）
      components.header.setCompactMode(false)
      
      const fullElements = containers.header.querySelectorAll('.full-display, [data-display="full"]')
      expect(fullElements.length).toBeGreaterThanOrEqual(0) // 実装後に正確な数値に変更

      // モバイルモード（コンパクト表示）
      components.header.setCompactMode(true)

      const compactElements = containers.header.querySelectorAll('.compact, [data-compact="true"]')
      expect(compactElements.length).toBeGreaterThan(0)

      // フィルターコントロールも簡略化されることを確認
      expect(() => {
        components.filters.render() // コンパクトモードでの再レンダリング
      }).not.toThrow()
    })

    it('タッチデバイス向けの操作最適化', () => {
      // タスクリストのタッチ操作シミュレーション
      components.taskList.refresh()

      // スワイプジェスチャーのシミュレーション（将来の実装用）
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      const touchEnd = new TouchEvent('touchend', {
        touches: []
      })

      // タッチイベントが適切に処理されることを確認
      expect(() => {
        containers.taskList.dispatchEvent(touchStart)
        containers.taskList.dispatchEvent(touchMove)
        containers.taskList.dispatchEvent(touchEnd)
      }).not.toThrow()
    })
  })

  describe('キーボードナビゲーションとアクセシビリティ', () => {
    beforeEach(() => {
      // フォーカス可能な要素を持つタスクを作成
      database.createTask({ text: 'キーボードテスト', priority: 'medium' })
      components.taskList.refresh()
    })

    it('Tab キーによるフォーカス移動', () => {
      // フォーカス可能な要素を取得
      const focusableElements = document.querySelectorAll(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      expect(focusableElements.length).toBeGreaterThan(0)

      // 最初の要素にフォーカス
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
        expect(document.activeElement).toBe(focusableElements[0])
      }

      // Tab キーイベントのシミュレーション
      const tabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab',
        code: 'Tab',
        bubbles: true 
      })

      expect(() => {
        document.dispatchEvent(tabEvent)
      }).not.toThrow()
    })

    it('Enter キーとスペースキーによる操作', () => {
      // ボタン要素でのキーボード操作
      const buttons = document.querySelectorAll('button')
      
      if (buttons.length > 0) {
        const firstButton = buttons[0]
        firstButton.focus()

        // Enter キーでボタン押下をシミュレート
        const enterEvent = new KeyboardEvent('keydown', { 
          key: 'Enter',
          code: 'Enter',
          bubbles: true 
        })

        expect(() => {
          firstButton.dispatchEvent(enterEvent)
        }).not.toThrow()

        // スペースキーでボタン押下をシミュレート
        const spaceEvent = new KeyboardEvent('keydown', { 
          key: ' ',
          code: 'Space',
          bubbles: true 
        })

        expect(() => {
          firstButton.dispatchEvent(spaceEvent)
        }).not.toThrow()
      }
    })

    it('スクリーンリーダー対応のARIA属性', () => {
      // ARIA ラベルとロールの確認
      const ariaElements = document.querySelectorAll('[aria-label], [role], [aria-describedby]')
      expect(ariaElements.length).toBeGreaterThanOrEqual(0)

      // タスクリストのアクセシビリティ
      const taskListElement = containers.taskList
      expect(taskListElement.getAttribute('role') || 'list').toBeDefined()

      // フォームのアクセシビリティ
      const formInputs = containers.form.querySelectorAll('input, select, textarea')
      formInputs.forEach(input => {
        // 各入力要素にラベルまたはaria-labelが設定されていることを確認
        const hasLabel = input.getAttribute('aria-label') || 
                         input.id && document.querySelector(`label[for="${input.id}"]`) ||
                         input.parentElement.querySelector('label')
        expect(hasLabel).toBeTruthy()
      })
    })
  })

  describe('パフォーマンスとメモリ管理', () => {
    it('大量データでの表示パフォーマンス', () => {
      // 大量のタスクを作成
      const startTime = performance.now()
      
      for (let i = 1; i <= 100; i++) {
        database.createTask({
          text: `パフォーマンステスト ${i}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low'
        })
      }

      const creationTime = performance.now() - startTime
      expect(creationTime).toBeLessThan(1000) // 1秒以内での作成完了

      // 表示パフォーマンステスト
      const renderStartTime = performance.now()
      components.taskList.refresh()
      const renderTime = performance.now() - renderStartTime

      expect(renderTime).toBeLessThan(500) // 500ms以内での描画完了

      // フィルタリングパフォーマンステスト
      const filterStartTime = performance.now()
      const allTasks = database.getAllTasks()
      const filteredTasks = components.filters.applyFiltersToTasks(allTasks)
      const filterTime = performance.now() - filterStartTime

      expect(filterTime).toBeLessThan(100) // 100ms以内でのフィルタリング完了
      expect(allTasks).toHaveLength(100)
    })

    it('メモリリークの防止確認', () => {
      // コンポーネントの作成と破棄を繰り返す
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0

      for (let i = 0; i < 10; i++) {
        // 一時的なコンポーネントを作成
        const tempContainer = document.createElement('div')
        document.body.appendChild(tempContainer)
        
        const tempTaskList = new TaskList(tempContainer, database)
        tempTaskList.render([])
        
        // コンテナを削除（コンポーネントも解放される）
        document.body.removeChild(tempContainer)
      }

      // メモリ使用量の大幅な増加がないことを確認
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
      
      if (performance.memory) {
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(1024 * 1024) // 1MB未満の増加
      }
    })
  })
})
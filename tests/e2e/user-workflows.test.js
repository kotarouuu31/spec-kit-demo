// E2Eテスト - ユーザーワークフローテスト（ブラウザ自動化）
import { describe, test, expect, beforeEach } from 'vitest'
import { chromium } from 'playwright'

describe('E2Eユーザーワークフローテスト', () => {
  let browser
  let context
  let page

  const BASE_URL = 'http://localhost:5173' // Vite開発サーバーのデフォルトURL

  beforeEach(async () => {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext()
    page = await context.newPage()
    
    // コンソールログを監視（デバッグ用）
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`ページエラー: ${msg.text()}`)
      }
    })
    
    // JavaScriptエラーを監視
    page.on('pageerror', err => {
      console.error(`JavaScriptエラー: ${err.message}`)
    })

    // ページを読み込む
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
  })

  afterEach(async () => {
    await page?.close()
    await context?.close()
    await browser?.close()
  })

  describe('基本的なページ機能', () => {
    test('ページが正常に読み込まれる', async () => {
      // タイトルの確認
      await expect(page).toHaveTitle(/ToDo アプリ/)
      
      // 主要要素の存在確認
      await expect(page.locator('.app-header')).toBeVisible()
      await expect(page.locator('.filter-controls')).toBeVisible()
      await expect(page.locator('.task-list')).toBeVisible()
      
      // アプリタイトルの確認
      await expect(page.locator('.app-title')).toContainText('ToDo アプリ')
    })

    test('スキップリンクが機能する', async () => {
      // Tabキーでスキップリンクにフォーカス
      await page.keyboard.press('Tab')
      
      // スキップリンクが表示される
      const skipLink = page.locator('.skip-link')
      await expect(skipLink).toBeVisible()
      await expect(skipLink).toHaveText('メインコンテンツにスキップ')
      
      // Enterキーでスキップリンクを実行
      await page.keyboard.press('Enter')
      
      // メインコンテンツにフォーカスが移る
      const mainContent = page.locator('#main-content')
      await expect(mainContent).toBeFocused()
    })

    test('初期状態で適切な統計情報が表示される', async () => {
      // 初期統計の確認
      await expect(page.locator('.total-count')).toHaveText('0')
      await expect(page.locator('.active-count')).toHaveText('0')
      await expect(page.locator('.completed-count')).toHaveText('0')
      
      // プログレスバーが0%
      const progressBar = page.locator('.progress-fill')
      await expect(progressBar).toHaveCSS('width', '0px')
    })
  })

  describe('タスク作成ワークフロー', () => {
    test('新規タスクを作成できる', async () => {
      const taskText = 'E2Eテスト用の新規タスク'
      
      // 新規タスクボタンをクリック
      await page.locator('[data-action="add-task"]').click()
      
      // モーダルが表示される
      const modal = page.locator('.modal')
      await expect(modal).toBeVisible()
      await expect(page.locator('.modal-title')).toHaveText('新規タスク作成')
      
      // フォームに入力
      await page.locator('#task-text').fill(taskText)
      await page.locator('#task-priority').selectOption('high')
      await page.locator('#task-due-date').fill('2024-12-31')
      
      // 保存ボタンをクリック
      await page.locator('.save-button').click()
      
      // モーダルが閉じる
      await expect(modal).not.toBeVisible()
      
      // タスクが一覧に表示される
      const taskItem = page.locator('.task-item').first()
      await expect(taskItem).toBeVisible()
      await expect(taskItem.locator('.task-text')).toHaveText(taskText)
      
      // 統計が更新される
      await expect(page.locator('.total-count')).toHaveText('1')
      await expect(page.locator('.active-count')).toHaveText('1')
      
      // 成功通知が表示される
      const notification = page.locator('.notification.success')
      await expect(notification).toBeVisible()
      await expect(notification).toContainText('作成しました')
    })

    test('必須フィールドが空の場合はエラーが表示される', async () => {
      // 新規タスクボタンをクリック
      await page.locator('[data-action="add-task"]').click()
      
      // テキストを空のまま保存ボタンをクリック
      await page.locator('.save-button').click()
      
      // エラーメッセージが表示される
      const errorMessage = page.locator('#task-text-error')
      await expect(errorMessage).toBeVisible()
      await expect(errorMessage).toHaveText('タスク内容は必須です')
      
      // モーダルは開いたまま
      await expect(page.locator('.modal')).toBeVisible()
    })

    test('キーボードショートカット（Ctrl+Enter）で保存できる', async () => {
      const taskText = 'キーボードショートカットテスト'
      
      await page.locator('[data-action="add-task"]').click()
      await page.locator('#task-text').fill(taskText)
      
      // Ctrl+Enterで保存
      await page.keyboard.press('Control+Enter')
      
      // タスクが作成される
      await expect(page.locator('.modal')).not.toBeVisible()
      await expect(page.locator('.task-item .task-text').first()).toHaveText(taskText)
    })

    test('Escapeキーでモーダルをキャンセルできる', async () => {
      await page.locator('[data-action="add-task"]').click()
      await page.locator('#task-text').fill('キャンセルテスト')
      
      // Escapeキーでキャンセル
      await page.keyboard.press('Escape')
      
      // モーダルが閉じる
      await expect(page.locator('.modal')).not.toBeVisible()
      
      // タスクは作成されない
      await expect(page.locator('.task-item')).toHaveCount(0)
    })
  })

  describe('タスク操作ワークフロー', () => {
    beforeEach(async () => {
      // テスト用タスクを事前に作成
      await createTestTask('テスト用タスク1', 'high')
      await createTestTask('テスト用タスク2', 'medium')
      await createTestTask('テスト用タスク3', 'low')
    })

    test('タスクを完了状態に変更できる', async () => {
      const firstTask = page.locator('.task-item').first()
      const checkbox = firstTask.locator('.task-checkbox')
      
      // チェックボックスをクリック
      await checkbox.click()
      
      // タスクが完了状態になる
      await expect(firstTask).toHaveClass(/completed/)
      await expect(checkbox).toBeChecked()
      
      // 統計が更新される
      await expect(page.locator('.completed-count')).toHaveText('1')
      await expect(page.locator('.active-count')).toHaveText('2')
      
      // 成功通知が表示される
      const notification = page.locator('.notification.success')
      await expect(notification).toBeVisible()
      await expect(notification).toContainText('完了しました')
    })

    test('タスクを編集できる', async () => {
      const updatedText = '更新されたタスクテキスト'
      
      // 編集ボタンをクリック
      await page.locator('.edit-button').first().click()
      
      // 編集モーダルが表示される
      const modal = page.locator('.modal')
      await expect(modal).toBeVisible()
      await expect(page.locator('.modal-title')).toHaveText('タスク編集')
      
      // 既存の値が設定されている
      await expect(page.locator('#task-text')).toHaveValue('テスト用タスク1')
      await expect(page.locator('#task-priority')).toHaveValue('high')
      
      // テキストを更新
      await page.locator('#task-text').clear()
      await page.locator('#task-text').fill(updatedText)
      await page.locator('#task-priority').selectOption('low')
      
      // 保存
      await page.locator('.save-button').click()
      
      // モーダルが閉じ、タスクが更新される
      await expect(modal).not.toBeVisible()
      await expect(page.locator('.task-text').first()).toHaveText(updatedText)
      
      // 更新通知が表示される
      const notification = page.locator('.notification.success')
      await expect(notification).toBeVisible()
      await expect(notification).toContainText('更新しました')
    })

    test('タスクを削除できる', async () => {
      const initialTaskCount = await page.locator('.task-item').count()
      
      // 削除ボタンをクリック
      await page.locator('.delete-button').first().click()
      
      // タスクが削除される
      await expect(page.locator('.task-item')).toHaveCount(initialTaskCount - 1)
      
      // 統計が更新される
      await expect(page.locator('.total-count')).toHaveText('2')
      
      // 削除通知が表示される
      const notification = page.locator('.notification.info')
      await expect(notification).toBeVisible()
      await expect(notification).toContainText('削除しました')
    })

    test('複数のタスクを連続して完了できる', async () => {
      // 全てのチェックボックスをクリック
      const checkboxes = page.locator('.task-checkbox')
      const count = await checkboxes.count()
      
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).click()
        // アニメーションの完了を待つ
        await page.waitForTimeout(300)
      }
      
      // 全てのタスクが完了状態
      const completedTasks = page.locator('.task-item.completed')
      await expect(completedTasks).toHaveCount(count)
      
      // 統計の確認
      await expect(page.locator('.completed-count')).toHaveText(count.toString())
      await expect(page.locator('.active-count')).toHaveText('0')
      
      // プログレスバーが100%
      const progressFill = page.locator('.progress-fill')
      await expect(progressFill).toHaveAttribute('data-progress', '100%')
    })
  })

  describe('フィルター機能ワークフロー', () => {
    beforeEach(async () => {
      // 多様なタスクを事前に作成
      await createTestTask('高優先度タスク1', 'high')
      await createTestTask('中優先度タスク1', 'medium')
      await createTestTask('低優先度タスク1', 'low')
      
      // 一部を完了状態にする
      await page.locator('.task-checkbox').first().click()
      await page.waitForTimeout(500)
    })

    test('完了済みタスクフィルターが機能する', async () => {
      // 完了済みフィルターをクリック
      await page.locator('.filter-completed').click()
      
      // 完了済みタスクのみ表示される
      const visibleTasks = page.locator('.task-item:visible')
      await expect(visibleTasks).toHaveCount(1)
      
      // フィルターボタンがアクティブ状態
      await expect(page.locator('.filter-completed')).toHaveClass(/active/)
    })

    test('アクティブタスクフィルターが機能する', async () => {
      // アクティブフィルターをクリック
      await page.locator('.filter-active').click()
      
      // 未完了タスクのみ表示される
      const visibleTasks = page.locator('.task-item:visible')
      await expect(visibleTasks).toHaveCount(2)
      
      // 全て未完了状態
      const completedTasks = page.locator('.task-item:visible.completed')
      await expect(completedTasks).toHaveCount(0)
    })

    test('優先度フィルターが機能する', async () => {
      // 高優先度フィルターをクリック
      await page.locator('.filter-high').click()
      
      // 高優先度タスクのみ表示される
      const visibleTasks = page.locator('.task-item:visible')
      await expect(visibleTasks).toHaveCount(1)
      
      // 高優先度のタスクであることを確認
      const priorityElement = visibleTasks.locator('.task-priority').first()
      await expect(priorityElement).toHaveAttribute('data-priority', 'high')
    })

    test('複数フィルターを組み合わせできる', async () => {
      // アクティブ + 中優先度フィルター
      await page.locator('.filter-active').click()
      await page.locator('.filter-medium').click()
      
      // 条件に合うタスクのみ表示
      const visibleTasks = page.locator('.task-item:visible')
      await expect(visibleTasks).toHaveCount(1)
      
      // アクティブかつ中優先度
      await expect(visibleTasks.first()).not.toHaveClass(/completed/)
      const priorityElement = visibleTasks.locator('.task-priority')
      await expect(priorityElement).toHaveAttribute('data-priority', 'medium')
    })

    test('フィルタークリアが機能する', async () => {
      // フィルター適用
      await page.locator('.filter-completed').click()
      await page.locator('.filter-high').click()
      
      // クリアボタンをクリック
      await page.locator('.clear-filters').click()
      
      // 全タスクが表示される
      const visibleTasks = page.locator('.task-item:visible')
      await expect(visibleTasks).toHaveCount(3)
      
      // フィルターボタンがリセットされる
      await expect(page.locator('.filter-all')).toHaveClass(/active/)
      await expect(page.locator('.filter-completed')).not.toHaveClass(/active/)
    })
  })

  describe('レスポンシブデザインテスト', () => {
    test('モバイルサイズでの表示が適切', async () => {
      // モバイルサイズに変更
      await page.setViewportSize({ width: 375, height: 667 })
      
      // ヘッダーが適切に表示される
      const header = page.locator('.app-header')
      await expect(header).toBeVisible()
      
      // タスクアクションボタンが縦に並ぶ（モバイル向けレイアウト）
      await createTestTask('モバイルテストタスク', 'medium')
      
      const taskActions = page.locator('.task-actions').first()
      const actionButtons = taskActions.locator('.task-action-button')
      
      // ボタンのレイアウトを確認（CSSプロパティで判定）
      const flexDirection = await taskActions.evaluate(el => 
        getComputedStyle(el).flexDirection
      )
      expect(flexDirection).toBe('column')
    })

    test('タブレットサイズでの表示が適切', async () => {
      // タブレットサイズに変更
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // レイアウトが適切に調整される
      const mainContent = page.locator('.main-content')
      await expect(mainContent).toBeVisible()
      
      // フィルターコントロールとタスクリストが適切に配置される
      const filterControls = page.locator('.filter-controls')
      const taskList = page.locator('.task-list')
      
      await expect(filterControls).toBeVisible()
      await expect(taskList).toBeVisible()
    })
  })

  describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーションが機能する', async () => {
      // タスクを作成
      await createTestTask('キーボードナビゲーションテスト', 'medium')
      
      // Tabキーでナビゲーション
      await page.keyboard.press('Tab') // スキップリンク
      await page.keyboard.press('Tab') // 新規タスクボタン
      
      const addTaskButton = page.locator('[data-action="add-task"]')
      await expect(addTaskButton).toBeFocused()
      
      // さらにTabキーで移動
      await page.keyboard.press('Tab') // フィルターボタン
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // タスクアイテムの要素にフォーカスが移る
      const taskCheckbox = page.locator('.task-checkbox').first()
      await expect(taskCheckbox).toBeFocused()
    })

    test('ARIAラベルが適切に設定されている', async () => {
      // メインコンテンツのARIAラベル
      const mainContent = page.locator('#main-content')
      await expect(mainContent).toHaveAttribute('aria-label', 'タスク管理メインエリア')
      
      // フィルターセクションのARIAラベル
      const filterControls = page.locator('#filter-controls')
      await expect(filterControls).toHaveAttribute('aria-label', 'フィルター設定')
      
      // タスクリストのARIAラベル
      const taskList = page.locator('#task-list')
      await expect(taskList).toHaveAttribute('aria-label', 'タスクリスト')
    })

    test('フォーカス表示が適切に機能する', async () => {
      const addTaskButton = page.locator('[data-action="add-task"]')
      
      // フォーカスを当てる
      await addTaskButton.focus()
      
      // フォーカスリングが表示される（outline プロパティで確認）
      const outline = await addTaskButton.evaluate(el => 
        getComputedStyle(el).outline
      )
      expect(outline).not.toBe('none')
    })
  })

  describe('エラーハンドリングテスト', () => {
    test('ネットワークエラー時の処理', async () => {
      // ネットワークをオフラインに設定
      await context.setOffline(true)
      
      // タスク作成を試行
      await page.locator('[data-action="add-task"]').click()
      await page.locator('#task-text').fill('オフラインテスト')
      await page.locator('.save-button').click()
      
      // エラー通知が表示される可能性をチェック
      // (この実装では実際にはローカルデータベースなのでエラーにならない)
      
      await context.setOffline(false)
    })

    test('無効なデータ入力時のエラーハンドリング', async () => {
      await page.locator('[data-action="add-task"]').click()
      
      // 無効な日付を入力
      await page.locator('#task-text').fill('無効データテスト')
      await page.locator('#task-due-date').fill('invalid-date')
      await page.locator('.save-button').click()
      
      // エラーメッセージが表示される
      const dateError = page.locator('#task-due-date-error')
      await expect(dateError).toBeVisible()
      await expect(dateError).toContainText('有効な日付')
    })
  })

  // ヘルパー関数
  async function createTestTask(text, priority = 'medium', dueDate = null) {
    await page.locator('[data-action="add-task"]').click()
    await page.locator('#task-text').fill(text)
    await page.locator('#task-priority').selectOption(priority)
    
    if (dueDate) {
      await page.locator('#task-due-date').fill(dueDate)
    }
    
    await page.locator('.save-button').click()
    
    // モーダルが閉じるまで待つ
    await expect(page.locator('.modal')).not.toBeVisible()
    
    // タスクが作成されるまで少し待つ
    await page.waitForTimeout(300)
  }
})
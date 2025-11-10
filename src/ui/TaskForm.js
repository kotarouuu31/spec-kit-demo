// TaskFormクラス - タスクフォーム管理
import { BaseComponent, DOMHelper } from '../utils/dom-helpers.js'
import { taskValidator } from '../utils/validation.js'
import { logger, ErrorHandler } from '../utils/logger.js'
import { EventHelper } from '../utils/event-helpers.js'

export class TaskForm extends BaseComponent {
  constructor(container, database) {
    super(container)
    
    if (!database) {
      throw new Error('Database must be provided')
    }

    this.database = database
    this.mode = 'create' // 'create' or 'edit'
    this.currentTask = null
    this.validationErrors = {}
    this.errorHandler = new ErrorHandler(logger)

    this.init()
  }

  // 初期化
  init() {
    DOMHelper.addClass(this.container, 'modal')
    DOMHelper.toggleDisplay(this.container, false)
    this.cacheElements()
    this.setupEventListeners()
  }

  // DOM要素をキャッシュ
  cacheElements() {
    // BaseComponentのcacheElementメソッドを使用
    this.cacheElement('modalTitle', '#modal-title, .modal-title')
    this.cacheElement('form', '#task-form, .task-form')
    
    // フォームフィールド
    this.cacheElement('textInput', '#task-text, [name="text"]')
    this.cacheElement('prioritySelect', '#task-priority, [name="priority"]')
    this.cacheElement('categorySelect', '#task-category, [name="category_id"]')
    this.cacheElement('dueDateInput', '#task-due-date, [name="due_date"]')
    
    // エラー表示
    this.cacheElement('textError', '#task-text-error')
    this.cacheElement('categoryError', '#task-category-error')
    this.cacheElement('dueDateError', '#task-due-date-error')
    
    // ボタン
    this.cacheElement('saveButton', '[data-action="save"], .save-button')
    this.cacheElement('cancelButton', '[data-action="cancel"], .cancel-button')
    this.cacheElement('closeButton', '[data-action="close"], .modal-close')
    
    // その他
    this.cacheElement('backdrop', '.modal-backdrop')
  }

  // イベントリスナー設定
  setupEventListeners() {
    // フォーム送信
    this.addEventListenerSafe('form', 'submit', (e) => {
      e.preventDefault()
      this.handleFormSubmit()
    })

    // 保存ボタン
    this.addEventListenerSafe('saveButton', 'click', (e) => {
      e.preventDefault()
      this.handleFormSubmit()
    })

    // キャンセルボタン
    this.addEventListenerSafe('cancelButton', 'click', (e) => {
      e.preventDefault()
      this.handleCancel()
    })

    // 閉じるボタン
    this.addEventListenerSafe('closeButton', 'click', (e) => {
      e.preventDefault()
      this.handleCancel()
    })

    // バックドロップクリック
    this.addEventListenerSafe('backdrop', 'click', (e) => {
      if (e.target === this.getElement('backdrop')) {
        this.handleCancel()
      }
    })

    // キーボードショートカット
    DOMHelper.addEventListener(this.container, 'keydown', (e) => {
      this.handleKeyboardShortcuts(e)
    })

    // リアルタイム検証
    this.setupRealTimeValidation()
  }

  // リアルタイム検証設定
  setupRealTimeValidation() {
    // テキスト入力の検証
    this.addEventListenerSafe('textInput', 'blur', () => {
      this.validateField('text')
    })
    
    this.addEventListenerSafe('textInput', 'input', () => {
      // エラーがある場合のみリアルタイムでクリア
      if (this.validationErrors.text) {
        this.validateField('text')
      }
    })

    // 期日入力の検証
    this.addEventListenerSafe('dueDateInput', 'blur', () => {
      this.validateField('due_date')
    })
    
    this.addEventListenerSafe('dueDateInput', 'change', () => {
      this.validateField('due_date')
    })
  }


  // レンダリングパラメータの検証
  validateRenderParams(mode, task) {
    if (!['create', 'edit'].includes(mode)) {
      throw new Error('ValidationError: Mode must be create or edit')
    }
    
    if (mode === 'edit' && !task) {
      throw new Error('ValidationError: Task is required for edit mode')
    }
  }

  // モーダルタイトル更新
  updateModalTitle() {
    const titleText = this.mode === 'create' ? '新規タスク作成' : 'タスク編集'
    DOMHelper.setText(this.getElement('modalTitle'), titleText)
  }

  // フォームデータ設定
  setFormData(taskData) {
    DOMHelper.setValue(this.getElement('textInput'), taskData.text || '')
    DOMHelper.setValue(this.getElement('prioritySelect'), taskData.priority || 'medium')
    DOMHelper.setValue(this.getElement('categorySelect'), taskData.category_id || '')
    DOMHelper.setValue(this.getElement('dueDateInput'), taskData.due_date || '')
  }

  // フォームデータ取得
  getFormData() {
    const textInput = this.getElement('textInput')
    const prioritySelect = this.getElement('prioritySelect')
    const categorySelect = this.getElement('categorySelect')
    const dueDateInput = this.getElement('dueDateInput')
    
    const formData = {
      text: textInput?.value?.trim() || '',
      priority: prioritySelect?.value || 'medium',
      category_id: categorySelect?.value || null,
      due_date: dueDateInput?.value || null
    }

    // 空文字列はnullに変換
    if (formData.due_date === '') {
      formData.due_date = null
    }
    if (formData.category_id === '') {
      formData.category_id = null
    }

    return formData
  }

  // フォーム検証
  validate() {
    const formData = this.getFormData()
    const validation = taskValidator.validate(formData)
    
    this.validationErrors = {}
    if (!validation.isValid) {
      // バリデーションエラーを内部形式に変換
      for (const [field, errors] of Object.entries(validation.errors)) {
        this.validationErrors[field] = errors[0] // 最初のエラーメッセージを使用
      }
    }

    return {
      isValid: validation.isValid,
      errors: Object.keys(this.validationErrors)
    }
  }

  // 個別フィールドの検証
  validateField(fieldName) {
    const formData = this.getFormData()
    const fieldValue = formData[fieldName]
    
    try {
      const result = taskValidator.validateField(formData, fieldName)
      
      if (result.isValid) {
        delete this.validationErrors[fieldName]
      } else {
        this.validationErrors[fieldName] = result.errors[0]
      }
    } catch (error) {
      logger.warn('フィールドバリデーションエラー', { fieldName, error: error.message })
    }
    
    this.displayFieldError(fieldName)
  }

  // フォーム送信処理
  async handleFormSubmit() {
    return await this.errorHandler.safeAsync(async () => {
      const validation = this.validate()
      
      if (!validation.isValid) {
        this.displayValidationErrors()
        throw new Error('ValidationError: フォームの入力内容を確認してください')
      }
      
      const formData = this.getFormData()
      let savedTask
      
      if (this.mode === 'create') {
        savedTask = this.database.createTask(formData)
        EventHelper.dispatchCustomEvent(this.container, 'task-created', { task: savedTask })
      } else {
        savedTask = this.database.updateTask(this.currentTask.id, formData)
        EventHelper.dispatchCustomEvent(this.container, 'task-updated', { task: savedTask })
      }
      
      return savedTask
    }, 'task-form-submit')
  }

  // 保存メソッド（公開API）
  async save() {
    return this.handleFormSubmit()
  }

  // キャンセル処理
  handleCancel() {
    EventHelper.dispatchCustomEvent(this.container, 'form-cancel', {
      mode: this.mode,
      taskId: this.currentTask?.id || null
    })
  }

  // フォームリセット
  reset() {
    const form = this.getElement('form')
    if (form) {
      form.reset()
    }
    
    this.clearValidationErrors()
    this.mode = 'create'
    this.currentTask = null
  }

  // 検証エラー表示
  displayValidationErrors() {
    Object.keys(this.validationErrors).forEach(fieldName => {
      this.displayFieldError(fieldName)
    })
  }

  // 個別フィールドエラー表示
  displayFieldError(fieldName) {
    const errorElement = this.getElement(`${fieldName}Error`) || 
                        DOMHelper.getElement(`#${fieldName.replace('_', '-')}-error`, this.container)
    
    const error = this.validationErrors[fieldName]
    if (errorElement) {
      DOMHelper.setText(errorElement, error || '')
      DOMHelper.toggleDisplay(errorElement, !!error)
    }
    
    // 入力フィールドの状態更新
    const inputElement = fieldName === 'due_date' ? this.getElement('dueDateInput') :
                        fieldName === 'text' ? this.getElement('textInput') : null
    
    if (inputElement) {
      if (error) {
        DOMHelper.addClass(inputElement, 'error')
        DOMHelper.setAttribute(inputElement, 'aria-invalid', 'true')
      } else {
        DOMHelper.removeClass(inputElement, 'error')
        DOMHelper.removeAttribute(inputElement, 'aria-invalid')
      }
    }
  }

  // 検証エラークリア
  clearValidationErrors() {
    this.validationErrors = {}
    
    // 各エラー表示要素をクリア
    const errorElements = ['textError', 'dueDateError']
    errorElements.forEach(key => {
      const element = this.getElement(key)
      if (element) {
        DOMHelper.setText(element, '')
        DOMHelper.toggleDisplay(element, false)
      }
    })
    
    // 入力フィールドのエラー状態をクリア
    const inputElements = ['textInput', 'dueDateInput', 'prioritySelect']
    inputElements.forEach(key => {
      const element = this.getElement(key)
      if (element) {
        DOMHelper.removeClass(element, 'error')
        DOMHelper.removeAttribute(element, 'aria-invalid')
      }
    })
  }

  // フォーム状態更新
  updateFormState() {
    // 保存ボタンの状態
    const buttonText = this.mode === 'create' ? '作成' : '更新'
    DOMHelper.setText(this.getElement('saveButton'), buttonText)
  }

  // キーボードショートカット処理
  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Enter: 保存
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      this.handleFormSubmit()
    }
    
    // Escape: キャンセル
    if (event.key === 'Escape') {
      event.preventDefault()
      this.handleCancel()
    }
  }


  // アクセシビリティの設定
  updateAriaLabels() {
    // フォームのARIAラベル
    const form = this.getElement('form')
    if (form) {
      DOMHelper.setAttribute(form, 'aria-labelledby', 'modal-title')
    }
    
    // 必須フィールドのマーク
    const textInput = this.getElement('textInput')
    if (textInput) {
      DOMHelper.setAttribute(textInput, 'aria-required', 'true')
    }
    
    // エラーとの関連付け
    const textError = this.getElement('textError')
    if (textInput && textError) {
      DOMHelper.setAttribute(textInput, 'aria-describedby', textError.id)
    }
    
    const dueDateInput = this.getElement('dueDateInput')
    const dueDateError = this.getElement('dueDateError')
    if (dueDateInput && dueDateError) {
      DOMHelper.setAttribute(dueDateInput, 'aria-describedby', dueDateError.id)
    }
  }

  // フォーカス管理
  focusFirstField() {
    const textInput = this.getElement('textInput')
    if (textInput) {
      DOMHelper.focus(textInput)
      DOMHelper.selectText(textInput)
    }
  }

  // フォームの有効性状態
  isValid() {
    return this.validate().isValid
  }

  // 現在のモードを取得
  getCurrentMode() {
    return this.mode
  }

  // 現在編集中のタスクを取得
  getCurrentTask() {
    return this.currentTask ? { ...this.currentTask } : null
  }

  // クリーンアップ
  destroy() {
    this.reset()
    
    DOMHelper.toggleDisplay(this.container, false)
    
    // BaseComponentのdestroyを呼び出し
    super.destroy()
    
    this.validationErrors = {}
    this.currentTask = null
  }

  // カテゴリオプションを更新
  async updateCategoryOptions() {
    return await this.errorHandler.safeAsync(async () => {
      const categories = await this.database.getAllCategories()
      const categorySelect = this.getElement('categorySelect')
      
      if (!categorySelect) {
        logger.warn('Category select element not found')
        return
      }

      // 既存のオプションをクリア（最初の「未分類」オプション以外）
      const firstOption = categorySelect.querySelector('option[value=""]')
      categorySelect.innerHTML = ''
      if (firstOption) {
        categorySelect.appendChild(firstOption.cloneNode(true))
      } else {
        const uncategorizedOption = document.createElement('option')
        uncategorizedOption.value = ''
        uncategorizedOption.textContent = '未分類'
        categorySelect.appendChild(uncategorizedOption)
      }

      // カテゴリオプションを追加
      categories.forEach(category => {
        const option = document.createElement('option')
        option.value = category.id
        option.textContent = category.name
        option.style.backgroundColor = category.color + '20' // 薄い背景色
        categorySelect.appendChild(option)
      })
      
      logger.info('Category options updated:', categories.length)
    }, 'update-category-options')
  }

  // レンダリング前にカテゴリオプションを更新
  async render(mode, task = null) {
    this.validateRenderParams(mode, task)
    
    this.mode = mode
    this.currentTask = task ? { ...task } : null
    
    // カテゴリオプションを更新
    await this.updateCategoryOptions()
    
    this.updateModalTitle()
    this.setFormData(task || {})
    this.clearValidationErrors()
    this.updateFormState()
  }

  // デバッグ用情報
  getDebugInfo() {
    return {
      mode: this.mode,
      currentTask: this.currentTask,
      validationErrors: { ...this.validationErrors },
      formData: this.getFormData(),
      isValid: this.isValid(),
      elementsFound: Array.from(this.elements.keys()).filter(key => this.getElement(key) !== null)
    }
  }
}
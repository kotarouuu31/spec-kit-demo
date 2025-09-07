// TaskFormクラス - タスクフォーム管理
export class TaskForm {
  constructor(container, database) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid HTML element')
    }
    
    if (!database) {
      throw new Error('Database must be provided')
    }

    this.container = container
    this.database = database
    this.mode = 'create' // 'create' or 'edit'
    this.currentTask = null
    this.validationErrors = {}

    this.init()
  }

  // 初期化
  init() {
    this.container.className = 'modal'
    this.container.style.display = 'none'
    this.cacheElements()
    this.setupEventListeners()
  }

  // DOM要素をキャッシュ
  cacheElements() {
    this.elements = {
      modalTitle: this.container.querySelector('#modal-title, .modal-title'),
      form: this.container.querySelector('#task-form, .task-form'),
      
      // フォームフィールド
      textInput: this.container.querySelector('#task-text, [name="text"]'),
      prioritySelect: this.container.querySelector('#task-priority, [name="priority"]'),
      dueDateInput: this.container.querySelector('#task-due-date, [name="due_date"]'),
      
      // エラー表示
      textError: this.container.querySelector('#task-text-error'),
      dueDateError: this.container.querySelector('#task-due-date-error'),
      
      // ボタン
      saveButton: this.container.querySelector('[data-action="save"], .save-button'),
      cancelButton: this.container.querySelector('[data-action="cancel"], .cancel-button'),
      closeButton: this.container.querySelector('[data-action="close"], .modal-close'),
      
      // その他
      backdrop: this.container.querySelector('.modal-backdrop')
    }
  }

  // イベントリスナー設定
  setupEventListeners() {
    // フォーム送信
    if (this.elements.form) {
      this.elements.form.addEventListener('submit', (e) => {
        e.preventDefault()
        this.handleFormSubmit()
      })
    }

    // 保存ボタン
    if (this.elements.saveButton) {
      this.elements.saveButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.handleFormSubmit()
      })
    }

    // キャンセルボタン
    if (this.elements.cancelButton) {
      this.elements.cancelButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.handleCancel()
      })
    }

    // 閉じるボタン
    if (this.elements.closeButton) {
      this.elements.closeButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.handleCancel()
      })
    }

    // バックドロップクリック
    if (this.elements.backdrop) {
      this.elements.backdrop.addEventListener('click', (e) => {
        if (e.target === this.elements.backdrop) {
          this.handleCancel()
        }
      })
    }

    // キーボードショートカット
    this.container.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e)
    })

    // リアルタイム検証
    this.setupRealTimeValidation()
  }

  // リアルタイム検証設定
  setupRealTimeValidation() {
    // テキスト入力の検証
    if (this.elements.textInput) {
      this.elements.textInput.addEventListener('blur', () => {
        this.validateField('text')
      })
      
      this.elements.textInput.addEventListener('input', () => {
        // エラーがある場合のみリアルタイムでクリア
        if (this.validationErrors.text) {
          this.validateField('text')
        }
      })
    }

    // 期日入力の検証
    if (this.elements.dueDateInput) {
      this.elements.dueDateInput.addEventListener('blur', () => {
        this.validateField('due_date')
      })
      
      this.elements.dueDateInput.addEventListener('change', () => {
        this.validateField('due_date')
      })
    }
  }

  // レンダリング
  render(mode, task = null) {
    this.validateRenderParams(mode, task)
    
    this.mode = mode
    this.currentTask = task ? { ...task } : null
    
    this.updateModalTitle()
    this.setFormData(task || {})
    this.clearValidationErrors()
    this.updateFormState()
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
    if (this.elements.modalTitle) {
      this.elements.modalTitle.textContent = 
        this.mode === 'create' ? '新規タスク作成' : 'タスク編集'
    }
  }

  // フォームデータ設定
  setFormData(taskData) {
    if (this.elements.textInput) {
      this.elements.textInput.value = taskData.text || ''
    }
    
    if (this.elements.prioritySelect) {
      this.elements.prioritySelect.value = taskData.priority || 'medium'
    }
    
    if (this.elements.dueDateInput) {
      this.elements.dueDateInput.value = taskData.due_date || ''
    }
  }

  // フォームデータ取得
  getFormData() {
    const formData = {
      text: this.elements.textInput?.value?.trim() || '',
      priority: this.elements.prioritySelect?.value || 'medium',
      due_date: this.elements.dueDateInput?.value || null
    }

    // 空文字列はnullに変換
    if (formData.due_date === '') {
      formData.due_date = null
    }

    return formData
  }

  // フォーム検証
  validate() {
    this.validationErrors = {}
    
    const formData = this.getFormData()
    
    // テキストの検証
    if (!formData.text) {
      this.validationErrors.text = 'タスク内容は必須です'
    }
    
    // 期日の検証
    if (formData.due_date && !this.isValidDate(formData.due_date)) {
      this.validationErrors.due_date = '有効な日付を入力してください'
    }
    
    // 優先度の検証
    if (!['low', 'medium', 'high'].includes(formData.priority)) {
      this.validationErrors.priority = '有効な優先度を選択してください'
    }

    return {
      isValid: Object.keys(this.validationErrors).length === 0,
      errors: Object.keys(this.validationErrors)
    }
  }

  // 個別フィールドの検証
  validateField(fieldName) {
    const formData = this.getFormData()
    
    switch (fieldName) {
      case 'text':
        if (!formData.text) {
          this.validationErrors.text = 'タスク内容は必須です'
        } else {
          delete this.validationErrors.text
        }
        break
        
      case 'due_date':
        if (formData.due_date && !this.isValidDate(formData.due_date)) {
          this.validationErrors.due_date = '有効な日付を入力してください'
        } else {
          delete this.validationErrors.due_date
        }
        break
    }
    
    this.displayFieldError(fieldName)
  }

  // 日付の有効性チェック
  isValidDate(dateString) {
    if (!dateString) return true // 空は有効（オプショナル）
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) return false
    
    const date = new Date(dateString + 'T00:00:00Z')
    return date instanceof Date && !isNaN(date.getTime()) && 
           date.toISOString().startsWith(dateString)
  }

  // フォーム送信処理
  async handleFormSubmit() {
    try {
      const validation = this.validate()
      
      if (!validation.isValid) {
        this.displayValidationErrors()
        throw new Error('ValidationError: フォームの入力内容を確認してください')
      }
      
      const formData = this.getFormData()
      let savedTask
      
      if (this.mode === 'create') {
        savedTask = this.database.createTask(formData)
        this.dispatchEvent('task-created', { task: savedTask })
      } else {
        savedTask = this.database.updateTask(this.currentTask.id, formData)
        this.dispatchEvent('task-updated', { task: savedTask })
      }
      
      return savedTask
      
    } catch (error) {
      console.error('Form submission error:', error)
      throw error
    }
  }

  // 保存メソッド（公開API）
  async save() {
    return this.handleFormSubmit()
  }

  // キャンセル処理
  handleCancel() {
    this.dispatchEvent('form-cancel', {
      mode: this.mode,
      taskId: this.currentTask?.id || null
    })
  }

  // フォームリセット
  reset() {
    if (this.elements.form) {
      this.elements.form.reset()
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
    const errorElement = this.elements[`${fieldName}Error`] || 
                        this.container.querySelector(`#${fieldName.replace('_', '-')}-error`)
    
    if (errorElement) {
      const error = this.validationErrors[fieldName]
      if (error) {
        errorElement.textContent = error
        errorElement.style.display = 'block'
      } else {
        errorElement.textContent = ''
        errorElement.style.display = 'none'
      }
    }
    
    // 入力フィールドの状態更新
    const inputElement = fieldName === 'due_date' ? this.elements.dueDateInput :
                        fieldName === 'text' ? this.elements.textInput : null
    
    if (inputElement) {
      if (this.validationErrors[fieldName]) {
        inputElement.classList.add('error')
        inputElement.setAttribute('aria-invalid', 'true')
      } else {
        inputElement.classList.remove('error')
        inputElement.removeAttribute('aria-invalid')
      }
    }
  }

  // 検証エラークリア
  clearValidationErrors() {
    this.validationErrors = {}
    
    // エラー表示要素をクリア
    Object.values(this.elements).forEach(element => {
      if (element && element.className && element.className.includes('form-error')) {
        element.textContent = ''
        element.style.display = 'none'
      }
    })
    
    // 入力フィールドのエラー状態をクリア
    [this.elements.textInput, this.elements.dueDateInput, this.elements.prioritySelect]
      .forEach(element => {
        if (element) {
          element.classList.remove('error')
          element.removeAttribute('aria-invalid')
        }
      })
  }

  // フォーム状態更新
  updateFormState() {
    // 保存ボタンの状態
    if (this.elements.saveButton) {
      this.elements.saveButton.textContent = this.mode === 'create' ? '作成' : '更新'
    }
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

  // カスタムイベント発行
  dispatchEvent(eventType, detail = {}) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      cancelable: false
    })
    
    this.container.dispatchEvent(event)
  }

  // アクセシビリティの設定
  updateAriaLabels() {
    // フォームのARIAラベル
    if (this.elements.form) {
      this.elements.form.setAttribute('aria-labelledby', 'modal-title')
    }
    
    // 必須フィールドのマーク
    if (this.elements.textInput) {
      this.elements.textInput.setAttribute('aria-required', 'true')
    }
    
    // エラーとの関連付け
    if (this.elements.textInput && this.elements.textError) {
      this.elements.textInput.setAttribute('aria-describedby', this.elements.textError.id)
    }
    
    if (this.elements.dueDateInput && this.elements.dueDateError) {
      this.elements.dueDateInput.setAttribute('aria-describedby', this.elements.dueDateError.id)
    }
  }

  // フォーカス管理
  focusFirstField() {
    if (this.elements.textInput) {
      this.elements.textInput.focus()
      this.elements.textInput.select()
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
    
    if (this.container) {
      this.container.style.display = 'none'
    }
    
    this.elements = {}
    this.validationErrors = {}
    this.currentTask = null
  }

  // デバッグ用情報
  getDebugInfo() {
    return {
      mode: this.mode,
      currentTask: this.currentTask,
      validationErrors: { ...this.validationErrors },
      formData: this.getFormData(),
      isValid: this.isValid(),
      elementsFound: Object.keys(this.elements).filter(key => this.elements[key] !== null)
    }
  }
}
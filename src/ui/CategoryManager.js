import { BaseComponent } from '../utils/dom-helpers.js'
import { validateInput } from '../utils/validation.js'
import { logger } from '../utils/logger.js'

export class CategoryManager extends BaseComponent {
  constructor(database) {
    super()
    this.database = database
    this.categories = []
    this.editingCategoryId = null
    this.isVisible = false
    
    this.defaultColors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
      '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#84cc16'
    ]
  }

  render() {
    return this.createElement('div', {
      className: 'category-manager',
      id: 'category-manager',
      style: 'display: none'
    }, `
      <div class="category-manager-overlay">
        <div class="category-manager-modal">
          <div class="category-manager-header">
            <h2>カテゴリ管理</h2>
            <button type="button" class="close-button" aria-label="カテゴリ管理を閉じる">
              <span aria-hidden="true">×</span>
            </button>
          </div>
          
          <div class="category-manager-content">
            <div class="category-form-section">
              <h3>新しいカテゴリを作成</h3>
              <form class="category-form" id="category-form">
                <div class="form-group">
                  <label for="category-name">カテゴリ名</label>
                  <input 
                    type="text" 
                    id="category-name" 
                    name="name" 
                    placeholder="例: 仕事、プライベート、学習"
                    maxlength="50"
                    required
                  >
                  <div class="error-message" id="category-name-error"></div>
                </div>
                
                <div class="form-group">
                  <label>カテゴリ色</label>
                  <div class="color-picker">
                    ${this.defaultColors.map(color => `
                      <button 
                        type="button" 
                        class="color-option" 
                        data-color="${color}"
                        style="background-color: ${color}"
                        aria-label="色: ${color}"
                      ></button>
                    `).join('')}
                    <input 
                      type="color" 
                      id="category-color" 
                      name="color" 
                      value="#6366f1"
                      class="custom-color-input"
                      title="カスタム色を選択"
                    >
                  </div>
                </div>
                
                <div class="form-actions">
                  <button type="submit" class="btn btn-primary" id="save-category-btn">
                    作成
                  </button>
                  <button type="button" class="btn btn-secondary" id="cancel-category-btn">
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
            
            <div class="category-list-section">
              <h3>既存のカテゴリ</h3>
              <div class="category-list" id="category-list">
                <!-- カテゴリ一覧がここに表示される -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `)
  }

  bindEvents() {
    const modal = this.element
    const form = modal.querySelector('#category-form')
    const closeButton = modal.querySelector('.close-button')
    const overlay = modal.querySelector('.category-manager-overlay')
    const cancelButton = modal.querySelector('#cancel-category-btn')
    const colorOptions = modal.querySelectorAll('.color-option')
    const customColorInput = modal.querySelector('#category-color')
    const nameInput = modal.querySelector('#category-name')
    
    // フォーム送信
    form.addEventListener('submit', this.handleFormSubmit.bind(this))
    
    // モーダル閉じる
    closeButton.addEventListener('click', this.hide.bind(this))
    cancelButton.addEventListener('click', this.hide.bind(this))
    
    // オーバーレイクリックで閉じる
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide()
      }
    })
    
    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide()
      }
    })
    
    // 色選択
    colorOptions.forEach(button => {
      button.addEventListener('click', () => {
        this.selectColor(button.dataset.color)
      })
    })
    
    customColorInput.addEventListener('change', (e) => {
      this.selectColor(e.target.value)
    })
    
    // 入力バリデーション
    nameInput.addEventListener('input', () => {
      this.clearError('category-name-error')
    })
  }

  async handleFormSubmit(e) {
    e.preventDefault()
    
    const formData = new FormData(e.target)
    const categoryData = {
      name: formData.get('name').trim(),
      color: formData.get('color')
    }
    
    if (!this.validateForm(categoryData)) {
      return
    }
    
    try {
      const saveButton = this.element.querySelector('#save-category-btn')
      saveButton.disabled = true
      saveButton.textContent = this.editingCategoryId ? '更新中...' : '作成中...'
      
      if (this.editingCategoryId) {
        await this.updateCategory(this.editingCategoryId, categoryData)
      } else {
        await this.createCategory(categoryData)
      }
      
      this.resetForm()
      await this.loadCategories()
      this.notifyChange()
      
    } catch (error) {
      logger.error('カテゴリ保存エラー:', error)
      this.showError('category-name-error', error.message)
    } finally {
      const saveButton = this.element.querySelector('#save-category-btn')
      saveButton.disabled = false
      saveButton.textContent = this.editingCategoryId ? '更新' : '作成'
    }
  }

  validateForm(categoryData) {
    let isValid = true
    
    // 名前のバリデーション
    if (!categoryData.name) {
      this.showError('category-name-error', 'カテゴリ名を入力してください')
      isValid = false
    } else if (categoryData.name.length > 50) {
      this.showError('category-name-error', 'カテゴリ名は50文字以下で入力してください')
      isValid = false
    }
    
    return isValid
  }

  async createCategory(categoryData) {
    const category = await this.database.createCategory(categoryData)
    logger.info('カテゴリが作成されました:', category)
    return category
  }

  async updateCategory(id, categoryData) {
    const category = await this.database.updateCategory(id, categoryData)
    logger.info('カテゴリが更新されました:', category)
    return category
  }

  async deleteCategory(id) {
    if (!confirm('このカテゴリを削除しますか？\n関連するタスクのカテゴリは「未分類」になります。')) {
      return
    }
    
    try {
      await this.database.deleteCategory(id)
      await this.loadCategories()
      this.notifyChange()
      logger.info('カテゴリが削除されました:', id)
    } catch (error) {
      logger.error('カテゴリ削除エラー:', error)
      alert('カテゴリの削除に失敗しました: ' + error.message)
    }
  }

  async loadCategories() {
    try {
      this.categories = await this.database.getAllCategories()
      this.renderCategoryList()
    } catch (error) {
      logger.error('カテゴリ読み込みエラー:', error)
    }
  }

  renderCategoryList() {
    const listContainer = this.element.querySelector('#category-list')
    
    if (this.categories.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p>まだカテゴリがありません</p>
          <p>上のフォームから最初のカテゴリを作成してください</p>
        </div>
      `
      return
    }
    
    listContainer.innerHTML = this.categories.map(category => `
      <div class="category-item" data-category-id="${category.id}">
        <div class="category-info">
          <div class="category-color" style="background-color: ${category.color}"></div>
          <span class="category-name">${this.escapeHtml(category.name)}</span>
        </div>
        <div class="category-actions">
          <button 
            type="button" 
            class="btn btn-icon edit-category-btn"
            data-category-id="${category.id}"
            aria-label="カテゴリ「${category.name}」を編集"
          >
            ✏️
          </button>
          <button 
            type="button" 
            class="btn btn-icon delete-category-btn"
            data-category-id="${category.id}"
            aria-label="カテゴリ「${category.name}」を削除"
          >
            🗑️
          </button>
        </div>
      </div>
    `).join('')
    
    // イベントリスナーを追加
    listContainer.querySelectorAll('.edit-category-btn').forEach(button => {
      button.addEventListener('click', () => {
        this.editCategory(parseInt(button.dataset.categoryId))
      })
    })
    
    listContainer.querySelectorAll('.delete-category-btn').forEach(button => {
      button.addEventListener('click', () => {
        this.deleteCategory(parseInt(button.dataset.categoryId))
      })
    })
  }

  editCategory(id) {
    const category = this.categories.find(c => c.id === id)
    if (!category) return
    
    this.editingCategoryId = id
    
    const nameInput = this.element.querySelector('#category-name')
    const colorInput = this.element.querySelector('#category-color')
    const saveButton = this.element.querySelector('#save-category-btn')
    
    nameInput.value = category.name
    colorInput.value = category.color
    this.selectColor(category.color)
    
    saveButton.textContent = '更新'
    
    // フォーカスを名前入力欄に移動
    nameInput.focus()
    nameInput.select()
  }

  selectColor(color) {
    const colorInput = this.element.querySelector('#category-color')
    const colorOptions = this.element.querySelectorAll('.color-option')
    
    colorInput.value = color
    
    // 既存の選択状態をクリア
    colorOptions.forEach(option => {
      option.classList.remove('selected')
    })
    
    // 選択された色をハイライト
    const selectedOption = this.element.querySelector(`[data-color="${color}"]`)
    if (selectedOption) {
      selectedOption.classList.add('selected')
    }
  }

  resetForm() {
    const form = this.element.querySelector('#category-form')
    const saveButton = this.element.querySelector('#save-category-btn')
    
    form.reset()
    this.editingCategoryId = null
    this.selectColor('#6366f1')
    saveButton.textContent = '作成'
    this.clearAllErrors()
  }

  showError(elementId, message) {
    const errorElement = this.element.querySelector(`#${elementId}`)
    if (errorElement) {
      errorElement.textContent = message
      errorElement.style.display = 'block'
    }
  }

  clearError(elementId) {
    const errorElement = this.element.querySelector(`#${elementId}`)
    if (errorElement) {
      errorElement.textContent = ''
      errorElement.style.display = 'none'
    }
  }

  clearAllErrors() {
    const errorElements = this.element.querySelectorAll('.error-message')
    errorElements.forEach(element => {
      element.textContent = ''
      element.style.display = 'none'
    })
  }

  async show() {
    this.isVisible = true
    this.element.style.display = 'block'
    await this.loadCategories()
    
    // フォーカスを名前入力欄に移動
    const nameInput = this.element.querySelector('#category-name')
    setTimeout(() => nameInput.focus(), 100)
  }

  hide() {
    this.isVisible = false
    this.element.style.display = 'none'
    this.resetForm()
  }

  notifyChange() {
    this.element.dispatchEvent(new CustomEvent('categoriesChanged', {
      bubbles: true,
      detail: { categories: this.categories }
    }))
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
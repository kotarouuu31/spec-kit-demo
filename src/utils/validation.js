// 検証ユーティリティ - 共通のバリデーション機能
import { logger } from './logger.js'

/**
 * バリデーションエラークラス
 */
export class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }
}

/**
 * バリデーションルールクラス
 */
export class ValidationRule {
  constructor(validator, message) {
    this.validator = validator
    this.message = message
  }

  validate(value, fieldName = '') {
    const isValid = this.validator(value)
    if (!isValid) {
      throw new ValidationError(`ValidationError: ${this.message}`, fieldName, value)
    }
    return true
  }
}

/**
 * バリデーターファクトリ
 */
export class Validators {
  // 必須項目チェック
  static required(message = 'この項目は必須です') {
    return new ValidationRule(
      (value) => value != null && value !== '' && String(value).trim() !== '',
      message
    )
  }

  // 文字列長チェック
  static minLength(min, message = null) {
    return new ValidationRule(
      (value) => !value || String(value).length >= min,
      message || `${min}文字以上で入力してください`
    )
  }

  static maxLength(max, message = null) {
    return new ValidationRule(
      (value) => !value || String(value).length <= max,
      message || `${max}文字以下で入力してください`
    )
  }

  // 数値範囲チェック
  static min(minValue, message = null) {
    return new ValidationRule(
      (value) => !value || Number(value) >= minValue,
      message || `${minValue}以上の値を入力してください`
    )
  }

  static max(maxValue, message = null) {
    return new ValidationRule(
      (value) => !value || Number(value) <= maxValue,
      message || `${maxValue}以下の値を入力してください`
    )
  }

  // パターンマッチング
  static pattern(regex, message = '正しい形式で入力してください') {
    return new ValidationRule(
      (value) => !value || regex.test(String(value)),
      message
    )
  }

  // 列挙値チェック
  static oneOf(validValues, message = null) {
    return new ValidationRule(
      (value) => !value || validValues.includes(value),
      message || `有効な値: ${validValues.join(', ')}`
    )
  }

  // カスタムバリデーター
  static custom(validator, message) {
    return new ValidationRule(validator, message)
  }

  // 日付形式チェック（YYYY-MM-DD）
  static dateFormat(message = '日付はYYYY-MM-DD形式で入力してください') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    return new ValidationRule(
      (value) => {
        if (!value) return true
        
        if (!dateRegex.test(value)) return false
        
        // 実際の日付として有効かチェック
        const date = new Date(value + 'T00:00:00Z')
        return date instanceof Date && 
               !isNaN(date.getTime()) && 
               date.toISOString().startsWith(value)
      },
      message
    )
  }

  // メールアドレス形式チェック
  static email(message = '正しいメールアドレス形式で入力してください') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return new ValidationRule(
      (value) => !value || emailRegex.test(value),
      message
    )
  }

  // 数値チェック
  static numeric(message = '数値を入力してください') {
    return new ValidationRule(
      (value) => !value || !isNaN(Number(value)),
      message
    )
  }

  // 整数チェック  
  static integer(message = '整数を入力してください') {
    return new ValidationRule(
      (value) => !value || (Number.isInteger(Number(value)) && !value.toString().includes('.')),
      message
    )
  }
}

/**
 * フィールドバリデーター - 複数ルールを管理
 */
export class FieldValidator {
  constructor(fieldName, rules = []) {
    this.fieldName = fieldName
    this.rules = Array.isArray(rules) ? rules : [rules]
  }

  addRule(rule) {
    this.rules.push(rule)
    return this
  }

  validate(value) {
    const errors = []
    
    for (const rule of this.rules) {
      try {
        rule.validate(value, this.fieldName)
      } catch (error) {
        errors.push(error.message)
        break // 最初のエラーで停止
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      field: this.fieldName,
      value
    }
  }
}

/**
 * オブジェクトバリデーター - 複数フィールドを一括検証
 */
export class ObjectValidator {
  constructor() {
    this.fieldValidators = new Map()
  }

  field(fieldName, rules) {
    const validator = new FieldValidator(fieldName, rules)
    this.fieldValidators.set(fieldName, validator)
    return validator
  }

  validate(obj) {
    const results = {
      isValid: true,
      errors: {},
      validatedFields: []
    }

    // 各フィールドを検証
    for (const [fieldName, validator] of this.fieldValidators) {
      const value = obj ? obj[fieldName] : undefined
      const result = validator.validate(value)
      
      results.validatedFields.push(fieldName)
      
      if (!result.isValid) {
        results.isValid = false
        results.errors[fieldName] = result.errors
      }
    }

    return results
  }

  // 単一フィールドの検証
  validateField(obj, fieldName) {
    const validator = this.fieldValidators.get(fieldName)
    if (!validator) {
      logger.warn('バリデーターが見つかりません', { fieldName })
      return { isValid: true, errors: [] }
    }

    const value = obj ? obj[fieldName] : undefined
    return validator.validate(value)
  }
}

/**
 * タスクデータ専用のバリデーター
 */
export class TaskValidator extends ObjectValidator {
  constructor() {
    super()
    
    // タスクテキストの検証ルール
    this.field('text', [
      Validators.required('タスク内容は必須です'),
      Validators.maxLength(500, 'タスク内容は500文字以下で入力してください')
    ])

    // 優先度の検証ルール
    this.field('priority', [
      Validators.oneOf(['low', 'medium', 'high'], '優先度は low, medium, high のいずれかを選択してください')
    ])

    // 期日の検証ルール
    this.field('due_date', [
      Validators.dateFormat('期日はYYYY-MM-DD形式で入力してください')
    ])

    // 完了状態の検証ルール
    this.field('completed', [
      Validators.custom(
        (value) => value == null || value === 0 || value === 1 || value === true || value === false,
        '完了状態は 0, 1, true, false のいずれかを設定してください'
      )
    ])
  }

  /**
   * 更新用の検証（必須項目をスキップ）
   * @param {Object} updateData - 更新データ
   * @returns {Object} 検証結果
   */
  validateForUpdate(updateData) {
    const results = {
      isValid: true,
      errors: {},
      validatedFields: []
    }

    // 提供されたフィールドのみ検証
    for (const [fieldName, value] of Object.entries(updateData)) {
      const validator = this.fieldValidators.get(fieldName)
      if (validator) {
        const result = validator.validate(value)
        results.validatedFields.push(fieldName)
        
        if (!result.isValid) {
          results.isValid = false
          results.errors[fieldName] = result.errors
        }
      }
    }

    return results
  }
}

/**
 * 汎用バリデーションヘルパー関数
 */
export const ValidationHelpers = {
  /**
   * 複数の値をまとめて検証
   * @param {Object} validationMap - フィールド名: [値, バリデーションルール] のマップ
   * @returns {Object} 検証結果
   */
  validateMultiple(validationMap) {
    const results = {
      isValid: true,
      errors: {},
      validatedFields: Object.keys(validationMap)
    }

    for (const [fieldName, [value, rules]] of Object.entries(validationMap)) {
      const validator = new FieldValidator(fieldName, rules)
      const result = validator.validate(value)
      
      if (!result.isValid) {
        results.isValid = false
        results.errors[fieldName] = result.errors
      }
    }

    return results
  },

  /**
   * 条件付きバリデーション
   * @param {boolean} condition - バリデーション実行条件
   * @param {Function} validator - バリデーション関数
   * @param {*} value - 検証する値
   * @returns {Object} 検証結果
   */
  conditionalValidation(condition, validator, value) {
    if (!condition) {
      return { isValid: true, errors: [] }
    }

    try {
      validator(value)
      return { isValid: true, errors: [] }
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error.message] 
      }
    }
  },

  /**
   * 非同期バリデーション対応
   * @param {Function} asyncValidator - 非同期バリデーション関数
   * @param {*} value - 検証する値
   * @returns {Promise<Object>} 検証結果のPromise
   */
  async asyncValidation(asyncValidator, value) {
    try {
      await asyncValidator(value)
      return { isValid: true, errors: [] }
    } catch (error) {
      return { 
        isValid: false, 
        errors: [error.message] 
      }
    }
  },

  /**
   * デバッグ用検証結果出力
   * @param {Object} validationResult - 検証結果
   * @param {string} context - コンテキスト情報
   */
  logValidationResult(validationResult, context = '') {
    if (validationResult.isValid) {
      logger.debug('バリデーション成功', { context, result: validationResult })
    } else {
      logger.warn('バリデーション失敗', { context, result: validationResult })
    }
  }
}

// 共通のバリデーターインスタンス
export const taskValidator = new TaskValidator()
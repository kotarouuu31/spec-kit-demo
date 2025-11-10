// データバリデーション単体テスト
import { describe, test, expect, beforeEach } from 'vitest'
import { TaskDatabase, ValidationError } from '../../src/db/database.js'

describe('データバリデーション単体テスト', () => {
  let database

  beforeEach(() => {
    database = new TaskDatabase(':memory:')
    database.connect()
    database.initializeSchema()
  })

  describe('タスクテキストのバリデーション', () => {
    test('正常なテキストは受け入れられる', () => {
      const taskData = {
        text: 'テスト用タスク',
        priority: 'medium'
      }
      
      expect(() => database._validateTaskData(taskData)).not.toThrow()
    })

    test('空文字列のテキストはValidationErrorを投げる', () => {
      const taskData = {
        text: '',
        priority: 'medium'
      }
      
      expect(() => database._validateTaskData(taskData))
        .toThrow(ValidationError)
      expect(() => database._validateTaskData(taskData))
        .toThrow('ValidationError: Task text is required and cannot be empty')
    })

    test('空白のみのテキストはValidationErrorを投げる', () => {
      const taskData = {
        text: '   ',
        priority: 'medium'
      }
      
      expect(() => database._validateTaskData(taskData))
        .toThrow(ValidationError)
    })

    test('nullのテキストはValidationErrorを投げる', () => {
      const taskData = {
        text: null,
        priority: 'medium'
      }
      
      expect(() => database._validateTaskData(taskData))
        .toThrow(ValidationError)
    })

    test('undefinedのテキストはValidationErrorを投げる', () => {
      const taskData = {
        text: undefined,
        priority: 'medium'
      }
      
      expect(() => database._validateTaskData(taskData))
        .toThrow(ValidationError)
    })

    test('非文字列のテキストはValidationErrorを投げる', () => {
      const taskData = {
        text: 123,
        priority: 'medium'
      }
      
      expect(() => database._validateTaskData(taskData))
        .toThrow(ValidationError)
    })
  })

  describe('優先度のバリデーション', () => {
    test('有効な優先度は受け入れられる', () => {
      const priorities = ['low', 'medium', 'high']
      
      priorities.forEach(priority => {
        const taskData = {
          text: 'テスト用タスク',
          priority: priority
        }
        
        expect(() => database._validateTaskData(taskData)).not.toThrow()
      })
    })

    test('無効な優先度はValidationErrorを投げる', () => {
      const invalidPriorities = ['urgent', 'normal', 'critical', '', null, undefined, 123]
      
      invalidPriorities.forEach(priority => {
        const taskData = {
          text: 'テスト用タスク',
          priority: priority
        }
        
        expect(() => database._validateTaskData(taskData))
          .toThrow(ValidationError)
        expect(() => database._validateTaskData(taskData))
          .toThrow('ValidationError: Priority must be low, medium, or high')
      })
    })
  })

  describe('期日のバリデーション', () => {
    test('正しい日付形式は受け入れられる', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31',
        '2025-06-15'
      ]
      
      validDates.forEach(date => {
        const taskData = {
          text: 'テスト用タスク',
          priority: 'medium',
          due_date: date
        }
        
        expect(() => database._validateTaskData(taskData)).not.toThrow()
      })
    })

    test('nullの期日は受け入れられる（オプショナル）', () => {
      const taskData = {
        text: 'テスト用タスク',
        priority: 'medium',
        due_date: null
      }
      
      expect(() => database._validateTaskData(taskData)).not.toThrow()
    })

    test('無効な日付形式はValidationErrorを投げる', () => {
      const invalidDates = [
        '2024/01/01',
        '01-01-2024',
        '2024-1-1',
        '2024-13-01',
        '2024-01-32',
        'invalid-date',
        123,
        ''
      ]
      
      invalidDates.forEach(date => {
        const taskData = {
          text: 'テスト用タスク',
          priority: 'medium',
          due_date: date
        }
        
        expect(() => database._validateTaskData(taskData))
          .toThrow(ValidationError)
        expect(() => database._validateTaskData(taskData))
          .toThrow('ValidationError: Due date must be in YYYY-MM-DD format')
      })
    })
  })

  describe('完了状態のバリデーション', () => {
    test('有効な完了状態は受け入れられる', () => {
      const validCompleted = [0, 1, false, true]
      
      validCompleted.forEach(completed => {
        const taskData = {
          text: 'テスト用タスク',
          priority: 'medium',
          completed: completed
        }
        
        expect(() => database._validateTaskData(taskData)).not.toThrow()
      })
    })

    test('無効な完了状態はValidationErrorを投げる', () => {
      const invalidCompleted = [2, -1, 'true', 'false', null, undefined, {}]
      
      invalidCompleted.forEach(completed => {
        const taskData = {
          text: 'テスト用タスク',
          priority: 'medium',
          completed: completed
        }
        
        expect(() => database._validateTaskData(taskData))
          .toThrow(ValidationError)
        expect(() => database._validateTaskData(taskData))
          .toThrow('ValidationError: Completed must be 0, 1, true, or false')
      })
    })
  })

  describe('更新時のバリデーション', () => {
    test('更新時は必須フィールドの検証をスキップする', () => {
      // テキストなしの更新データ（優先度のみ更新）
      const updateData = {
        priority: 'high'
      }
      
      expect(() => database._validateTaskData(updateData, true)).not.toThrow()
    })

    test('更新時でも提供されたフィールドは検証される', () => {
      const updateData = {
        text: '', // 空文字列は無効
        priority: 'high'
      }
      
      expect(() => database._validateTaskData(updateData, true))
        .toThrow(ValidationError)
    })

    test('更新時の無効な優先度は検証される', () => {
      const updateData = {
        priority: 'invalid'
      }
      
      expect(() => database._validateTaskData(updateData, true))
        .toThrow(ValidationError)
    })
  })

  describe('複合バリデーション', () => {
    test('複数の無効なフィールドがある場合、最初のエラーを投げる', () => {
      const taskData = {
        text: '',
        priority: 'invalid',
        due_date: 'invalid-date'
      }
      
      expect(() => database._validateTaskData(taskData))
        .toThrow(ValidationError)
      // 最初にテキストの検証が実行される
      expect(() => database._validateTaskData(taskData))
        .toThrow('ValidationError: Task text is required and cannot be empty')
    })

    test('有効なデータオブジェクトは全てのバリデーションをパスする', () => {
      const taskData = {
        text: '完全に有効なタスク',
        priority: 'high',
        due_date: '2024-12-31',
        completed: 1
      }
      
      expect(() => database._validateTaskData(taskData)).not.toThrow()
    })
  })

  describe('エッジケース', () => {
    test('タスクデータがnullの場合はValidationErrorを投げる', () => {
      expect(() => database._validateTaskData(null))
        .toThrow(ValidationError)
      expect(() => database._validateTaskData(null))
        .toThrow('Task data must be an object')
    })

    test('タスクデータがundefinedの場合はValidationErrorを投げる', () => {
      expect(() => database._validateTaskData(undefined))
        .toThrow(ValidationError)
    })

    test('タスクデータがオブジェクトでない場合はValidationErrorを投げる', () => {
      const invalidData = ['string', 123, true, []]
      
      invalidData.forEach(data => {
        expect(() => database._validateTaskData(data))
          .toThrow(ValidationError)
        expect(() => database._validateTaskData(data))
          .toThrow('Task data must be an object')
      })
    })

    test('長いテキストも受け入れられる', () => {
      const longText = 'あ'.repeat(1000) // 1000文字の日本語テキスト
      const taskData = {
        text: longText,
        priority: 'medium'
      }
      
      expect(() => database._validateTaskData(taskData)).not.toThrow()
    })

    test('境界値の日付は正しく処理される', () => {
      const boundaryDates = [
        '1900-01-01',
        '2099-12-31',
        '2000-02-29' // うるう年
      ]
      
      boundaryDates.forEach(date => {
        const taskData = {
          text: 'テスト用タスク',
          priority: 'medium',
          due_date: date
        }
        
        expect(() => database._validateTaskData(taskData)).not.toThrow()
      })
    })
  })

  describe('_isValidDateメソッドの単体テスト', () => {
    test('有効な日付文字列を正しく識別する', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31',
        '2000-02-29',
        '1900-01-01',
        '2099-12-31'
      ]
      
      validDates.forEach(date => {
        expect(database._isValidDate(date)).toBe(true)
      })
    })

    test('無効な日付文字列を正しく識別する', () => {
      const invalidDates = [
        '2024/01/01',
        '01-01-2024',
        '2024-1-1',
        '2024-13-01',
        '2024-01-32',
        '2024-02-30',
        'not-a-date',
        '2024-01-01T12:00:00',
        ''
      ]
      
      invalidDates.forEach(date => {
        expect(database._isValidDate(date)).toBe(false)
      })
    })

    test('null値は有効として扱われる（オプショナル）', () => {
      expect(database._isValidDate(null)).toBe(true)
    })

    test('undefined値は有効として扱われる（オプショナル）', () => {
      expect(database._isValidDate(undefined)).toBe(true)
    })

    test('空文字列は有効として扱われる（オプショナル）', () => {
      expect(database._isValidDate('')).toBe(true)
    })
  })
})
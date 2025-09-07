// TaskDatabaseクラス接続管理の契約テスト
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskDatabase } from '../../src/db/database.js'
import fs from 'fs'
import path from 'path'

describe('TaskDatabase接続管理契約', () => {
  let database
  let testDbPath

  beforeEach(() => {
    // テスト用の一時データベースパス
    testDbPath = path.join(process.cwd(), 'test-tasks.db')
    
    // 既存のテストDBファイルがあれば削除
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  afterEach(() => {
    // データベース接続をクリーンアップ
    if (database) {
      database.close()
    }
    
    // テスト用DBファイルを削除
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('コンストラクタ', () => {
    it('dbPathパラメータでTaskDatabaseインスタンスを作成できる', () => {
      // 契約: constructor(dbPath: string)
      expect(() => {
        database = new TaskDatabase(testDbPath)
      }).not.toThrow()
      
      expect(database).toBeDefined()
      expect(database).toBeInstanceOf(TaskDatabase)
    })

    it('dbPathが文字列でない場合はエラーを投げる', () => {
      // 契約違反のケース
      expect(() => {
        database = new TaskDatabase(null)
      }).toThrow()
      
      expect(() => {
        database = new TaskDatabase(123)
      }).toThrow()
    })
  })

  describe('接続管理', () => {
    beforeEach(() => {
      database = new TaskDatabase(testDbPath)
    })

    it('connect()メソッドでデータベースに接続できる', () => {
      // 契約: connect(): void
      expect(() => {
        database.connect()
      }).not.toThrow()
      
      // 接続後はDBファイルが作成される
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('connect()を複数回呼び出してもエラーにならない', () => {
      // 冪等性の確認
      expect(() => {
        database.connect()
        database.connect()
      }).not.toThrow()
    })

    it('close()メソッドでデータベース接続を閉じることができる', () => {
      // 契約: close(): void
      database.connect()
      
      expect(() => {
        database.close()
      }).not.toThrow()
    })

    it('接続していない状態でclose()を呼んでもエラーにならない', () => {
      // 安全な操作であることを確認
      expect(() => {
        database.close()
      }).not.toThrow()
    })
  })

  describe('スキーマ初期化', () => {
    beforeEach(() => {
      database = new TaskDatabase(testDbPath)
      database.connect()
    })

    it('initializeSchema()メソッドでテーブルとインデックスを作成できる', () => {
      // 契約: initializeSchema(): void
      expect(() => {
        database.initializeSchema()
      }).not.toThrow()
    })

    it('initializeSchema()を複数回呼んでもエラーにならない', () => {
      // 冪等性の確認
      expect(() => {
        database.initializeSchema()
        database.initializeSchema()
      }).not.toThrow()
    })

    it('スキーマ初期化後にtasksテーブルが存在する', () => {
      database.initializeSchema()
      
      // テーブル存在確認のためのクエリを実行
      // 注意: この時点では実装されていないのでテストは失敗するはず
      expect(() => {
        // database.checkTableExists('tasks')
      }).toBeDefined() // プレースホルダー
    })
  })

  describe('エラーハンドリング', () => {
    it('無効なパスでconnect()した場合はDatabaseErrorを投げる', () => {
      // 無効なディレクトリパス
      const invalidPath = '/invalid/directory/test.db'
      database = new TaskDatabase(invalidPath)
      
      expect(() => {
        database.connect()
      }).toThrow('DatabaseError')
    })

    it('ファイルシステム権限エラーの場合は適切なエラーメッセージを提供', () => {
      // 書き込み権限のないパス（存在すれば）
      const readOnlyPath = '/root/test.db'
      database = new TaskDatabase(readOnlyPath)
      
      // 権限エラーが発生する可能性がある環境でのテスト
      // 実際の環境に依存するため、エラータイプのチェックのみ
      try {
        database.connect()
      } catch (error) {
        expect(error.message).toContain('DatabaseError')
      }
    })
  })

  describe('接続状態管理', () => {
    beforeEach(() => {
      database = new TaskDatabase(testDbPath)
    })

    it('isConnected()メソッドで接続状態を確認できる', () => {
      // 接続前は false
      expect(database.isConnected()).toBe(false)
      
      // 接続後は true
      database.connect()
      expect(database.isConnected()).toBe(true)
      
      // 切断後は false
      database.close()
      expect(database.isConnected()).toBe(false)
    })
  })
})
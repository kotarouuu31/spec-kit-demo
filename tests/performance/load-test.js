// パフォーマンステスト - 負荷テストとレスポンス時間測定
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { TaskDatabase } from '../../src/db/database.js'

describe('パフォーマンステスト', () => {
  let database

  beforeEach(() => {
    database = new TaskDatabase(':memory:')
    database.connect()
    database.initializeSchema()
  })

  afterEach(() => {
    database?.close()
  })

  describe('データベース操作のパフォーマンス', () => {
    test('大量タスク作成のパフォーマンス（1000件）', () => {
      const startTime = performance.now()
      const taskCount = 1000
      const createdTasks = []

      // 1000個のタスクを作成
      for (let i = 0; i < taskCount; i++) {
        const taskData = {
          text: `パフォーマンステスト用タスク ${i + 1}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          due_date: i % 10 === 0 ? '2024-12-31' : null
        }
        
        const task = database.createTask(taskData)
        createdTasks.push(task)
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(createdTasks.length).toBe(taskCount)
      expect(executionTime).toBeLessThan(5000) // 5秒以内
      
      console.log(`1000件のタスク作成: ${executionTime.toFixed(2)}ms`)
    })

    test('大量タスク検索のパフォーマンス', () => {
      // 事前に1000個のタスクを作成
      const taskCount = 1000
      for (let i = 0; i < taskCount; i++) {
        database.createTask({
          text: `検索テスト用タスク ${i + 1}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          completed: i % 4 === 0 ? 1 : 0,
          due_date: i % 10 === 0 ? '2024-12-31' : null
        })
      }

      // 全件検索のパフォーマンス
      const startTime = performance.now()
      const allTasks = database.getAllTasks()
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(allTasks.length).toBe(taskCount)
      expect(executionTime).toBeLessThan(100) // 100ms以内
      
      console.log(`1000件のタスク検索: ${executionTime.toFixed(2)}ms`)
    })

    test('統計情報取得のパフォーマンス', () => {
      // 事前に大量のタスクを作成
      const taskCount = 5000
      for (let i = 0; i < taskCount; i++) {
        database.createTask({
          text: `統計テスト用タスク ${i + 1}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          completed: i % 3 === 0 ? 1 : 0,
          due_date: i % 20 === 0 ? '2024-01-01' : null // 一部期限切れ
        })
      }

      // 統計取得のパフォーマンス測定
      const measurements = []
      const iterations = 10

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        const stats = database.getTaskStats()
        const endTime = performance.now()
        
        measurements.push(endTime - startTime)
        
        // 統計結果の妥当性確認
        expect(stats.total).toBe(taskCount)
        expect(stats.active).toBeGreaterThan(0)
        expect(stats.completed).toBeGreaterThan(0)
        expect(stats.overdue).toBeGreaterThan(0)
      }

      const avgTime = measurements.reduce((sum, time) => sum + time, 0) / iterations
      const maxTime = Math.max(...measurements)

      expect(avgTime).toBeLessThan(50) // 平均50ms以内
      expect(maxTime).toBeLessThan(100) // 最大100ms以内
      
      console.log(`統計情報取得 - 平均: ${avgTime.toFixed(2)}ms, 最大: ${maxTime.toFixed(2)}ms`)
    })

    test('複数の同時操作のパフォーマンス', async () => {
      const concurrentOperations = 100
      const promises = []

      const startTime = performance.now()

      // 同時に複数のタスク作成を実行
      for (let i = 0; i < concurrentOperations; i++) {
        const promise = Promise.resolve().then(() => {
          return database.createTask({
            text: `同時作成タスク ${i + 1}`,
            priority: 'medium'
          })
        })
        promises.push(promise)
      }

      const results = await Promise.all(promises)
      const endTime = performance.now()

      const executionTime = endTime - startTime

      expect(results.length).toBe(concurrentOperations)
      expect(executionTime).toBeLessThan(1000) // 1秒以内
      
      console.log(`${concurrentOperations}件の同時作成: ${executionTime.toFixed(2)}ms`)
    })

    test('大量データでの更新操作のパフォーマンス', () => {
      // 事前に1000個のタスクを作成
      const taskCount = 1000
      const taskIds = []
      
      for (let i = 0; i < taskCount; i++) {
        const task = database.createTask({
          text: `更新テスト用タスク ${i + 1}`,
          priority: 'low'
        })
        taskIds.push(task.id)
      }

      // すべてのタスクの優先度を更新
      const startTime = performance.now()
      
      taskIds.forEach(id => {
        database.updateTask(id, { priority: 'high' })
      })

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(executionTime).toBeLessThan(2000) // 2秒以内
      
      console.log(`1000件のタスク更新: ${executionTime.toFixed(2)}ms`)
    })

    test('大量データでの削除操作のパフォーマンス', () => {
      // 事前に1000個のタスクを作成
      const taskCount = 1000
      const taskIds = []
      
      for (let i = 0; i < taskCount; i++) {
        const task = database.createTask({
          text: `削除テスト用タスク ${i + 1}`,
          priority: 'low'
        })
        taskIds.push(task.id)
      }

      // すべてのタスクを削除
      const startTime = performance.now()
      
      taskIds.forEach(id => {
        database.deleteTask(id)
      })

      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(executionTime).toBeLessThan(1500) // 1.5秒以内
      
      // 削除確認
      const remainingTasks = database.getAllTasks()
      expect(remainingTasks.length).toBe(0)
      
      console.log(`1000件のタスク削除: ${executionTime.toFixed(2)}ms`)
    })
  })

  describe('メモリ使用量テスト', () => {
    test('大量データ作成時のメモリリーク確認', () => {
      // 初期メモリ使用量
      const initialMemory = process.memoryUsage()
      
      // 大量のタスクを作成・削除を繰り返す
      for (let cycle = 0; cycle < 10; cycle++) {
        const taskIds = []
        
        // 1000個作成
        for (let i = 0; i < 1000; i++) {
          const task = database.createTask({
            text: `メモリテスト用タスク ${cycle}-${i}`,
            priority: 'medium'
          })
          taskIds.push(task.id)
        }
        
        // すべて削除
        taskIds.forEach(id => {
          database.deleteTask(id)
        })
        
        // ガベージコレクション（可能であれば）
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // メモリ増加が10MB未満であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      
      console.log(`メモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('インデックスの効果測定', () => {
    test('優先度フィルタリングのパフォーマンス', () => {
      // 事前に大量のタスクを作成（各優先度均等に）
      const taskCount = 3000
      for (let i = 0; i < taskCount; i++) {
        database.createTask({
          text: `フィルターテスト用タスク ${i + 1}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          completed: i % 4 === 0 ? 1 : 0
        })
      }

      // 優先度別フィルタリングのパフォーマンス
      const priorities = ['high', 'medium', 'low']
      
      priorities.forEach(priority => {
        const startTime = performance.now()
        
        // カスタムSQLでフィルタリング
        const stmt = database.db.prepare(
          'SELECT * FROM tasks WHERE priority = ? ORDER BY created_at DESC'
        )
        const filteredTasks = stmt.all(priority)
        
        const endTime = performance.now()
        const executionTime = endTime - startTime

        expect(filteredTasks.length).toBeGreaterThan(0)
        expect(executionTime).toBeLessThan(20) // 20ms以内（インデックス効果）
        
        console.log(`優先度(${priority})フィルタリング: ${executionTime.toFixed(2)}ms, ${filteredTasks.length}件`)
      })
    })

    test('完了状態フィルタリングのパフォーマンス', () => {
      // 事前に大量のタスクを作成
      const taskCount = 2000
      for (let i = 0; i < taskCount; i++) {
        database.createTask({
          text: `完了状態テスト用タスク ${i + 1}`,
          priority: 'medium',
          completed: i % 2 === 0 ? 1 : 0
        })
      }

      // 完了・未完了フィルタリングのパフォーマンス
      const completedStates = [0, 1]
      
      completedStates.forEach(completed => {
        const startTime = performance.now()
        
        const stmt = database.db.prepare(
          'SELECT * FROM tasks WHERE completed = ? ORDER BY created_at DESC'
        )
        const filteredTasks = stmt.all(completed)
        
        const endTime = performance.now()
        const executionTime = endTime - startTime

        expect(filteredTasks.length).toBeGreaterThan(0)
        expect(executionTime).toBeLessThan(15) // 15ms以内
        
        const stateText = completed === 1 ? '完了' : '未完了'
        console.log(`${stateText}フィルタリング: ${executionTime.toFixed(2)}ms, ${filteredTasks.length}件`)
      })
    })

    test('複合条件検索のパフォーマンス', () => {
      // 事前に大量のタスクを作成
      const taskCount = 5000
      for (let i = 0; i < taskCount; i++) {
        database.createTask({
          text: `複合検索テスト用タスク ${i + 1}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          completed: i % 3 === 0 ? 1 : 0,
          due_date: i % 20 === 0 ? '2024-12-31' : null
        })
      }

      // 複合条件での検索
      const startTime = performance.now()
      
      const stmt = database.db.prepare(`
        SELECT * FROM tasks 
        WHERE completed = ? AND priority = ? AND due_date IS NOT NULL
        ORDER BY due_date ASC
      `)
      const results = stmt.all(0, 'high') // 未完了 + 高優先度 + 期日あり
      
      const endTime = performance.now()
      const executionTime = endTime - startTime

      expect(results.length).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(30) // 30ms以内（複合インデックス効果）
      
      console.log(`複合条件検索: ${executionTime.toFixed(2)}ms, ${results.length}件`)
    })
  })

  describe('ストレステスト', () => {
    test('極端に大量のタスクでの動作確認', () => {
      const startTime = performance.now()
      
      // 10,000個のタスクを作成（実用的な上限テスト）
      const taskCount = 10000
      for (let i = 0; i < taskCount; i++) {
        database.createTask({
          text: `ストレステスト用タスク ${i + 1}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          completed: i % 5 === 0 ? 1 : 0
        })
        
        // 進捗表示（1000件ごと）
        if ((i + 1) % 1000 === 0) {
          const currentTime = performance.now()
          console.log(`${i + 1}件作成完了 (${(currentTime - startTime).toFixed(0)}ms)`)
        }
      }
      
      const creationEndTime = performance.now()
      
      // 全件取得テスト
      const getAllStartTime = performance.now()
      const allTasks = database.getAllTasks()
      const getAllEndTime = performance.now()
      
      // 統計取得テスト
      const statsStartTime = performance.now()
      const stats = database.getTaskStats()
      const statsEndTime = performance.now()

      expect(allTasks.length).toBe(taskCount)
      expect(stats.total).toBe(taskCount)
      
      const creationTime = creationEndTime - startTime
      const getAllTime = getAllEndTime - getAllStartTime
      const statsTime = statsEndTime - statsStartTime
      
      // パフォーマンス要件
      expect(creationTime).toBeLessThan(30000) // 30秒以内
      expect(getAllTime).toBeLessThan(500) // 500ms以内
      expect(statsTime).toBeLessThan(100) // 100ms以内
      
      console.log(`ストレステスト結果:`)
      console.log(`- 10,000件作成: ${creationTime.toFixed(2)}ms`)
      console.log(`- 全件取得: ${getAllTime.toFixed(2)}ms`)
      console.log(`- 統計取得: ${statsTime.toFixed(2)}ms`)
    }, 60000) // 60秒のタイムアウト
  })

  describe('パフォーマンスベンチマーク', () => {
    test('基本操作のベンチマーク', () => {
      const iterations = 1000
      const benchmarks = {
        create: [],
        read: [],
        update: [],
        delete: []
      }

      // CREATE ベンチマーク
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        const task = database.createTask({
          text: `ベンチマーク用タスク ${i + 1}`,
          priority: 'medium'
        })
        const end = performance.now()
        benchmarks.create.push(end - start)
      }

      // READ ベンチマーク
      const allTasks = database.getAllTasks()
      for (let i = 0; i < Math.min(iterations, allTasks.length); i++) {
        const start = performance.now()
        database.getTaskById(allTasks[i].id)
        const end = performance.now()
        benchmarks.read.push(end - start)
      }

      // UPDATE ベンチマーク
      for (let i = 0; i < Math.min(iterations, allTasks.length); i++) {
        const start = performance.now()
        database.updateTask(allTasks[i].id, { priority: 'high' })
        const end = performance.now()
        benchmarks.update.push(end - start)
      }

      // DELETE ベンチマーク
      for (let i = 0; i < Math.min(iterations, allTasks.length); i++) {
        const start = performance.now()
        database.deleteTask(allTasks[i].id)
        const end = performance.now()
        benchmarks.delete.push(end - start)
      }

      // 統計計算
      const getStats = (times) => {
        const sorted = times.sort((a, b) => a - b)
        return {
          min: Math.min(...times),
          max: Math.max(...times),
          avg: times.reduce((sum, t) => sum + t, 0) / times.length,
          median: sorted[Math.floor(sorted.length / 2)],
          p95: sorted[Math.floor(sorted.length * 0.95)]
        }
      }

      const createStats = getStats(benchmarks.create)
      const readStats = getStats(benchmarks.read)
      const updateStats = getStats(benchmarks.update)
      const deleteStats = getStats(benchmarks.delete)

      // パフォーマンス要件の検証
      expect(createStats.avg).toBeLessThan(5) // 平均5ms以内
      expect(readStats.avg).toBeLessThan(1) // 平均1ms以内
      expect(updateStats.avg).toBeLessThan(5) // 平均5ms以内
      expect(deleteStats.avg).toBeLessThan(5) // 平均5ms以内

      console.log('CRUD操作ベンチマーク:')
      console.log(`CREATE - 平均: ${createStats.avg.toFixed(2)}ms, P95: ${createStats.p95.toFixed(2)}ms`)
      console.log(`READ   - 平均: ${readStats.avg.toFixed(2)}ms, P95: ${readStats.p95.toFixed(2)}ms`)
      console.log(`UPDATE - 平均: ${updateStats.avg.toFixed(2)}ms, P95: ${updateStats.p95.toFixed(2)}ms`)
      console.log(`DELETE - 平均: ${deleteStats.avg.toFixed(2)}ms, P95: ${deleteStats.p95.toFixed(2)}ms`)
    })
  })
})
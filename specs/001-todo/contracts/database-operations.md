# データベース操作契約

**機能**: 001-todo | **日付**: 2025-09-07

## TaskDatabase インターフェース

この契約はタスク管理のためのすべてのデータベース操作を定義します。

### 接続管理

```javascript
class TaskDatabase {
    constructor(dbPath: string)
    connect(): void
    close(): void
    initializeSchema(): void
}
```

### タスク CRUD 操作

#### タスク作成
```javascript
createTask(taskData: CreateTaskInput): Task
```

**入力契約**:
```typescript
interface CreateTaskInput {
    text: string;           // 必須、トリム後1-500文字
    priority?: 'high' | 'medium' | 'low';  // 任意、デフォルト'medium' 
    due_date?: string;      // 任意、ISO日付形式（YYYY-MM-DD）
}
```

**出力契約**:
```typescript
interface Task {
    id: number;
    text: string;
    priority: 'high' | 'medium' | 'low';
    due_date: string | null;
    completed: 0 | 1;
    created_at: string;     // ISO日時
    updated_at: string;     // ISO日時
}
```

**エラーケース**:
- `ValidationError`: textが空、長すぎる、または無効な形式
- `ValidationError`: priorityが有効な列挙値でない
- `ValidationError`: due_dateが有効なISO形式でない
- `DatabaseError`: SQLite操作が失敗

#### タスク読み込み
```javascript
getAllTasks(): Task[]
getActiveTasks(): Task[]  
getCompletedTasks(): Task[]
getTaskById(id: number): Task | null
getTasksByPriority(priority: 'high' | 'medium' | 'low'): Task[]
getOverdueTasks(): Task[]
getTasksDueToday(): Task[]
```

**出力契約**: `Task`オブジェクトの配列または単一の`Task`/`null`

**エラーケース**:
- `DatabaseError`: SQLiteクエリが失敗
- `ValidationError`: 無効なpriorityパラメータ

#### タスク更新
```javascript
updateTask(id: number, updates: UpdateTaskInput): Task
toggleTaskCompletion(id: number): Task
```

**入力契約**:
```typescript
interface UpdateTaskInput {
    text?: string;          // 任意、トリム後1-500文字
    priority?: 'high' | 'medium' | 'low';
    due_date?: string | null;  // ISO日付またはnullで削除
}
```

**出力契約**: 更新された`Task`オブジェクト

**エラーケース**:
- `NotFoundError`: 指定されたIDのタスクが存在しない
- `ValidationError`: 無効なフィールド値
- `DatabaseError`: SQLite更新が失敗

#### タスク削除
```javascript
deleteTask(id: number): boolean
```

**出力契約**: 削除された場合は`true`、見つからない場合は`false`

**エラーケース**:
- `DatabaseError`: SQLite削除が失敗

### クエリヘルパー

```javascript
searchTasks(query: string): Task[]
getTaskStats(): TaskStats
```

**TaskStats契約**:
```typescript
interface TaskStats {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
}
```

### エラーハンドリング

**エラータイプ**:
```typescript
class ValidationError extends Error {
    field: string;
    value: any;
    constraint: string;
}

class NotFoundError extends Error {
    resource: string;
    id: number;
}

class DatabaseError extends Error {
    operation: string;
    sqliteError: Error;
}
```

### データベース制約の強制

1. **テキストバリデーション**:
   - トリム後に空でないこと
   - 最大500文字
   - 文字列型である必要

2. **優先度バリデーション**:
   - 'high', 'medium', 'low'のいずれかである必要
   - 提供されない場合は'medium'をデフォルト

3. **期限バリデーション**:
   - 有効なISO日付形式（YYYY-MM-DD）である必要
   - null/undefinedも可
   - 過去日付のバリデーションはデータベースレベルでなく、UIで処理

4. **完了状況**:
   - 0または1である必要
   - 新規タスクはデフォルトで0

5. **タイムスタンプ**:
   - created_atは作成時に一度設定
   - updated_atは変更毎に更新
   - 両方とも有効なISO日時文字列である必要

### トランザクション処理

単一操作には明示的なトランザクション不要。一括操作用:

```javascript
bulkUpdateTasks(operations: BulkOperation[]): Task[]
```

**BulkOperation契約**:
```typescript
interface BulkOperation {
    type: 'create' | 'update' | 'delete';
    id?: number;  // update/deleteに必要
    data?: CreateTaskInput | UpdateTaskInput;
}
```

この契約により、すべてのデータベース操作における型安全性、データバリデーション、一貫したエラーハンドリングが保証されます。
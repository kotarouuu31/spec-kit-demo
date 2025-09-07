# データモデル: 個人用タスク管理ToDoアプリ

**機能**: 001-todo | **日付**: 2025-09-07

## エンティティ: Task（タスク）

**目的**: タスク管理に必要な全ての属性を持つ単一のTodoアイテムを表現

### フィールド

| フィールド | 型 | 制約 | 説明 |
|-----------|-----|-----|-----|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 一意識別子 |
| text | TEXT | NOT NULL, LENGTH > 0 | タスクの説明文 |
| priority | TEXT | NOT NULL, CHECK IN ('high', 'medium', 'low') | 優先度レベル |
| due_date | TEXT | NULL, ISO日付形式 | 任意の期限 |
| completed | INTEGER | NOT NULL, DEFAULT 0, CHECK IN (0,1) | 完了状況（真偽値） |
| created_at | TEXT | NOT NULL, ISO日時形式 | 作成タイムスタンプ |
| updated_at | TEXT | NOT NULL, ISO日時形式 | 最終更新タイムスタンプ |

### バリデーションルール

1. **テキストバリデーション**:
   - 必須フィールド、空または空白のみは不可
   - 最大長: 500文字
   - 最小長: 1文字（トリム後）

2. **優先度バリデーション**:
   - 'high', 'medium', 'low'のいずれかでなければならない
   - 指定されない場合は'medium'がデフォルト

3. **期限バリデーション**:
   - 任意フィールド（NULLも可）
   - 提供される場合は有効なISO日付文字列（YYYY-MM-DD）
   - 過去の日付は不可（アプリケーションレベルでのバリデーション）

4. **完了状況**:
   - 0 = 未完了（デフォルト）
   - 1 = 完了
   - 変更時にupdated_atタイムスタンプも自動更新

5. **タイムスタンプ**:
   - created_at: タスク作成時に一度設定（ISO日時）
   - updated_at: フィールド変更時に更新（ISO日時）

### 状態遷移

```
[作成済み] → [アクティブ] → [完了]
    ↑           ↓           ↓
    └── [アクティブ] ←──── [未完了に戻す]
```

**有効な遷移**:
- 作成済み → アクティブ: completed = 0でタスクが作成される
- アクティブ → 完了: ユーザーがタスクを完了としてマーク（completed = 0 → 1）
- 完了 → アクティブ: ユーザーが完了タスクのチェックを外す（completed = 1 → 0）
- アクティブ → アクティブ: ユーザーがtext、priority、due_dateを変更

### データベーススキーマ（SQLite）

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL CHECK(LENGTH(TRIM(text)) > 0),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
```

### データ操作

**タスク作成**:
```javascript
// アプリケーションレベルでの入力バリデーション
const task = {
    text: sanitizedText,
    priority: validatedPriority, 
    due_date: validatedDate || null,
    completed: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};
```

**タスク更新**:
```javascript
// 変更時は必ずタイムスタンプを更新
const updates = {
    ...modifiedFields,
    updated_at: new Date().toISOString()
};
```

**クエリパターン**:
- 全アクティブタスク: `WHERE completed = 0 ORDER BY priority DESC, created_at ASC`
- 完了タスク: `WHERE completed = 1 ORDER BY updated_at DESC`
- 優先度別タスク: `WHERE priority = ? AND completed = 0`
- 期限超過タスク: `WHERE due_date < DATE('now') AND completed = 0`
- 今日期限のタスク: `WHERE due_date = DATE('now') AND completed = 0`

### ビジネスルール

1. **優先度ソート**:
   - 高優先度タスクが最初に表示
   - 同じ優先度内では作成日順（古い順）
   - 完了タスクは完了日順（新しい順）

2. **期限処理**:
   - 期限のないタスクは期限ありタスクの後に表示
   - 期限超過タスクは赤でハイライト
   - 今日期限のタスクは橙でハイライト
   - 将来期限のタスクは通常スタイル

3. **完了動作**:
   - 完了タスクは達成感のため表示を維持
   - 完了タスクはチェックを外してアクティブ状態に戻せる
   - 完了タスクはアクティブタスクとは別にソート

4. **データ整合性**:
   - タスクの削除は不可（完了マークのみ）
   - due_date以外の全フィールドが必須
   - priorityは常に有効な列挙値でなければならない
   - タイムスタンプは有効なISO形式でなければならない

このデータモデルは、シンプルさとデータ整合性を保ちつつ、仕様書の全機能要件をサポートします。
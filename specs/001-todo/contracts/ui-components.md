# UIコンポーネント契約

**機能**: 001-todo | **日付**: 2025-09-07

## コンポーネントインターフェース仕様

### TaskList コンポーネント

```javascript
class TaskList {
    constructor(container: HTMLElement, database: TaskDatabase)
    render(tasks: Task[], options?: RenderOptions): void
    refresh(): void
    attachEventListeners(): void
}
```

**RenderOptions契約**:
```typescript
interface RenderOptions {
    showCompleted?: boolean;    // デフォルト: false
    sortBy?: 'priority' | 'date' | 'alphabetical';  // デフォルト: 'priority'
    filterBy?: {
        priority?: 'high' | 'medium' | 'low';
        dueDateFilter?: 'overdue' | 'today' | 'upcoming';
    };
}
```

**必要なUI要素**:
- チェックボックス、テキスト、優先度インディケーター、期限を持つタスク項目
- 完了タスクの視覚的区別（取り消し線、薄い表示）
- 優先度カラーコーディング（赤=高、黄=中、緑=低）
- 期限ハイライト（赤=期限切れ、橙=今日）
- タスクがない時の空状態メッセージ
- データベース操作中のローディング状態

**発行されるイベント**:
- `task-toggle`: チェックボックスクリック時 - `{ taskId: number, completed: boolean }`
- `task-edit`: タスクテキストクリック時 - `{ taskId: number }`
- `task-delete`: 削除ボタンクリック時 - `{ taskId: number }`

### TaskForm コンポーネント

```javascript
class TaskForm {
    constructor(container: HTMLElement, database: TaskDatabase)
    show(taskId?: number): void  // 新規タスクまたは既存タスクの編集用に表示
    hide(): void
    validate(): ValidationResult
    submit(): Promise<Task>
    reset(): void
}
```

**ValidationResult契約**:
```typescript
interface ValidationResult {
    isValid: boolean;
    errors: {
        text?: string;
        priority?: string;
        due_date?: string;
    };
}
```

**フォームフィールド**:
- テキスト入力: 必須、1-500文字
- 優先度選択: high/medium/low、デフォルトはmedium  
- 期限入力: 任意、日付ピッカー、過去の日付不可
- 送信ボタン: バリデーション失敗時は無効
- キャンセルボタン: フォームリセットして非表示

**バリデーションルール**:
- テキスト: 必須、トリム後非空、最大500文字
- 優先度: 有効な列挙値である必要
- 期限: 提供される場合は今日以降の日付
- エラーメッセージ付きのリアルタイムバリデーションフィードバック

**発行されるイベント**:
- `task-created`: 新規タスク送信時 - `{ task: Task }`
- `task-updated`: 既存タスク更新時 - `{ task: Task }`
- `form-cancelled`: キャンセルボタンクリックまたはESC押下時

### FilterControls コンポーネント

```javascript
class FilterControls {
    constructor(container: HTMLElement)
    render(): void
    getActiveFilters(): FilterState
    resetFilters(): void
}
```

**FilterState契約**:
```typescript
interface FilterState {
    showCompleted: boolean;
    priorityFilter: 'all' | 'high' | 'medium' | 'low';
    dueDateFilter: 'all' | 'overdue' | 'today' | 'upcoming' | 'no-date';
    sortBy: 'priority' | 'date' | 'alphabetical';
}
```

**UI要素**:
- 完了タスクの表示/非表示トグル
- 優先度フィルタードロップダウン
- 期限フィルターボタン/ドロップダウン
- ソート順セレクター
- 全フィルタークリアボタン

**発行されるイベント**:
- `filters-changed`: フィルター変更時 - `{ filters: FilterState }`

### AppHeader コンポーネント

```javascript
class AppHeader {
    constructor(container: HTMLElement)
    render(stats: TaskStats): void
    updateStats(stats: TaskStats): void
}
```

**UI要素**:
- アプリタイトル/ロゴ
- タスク統計（アクティブ総数、今日完了、期限切れ）
- 新規タスク追加ボタン
- 設定/メニューボタン（将来の拡張用）

**発行されるイベント**:
- `add-task-clicked`: 追加ボタンクリック時
- `settings-clicked`: 設定ボタンクリック時

### NotificationManager

```javascript
class NotificationManager {
    constructor(container: HTMLElement)
    showSuccess(message: string): void
    showError(message: string): void
    showInfo(message: string): void
    hideAll(): void
}
```

**通知タイプ**:
- 成功: タスク作成/更新/完了
- エラー: データベースエラー、バリデーション失敗
- 情報: 一般的なアプリ情報

**UI動作**:
- 3秒後に自動消去
- クリックで即座に消去  
- 複数通知のスタック
- タイプ別の異なる色

### コンポーネント通信契約

**イベントシステム**:
全コンポーネントは共有EventTargetでカスタムイベント経由で通信:

```javascript
class AppEventBus extends EventTarget {
    // 標準DOMイベントメソッド: addEventListener, removeEventListener, dispatchEvent
}
```

**グローバルイベント**:
- `task-created`: 新規タスクがデータベースに追加
- `task-updated`: タスクがデータベースで変更
- `task-deleted`: タスクがデータベースから削除
- `tasks-reloaded`: タスクリストがデータベースから再読込
- `filter-applied`: フィルター変更、再描画が必要
- `database-error`: データベース操作が失敗
- `validation-error`: フォームバリデーションが失敗

**コンポーネントライフサイクル**:

1. **初期化**:
   - コンストラクターがコンテナ要素と依存関係を受け取る
   - 共有イベントバスにアタッチ
   - 内部イベントリスナーをセットアップ

2. **描画**:
   - `render()`メソッドがDOMを更新
   - 可能な限り既存のイベントリスナーを保持
   - パフォーマンスのため変更された要素のみ更新

3. **イベント処理**:
   - コンポーネントは関連するイベントをリスン
   - 状態を更新し必要に応じて再描画
   - 他のコンポーネント向けにイベントを発行

4. **クリーンアップ**:
   - `destroy()`メソッドでイベントリスナーを削除
   - DOMコンテンツをクリア
   - 参照を解放

### レスポンシブデザイン契約

**ブレイクポイント**:
- モバイル: < 768px（単一カラム、タッチ最適化）
- タブレット: 768px - 1024px（間隔調整）
- デスクトップ: > 1024px（全機能セット）

**モバイル適応**:
- より大きなタッチターゲット（最小44px）
- 簡素化されたナビゲーション
- 全幅フォーム要素
- タスクアクション用スワイプジェスチャー

**アクセシビリティ契約**:
- 全インタラクティブ要素にARIAラベル
- キーボードナビゲーションサポート（Tab、Enter、Escape）
- フォーカスインディケーター
- 動的コンテンツのスクリーンリーダー発表
- 高コントラスト色サポート

この契約により、アプリケーション全体で一貫したコンポーネントインターフェースと予測可能な動作が保証されます。
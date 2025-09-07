# タスク: 個人用タスク管理ToDoアプリ

**入力**: 設計ドキュメント `/specs/001-todo/`
**前提条件**: plan.md (必須), research.md, data-model.md, contracts/

## 実行フロー (main)
```
1. plan.mdを機能ディレクトリから読み込み
   → 見つからない場合: ERROR "実装プランが見つかりません"
   → 抽出: 技術スタック、ライブラリ、構造
2. オプションの設計ドキュメントを読み込み:
   → data-model.md: エンティティを抽出 → モデルタスク
   → contracts/: 各ファイル → 契約テストタスク
   → research.md: 決定事項を抽出 → セットアップタスク
3. カテゴリ別にタスクを生成:
   → セットアップ: プロジェクト初期化、依存関係、リンティング
   → テスト: 契約テスト、統合テスト
   → コア: モデル、サービス、UIコンポーネント
   → 統合: DB、ミドルウェア、ログ
   → 仕上げ: 単体テスト、パフォーマンス、ドキュメント
4. タスクルールを適用:
   → 異なるファイル = [P]で並列マーク
   → 同じファイル = 連続実行（[P]なし）
   → 実装前にテスト（TDD）
5. タスクを連続番号付け（T001, T002...）
6. 依存関係グラフを生成
7. 並列実行例を作成
8. タスクの完全性を検証:
   → 全契約にテストがあるか？
   → 全エンティティにモデルがあるか？
   → 全エンドポイントが実装されているか？
9. 戻り値: SUCCESS（タスクの実行準備完了）
```

## フォーマット: `[ID] [P?] 説明`
- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- 説明には正確なファイルパスを含める

## パス規則
- **単一プロジェクト**: リポジトリルートに`src/`、`tests/`
- 以下のパスは単一プロジェクトを想定 - plan.mdの構造に基づいて調整

## フェーズ 3.1: セットアップ
- [ ] T001 実装プランに従ったプロジェクト構造の作成
- [ ] T002 Vite + JavaScript プロジェクトの初期化と依存関係インストール
- [ ] T003 [P] ESLint/Prettier設定とVitestテストフレームワークの設定

## フェーズ 3.2: テストファースト (TDD) ⚠️ 3.3より前に完了必須
**重要: これらのテストは実装前に作成し、失敗しなければならない**
- [ ] T004 [P] TaskDatabaseクラス接続管理の契約テスト tests/contract/database-connection.test.js
- [ ] T005 [P] TaskDatabase CRUDメソッドの契約テスト tests/contract/database-operations.test.js
- [ ] T006 [P] TaskListコンポーネントの契約テスト tests/contract/ui-tasklist.test.js
- [ ] T007 [P] TaskFormコンポーネントの契約テスト tests/contract/ui-taskform.test.js
- [ ] T008 [P] FilterControlsコンポーネントの契約テスト tests/contract/ui-filters.test.js
- [ ] T009 [P] AppHeaderとNotificationManagerの契約テスト tests/contract/ui-components.test.js
- [ ] T010 [P] 初回アプリ起動シナリオの統合テスト tests/integration/app-launch.test.js
- [ ] T011 [P] タスク作成ユーザージャーニーの統合テスト tests/integration/task-creation.test.js
- [ ] T012 [P] タスク完了とフィルタリングの統合テスト tests/integration/task-management.test.js
- [ ] T013 [P] データ永続化とエラーハンドリングの統合テスト tests/integration/data-persistence.test.js

## フェーズ 3.3: コア実装 (テストが失敗した後のみ)
- [ ] T014 [P] メインHTMLファイル index.html の作成
- [ ] T015 [P] グローバルCSS src/styles/main.css の実装
- [ ] T016 [P] コンポーネントCSS src/styles/components.css の実装
- [ ] T017 [P] 日付ユーティリティ src/utils/dates.js の実装
- [ ] T018 SQLiteデータベース接続とスキーマ src/db/database.js の実装
- [ ] T019 データベースクエリ操作 src/db/queries.js の実装 (T018依存)
- [ ] T020 [P] TaskListコンポーネント src/ui/TaskList.js の実装
- [ ] T021 [P] TaskFormコンポーネント src/ui/TaskForm.js の実装
- [ ] T022 [P] FilterControlsコンポーネント src/ui/FilterControls.js の実装
- [ ] T023 [P] AppHeaderコンポーネント src/ui/AppHeader.js の実装
- [ ] T024 [P] NotificationManagerコンポーネント src/ui/NotificationManager.js の実装
- [ ] T025 アプリケーションエントリーポイント src/main.js の実装

## フェーズ 3.4: 統合
- [ ] T026 データベーススキーマ初期化とインデックス作成
- [ ] T027 イベント駆動UIシステムの統合
- [ ] T028 エラーハンドリングとログシステムの統合
- [ ] T029 レスポンシブデザインとアクセシビリティの実装

## フェーズ 3.5: 仕上げ
- [ ] T030 [P] データバリデーション単体テスト tests/unit/validation.test.js
- [ ] T031 [P] 日付ユーティリティ単体テスト tests/unit/dates.test.js
- [ ] T032 [P] パフォーマンステスト tests/performance/load-test.js
- [ ] T033 [P] E2Eテスト（ブラウザ自動化）tests/e2e/user-workflows.test.js
- [ ] T034 クイックスタートガイド手動テストの実行
- [ ] T035 コードの重複除去とリファクタリング

## 依存関係
- セットアップ (T001-T003) → テスト (T004-T013) → 実装 (T014-T025) → 統合 (T026-T029) → 仕上げ (T030-T035)
- T018 (database.js) が T019 (queries.js) をブロック
- T025 (main.js) は全UIコンポーネント (T020-T024) に依存

## 並列実行例
```
# フェーズ 3.2: 契約テストを同時実行
Task: "TaskDatabaseクラス接続管理の契約テスト tests/contract/database-connection.test.js"
Task: "TaskDatabase CRUDメソッドの契約テスト tests/contract/database-operations.test.js" 
Task: "TaskListコンポーネントの契約テスト tests/contract/ui-tasklist.test.js"
Task: "TaskFormコンポーネントの契約テスト tests/contract/ui-taskform.test.js"

# フェーズ 3.3: 独立したコンポーネントを同時実装
Task: "日付ユーティリティ src/utils/dates.js の実装"
Task: "TaskListコンポーネント src/ui/TaskList.js の実装"
Task: "TaskFormコンポーネント src/ui/TaskForm.js の実装"
Task: "FilterControlsコンポーネント src/ui/FilterControls.js の実装"
```

## 注意事項
- [P]タスク = 異なるファイル、依存関係なし
- 実装前にテストが失敗することを確認
- 各タスク後にコミット
- 避けるべき: 曖昧なタスク、同ファイル競合

## タスク生成ルール
*main() 実行中に適用*

1. **契約から**:
   - 各契約ファイル → 契約テストタスク [P]
   - 各コンポーネント → 実装タスク
   
2. **データモデルから**:
   - 各エンティティ → モデル作成タスク [P]
   - リレーションシップ → サービス層タスク
   
3. **ユーザーストーリーから**:
   - 各ストーリー → 統合テスト [P]
   - クイックスタートシナリオ → 検証タスク

4. **順序付け**:
   - セットアップ → テスト → モデル → サービス → UI → 統合 → 仕上げ
   - 依存関係が並列実行をブロック

## 検証チェックリスト
*main() が戻る前にチェック*

- [x] 全契約に対応するテストがある
- [x] 全エンティティにモデルタスクがある
- [x] 全テストが実装前に配置されている
- [x] 並列タスクが真に独立している
- [x] 各タスクが正確なファイルパスを指定
- [x] [P]タスクが同じファイルを変更しない

## 予想される成果物
合計35タスクによる完全なToDoアプリの段階的実装:
- **セットアップ**: 3タスク
- **テスト**: 10タスク（6契約 + 4統合）
- **実装**: 12タスク（HTML、CSS、JS、DB）
- **統合**: 4タスク
- **仕上げ**: 6タスク

実装完了時には、仕様書の全機能要件を満たし、TDD原則に従い、優秀なテストカバレッジを持つ本番対応のToDoアプリケーションが完成します。
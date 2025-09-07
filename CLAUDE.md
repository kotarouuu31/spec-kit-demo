# todo-app 開発ガイドライン

機能プランから自動生成。最終更新: 2025-09-07

## アクティブな技術
- **言語**: JavaScript ES2022, HTML5, CSS3
- **ビルドツール**: Vite（開発サーバー/バンドラー）  
- **データベース**: SQLite（better-sqlite3）
- **テスト**: Vitest
- **スタイリング**: モダンCSS（Grid、Flexbox）

## プロジェクト構造
```
src/
├── main.js           // アプリ初期化
├── db/
│   ├── database.js   // SQLite接続とスキーマ
│   └── queries.js    // SQLクエリと操作  
├── ui/
│   ├── TaskList.js   // タスクリスト描画
│   ├── TaskForm.js   // タスク追加・編集フォーム
│   └── FilterControls.js // 優先度・日付フィルタリング
├── utils/
│   └── dates.js      // 日付フォーマットユーティリティ
└── styles/
    ├── main.css      // グローバルスタイル
    └── components.css // コンポーネントスタイル

tests/
├── contract/         // 契約テスト
├── integration/      // 統合テスト
└── unit/            // 単体テスト
```

## コマンド
```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番用ビルド
npm run test         # テストスイート実行
npm run preview      # 本番ビルドプレビュー
```

## コードスタイル
- vanilla JavaScript ES2022+機能を使用
- 外部依存関係は最小限に
- データベース直接アクセス（ORM不使用）
- コンポーネントベースのUIアーキテクチャ
- TDDアプローチ: 実装前にテスト

## データベーススキーマ
```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL CHECK(LENGTH(TRIM(text)) > 0),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## 主要パターン
- **タスクエンティティ**: id, text, priority（高/中/低）, due_date, completed, タイムスタンプ
- **イベント駆動UI**: コンポーネント間通信用カスタムイベント
- **ローカルファースト**: SQLiteデータベース、クラウド同期なし
- **レスポンシブデザイン**: モバイル対応タッチターゲット、CSS Grid/Flexbox
- **エラーハンドリング**: 優雅な劣化、ユーザーフレンドリーメッセージ

## 最近の変更
- 001-todo: Vite + vanilla JS + SQLiteでの個人タスク管理ToDoアプリを追加

<!-- 手動追加開始 -->
<!-- ここに手動の開発メモを追加してください -->
<!-- 手動追加終了 -->
# 個人用ToDoアプリ

**Spec-Kit + Claude Code** を使用して仕様駆動開発（SDD）で構築された、シンプルで実用的な個人用タスク管理アプリケーションです。

![App Screenshot](./docs/images/app-screenshot.png)

## 🌟 特徴

### 🎯 主要機能
- **タスク管理**: 作成、編集、完了、削除
- **優先度設定**: 高・中・低の3段階
- **期限管理**: 期日設定と期限切れ警告
- **フィルタリング**: 完了状態、優先度、期日による絞り込み
- **統計表示**: リアルタイムタスク統計と進捗バー
- **データ永続化**: ローカルストレージによる自動保存

### 🚀 技術特徴
- **純粋なJavaScript**: フレームワーク不使用、軽量設計
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応
- **アクセシビリティ**: WCAG準拠、キーボード操作対応
- **PWA対応**: オフライン利用可能
- **完全日本語化**: UI・メッセージ・日付表示すべて日本語

## 📋 仕様駆動開発（SDD）について

このプロジェクトは **Spec-Kit** と **Claude Code** を使用した仕様駆動開発のデモンストレーションです：

```bash
# 1. 仕様作成
/specify "日々のタスク管理に困っているので、個人用のToDoアプリを作りたいです..."

# 2. 実装計画
/plan 

# 3. タスク分解
/tasks

# 4. 順次実装
T001から順番に実行...
```

### SDD の利点
- ✅ **明確な要件定義**: ユーザーニーズから機能要件まで体系的に整理
- ✅ **計画的な実装**: 35のタスクに分解して段階的に開発
- ✅ **品質保証**: TDD（テスト駆動開発）による堅牢な実装
- ✅ **完全な文書化**: 仕様書から実装まで一貫したドキュメント

## 🛠 技術スタック

### フロントエンド
- **Vanilla JavaScript (ES2022)**: モダンなJavaScript構文
- **CSS3**: カスタムプロパティ、Grid、Flexbox
- **HTML5**: セマンティックマークアップ

### 開発環境
- **Vite**: 高速ビルドツール
- **Vitest**: JavaScript テストフレームワーク
- **Playwright**: E2Eテスト自動化
- **ESLint**: コード品質管理

### データベース
- **SQLite (better-sqlite3)**: ローカルデータベース
- **ローカルストレージ**: ブラウザ内データ保存

### ユーティリティ
- **date-fns**: 日本語日付処理
- **jsdom**: テスト環境でのDOM操作

## 🚀 クイックスタート

### 前提条件
- Node.js 18.0.0 以上
- npm 8.0.0 以上

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kotarouuu31/spec-kit-demo.git
cd spec-kit-demo

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### 開発サーバー
http://localhost:5173 でアプリケーションにアクセスできます。

## 📚 使用方法

### 基本操作

#### タスクの追加
1. 「新規タスク」ボタンをクリック
2. タスク内容を入力
3. 優先度と期限を設定（オプション）
4. 「作成」ボタンで保存

#### タスクの管理
- **完了**: チェックボックスをクリック
- **編集**: タスクをクリックして編集モードに
- **削除**: 削除ボタンをクリック

#### フィルタリング
- **すべて**: 全タスクを表示
- **アクティブ**: 未完了タスクのみ
- **完了済み**: 完了タスクのみ
- **高優先度**: 優先度「高」のタスクのみ

### キーボードショートカット
- `Ctrl/Cmd + Enter`: タスク保存
- `Escape`: モーダル閉じる
- `Tab`: フォーカス移動

## 🧪 テスト

### テスト実行
```bash
# 全テストの実行
npm test

# 契約テスト
npm run test:contract

# 統合テスト  
npm run test:integration

# E2Eテスト
npm run test:e2e

# パフォーマンステスト
npm run test:performance
```

### テストカバレッジ
- **契約テスト**: 95+ コンポーネント契約
- **統合テスト**: データフロー・コンポーネント連携
- **ユニットテスト**: バリデーション・ユーティリティ
- **E2Eテスト**: ユーザーワークフロー自動化
- **パフォーマンステスト**: 負荷・ストレステスト

### 手動テスト
詳細な手動テスト手順は [tests/manual/quickstart-guide-test.md](./tests/manual/quickstart-guide-test.md) を参照してください。

## 📁 プロジェクト構造

```
todo-app/
├── specs/001-todo/           # 仕様書・計画書
│   ├── spec.md              # 機能仕様書
│   ├── plan.md              # 実装計画  
│   └── tasks.md             # タスク一覧
├── src/
│   ├── db/                  # データベース層
│   ├── ui/                  # UIコンポーネント
│   ├── utils/               # ユーティリティ
│   ├── styles/              # スタイルシート
│   └── main.js              # アプリエントリ
├── tests/
│   ├── contract/            # 契約テスト
│   ├── integration/         # 統合テスト
│   ├── unit/                # ユニットテスト
│   ├── e2e/                 # E2Eテスト
│   ├── performance/         # パフォーマンステスト
│   └── manual/              # 手動テストドキュメント
├── index.html               # メインHTML
├── package.json             # プロジェクト設定
└── vite.config.js           # ビルド設定
```

## 🏗 アーキテクチャ

### コンポーネント設計
```
TodoApp (メインアプリ)
├── AppHeader (ヘッダー・統計)
├── FilterControls (フィルター操作)
├── TaskList (タスク一覧)
├── TaskForm (タスク作成・編集)
└── NotificationManager (通知管理)
```

### データフロー
1. **データベース** ↔ **UIコンポーネント**: リアルタイム同期
2. **イベント駆動**: カスタムイベントによるコンポーネント間通信
3. **状態管理**: 単一データソースパターン

### ユーティリティ層
- **dom-helpers.js**: 安全なDOM操作・BaseComponentクラス
- **validation.js**: バリデーションフレームワーク
- **logger.js**: 統合ログシステム
- **dates.js**: 日本語日付処理

## 🔧 開発コマンド

```bash
# 開発
npm run dev              # 開発サーバー起動
npm run build            # プロダクションビルド
npm run preview          # ビルド結果プレビュー

# コード品質
npm run lint             # ESLint実行
npm run lint:fix         # ESLint自動修正

# テスト
npm test                 # 全テスト実行
npm run test:watch       # テストwatch モード
npm run test:ui          # テストUIで実行
```

## 📊 パフォーマンス

### 軽量設計
- **バンドルサイズ**: < 50KB (gzipped)
- **初期読み込み**: < 500ms
- **大量データ対応**: 1000+ タスクでも高速動作

### 最適化
- **コード分割**: 動的インポート使用
- **キャッシング**: アグレッシブキャッシング戦略
- **圧縮**: CSS/JS最小化

## ♿ アクセシビリティ

### WCAG 2.1 AA準拠
- **キーボード操作**: 全機能がキーボードで操作可能
- **スクリーンリーダー**: ARIA属性による支援技術対応  
- **色覚対応**: 色以外の視覚的手がかりを提供
- **フォーカス管理**: 明確なフォーカス表示

### アクセシビリティ機能
- スキップリンク
- セマンティックHTML
- 適切な見出し構造
- 十分なコントラスト比

## 🌐 ブラウザサポート

### 対応ブラウザ
- **Chrome**: 88+
- **Firefox**: 85+  
- **Safari**: 14+
- **Edge**: 88+

### モバイル対応
- **iOS Safari**: 14+
- **Chrome Mobile**: 88+
- **Samsung Internet**: 15+

## 📱 PWA機能

### プログレッシブWebアプリ
- **オフライン対応**: Service Worker実装
- **インストール可能**: Add to Home Screen
- **プッシュ通知**: タスク期限通知（オプション）

## 🤝 貢献

### 開発への参加
1. フォークしてクローン
2. フィーチャーブランチを作成: `git checkout -b feature/amazing-feature`
3. 変更をコミット: `git commit -m 'Add amazing feature'`
4. ブランチにプッシュ: `git push origin feature/amazing-feature`
5. プルリクエストを作成

### バグ報告
GitHub Issues でバグ報告や機能要望をお寄せください。

## 📄 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照してください。

## 🙏 謝辞

- **Spec-Kit**: 仕様駆動開発フレームワーク
- **Claude Code**: AI支援開発環境
- **Vite**: 高速ビルドツール
- **date-fns**: 日本語日付ライブラリ

## 📞 サポート

質問やサポートが必要な場合は、以下をご利用ください：

- **GitHub Issues**: バグ報告・機能要望
- **GitHub Discussions**: 質問・議論
- **Wiki**: 追加ドキュメント

---

**🤖 Generated with [Claude Code](https://claude.ai/code)**

このプロジェクトは、**Spec-Kit** と **Claude Code** を使用した仕様駆動開発（SDD）のデモンストレーションとして作成されました。
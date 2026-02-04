# Fooweb

ユーザー認証機能を持つモノレポアプリケーション

## 技術スタック

### バックエンド
- Node.js + TypeScript
- Hono (Web フレームワーク)
- PostgreSQL + Drizzle ORM
- @node-rs/bcrypt (パスワードハッシュ)
- Zod (バリデーション)
- Vitest (テスト)

### フロントエンド
- React + TypeScript
- React Router v7
- Tailwind CSS v4
- Vite
- Playwright (E2Eテスト)

## セットアップ

### mise を使用する場合（推奨）

```bash
# 初期セットアップ（依存関係インストール、PostgreSQL起動、マイグレーション）
mise run setup

# 環境変数の設定
cp packages/backend/.env.example packages/backend/.env

# 開発サーバー起動
mise run dev
```

### 手動セットアップ

#### 1. 依存関係のインストール

```bash
pnpm install
```

#### 2. PostgreSQLの起動

```bash
sudo docker-compose up -d
```

#### 3. データベースマイグレーション

```bash
pnpm db:migrate
```

#### 4. 環境変数の設定

```bash
cp packages/backend/.env.example packages/backend/.env
```

## 開発

### mise タスクランナー

```bash
# 全タスクを表示
mise tasks

# バックエンドとフロントエンドを同時起動
mise run dev

# バックエンドのみ起動
mise run dev:api

# フロントエンドのみ起動
mise run dev:web

# PostgreSQL起動
mise run docker:up

# PostgreSQL停止
mise run docker:down

# Drizzle Studio起動
mise run db:studio
```

### pnpm コマンド

```bash
# バックエンドとフロントエンドを同時起動
pnpm dev

# バックエンドのみ起動
pnpm dev:api

# フロントエンドのみ起動
pnpm dev:web
```

## テスト

### mise タスク

```bash
# 全テストを実行
mise run test

# バックエンドのテスト
mise run test:api

# E2Eテスト
mise run test:e2e

# カバレッジ付きテスト
mise run test:coverage
```

### pnpm コマンド

```bash
# バックエンドのテスト
pnpm --filter @fooweb/backend test

# E2Eテスト
pnpm --filter @fooweb/frontend test:e2e
```

## API エンドポイント

- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報取得
- `POST /api/auth/logout` - ログアウト
- `GET /api/openapi.json` - OpenAPI仕様

## プロジェクト構成

```
fooweb/
├── packages/
│   ├── backend/        # Hono API サーバー
│   │   ├── src/
│   │   │   ├── auth/   # 認証ロジック
│   │   │   ├── db/     # データベーススキーマ
│   │   │   └── routes/ # APIルート
│   │   └── drizzle/    # マイグレーションファイル
│   └── frontend/       # React アプリ
│       ├── src/
│       │   ├── lib/    # API クライアント、認証状態管理
│       │   ├── pages/  # ページコンポーネント
│       │   └── components/
│       └── e2e/        # E2Eテスト
└── docker-compose.yml  # PostgreSQL設定
```

## 開発方針

- TDD (Test-Driven Development)
- 関数型プログラミング
- 関心の分離（純粋関数とDB操作を分離）

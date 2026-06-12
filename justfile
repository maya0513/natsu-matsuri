# 夏祭りゲーム タスク一覧

default:
    @just --list

# 開発サーバー起動
dev:
    pnpm exec vp dev

# 本番ビルド
build:
    pnpm exec vp build

# ビルド結果のプレビュー
preview:
    pnpm exec vp preview

# ユニットテスト（Vitest）
test *ARGS:
    pnpm exec vp test {{ ARGS }}

# fmt + lint + 型チェックを一括実行
check:
    pnpm exec vp check

# lint のみ
lint:
    pnpm exec oxlint

# フォーマット
fmt:
    pnpm exec oxfmt

# スプライトシート等の全アセット再生成
gen-assets:
    node tools/assets/generate.ts

# スモーク E2E
e2e:
    pnpm exec playwright test

# Cloudflare Pages へデプロイ（要: wrangler login か CLOUDFLARE_API_TOKEN）
deploy: build
    pnpm dlx wrangler pages deploy dist --project-name fooweb

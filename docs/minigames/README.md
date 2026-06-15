# ミニゲーム屋台 仕様

夏祭りのゲーム屋台 7 種の仕様。屋台に入ると暗転フェードののち、専用の「屋台内部空間」
（独立した three.js シーン＋ゲームごとの覗き込みカメラ）でプレイする。

## 共通仕様

- **操作（併存）**
  - PC: 十字キーでカーソル（ポイ/照準/札選択など）を動かし、Enter/Space/E で決定。
    金魚すくいはポイを縦横に、射的は照準を縦横に動かせる（他は左右）。
  - クリック/タッチ: 3D の対象（金魚・風船・札・紐・的・もぐら）を直接選んで決定。
  - 退出: Esc または「やめる」。結果画面では「もう一回」で再挑戦。
- **モーダルは最小限**: 進行中は「やめる」、終了時は「もう一回／やめる」だけ。操作説明は出さない。
  残数などのゲーム情報は画面上部に控えめに別表示する（`MinigameStatus`）。
- **演出主体**: 当たり/はずれは 3D の演出（すくい上げ・倒れる・札が開く 等）で伝え、文章通知はしない。
- **景品の持ち帰り**: 勝つと退出時に景品 1 つを手に持って歩く（`heldItem`、単一スロット）。
  何度取っても手持ちは最後の 1 つ。金魚は「袋」、ヨーヨーは「水風船」を手に持って帰る。

## 実装ファイル

| 層 | ファイル |
| --- | --- |
| ロジック（純粋・TDD） | `src/game/minigames/index.ts`（`initMinigame`/`stepMinigame`/`commitMinigame`/`prizeOf`/`isFinished`） |
| 型（コントラクト） | `src/game/types.ts` |
| アクション適用 | `src/game/actions.ts`（`minigame-commit` に `target?` を持つ） |
| 内部空間の描画 | `src/render/minigameStage.ts`（ゲーム別ビルダー・覗き込みカメラ・`pick()`・演出） |
| 暗転フェード | `src/render/view.ts` |
| クリック→決定の配線 | `src/main.ts`（canvas の pointerdown → `view.pickAt` → `minigame-commit`） |
| UI（最小モーダル・別表示） | `src/ui/MinigamePanel.tsx`, `src/ui/App.tsx`, `src/ui/bridge.ts` |
| 小物スプライト生成 | `tools/assets/sprites/minigame.ts`（`minigame.png`）, `tools/assets/sprites/heldItems.ts`（`held.png`） |

## 各ゲーム

- [くじ引き（おみくじ）](./kuji.md)
- [金魚すくい](./kingyo.md)
- [ヨーヨー釣り](./yoyo.md)
- [射的](./shateki.md)
- [千本引き](./senbiki.md)
- [もぐら叩き](./mogura.md)
- [ビンゴ](./bingo.md)

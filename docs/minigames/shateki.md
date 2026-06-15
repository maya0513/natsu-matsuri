# 射的

2 段の棚に並ぶ景品をコルク銃で撃ち落とす。景品は複数種類が下段・上段に並ぶ。

## 操作
- 十字キーで照準を**縦横**に動かし、Enter で撃つ。/ 景品を直接クリック・タップでも狙える。
- 弾数に上限あり（`shotsLeft`）。

## 勝敗
- 照準（またはタップした景品）の近くに生きた景品があれば命中（命中窓 `HIT_WINDOW.shatekiX`/`shatekiY`）。
- 1 個以上命中で勝ち。弾切れか全撃破で終了。

## 景品
- 1 個以上命中で **景品（shateki-prize）** を持ち帰る。

## 演出
- 棚の景品は種類いろいろ（くま・スーパーボール・こま・ロボット）を下段 3・上段 2 に配置。命中すると倒れて落ちる。照準は撃つと前へ punch。

## 実装メモ
- 状態: `ShatekiState { cursor, cursorY, shotsLeft, targets[], hits, last? }`。`Target` は段の高さ `y` を持つ。
- 縦移動は `stepMinigame` が `move.y`（画面上＝負）を `cursorY` 増へ反映。判定は `nearestIndex2D`（縦横の窓）。
- 景品スプライトは `minigame.png`（`prize-bear`/`prize-ball`/`prize-top`/`prize-robot`）を index で割り当て。

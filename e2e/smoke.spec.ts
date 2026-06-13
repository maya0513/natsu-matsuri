// スモーク E2E: 起動 → 描画 → 移動 → 屋台ダイアログ開閉の一気通貫のみ
import { expect, test } from "@playwright/test";

test("起動して歩いて屋台を調べられる", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");

  // three.js の canvas が出る（2 つ目はミニゲームオーバーレイなので先頭を見る）
  await expect(page.locator("#game canvas").first()).toBeVisible();

  // 入口そばの焼きそば屋（-4, 17）へ歩く。開始位置は (0, 20)
  await page.keyboard.down("w");
  await page.waitForTimeout(800); // y: 20 → 約16.8
  await page.keyboard.up("w");
  await page.keyboard.down("a");
  await page.waitForTimeout(1000); // x: 0 → 約-4
  await page.keyboard.up("a");

  // 近接プロンプトが出て、E でダイアログが開く
  await expect(page.getByText("屋台へ")).toBeVisible({ timeout: 5000 });
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: /買う/ }).first()).toBeVisible();

  // 数字キー 1 で買う（キーボードだけで操作できる）とダイアログは閉じる
  await page.keyboard.press("1");
  await expect(page.getByRole("button", { name: /買う/ }).first()).not.toBeVisible();

  expect(errors).toEqual([]);
});

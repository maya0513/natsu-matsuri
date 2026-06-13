// スモーク E2E: 起動 → 描画 → 移動 → 屋台ダイアログ開閉の一気通貫のみ
import { expect, test } from "@playwright/test";

test("起動して歩いて屋台を調べられる", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");

  // three.js の canvas が出る（2 つ目はミニゲームオーバーレイなので先頭を見る）
  await expect(page.locator("#game canvas").first()).toBeVisible();

  // たこ焼き屋（-5, 6）へ歩く。開始位置は (0, 18)
  await page.keyboard.down("w");
  await page.waitForTimeout(3000); // y: 18 → 約6
  await page.keyboard.up("w");
  await page.keyboard.down("a");
  await page.waitForTimeout(1100); // x: 0 → 約-4.4
  await page.keyboard.up("a");

  // 近接プロンプトが出て、E でダイアログが開く
  await expect(page.getByText("を調べる")).toBeVisible({ timeout: 5000 });
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: /食べる/ }).first()).toBeVisible();

  // 食べると（持ち物もお金もない。一瞬の演出のみ）ダイアログは自動で閉じる
  await page
    .getByRole("button", { name: /食べる/ })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /食べる/ }).first()).not.toBeVisible();

  expect(errors).toEqual([]);
});

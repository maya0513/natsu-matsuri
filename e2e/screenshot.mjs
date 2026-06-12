// 開発用: 実画面のスクリーンショットを撮る確認スクリプト
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5199/");
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/festival.png" });
await page.keyboard.down("w");
await page.waitForTimeout(2000);
await page.keyboard.up("w");
await page.screenshot({ path: "/tmp/festival-walk.png" });
console.log("pageerrors:", errors.length ? errors : "なし");
await browser.close();

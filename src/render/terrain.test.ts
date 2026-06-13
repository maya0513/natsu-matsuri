import { describe, expect, it } from "vitest";
import { BANK_Y, STAIR_BOT_X, STAIR_TOP_X, groundHeightAt } from "./terrain";

describe("groundHeightAt（地形の高低差プロファイル）", () => {
  it("台地（石段より右）は高さ 0", () => {
    expect(groundHeightAt(STAIR_TOP_X)).toBe(0);
    expect(groundHeightAt(0)).toBe(0);
    expect(groundHeightAt(13)).toBe(0);
  });

  it("河川敷（石段より左）は一段低い BANK_Y", () => {
    expect(groundHeightAt(STAIR_BOT_X - 0.001)).toBe(BANK_Y);
    expect(groundHeightAt(-13)).toBe(BANK_Y);
  });

  it("石段帯は台地から河川敷へ単調に降下する", () => {
    // 右（台地）から左（河川敷）へ進むと高さは増えない
    let prev = groundHeightAt(STAIR_TOP_X + 1);
    for (let x = STAIR_TOP_X; x >= STAIR_BOT_X - 1; x -= 0.1) {
      const h = groundHeightAt(x);
      expect(h).toBeLessThanOrEqual(prev + 1e-9);
      prev = h;
    }
  });

  it("石段帯の途中は 0 と BANK_Y の間にある", () => {
    const mid = groundHeightAt((STAIR_TOP_X + STAIR_BOT_X) / 2);
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(BANK_Y);
  });

  it("両端の高さは台地=0・河川敷=BANK_Y に一致する", () => {
    expect(groundHeightAt(STAIR_TOP_X)).toBe(0);
    expect(groundHeightAt(STAIR_BOT_X)).toBe(BANK_Y);
  });
});

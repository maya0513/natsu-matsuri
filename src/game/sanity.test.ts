// M0: テストランナーの疎通確認用。最初の実モジュールのテスト追加時に削除する
import { describe, expect, it } from "vitest";

describe("vitest 疎通", () => {
  it("実行できる", () => {
    expect(true).toBe(true);
  });
});

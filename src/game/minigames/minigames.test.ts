import { describe, expect, it } from "vitest";
import type {
  BingoState,
  KingyoState,
  KujiState,
  MoguraState,
  SenbikiState,
  ShatekiState,
  Target,
  YoyoState,
} from "../types";
import {
  drawBall,
  fortuneFromRng,
  initMinigame,
  isFinished,
  pickLot,
  pressMinigame,
  prizeOf,
  pullString,
  stepMinigame,
} from "./index";

describe("くじ引き（おみくじ）", () => {
  it("運勢は rng のしきい値で決まる", () => {
    expect(fortuneFromRng(0)).toBe("大吉");
    expect(fortuneFromRng(0.5)).toBe("吉");
    expect(fortuneFromRng(0.9)).toBe("凶");
    expect(fortuneFromRng(0.999)).toBe("大凶");
  });

  it("初期は伏せ札が複数並ぶ（未選択）", () => {
    const k = initMinigame("kuji") as KujiState;
    expect(k.count).toBeGreaterThan(1);
    expect(k.picked).toBeUndefined();
    expect(isFinished(k)).toBe(false);
  });

  it("引くと運勢が確定し、吉系ならお守りを持ち帰れる", () => {
    const k = initMinigame("kuji") as KujiState;
    const good = pickLot(k, 2, () => 0); // 大吉
    expect(good.picked).toBe(2);
    expect(good.result).toBe("大吉");
    expect(isFinished(good)).toBe(true);
    expect(prizeOf(good)).toBe("omamori");
  });

  it("凶・大凶では景品なし", () => {
    const bad = pickLot(initMinigame("kuji") as KujiState, 0, () => 0.99);
    expect(bad.result).toBe("大凶");
    expect(prizeOf(bad)).toBeUndefined();
  });

  it("選択済みなら二度引けない（同一参照を返す）", () => {
    const picked = pickLot(initMinigame("kuji") as KujiState, 1, () => 0);
    expect(pickLot(picked, 5, () => 0.99)).toBe(picked);
  });

  it("press は何も起こさない（選択操作のみ）", () => {
    expect(pressMinigame(initMinigame("kuji")).hit).toBe(false);
  });

  it("step では変化しない", () => {
    const k = initMinigame("kuji");
    expect(stepMinigame(k, 1)).toBe(k);
  });
});

describe("ヨーヨー釣り", () => {
  const make = (hookX: number, balloons: YoyoState["balloons"], triesLeft = 4): YoyoState => ({
    id: "yoyo",
    hookX,
    dir: 1,
    balloons,
    triesLeft,
    caught: 0,
  });
  const balloons = (): YoyoState["balloons"] => [
    { x: 0.2, phase: 0, alive: true },
    { x: 0.5, phase: 0, alive: true },
    { x: 0.8, phase: 0, alive: true },
  ];

  it("フック直下の風船を掬える", () => {
    const r = pressMinigame(make(0.5, balloons()));
    const after = r.state as YoyoState;
    expect(r.hit).toBe(true);
    expect(after.caught).toBe(1);
    expect(after.triesLeft).toBe(3);
    expect(after.balloons[1]?.alive).toBe(false);
  });

  it("どの風船からも遠いと失敗してこよりだけ減る", () => {
    const r = pressMinigame(make(0.0, balloons()));
    expect(r.hit).toBe(false);
    expect((r.state as YoyoState).triesLeft).toBe(3);
  });

  it("こよりが尽きるか全部掬えば終了。捕獲数で風船を持ち帰る", () => {
    expect(isFinished(make(0.5, balloons(), 0))).toBe(true);
    const allCaught = make(0.5, [
      { x: 0.2, phase: 0, alive: false },
      { x: 0.5, phase: 0, alive: false },
      { x: 0.8, phase: 0, alive: false },
    ]);
    expect(isFinished(allCaught)).toBe(true);
    expect(prizeOf({ ...make(0.5, balloons()), caught: 1 })).toBe("yoyo-balloon");
    expect(prizeOf(make(0.5, balloons()))).toBeUndefined();
  });

  it("step でフックが動き、風船が揺れる", () => {
    const s = initMinigame("yoyo") as YoyoState;
    const stepped = stepMinigame(s, 0.1) as YoyoState;
    expect(stepped.hookX).toBeGreaterThan(0);
    expect(stepped.balloons[0]?.phase ?? 0).toBeGreaterThan(s.balloons[0]?.phase ?? 0);
  });
});

describe("金魚すくい", () => {
  it("初期ポイは 3 回分", () => {
    const s = initMinigame("kingyo") as KingyoState;
    expect(s.poiLeft).toBe(3);
  });

  it("中央付近で押すと捕獲、捕獲で金魚を持ち帰る", () => {
    const s: KingyoState = { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 3, caught: 0 };
    const r = pressMinigame(s);
    const after = r.state as KingyoState;
    expect(r.hit).toBe(true);
    expect(after.caught).toBe(1);
    expect(after.poiLeft).toBe(2);
    expect(prizeOf(after)).toBe("goldfish");
  });

  it("外すとポイだけ減る", () => {
    const s: KingyoState = { id: "kingyo", fishX: 0.05, dir: 1, poiLeft: 3, caught: 0 };
    const r = pressMinigame(s);
    expect(r.hit).toBe(false);
    expect((r.state as KingyoState).poiLeft).toBe(2);
    expect(prizeOf(r.state)).toBeUndefined();
  });

  it("ポイが尽きたら終了。さらに押しても何も起きない", () => {
    const done: KingyoState = { id: "kingyo", fishX: 0.5, dir: 1, poiLeft: 0, caught: 2 };
    expect(isFinished(done)).toBe(true);
    const r = pressMinigame(done);
    expect(r.state).toBe(done);
    expect(r.hit).toBe(false);
  });
});

describe("射的", () => {
  const target = (x: number, up: boolean, alive = true): Target => ({ x, up, timer: 1, alive });
  const make = (aimX: number, targets: readonly Target[], shotsLeft = 6): ShatekiState => ({
    id: "shateki",
    aimX,
    dir: 1,
    shotsLeft,
    targets,
    hits: 0,
  });

  it("立っている的を照準下で撃つと倒れる", () => {
    const r = pressMinigame(make(0.5, [target(0.2, false), target(0.5, true), target(0.8, false)]));
    const after = r.state as ShatekiState;
    expect(r.hit).toBe(true);
    expect(after.hits).toBe(1);
    expect(after.targets[1]?.alive).toBe(false);
    expect(after.shotsLeft).toBe(5);
  });

  it("伏せている的は撃てない（弾だけ減る）", () => {
    const r = pressMinigame(make(0.5, [target(0.5, false)]));
    expect(r.hit).toBe(false);
    expect((r.state as ShatekiState).shotsLeft).toBe(5);
  });

  it("弾切れか全撃破で終了。命中で景品を持ち帰る", () => {
    expect(isFinished(make(0.5, [target(0.5, true)], 0))).toBe(true);
    expect(isFinished(make(0.5, [target(0.5, true, false)]))).toBe(true);
    expect(prizeOf({ ...make(0.5, [target(0.5, true)]), hits: 1 })).toBe("shateki-prize");
    expect(prizeOf(make(0.5, [target(0.5, true)]))).toBeUndefined();
  });

  it("step で的が出没し、照準が動く", () => {
    const s = make(0.0, [target(0.2, true)]);
    const withTimer: ShatekiState = { ...s, targets: [{ x: 0.2, up: true, timer: 0.01, alive: true }] };
    const stepped = stepMinigame(withTimer, 0.02) as ShatekiState;
    expect(stepped.targets[0]?.up).toBe(false); // 出没が切り替わる
    expect(stepped.aimX).toBeGreaterThan(0);
  });
});

describe("千本引き", () => {
  it("引くと当たり/はずれが確定し、当たりは景品を持ち帰る", () => {
    const s = initMinigame("senbiki") as SenbikiState;
    const win = pullString(s, 0, () => 0); // 大当たり
    expect(win.result).toBe("大当たり");
    expect(isFinished(win)).toBe(true);
    expect(prizeOf(win)).toBe("senbiki-prize");
    const lose = pullString(s, 1, () => 0.9); // はずれ
    expect(lose.result).toBe("はずれ");
    expect(prizeOf(lose)).toBeUndefined();
  });

  it("選択済みなら二度引けない", () => {
    const picked = pullString(initMinigame("senbiki") as SenbikiState, 0, () => 0);
    expect(pullString(picked, 1, () => 0.9)).toBe(picked);
  });
});

describe("モグラたたき", () => {
  const make = (hammerX: number, moles: MoguraState["moles"], triesLeft = 10): MoguraState => ({
    id: "mogura",
    hammerX,
    dir: 1,
    moles,
    triesLeft,
    hits: 0,
  });

  it("ハンマー直下の出ているモグラを叩ける", () => {
    const r = pressMinigame(
      make(0.38, [
        { x: 0.15, up: false, timer: 1 },
        { x: 0.38, up: true, timer: 1 },
      ]),
    );
    const after = r.state as MoguraState;
    expect(r.hit).toBe(true);
    expect(after.hits).toBe(1);
    expect(after.triesLeft).toBe(9);
    expect(after.moles[1]?.up).toBe(false);
  });

  it("隠れているモグラは叩けない", () => {
    const r = pressMinigame(make(0.38, [{ x: 0.38, up: false, timer: 1 }]));
    expect(r.hit).toBe(false);
  });

  it("ハンマー切れで終了。2 匹以上で景品を持ち帰る", () => {
    expect(isFinished(make(0.38, [{ x: 0.38, up: true, timer: 1 }], 0))).toBe(true);
    expect(prizeOf({ ...make(0.38, []), hits: 2 })).toBe("mogura-prize");
    expect(prizeOf({ ...make(0.38, []), hits: 1 })).toBeUndefined();
  });

  it("step でハンマーが動き、モグラが出没する", () => {
    const s = make(0, [{ x: 0.38, up: true, timer: 0.01 }]);
    const stepped = stepMinigame(s, 0.02) as MoguraState;
    expect(stepped.moles[0]?.up).toBe(false);
    expect(stepped.hammerX).toBeGreaterThan(0);
  });
});

describe("ビンゴ", () => {
  it("引いた玉がカードにあれば印が付く", () => {
    const after = drawBall(initMinigame("bingo") as BingoState, () => 0); // 玉=1
    expect(after.lastBall).toBe(1);
    expect(after.marked[0]).toBe(true); // card[0]=1
  });

  it("1 列揃うとビンゴになり、景品を持ち帰る", () => {
    let s = initMinigame("bingo") as BingoState;
    s = drawBall(s, () => 0); // 1
    s = drawBall(s, () => 0); // 2
    s = drawBall(s, () => 0); // 3 → 上段 揃い
    expect(s.bingo).toBe(true);
    expect(isFinished(s)).toBe(true);
    expect(prizeOf(s)).toBe("bingo-prize");
  });
});

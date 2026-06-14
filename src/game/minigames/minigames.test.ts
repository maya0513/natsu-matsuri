import { describe, expect, it } from "vitest";
import type {
  BingoState,
  Fish,
  KingyoState,
  KujiState,
  MoguraState,
  SenbikiState,
  ShatekiState,
  Target,
  YoyoState,
} from "../types";
import {
  commitMinigame,
  drawBall,
  fortuneFromRng,
  initMinigame,
  isFinished,
  lotIndexAt,
  pickLot,
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

  it("初期は伏せ札が複数並び、カーソルは中央（未選択）", () => {
    const k = initMinigame("kuji") as KujiState;
    expect(k.count).toBeGreaterThan(1);
    expect(k.cursor).toBeCloseTo(0.5);
    expect(k.picked).toBeUndefined();
    expect(isFinished(k)).toBe(false);
  });

  it("カーソル位置から選択中の札 index が決まる", () => {
    expect(lotIndexAt(0, 9)).toBe(0);
    expect(lotIndexAt(0.5, 9)).toBe(4); // 中央
    expect(lotIndexAt(1, 9)).toBe(8); // 端
  });

  it("引くとカーソル位置の札が開いて運勢が確定、吉系ならお守り", () => {
    const k: KujiState = { id: "kuji", count: 9, cursor: 1 };
    const good = pickLot(k, () => 0); // 大吉
    expect(good.picked).toBe(8);
    expect(good.result).toBe("大吉");
    expect(isFinished(good)).toBe(true);
    expect(prizeOf(good)).toBe("omamori");
  });

  it("凶・大凶では景品なし", () => {
    const bad = pickLot(initMinigame("kuji") as KujiState, () => 0.99);
    expect(bad.result).toBe("大凶");
    expect(prizeOf(bad)).toBeUndefined();
  });

  it("選択済みなら二度引けない（同一参照を返す）", () => {
    const picked = pickLot(initMinigame("kuji") as KujiState, () => 0);
    expect(pickLot(picked, () => 0.99)).toBe(picked);
  });

  it("commit は吉で hit、凶で miss", () => {
    const k = initMinigame("kuji") as KujiState;
    expect(commitMinigame(k, () => 0).hit).toBe(true);
    expect(commitMinigame(k, () => 0.99).hit).toBe(false);
  });

  it("step は ←→ 入力でだけカーソルが動く（入力なしは同一参照）", () => {
    const k = initMinigame("kuji") as KujiState;
    expect(stepMinigame(k, 1, 0)).toBe(k);
    const moved = stepMinigame(k, 0.1, 1) as KujiState;
    expect(moved.cursor).toBeGreaterThan(k.cursor);
  });
});

describe("ヨーヨー釣り", () => {
  const balloons = (): YoyoState["balloons"] => [
    { x: 0.2, baseY: 0.4, phase: 0, alive: true },
    { x: 0.5, baseY: 0.4, phase: 0, alive: true },
    { x: 0.8, baseY: 0.4, phase: 0, alive: true },
  ];
  const make = (cursor: number, bs: YoyoState["balloons"], triesLeft = 4): YoyoState => ({
    id: "yoyo",
    cursor,
    balloons: bs,
    triesLeft,
    caught: 0,
  });

  it("カーソル直下の風船を掬える", () => {
    const r = commitMinigame(make(0.5, balloons()), () => 0);
    const after = r.state as YoyoState;
    expect(r.hit).toBe(true);
    expect(after.caught).toBe(1);
    expect(after.triesLeft).toBe(3);
    expect(after.balloons[1]?.alive).toBe(false);
  });

  it("どの風船からも遠いと失敗してこよりだけ減る", () => {
    const r = commitMinigame(make(0.0, balloons()), () => 0);
    expect(r.hit).toBe(false);
    expect((r.state as YoyoState).triesLeft).toBe(3);
  });

  it("こよりが尽きるか全部掬えば終了。捕獲数で風船を持ち帰る", () => {
    expect(isFinished(make(0.5, balloons(), 0))).toBe(true);
    const allCaught = make(0.5, [
      { x: 0.2, baseY: 0.4, phase: 0, alive: false },
      { x: 0.5, baseY: 0.4, phase: 0, alive: false },
      { x: 0.8, baseY: 0.4, phase: 0, alive: false },
    ]);
    expect(isFinished(allCaught)).toBe(true);
    expect(prizeOf({ ...make(0.5, balloons()), caught: 1 })).toBe("yoyo-balloon");
    expect(prizeOf(make(0.5, balloons()))).toBeUndefined();
  });

  it("step でカーソルが動き、生存風船が揺れる", () => {
    const s = initMinigame("yoyo") as YoyoState;
    const stepped = stepMinigame(s, 0.1, 1) as YoyoState;
    expect(stepped.cursor).toBeGreaterThan(s.cursor);
    expect(stepped.balloons[0]?.phase ?? 0).toBeGreaterThan(s.balloons[0]?.phase ?? 0);
  });
});

describe("金魚すくい", () => {
  const fish = (x: number, alive = true): Fish => ({ x, y: 0.5, dir: 1, speed: 0.2, alive });
  const make = (cursor: number, fs: readonly Fish[], poiLeft = 4): KingyoState => ({
    id: "kingyo",
    cursor,
    fish: fs,
    poiLeft,
    caught: 0,
  });

  it("初期ポイは複数回分・金魚が複数泳ぐ", () => {
    const s = initMinigame("kingyo") as KingyoState;
    expect(s.poiLeft).toBeGreaterThan(1);
    expect(s.fish.length).toBeGreaterThan(1);
  });

  it("カーソル付近の金魚を掬える", () => {
    const r = commitMinigame(make(0.5, [fish(0.2), fish(0.5)]), () => 0);
    const after = r.state as KingyoState;
    expect(r.hit).toBe(true);
    expect(after.caught).toBe(1);
    expect(after.poiLeft).toBe(3);
    expect(after.fish[1]?.alive).toBe(false);
    expect(prizeOf(after)).toBe("goldfish");
  });

  it("外すとポイだけ減る", () => {
    const r = commitMinigame(make(0.0, [fish(0.6)]), () => 0);
    expect(r.hit).toBe(false);
    expect((r.state as KingyoState).poiLeft).toBe(3);
    expect(prizeOf(r.state)).toBeUndefined();
  });

  it("ポイが尽きたら終了。さらに決定しても何も起きない", () => {
    const done = make(0.5, [fish(0.5)], 0);
    expect(isFinished(done)).toBe(true);
    const r = commitMinigame(done, () => 0);
    expect(r.state).toBe(done);
    expect(r.hit).toBe(false);
  });

  it("step で金魚が泳ぎ、端で反転する", () => {
    const near = make(0.5, [{ x: 0.94, y: 0.5, dir: 1, speed: 0.5, alive: true }]);
    const stepped = stepMinigame(near, 0.1) as KingyoState;
    expect(stepped.fish[0]?.dir).toBe(-1);
  });
});

describe("射的", () => {
  const target = (x: number, alive = true): Target => ({ x, alive });
  const make = (cursor: number, targets: readonly Target[], shotsLeft = 6): ShatekiState => ({
    id: "shateki",
    cursor,
    shotsLeft,
    targets,
    hits: 0,
  });

  it("照準下の景品を撃つと倒れる", () => {
    const r = commitMinigame(make(0.5, [target(0.2), target(0.5), target(0.8)]), () => 0);
    const after = r.state as ShatekiState;
    expect(r.hit).toBe(true);
    expect(after.hits).toBe(1);
    expect(after.targets[1]?.alive).toBe(false);
    expect(after.shotsLeft).toBe(5);
  });

  it("狙いが外れていると弾だけ減る", () => {
    const r = commitMinigame(make(0.0, [target(0.5)]), () => 0);
    expect(r.hit).toBe(false);
    expect((r.state as ShatekiState).shotsLeft).toBe(5);
  });

  it("弾切れか全撃破で終了。命中で景品を持ち帰る", () => {
    expect(isFinished(make(0.5, [target(0.5)], 0))).toBe(true);
    expect(isFinished(make(0.5, [target(0.5, false)]))).toBe(true);
    expect(prizeOf({ ...make(0.5, [target(0.5)]), hits: 1 })).toBe("shateki-prize");
    expect(prizeOf(make(0.5, [target(0.5)]))).toBeUndefined();
  });

  it("step は ←→ 入力でだけ照準が動く", () => {
    const s = make(0.3, [target(0.2)]);
    expect(stepMinigame(s, 0.02, 0)).toBe(s);
    expect((stepMinigame(s, 0.1, 1) as ShatekiState).cursor).toBeGreaterThan(0.3);
  });
});

describe("千本引き", () => {
  it("引くと当たり/はずれが確定し、当たりは景品を持ち帰る", () => {
    const s = initMinigame("senbiki") as SenbikiState;
    const win = pullString(s, () => 0); // 大当たり
    expect(win.result).toBe("大当たり");
    expect(isFinished(win)).toBe(true);
    expect(prizeOf(win)).toBe("senbiki-prize");
    const lose = pullString(s, () => 0.9); // はずれ
    expect(lose.result).toBe("はずれ");
    expect(prizeOf(lose)).toBeUndefined();
  });

  it("選択済みなら二度引けない", () => {
    const picked = pullString(initMinigame("senbiki") as SenbikiState, () => 0);
    expect(pullString(picked, () => 0.9)).toBe(picked);
  });

  it("commit は当たりで hit、はずれで miss", () => {
    const s = initMinigame("senbiki") as SenbikiState;
    expect(commitMinigame(s, () => 0).hit).toBe(true);
    expect(commitMinigame(s, () => 0.9).hit).toBe(false);
  });
});

describe("モグラたたき", () => {
  const make = (cursor: number, moles: MoguraState["moles"], triesLeft = 10): MoguraState => ({
    id: "mogura",
    cursor,
    moles,
    triesLeft,
    hits: 0,
  });

  it("ハンマー直下の出ているモグラを叩ける", () => {
    const r = commitMinigame(
      make(0.38, [
        { x: 0.15, up: false, timer: 1 },
        { x: 0.38, up: true, timer: 1 },
      ]),
      () => 0,
    );
    const after = r.state as MoguraState;
    expect(r.hit).toBe(true);
    expect(after.hits).toBe(1);
    expect(after.triesLeft).toBe(9);
    expect(after.moles[1]?.up).toBe(false);
  });

  it("隠れているモグラは叩けない", () => {
    const r = commitMinigame(make(0.38, [{ x: 0.38, up: false, timer: 1 }]), () => 0);
    expect(r.hit).toBe(false);
  });

  it("ハンマー切れで終了。2 匹以上で景品を持ち帰る", () => {
    expect(isFinished(make(0.38, [{ x: 0.38, up: true, timer: 1 }], 0))).toBe(true);
    expect(prizeOf({ ...make(0.38, []), hits: 2 })).toBe("mogura-prize");
    expect(prizeOf({ ...make(0.38, []), hits: 1 })).toBeUndefined();
  });

  it("step でカーソルが動き、モグラが出没する", () => {
    const s = make(0.2, [{ x: 0.38, up: true, timer: 0.01 }]);
    const stepped = stepMinigame(s, 0.02, 1) as MoguraState;
    expect(stepped.moles[0]?.up).toBe(false);
    expect(stepped.cursor).toBeGreaterThan(0.2);
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

  it("commit は新たに印が付けば hit", () => {
    const s = initMinigame("bingo") as BingoState;
    expect(commitMinigame(s, () => 0).hit).toBe(true);
  });
});

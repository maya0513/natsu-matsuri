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
  BINGO_CENTER,
  BINGO_DRAWS,
  BINGO_FREE,
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
    { x: 0.2, baseY: 0.4, phase: 0, kind: 0, size: 1, alive: true },
    { x: 0.5, baseY: 0.4, phase: 0, kind: 1, size: 1, alive: true },
    { x: 0.8, baseY: 0.4, phase: 0, kind: 2, size: 1, alive: true },
  ];
  const make = (cursor: number, bs: YoyoState["balloons"], triesLeft = 4): YoyoState => ({
    id: "yoyo",
    cursor,
    balloons: bs,
    triesLeft,
    caught: 0,
  });

  it("カーソル直下の風船を掬うと 1 つで即終了（成功したら終わり）", () => {
    const r = commitMinigame(make(0.5, balloons()), () => 0);
    const after = r.state as YoyoState;
    expect(r.hit).toBe(true);
    expect(after.caught).toBe(1);
    expect(after.balloons[1]?.alive).toBe(false);
    expect(isFinished(after)).toBe(true); // 1 つ釣れたら終了
  });

  it("どの風船からも遠いと失敗してこよりだけ減る", () => {
    const r = commitMinigame(make(0.0, balloons()), () => 0);
    expect(r.hit).toBe(false);
    expect((r.state as YoyoState).triesLeft).toBe(3);
    expect(isFinished(r.state)).toBe(false); // まだ釣れていないので続行
  });

  it("こよりが尽きれば終了。捕獲数で風船を持ち帰る", () => {
    expect(isFinished(make(0.5, balloons(), 0))).toBe(true);
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
  const fish = (x: number, alive = true): Fish => ({
    x,
    y: 0.5,
    vx: 0.1,
    vy: 0,
    phase: 0,
    alive,
  });
  // ポイは縦横で狙う。テストは cursorY=0.5（金魚の y と同じ）で揃える
  const make = (cursor: number, fs: readonly Fish[], poiLeft = 4): KingyoState => ({
    id: "kingyo",
    cursor,
    cursorY: 0.5,
    fish: fs,
    poiLeft,
    caught: 0,
  });

  it("初期は金魚 5 匹・ポイ 2 回", () => {
    const s = initMinigame("kingyo") as KingyoState;
    expect(s.poiLeft).toBe(2);
    expect(s.fish.length).toBe(5);
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

  it("step で金魚が不規則に泳ぎ、壁で跳ね返る", () => {
    const near = make(0.5, [{ x: 0.89, y: 0.5, vx: 0.5, vy: 0, phase: 0, alive: true }]);
    const stepped = stepMinigame(near, 0.1) as KingyoState;
    const f = stepped.fish[0];
    expect(f?.x ?? 1).toBeLessThanOrEqual(0.9); // 範囲内にクランプ
    expect(f?.vx ?? 0).toBeLessThan(0); // 右端で速度が反転
  });
});

describe("射的", () => {
  // 既定は下段（y=0.2）。照準も cursorY=0.2 で揃える
  const target = (x: number, alive = true, y = 0.2): Target => ({ x, y, alive });
  const make = (cursor: number, targets: readonly Target[], shotsLeft = 6): ShatekiState => ({
    id: "shateki",
    cursor,
    cursorY: 0.2,
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

  it("十字キーで照準が縦横に動く（上段も狙える）", () => {
    const targets = [target(0.5, true, 0.2), target(0.5, true, 0.8)];
    // 下段狙い → 下段の的が倒れる
    const low = commitMinigame(make(0.5, targets), () => 0);
    expect((low.state as ShatekiState).targets[0]?.alive).toBe(false);
    expect((low.state as ShatekiState).targets[1]?.alive).toBe(true);
    // 照準を上へ（move.y 負）→ cursorY が上がって上段を狙える
    let s: ShatekiState = make(0.5, targets);
    for (let k = 0; k < 60; k++) s = stepMinigame(s, 1 / 60, 0, -1) as ShatekiState;
    expect(s.cursorY).toBeGreaterThan(0.6);
    const hi = commitMinigame(s, () => 0);
    expect((hi.state as ShatekiState).targets[1]?.alive).toBe(false);
  });

  it("入力がなければ照準は動かない（同一参照）", () => {
    const s = make(0.3, [target(0.2)]);
    expect(stepMinigame(s, 0.02, 0, 0)).toBe(s);
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

  it("ハンマー直下の出ているモグラを叩くと目が×（stunned）になる", () => {
    const r = commitMinigame(
      make(0.38, [
        { x: 0.15, up: false, timer: 1, stunned: 0 },
        { x: 0.38, up: true, timer: 1, stunned: 0 },
      ]),
      () => 0,
    );
    const after = r.state as MoguraState;
    expect(r.hit).toBe(true);
    expect(after.hits).toBe(1);
    expect(after.triesLeft).toBe(9);
    // 叩いた直後は出たまま（×目で固まる）。引っ込むのは時間が経ってから
    expect(after.moles[1]?.up).toBe(true);
    expect(after.moles[1]?.stunned ?? 0).toBeGreaterThan(0);
  });

  it("隠れているモグラ・既に叩いたモグラは叩けない", () => {
    expect(commitMinigame(make(0.38, [{ x: 0.38, up: false, timer: 1, stunned: 0 }]), () => 0).hit).toBe(
      false,
    );
    expect(
      commitMinigame(make(0.38, [{ x: 0.38, up: true, timer: 1, stunned: 0.3 }]), () => 0).hit,
    ).toBe(false);
  });

  it("stunned が切れるとモグラは引っ込む", () => {
    const s = make(0.5, [{ x: 0.38, up: true, timer: 1, stunned: 0.05 }]);
    const stepped = stepMinigame(s, 0.1) as MoguraState;
    expect(stepped.moles[0]?.up).toBe(false);
    expect(stepped.moles[0]?.stunned).toBe(0);
  });

  it("ハンマー切れで終了。2 匹以上で景品を持ち帰る", () => {
    expect(isFinished(make(0.38, [{ x: 0.38, up: true, timer: 1, stunned: 0 }], 0))).toBe(true);
    expect(prizeOf({ ...make(0.38, []), hits: 2 })).toBe("mogura-prize");
    expect(prizeOf({ ...make(0.38, []), hits: 1 })).toBeUndefined();
  });

  it("step でカーソルが動き、モグラが出没する", () => {
    const s = make(0.2, [{ x: 0.38, up: true, timer: 0.01, stunned: 0 }]);
    const stepped = stepMinigame(s, 0.02, 1) as MoguraState;
    expect(stepped.moles[0]?.up).toBe(false);
    expect(stepped.cursor).toBeGreaterThan(0.2);
  });
});

describe("ビンゴ（5×5・中央フリー・1〜100）", () => {
  /** 既知のカードを直接組む（init は rng でランダムなため検証用） */
  const card25 = (vals: readonly number[]): BingoState => ({
    id: "bingo",
    card: vals,
    marked: vals.map((_, i) => i === BINGO_CENTER),
    drawn: [],
    bingo: false,
  });
  const fill = (f: (i: number) => number): number[] =>
    Array.from({ length: 25 }, (_, i) => (i === BINGO_CENTER ? BINGO_FREE : f(i)));
  /** 決まった値を順に返す rng */
  const seqOf = (arr: readonly number[]): (() => number) => {
    let i = 0;
    return () => arr[i++ % arr.length] ?? 0;
  };
  /** 決定的な擬似乱数（カード生成のユニーク性検証用） */
  const lcg = (seed = 1): (() => number) => {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  };

  it("初期カードは 5×5・中央フリー（最初から印）・各マス 1〜100 のユニーク", () => {
    const s = initMinigame("bingo", lcg(7)) as BingoState;
    expect(s.card.length).toBe(25);
    expect(s.card[BINGO_CENTER]).toBe(BINGO_FREE);
    expect(s.marked[BINGO_CENTER]).toBe(true);
    const nums = s.card.filter((_, i) => i !== BINGO_CENTER);
    for (const n of nums) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(100);
    }
    expect(new Set(nums).size).toBe(24); // 重複なし
  });

  it("カードの未マーク数字を引くと印が付く（当たりやすいバイアス）", () => {
    const vals = fill((i) => i + 1); // 1..25 相当（中央は -1）
    const before = card25(vals);
    const after = drawBall(before, seqOf([0.1, 0])); // bias 命中 → 先頭の未マーク数字
    expect(after.lastBall).toBe(vals[0]);
    expect(after.marked[0]).toBe(true);
  });

  it("最後の 1 マスが埋まるとビンゴになり、景品を持ち帰る", () => {
    const vals = fill((i) => i + 7); // 7..31 のユニーク
    // 上段の 0,1,2,3 を既にマーク（中央含む）。残るは index4
    const marked = vals.map((_, i) => i === BINGO_CENTER || i < 4);
    const s: BingoState = { id: "bingo", card: vals, marked, drawn: [], bingo: false };
    const after = drawBall(s, seqOf([0.1, 0])); // 先頭の未マーク = index4 の値
    expect(after.lastBall).toBe(vals[4]);
    expect(after.bingo).toBe(true);
    expect(isFinished(after)).toBe(true);
    expect(prizeOf(after)).toBe("bingo-prize");
  });

  it("玉を引ける回数を使い切ると終了", () => {
    let s = card25(fill((i) => i + 1));
    // bias を外して（rng>=0.7）カードに無い数字ばかり引く → 揃わない
    for (let k = 0; k < BINGO_DRAWS; k++) s = drawBall(s, seqOf([0.99, 0]));
    expect(s.drawn.length).toBe(BINGO_DRAWS);
    expect(s.bingo).toBe(false);
    expect(isFinished(s)).toBe(true);
  });

  it("commit は新たに印が付けば hit", () => {
    expect(commitMinigame(card25(fill((i) => i + 1)), seqOf([0.1, 0])).hit).toBe(true);
  });
});

describe("クリック/タッチで対象を直接指定（commit の target）", () => {
  it("kingyo: カーソルから遠い金魚も target 指定で掬える", () => {
    const fish = (x: number, y: number): Fish => ({ x, y, vx: 0.1, vy: 0, phase: 0, alive: true });
    const s: KingyoState = {
      id: "kingyo",
      cursor: 0.0,
      cursorY: 0.0,
      fish: [fish(0.2, 0.3), fish(0.85, 0.8)],
      poiLeft: 3,
      caught: 0,
    };
    const r = commitMinigame(s, () => 0, 1); // 遠い金魚を直接指定（縦横ともスナップ）
    expect(r.hit).toBe(true);
    expect((r.state as KingyoState).fish[1]?.alive).toBe(false);
  });

  it("kuji: target の札を引く（カーソル位置に依らない）", () => {
    const k = initMinigame("kuji") as KujiState; // count 9, cursor 0.5
    const r = commitMinigame(k, () => 0, 8);
    expect((r.state as KujiState).picked).toBe(8);
  });

  it("mogura: 引っ込んでいる穴を指定すると外れ", () => {
    const s: MoguraState = {
      id: "mogura",
      cursor: 0.5,
      moles: [
        { x: 0.15, up: false, timer: 1, stunned: 0 },
        { x: 0.85, up: true, timer: 1, stunned: 0 },
      ],
      triesLeft: 5,
      hits: 0,
    };
    expect(commitMinigame(s, () => 0, 0).hit).toBe(false); // 0 番は up=false
    expect(commitMinigame(s, () => 0, 1).hit).toBe(true); // 1 番は up=true
  });
});

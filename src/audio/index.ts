// 音の再生管理（howler.js）。音源は全て tools/assets で合成した WAV
import { Howl } from "howler";
import { AUDIO, type SeName } from "../assets/meta";

export type GameAudio = {
  /** 初回のユーザー操作後に呼ぶ（autoplay 制限対応）。SE の再生を解禁する */
  readonly start: () => void;
  readonly play: (se: SeName) => void;
  /**
   * 効果音（花火・屋台）のオン/オフを切り替える。既定はオフ。
   * 常時ループする BGM は鳴らさない方針。@returns 切替後にオンか
   */
  readonly toggleSound: () => boolean;
};

export const createAudio = (): GameAudio => {
  // BGM（祭囃子）は常時ループで耳に付くため再生しない。SE のみ扱う。
  // 静かで淡々とした世界観に合わせ、SE は控えめな音量に
  const ses: Record<SeName, Howl> = {
    launch: new Howl({ src: [AUDIO.launch], volume: 0.4 }),
    burst: new Howl({ src: [AUDIO.burst], volume: 0.45 }),
    hit: new Howl({ src: [AUDIO.hit], volume: 0.45 }),
    miss: new Howl({ src: [AUDIO.miss], volume: 0.4 }),
    buy: new Howl({ src: [AUDIO.buy], volume: 0.45 }),
  };

  let started = false;
  let soundOn = false; // 音は既定で無効（ユーザーが任意で有効化する）

  return {
    start: () => {
      // autoplay 制限の解禁のみ。実際に鳴らすかは soundOn で判定する
      started = true;
    },
    play: (se) => {
      if (started && soundOn) ses[se].play();
    },
    toggleSound: () => {
      soundOn = !soundOn;
      return soundOn;
    },
  };
};

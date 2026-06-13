// 音の再生管理（howler.js）。音源は全て tools/assets で合成した WAV
import { Howl } from "howler";
import { AUDIO, type SeName } from "../assets/meta";

export type GameAudio = {
  /** 初回のユーザー操作後に呼ぶ（autoplay 制限対応）。SE の再生を解禁する */
  readonly start: () => void;
  readonly play: (se: SeName) => void;
  /** BGM（祭囃子）の再生/停止を切り替える。既定は停止。@returns 切替後に再生中か */
  readonly toggleBgm: () => boolean;
};

export const createAudio = (): GameAudio => {
  const bgm = new Howl({ src: [AUDIO.bgm], loop: true, volume: 0.4 });
  const ses: Record<SeName, Howl> = {
    launch: new Howl({ src: [AUDIO.launch], volume: 0.5 }),
    burst: new Howl({ src: [AUDIO.burst], volume: 0.7 }),
    hit: new Howl({ src: [AUDIO.hit], volume: 0.6 }),
    miss: new Howl({ src: [AUDIO.miss], volume: 0.5 }),
    buy: new Howl({ src: [AUDIO.buy], volume: 0.6 }),
  };

  let started = false;
  let bgmOn = false; // 音楽は既定で無効（ユーザーが任意で有効化する）

  return {
    start: () => {
      // SE を解禁するだけ。BGM は自動再生しない（既定で無効）
      started = true;
    },
    play: (se) => {
      if (started) ses[se].play();
    },
    toggleBgm: () => {
      bgmOn = !bgmOn;
      if (bgmOn) bgm.play();
      else bgm.pause();
      return bgmOn;
    },
  };
};

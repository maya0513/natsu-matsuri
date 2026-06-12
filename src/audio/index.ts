// 音の再生管理（howler.js）。音源は全て tools/assets で合成した WAV
import { Howl, Howler } from "howler";
import { AUDIO, type SeName } from "../assets/meta";

export type GameAudio = {
  /** 初回のユーザー操作後に呼ぶ（autoplay 制限対応） */
  readonly start: () => void;
  readonly play: (se: SeName) => void;
  /** @returns ミュート後の状態 */
  readonly toggleMute: () => boolean;
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
  let muted = false;

  return {
    start: () => {
      if (started) return;
      started = true;
      bgm.play();
    },
    play: (se) => {
      if (started) ses[se].play();
    },
    toggleMute: () => {
      muted = !muted;
      Howler.mute(muted);
      return muted;
    },
  };
};

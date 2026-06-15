// 生成 PNG のローダ。ドット絵なので NearestFilter 固定
import * as THREE from "three";
import {
  GHOST_TEXTURE,
  GROUND_TILE_TEXTURE,
  HELD_SHEET,
  LANTERN_TEXTURE,
  MINIGAME_SHEET,
  NPC_SHEET,
  PATH_TILE_TEXTURE,
  PLAYER_SHEET,
  SHINBOKU_TEXTURE,
  SHRINE_TEXTURE,
  STALL_SHEET,
  STONE_LANTERN_TEXTURE,
  TORII_TEXTURE,
  TREE_SHEET,
  YAGURA_TEXTURE,
} from "../assets/meta";

export type GameTextures = {
  readonly player: THREE.Texture;
  readonly npc: THREE.Texture;
  readonly stalls: THREE.Texture;
  readonly held: THREE.Texture;
  readonly minigame: THREE.Texture;
  readonly torii: THREE.Texture;
  readonly shrine: THREE.Texture;
  readonly yagura: THREE.Texture;
  readonly lantern: THREE.Texture;
  readonly stoneLantern: THREE.Texture;
  readonly ghost: THREE.Texture;
  readonly shinboku: THREE.Texture;
  readonly trees: THREE.Texture;
  readonly tilePath: THREE.Texture;
  readonly tileGround: THREE.Texture;
};

const load = (loader: THREE.TextureLoader, url: string): Promise<THREE.Texture> =>
  loader.loadAsync(url).then((tex) => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });

export const loadGameTextures = async (): Promise<GameTextures> => {
  const loader = new THREE.TextureLoader();
  const [
    player,
    npc,
    stalls,
    held,
    minigame,
    torii,
    shrine,
    yagura,
    lantern,
    stoneLantern,
    ghost,
    shinboku,
    trees,
    tilePath,
    tileGround,
  ] = await Promise.all([
    load(loader, PLAYER_SHEET.url),
    load(loader, NPC_SHEET.url),
    load(loader, STALL_SHEET.url),
    load(loader, HELD_SHEET.url),
    load(loader, MINIGAME_SHEET.url),
    load(loader, TORII_TEXTURE.url),
    load(loader, SHRINE_TEXTURE.url),
    load(loader, YAGURA_TEXTURE.url),
    load(loader, LANTERN_TEXTURE.url),
    load(loader, STONE_LANTERN_TEXTURE.url),
    load(loader, GHOST_TEXTURE.url),
    load(loader, SHINBOKU_TEXTURE.url),
    load(loader, TREE_SHEET.url),
    load(loader, PATH_TILE_TEXTURE.url),
    load(loader, GROUND_TILE_TEXTURE.url),
  ]);
  return {
    player,
    npc,
    stalls,
    held,
    minigame,
    torii,
    shrine,
    yagura,
    lantern,
    stoneLantern,
    ghost,
    shinboku,
    trees,
    tilePath,
    tileGround,
  };
};

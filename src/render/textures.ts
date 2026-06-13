// 生成 PNG のローダ。ドット絵なので NearestFilter 固定
import * as THREE from "three";
import {
  GROUND_TILE_TEXTURE,
  HELD_SHEET,
  LANTERN_TEXTURE,
  PATH_TILE_TEXTURE,
  PLAYER_SHEET,
  SHRINE_TEXTURE,
  STALL_SHEET,
  TORII_TEXTURE,
} from "../assets/meta";

export type GameTextures = {
  readonly player: THREE.Texture;
  readonly stalls: THREE.Texture;
  readonly held: THREE.Texture;
  readonly torii: THREE.Texture;
  readonly shrine: THREE.Texture;
  readonly lantern: THREE.Texture;
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
  const [player, stalls, held, torii, shrine, lantern, tilePath, tileGround] = await Promise.all([
    load(loader, PLAYER_SHEET.url),
    load(loader, STALL_SHEET.url),
    load(loader, HELD_SHEET.url),
    load(loader, TORII_TEXTURE.url),
    load(loader, SHRINE_TEXTURE.url),
    load(loader, LANTERN_TEXTURE.url),
    load(loader, PATH_TILE_TEXTURE.url),
    load(loader, GROUND_TILE_TEXTURE.url),
  ]);
  return { player, stalls, held, torii, shrine, lantern, tilePath, tileGround };
};

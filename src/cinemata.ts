import needle from "needle";
import type { Cache } from "./cache.js";

const CINEMATA_BASE_URL = "https://v3-cinemeta.strem.io/meta";

export enum MediaType {
  Movie = "movie",
  Series = "series",
}

export interface MediaMeta {
  name: string;
  seasons?: string;
  date: string;
}

class Cinemata {
  private cache: Cache;

  constructor(cache: Cache) {
    this.cache = cache;
  }

  public async query(id: string, type: MediaType): Promise<MediaMeta | null> {
    const cacheKey = `cinemata.media.meta.${id}`;
    let meta: MediaMeta | null;

    try {
      if ((meta = await this.cache.get(cacheKey)) !== null) return meta;
    } catch (error: any) {
      console.warn(`Failed to query cached Cinemata media meta: ${error}`);
    }

    let response = await needle(
      "get",
      `${CINEMATA_BASE_URL}/${type as string}/${id}.json`,
    );
    if (response.body.meta === undefined) return null;

    meta = {
      name: response.body.meta.name,
      date: response.body.meta.releaseInfo,
    };
    if (type === MediaType.Series) {
      const videos: { season: number }[] = response.body.meta.videos;
      meta.seasons = videos[videos.length - 1].season!.toString();
    }

    try {
      await this.cache.set(cacheKey, meta);
    } catch (error: any) {
      console.warn(`Failed to cache Cinemata media meta: ${error}`);
    }

    return meta;
  }
}

export interface CinemataSearcher {
  query(id: string, type: MediaType): Promise<MediaMeta | null>;
}

export function createCinemataSearcher(cache: Cache): CinemataSearcher {
  return new Cinemata(cache);
}

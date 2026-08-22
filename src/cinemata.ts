import needle from "needle";

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

export async function findTitle(
  id: string,
  type: MediaType,
): Promise<MediaMeta | null> {
  if (id.match(/^tt\d+$/) === null) throw new Error("invalid id format");

  let response = await needle(
    "get",
    `${CINEMATA_BASE_URL}/${type as string}/${id}.json`,
  );
  if (response.body.meta === undefined) return null;

  const meta: MediaMeta = {
    name: response.body.meta.name,
    date: response.body.meta.releaseInfo,
  };
  if (type === MediaType.Series) {
    const videos: { season: number }[] = response.body.meta.videos;
    meta.seasons = videos[videos.length - 1].season!.toString();
  }

  return meta;
}

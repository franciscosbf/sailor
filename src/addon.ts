import { manifest } from "./manifest.js";
import {
  type AddonInterface,
  type DefaultConfig,
  type StreamHandlerArgs,
  type WithCache,
} from "@stremio-addon/sdk";
import { AddonBuilder } from "@stremio-addon/zod";
import {
  ContentType,
  Provider,
  StreamQuality,
  SortBy,
  type Content,
  type Stream,
  type TorrentBay,
} from "./bay.js";
import {
  type CinemataSearcher,
  MediaType,
  type MediaMeta,
} from "./cinemata.js";
import type { StreamSchema } from "@stremio-addon/zod";
import { toS00Format } from "./util.js";

function streamHandler(
  cinemata: CinemataSearcher,
  bay: TorrentBay,
): (args: StreamHandlerArgs<DefaultConfig>) => Promise<
  WithCache<{
    streams: StreamSchema[];
  }>
> {
  const empty: { streams: StreamSchema[] } = { streams: [] };

  return async (args) => {
    if (args.type !== "movie" && args.type !== "series") return empty;

    let providers = new Set(Object.keys(Provider) as Provider[]);
    let sortBy = SortBy.Seeders;
    const config = args.config;
    if (config !== undefined) {
      if (config.removeTorrentProject !== undefined)
        providers.delete(Provider.TorrentProject);
      if (config.removeThePirateBay !== undefined)
        providers.delete(Provider.TorrentProject);

      if (providers.size === 0) return empty;

      switch (config.sort) {
        case "Seeders":
          sortBy = SortBy.Seeders;
          break;
        case "Quality":
          sortBy = SortBy.Quality;
          break;
        case "QualityThenSeeders":
          sortBy = SortBy.QualityThenSeeders;
          break;
        case "SeedersThenQuality":
          sortBy = SortBy.SeedersThenQuality;
          break;
      }
    }

    const matches = args.id.match(
      /^(?<id>tt\d+)(:(?<season>\d+):(?<episode>\d+))?$/,
    );
    if (matches === null) return empty;
    const mgroups = matches.groups! as {
      id: string;
      season: string;
      episode: string;
    };

    const id = mgroups.id;
    const mediaType =
      mgroups.season === undefined ? MediaType.Movie : MediaType.Series;
    if (mediaType !== args.type) return empty;

    let mediaMeta: MediaMeta | null;
    try {
      mediaMeta = await cinemata.query(id, mediaType);
    } catch (error: any) {
      console.warn(`Failed to search Cinemeta: ${error.message}`);

      return empty;
    }
    if (mediaMeta === null) return empty;
    const name = mediaMeta.name;

    const queries = [];
    let content: Content;
    if (mediaType == MediaType.Movie) {
      queries.push(`${name} ${mediaMeta.date}`);
      content = { type: ContentType.Movie };
    } else {
      const s00ed = toS00Format(mgroups.season);
      queries.push(`${name} ${s00ed}`);
      if (mediaMeta.seasons !== undefined)
        queries.push(`${name} S01-${toS00Format(mediaMeta.seasons)}`);
      content = {
        type: ContentType.Series,
        season: mgroups.season,
        episode: mgroups.episode,
        seasons: mediaMeta.seasons,
      };
    }

    const searches = queries.map((query) =>
      bay.search({
        query,
        content,
        providers: [...providers],
        sortBy,
      }),
    );

    let streams: Stream[];
    try {
      streams = [...new Set((await Promise.all(searches)).flat())];
    } catch (error: any) {
      console.warn(`Failed to search for available torrents: ${error.message}`);

      return empty;
    }

    let streamSchemas: StreamSchema[] = streams.map((stream) => {
      let quality: string;
      switch (stream.quality) {
        case StreamQuality.Q720p:
          quality = "720p";
          break;
        case StreamQuality.Q1080p:
          quality = "1080p";
          break;
        case StreamQuality.Q4k:
          quality = "4k";
          break;
      }

      return {
        infoHash: stream.infoHash,
        fileIdx: stream.fileIdx,
        name: quality,
        description: stream.name,
        sources: stream.announce,
      };
    });

    return { streams: streamSchemas };
  };
}

export function buildAddonInterface(
  cinemata: CinemataSearcher,
  bay: TorrentBay,
): AddonInterface {
  const builder = new AddonBuilder(manifest);

  return builder
    .defineStreamHandler(streamHandler(cinemata, bay))
    .getInterface();
}

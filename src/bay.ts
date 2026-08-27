import TorrentSearchApi, {
  type TorrentProvider,
  type TorrentMeta,
} from "torrent-search-api";
import WebTorrent from "webtorrent";
import { decode as decodeMagnetURL } from "magnet-uri";
import { toE00Format, toS00E00Format, toS00Format } from "./util.js";
import { type Cache } from "./cache.js";

TorrentSearchApi.enablePublicProviders();

export enum ContentType {
  Movie,
  Series,
}

export interface MovieContent {
  type: ContentType.Movie;
  name: string;
}

export interface SeriesContent {
  type: ContentType.Series;
  name: string;
  season: string;
  episode: string;
  seasons?: string;
}

export type Content = MovieContent | SeriesContent;

const PROVIDER_NAMES_MAPPING = {
  TorrentProject: "TorrentProject",
  ThePirateBay: "ThePirateBay",
  LimeTorrents: "Limetorrents",
} as const;

export type ProviderName = keyof typeof PROVIDER_NAMES_MAPPING;

type ApiProviderName = (typeof PROVIDER_NAMES_MAPPING)[ProviderName];

export const PROVIDER_NAMES: Readonly<ProviderName[]> = Object.keys(
  PROVIDER_NAMES_MAPPING,
) as ProviderName[];

export enum SortBy {
  Seeders,
  Quality,
  SeedersThenQuality,
  QualityThenSeeders,
}

export interface SearchParameters {
  queries: string[];
  content: Content;
  providers: ProviderName[];
  sortBy: SortBy;
}

export enum StreamQuality {
  Q720p,
  Q1080p,
  Q4k,
}

interface TorrentFile {
  name: string;
  fileIdx: number;
  quality: StreamQuality;
  size: number;
}

interface TorrentFileInfo extends TorrentMeta, TorrentFile {
  infoHash: string;
  announce: string[];
}

export interface Stream {
  name: string;
  fileIdx: number;
  infoHash: string;
  quality: StreamQuality;
  announce: string[];
  size: number;
  seeds: number;
}

interface Torrent {
  announce: string[];
  files: { name: string; length: number }[];
}

function decodeQuality(raw: string): StreamQuality | undefined {
  switch (raw.toLowerCase()) {
    case "720p":
      return StreamQuality.Q720p;
    case "1080p":
    case "hdtv":
      return StreamQuality.Q1080p;
    case "2160p":
      return StreamQuality.Q4k;
  }
}

function parseCategory(provider: TorrentProvider, type: ContentType): string {
  let category = "All";

  switch (provider.name) {
    case PROVIDER_NAMES_MAPPING.ThePirateBay:
      category = "Video";
      break;
    case PROVIDER_NAMES_MAPPING.LimeTorrents:
      switch (type) {
        case ContentType.Movie:
          category = "Movies";
          break;
        case ContentType.Series:
          category = "TV";
          break;
      }
      break;
  }

  return category;
}

function buildTorrentTitleFilter(content: Content): (title: string) => boolean {
  const nonAlphaRegex = /[^a-z0-9]/i;
  const nameChars = [];
  let pcharAlpha = true;
  for (let i = 0; i < content.name.length; i++) {
    const cchar = content.name.charAt(i);
    if (nonAlphaRegex.test(cchar)) {
      if (pcharAlpha) nameChars.push("[^a-z]*");
      pcharAlpha = false;
    } else {
      nameChars.push(cchar);
      pcharAlpha = true;
    }
  }
  const name = nameChars.join("");

  let subPattern: string;
  switch (content.type) {
    case ContentType.Series:
      const s00ed = toS00Format(content.season);
      const e00ed = toE00Format(content.episode);
      let possibilities = `${s00ed} ?${e00ed}|${s00ed}[^e]{1}`;
      if (content.seasons !== undefined) {
        const s00ed = toS00Format(content.seasons);
        possibilities += `|S01-${s00ed}`;
      }
      subPattern = `${name}.*(${possibilities})`;
      break;
    default:
      subPattern = name;
      break;
  }

  return (title) => new RegExp(`^${subPattern}`, "i").test(title);
}

function buildTorrentMetaFilter(
  content: Content,
): (torrentMeta: TorrentMeta) => boolean {
  const desiredTorrentTitle = buildTorrentTitleFilter(content);

  return (torrentMeta) =>
    desiredTorrentTitle(torrentMeta.title) && torrentMeta.seeds > 0;
}

function findTorrentFile(
  content: Content,
  torrent: Torrent,
): TorrentFile | undefined {
  const files = torrent.files;
  let regex: RegExp;

  switch (content.type) {
    case ContentType.Movie:
      regex = /.*(?<quality>(720p|1080p|2160p|HDTV)).*\.(mp4|mkv)$/i;
      break;
    case ContentType.Series:
      const s00e00ed = toS00E00Format(content.season, content.episode);
      regex = new RegExp(
        `.*(${s00e00ed}.*(?<quality>(720p|1080p|2160p|HDTV))|(?<quality>(720p|1080p|2160p|HDTV)).*${s00e00ed}).*\\.(mp4|mkv)$`,
        "i",
      );
      break;
    default:
      return;
  }

  for (let i = 0; i < files.length; i++) {
    const matches = files[i].name.match(regex);
    if (matches === null) continue;

    return {
      name: files[i].name,
      fileIdx: i,
      quality: decodeQuality(matches.groups!.quality)!,
      size: files[i].length,
    };
  }
}

function sortBySeeders(tfi1: TorrentFileInfo, tfi2: TorrentFileInfo): number {
  return tfi2.seeds - tfi1.seeds;
}

function sortByQuality(tfi1: TorrentFileInfo, tfi2: TorrentFileInfo): number {
  return tfi2.quality - tfi1.quality;
}

function sortBySeedersThenQuality(
  t1: TorrentFileInfo,
  t2: TorrentFileInfo,
): number {
  const diff = sortBySeeders(t1, t2);
  return diff === 0 ? sortByQuality(t1, t2) : diff;
}

function sortByQualityThenSeeders(
  t1: TorrentFileInfo,
  t2: TorrentFileInfo,
): number {
  const diff = sortByQuality(t1, t2);
  return diff === 0 ? sortBySeeders(t1, t2) : diff;
}

function sortTorrentFilesInfo(
  sortBy: SortBy,
  torrentFilesInfo: TorrentFileInfo[],
): TorrentFileInfo[] {
  let sorter: (t1: TorrentFileInfo, t2: TorrentFileInfo) => number;

  switch (sortBy) {
    case SortBy.Seeders:
      sorter = sortBySeeders;
      break;
    case SortBy.Quality:
      sorter = sortByQuality;
      break;
    case SortBy.SeedersThenQuality:
      sorter = sortBySeedersThenQuality;
      break;
    case SortBy.QualityThenSeeders:
      sorter = sortByQualityThenSeeders;
      break;
  }

  return torrentFilesInfo.sort(sorter);
}

export interface BayOptions {
  searhLimitPerProvider: number;
  searchTimeout: number;
  cache: Cache;
  ttlPerTorrent: number;
}

class Bay {
  private providers: Map<ApiProviderName, TorrentProvider>;
  private webtorrent: WebTorrent.Instance;
  private inflightSearches: Map<string, Promise<TorrentFileInfo | null>>;
  private searhLimit: number;
  private searchTimeout: number;
  private cache: Cache;
  private ttlPerValidTorrent: number;

  constructor(options: BayOptions) {
    const providerApiNames = new Set(Object.values(PROVIDER_NAMES_MAPPING));
    this.providers = new Map(
      TorrentSearchApi.providers
        .filter((provider) =>
          providerApiNames.has(provider.name as ApiProviderName),
        )
        .map((provider) => {
          return [provider.name as ApiProviderName, provider];
        }),
    );
    // NOTE: latest @types/webtorrent is outdated, utPex and seedOutgoingConnections
    // aren't present in spec, which requires casting Options to any
    this.webtorrent = new WebTorrent({
      dht: false,
      lsd: false,
      utPex: false,
      natUpnp: false,
      natPmp: false,
      webSeeds: false,
      utp: false,
      seedOutgoingConnections: false,
    } as any);
    this.inflightSearches = new Map();
    this.searhLimit = options.searhLimitPerProvider;
    this.searchTimeout = options.searchTimeout;
    this.cache = options.cache;
    this.ttlPerValidTorrent = options.ttlPerTorrent;
  }

  private selectProviders(
    parameters: SearchParameters,
  ): { provider: TorrentProvider; category: string; query: string }[] {
    return parameters.providers
      .map((provider) => this.providers.get(PROVIDER_NAMES_MAPPING[provider]))
      .filter((provider) => provider !== undefined)
      .flatMap((provider) => {
        const category = parseCategory(provider, parameters.content.type);

        return parameters.queries.map((query) => {
          return { provider, category, query };
        });
      });
  }

  private async lookupTorrent(
    magnetURI: string,
    infoHash: string,
    content: Content,
    torrentMeta: TorrentMeta,
  ): Promise<TorrentFileInfo | null> {
    let inflightSearch = this.inflightSearches.get(infoHash);
    if (inflightSearch !== undefined) return inflightSearch;

    const find = (torrent: Torrent) => {
      const torrentFile = findTorrentFile(content, torrent);
      return torrentFile !== undefined
        ? {
            ...torrentMeta,
            ...torrentFile,
            infoHash,
            announce: torrent.announce,
          }
        : null;
    };

    const cacheKey = `bay.torrent.${infoHash}`;

    try {
      let torrent: Torrent | 0 | null = await this.cache.get(
        cacheKey,
        this.ttlPerValidTorrent,
      );
      if (torrent !== null) return torrent !== 0 ? find(torrent) : null;
    } catch (error: any) {
      console.warn(`Failed to query cached torrent: ${error.message}`);
    }

    inflightSearch = new Promise((resolve, _) => {
      const cleanup = () => {
        this.webtorrent.remove(magnetURI, { destroyStore: true }).catch();
      };

      const timeout = setTimeout(() => {
        this.cache.set(cacheKey, 0).catch((error: Error) => {
          console.warn(`Failed to cache timed out torrent: ${error.message}`);
        });

        resolve(null);

        cleanup();
      }, this.searchTimeout);

      const findAndResolve = (torrent: Torrent) => {
        clearTimeout(timeout);

        this.cache
          .set(
            cacheKey,
            {
              announce: torrent.announce,
              files: torrent.files.map((file) => {
                return {
                  name: file.name,
                  length: file.length,
                };
              }),
            },
            this.ttlPerValidTorrent,
          )
          .catch((error: Error) => {
            console.warn(`Failed to cache valid torrent: ${error.message}`);
          });

        resolve(find(torrent));
      };

      let torrent = this.webtorrent.torrents.find(
        (torrent) => torrent.infoHash === infoHash,
      );
      if (torrent !== undefined) {
        return findAndResolve(torrent);
      }

      // NOTE: latest @types/webtorrent is outdated, deselect isn't
      // present in spec, which requires casting TorrentOptions to any
      this.webtorrent.add(magnetURI, { deselect: true } as any, (torrent) => {
        findAndResolve(torrent);

        cleanup();
      });
    });

    this.inflightSearches.set(infoHash, inflightSearch);

    try {
      return await inflightSearch;
    } finally {
      this.inflightSearches.delete(infoHash);
    }
  }

  public async search(parameters: SearchParameters): Promise<Stream[]> {
    if (parameters.queries.length === 0 || parameters.providers.length === 0)
      return [];

    const desiredTorrent = buildTorrentMetaFilter(parameters.content);
    const inspectedTorrents = new Set();
    const searchesPerProvider = this.selectProviders(parameters).map(
      async ({ provider, category, query }) => {
        let torrentsMeta: TorrentMeta[];

        try {
          torrentsMeta = await provider.search(
            query,
            category,
            this.searhLimit,
          );
        } catch (error: any) {
          console.warn(
            `Failed to query provider ${provider.name} with '${query}': ${error.message}`,
          );

          return [];
        }

        const found: TorrentFileInfo[] = [];

        const lookups = torrentsMeta
          .flat()
          .slice(0, this.searhLimit)
          .filter(desiredTorrent)
          .map(async (torrentMeta) => {
            const magnetURI = await provider.getMagnet(torrentMeta);
            if (magnetURI === undefined) return;
            const parsedMagnetURL = decodeMagnetURL(magnetURI);
            if (parsedMagnetURL.infoHash === undefined) return;
            const infoHash = parsedMagnetURL.infoHash!;

            if (inspectedTorrents.has(infoHash)) return;
            inspectedTorrents.add(infoHash);

            const torrentFileInfo = await this.lookupTorrent(
              magnetURI,
              infoHash,
              parameters.content,
              torrentMeta,
            );
            if (torrentFileInfo === null) return;

            found.push(torrentFileInfo);
          });
        await Promise.all(lookups);

        return found;
      },
    );
    const torrentFilesInfo = await Promise.all(searchesPerProvider);

    return sortTorrentFilesInfo(parameters.sortBy, torrentFilesInfo.flat());
  }

  public destroy() {
    this.webtorrent.destroy();
  }
}

export interface TorrentBay {
  search(parameters: SearchParameters): Promise<Stream[]>;
  destroy(): void;
}

export function createTorrentBay(options: BayOptions): TorrentBay {
  return new Bay(options);
}

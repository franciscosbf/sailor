import TorrentSearchApi, {
  type TorrentProvider,
  type TorrentMeta,
} from "torrent-search-api";
import WebTorrent, { type Torrent } from "webtorrent";
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
}

export interface SeriesContent {
  type: ContentType.Series;
  season: string;
  episode: string;
  seasons?: string;
}

export type Content = MovieContent | SeriesContent;

export enum Provider {
  TorrentProject = "TorrentProject",
  ThePirateBay = "ThePirateBay",
}
const PROVIDER_NAMES = new Set(Object.keys(Provider));

export enum SortBy {
  Seeders,
  Quality,
  SeedersThenQuality,
  QualityThenSeeders,
}

export interface SearchParameters {
  query: string;
  content: Content;
  providers: Provider[];
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

function parseCategory(provider: TorrentProvider): string {
  let category = "All";

  switch (provider.name as Provider) {
    case Provider.ThePirateBay:
      category = "Video";
      break;
  }

  return category;
}

function buildTorrentTitleFilter(content: Content): (title: string) => boolean {
  switch (content.type) {
    case ContentType.Series:
      const s00ed = toS00Format(content.season);
      const e00ed = toE00Format(content.episode);
      let possibilities = `${s00ed} ?${e00ed}|${s00ed}[^e]{1}`;
      if (content.seasons !== undefined) {
        const s00ed = toS00Format(content.seasons);
        possibilities += `|S01-${s00ed}`;
      }

      return (title) => new RegExp(`(${possibilities})`, "i").test(title);
    default:
      return (_) => true;
  }
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

function sortBySeeders(torrentFileInfo: TorrentFileInfo[]) {
  return torrentFileInfo.sort((tfi1, tfi2) => tfi2.seeds - tfi1.seeds);
}

function sortByQuality(torrentsInfo: TorrentFileInfo[]) {
  return (torrentsInfo = torrentsInfo.sort(
    (tfi1, tfi2) => tfi2.quality - tfi1.quality,
  ));
}

function sortTorrentFilesInfo(
  sortBy: SortBy,
  torrentFilesInfo: TorrentFileInfo[],
): TorrentFileInfo[] {
  switch (sortBy) {
    case SortBy.Seeders:
      return sortBySeeders(torrentFilesInfo);
    case SortBy.Quality:
      return sortByQuality(torrentFilesInfo);
    case SortBy.SeedersThenQuality:
      return sortByQuality(sortBySeeders(torrentFilesInfo));
    case SortBy.QualityThenSeeders:
      return sortBySeeders(sortByQuality(torrentFilesInfo));
  }
}

export interface BayOptions {
  searhLimitPerProvider: number;
  searchTimeout: number;
  cache: Cache;
  ttlPerMatchedTorrent: number;
}

class Bay {
  private providers: Map<Provider, TorrentProvider>;
  private webtorrent: WebTorrent.Instance;
  private inflightSearches: Map<string, Promise<TorrentFileInfo | null>>;
  private searhLimit: number;
  private searchTimeout: number;
  private cache: Cache;
  private ttlPerMatchedTorrent: number;

  constructor(options: BayOptions) {
    this.providers = new Map(
      TorrentSearchApi.providers
        .filter((provider) => PROVIDER_NAMES.has(provider.name))
        .map((provider) => {
          return [provider.name as Provider, provider];
        }),
    );
    // NOTE: latest @types/webtorrent is outdated, seedOutgoingConnections
    // isn't present in spec, which requires casting Options to any
    this.webtorrent = new WebTorrent({
      lsd: false,
      seedOutgoingConnections: false,
      dowloadLimit: -1,
      uploadLimit: -1,
    } as any);
    this.inflightSearches = new Map();
    this.searhLimit = options.searhLimitPerProvider;
    this.searchTimeout = options.searchTimeout;
    this.cache = options.cache;
    this.ttlPerMatchedTorrent = options.ttlPerMatchedTorrent;
  }

  private selectProviders(
    parameters: SearchParameters,
  ): { provider: TorrentProvider; formattedCategory: string }[] {
    return parameters.providers
      .map((provider) => this.providers.get(provider))
      .filter((provider) => provider !== undefined)
      .map((provider) => {
        const category = parseCategory(provider);

        return { provider, formattedCategory: category };
      });
  }

  private async lookupTorrent(
    magnetURI: string,
    infoHash: string,
    content: Content,
    torrentMeta: TorrentMeta,
  ): Promise<TorrentFileInfo | null> {
    let inflightSearch = this.inflightSearches.get(magnetURI);
    if (inflightSearch !== undefined) return inflightSearch;

    inflightSearch = new Promise((resolve, _) => {
      const cleanup = () => {
        this.webtorrent.remove(magnetURI, { destroyStore: true }).catch();
      };

      const timeout = setTimeout(() => {
        resolve(null);

        cleanup();
      }, this.searchTimeout);

      const findAndResolve = (torrent: Torrent) => {
        clearTimeout(timeout);

        const torrentFile = findTorrentFile(content, torrent);
        const torrentFileInfo =
          torrentFile !== undefined
            ? {
                ...torrentMeta,
                ...torrentFile,
                infoHash: torrent.infoHash,
                announce: torrent.announce,
              }
            : null;
        resolve(torrentFileInfo);
      };

      let torrent = this.webtorrent.torrents.find(
        (torrent) => torrent.infoHash === infoHash,
      );
      if (torrent !== undefined && torrent!.name) {
        return findAndResolve(torrent!);
      }

      this.webtorrent.add(magnetURI, { deselect: true } as any, (torrent) => {
        findAndResolve(torrent);

        cleanup();
      });
    });

    this.inflightSearches.set(magnetURI, inflightSearch);

    try {
      return await inflightSearch;
    } finally {
      this.inflightSearches.delete(magnetURI);
    }
  }

  public async search(parameters: SearchParameters): Promise<Stream[]> {
    if (parameters.providers.length === 0) return [];

    const desiredTorrent = buildTorrentMetaFilter(parameters.content);
    const inspectedTorrents = new Set();
    const searchesPerProvider = this.selectProviders(parameters).map(
      async ({ provider, formattedCategory }) => {
        let torrentsMeta: TorrentMeta[];
        try {
          torrentsMeta = await provider.search(
            parameters.query,
            formattedCategory,
            this.searhLimit,
          );
        } catch (error: any) {
          console.error(
            `Failed to search query provider ${provider.name}: ${error}`,
          );

          return [];
        }

        const found: TorrentFileInfo[] = [];

        const lookups = torrentsMeta
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

            let torrentFileInfo: TorrentFileInfo | "" | null = null;

            try {
              torrentFileInfo = await this.cache.get(infoHash);
              if (torrentFileInfo !== null) {
                if (torrentFileInfo !== "") found.push(torrentFileInfo);

                return;
              }
            } catch (error: any) {
              console.warn(`Failed to query cached torrent: ${error}`);
            }

            torrentFileInfo = await this.lookupTorrent(
              magnetURI,
              infoHash,
              parameters.content,
              torrentMeta,
            );
            // NOTE: nullable results are cached as well to speedup search
            try {
              if (torrentFileInfo === null) await this.cache.set(infoHash, "");
              else
                await this.cache.set(
                  infoHash,
                  torrentFileInfo,
                  this.ttlPerMatchedTorrent,
                );
            } catch (error: any) {
              console.warn(`Failed to cache torrent: ${error}`);
            }
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

  public async start(): Promise<void> {
    try {
      await this.cache.connect();
    } catch (error: any) {
      throw new Error(`unable to connect to the cache: ${error}`);
    }
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

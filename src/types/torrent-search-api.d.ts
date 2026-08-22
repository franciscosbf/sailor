declare module "torrent-search-api" {
  export interface TorrentMeta {
    title: string;
    seeds: number;
    provider: string;
  }

  export interface TorrentProvider {
    name: string;

    async search(
      query: string,
      category: string,
      limit: number,
    ): Promise<TorrentMeta[]>;
    async getMagnet(torrent: TorrentMeta): Promise<string|undefined>;
  }

  export function enablePublicProviders(): void;

  export const providers: TorrentProvider[];
}

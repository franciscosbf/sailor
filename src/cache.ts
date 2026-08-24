import {
  createClientPool,
  type RedisClientPoolType,
  type RedisFunctions,
  type RedisModules,
  type RedisScripts,
  type RespVersions,
} from "@redis/client";

type RedisPool = RedisClientPoolType<
  RedisModules,
  RedisFunctions,
  RedisScripts,
  RespVersions,
  {}
>;

export interface CacheOptions {
  url: string;
}

class CachePool {
  private pool: RedisPool;

  constructor(options: CacheOptions) {
    this.pool = createClientPool({ url: options.url });
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.pool.set(key, JSON.stringify(value), {
      NX: true,
      EX: ttl,
    });
  }

  public async get(key: string): Promise<any | null> {
    return this.pool
      .get(key)
      .then((value) => (value !== null ? JSON.parse(value) : null));
  }

  public async connect(): Promise<void> {
    await this.pool.connect();
  }

  public destroy(): void {
    this.pool.destroy();
  }
}

export interface Cache {
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  connect(): Promise<void>;
  destroy(): void;
}

export function createCache(options: CacheOptions): Cache {
  return new CachePool(options);
}

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
  timeToLive: number;
}

class CachePool {
  private pool: RedisPool;
  private ttl: number;

  constructor(pool: RedisPool, options: CacheOptions) {
    this.pool = pool;
    this.ttl = options.timeToLive;
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

export function createCache(url: string, options: CacheOptions): Cache {
  const pool = createClientPool({ url });

  return new CachePool(pool, options);
}

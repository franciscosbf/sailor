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

class CachePool<V> {
  private pool: RedisPool;
  private timeToLive: number;

  constructor(pool: RedisPool, options: CacheOptions) {
    this.pool = pool;
    this.timeToLive = options.timeToLive;
  }

  public async get(key: string): Promise<V | null> {
    return this.pool
      .get(key)
      .then((value) => (value !== null ? JSON.parse(value) : null));
  }

  public async set(key: string, value: V): Promise<void> {
    await this.pool.set(key, JSON.stringify(value), {
      NX: true,
      EX: this.timeToLive,
    });
  }

  public async connect(): Promise<void> {
    await this.pool.connect();
  }

  public destroy(): void {
    this.pool.destroy();
  }
}

export interface Cache<V> {
  get(key: string): Promise<V | null>;
  set(key: string, value: V): Promise<void>;
  connect(): Promise<void>;
  destroy(): void;
}

export function createCache<V>(url: string, options: CacheOptions): Cache<V> {
  const pool = createClientPool({ url });

  return new CachePool<V>(pool, options);
}

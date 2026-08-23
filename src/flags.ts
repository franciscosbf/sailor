import { cleanEnv, url, num } from "envalid";

export const env = cleanEnv(process.env, {
  ADDON_PUBLISH_URL: url({
    default: undefined,
    desc: "Addon URL to be published",
  }),
  ADDON_PORT: num({
    default: 61062,
    desc: "Port the service will be listening to for incoming requests",
  }),
  ADDON_CACHE_MAX_AGE_S: num({
    default: 3600,
    desc: "Maximum time (in seconds) to consider a search as fresh, i.e., still valid",
  }),
  ADDON_PRE_SHUTDOWN_DELAY_MS: num({
    default: 2000,
    desc: "Server pre-shutdown timeout (in milliseconds), resulting in GET /health returing 503",
  }),
  ADDON_SHUTDOWN_TIMEOUT_MS: num({
    default: 4000,
    desc: "Graceful server shutdown timeout (in milliseconds), before forcing exit",
  }),

  BAY_SEARCH_LIMIT_PER_PROVIDER: num({
    default: 4,
    desc: "Limit the number of torrent results found per provider search",
  }),
  BAY_SEARCH_TIMEOUT_MS: num({
    default: 4000,
    desc: "Timeout (in milliseconds) before giving up on trying to retrieve torrent description",
  }),
  BAY_CACHE_URL: url({
    desc: "Optional cache connection URL",
    default: undefined,
  }),
  BAY_CACHE_TTL_S: num({
    default: 1800,
    desc: "Cache time to live (in seconds) per stored torrent",
  }),
});

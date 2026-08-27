import { cleanEnv, url, makeExactValidator, EnvError } from "envalid";

const positiveNum = makeExactValidator<number>((input) => {
  const coerced = parseInt(input, 10);
  if (Number.isNaN(coerced) || coerced <= 0)
    throw new EnvError(`Invalid positive integer input: "${input}"`);

  return coerced;
});

const nonNegativeNum = makeExactValidator<number>((input) => {
  const coerced = parseInt(input, 10);
  if (Number.isNaN(coerced) || coerced < 0)
    throw new EnvError(`Invalid non-negative integer input: "${input}"`);

  return coerced;
});

export const env = cleanEnv(process.env, {
  ADDON_PUBLISH_URL: url({
    default: undefined,
    desc: "Addon URL to be published",
  }),
  ADDON_PORT: nonNegativeNum({
    default: 61062,
    desc: "Port the service will be listening to for incoming requests",
  }),
  ADDON_CACHE_MAX_AGE_S: positiveNum({
    default: 3600,
    desc: "Maximum time (in seconds) to consider a search as fresh, i.e., still valid",
  }),
  ADDON_PRE_SHUTDOWN_DELAY_MS: positiveNum({
    default: 2000,
    desc: "Server pre-shutdown timeout (in milliseconds), resulting in GET /health returing 503",
  }),
  ADDON_SHUTDOWN_TIMEOUT_MS: positiveNum({
    default: 4000,
    desc: "Graceful server shutdown timeout (in milliseconds), before forcing exit",
  }),

  BAY_PROVIDER_SEARCH_LIMIT: positiveNum({
    default: 8,
    desc: "Limit the number of torrent results returned by each provider on a per-request basis",
  }),
  BAY_SEARCH_TIMEOUT_MS: positiveNum({
    default: 8000,
    desc: "Timeout (in milliseconds) before giving up on trying to retrieve torrent info",
  }),
  BAY_CACHE_URL: url({
    desc: "Optional Redis connection URL",
    default: undefined,
  }),
  BAY_CACHE_TTL_S: positiveNum({
    default: 1800,
    desc: "Cache time to live (in seconds) per stored torrent",
  }),
});

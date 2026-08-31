import { buildAddonInterface } from "./addon.js";
import { env } from "./flags.js";
import {
  publishToCentral,
  //, landingTemplate
} from "@stremio-addon/compat";
import { getRouter } from "@stremio-addon/node-express";
import express from "express";
import { type AddressInfo } from "net";
import { createTorrentBay } from "./bay.js";
import { createCinemataSearcher } from "./cinemata.js";
import { createCache } from "./cache.js";
import { landingTemplatePaths } from "./landing-template.js";

class DummyCache {
  constructor() {}

  public get(_key: string): Promise<null> {
    return Promise.resolve(null);
  }

  public set(_key: string, _value: any): Promise<void> {
    return Promise.resolve();
  }

  public connect(): Promise<void> {
    return Promise.resolve();
  }

  public destroy(): void {}
}

if (env.ADDON_PUBLISH_URL !== undefined) {
  const url = `${env.ADDON_PUBLISH_URL}/manifest.json`;
  publishToCentral(url)
    .then((_) => {
      console.log(`Addon published with URL ${url}`);
    })
    .catch((reason) => {
      console.error(`Failed to publish addon: ${reason.message}`);
    });
}

const cache =
  env.BAY_CACHE_URL !== undefined
    ? createCache({ url: env.BAY_CACHE_URL })
    : new DummyCache();
try {
  await cache.connect();
} catch (error: any) {
  const reason = error instanceof AggregateError ? error.errors[0] : error;
  console.error(`Failed to connect to cache: ${reason.message}`);

  process.exit(1);
}
const cinemata = createCinemataSearcher(cache);
const bay = createTorrentBay({
  searhLimitPerProvider: env.BAY_PROVIDER_SEARCH_LIMIT,
  searchTimeout: env.BAY_SEARCH_TIMEOUT_MS,
  cache,
  ttlPerTorrent: env.BAY_CACHE_TTL_S,
});

const addonInterface = buildAddonInterface(cinemata, bay);
const app = express();
const port = env.ADDON_PORT;
const cacheMaxAge = env.ADDON_CACHE_MAX_AGE_S;
// const landingHTML = landingTemplate(addonInterface.manifest);
let shuttingDown = false;

app.use("/", getRouter(addonInterface, { cacheMaxAge }));
app.get("/", (_, res) => {
  res.redirect("/configure");
});
app.use(
  "/configure",
  express.static(landingTemplatePaths.static, {
    index: false,
    redirect: false,
  }),
);
app.get("/configure", (_, res) => {
  res.sendFile(landingTemplatePaths.index);
});
app.get("/health", (_, res) => {
  if (shuttingDown) res.status(503).send("no healthy");
  else res.status(200).send("healthy");
});

const server = app.listen(port);
const shutdown = async (signal?: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  if (signal !== undefined) {
    console.log(`Received signal ${signal}, delaying shutdown`);

    await new Promise((resolve, _) => {
      setTimeout(() => resolve(null), env.ADDON_PRE_SHUTDOWN_DELAY_MS);
    });
  }

  console.log("Shutdown initiated");

  server.close(() => {
    console.log("Server closed");

    bay.destroy();

    console.log("Torrent peer connections destroyed");

    if (env.BAY_CACHE_URL !== undefined) {
      cache.destroy();

      console.log("Cache connections destroyed");
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.warn(`Shutdown timed out, forcing exit`);

    process.exit(1);
  }, env.ADDON_SHUTDOWN_TIMEOUT_MS);
};

server.on("listening", () => {
  const { port } = server.address() as AddressInfo;
  const url = `http://localhost:${port}/manifest.json`;

  console.log("HTTP addon accessible at:", url);
});
server.on("error", (error) => {
  console.error(`Server emited the following error: ${error.message}`);

  shutdown();
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

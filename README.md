# Sailor

Sailor is a Stremio Addon for searching streams, which supports 3 torrent engines: LimeTorrents, The Pirate Bay and TorrentProject.

#### Requirements

- [pnpm](https://pnpm.io/)

#### Available Commands

##### Addon Configuration Web Page (configure/)

```shell
# install dependencies
pnpm install

# start dev server with live updates
pnpm run dev

# remove existing build (dist/ folder)
pnpm run clean

# build web page
pnpm run build

# start dev server with built web page at dist/
pnpm run preview

# run ESlint
pnpm run lint
```

##### Addon Server

```shell
# install dependencies
pnpm install

# remove existing build (dist/ folder)
pnpm run clean

# test addon
pnpm run test

# build server
pnpm run build

# run built server
pnpm run start
```

#### Addon Endpoints

- `GET` `/health` service status check
- `GET` `/configure` addon configuration web page
- `GET` `/<config>/manifest.json` addon specification
- `GET` `/<config>/stream/<type>/<id>.json` query stream given its **type** and **id**
  - **type**: _movie_ or _series_
  - **id**: content identifier following a format similar to IMDB's:
    - _movie_: tt\<**number**\>, e.g., tt1636826
    - _series_: tt\<**number**\>:\<**season**\>:\<**episode**\>, e.g., tt1124373:2:1

`/<config>` is optional and is configured on the web page available at `/configure`.

#### Environment Variables

##### Addon Related

- **ADDON_PUBLISH_URL**: optional addon URL to be published
- **ADDON_PORT**: port the service will be listening to for incoming requests
  - **default**: 61062
- **ADDON_CACHE_MAX_AGE_S**: maximum time (in seconds) to consider a search as fresh, i.e., still valid
  - **default**: 3600
- **ADDON_PRE_SHUTDOWN_DELAY_MS**: server pre-shutdown timeout (in milliseconds), resulting in `GET /health` returing 503
  - **default**: 2000
- **ADDON_SHUTDOWN_TIMEOUT_MS**: graceful server shutdown timeout (in milliseconds), before forcing exit
  - **default**: 4000

##### Torrent Providers Searcher

- **BAY_PROVIDER_SEARCH_LIMIT**: limit the number of torrent results returned by each provider on a per-request basis
  - **default**: 4
- **BAY_SEARCH_TIMEOUT_MS**: timeout (in milliseconds) before giving up on trying to retrieve torrent description
  - **default**: 4000
- **BAY_CACHE_URL**: optional Redis connection URL
- **BAY_CACHE_TTL_S**: cache time to live (in seconds) per stored torrent
  - **default**: 1800

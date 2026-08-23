# sailor

sailor is a Stremio Addon for searching streams, which supports two torrent engines: The Pirate Bay and TorrentProject.

#### Requirements

- [pnpm](https://pnpm.io/)

```
# install dependencies
pnpm i
```

#### Available Commands

```shell
# remove existing build (dist/ folder)
pnpm run clean

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
- **ADDON_CACHE_MAX_AGE_MS**: maximum time (ms) to consider a search as fresh, i.e., still valid
  - **default**: 2592000
- **ADDON_PRE_SHUTDOWN_DELAY_MS**: server pre-shutdown timeout (ms), resulting in `GET /health` returing 503
  - **default**: 2000
- **ADDON_SHUTDOWN_TIMEOUT_MS**: graceful server shutdown timeout (ms), before forcing exit
  - **default**: 4000

##### Torrent Providers Searcher

- **BAY_SEARCH_LIMIT_PER_PROVIDER**: limit the number of torrent results found per provider search
  - **default**: 4
- **BAY_SEARCH_TIMEOUT_MS**: timeout (ms) before giving up on trying to retrieve torrent description
  - **default**: 4000

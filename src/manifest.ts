import { type ManifestSchema } from "@stremio-addon/zod";

export const manifest: ManifestSchema = {
  id: "torrents.sailor",
  version: "0.0.1",
  name: "Sailor Addon",
  description:
    "Torrents bay navigator. Supported providers: TorrentProject, The Pirate Bay and Limetorrents.",
  catalogs: [],
  resources: [
    {
      name: "stream",
      types: ["movie", "series"],
      idPrefixes: ["tt"],
    },
  ],
  types: ["movie", "series"],
  behaviorHints: {
    configurable: true,
  },
  config: [
    {
      key: "sort",
      type: "select",
      title: "Sort torrents by",
      options: [
        "Seeders",
        "Quality",
        "QualityThenSeeders",
        "SeedersThenQuality",
      ],
    },
    {
      key: "removeTorrentProject",
      type: "checkbox",
      title: "Don't include TorrentProject",
    },
    {
      key: "removeThePirateBay",
      type: "checkbox",
      title: "Don't include The Pirate Bay",
    },
    {
      key: "removeLimeTorrents",
      type: "checkbox",
      title: "Don't include LimeTorrents",
    },
  ],
};

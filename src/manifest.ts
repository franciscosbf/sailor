import { type ManifestSchema } from "@stremio-addon/zod";

export const manifest: ManifestSchema = {
  id: "torrents.sailor",
  version: "0.0.1",
  name: "Sailor",
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
      default: "QualityThenSeeders",
    },
    {
      key: "TorrentProject",
      type: "checkbox",
      title: "TorrentProject",
      default: "checked",
    },
    {
      key: "ThePirateBay",
      type: "checkbox",
      title: "The Pirate Bay",
      default: "checked",
    },
    {
      key: "LimeTorrents",
      type: "checkbox",
      title: "LimeTorrents",
      default: "checked",
    },
  ],
};

import { describe, test, expect, vi } from "vitest";
import {
  MediaType,
  type CinemataSearcher,
  type MediaMeta,
} from "./cinemata.js";
import {
  ContentType,
  PROVIDER_NAMES,
  SortBy,
  StreamQuality,
  TorrentBay,
  type Stream,
} from "./bay.js";
import { buildAddonInterface } from "./addon.ts";

describe("addon", () => {
  describe("stream", () => {
    test("retrieve stream without configuration", async () => {
      const meta: MediaMeta = { name: "Interstellar", date: "2014" };
      const cinemata: CinemataSearcher = {
        query: vi.fn().mockReturnValue(meta),
      };

      const streams: Stream[] = [
        {
          name: "Interstellar (2014) (2014) 1080p BrRip x264 - YIFY",
          fileIdx: 0,
          infoHash: "89599BF4DC369A3A8ECA26411C5CCF922D78B486",
          quality: StreamQuality.Q1080p,
          announce: ["udp://tracker.opentrackr.org:1337"],
          size: 2426656522,
          seeds: 3,
        },
      ];
      const bay: TorrentBay = {
        search: vi.fn().mockReturnValue(Promise.resolve(streams)),
        destroy: vi.fn(() => {}),
      };

      const addonInterface = buildAddonInterface(cinemata, bay);

      const streamSchemas = await addonInterface.get(
        "stream",
        "movie",
        "tt0816692",
      );

      expect(streamSchemas).toEqual({
        streams: [
          {
            description:
              "Interstellar (2014) (2014) 1080p BrRip x264 - YIFY\n📺 1080p\n👤 3 💾 2.43 GB",
            fileIdx: 0,
            infoHash: "89599BF4DC369A3A8ECA26411C5CCF922D78B486",
            name: "Sailor",
            sources: ["tracker:udp://tracker.opentrackr.org:1337"],
            behaviorHints: {
              bingeGroup: "Sailor-1080p",
              videoSize: 2426656522,
              filename: "Interstellar (2014) (2014) 1080p BrRip x264 - YIFY",
            },
          },
        ],
      });

      expect(cinemata.query).toHaveBeenCalledExactlyOnceWith(
        "tt0816692",
        MediaType.Movie,
      );

      expect(bay.search).toHaveBeenCalledExactlyOnceWith({
        queries: ["Interstellar 2014"],
        content: { type: ContentType.Movie, name: "Interstellar" },
        providers: PROVIDER_NAMES,
        sortBy: SortBy.QualityThenSeeders,
      });

      expect(bay.destroy).toHaveBeenCalledTimes(0);
    });

    test("retrieve stream with custom configuration", async () => {
      const meta: MediaMeta = {
        name: "Mr. Robot",
        date: "2015-2019",
        seasons: "4",
      };
      const cinemata: CinemataSearcher = {
        query: vi.fn().mockReturnValue(meta),
      };

      const streams: Stream[] = [
        {
          name: "Mr.Robot.SEASON.01.S01.COMPLETE.1080p.10bit.BluRay.6CH.x265.HEVC",
          fileIdx: 0,
          infoHash: "718CF91776E36449AFB49F4EFC4C2C2EEBC59CE1",
          quality: StreamQuality.Q1080p,
          announce: ["udp://tracker.opentrackr.org:1337"],
          size: 904501658,
          seeds: 24,
        },
      ];
      const bay: TorrentBay = {
        search: vi.fn().mockReturnValue(Promise.resolve(streams)),
        destroy: vi.fn(() => {}),
      };

      const addonInterface = buildAddonInterface(cinemata, bay);

      const streamSchemas = await addonInterface.get(
        "stream",
        "series",
        "tt4158110:1:1",
        undefined,
        {
          sort: "Seeders",
          TorrentProject: "on",
          LimeTorrents: "on",
        },
      );

      expect(streamSchemas).toEqual({
        streams: [
          {
            description:
              "Mr.Robot.SEASON.01.S01.COMPLETE.1080p.10bit.BluRay.6CH.x265.HEVC\n📺 1080p\n👤 24 💾 904.50 MB",
            fileIdx: 0,
            infoHash: "718CF91776E36449AFB49F4EFC4C2C2EEBC59CE1",
            name: "Sailor",
            sources: ["tracker:udp://tracker.opentrackr.org:1337"],
            behaviorHints: {
              bingeGroup: "Sailor-1080p",
              videoSize: 904501658,
              filename:
                "Mr.Robot.SEASON.01.S01.COMPLETE.1080p.10bit.BluRay.6CH.x265.HEVC",
            },
          },
        ],
      });

      expect(cinemata.query).toHaveBeenCalledExactlyOnceWith(
        "tt4158110",
        MediaType.Series,
      );

      expect(bay.search).toHaveBeenCalledExactlyOnceWith({
        queries: ["Mr. Robot S01", "Mr. Robot S01-S04"],
        content: {
          type: ContentType.Series,
          name: "Mr. Robot",
          season: "1",
          episode: "1",
          seasons: "4",
        },
        providers: ["TorrentProject", "LimeTorrents"],
        sortBy: SortBy.Seeders,
      });

      expect(bay.destroy).toHaveBeenCalledTimes(0);
    });
  });
});

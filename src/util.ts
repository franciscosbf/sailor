import { dirname } from "path";
import { fileURLToPath } from "url";

function zeroedPadStart(num: string, maxLength: number): string {
  return num.padStart(maxLength, "0");
}

export function toS00Format(season: string): string {
  return `S${zeroedPadStart(season, 2)}`;
}

export function toE00Format(episode: string): string {
  return `E${zeroedPadStart(episode, 2)}`;
}

export function toS00E00Format(season: string, episode: string): string {
  const s00ed = toS00Format(season);
  const e00ed = toE00Format(episode);
  return `${s00ed}${e00ed}`;
}

// NOTE: __dirname isn't available in ES modules, so we replicate it here.
export function resolveDirname(): string {
  return dirname(fileURLToPath(import.meta.url));
}

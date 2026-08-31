import { resolve } from "path";
import { resolveDirname } from "./util.js";

export interface LandingHTML {
  readonly static: string;
  readonly index: string;
}

const __dirname = resolveDirname();
const basePath = "../configure/dist";

export const landingTemplatePaths: LandingHTML = {
  static: resolve(__dirname, basePath),
  index: resolve(__dirname, basePath, "index.html"),
};

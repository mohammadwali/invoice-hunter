import os from "os";
import path from "path";

export const getAppStoragePath = (): string =>
  path.join(os.homedir(), "/.invoice-hunter");

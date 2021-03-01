import clear from "clear";
import fs from "fs-extra";
import yaml from "js-yaml";
import puppeteer from "puppeteer";
import commander, { Command } from "commander";

import { Hunter } from "./lib/Hunter";
import { HunterConfig } from "./types/Hunter";

import reporter, {
  printHeader,
  printFooter,
  printUnkwonError,
  printConfigNotFound,
} from "./utils/reporter";

import { DriveUploader } from "./lib/DriveUploader";
import { getAppStoragePath } from "./utils/storage";
import { promisify } from "util";

const appStoragePath = getAppStoragePath();

const setupProgram = (): commander.Command => {
  const program = new Command("invoice-hunter");
  program.version("1.0.0");
  program.requiredOption("-c, --config <path>", "config file path");
  program.parse(process.argv);
  return program;
};

const getConfig = async (configPath: string): Promise<any> => {
  let config;

  try {
    const stream = await fs.readFile(configPath, "utf8");
    config = yaml.load(stream);
    //todo validate schema via yaml-schema-validator
  } catch (e) {
    if (e.code === "ENOENT") {
      printConfigNotFound();
      process.exit(1);
      return;
    }

    printUnkwonError();
    process.exit(1);
  }

  return config;
};

const main = async () => {
  printHeader();

  const program = setupProgram();
  const options = program.opts();

  if (!Object.keys(options).length) {
    program.outputHelp();
    return;
  }

  const config = await getConfig(options.config);

  const hunter = new Hunter({
    reporter,
    config: config.hunt as HunterConfig,
  });

  await hunter.run();

  const uploader = new DriveUploader({
    reporter,
    appStoragePath,
    folderIds: config.upload.folderIds,
    credentialsPath: config.upload.credentialsFilePath,
    duplicateBehaviour: config.upload.duplicateBehaviour,
  });

  await uploader.upload(config.hunt.downloadDir);

  if (config.hunt.deleteAfterUpload) {
    reporter.info(`Removing ${config.hunt.downloadDir} directory...`);
    await fs.remove(config.hunt.downloadDir);
    reporter.success(`Removed ${config.hunt.downloadDir} directory...`);
  }

  printFooter();
};

clear();
main();

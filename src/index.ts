import clear from "clear";
import fs from "fs-extra";
import yaml from "js-yaml";
import puppeteer from "puppeteer";
import commander, { Command } from "commander";

import { Hunter } from "./lib/Hunter";
import * as Logger from "./utils/logger";
import { HunterConfig } from "./types/Hunter";

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
      Logger.logConfigNotFound();
      process.exit(1);
      return;
    }

    Logger.logUnkwonError();
    process.exit(1);
  }

  return config;
};

const main = async () => {
  const program = setupProgram();
  const options = program.opts();

  if (!Object.keys(options).length) {
    program.outputHelp();
    return;
  }

  const config = await getConfig(options.config);

  // Viewport && Window size
  const width = 1680;
  const height = 950;

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width, height },
    ignoreDefaultArgs: ["--enable-automation"],
    args: [`--window-size=${width},${height}`],
  });

  const hunter = new Hunter({
    browser,
    config: config.hunt as HunterConfig,
  });

  await hunter.run();
  await browser.close();
};

clear();
Logger.logTitleAndBanner();
main();

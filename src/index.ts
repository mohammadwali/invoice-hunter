import clear from "clear";
import puppeteer from "puppeteer";

import { Hunter } from "./lib/Hunter";
import { logTitleAndBanner } from "./utils/logger";

const main = async () => {
  // Viewport && Window size
  const width = 1680;
  const height = 950;
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width, height },
    ignoreDefaultArgs: ["--enable-automation"],
    args: [`--window-size=${width},${height}`],
  });

  const hunter = new Hunter(browser);
  await hunter.run();
  await browser.close();
};

clear();
logTitleAndBanner();
main();

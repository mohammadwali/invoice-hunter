import moment from "moment";
import puppeteer from "puppeteer";
import { HunterConfig } from "../types/Hunter";
import { EndesaHunter } from "./EndesaHunter";

type Args = { reporter: any; browser: puppeteer.Browser; config: HunterConfig };
export class Hunter {
  protected reporter: any;
  protected browser: puppeteer.Browser;
  protected readonly config: HunterConfig;
  protected readonly downloadDir: string;

  constructor({ browser, config, reporter }: Args) {
    this.reporter = reporter;
    this.browser = browser;

    this.config = config;
    this.downloadDir = config.downloadDir;
  }

  async run() {
    this.reporter.printStep(1, 2, "Hunting Endesa", ":zap:", "before");
    await this.huntEndesa();

    this.reporter.printStep(2, 2, "Hunting Agua", ":droplet:", "before");
    await this.huntAgua();
    this.reporter.info("Hunt Finished");
  }

  async huntEndesa() {
    const hunter = new EndesaHunter({
      browser: this.browser,
      reporter: this.reporter,
      config: this.config.endesa,
      downloadDir: this.downloadDir,
      lastInvoiceDate: moment("01-07-2020", "DD-MM-YYYY"), // todo fix me
    });
    await hunter.run();
  }

  async huntAgua() {
    return new Promise((r) => setTimeout(r, 5000));
  }
}

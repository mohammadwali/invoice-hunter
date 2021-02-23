import Steps from "cli-step";
import moment from "moment";
import puppeteer, { Page } from "puppeteer";
import { HunterConfig } from "../types/Hunter";
import { EndesaHunter } from "./EndesaHunter";

type Args = { reporter: any; browser: puppeteer.Browser; config: HunterConfig };
export class Hunter {
  protected reporter: any;
  protected readonly config: HunterConfig;
  protected browser: puppeteer.Browser;

  constructor({ browser, config, reporter }: Args) {
    this.reporter = reporter;
    this.browser = browser;
    this.config = config;
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
      config: this.config.endesa,
      reporter: this.reporter,
      lastInvoiceDate: moment("01-07-2020", "DD-MM-YYYY"),
    });
    await hunter.run();
  }

  async huntAgua() {
    return new Promise((r) => setTimeout(r, 5000));
  }
}

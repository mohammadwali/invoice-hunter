import Steps from "cli-step";
import moment from "moment";
import puppeteer, { Page } from "puppeteer";
import { HunterConfig } from "../types/Hunter";
import { EndesaHunter } from "./EndesaHunter";

type Args = { browser: puppeteer.Browser; config: HunterConfig };
export class Hunter {
  protected steps: any;
  protected readonly config: HunterConfig;
  protected browser: puppeteer.Browser;

  constructor({ browser, config }: Args) {
    this.steps = new Steps(1);
    this.browser = browser;
    this.config = config;
  }

  async run() {
    await this.huntEndesa();
    await this.huntAgua();
  }

  async huntEndesa() {
    const label = "Endesa";
    const step = this.steps.advance(label, "mag").start();

    const hunter = new EndesaHunter({
      browser: this.browser,
      config: this.config.endesa,
      lastInvoiceDate: moment("01-07-2020", "DD-MM-YYYY"),
    });

    try {
      await hunter.run();
      step.success(label, "white_check_mark");
    } catch (e) {
      console.log(e);
      step.error(`[Failed] ${label}`, "x");
    }
  }

  async huntAgua() {}
}

import Steps from "cli-step";
import moment from "moment";
import puppeteer, { Page } from "puppeteer";
import { EndesaHunter } from "./EndesaHunter";

export class Hunter {
  protected steps: any;
  protected browser: puppeteer.Browser;
  constructor(browser: puppeteer.Browser) {
    this.steps = new Steps(1);
    this.browser = browser;
  }

  async run() {
    await this.huntEndesa();
    await this.huntAgua();
  }

  async huntEndesa() {
    const label = "Endesa";
    const step = this.steps.advance(label, "mag").start();
    const hunter = new EndesaHunter(
      this.browser,
      // todo fix me
      moment("01-07-2020", "DD-MM-YYYY")
    );

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

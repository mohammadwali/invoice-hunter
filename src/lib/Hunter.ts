import moment from "moment";

import { AguaHunter } from "./AguaHunter";
import { EndesaHunter } from "./EndesaHunter";

import { HunterConfig } from "../types/Hunter";

type Args = { reporter: any; config: HunterConfig };

export class Hunter {
  protected reporter: any;
  protected readonly config: HunterConfig;
  protected readonly downloadDir: string;

  constructor({ config, reporter }: Args) {
    this.reporter = reporter;

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
      reporter: this.reporter,
      config: this.config.endesa,
      downloadDir: this.downloadDir,
      lastInvoiceDate: moment("01-07-2020", "DD-MM-YYYY"), // todo fix me
    });
    await hunter.run();
  }

  async huntAgua() {
    const hunter = new AguaHunter({
      reporter: this.reporter,
      config: this.config.agua,
      downloadDir: this.downloadDir,
      lastInvoiceDate: moment("01-07-2020", "DD-MM-YYYY"), // todo fix me
    });
    await hunter.run();
  }
}

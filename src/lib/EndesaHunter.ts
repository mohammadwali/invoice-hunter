import fs from "fs-extra";
import moment, { Moment, MomentFormatSpecification } from "moment";
import puppeteer, { ElementHandle } from "puppeteer";

import EndesaConfig from "../config/endesa-config";
import { HuntConfig } from "../types/Hunter";

type ProcessedRow = { date: Moment; selector: string; rawDate: string };

type Args = {
  reporter: any;
  browser: puppeteer.Browser;
  lastInvoiceDate: Moment;
  config: HuntConfig;
};

export class EndesaHunter {
  private rowsToProcess: ProcessedRow[];
  private page: puppeteer.Page | undefined;

  private readonly downloadDir: string;

  protected readonly reporter: any;
  protected readonly locale: string;
  protected readonly lastInvoiceDate: Moment;
  protected readonly browser: puppeteer.Browser;
  protected readonly invoiceDateFormat: string;

  protected readonly routes: typeof EndesaConfig.routes;
  protected readonly rootPath: typeof EndesaConfig.baseRoute;
  protected readonly selectors: typeof EndesaConfig.selectors;
  protected readonly pageLocale: typeof EndesaConfig.locale;
  protected readonly pageDateFormat: typeof EndesaConfig.dateFormat;
  protected readonly pageInvoiceName: typeof EndesaConfig.invoiceName;
  protected readonly pageInvoiceExtension: typeof EndesaConfig.invoiceExtension;
  protected readonly pageCredentials: { username: string; password: string };

  constructor({ browser, config, lastInvoiceDate, reporter }: Args) {
    this.locale = "en";
    this.rowsToProcess = [];
    this.downloadDir = "./temp/invoices/endesa"; // todo get and concat root dir from args

    this.browser = browser;
    this.reporter = reporter;
    this.pageCredentials = {
      username: config.username,
      password: config.password,
    };
    this.lastInvoiceDate = lastInvoiceDate;
    this.invoiceDateFormat = config.invoiceNameFormat ?? "DD-MM-YY";

    this.routes = EndesaConfig.routes;
    this.selectors = EndesaConfig.selectors;
    this.rootPath = EndesaConfig.baseRoute;
    this.pageLocale = EndesaConfig.locale;
    this.pageDateFormat = EndesaConfig.dateFormat;
    this.pageInvoiceName = EndesaConfig.invoiceName;
    this.pageInvoiceExtension = EndesaConfig.invoiceExtension;
  }

  async run() {
    await this.init();

    this.print("Running...");

    try {
      this.print("Trying to login...");
      await this.login();
      this.print("Logged in successfully");
    } catch (e) {
      this.print("Failed to login with provided credentials", "error");
      return;
    }

    try {
      this.print("Downloading invoices");
      const count = await this.downloadInvoices();
      if (count.total > 0) {
        this.print(
          `Downloaded ${count.downloaded}/${count.total} invoices`,
          count.total === count.downloaded
            ? "success"
            : count.downloaded == 0
            ? "error"
            : "info"
        );
      } else {
        this.print("No invoices found to download", "warning");
      }
    } catch (e) {
      this.print("Failed to download invoices", "error");
      this.print(e.message, "error");
      return;
    }
  }

  private async init() {
    this.print("Initializing...");
    this.page = await this.browser.newPage();
    await this.page.goto(this.rootPath);
  }

  private async login() {
    if (!this.page) {
      this.print("Login called without initializing", "error");
      throw new Error("Missing init call");
    }

    await this.page.goto(this.rootPath + this.routes.login);

    await this.page.type(
      this.selectors.login.username,
      this.pageCredentials.username
    );
    await this.page.type(
      this.selectors.login.password,
      this.pageCredentials.password
    );

    await this.page.click(this.selectors.acceptCookiesButton);
    await this.page.click(this.selectors.login.submitButton);

    await this.page.waitForNavigation({ waitUntil: "networkidle0" });
    await this.page.waitForTimeout(2000);
  }

  private async downloadInvoices(): Promise<{
    total: number;
    downloaded: number;
  }> {
    if (!this.page) {
      throw new Error("Missing init call");
    }

    let downloadedCount = 0;
    await this.navigateToInvoicesPage();

    await this.findAndSetRowsToProcess(
      await this.page.$$(this.selectors.invoices.listItems)
    );

    if (!this.rowsToProcess.length) {
      return { total: 0, downloaded: downloadedCount };
    }

    this.reporter.printWithFilepath("Saving invoices to", this.downloadDir);
    const tick = this.reporter.progress(this.rowsToProcess.length);

    for (let i = 0; i < this.rowsToProcess.length; i++) {
      const row = this.rowsToProcess[i];
      if (i > 0) {
        // navigate to the invoice page before downloading
        // for the first item we are already on the invoice page
        await this.navigateToInvoicesPage();
      }

      if (i === 0) {
        this.print(this.reporter.seperator, "log");
      }

      try {
        this.print(`Dowloading invoice for ${row.rawDate}`);
        await this.processRowItem(row);
        downloadedCount++;
      } catch (e) {
        this.print(`Failed to download invoice for ${row.rawDate}`, "error");
      }

      tick();

      this.print(this.reporter.seperator, "log");
    }

    return { total: this.rowsToProcess.length, downloaded: downloadedCount };
  }

  private async navigateToInvoicesPage() {
    await this.page?.goto(this.rootPath + this.routes.invoices);
    await this.page?.waitForSelector(this.selectors.invoices.listItems);
  }

  private async findAndSetRowsToProcess(rows: ElementHandle[]): Promise<void> {
    this.rowsToProcess = await this.findRowsToProcess(rows);
  }

  private async findRowsToProcess(
    rows: ElementHandle[]
  ): Promise<ProcessedRow[]> {
    const result: ProcessedRow[] = [];
    const { listItems: rowsSelector } = this.selectors.invoices;

    for (let i = 0; i < rows.length; i++) {
      const currentRowSelector = `${rowsSelector}:nth-child(${i + 1})`;
      let date = await this.extracttDateFromRow(currentRowSelector);

      const currentDate = moment(
        date.trim(),
        this.pageDateFormat,
        this.pageLocale
      ).locale("en");

      if (this.lastInvoiceDate.isBefore(currentDate)) {
        result.push({
          selector: currentRowSelector,
          date: currentDate,
          rawDate: date.trim(),
        });
      }
    }

    return result;
  }

  private async processRowItem(row: ProcessedRow) {
    const { actionCell, actionButton } = this.selectors.invoices;

    await this.page?.click(`${row.selector} ${actionCell} ${actionButton}`);
    await this.page?.waitForSelector(this.selectors.invoice.content, {
      visible: true,
    });

    await this.saveInvoice(
      this.downloadDir,
      row.date.format(this.invoiceDateFormat)
    );
  }

  private async saveInvoice(downloadPath: string, fileName: string) {
    const newFileName = `${fileName}.${this.pageInvoiceExtension}`;
    const previousFileName = `${this.pageInvoiceName}.${this.pageInvoiceExtension}`;

    /** @ts-ignore */
    await this.page?._client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath,
    });

    await this.page?.waitForSelector(this.selectors.invoice.downloadButton);
    await this.page?.click(this.selectors.invoice.downloadButton);

    await this.waitUntilFileIsDownloaded(`${downloadPath}/${previousFileName}`);

    this.print("Invoice saved", "success");

    await fs.rename(
      `${downloadPath}/${previousFileName}`,
      `${downloadPath}/${newFileName}`
    );

    this.reporter.printWithFilepath(
      "Invoice renamed to",
      newFileName,
      "success"
    );
  }

  private async extracttDateFromRow(rowSelector: string): Promise<string> {
    return (await this.page?.$eval(
      `${rowSelector} ${this.selectors.invoices.dateCell}`,
      (e) => e.textContent
    )) as string;
  }

  private print(
    msg: string,
    type: "info" | "warning" | "error" | "success" | "log" = "info"
  ): void {
    this.reporter[type](msg);
  }

  private async waitUntilFileIsDownloaded(filePath: string): Promise<void> {
    if (await fs.pathExists(filePath)) {
      return;
    }
    await this.page?.waitForTimeout(1000);
    return this.waitUntilFileIsDownloaded(filePath);
  }
}

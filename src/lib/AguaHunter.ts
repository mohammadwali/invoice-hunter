import fs from "fs-extra";
import path from "path";
import moment, { Moment } from "moment";
import puppeteer, { ElementHandle } from "puppeteer";

import AguaConfig from "../config/agua-config";
import { HuntConfig } from "../types/Hunter";
import {
  extractLinkFromAnchor,
  extractTextFromElement,
  extractSrcFromIframe,
} from "../utils/page";

type ProcessedRow = {
  date: Moment;
  rawDate: string;
  selector: string;
  invoiceId: string;
};

type Args = {
  reporter: any;
  browser: puppeteer.Browser;
  lastInvoiceDate: Moment;
  config: HuntConfig;
  downloadDir: string;
};

export class AguaHunter {
  private rowsToProcess: ProcessedRow[];
  private page: puppeteer.Page | undefined;

  private readonly downloadDir: string;

  protected readonly reporter: any;
  protected readonly locale: string;
  protected readonly lastInvoiceDate: Moment;
  protected readonly browser: puppeteer.Browser;
  protected readonly invoiceDateFormat: string;

  protected readonly routes: typeof AguaConfig.routes;
  protected readonly rootPath: typeof AguaConfig.baseRoute;
  protected readonly selectors: typeof AguaConfig.selectors;
  protected readonly pageLocale: typeof AguaConfig.locale;
  protected readonly pageDateFormat: typeof AguaConfig.dateFormat;
  protected readonly pageInvoiceExtension: typeof AguaConfig.invoiceExtension;
  protected readonly pageCredentials: { username: string; password: string };

  constructor({
    browser,
    config,
    reporter,
    downloadDir,
    lastInvoiceDate,
  }: Args) {
    this.locale = "en";
    this.rowsToProcess = [];

    this.browser = browser;
    this.reporter = reporter;
    this.downloadDir = path.join(downloadDir, "/agua/");

    this.pageCredentials = {
      username: config.username,
      password: config.password,
    };
    this.lastInvoiceDate = lastInvoiceDate;
    this.invoiceDateFormat = config.invoiceNameFormat ?? "DD-MM-YY";

    this.routes = AguaConfig.routes;
    this.selectors = AguaConfig.selectors;
    this.rootPath = AguaConfig.baseRoute;
    this.pageLocale = AguaConfig.locale;
    this.pageDateFormat = AguaConfig.dateFormat;
    this.pageInvoiceExtension = AguaConfig.invoiceExtension;
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

    this.print(`Found ${this.rowsToProcess.length} invoices`);
    this.reporter.printWithFilepath("Saving invoices to", this.downloadDir);
    const tick = this.reporter.progress(this.rowsToProcess.length);

    for (let i = 0; i < this.rowsToProcess.length; i++) {
      const row = this.rowsToProcess[i];
      if (i > 0) {
        // navigate to the previous page before downloading
        // for the first item we are already on the invoice page
        await this.page.goBack();
        await this.page.waitForSelector(this.selectors.invoices.listTable);
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
        this.print(e.message, "error");
      }

      tick();

      this.print(this.reporter.seperator, "log");
    }

    return { total: this.rowsToProcess.length, downloaded: downloadedCount };
  }

  private async navigateToInvoicesPage() {
    if (!this.page) {
      throw new Error("Page not initialized");
    }

    const link = await extractLinkFromAnchor(
      this.page,
      this.selectors.invoiceRouteButton
    );
    await this.page.goto(link);
    await this.page.waitForSelector(this.selectors.invoices.listTable);
  }

  private async findAndSetRowsToProcess(rows: ElementHandle[]): Promise<void> {
    this.rowsToProcess = await this.findRowsToProcess(rows);
  }

  private async findRowsToProcess(
    rows: ElementHandle[]
  ): Promise<ProcessedRow[]> {
    if (!this.page) {
      throw new Error("Page not initialized");
    }

    const result: ProcessedRow[] = [];
    const { listItems: rowsSelector } = this.selectors.invoices;

    for (let i = 0; i < rows.length; i++) {
      const currentRowSelector = `${rowsSelector}:nth-child(${i + 1})`;
      const date = await extractTextFromElement(
        this.page,
        `${currentRowSelector} ${this.selectors.invoices.dateCell}`
      );

      const currentDate = moment(
        date.trim(),
        this.pageDateFormat,
        this.pageLocale
      ).locale("en");

      if (this.lastInvoiceDate.isBefore(currentDate)) {
        const invoiceId = await extractTextFromElement(
          this.page,
          `${currentRowSelector} ${this.selectors.invoices.invoiceIdCell}`
        );
        result.push({
          invoiceId,
          selector: currentRowSelector,
          date: currentDate,
          rawDate: date.trim(),
        });
      }
    }

    return result;
  }

  private async processRowItem(row: ProcessedRow) {
    if (!this.page) {
      throw new Error("Page not initialized");
    }

    const { actionCell, actionButton } = this.selectors.invoices;
    const invoicePageLink = await extractLinkFromAnchor(
      this.page,
      `${row.selector} ${actionCell} ${actionButton}`
    );

    await this.page.goto(invoicePageLink);
    await this.page.waitForSelector(this.selectors.invoice.iframe);
    await this.saveInvoice(this.downloadDir, row);
  }

  private async saveInvoice(downloadPath: string, row: ProcessedRow) {
    if (!this.page) {
      throw new Error("Page not initialized");
    }

    const newFileName = `${row.date.format(this.invoiceDateFormat)}.${
      this.pageInvoiceExtension
    }`;
    const previousFileName = `${row.invoiceId}.${this.pageInvoiceExtension}`;

    const src = await extractSrcFromIframe(
      this.page,
      this.selectors.invoice.iframe
    );
    const url = new URL(src);
    // this changes watch mode to download mode
    url.searchParams.set("pdf_modo", "descargar");

    /** @ts-ignore */
    await this.page._client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath,
    });

    /// Downloading files like this is not supported in puppeter yet
    /// if we don't add a catch it, it will fail with the error:
    /// net::ERR_ABORTED at <url>
    await this.page.goto(url.toString()).catch((e) => null);
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

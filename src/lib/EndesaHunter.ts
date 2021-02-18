import fs from "fs-extra";
import moment, { Moment } from "moment";
import puppeteer, { ElementHandle } from "puppeteer";

import EndesaConfig from "../config/endesa-config";

///todo move to env file
const credentials = {
  username: "",
  password: "",
};

type ProcessedRow = { date: Moment; selector: string };

export class EndesaHunter {
  private rowsToProcess: ProcessedRow[];
  private page: puppeteer.Page | undefined;

  protected readonly locale: string;
  protected readonly lastInvoiceDate: Moment;
  protected readonly browser: puppeteer.Browser;

  protected readonly routes: typeof EndesaConfig.routes;
  protected readonly rootPath: typeof EndesaConfig.baseRoute;
  protected readonly selectors: typeof EndesaConfig.selectors;
  protected readonly pageLocale: typeof EndesaConfig.locale;
  protected readonly pageDateFormat: typeof EndesaConfig.dateFormat;
  protected readonly pageInvoiceName: typeof EndesaConfig.invoiceName;
  protected readonly pageInvoiceExtension: typeof EndesaConfig.invoiceExtension;

  constructor(browser: puppeteer.Browser, lastInvoiceDate: Moment) {
    this.locale = "en";
    this.browser = browser;
    this.rowsToProcess = [];
    this.lastInvoiceDate = lastInvoiceDate;

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
    await this.login();
    await this.downloadInvoices();
  }

  private async init() {
    this.page = await this.browser.newPage();
    await this.page.goto(this.rootPath);
  }

  private async login() {
    if (!this.page) {
      throw new Error("Missing init call");
    }

    await this.page.goto(this.rootPath + this.routes.login);

    await this.page.type(this.selectors.login.username, credentials.username);
    await this.page.type(this.selectors.login.password, credentials.password);

    await this.page.click(this.selectors.acceptCookiesButton);
    await this.page.click(this.selectors.login.submitButton);

    await this.page.waitForNavigation({ waitUntil: "networkidle0" });
    await this.page.waitForTimeout(2000);
  }

  private async downloadInvoices() {
    if (!this.page) {
      throw new Error("Missing init call");
    }

    await this.navigateToInvoicesPage();

    await this.findAndSetRowsToProcess(
      await this.page.$$(this.selectors.invoices.listItems)
    );

    if (!this.rowsToProcess.length) {
      //todo output or collect result count
      return;
    }

    for (let i = 0; i < this.rowsToProcess.length; i++) {
      if (i > 0) {
        // navigate to the invoice page before downloading
        // for the first item we are already on the invoice page
        await this.navigateToInvoicesPage();
      }

      await this.processRowItem(this.rowsToProcess[i]);
    }
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
    await this.saveInvoice(row.date.format("DD-MM-YY"));
  }

  private async saveInvoice(fileName: string) {
    const rootDir = "./temp/invoices/endesa";

    /** @ts-ignore */
    await this.page?._client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: rootDir,
    });

    await this.page?.waitForSelector(this.selectors.invoice.downloadButton);
    await this.page?.click(this.selectors.invoice.downloadButton);
    await this.page?.waitForTimeout(2000);

    await fs.rename(
      `${rootDir}/${this.pageInvoiceName}.${this.pageInvoiceExtension}`,
      `${rootDir}/${fileName}.${this.pageInvoiceExtension}`
    );
  }

  private async extracttDateFromRow(rowSelector: string): Promise<string> {
    return (await this.page?.$eval(
      `${rowSelector} ${this.selectors.invoices.dateCell}`,
      (e) => e.textContent
    )) as string;
  }
}

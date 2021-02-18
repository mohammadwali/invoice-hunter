import fs from "fs-extra";
import moment, { Moment } from "moment";
import puppeteer, { ElementHandle } from "puppeteer";

const basePath = "https://www.endesaclientes.com";

const routes = {
  login: "/login.html",
  invoices: "/oficina/mis-facturas.html",
};

const selectors = {
  login: {
    username: "#username",
    password: "#password",
    submitButton: "#loginButton",
  },
  invoices: {
    listTable: "#listado_luz-0",
    listItems: "#listado_luz-0 > tbody > tr",
    dateCell: "td:nth-child(1)",
    actionCell: "td:last-child",
    actionButton: "a[data-invoice-see-detail-open]",
  },
  invoice: {
    content: "#contenedor_detalles",
    downloadButton: "a.downloadBill",
  },
  languageBar: "#modulo-segmentador",
  languageBarItemEn: "#modulo-segmentador li:last-child",

  acceptCookiesButton: "#truste-consent-button",
};

///todo move to env file
const credentials = {
  username: "",
  password: "",
};

type ProcessedRow = {
  date: Moment;
  selector: string;
};

export class EndesaHunter {
  protected readonly rootPath: string;
  protected readonly dateLocale: string;
  protected readonly pageDateLocale: string;
  protected readonly pageDateFormat: string;
  protected readonly lastInvoiceDate: Moment;
  protected readonly browser: puppeteer.Browser;
  protected page: puppeteer.Page | undefined;
  private rowsToProcess: ProcessedRow[];

  constructor(browser: puppeteer.Browser, lastInvoiceDate: Moment) {
    this.browser = browser;
    this.rootPath = basePath;
    this.dateLocale = "en";
    this.pageDateLocale = "es";
    this.pageDateFormat = "DD MMM YYYY";
    this.lastInvoiceDate = lastInvoiceDate;
    this.rowsToProcess = [];
  }

  async run() {
    await this.init();
    await this.login();
    await this.downloadInvoices();
  }

  async init() {
    this.page = await this.browser.newPage();
    await this.page.goto(this.rootPath);
  }

  async login() {
    if (!this.page) {
      throw new Error("Missing init call");
    }

    await this.page.goto(basePath + routes.login);

    await this.page.type(selectors.login.username, credentials.username);
    await this.page.type(selectors.login.password, credentials.password);

    await this.page.click(selectors.acceptCookiesButton);
    await this.page.click(selectors.login.submitButton);

    await this.page.waitForNavigation({ waitUntil: "networkidle0" });
    await this.page.waitForTimeout(2000);
  }

  async navigateToInvoicesPage() {
    await this.page?.goto(basePath + routes.invoices);
    await this.page?.waitForSelector(selectors.invoices.listItems);
  }

  async downloadInvoices() {
    if (!this.page) {
      throw new Error("Missing init call");
    }

    await this.navigateToInvoicesPage();

    await this.findAndSetRowsToProcess(
      await this.page.$$(selectors.invoices.listItems)
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

  private async findAndSetRowsToProcess(rows: ElementHandle[]): Promise<void> {
    this.rowsToProcess = await this.findRowsToProcess(rows);
  }

  private async findRowsToProcess(
    rows: ElementHandle[]
  ): Promise<ProcessedRow[]> {
    const result: ProcessedRow[] = [];
    const { listItems: rowsSelector } = selectors.invoices;

    for (let i = 0; i < rows.length; i++) {
      const currentRowSelector = `${rowsSelector}:nth-child(${i + 1})`;
      let date = await this.extracttDateFromRow(currentRowSelector);

      const currentDate = moment(
        date.trim(),
        this.pageDateFormat,
        this.pageDateLocale
      ).locale(this.dateLocale);

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
    const { actionCell, actionButton } = selectors.invoices;
    await this.page?.click(`${row.selector} ${actionCell} ${actionButton}`);
    await this.page?.waitForSelector(selectors.invoice.content, {
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

    await this.page?.waitForSelector(selectors.invoice.downloadButton);
    await this.page?.click(selectors.invoice.downloadButton);
    await this.page?.waitForTimeout(2000);

    await fs.rename(`${rootDir}/factura.pdf`, `${rootDir}/${fileName}.pdf`);
  }

  private async extracttDateFromRow(rowSelector: string): Promise<string> {
    return (await this.page?.$eval(
      `${rowSelector} ${selectors.invoices.dateCell}`,
      (e) => e.textContent
    )) as string;
  }
}
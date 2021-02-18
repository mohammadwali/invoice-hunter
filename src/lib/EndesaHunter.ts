import fs from "fs-extra";
import moment, { Moment } from "moment";
import puppeteer from "puppeteer";

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

export class EndesaHunter {
  protected readonly rootPath: string;
  protected readonly dateLocale: string;
  protected readonly pageDateLocale: string;
  protected readonly pageDateFormat: string;
  protected readonly lastInvoiceDate: Moment;
  protected readonly browser: puppeteer.Browser;
  protected page: puppeteer.Page | undefined;

  constructor(browser: puppeteer.Browser, lastInvoiceDate: Moment) {
    this.browser = browser;
    this.rootPath = basePath;
    this.dateLocale = "en";
    this.pageDateLocale = "es";
    this.pageDateFormat = "DD MMM YYYY";
    this.lastInvoiceDate = lastInvoiceDate;
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

  async downloadInvoices() {
    if (!this.page) {
      throw new Error("Missing init call");
    }

    await this.page.goto(basePath + routes.invoices);

    const {
      actionCell,
      actionButton,
      listItems: rowsSelector,
    } = selectors.invoices;

    await this.page.waitForSelector(rowsSelector);
    const rows = await this.page.$$(rowsSelector);

    for (let i = 0; i < rows.length; i++) {
      const currentRowSelector = `${rowsSelector}:nth-child(${i + 1})`;
      let date = await this.getDateFromRow(currentRowSelector);

      const currentDate = moment(
        date.trim(),
        this.pageDateFormat,
        this.pageDateLocale
      ).locale(this.dateLocale);

      if (this.lastInvoiceDate.isBefore(currentDate)) {
        await this.page.click(
          `${currentRowSelector} ${actionCell} ${actionButton}`
        );
        await this.page.waitForSelector(selectors.invoice.content, {
          visible: true,
        });

        await this.downloadInvoice(currentDate.format("DD-MM-YY"));
      }
    }
  }

  async downloadInvoice(fileName: string) {
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

  private async getDateFromRow(currentRowSelector: string): Promise<string> {
    if (!this.page) return "";

    return (await this.page.$eval(
      `${currentRowSelector} ${selectors.invoices.dateCell}`,
      (e) => e.textContent
    )) as string;
  }
}

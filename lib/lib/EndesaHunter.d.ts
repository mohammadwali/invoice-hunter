import puppeteer from "puppeteer";
export declare class EndesaHunter {
    protected rootPath: string;
    protected browser: puppeteer.Browser;
    protected page: puppeteer.Page | undefined;
    constructor(browser: puppeteer.Browser);
    run(): Promise<void>;
    init(): Promise<void>;
    login(): Promise<void>;
    downloadInvoices(): Promise<void>;
    swithPageToEnglish(): Promise<void>;
}

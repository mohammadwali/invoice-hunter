import puppeteer from "puppeteer";
export declare class Hunter {
    protected steps: any;
    protected browser: puppeteer.Browser;
    constructor(browser: puppeteer.Browser);
    run(): Promise<void>;
    huntEndesa(): Promise<void>;
    huntAgua(): Promise<void>;
}

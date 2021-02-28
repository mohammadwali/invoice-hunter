import puppeteer from "puppeteer";

export const extractTextFromElement = async (
  page: puppeteer.Page,
  selector: string
): Promise<string> => {
  return (await page.$eval(selector, (e) => e.textContent)) as string;
};

export const extractLinkFromAnchor = async (
  page: puppeteer.Page,
  selector: string
): Promise<string> => {
  let link = "";

  try {
    link = (await page.$$eval(
      selector,
      (el) => el.map((x) => x.getAttribute("href"))[0]
    )) as string;
  } catch (e) {
    e.message = "Failed to extact link for: " + selector + " " + e.message;
    throw e;
  }

  return link;
};

export const extractSrcFromIframe = async (
  page: puppeteer.Page,
  selector: string
): Promise<string> => {
  let src = "";

  try {
    src = (await page.$$eval(
      selector,
      (el) => el.map((x) => x.getAttribute("src"))[0]
    )) as string;
  } catch (e) {
    e.message =
      "Failed to extact iframe src for: " + selector + " " + e.message;
    throw e;
  }

  return src;
};

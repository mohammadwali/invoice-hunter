import figlet from "figlet";
import { magenta, red } from "kleur";

import { ConsoleMessage } from "../models/console-message";

const newLine = "\n";

export const logTitleAndBanner = (): void => {
  console.log(magenta(figlet.textSync(ConsoleMessage.TITLE)));
  console.info(magenta(ConsoleMessage.BANNER), newLine);
};

export const logConfigNotFound = (): void => {
  logError(ConsoleMessage.CONFIG_NOT_FOUND);
};

export const logUnkwonError = (): void => {
  logError(ConsoleMessage.UNKOWON_ERROR);
};

export const logError = (message: string): void => {
  console.log(red(ConsoleMessage.ERROR), message, newLine);
};

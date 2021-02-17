import figlet from "figlet";
import { magenta } from "kleur";

import { ConsoleMessage } from "../models/console-message";

const newLine = "\n";

export const logTitleAndBanner = (): void => {
  console.log(magenta(figlet.textSync(ConsoleMessage.TITLE)));
  console.info(magenta(ConsoleMessage.BANNER));
};

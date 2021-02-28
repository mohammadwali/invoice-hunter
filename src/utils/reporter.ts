import figlet from "figlet";
import emoji from "node-emoji";
import yurnalist from "yurnalist";
import { green, magenta } from "kleur";
import { stdout } from "process";

const Messages = {
  title: "invoice-hunter",
  banner:
    "CLI to extract utility invoices and upload to the google drive folder",
  configNotFound: "Config file not found",
  unkownError: "Something wen't wrong",
};
const report = yurnalist.createReporter({
  useMessageSymbols: true,
});

export const printHeader = () => {
  report.log(magenta(figlet.textSync(Messages.title)));
  report.log(magenta(Messages.banner));
};

export const printFooter = () => {
  report.footer();
};

export const printConfigNotFound = (): void => {
  report.error(Messages.configNotFound);
};

export const printUnkwonError = (): void => {
  report.error(Messages.unkownError);
};

export const getModulePrefix = (name: string): string => {
  return green(`[${name}]`);
};

export const printStep = (
  current: number,
  total: number,
  msg: string,
  emojiName: string = "",
  margin?: "after" | "before"
): void => {
  if (margin === "before") {
    report.log("");
  }

  report.step(current, total, msg, emoji.get(emojiName));

  if (margin === "after") {
    report.log("");
  }
};

const printWithFilepath = (
  message: string,
  path: string,
  type: "info" | "warning" | "error" | "success" = "info"
): void => {
  report[type](`${message} ${green(path)}`);
};

report.seperator = "-".repeat(45);
report.getEmoji = emoji.get;
report.printStep = printStep;
report.getModulePrefix = getModulePrefix;
report.printWithFilepath = printWithFilepath;

export default report;

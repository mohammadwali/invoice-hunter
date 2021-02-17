"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTitleAndBanner = void 0;
var figlet_1 = __importDefault(require("figlet"));
var kleur_1 = require("kleur");
var console_message_1 = require("../models/console-message");
var newLine = "\n";
var logTitleAndBanner = function () {
    console.log(kleur_1.magenta(figlet_1.default.textSync(console_message_1.ConsoleMessage.TITLE)));
    console.info(kleur_1.magenta(console_message_1.ConsoleMessage.BANNER));
};
exports.logTitleAndBanner = logTitleAndBanner;

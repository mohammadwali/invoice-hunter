"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndesaHunter = void 0;
var moment_1 = __importDefault(require("moment"));
var basePath = "https://www.endesaclientes.com";
var routes = {
    login: "/login.html",
    invoices: "/oficina/mis-facturas.html",
};
var selectors = {
    login: {
        username: "#username",
        password: "#password",
        submitButton: "#loginButton",
    },
    invoices: {
        listTable: "#listado_luz-0",
        listItems: "#listado_luz-0 > tbody > tr",
    },
    languageBar: "#modulo-segmentador",
    languageBarItemEn: "#modulo-segmentador li:last-child",
    acceptCookiesButton: "#truste-consent-button",
};
///todo move to env file
var credentials = {
    username: "mohdwali.es@gmail.com",
    password: "k2b1k2b1",
};
var EndesaHunter = /** @class */ (function () {
    function EndesaHunter(browser) {
        this.browser = browser;
        this.rootPath = basePath;
    }
    EndesaHunter.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.login()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.downloadInvoices()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    EndesaHunter.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.browser.newPage()];
                    case 1:
                        _a.page = _b.sent();
                        return [4 /*yield*/, this.page.goto(this.rootPath)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    EndesaHunter.prototype.login = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.page) {
                            throw new Error("Missing init call");
                        }
                        return [4 /*yield*/, this.page.goto(basePath + routes.login)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.page.type(selectors.login.username, credentials.username)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.page.type(selectors.login.password, credentials.password)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.page.click(selectors.acceptCookiesButton)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.page.click(selectors.login.submitButton)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.page.waitForNavigation({ waitUntil: "networkidle0" })];
                    case 6:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    EndesaHunter.prototype.downloadInvoices = function () {
        return __awaiter(this, void 0, void 0, function () {
            var afterDate, rowsSelector, rows, i, date;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.page) {
                            throw new Error("Missing init call");
                        }
                        return [4 /*yield*/, this.swithPageToEnglish()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.page.goto(basePath + routes.invoices)];
                    case 2:
                        _a.sent();
                        afterDate = moment_1.default("12-01-2020", "MM-DD-YYYY");
                        rowsSelector = selectors.invoices.listItems;
                        return [4 /*yield*/, this.page.waitForSelector(rowsSelector)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.page.$$(rowsSelector)];
                    case 4:
                        rows = _a.sent();
                        i = 0;
                        _a.label = 5;
                    case 5:
                        if (!(i < rows.length)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.page.$eval(rowsSelector + ":nth-child(" + (i + 1) + ") td:nth-child(1)", function (e) { return e.textContent; })];
                    case 6:
                        date = _a.sent();
                        date = date.trim();
                        if (afterDate.isBefore(moment_1.default(date, "DD MMM YYYY", "es").locale("en"))) {
                            console.log("Found match => " + date);
                        }
                        _a.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 5];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    EndesaHunter.prototype.swithPageToEnglish = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.page) {
                            throw new Error("Missing init call");
                        }
                        return [4 /*yield*/, this.page.click(selectors.languageBarItemEn)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.page.waitForTimeout(4000)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.page.waitForSelector(".op-head__logo-link")];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return EndesaHunter;
}());
exports.EndesaHunter = EndesaHunter;

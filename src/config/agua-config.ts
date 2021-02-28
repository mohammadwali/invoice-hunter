const locale = "es";
const dateFormat = "DD/MM/YYYY";
const invoiceExtension = "pdf";

const baseRoute = "https://www.aiguesdebarcelona.cat";
const routes = {
  login: "/oficinaenxarxa/ca/web/ofex",

};
const selectors = {
  login: {
    username: "#user-id",
    password: "#user-password",
    submitButton: "#user-login_particular button[type=submit]",
  },
  invoices: {
    listTable: "#taula_factures",
    listItems: "#taula_factures > tbody > tr",
    invoiceIdCell: "td:nth-child(1)",
    dateCell: "td:nth-child(3)",
    actionCell: "td:nth-child(8)",
    actionButton: "a.tf_down",
  },
  invoice: {
    iframe: ".container iframe",
  },
  invoiceRouteButton: "#header_consultes > a",
  acceptCookiesButton: ".cookie-button-wrapper > .close-popup",
};

export default {
  locale,
  routes,
  baseRoute,
  selectors,
  dateFormat,
  invoiceExtension,
};

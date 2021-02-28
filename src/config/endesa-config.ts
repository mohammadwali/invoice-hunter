const locale = "es";
const dateFormat = "DD MMM YYYY";
const invoiceName = "factura";
const invoiceExtension = "pdf";

const baseRoute = "https://www.endesaclientes.com";
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

export default {
  locale,
  routes,
  baseRoute,
  selectors,
  dateFormat,
  invoiceName,
  invoiceExtension,
};

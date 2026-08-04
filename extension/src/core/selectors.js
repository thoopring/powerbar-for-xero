// Central DOM selector registry (HANDOFF §4: single file to touch when Xero
// ships a UI refresh).
//
// Source: capture of Demo Company (AU), 2026-08-04, Xero "blue navigation"
// shell. See docs/SELECTOR-FINDINGS.md for the evidence behind each entry.
//
// Rules:
//  - Only stable attributes. Xero's class names are generated (`xui-W_ekyij8yU`)
//    and change per build; ids like `#sales-sub-nav` and `data-automationid`
//    values are part of their component contracts and survive rebuilds.
//  - A module MUST treat a null lookup as "Xero changed" and do nothing.
//  - Anything still marked PLACEHOLDER has not been observed yet.
"use strict";

XT.selectors = {
  // Top navigation. Same component on both the modern app shell and the legacy
  // .aspx pages, so one set of selectors covers everything.
  nav: {
    // Legacy pages expose <nav id="wac-top-panel">; the app shell wraps the
    // same markup in #shell-nav. Match either.
    bar: "#wac-top-panel, #shell-nav",
    primaryList: 'ul[aria-label="Primary navigation items"]',

    // Top-level items. Each <li aria-label="X"> holds a <button> trigger plus
    // its (pre-rendered, hidden) panel.
    item: (label) => `li[aria-label="${label}"]`,
    trigger: (panelId) => `button[aria-controls="${panelId}"]`,
  },

  // Dropdown panels. Xero renders every panel into the DOM up front and hides
  // it with a class, so we can inject into them without opening the menu.
  panels: {
    sales: "#sales-sub-nav",
    purchases: "#purchases-sub-nav",
    reporting: "#reporting-sub-nav",
    payroll: "#payroll-sub-nav",
    accounting: "#accounting-sub-nav",
    tax: "#tax-sub-nav",
    contacts: "#contacts-sub-nav",
    projects: "#projects-sub-nav",
    create: "#create-menu-list",
    user: "#user-menu-list",
    hiddenClass: "x-nav--sub-nav-container-hidden",
    // Menu items are <li> in a <ul aria-label="<Section> sub-menu">.
    listOf: (section) => `ul[aria-label="${section} sub-menu"]`,
    // Existing items we anchor injected ones next to, matched by their href.
    itemByHref: (fragment) => `a[href*="${fragment}"]`,
  },

  // Help / onboarding noise (module: popup-dismiss). Xero renders these as
  // named banners, so we can target them precisely instead of nuking popovers.
  noise: {
    banners: [
      '[data-automationid="OnboardingSettingsBanner"]',
      '[data-automationid="StartStripeSetupBanner-banner"]',
    ],
    // PLACEHOLDER: product tours / coach marks were not present in the capture.
    tours: [],
  },

  // Bank account widgets (module: reconcile-menu). Present on the bank accounts
  // page and, in a different wrapper, on the dashboard. We read the account
  // list off whichever page the user happens to open.
  bank: {
    widget: '[data-automationid="bankWidget"]',
    widgetName: '[data-automationid="bankWidgetHeader"]',
    reconcileLink: '[data-automationid="reconcileBankItems"]',
    // The dashboard's task list links to the same place with a different
    // wrapper, so harvest by href there.
    anyReconcileHref: 'a[href*="/BankRec/BankRec.aspx"]',
  },

  // Invoice screens (module: invoice-filename, Pro).
  invoice: {
    pageHeader: '[data-automationid="PageHeader"]',
    title: '[data-automationid="PageHeader--title"]',   // "Invoice ORC1042"
    statusTag: '[data-automationid="PageHeader--tag"]', // "Awaiting payment"
    printButton: '[data-automationid="PrintDropdown-print"]',
    printMenuTrigger: '[data-automationid="PrintDropdown-dropdown-trigger"]',
    previewButton: '[data-automationid="PreviewButton"]',
    previewModal: '[data-automationid="documentPreviewModal"]',
    // Inside the preview modal. No stable attribute of its own, so scope by
    // the modal and match on its label.
    downloadInModal: "button",
    // Xero gives the "Contact" caption a stable id but not the name itself.
    // The name is the sibling <button> right after the caption:
    //   <div data-automationid="contacts-picker-read-only--label">Contact</div>
    //   <button type="button">Ridgeway University</button>
    //   <section aria-label="Contact address">No address</section>
    // Reading the caption's parent instead would swallow the address too.
    contactLabel: '[data-automationid="contacts-picker-read-only--label"]',
    contactAddress: 'section[aria-label="Contact address"]',
  },

};

// Known Xero URL patterns modules key off. Xero mixes a modern app shell
// (/app/<org>/...) with legacy WebForms pages (*.aspx); both are in daily use.
XT.routes = {
  isDashboard: (path) => /\/app\/[^/]+\/homepage|\/Dashboard/i.test(path),
  isInvoiceView: (path) => /\/app\/[^/]+\/invoicing\/view\//i.test(path),
  isInvoiceEdit: (path) => /\/app\/[^/]+\/invoicing\/edit\//i.test(path),
  isBillsList: (path) => /\/app\/[^/]+\/bills\/list\//i.test(path),
  isReconcile: (path) => /\/BankRec\/BankRec/i.test(path),
  // Pages that list bank accounts, and so can be harvested for the reconcile
  // menu.
  hasBankAccounts: (path) =>
    /\/app\/[^/]+\/manage-bank-accounts|\/app\/[^/]+\/homepage|\/Dashboard/i.test(path),

  // App routes are org-scoped ("/app/!kS9mR/bills"). Read the code off a nav
  // link rather than hardcoding it — it differs per organisation, and users
  // switch orgs without a full page load.
  orgCode() {
    const a = document.querySelector('a[href*="/app/!"]');
    return a ? (/\/app\/(![^/]+)\//.exec(a.getAttribute("href")) || [])[1] || null : null;
  },

  app(pathAfterOrg) {
    const org = this.orgCode();
    return org ? `/app/${org}/${pathAfterOrg}` : `/app/${pathAfterOrg}`;
  },
};

// Confirmed status-filter URLs (verified against dashboard widget links).
// Receivables/payables lists are legacy pages and take a query param; bills
// have a modern org-scoped route with path segments.
XT.urls = {
  invoicesByStatus: {
    Draft: "/AccountsReceivable/Search.aspx?invoiceStatus=INVOICESTATUS%2FDRAFT",
    "Awaiting approval": "/AccountsReceivable/Search.aspx?invoiceStatus=INVOICESTATUS%2FSUBMITTED",
    "Awaiting payment": "/AccountsReceivable/Search.aspx?invoiceStatus=INVOICESTATUS%2FAUTHORISED",
    Paid: "/AccountsReceivable/Search.aspx?invoiceStatus=INVOICESTATUS%2FPAID",
    Repeating: "/AccountsReceivable/Repeating.aspx",
  },
  billsByStatus: {
    Draft: "bills/list/draft",
    "Awaiting approval": "bills/list/awaiting-approval",
    "Awaiting payment": "bills/list/awaiting-payment",
    Paid: "bills/list/paid",
    Repeating: "bills/list/repeating",
  },
  settings: {
    financial: "/Setup/FinancialSettings.aspx",
    chartOfAccounts: "/GeneralLedger/ChartOfAccounts.aspx",
  },
  // Customer statements — the 174-vote request. Reachable only via Sales
  // overview -> Send statements today, which is exactly why people asked for a
  // menu entry.
  statements: "/AccountsReceivable/Statements.aspx",

  // Xero's default invoice PDF name, confirmed against a real download
  // ("Invoice ORC01025.pdf"). Used to recognise the file we're renaming.
  defaultInvoicePdf: /^Invoice\s+\S+\.pdf$/i,
};

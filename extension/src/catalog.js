// Static module catalog for extension pages (options/popup), which can't see
// the content-script XT registry. Keep ids/titles in sync with src/modules/*.
"use strict";

const XT_CATALOG = [
  { id: "statements-menu", tier: "free", title: "Statements menu item" },
  { id: "purchases-submenu", tier: "free", title: "Purchases status submenu" },
  { id: "sales-submenu", tier: "free", title: "Sales status submenu" },
  { id: "popup-dismiss", tier: "free", title: "Hide help & onboarding popups" },
  { id: "favorites-bar", tier: "free", title: "Favorites bar" },
  { id: "settings-shortcuts", tier: "free", title: "Settings shortcuts" },
  { id: "reconcile-menu", tier: "free", title: "Reconcile shortcuts in menu" },
  {
    id: "invoice-filename",
    tier: "pro",
    title: "Custom invoice PDF filenames",
    needsDownloads: true,
  },
];

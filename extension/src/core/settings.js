// Settings: per-module enable flags + user prefs, in chrome.storage.sync.
// Kill switch: remote disable flags cached in chrome.storage.local by the
// service worker (see background.js). A module runs only if
// (user enabled) AND (not remotely killed) AND (tier gate passes).
"use strict";

XT.settings = {
  DEFAULTS: {
    // module id -> enabled by default. All Free modules on by default so the
    // 10-second rule holds (HANDOFF §5-2: value visible with zero setup).
    "statements-menu": true,
    "purchases-submenu": true,
    "sales-submenu": true,
    "popup-dismiss": true,
    "favorites-bar": true,
    "settings-shortcuts": true,
    "reconcile-menu": true,
    "invoice-filename": true, // Pro — defaults on; the licence gate decides
    // user prefs
    favorites: [],                // [{label, url}]
    filenameTemplate: "{number} - {contact}.pdf",
  },

  async load() {
    const [sync, local] = await Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get("killswitch"),
    ]);
    return {
      ...this.DEFAULTS,
      ...sync,
      _killswitch: (local.killswitch && local.killswitch.disabled) || [],
    };
  },

  async set(patch) {
    await chrome.storage.sync.set(patch);
  },

  onChange(cb) {
    chrome.storage.onChanged.addListener(cb);
  },
};

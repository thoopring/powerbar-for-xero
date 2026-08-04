// Pro gating, read side. The service worker owns activation and revalidation
// (background.js); content scripts only read the verdict it stored.
//
// The rules themselves live in core/license-rules.js so both sides agree on
// what "still paid" means, including the offline grace window.
"use strict";

XT.license = {
  async status() {
    const { license } = await chrome.storage.local.get("license");
    return XT_LICENSE_RULES.standing(license);
  },
};

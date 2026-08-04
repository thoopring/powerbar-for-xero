// Pro gating via Lemon Squeezy license keys (HANDOFF §4).
// No server of ours: the key is validated directly against the LS License API
// (api.lemonsqueezy.com is CORS-enabled for client-side activation/validation).
// Validation itself happens in background.js; content scripts only read the
// cached verdict. Offline grace: 7 days from last successful validation.
//
// STATUS: stub — LS store/product IDs pending (owner creates the LS product).
"use strict";

XT.license = {
  GRACE_MS: 7 * 24 * 60 * 60 * 1000,

  // Returns { pro: boolean, reason: "valid"|"grace"|"none"|"expired" }.
  async status() {
    const { license } = await chrome.storage.local.get("license");
    if (!license || !license.key) return { pro: false, reason: "none" };
    if (license.valid && Date.now() - license.checkedAt < this.GRACE_MS) {
      return { pro: true, reason: license.fresh ? "valid" : "grace" };
    }
    return { pro: false, reason: "expired" };
  },
};

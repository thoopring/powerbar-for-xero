// Pure decision logic for licence responses. Kept apart from the network code
// so it can be tested without touching Lemon Squeezy — this is the code that
// decides whether someone gets a paid feature, so it should be the best-tested
// thing in the extension.
//
// Loaded by the service worker via importScripts and by the test harness via
// <script>.
"use strict";

const XT_LICENSE_RULES = {
  GRACE_MS: 7 * 24 * 60 * 60 * 1000,

  // Turn a Lemon Squeezy activate/validate response into a verdict.
  // Returns { ok, reason, status, expiresAt, activationLimit, activationUsage }.
  verdict(res, config) {
    if (!config || config.storeId == null || config.productId == null) {
      // Refusing to grant Pro when unconfigured is the safe default: the
      // alternative is that any Lemon Squeezy key from any seller unlocks it.
      return { ok: false, reason: "not-configured" };
    }
    if (!res || typeof res !== "object") return { ok: false, reason: "no-response" };
    if (res.error) return { ok: false, reason: "rejected", message: res.error };

    // activate returns `activated`, validate returns `valid`.
    const accepted = res.activated === true || res.valid === true;
    if (!accepted) return { ok: false, reason: "rejected", message: res.error || "not valid" };

    const meta = res.meta || {};
    if (Number(meta.store_id) !== Number(config.storeId)) {
      return { ok: false, reason: "wrong-store" };
    }
    if (Number(meta.product_id) !== Number(config.productId)) {
      return { ok: false, reason: "wrong-product" };
    }

    const key = res.license_key || {};
    if (key.status && key.status !== "active") {
      return { ok: false, reason: `key-${key.status}` };
    }
    if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
      return { ok: false, reason: "key-expired" };
    }
    if (res.test_mode === true && !config.allowTestMode) {
      return { ok: false, reason: "test-key" };
    }

    return {
      ok: true,
      reason: "valid",
      status: key.status || "active",
      expiresAt: key.expires_at || null,
      activationLimit: key.activation_limit ?? null,
      activationUsage: key.activation_usage ?? null,
    };
  },

  // Whether a stored licence still counts, given we may be offline. Revalidation
  // failures must not lock a paying customer out mid-job, so a previously good
  // licence keeps working for a week.
  // Returns { pro, reason: "valid" | "grace" | "expired" | "none" }.
  standing(stored, now = Date.now()) {
    if (!stored || !stored.key) return { pro: false, reason: "none" };
    if (!stored.ok) return { pro: false, reason: stored.reason || "invalid" };
    const age = now - (stored.checkedAt || 0);
    if (stored.fresh && age < this.GRACE_MS) return { pro: true, reason: "valid" };
    if (age < this.GRACE_MS) return { pro: true, reason: "grace" };
    return { pro: false, reason: "expired" };
  },

  // Revalidate roughly daily. More often wastes requests; less often lets a
  // cancelled subscription linger.
  needsRecheck(stored, now = Date.now()) {
    if (!stored || !stored.key) return false;
    return now - (stored.checkedAt || 0) > 24 * 60 * 60 * 1000;
  },
};

if (typeof globalThis !== "undefined") globalThis.XT_LICENSE_RULES = XT_LICENSE_RULES;

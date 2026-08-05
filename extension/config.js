// Lemon Squeezy wiring. The only file that changes between test and live.
//
// Fill these in from the Lemon Squeezy dashboard after creating the store and
// product (docs/LEMONSQUEEZY.md §1-2), then reload the extension.
//
// STORE_ID and PRODUCT_ID are checked against every licence key. Without them
// any valid Lemon Squeezy key from any seller would unlock Pro, so the
// extension refuses to grant Pro while they are unset.
"use strict";

const XT_CONFIG = {
  // Settings → General → Store ID (a number).
  storeId: 445289,

  // Product page → the product's ID (a number). Both variants (monthly and
  // yearly) share it, which is why the variant is not pinned — pinning it
  // would reject a yearly customer the day that variant is added.
  productId: 1266641,

  // Products → the product → Share → checkout link.
  checkoutUrl:
    "https://powerbar.lemonsqueezy.com/checkout/buy/c5a512cd-4190-471d-b5cf-ec1db44ae484",

  // Lemon Squeezy issues test-mode keys against the same API; they simply
  // report test_mode. Off since the store went live (2026-08-05): leaving it
  // on would let anyone unlock Pro with a free test-mode key.
  //
  // Turn it back on ONLY for local verification, and put it back before
  // packaging. The boot warning below exists so a slip is noisy.
  allowTestMode: false,
};

// Service worker (importScripts) and extension pages (<script>) both load this.
if (typeof globalThis !== "undefined") globalThis.XT_CONFIG = XT_CONFIG;

// Shipping with test mode on would let anyone unlock Pro with a free
// test-mode key. It is one boolean and easy to forget, so it says so loudly
// rather than failing quietly in a paying customer's favour.
if (XT_CONFIG.allowTestMode) {
  console.warn(
    "[XT] allowTestMode is ON — test-mode licence keys will unlock Pro. " +
      "Set it to false in extension/config.js before publishing."
  );
}

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
  // report test_mode. Set true while filming and verifying so a test key is
  // accepted, and false before the extension is published.
  allowTestMode: true,
};

// Service worker (importScripts) and extension pages (<script>) both load this.
if (typeof globalThis !== "undefined") globalThis.XT_CONFIG = XT_CONFIG;

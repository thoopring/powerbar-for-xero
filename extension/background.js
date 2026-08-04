// Service worker: kill-switch refresh + Lemon Squeezy license validation.
// Both are plain fetches to CORS-enabled endpoints, so no extra host
// permissions are required (trust story: xero.com is the ONLY host permission).
"use strict";

// Remote kill-switch: a static JSON file, shape { "disabled": ["module-id"] }.
// Served from the public repo so anyone can see exactly what this fetches.
const KILLSWITCH_URL =
  "https://raw.githubusercontent.com/thoopring/powerbar-for-xero/main/killswitch.json";
const KILLSWITCH_TTL_MS = 6 * 60 * 60 * 1000; // refresh at most every 6h

async function refreshKillswitch() {
  const { killswitch } = await chrome.storage.local.get("killswitch");
  if (killswitch && Date.now() - killswitch.fetchedAt < KILLSWITCH_TTL_MS) return;
  if (KILLSWITCH_URL.includes("PLACEHOLDER")) return; // not wired up yet
  try {
    const res = await fetch(KILLSWITCH_URL, { cache: "no-cache" });
    if (!res.ok) return;
    const data = await res.json();
    await chrome.storage.local.set({
      killswitch: { disabled: data.disabled || [], fetchedAt: Date.now() },
    });
  } catch {
    // Offline / blocked: keep last cached state. Fail open.
  }
}

// Lemon Squeezy license validation. STUB: store/product IDs pending (owner).
// Docs: POST https://api.lemonsqueezy.com/v1/licenses/validate (CORS-enabled).
async function validateLicense(key) {
  if (!key) {
    await chrome.storage.local.remove("license");
    return { valid: false };
  }
  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ license_key: key }),
    });
    const data = await res.json();
    const valid = !!data.valid; // TODO: also pin store_id/product_id once created
    await chrome.storage.local.set({
      license: { key, valid, fresh: true, checkedAt: Date.now() },
    });
    return { valid };
  } catch {
    // Network failure: mark stale but keep prior verdict for the grace window.
    const { license } = await chrome.storage.local.get("license");
    if (license && license.key === key) {
      await chrome.storage.local.set({ license: { ...license, fresh: false } });
      return { valid: license.valid };
    }
    return { valid: false, offline: true };
  }
}

// --- invoice PDF renaming (Pro, module invoice-filename) -------------------
//
// The content script publishes what invoice is on screen; we rewrite the
// filename when the download fires.
//
// Kept in chrome.storage.session, NOT a variable: an MV3 service worker is
// evicted after ~30 seconds idle, and reading an invoice then clicking Print
// PDF easily spans that. An in-memory context is gone by the time the download
// starts, which looks exactly like the feature silently not working. Session
// storage clears itself when the browser closes and never touches disk.
const CONTEXT_KEY = "invoiceContext";

function applyTemplate(template, fields) {
  const name = template.replace(/\{(\w+)\}/g, (_, k) => (fields[k] ?? "").trim());
  // Strip characters Windows rejects, or the download silently fails.
  return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function registerDownloadListener() {
  if (!chrome.downloads?.onDeterminingFilename) return;
  if (chrome.downloads.onDeterminingFilename.hasListener(onDeterminingFilename)) return;
  chrome.downloads.onDeterminingFilename.addListener(onDeterminingFilename);
}

// Xero's own name for an invoice PDF, e.g. "Invoice ORC01025.pdf" (confirmed
// against a real download). The optional counter is Chrome's, added when the
// file already exists. Capturing the number lets us verify the context belongs
// to this download rather than to whatever invoice was open last.
const XERO_INVOICE_PDF = /^Invoice\s+([^\s()]+)(?:\s*\(\d+\))?\.pdf$/i;

function onDeterminingFilename(item, suggest) {
  const base = (item.filename || "").split(/[\\/]/).pop();
  const match = XERO_INVOICE_PDF.exec(base);
  if (!match) return false;
  if (!/xero\.com/i.test(item.url || "") && !/xero\.com/i.test(item.referrer || "")) return false;
  const downloadedNumber = match[1];

  // Returning true parks the download until suggest() is called, which is what
  // lets us read the context back out of storage.
  chrome.storage.session.get(CONTEXT_KEY).then(({ [CONTEXT_KEY]: ctx }) => {
    const why = !ctx
      ? "no invoice page has reported in yet"
      : !ctx.contact
        ? "the contact name could not be read on the invoice page"
        : ctx.number !== downloadedNumber
          ? `last invoice seen was ${ctx.number}, this download is ${downloadedNumber}`
          : null;
    if (why) {
      console.warn(`[XT] keeping Xero's filename: ${why}`);
      suggest();
      return;
    }
    const name = applyTemplate(ctx.template || "{number} - {contact}.pdf", ctx);
    if (!name || name === ".pdf") {
      suggest();
      return;
    }
    suggest({ filename: /\.pdf$/i.test(name) ? name : `${name}.pdf` });
  });
  return true;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "killswitch:refresh") {
    refreshKillswitch().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "license:validate") {
    validateLicense(msg.key).then(sendResponse);
    return true;
  }
  // Content scripts have no chrome.permissions, so they ask through here.
  if (msg?.type === "permissions:has") {
    chrome.permissions
      .contains({ permissions: msg.permissions || [] })
      .then((granted) => sendResponse({ granted }))
      .catch(() => sendResponse({ granted: false }));
    return true;
  }
  if (msg?.type === "invoice:context") {
    const write = msg.context
      ? chrome.storage.session.set({ [CONTEXT_KEY]: msg.context })
      : chrome.storage.session.remove(CONTEXT_KEY);
    write.then(() => {
      if (msg.context) registerDownloadListener();
      sendResponse({ ok: true });
    });
    return true;
  }
});

// The permission can be granted from the options page while the worker is
// asleep, so re-attach on every wake.
chrome.permissions.onAdded?.addListener(registerDownloadListener);
registerDownloadListener();

chrome.runtime.onInstalled.addListener(() => refreshKillswitch());
chrome.runtime.onStartup.addListener(() => refreshKillswitch());

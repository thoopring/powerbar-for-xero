// Service worker: kill-switch refresh + Lemon Squeezy license validation.
// Both are plain fetches to CORS-enabled endpoints, so no extra host
// permissions are required (trust story: xero.com is the ONLY host permission).
"use strict";

importScripts("config.js", "src/core/license-rules.js");

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

// --- Lemon Squeezy licensing -------------------------------------------------
//
// Three endpoints: activate claims one of the licence's activation slots and
// returns an instance id; validate re-checks that instance; deactivate frees
// the slot. Activating (rather than only validating) is what makes the
// "3 browsers" limit real.
//
// Requests are form-encoded on purpose. A JSON content type would trigger a
// CORS preflight that the Lemon Squeezy API does not need to answer, and a
// failed preflight looks exactly like a rejected licence.
const LS_API = "https://api.lemonsqueezy.com/v1/licenses";

async function lsPost(path, fields) {
  const res = await fetch(`${LS_API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(fields).toString(),
  });
  // Rejections come back as 400 with a JSON body, so parse either way.
  return res.json();
}

function instanceName() {
  // Shown in the customer's Lemon Squeezy licence page so they can tell which
  // activation to release.
  const ua = navigator.userAgent || "";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Browser";
  return `PowerBar (${os})`;
}

async function activateLicense(key) {
  if (!key) {
    await deactivateLicense();
    return { ok: false, reason: "none" };
  }
  try {
    const data = await lsPost("activate", { license_key: key, instance_name: instanceName() });
    const verdict = XT_LICENSE_RULES.verdict(data, XT_CONFIG);
    if (!verdict.ok) {
      await chrome.storage.local.set({
        license: { key, ok: false, reason: verdict.reason, checkedAt: Date.now(), fresh: true },
      });
      return verdict;
    }
    await chrome.storage.local.set({
      license: {
        key,
        ok: true,
        reason: "valid",
        instanceId: data.instance?.id || null,
        status: verdict.status,
        expiresAt: verdict.expiresAt,
        activationLimit: verdict.activationLimit,
        activationUsage: verdict.activationUsage,
        checkedAt: Date.now(),
        fresh: true,
      },
    });
    return verdict;
  } catch {
    return { ok: false, reason: "offline" };
  }
}

async function revalidateLicense(force = false) {
  const { license } = await chrome.storage.local.get("license");
  if (!license?.key) return;
  if (!force && !XT_LICENSE_RULES.needsRecheck(license)) return;
  try {
    const data = await lsPost("validate", {
      license_key: license.key,
      ...(license.instanceId ? { instance_id: license.instanceId } : {}),
    });
    const verdict = XT_LICENSE_RULES.verdict(data, XT_CONFIG);
    await chrome.storage.local.set({
      license: {
        ...license,
        ok: verdict.ok,
        reason: verdict.reason,
        status: verdict.status ?? license.status,
        expiresAt: verdict.expiresAt ?? license.expiresAt,
        activationUsage: verdict.activationUsage ?? license.activationUsage,
        checkedAt: Date.now(),
        fresh: true,
      },
    });
  } catch {
    // Offline: keep the previous verdict but mark it stale so the grace window
    // starts counting rather than silently extending forever.
    await chrome.storage.local.set({ license: { ...license, fresh: false } });
  }
}

async function deactivateLicense() {
  const { license } = await chrome.storage.local.get("license");
  if (license?.key && license.instanceId) {
    // Best effort: if this fails the customer can still release the slot from
    // their Lemon Squeezy licence page.
    try {
      await lsPost("deactivate", {
        license_key: license.key,
        instance_id: license.instanceId,
      });
    } catch {}
  }
  await chrome.storage.local.remove("license");
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
  if (msg?.type === "license:activate") {
    activateLicense(msg.key).then(sendResponse);
    return true;
  }
  if (msg?.type === "license:deactivate") {
    deactivateLicense().then(() => sendResponse({ ok: true }));
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
  if (msg?.type === "options:open") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return;
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

chrome.runtime.onInstalled.addListener(() => {
  refreshKillswitch();
  revalidateLicense();
});
chrome.runtime.onStartup.addListener(() => {
  refreshKillswitch();
  revalidateLicense();
});

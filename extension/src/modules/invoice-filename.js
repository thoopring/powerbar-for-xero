// Feature #9 (PRO, 83 votes): give downloaded invoice PDFs a useful filename.
// Xero names them "Invoice ORC1042.pdf" — no contact, so a folder of them is
// unsortable by client. Template default: "{number} - {contact}.pdf".
//
// Implementation: this module only publishes what the current invoice IS. The
// rename happens in the service worker via downloads.onDeterminingFilename,
// which catches the download no matter how Xero triggers it (button, preview
// modal, or print dropdown) — far more robust than intercepting clicks.
//
// The "downloads" permission is OPTIONAL and requested only when this module
// is switched on, so the install-time prompt still says xero.com and nothing
// else (HANDOFF §5-2: permissions are the trust story).
"use strict";

XT.register({
  id: "invoice-filename",
  tier: "pro",
  title: "Custom invoice PDF filenames (Pro)",
  _timer: null,

  async init() {
    if (!XT.routes.isInvoiceView(location.pathname) && !XT.routes.isInvoiceEdit(location.pathname)) {
      return;
    }
    // chrome.permissions does NOT exist in a content script — only i18n,
    // storage, runtime and dom do. Touching it here threw, and because init()
    // is async the rejection escaped main.js's try/catch, so the module was
    // listed as active while doing nothing at all. Ask the worker instead.
    const granted = await this.hasDownloadPermission();
    if (!granted) {
      // Never prompt mid-page; the options page is where the ask belongs. Say
      // so out loud, because a silently inert Pro feature is indistinguishable
      // from a broken one.
      console.warn("[XT] invoice-filename off: download permission not granted (see settings)");
      return;
    }

    await this.publish();
    // The header renders before the contact does, so re-publish briefly until
    // the contact name lands.
    let tries = 0;
    this._timer = setInterval(() => {
      if (++tries > 20) {
        clearInterval(this._timer);
        // Name what was missing: "invoice number" and "contact name" point at
        // different selectors, and guessing which one broke costs a round trip.
        const missing = [
          this.readNumber() ? null : "invoice number",
          this.readContact() ? null : "contact name",
        ].filter(Boolean);
        if (missing.length) {
          console.warn(
            `[XT] invoice-filename: could not read ${missing.join(" or ")} on this page; ` +
              "Xero's own filename will be kept."
          );
        }
        return;
      }
      this.publish();
    }, 500);
  },

  async hasDownloadPermission() {
    try {
      const res = await chrome.runtime.sendMessage({
        type: "permissions:has",
        permissions: ["downloads"],
      });
      return !!res?.granted;
    } catch {
      return false;
    }
  },

  async publish() {
    const cfg = await XT.settings.load();
    const number = this.readNumber();
    const contact = this.readContact();
    if (!number) return;
    chrome.runtime
      .sendMessage({
        type: "invoice:context",
        context: { number, contact, template: cfg.filenameTemplate },
      })
      .catch(() => {});
    if (contact) {
      clearInterval(this._timer);
      // One line per invoice page, so a support question ("it didn't rename")
      // is answerable from the user's own console instead of guesswork.
      console.info(
        `[XT] invoice-filename ready: "${cfg.filenameTemplate}" -> ` +
          `"${this.preview(cfg.filenameTemplate, number, contact)}"`
      );
    }
  },

  preview(template, number, contact) {
    return template.replace(/\{(\w+)\}/g, (_, k) => ({ number, contact })[k] ?? "");
  },

  // "Invoice ORC1042" -> "ORC1042"
  readNumber() {
    const el = document.querySelector(XT.selectors.invoice.title);
    if (!el) return null;
    const text = el.textContent.trim();
    return (/([A-Z0-9][A-Z0-9-]*\d)\s*$/.exec(text) || [])[1] || text || null;
  },

  // The name sits on the <button> right after the "Contact" caption. Reading
  // the caption's parent instead picks up the address block as well, which is
  // how this produced "Ridgeway UniversityNo address" the first time round.
  //
  // Anything implausible returns null and the download keeps Xero's own name:
  // a wrong filename is worse than the default one.
  readContact() {
    const label = document.querySelector(XT.selectors.invoice.contactLabel);
    if (!label) return null;
    const next = label.nextElementSibling;
    const el =
      next && next.tagName === "BUTTON" ? next : label.parentElement?.querySelector("button");
    const name = (el?.textContent || "").trim();
    if (!name || name.length > 80 || name.includes("\n")) return null;
    if (name === label.textContent.trim()) return null;
    return name;
  },

  // Deliberately does NOT clear the published context.
  //
  // destroy() runs on every SPA navigation and on every settings change, and
  // opening Xero's print preview counts as one — so clearing here wiped the
  // context microseconds before the download it was meant to name. The service
  // worker keeps the last context instead and only applies it when the
  // downloaded file's own invoice number matches, which makes a stale context
  // harmless rather than something to race against.
  destroy() {
    clearInterval(this._timer);
    this._timer = null;
  },
});

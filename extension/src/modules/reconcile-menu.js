// Feature #7 (Free, 11 votes): reach a bank account's reconcile screen from the
// nav instead of Accounting -> Bank accounts -> find the card -> click.
//
// Xero already links to reconcile from the dashboard and the bank accounts
// page, so the gap is only the menu. We harvest the account list whenever the
// user passes through a page that lists accounts, cache it, and render entries
// under Accounting. No API, no polling — just remembering what was on screen.
//
// NOTE: reconcile *automation* stays permanently out of scope (HANDOFF §3).
// This is navigation only.
"use strict";

XT.register({
  id: "reconcile-menu",
  tier: "free",
  title: "Reconcile shortcuts in menu",

  async init() {
    // Paint from cache first so the menu is populated immediately; harvesting
    // then refreshes it if the account list moved.
    await this.render();
    if (!XT.routes.hasBankAccounts(location.pathname)) return;
    if (await this.harvest()) {
      this.destroy();
      await this.render();
    }
  },

  // Record {name, url} per account from whatever page we're on. Returns true
  // when the cached list changed.
  async harvest() {
    // Bank widgets come from a micro-frontend that loads well after
    // document_idle, so querying immediately finds nothing.
    const appeared = await XT.dom.waitFor(XT.selectors.bank.anyReconcileHref, { timeout: 12000 });
    if (!appeared) return false;

    const found = [];
    for (const link of document.querySelectorAll(XT.selectors.bank.anyReconcileHref)) {
      const href = link.getAttribute("href");
      if (!href) continue;
      // Prefer the card's own account name; the dashboard task list repeats the
      // name inside the link text instead.
      const card = link.closest(XT.selectors.bank.widget);
      const nameEl = card?.querySelector(XT.selectors.bank.widgetName);
      const name = (nameEl?.textContent || link.getAttribute("aria-label") || "").trim();
      if (!name) continue;
      const url = new URL(href, location.origin).pathname + new URL(href, location.origin).search;
      if (!found.some((f) => f.url === url)) found.push({ name, url });
    }
    if (!found.length) return false;

    const { bankAccounts } = await chrome.storage.local.get("bankAccounts");
    if (JSON.stringify(bankAccounts) === JSON.stringify(found)) return false;
    await chrome.storage.local.set({ bankAccounts: found });
    return true;
  },

  async render() {
    const { bankAccounts } = await chrome.storage.local.get("bankAccounts");
    if (!bankAccounts?.length) return;

    const panel = await XT.dom.waitFor(XT.selectors.panels.accounting);
    if (!panel) return;
    const anchor = XT.menu.findItem(panel, "/Bank/BankAccounts.aspx");
    if (!anchor) return;
    if (panel.querySelector(`[data-xt-item="${this.id}"]`)) return;

    const items = [];
    for (const acct of bankAccounts) {
      const li = XT.menu.cloneItem(anchor, {
        label: `Reconcile: ${acct.name}`,
        href: acct.url,
        id: this.id,
      });
      if (li) items.push(li);
    }
    XT.menu.insertAfter(anchor, items);
  },

  destroy() {
    XT.menu.removeAll(this.id);
  },
});

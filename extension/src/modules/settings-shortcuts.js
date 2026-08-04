// Feature #6 (Free, 28 votes): direct entries for settings screens that Xero
// only exposes behind its settings hub.
//
// Chart of accounts and Bank accounts already have nav entries, so the value
// here is Financial Settings — whose URL is not captured yet. Entries with a
// PLACEHOLDER target are skipped rather than injected as dead links.
"use strict";

XT.register({
  id: "settings-shortcuts",
  tier: "free",
  title: "Settings shortcuts",

  SHORTCUTS: [["Financial settings", () => XT.urls.settings.financial]],

  async init() {
    const panel = await XT.dom.waitFor(XT.selectors.panels.accounting);
    if (!panel) return;
    // Anchor to the settings hub entry at the bottom of the Accounting panel.
    const anchor = XT.menu.findItem(panel, "/settings#accounting");
    if (!anchor) return;
    if (panel.querySelector(`[data-xt-item="${this.id}"]`)) return;

    const items = [];
    for (const [label, hrefFn] of this.SHORTCUTS) {
      const href = hrefFn();
      if (!href || href === "PLACEHOLDER") continue;
      const li = XT.menu.cloneItem(anchor, { label, href, id: this.id });
      if (li) items.push(li);
    }
    if (items.length) XT.menu.insertAfter(anchor, items);
  },

  destroy() {
    XT.menu.removeAll(this.id);
  },
});

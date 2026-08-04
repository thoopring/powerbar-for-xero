// Feature #3 (Free, 103 votes): status entries under Sales, so "show me the
// drafts" is one click instead of Invoices -> tab -> filter.
"use strict";

XT.register({
  id: "sales-submenu",
  tier: "free",
  title: "Sales status submenu",

  async init() {
    const panel = await XT.dom.waitFor(XT.selectors.panels.sales);
    if (!panel) return;
    // Anchor to the existing Invoices entry so our items sit with it.
    const anchor = XT.menu.findItem(panel, "/AccountsReceivable/Search.aspx");
    if (!anchor) return;
    if (panel.querySelector(`[data-xt-item="${this.id}"]`)) return; // already injected

    const items = [];
    for (const [label, href] of Object.entries(XT.urls.invoicesByStatus)) {
      const li = XT.menu.cloneItem(anchor, { label, href, id: this.id });
      if (li) items.push(li);
    }
    // Rank 10: these are filters of Invoices, so they belong tight against it,
    // ahead of Statements (rank 20).
    XT.menu.insertAfter(anchor, items, 10);
  },

  destroy() {
    XT.menu.removeAll(this.id);
  },
});
